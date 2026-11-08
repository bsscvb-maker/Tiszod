(() => {
  const $ = id => document.getElementById(id);
  const make = (tag, text) => {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    return element;
  };
  const action = (text, onClick) => {
    const element = make('button',text);
    element.type = 'button'; element.onclick = onClick;
    return element;
  };
  const profileFilename = 'TisZod Medical About Me.json';
  const fields = [
    ['height','Height'], ['age','Age'], ['ageAsOf','Age recorded on'],
    ['pcp','Primary care physician'],
    ['eyeCare','Ophthalmologist or eye-care practice']
  ];
  let api, profile = {}, savedProfile = {}, compositionSource=null, medicationSource=null, loadMessage = '';

  function careTeam() {
    const team=make('section');team.className='medical-folder-dashboard medical-care-team';
    team.append(make('h3','Care Team'));
    for (const [role,name,contact] of [
      ['Primary care physician',profile.pcp,profile.contacts?.pcp],
      ['Eye care',profile.eyeCare,profile.contacts?.eyeCare]
    ]) {
      const panel=make('details');
      panel.append(make('summary',role+' · '+(name||'Needs confirmation')));
      if(contact?.address) panel.append(make('p',contact.address));
      if(contact?.phone){
        const phone=make('a',contact.phone);phone.href='tel:'+contact.phone.replace(/[^+\d]/g,'');panel.append(phone);
      }
      if(/^https:\/\//.test(contact?.url||'')){
        const line=make('p'),link=make('a',contact.linkLabel||'Practice website');
        link.href=contact.url;link.target='_blank';link.rel='noopener noreferrer';line.append(link);panel.append(line);
      }
      team.append(panel);
    }
    return team;
  }
  function heightInches(value) {
    const raw=String(value||'').trim();
    const feet=raw.match(/^(\d+)\s*(?:ft|feet|foot|['′])\s*(\d+(?:\.\d+)?)?\s*(?:in|inches|["″])?$/i);
    if(feet && Number(feet[2]||0)<12)return Number(feet[1])*12+Number(feet[2]||0);
    const inches=raw.match(/^(\d+(?:\.\d+)?)\s*(?:in|inches|["″])$/i);
    return inches?Number(inches[1]):0;
  }
  const isCompoundedTirzepatide=name=>/^compounded tirzepatide\b/i.test(name);
  let injections=[];
  let addedDoses=[];
  let doseLogReady=false;
  let editDose,copyDose;
  const doseFileTag="appProperties has { key='tiszodRecord' and value='medicalInjection' }";
  const injectionKey=row=>row.date+'|'+(/zepbound/i.test(row.product)?'zepbound':'tirzepatide');
  function doseTime(row){
    if(/^\d{2}:\d{2}(?::\d{2})?$/.test(row.time24||''))return row.time24;
    const time=String(row.time||'').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if(!time)return '';
    const hours=Number(time[1])%12+(time[4].toUpperCase()==='PM'?12:0);
    return String(hours).padStart(2,'0')+':'+time[2]+(time[3]&&time[3]!=='00'?':'+time[3]:'');
  }
  const doseIdentity=row=>[injectionKey(row),doseTime(row).slice(0,5)].join('|');
  const sourceIdentity=row=>JSON.stringify([injectionKey(row),doseTime(row),row.dose||'',row.doseNumber||'']);
  const canEditDose=row=>Boolean(row.dose)&&!/^(?:missed|postponed)\b/i.test(row.notes||'');

  function syncInjections(){
    const entered=Array.isArray(medicationSource?.injections)?medicationSource.injections:[];
    const legacy=Array.isArray(savedProfile.folderSummaries?.injections)?savedProfile.folderSummaries.injections:[];
    const enteredKeys=new Set(entered.map(injectionKey));
    const removedPostponements=new Set(medicationSource?.removedPostponements||[]);
    const original=[...legacy.filter(row=>!enteredKeys.has(injectionKey(row))),...entered]
      .filter(row=>row.dose||!/^postponed\b/i.test(row.notes||'')||!removedPostponements.has(injectionKey(row)));
    const superseded=new Set(addedDoses.map(row=>row.replaces).filter(Boolean));
    injections=original.filter(row=>!superseded.has(sourceIdentity(row)));
    const known=new Set(injections.filter(canEditDose).map(doseIdentity));
    let nextNumber=Math.max(0,...original.concat(addedDoses).map(row=>Number(row.doseNumber)||0));
    for(const row of [...addedDoses].sort((a,b)=>a.date.localeCompare(b.date)||doseTime(a).localeCompare(doseTime(b)))){
      const key=doseIdentity(row);
      if(known.has(key))continue;
      known.add(key);
      injections.push({...row,doseNumber:row.doseNumber||++nextNumber});
    }
    api.onFolderSummaries?.({...savedProfile.folderSummaries,injections});
  }

  async function readAddedDoses(){
    const files=await api.list("'me' in owners and "+doseFileTag);
    return Promise.all(files.map(async file=>{
      const response=await thDriveFetch(file.id,{cache:'no-store'});
      if(!response.ok)throw Error('The private injection log could not be read.');
      return {...await response.json(),driveId:file.id};
    }));
  }

  async function writeDose(row, pending, driveId){
    if(!thAuthorized())throw Error('Sign in again to save the dose.');
    const headers={Authorization:'Bearer '+thToken};
    const upload='https://www.googleapis.com/upload/drive/v3/files';
    let response;
    if(driveId){
      response=await fetch(upload+'/'+encodeURIComponent(driveId)+'?uploadType=media&fields=id',{
        method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(row)
      });
    }else{
      if(!pending.id){
        const generated=await fetch('https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=drive',{headers,cache:'no-store'});
        if(!generated.ok)throw Error('Drive could not prepare the dose record.');
        [pending.id]=(await generated.json()).ids;
      }
      driveId=pending.id;
      const boundary='tiszod-'+crypto.randomUUID();
      const metadata={id:driveId,name:'TisZod Injection Entry.json',mimeType:'application/json',appProperties:{tiszodRecord:'medicalInjection'}};
      const body=new Blob([
        '--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n',
        '--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify(row)+'\r\n--'+boundary+'--\r\n'
      ]);
      response=await fetch(upload+'?uploadType=multipart&fields=id',{
        method:'POST',headers:{...headers,'Content-Type':'multipart/related; boundary='+boundary},body
      });
    }
    if(!response.ok&&response.status!==409)
      throw Error(response.status===401?'Sign in again to save the dose.':'Drive could not save the dose. Try again.');
    const readback=await thDriveFetch(driveId,{cache:'no-store'});
    const saved=readback.ok?await readback.json():null;
    if(!saved||Object.entries(row).some(([key,value])=>saved[key]!==value))
      throw Error('Drive could not confirm this save. Try again or reload the history.');
    return {...saved,driveId};
  }

  function renderInjectionHistory(){
    const rows=$('medical-injection-rows');
    if(!doseLogReady&&injections.length===0){
      rows.textContent='The private injection log is loading or unavailable.';
      return;
    }
    rows.replaceChildren(thMedicalFolders.injectionHistory(injections,row=>editDose(row)));
  }
  function openInjectionHistory(){
    const dialog=$('medical-injection-history');
    renderInjectionHistory();
    if(!dialog.open)dialog.showModal();
  }

  function setupDoseForm(){
    const form=$('medical-injection-entry');
    const fields=form.elements;
    const status=$('medical-dose-error');
    const historyStatus=$('medical-dose-status');
    const dialog=$('medical-dose-dialog');
    const submit=form.querySelector('[type="submit"]');
    let pending={};
    let editing=null;
    function setEasternNow(){
      const parts=new Intl.DateTimeFormat('en-US',{
        timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',
        hour:'2-digit',minute:'2-digit',hourCycle:'h23'
      }).formatToParts(new Date());
      const now=Object.fromEntries(parts.map(part=>[part.type,part.value]));
      fields.date.value=[now.year,now.month,now.day].join('-');
      fields.time.value=now.hour+':'+now.minute;
    }
    function closeForm(){
      dialog.close();
      editing=null;
      $('medical-dose-add').focus();
    }
    function openForm(row, isEdit){
      if(submit.disabled)return;
      status.textContent='';
      historyStatus.textContent='';
      pending={};
      editing=isEdit?row:null;
      form.reset();
      fields.time.required=!isEdit||Boolean(doseTime(row));
      fields.mg.required=!isEdit||Boolean(row.mg??String(row.dose).match(/([\d.]+)\s*mg\b/i)?.[1]);
      if(row){
        fields.date.value=row.date;
        fields.time.value=doseTime(row);
        fields.product.value=/zepbound/i.test(row.product)?'Zepbound':'Compounded tirzepatide + B12';
        fields.mg.value=row.mg??String(row.dose).match(/([\d.]+)\s*mg\b/i)?.[1]??'';
        fields.units.value=row.units??String(row.dose).match(/([\d.]+)\s*(?:syringe\s*)?units?\b/i)?.[1]??'';
        fields.notes.value=row.notes||'';
      }
      if(!isEdit)setEasternNow();
      submit.textContent=isEdit?'Save changes':'Save injection';
      $('medical-dose-form-title').textContent=isEdit?'Edit injection':'Add injection';
      $('medical-dose-review').textContent=!isEdit&&row?'Copied from the '+row.date+' entry. Confirm that the dose and notes apply to this injection.':'Review the values before saving.';
      dialog.showModal();
      fields.date.focus();
    }
    editDose=row=>openForm(row,true);
    copyDose=row=>openForm(row,false);
    $('medical-dose-add').onclick=()=>copyDose(injections.filter(canEditDose).sort((a,b)=>
      b.date.localeCompare(a.date)||doseTime(b).localeCompare(doseTime(a)))[0]);
    form.querySelector('[data-dose-cancel]').onclick=closeForm;
    dialog.addEventListener('cancel',event=>{if(submit.disabled)event.preventDefault();});
    form.onsubmit=async event=>{
      event.preventDefault();
      if(submit.disabled)return;
      const mg=fields.mg.value;
      const units=fields.units.value;
      const time24=fields.time.value;
      const [hours,minutes,seconds]=time24.split(':');
      const row={
        date:fields.date.value,time24,
        time:time24?(Number(hours)%12||12)+':'+minutes+(seconds&&seconds!=='00'?':'+seconds:'')+(Number(hours)<12?' AM':' PM'):'',
        product:fields.product.value,
        mg:mg?Number(mg):null,units:units?Number(units):null,
        dose:mg?[mg+' mg',units&&units+' units'].filter(Boolean).join(' · '):editing?.dose||'',
        notes:fields.notes.value.trim()
      };
      if(editing){
        row.doseNumber=editing.doseNumber??null;
        if(editing.replaces||!editing.driveId)row.replaces=editing.replaces||sourceIdentity(editing);
      }
      const inputs=[...form.elements];
      inputs.forEach(input=>input.disabled=true);
      $('medical-dose-add').disabled=true;
      status.textContent='Saving to your private injection log…';
      try{
        if(medicationSource===undefined)medicationSource=await api.medicationSource();
        addedDoses=await readAddedDoses();
        doseLogReady=true;
        syncInjections();
        const isEdited=entry=>editing&&(editing.driveId?entry.driveId===editing.driveId:
          sourceIdentity(entry)===sourceIdentity(editing)||entry.replaces===row.replaces);
        const latest=injections.find(isEdited);
        if(editing&&!latest)throw Error('This entry changed elsewhere. Reopen the history and try again.');
        if(editing&&latest.driveId&&(sourceIdentity(latest)!==sourceIdentity(editing)||latest.notes!==editing.notes))
          throw Error('This entry changed elsewhere. Reopen the history and try again.');
        const duplicate=injections.find(entry=>canEditDose(entry)&&!isEdited(entry)&&doseIdentity(entry)===doseIdentity(row));
        if(duplicate&&(!pending.id||duplicate.driveId!==pending.id))throw Error('A dose for this product is already logged at that date and time.');
        if(!editing)row.doseNumber=duplicate?.doseNumber??Math.max(0,...injections.map(entry=>Number(entry.doseNumber)||0))+1;
        const snapshot=JSON.stringify(row);
        if(pending.snapshot!==snapshot)pending={snapshot};
        const saved=await writeDose(row,pending,latest?.driveId);
        addedDoses=[...addedDoses.filter(entry=>entry.driveId!==saved.driveId),saved];
        syncInjections();
        renderInjectionHistory();
        closeForm();
        pending={};
        if(!latest)historyStatus.textContent='Injection saved.';
      }catch(error){
        renderInjectionHistory();
        status.textContent=error.message||'Could not save the dose.';
      }finally{
        inputs.forEach(input=>input.disabled=false);
        $('medical-dose-add').disabled=false;
        if(!dialog.open&&$('medical-injection-history').open)$('medical-dose-add').focus();
      }
    };
  }

  function loggedMedicationAmount(name, dose) {
    const compound = /^compounded tirzepatide (?:with|\+) b12$/i;
    if(compound.test(name)&&medicationSource?.reportedDose)return medicationSource.reportedDose;
    if (!compound.test(name) || dose !== 'Current dose to confirm') return dose;
    const latest = injections
      .filter(entry => compound.test(entry.product) && /^\d{4}-\d{2}-\d{2}$/.test(entry.date))
      .sort((a,b) => b.date.localeCompare(a.date))[0];
    return latest?.dose?.match(/^(\d+(?:\.\d+)? mL)(?: reported)?$/i)?.[1] || dose;
  }
  const asPounds=reading=>reading?.unit==='lb'?reading.weight:reading?.unit==='kg'?reading.weight*2.2046226218:undefined;
  const bmiFor=(pounds,height)=>pounds>0&&height>0?703*pounds/(height*height):undefined;
  const rounded=value=>Math.round(value*10)/10;
  const measurementTime=reading=>Number.isFinite(reading?.time)?reading.time:Date.parse(reading?.date);

  function compositionReadings(profile) {
    const history=Array.isArray(profile.bodyCompositionHistory)?profile.bodyCompositionHistory:[];
    const scale=Array.isArray(profile.weighIns)?profile.weighIns.filter(row=>
      ['bmi','bodyFat','muscle','water'].some(key=>Number.isFinite(row?.[key]))):[];
    const confirmed=Array.isArray(compositionSource?.readings)?compositionSource.readings.filter(row=>Number.isFinite(measurementTime(row))):[];
    const measurements=['weight','bmi','bodyFat','muscle','water','boneMass'];
    const sameReading=(row,entry)=>row.date?.slice(0,10)===entry.date?.slice(0,10)&&
      measurements.every(metric=>row[metric]==null||row[metric]===entry[metric]);
    const legacy=[...scale,...history,profile.bodyComposition].filter(row=>Number.isFinite(measurementTime(row))&&
      !confirmed.some(entry=>sameReading(row,entry)));
    const readings=[...legacy,...confirmed];
    const byTime=new Map();
    for(const row of readings){
      const time=measurementTime(row);
      byTime.set(time,{...byTime.get(time),...row});
    }
    return [...byTime.entries()].sort(([a],[b])=>b-a).map(([,row])=>row);
  }

  function chartWeighIns(savedProfile) {
    const composition = compositionReadings(savedProfile).flatMap(row => {
      const weight = asPounds(row) ?? row.weight;
      if (!Number.isFinite(weight) || weight <= 0 || (row.unit && !['lb', 'kg'].includes(row.unit))) return [];
      const time = measurementTime(row);
      const date = row.date?.slice(0, 10) || new Date(time).toISOString().slice(0, 10);
      return [{...row, date, time, weight, unit:'lb', source:row.source || 'Body composition'}];
    });
    const legacy = Array.isArray(savedProfile.weighIns) ? savedProfile.weighIns : [];
    return [...legacy.filter(row => !composition.some(entry =>
      entry.date === row?.date && entry.weight === asPounds(row) && !Number.isFinite(row.time)
    )), ...composition];
  }

  function comparison(label,current,prior,unit='',preferred=0) {
    const item=make('div'), values=make('dd');
    item.className='medical-measurement-comparison';
    const format=value=>Number.isFinite(value)?rounded(value)+unit:'Not recorded';
    values.append(make('span','Current: '+format(current)),make('span','Prior: '+format(prior)));
    if(Number.isFinite(current)&&Number.isFinite(prior)){
      const delta=rounded(rounded(current)-rounded(prior)),direction=Math.sign(delta);
      const change=make('span',direction?(direction>0?'↑ Up ':'↓ Down ')+Math.abs(delta)+unit:'— No change');
      change.className='medical-measurement-change';
      if(direction&&preferred)change.dataset.trend=direction===preferred?'positive':'negative';
      values.append(change);
    }
    item.append(make('dt',label),values);
    return item;
  }

  let scannerPaused=false,scannerLayer='skin';
  function bodyScanner(){
    const figure=make('figure'),header=make('div'),stage=make('div');
    figure.className='medical-scanner medical-scanner-v2';
    figure.setAttribute('aria-label','Interactive body scanner — visual illustration, not a medical scan');
    header.className='medical-scanner-header';
    stage.className='medical-scanner-stage';
    const pause=action('Pause motion',()=>{scannerPaused=!scannerPaused;updateMotion()});
    pause.className='medical-scanner-pause';
    const silhouette=make('img');
    silhouette.alt='Illustrated adult male body with natural skin tone';
    const ring=make('span'),sweep=make('span'),grid=make('span'),target=make('span');
    ring.className='medical-scanner-ring';sweep.className='medical-scanner-sweep';
    grid.className='medical-scanner-grid';target.className='medical-scanner-target';
    for(const layer of [ring,sweep,grid,target])layer.setAttribute('aria-hidden','true');
    let threeState=null;const controls=make('div');controls.className='medical-scanner-controls';
    const modes=[['skin','Skin'],['anatomy','Anatomy'],['scan','X-ray']];
    const buttons=modes.map(([mode,label])=>{
      const button=action(label,()=>{scannerLayer=mode;updateLayer()});
      button.className='medical-scanner-mode';button.dataset.mode=mode;controls.append(button);return button;
    });
    const badge=make('span','● SYSTEM ONLINE','medical-scanner-online');
    const readout=make('div','LIVE VISUALIZATION · ILLUSTRATIVE','medical-scanner-readout');
    const detail=make('div','Select a view to explore the body model. This is an illustration, not a diagnostic scan.','medical-scanner-detail');
    function updateMotion(){
      figure.toggleAttribute('data-paused',scannerPaused);if(threeState)threeState.paused=scannerPaused;
      pause.textContent=scannerPaused?'Resume motion':'Pause motion';
      pause.setAttribute('aria-pressed',String(scannerPaused));
    }
    function updateLayer(){
      figure.dataset.layer=scannerLayer;if(threeState?.setMode)threeState.setMode(scannerLayer);
      silhouette.src=scannerLayer==='skin'?'assets/medical/body-scanner-skin.svg?v=2':'assets/medical/body-scanner.svg?v=anatomy';
      silhouette.alt=scannerLayer==='skin'?'Illustrated light-skinned adult male body':'Illustrated anatomical body diagram';
      buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===scannerLayer)));
      detail.textContent=scannerLayer==='skin'?'Natural skin view · animated body visualization':scannerLayer==='anatomy'?'Anatomy view · stylized internal structure':'X-ray view · illustrative visualization only';
    }
    header.append(make('span','BODY SCANNER / TISZOD','medical-scanner-title'),pause);
    stage.append(grid,ring,silhouette,target,sweep,badge,readout);
    const reset=action('Reset view',()=>threeState?.reset?.());reset.className='medical-scanner-mode';controls.append(reset);figure.append(header,controls,stage,detail);\n    if(window.thMedical3D)void window.thMedical3D.mount(stage,figure).then(state=>{threeState=state;state?.setMode?.(scannerLayer);if(state)state.paused=scannerPaused});
    updateMotion();updateLayer();
    return figure;
  }

  function renderProfile() {
    const target=$('medical-about-profile'), stamp=$('medical-profile-updated');
    const composition=compositionReadings(profile);
    const weighIns=api.weights();
    const formatTime=new Intl.DateTimeFormat('en-US',{
      timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'
    });
    const latest=[{time:Date.parse(profile.profileUpdatedAt)},composition[0],weighIns.at(-1)]
      .filter(row=>Number.isFinite(measurementTime(row)))
      .sort((a,b)=>measurementTime(b)-measurementTime(a))[0];
    stamp.hidden=!latest;
    if(latest){
      const time=measurementTime(latest);
      const dateOnly=latest.date?.length===10&&time===Date.parse(latest.date);
      stamp.dateTime=dateOnly?latest.date:new Date(time).toISOString();
      const label=dateOnly?new Intl.DateTimeFormat('en-US',{
        timeZone:'UTC',month:'short',day:'numeric',year:'numeric'
      }).format(time):formatTime.format(time);
      stamp.textContent='Profile as of '+label;
    }
    const overview=make('div');overview.className='medical-body-profile';
    const scanner=bodyScanner();
    const grid=make('dl'),height=heightInches(profile.height);
    const weights=weighIns.slice(-2).reverse().map(asPounds);
    for(const [label,value] of [['Height',profile.height],['Age',profile.age]]){
      const item=make('div');item.append(make('dt',label),make('dd',value||'Needs confirmation'));grid.append(item);
    }
    const measurements=make('div');measurements.className='medical-measurements';
    measurements.append(make('h3','Vitals'),grid);
    if(composition.length||weights.some(Number.isFinite)){
      const readings=make('dl');
      for(const [label,key,unit,preferred] of [
        ['Scale weight','weight',' lb',-1],['Scale BMI','bmi','',-1],
        ['Body fat','bodyFat','%',-1],['Muscle','muscle','%',1],['Water','water','%',0],['Bone mass','boneMass','%',0]
      ]){
        const values=composition.map(row=>key==='weight'&&row.unit?asPounds(row):row[key]).filter(Number.isFinite);
        const pair=values.length?values:key==='weight'?weights:key==='bmi'?weights.map(pounds=>bmiFor(pounds,height)):[];
        readings.append(comparison(label,pair[0],pair[1],unit,preferred));
      }
      const dates=make('p');dates.className='medical-measurement-dates';
      for(const [index,label] of ['Current','Prior'].entries()){
        const row=composition[index];
        if(row)dates.append(make('span',label+': '+(row.date?.length===10?row.date:formatTime.format(measurementTime(row)))));
      }
      const updated=Date.parse(compositionSource?.updatedAt);
      if(Number.isFinite(updated))dates.append(make('span','Updated: '+formatTime.format(updated)));
      measurements.append(make('h3','Body composition'),dates,readings);
    }
    // Interactive mission-control overview, using only existing recorded measurements.
    const dashboard=make('section');dashboard.className='medical-command-dashboard';
    const title=make('div');title.className='medical-command-title';
    title.append(make('span','✦ TISZOD / HEALTH COMMAND CENTER'),make('strong','Body Intelligence'));
    const nav=make('nav');nav.className='medical-command-nav';nav.setAttribute('aria-label','Medical dashboard shortcuts');
    const shortcuts=[['Overview','#medical-about'],['Weight journey','#weight-title'],['Injection history','#medical-injection-open'],['Records','#medical-browse']];
    shortcuts.forEach(([label,href])=>{
      const a=make('a',label);a.href=href;
      if(label==='Injection history')a.onclick=event=>{event.preventDefault();openInjectionHistory()};
      nav.append(a);
    });
    const metrics=make('div');metrics.className='medical-command-metrics';
    const latestReading=composition[0]||{};
    const previousReading=composition[1]||{};
    const latestWeight=Number.isFinite(latestReading.weight)?(latestReading.unit?asPounds(latestReading):latestReading.weight):weights[0];
    const metricData=[
      ['⚖','Weight',latestWeight,'lb',Number.isFinite(previousReading.weight)?(previousReading.unit?asPounds(previousReading):previousReading.weight):weights[1]],
      ['◈','BMI',latestReading.bmi,'',previousReading.bmi],
      ['◉','Body fat',latestReading.bodyFat,'%',previousReading.bodyFat],
      ['◆','Muscle',latestReading.muscle,'%',previousReading.muscle],
      ['◌','Water',latestReading.water,'%',previousReading.water],
      ['⬡','Bone mass',latestReading.boneMass,'%',previousReading.boneMass]
    ];
    for(const [symbol,label,value,unit,prior] of metricData){
      const card=make('div');card.className='medical-command-metric';
      card.append(make('span',symbol+' '+label));
      card.append(make('strong',Number.isFinite(value)?value.toFixed(1)+unit:'—'));
      const change=make('small');
      if(Number.isFinite(value)&&Number.isFinite(prior)){
        const delta=value-prior;
        change.textContent=delta===0?'No change':(delta>0?'↑ +':'↓ ')+delta.toFixed(1)+unit+' vs prior';
      }else change.textContent='No comparison available';
      card.append(change);metrics.append(card);
    }
    const stage=make('div');stage.className='medical-command-stage';
    const systems=make('aside');systems.className='medical-command-systems';
    systems.append(make('h3','Explore body systems'));
    const bodySystems=[['♡','Heart','Cardiovascular system'],['◉','Brain','Nervous system'],['◌','Lungs','Respiratory system'],['◆','Muscles','Musculoskeletal system'],['⬡','Bones','Skeletal system'],['◈','Digestion','Digestive system'],['◍','Hydration','Body water']];
    const info=make('div','Select a body system to explore the illustration. This visualization does not diagnose conditions.','medical-command-info');
    for(const [glyph,name,description] of bodySystems){
      const button=action(glyph+' '+name,()=>{
        systems.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
        info.textContent=description+' · illustrative body-system overview, not a medical finding.';
        scanner.dataset.system=name.toLowerCase();
      });
      button.className='medical-command-system';button.setAttribute('aria-pressed','false');systems.append(button);
    }
    systems.append(info);
    const journey=make('section');journey.className='medical-command-journey';
    journey.append(make('h3','Weight journey'));
    const validWeights=weighIns.map(asPounds).filter(Number.isFinite);
    if(validWeights.length>1){
      const first=validWeights[0],last=validWeights[validWeights.length-1],change=last-first;
      journey.append(make('strong',(change>0?'+':'')+change.toFixed(1)+' lb'));
      journey.append(make('p','Change from first to latest recorded weigh-in'));
      const spark=document.createElementNS('http://www.w3.org/2000/svg','svg');
      spark.setAttribute('viewBox','0 0 320 100');spark.setAttribute('role','img');spark.setAttribute('aria-label','Weight trend from first to latest entry');
      const low=Math.min(...validWeights),high=Math.max(...validWeights),span=high-low||1;
      const points=validWeights.map((v,i)=>(i*320/(validWeights.length-1)).toFixed(1)+','+(90-(v-low)*75/span).toFixed(1)).join(' ');
      const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');
      line.setAttribute('points',points);line.setAttribute('fill','none');line.setAttribute('stroke','#62e5ff');line.setAttribute('stroke-width','3');line.setAttribute('stroke-linejoin','round');spark.append(line);journey.append(spark);
    }else journey.append(make('p','More weigh-ins are needed for a trend.'));
    const dateLabel=make('small',latest?'Latest recorded: '+formatTime.format(measurementTime(latest)):'Awaiting measurements');
    journey.append(dateLabel);
    stage.append(systems,scanner,journey);
    dashboard.append(title,nav,metrics,stage);
    const details=make('details');details.className='medical-command-details';
    const summary=make('summary','Detailed measurements and comparisons');
    details.append(summary,measurements);
    target.replaceChildren(dashboard,details,make('h3','Current medications'));
    const userList=String(profile.currentList||'').split('\n').map(line=>line.trim()).filter(Boolean);
    if(userList.length){
      const grid=make('div');grid.className='medical-regimen';
      for(const entry of userList){
        const [name,dose,schedule]=entry.split('|').map(value=>value.trim());
        const hasHistory=isCompoundedTirzepatide(name);
        const card=hasHistory?action(null,openInjectionHistory):make('section');
        const info=make(hasHistory?'span':'div');
        if(hasHistory){
          card.className='medical-injection-card';
          card.setAttribute('aria-haspopup','dialog');
          card.setAttribute('aria-label',name+' injection history');
          info.className='medical-regimen-copy';
        }
        const visuals=[
          [/citalopram/i,'citalopram','Tablet marked 0 and 6 separated by a score line'],
          [/wellbutrin\s+xl/i,'wellbutrin-xl','Tablet marked G 785'],
          [/tirzepatide/i,'tirzepatide-vial','Vial labeled Tirzepatide + B12']
        ];
        const visual=visuals.find(([match])=>match.test(name));
        if(visual){
          const picture=make(hasHistory?'span':'figure'),image=make('img');
          if(hasHistory)picture.className='medical-regimen-photo';
          image.src='assets/medical/'+visual[1]+(visual[1]==='tirzepatide-vial'?'-pink.svg':'-imprint.webp');image.alt=visual[2];
          picture.append(image);card.append(picture);
        }
        info.append(make('strong',name));
        const amount=loggedMedicationAmount(name,dose);
        if(amount)info.append(make(hasHistory?'span':'p',amount));
        if(schedule)info.append(make(hasHistory?'span':'p',schedule));
        card.append(info);
        grid.append(card);
      }
      target.append(grid);
    }else{
      const reviewed=api.records().filter(record=>record.kind==='Medication record'&&api.current(record));
      if(reviewed.length){
        const list=make('ul');
        for(const record of reviewed){
          const item=make('li');item.append(action(api.current(record),()=>api.open(record)));list.append(item);
        }
        target.append(list);
      }else target.append(make('p','No current medications have been confirmed.'));
    }
    if(loadMessage)target.append(make('p',loadMessage));
  }
  function edit() {
    const target = $('medical-about-profile'), form = make('form');
    form.className = 'medical-about-edit';
    const inputs = {};
    for (const [key,label] of fields) {
      const input = make(key === 'conditions' || key.endsWith('Note') ? 'textarea' : 'input');
      if (key === 'ageAsOf') input.type = 'date';
      input.value = profile[key] || ''; inputs[key] = input;
      const field = make('label',label); field.append(input); form.append(field);
    }
    const current = make('textarea'); current.rows = 3; current.value = profile.currentList || '';
    const currentField = make('label','Current medications: name | dose | schedule (one per line)');
    currentField.append(current); form.append(currentField);
    const submit = make('button','Save in this browser'), message = make('p');
    message.setAttribute('role','status');
    form.append(submit,action('Cancel',renderProfile),message);
    form.onsubmit = event => {
      event.preventDefault();
      const next = Object.fromEntries(Object.entries(inputs).map(([key,input]) => [key,input.value.trim()]));
      next.currentList = current.value.trim();
      next.profileUpdatedAt=new Date().toISOString();
      try {localStorage.setItem(api.key+':about',JSON.stringify(next));}
      catch {message.textContent = 'This browser could not save the profile.';return;}
      profile = {...savedProfile,...next}; renderProfile();
    };
    target.replaceChildren(form);
    inputs.height.focus();
  }
  async function loadProfile() {
    const medication=api.medicationSource().catch(()=>undefined);
    const doseLog=readAddedDoses().catch(()=>null);
    const source=api.compositionSource?.().catch(()=>{loadMessage+=' Body composition source could not be loaded.';return null;});
    try {
      const files = await api.list("'me' in owners and name = '"+profileFilename+"'");
      if (files.length === 1) {
        const result = await thDriveFetch(files[0].id,{cache:'no-store'});
        if (!result.ok) throw Error('Could not read profile');
        savedProfile = await result.json();
      } else if (files.length > 1) loadMessage = 'More than one private profile was found. Browser edits are still available.';
      else loadMessage = 'No private Drive profile was found for this account. You can enter details here.';
    } catch {loadMessage = 'The private Drive profile could not be loaded. Browser edits are still available.';}
    [compositionSource,medicationSource]=await Promise.all([source,medication]);
    syncInjections();
    if($('medical-injection-history').open)renderInjectionHistory();
    try {
      const local=JSON.parse(localStorage.getItem(api.key+':about')||'{}');
      if(savedProfile.currentList && !(Date.parse(local.profileUpdatedAt)>=Date.parse(savedProfile.profileUpdatedAt)))delete local.currentList;
      profile={...savedProfile,...local};
    }
    catch {profile = savedProfile;}
    api.onWeighIns?.(chartWeighIns(savedProfile));
    if (!$('medical-about-profile').querySelector('form')) renderProfile();
    void doseLog.then(storedDoses=>{
      if(doseLogReady)return;
      doseLogReady=Array.isArray(storedDoses)&&medicationSource!==undefined;
      addedDoses=storedDoses||[];
      syncInjections();
      if($('medical-injection-history').open)renderInjectionHistory();
      if (!$('medical-about-profile').querySelector('form')) renderProfile();
    });
  }
  window.thMedicalAbout = {
    careTeam,openInjectionHistory,
    start(options) {
      api = options; profile = {}; savedProfile = {}; compositionSource=null; medicationSource=null; injections=[]; loadMessage = '';
      addedDoses=[]; doseLogReady=false;
      const historyButton=$('medical-injection-open');
      if(historyButton)historyButton.onclick=openInjectionHistory;
      if($('medical-injection-entry'))setupDoseForm();
      $('medical-about-edit').onclick = edit;
      renderProfile(); return loadProfile();
    },
    refresh() {
      if (!api) return;
      if (!$('medical-about-profile').querySelector('form')) renderProfile();
    }
  };
})();
