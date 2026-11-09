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
  const iconPaths={
    'brain':'M12 5a3 3 0 0 0-6-1 3 3 0 0 0-3 4 4 4 0 0 0 1 7 4 4 0 0 0 8 2V5zm0 0a3 3 0 0 1 6-1 3 3 0 0 1 3 4 4 4 0 0 1-1 7 4 4 0 0 1-8 2M7 8c2 0 3 1 3 3m7-3c-2 0-3 1-3 3m-7 4c1-2 2-2 3-2m7 2c-1-2-2-2-3-2',
    'lungs':'M12 2v9m0-4-4 4m4-4 4 4M9 8c-3-4-7 6-7 10 0 2 3 3 7 0V8zm6 0c3-4 7 6 7 10 0 2-3 3-7 0V8z',
    'flame':'M12 2c2 5 1 7 3 9 1-2 2-3 2-5 3 3 5 6 4 10a9 9 0 0 1-18-1c0-3 2-7 4-9 0 3 1 4 2 5 1-3 2-6 3-9z',
    'digestive':'M12 2v5c0 2 1 3 3 2 3-2 6 0 6 4 0 5-4 8-8 8-3 0-4-2-6-2-1 0-2 1-2 2H2c0-4 2-6 6-6 3 0 4-1 4-3 0-2-3-3-3-6V2',
    'muscle':'M3 17l2-7 4-6h5l2 2-3 3-2-1-2 6c3-2 6-2 8 0 3-2 5 1 5 4 0 3-3 4-6 3H6z',
    'calendar':'M3 5h18v16H3zm0 5h18M7 2v5m10-5v5M7 14h2m3 0h2m3 0h2M7 17h2m3 0h2',
    'pill':'M5 19a5 5 0 0 1 0-7l7-7a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7 0zm3-10 7 7',
    'syringe':'m17 3 4 4M19 5l-3 3m-4-2 6 6m-5-5-8 8 4 4 8-8m-9 7-5 5',
    'lab':'M9 3h6m-5 0v7L4 20h16l-6-10V3M7 15h10',
    'shield':'m12 2 8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6zm-3 10 2 2 4-4',
    '⚖':'M5 8h14l2 13H3L5 8zm4 0V6a3 3 0 0 1 6 0v2m-3 5v3',
    '◈':'M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zm1 9h3l2-5 2 10 2-5h2',
    '◉':'M12 2c-5 3-8 7-8 12a8 8 0 0 0 16 0c0-4-3-7-5-9l-1 5-2-8zm0 10c-2 2-3 4-3 5a3 3 0 0 0 6 0c0-1-1-3-3-5z',
    '◆':'M5 17l10-12a3 3 0 0 1 5 4L10 21H4zm7-8 5 4',
    '◌':'M12 2c-2 4-7 8-7 13a7 7 0 0 0 14 0c0-5-5-9-7-13zM8 15a4 4 0 0 0 2 4',
    '⬡':'M8 7 6 5a2 2 0 0 0-3 3l2 2a2 2 0 0 0 2 1l6 6a2 2 0 0 0 1 2l2 2a2 2 0 0 0 3-3l-2-2a2 2 0 0 0-2-1L9 9a2 2 0 0 0-1-2z',
    '♡':'M12 21S2 15 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 7-10 13-10 13zM3 12h5l2-3 3 6 2-3h6',
    '♨':'M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0zm2-5v8',
    '▣':'M3 5h18v14H3zm2 7h4l2-3 2 6 2-3h4',
    '⌁':'M2 12h5l2-4 3 9 3-13 2 8h5',
    '▱':'M3 8l9-5 9 5-9 5zm0 4 9 5 9-5m-18 4 9 5 9-5'
  };
  function dashboardIcon(symbol){
    const path=iconPaths[symbol];
    const icon=make('i');icon.setAttribute('aria-hidden','true');
    if(!path){icon.textContent=symbol;return icon;}
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    const line=document.createElementNS(svg.namespaceURI,'path');
    svg.setAttribute('viewBox','0 0 24 24');line.setAttribute('d',path);svg.append(line);icon.append(svg);
    return icon;
  }
  function panelHeading(label,symbol){
    const title=make('h3',label);title.prepend(dashboardIcon(symbol));return title;
  }
  const profileFilename = 'TisZod Medical About Me.json';
  const vitalCards = [
    ['restingHeartRate','Resting Heart Rate','▣','bpm'],
    ['heartRate','Heart Rate','♡','bpm'],
    ['oxygenSaturation','SpO₂','◌','%'],
    ['heartRateVariability','Heart Rate Variability','⌁','ms']
  ];
  const vitalKeys = vitalCards.flatMap(([key])=>[key,key+'Date']);
  const vitalTag = "appProperties has { key='tiszodRecord' and value='medicalVitals' }";
  let syncedVitals = {};
  function mergeVitals(base){
    const merged={...base};
    for(const [key] of vitalCards){
      const date=key+'Date';
      if(syncedVitals[key] && (!base[key] || syncedVitals[date]>=(base[date]||''))){
        merged[key]=syncedVitals[key];
        merged[date]=syncedVitals[date];
      }
    }
    return merged;
  }
  async function loadVitals(){
    const files=await api.list("'me' in owners and "+vitalTag);
    const rows=await Promise.all(files.map(async file=>{
      const response=await thDriveFetch(file.id,{cache:'no-store'});
      if(!response.ok)throw Error('Private vitals could not be loaded.');
      return response.json();
    }));
    const latest={};
    for(const row of rows.sort((a,b)=>String(a.savedAt).localeCompare(String(b.savedAt)))){
      for(const [key] of vitalCards){
        const date=key+'Date';
        if(row[key]&&row[date]&&row[date]>=(latest[date]||'')){
          latest[key]=row[key];
          latest[date]=row[date];
        }
      }
    }
    return latest;
  }
  const vitalDateLabel = new Intl.DateTimeFormat('en-US',{
    month:'short',day:'numeric',year:'numeric',timeZone:'UTC'
  });
  const fields = [
    ['height','Height'], ['age','Age'], ['ageAsOf','Age recorded on'],
    ['pcp','Primary care physician'],
    ['eyeCare','Ophthalmologist or eye-care practice'],
    ['bloodPressure','Latest blood pressure (mmHg)'],['heartRate','Latest heart rate (bpm)'],
    ['oxygenSaturation','Latest SpO₂ (%)'],['temperature','Latest temperature (°F)'],
    ['restingHeartRate','Latest resting heart rate (bpm)'],
    ['heartRateVariability','Latest heart rate variability (ms)'],
    ...vitalCards.map(([key,label])=>[key+'Date',label+' reading date']),
    ['nextInjectionDate','Next injection date'],['nextWeightDate','Next weight check date'],
    ['nextAppointmentDate','Next appointment date']
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

  function writeDose(row,pending,driveId){
    return writeMedicalRecord(row,pending,driveId,'TisZod Injection Entry.json','medicalInjection');
  }

  async function writeMedicalRecord(row,pending,driveId,name,recordType){
    if(!thAuthorized())throw Error('Sign in again to save the record.');
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
        if(!generated.ok)throw Error('Drive could not prepare the record.');
        [pending.id]=(await generated.json()).ids;
      }
      driveId=pending.id;
      const boundary='tiszod-'+crypto.randomUUID();
      const metadata={id:driveId,name,mimeType:'application/json',appProperties:{tiszodRecord:recordType}};
      const body=new Blob([
        '--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n',
        '--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify(row)+'\r\n--'+boundary+'--\r\n'
      ]);
      response=await fetch(upload+'?uploadType=multipart&fields=id',{
        method:'POST',headers:{...headers,'Content-Type':'multipart/related; boundary='+boundary},body
      });
    }
    if(!response.ok&&response.status!==409)
      throw Error(response.status===401?'Sign in again to save the record.':'Drive could not save the record. Try again.');
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
      ['bmi','bodyFat','muscle','water','boneMass'].some(key=>Number.isFinite(row?.[key]))):[];
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
      const values=Object.fromEntries(Object.entries(row).filter(([,value])=>value!==null&&value!==undefined&&value!==''));
      byTime.set(time,{...byTime.get(time),...values});
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

  let scannerPaused=false,scannerLayer='anatomy',scannerSystem='';
  function bodyScanner(){
    const figure=make('figure'),header=make('div'),stage=make('div');
    figure.className='medical-scanner medical-scanner-v2';
    const desktopMotion=matchMedia('(any-hover: hover), (any-pointer: fine)').matches||!navigator.maxTouchPoints;
    figure.toggleAttribute('data-desktop-motion',desktopMotion);
    figure.setAttribute('aria-label','Interactive body scanner — visual illustration, not a medical scan');
    header.className='medical-scanner-header';
    stage.className='medical-scanner-stage';
    const pause=action('Pause motion',()=>{scannerPaused=!scannerPaused;updateMotion()});
    pause.className='medical-scanner-pause';
    const silhouette=make('img');
    silhouette.alt='Illustrated adult male body with natural skin tone';
    const ring=make('span'),sweep=make('span'),crossSweep=make('span'),grid=make('span'),target=make('span');
    const orbit=make('span');orbit.className='medical-scanner-orbs';
    for(let i=0;i<3;i++)orbit.append(make('i'));
    crossSweep.className='medical-scanner-sweep medical-scanner-sweep-vertical';
    ring.className='medical-scanner-ring';sweep.className='medical-scanner-sweep';
    grid.className='medical-scanner-grid';target.className='medical-scanner-target';
    for(const layer of [ring,sweep,crossSweep,grid,target,orbit])layer.setAttribute('aria-hidden','true');
    let threeState=null;const controls=make('div');controls.className='medical-scanner-controls';
    const modes=[['skin','Skin'],['anatomy','Anatomy'],['scan','X-ray']];
    const buttons=modes.map(([mode,label])=>{
      const button=action(label,()=>{scannerLayer=mode;updateLayer()});
      button.className='medical-scanner-mode';button.dataset.mode=mode;controls.append(button);return button;
    });
    const detail=make('div','Select a view to explore the body model. This is an illustration, not a diagnostic scan.','medical-scanner-detail');
    function updateMotion(){
      figure.toggleAttribute('data-paused',scannerPaused);if(threeState)threeState.paused=scannerPaused;
      pause.textContent=scannerPaused?'Resume motion':'Pause motion';
      pause.setAttribute('aria-pressed',String(scannerPaused));
    }
    function updateLayer(){
      figure.dataset.layer=scannerLayer;if(threeState?.setMode)threeState.setMode(scannerLayer);
      const assets={skin:'body-scanner-skin.svg?v=2',anatomy:'body-scanner-anatomy.svg?v=1',scan:'body-scanner.svg?v=anatomy'};
      silhouette.src='assets/medical/'+assets[scannerLayer];
      silhouette.alt=scannerLayer==='skin'?'Illustrated light-skinned adult male body':'Illustrated anatomical body diagram';
      buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===scannerLayer)));
      detail.textContent=scannerLayer==='skin'?'Natural skin view · animated body visualization':scannerLayer==='anatomy'?'Anatomy view · stylized internal structure':'X-ray view · illustrative visualization only';
    }
    header.append(make('span','BODY SCANNER / TISZOD','medical-scanner-title'),pause);
    stage.append(grid,ring,silhouette,target,orbit,sweep,crossSweep);
    const reset=action('Reset view',()=>threeState?.reset?.());reset.className='medical-scanner-mode';controls.append(reset);
    const full=action('⛶ Full screen',()=>threeState?.toggleFullscreen?.());full.className='medical-scanner-mode';controls.append(full);
    const quality=make('select');quality.className='medical-scanner-quality';quality.setAttribute('aria-label','3D graphics quality');
    for(const [value,label] of [['auto','Graphics: Auto'],['low','Graphics: Low'],['high','Graphics: High']]){
      const option=make('option',label);option.value=value;quality.append(option);
    }
    quality.value='auto';quality.onchange=()=>threeState?.setQuality?.(quality.value);controls.append(quality);
    const directions=make('div');directions.className='medical-3d-directions';
    directions.textContent='Windows: drag to rotate, scroll to zoom. iPad/iPhone: drag to rotate, pinch to zoom.';
    const moveControls=make('div');moveControls.className='medical-3d-move-controls';
    for(const [label,delta] of [['↶ Rotate left',-.3],['Rotate right ↷',.3]]){
      const b=action(label,()=>threeState?.rotate?.(delta));b.className='medical-scanner-mode';moveControls.append(b);
    }
    for(const [label,delta] of [['＋ Zoom in',-.65],['－ Zoom out',.65]]){
      const b=action(label,()=>threeState?.zoomBy?.(delta));b.className='medical-scanner-mode';moveControls.append(b);
    }
    const tools=make('details');tools.className='medical-scanner-tools';
    const credits=make('small','Model credits: ');
    const atlasLink=make('a','Écorché');atlasLink.href='https://github.com/Charleeh/ecorche';
    const license=make('a','CC BY-SA 4.0');license.href='https://creativecommons.org/licenses/by-sa/4.0/';
    credits.append(atlasLink,document.createTextNode(' · BodyParts3D (DBCLS) and Z-Anatomy (Gauthier Kervyn) · '),license);
    const options=make('div');options.className='medical-scanner-options';
    options.append(header,controls,moveControls,directions,detail,credits);
    tools.append(make('summary','Scanner controls'),options);
    figure.append(stage,tools);
    if(window.thMedical3D)void window.thMedical3D.mount(stage,figure).then(state=>{threeState=state;state?.setMode?.(scannerLayer);state?.setSystem?.(figure.dataset.system);if(state)state.paused=scannerPaused;if(!state?.rotate)directions.textContent='3D is unavailable on this device. Use Skin, Anatomy or X-ray to change the illustration.'});
    figure.addEventListener('medical-system',event=>threeState?.setSystem?.(event.detail));
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
    const scanner=bodyScanner();
    const height=heightInches(profile.height);
    const metricsFor=(key,rows=composition)=>rows.filter(row=>Number.isFinite(row[key])).slice(0,2);
    const weightRows=weighIns.filter(row=>Number.isFinite(asPounds(row))).slice(-2).reverse();
    const weights=weightRows.map(asPounds);
    const weightPair=weights.length?weights:metricsFor('weight').map(row=>row.unit?asPounds(row):row.weight);
    const bmiPair=metricsFor('bmi').map(row=>row.bmi);
    const pairs={
      weight:weightPair,bmi:bmiPair.length?bmiPair:weightPair.map(pounds=>bmiFor(pounds,height)),
      bodyFat:metricsFor('bodyFat').map(row=>row.bodyFat),muscle:metricsFor('muscle').map(row=>row.muscle),
      water:metricsFor('water').map(row=>row.water),boneMass:metricsFor('boneMass').map(row=>row.boneMass)
    };
    // Interactive mission-control overview, using only existing recorded measurements.
    const dashboard=make('section');dashboard.className='medical-command-dashboard';
    const metrics=make('div');metrics.className='medical-command-metrics';
    const latestWeight=pairs.weight[0];
    const metricData=[
      ['⚖','Weight',' lb','weight'],['◈','BMI','','bmi'],['◉','Body Fat','%','bodyFat'],
      ['◆','Muscle','%','muscle'],['◌','Water','%','water'],['⬡','Bone Mass','%','boneMass']
    ].map(([symbol,label,unit,key])=>[symbol,label,pairs[key][0],unit,pairs[key][1],key]);
    for(const [symbol,label,value,unit,prior,key] of metricData){
      const card=make('div');card.className='medical-command-metric';
      card.append(dashboardIcon(symbol),make('span',label));
      card.append(make('strong',Number.isFinite(value)?value.toFixed(1)+unit:'—'));
      const source=key==='weight'?weightRows[0]:metricsFor(key)[0];
      if(source)card.title='Recorded '+(source.date||formatTime.format(measurementTime(source)));
      if(key==='bmi'&&!bmiPair.length&&Number.isFinite(value))card.title='Estimated from recorded weight and profile height';
      const change=make('small');
      if(Number.isFinite(value)&&Number.isFinite(prior)){
        const delta=rounded(rounded(value)-rounded(prior));
        change.textContent=delta===0?'No change':(delta>0?'↑ +':'↓ ')+delta.toFixed(1)+unit;
      }else change.textContent='—';
      card.append(change);metrics.append(card);
    }
    const stage=make('div');stage.className='medical-command-stage';
    const systems=make('aside');systems.className='medical-command-systems';
    systems.append(make('h3','Explore body systems'));
    const reading=(value,unit)=>Number.isFinite(value)?value.toFixed(1)+unit:'No recorded reading';
    const vital=(value,unit)=>String(value??'').trim()?String(value).trim()+' '+unit:'No recorded reading';
    const bodySystems=[
      ['brain','brain','Brain','Cognitive','Brain anatomy · no cognitive score is tracked'],
      ['heart','♡','Heart','Cardiovascular','Heart rate · '+vital(profile.heartRate,'bpm')],
      ['lungs','lungs','Lungs','Respiratory','Blood oxygen · '+vital(profile.oxygenSaturation,'%')],
      ['metabolism','flame','Metabolism','Endocrine','Thyroid anatomy · no thyroid reading is tracked'],
      ['digestive','digestive','Digestive','GI Health','Stomach and intestines · anatomy illustration'],
      ['muscle','muscle','Muscle','Strength','Recorded muscle · '+reading(pairs.muscle[0],'%')],
      ['bone','⬡','Bone','Skeletal','Recorded bone mass · '+reading(pairs.boneMass[0],'%')],
      ['hydration','◌','Hydration','Body Water','Recorded body water · '+reading(pairs.water[0],'%')],
      ['fat','▱','Body Fat','Composition','Recorded body fat · '+reading(pairs.bodyFat[0],'%')]
    ];
    const info=make('div');info.className='medical-system-readout';info.hidden=true;
    info.setAttribute('role','status');
    scanner.append(info);
    function showSystem(id){
      scannerSystem=id;
      scanner.dataset.system=id;
      for(const button of systems.querySelectorAll('button[data-system]')){
        button.setAttribute('aria-pressed',String(button.dataset.system===id));
      }
      const selected=bodySystems.find(([key])=>key===id);
      info.hidden=!selected;
      if(selected)info.replaceChildren(make('strong',selected[2]),make('span',selected[4]));
      else info.replaceChildren();
      scanner.dispatchEvent(new CustomEvent('medical-system',{detail:id}));
    }
    for(const [id,glyph,name,description] of bodySystems){
      const button=action(null,()=>{
        if(scannerSystem===id){showSystem('');return;}
        const mode=id==='bone'?'scan':'anatomy';
        if(scannerLayer!==mode)scanner.querySelector('[data-mode="'+mode+'"]')?.click();
        showSystem(id);
      });
      const icon=dashboardIcon(glyph);
      const caption=make('span',name);caption.append(make('small',description));
      button.append(icon,caption);
      button.dataset.system=id;
      button.className='medical-command-system';button.setAttribute('aria-pressed','false');systems.append(button);
    }
    showSystem(scannerSystem);
    const journey=make('section');journey.className='medical-command-journey medical-concept-panel';
    journey.append(make('h3','Weight Journey'));
    const journeyStart=Date.parse(compositionSource?.journeyStart);
    const history=weighIns.map(row=>({weight:asPounds(row),time:measurementTime(row)}))
      .filter(row=>Number.isFinite(row.weight)&&Number.isFinite(row.time)).sort((a,b)=>a.time-b.time);
    const series=history.some(row=>row.time===journeyStart)?history.filter(row=>row.time>=journeyStart):history;
    if(series.length>1){
      const first=series[0],last=series.at(-1),change=last.weight-first.weight;
      const minimum=Math.min(...series.map(row=>row.weight));
      const maximum=Math.max(...series.map(row=>row.weight));
      const step=Math.max(5,Math.ceil((maximum-minimum)/30)*5);
      const low=Math.floor(minimum/step)*step;
      const high=Math.max(low+step,Math.ceil(maximum/step)*step);
      const dateFormat=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
      const fullDate=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
      const svg=(tag,attributes={})=>{
        const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
        for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);
        return node;
      };
      const spark=svg('svg',{viewBox:'0 0 300 181',role:'img','aria-label':'Recorded weight over time'});
      const defs=svg('defs'), gradient=svg('linearGradient',{id:'medical-weight-area',x2:'0',y2:'1'});
      gradient.append(svg('stop',{'stop-color':'#b658ff','stop-opacity':'.74'}),
        svg('stop',{offset:'100%','stop-color':'#6b4acb','stop-opacity':'.04'}));
      defs.append(gradient);
      function drawPlot(width){
        const plotLeft=34,plotRight=width-26,plotWidth=plotRight-plotLeft;
        spark.setAttribute('viewBox','0 0 '+width+' 181');
        spark.replaceChildren(defs);
        const divisions=width<300?3:6;
        for(let index=0;index<=divisions;index++){
          const x=plotLeft+index*plotWidth/divisions;

          const date=svg('text',{x,y:178,'text-anchor':'middle'});
          date.textContent=dateFormat.format(first.time+index*(last.time-first.time)/divisions);
          spark.append(svg('path',{d:`M${x} 12V162`,class:'medical-chart-grid'}),date);
        }
        for(let tick=high;tick>=low;tick-=step){
          const y=162-(tick-low)*150/(high-low);
          const label=svg('text',{x:2,y:y+4});label.textContent=tick;
          spark.append(svg('path',{d:`M${plotLeft} ${y}H${plotRight}`,class:'medical-chart-grid'}),label);
        }
        const points=series.map(({weight,time},index)=>{
          const progress=last.time===first.time?index/(series.length-1):(time-first.time)/(last.time-first.time);
          return [plotLeft+progress*plotWidth,162-(weight-low)*150/(high-low)];
        });
        const path=points.map(pair=>pair.join(',')).join(' ');
        spark.append(svg('polygon',{points:plotLeft+',162 '+path+' '+plotRight+',162',fill:'url(#medical-weight-area)'}),
          svg('polyline',{points:path,fill:'none',stroke:'#d68aff','stroke-width':'2'}));
        points.forEach(([cx,cy],index)=>{
          if(points.length<=24||index===points.length-1)spark.append(svg('circle',{cx,cy,r:index===points.length-1?4:2,fill:'#f0c4ff'}));
        });
        const [lastX,lastY]=points.at(-1), labelX=lastX-59,labelY=Math.max(1,lastY-29);
        const tip=svg('text',{x:labelX+28,y:labelY+14,'text-anchor':'middle',class:'medical-chart-label'});
        tip.textContent=last.weight.toFixed(1)+' lb';
        spark.append(svg('rect',{x:labelX,y:labelY,width:57,height:21,rx:5,fill:'#06451f',stroke:'#56cf67'}),tip);
      }
      const summary=make('div');summary.className='medical-chart-summary';
      const signed=value=>(value>0?'+':'')+value.toFixed(1);
      const peak=series.reduce((max,row)=>row.weight>max.weight?row:max);
      summary.append(make('span','Total Change'),make('strong',(change<0?'↓ ':change>0?'↑ ':'')+signed(change)+' lb'),
        make('b',signed(change/first.weight*100)+'%'),
        make('span','Peak: '+peak.weight.toFixed(1)+' lb'),
        make('small',dateFormat.format(peak.time)),make('span','Current: '+last.weight.toFixed(1)+' lb'),
        make('small',dateFormat.format(last.time)));
      const chart=make('div');chart.className='medical-chart-layout';chart.append(spark,summary);
      const since=make('small','Since '+fullDate.format(first.time));since.className='medical-panel-date';journey.append(since,chart);
      drawPlot(300);
      const desktop=matchMedia('(min-width:1101px)');
      const chartResize=new ResizeObserver(([entry])=>{
        if(!spark.isConnected){chartResize.disconnect();return;}
        const {width,height}=entry.contentRect;
        if(width>0&&height>0)drawPlot(desktop.matches?Math.max(160,Math.round(181*width/height)):300);
      });
      chartResize.observe(spark);
    }else journey.append(make('p','More weigh-ins are needed for a trend.'));
    stage.id='medical-body-scan';
    stage.append(systems,scanner);
    const compositionPanel=make('section');compositionPanel.className='medical-concept-panel medical-concept-composition';
    compositionPanel.append(panelHeading('Body Composition','muscle'));
    const donut=make('div');donut.className='medical-composition-donut';
    const center=make('div');center.className='medical-composition-center';
    center.append(make('strong',Number.isFinite(latestWeight)?latestWeight.toFixed(1)+' lb':'—'),make('small','Total weight'));
    donut.append(center);
    const compositionLegend=make('div');compositionLegend.className='medical-composition-legend';
    const fat=pairs.bodyFat[0]??null;
    if(fat!==null){
      donut.style.background='conic-gradient(#ffc743 0 '+fat+'%,#46d8ff '+fat+'% 100%)';
      donut.title='Ring shows body fat and remaining weight. The legend includes overlapping scale estimates.';
    }
    for(const [name,key,color] of [['Body Fat','bodyFat','#ffca37'],['Muscle','muscle','#59b8f6'],
      ['Water','water','#42dffa'],['Bone Mass','boneMass','#bf7cff']]){
      const row=metricsFor(key)[0];
      const value=row?.[key], weight=row?.unit?asPounds(row):row?.weight;
      const item=make('div');const label=make('span',name);label.style.setProperty('--swatch',color);
      const amount=Number.isFinite(value)?value.toFixed(1)+'%':'—';
      const pounds=Number.isFinite(value)&&Number.isFinite(weight)?' ('+(value*weight/100).toFixed(1)+' lb)':'';
      item.append(label,make('strong',amount+pounds));compositionLegend.append(item);
    }
    compositionPanel.append(donut,compositionLegend);
    const progressPanel=make('section');progressPanel.className='medical-concept-panel';
    progressPanel.append(make('h3','Prior vs. Current'));
    const readingsTable=make('table');readingsTable.className='medical-reading-comparison';
    readingsTable.setAttribute('aria-label','Prior and current readings');
    const headings=make('tr'),head=make('thead'),rows=make('tbody');
    for(const label of ['Metric','Prior','Current']){
      const cell=make('th',label);cell.scope='col';headings.append(cell);
    }
    head.append(headings);
    const readingText=(value,unit)=>Number.isFinite(value)?value.toFixed(1)+unit:'—';
    for(const [,label,value,unit,prior] of metricData){
      const item=make('tr'),heading=make('th',label);heading.scope='row';
      item.append(heading,make('td',readingText(prior,unit)),make('td',readingText(value,unit)));
      rows.append(item);
    }
    readingsTable.append(head,rows);progressPanel.append(readingsTable);
    const panels=make('div');panels.className='medical-concept-panels';
    const vitalsPanel=make('section');vitalsPanel.className='medical-concept-panel';
    vitalsPanel.append(panelHeading('Vitals (Latest)','⌁'));
    const vitalGrid=make('div');vitalGrid.className='medical-vital-grid';
    for(const [key,label,symbol,unit] of vitalCards){
      const value=String(profile[key]??'').trim();
      const item=make('div');
      item.append(dashboardIcon(symbol),make('span',label),make('strong',value||'—'),
        make('small',value?unit:'Not recorded'));
      const recorded=profile[key+'Date'];
      const timestamp=/^\d{4}-\d{2}-\d{2}$/.test(recorded||'') ? Date.parse(recorded) : NaN;
      if(value&&Number.isFinite(timestamp)){
        const stamp=make('time',vitalDateLabel.format(timestamp));
        stamp.dateTime=recorded;
        const dateLine=make('small');
        dateLine.append(stamp);
        item.append(dateLine);
      }
      vitalGrid.append(item);
    }
    vitalsPanel.id='medical-latest-vitals';
    vitalsPanel.append(vitalGrid);
    const nextPanel=make('section');nextPanel.className='medical-concept-panel';nextPanel.id='medical-upcoming';
    nextPanel.append(panelHeading('Next / Upcoming','calendar'));
    const eastern=new Intl.DateTimeFormat('en-US',{
      timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',hourCycle:'h23'
    });
    const parts=Object.fromEntries(eastern.formatToParts(Date.now()).map(({type,value})=>[type,value]));
    const today=[parts.year,parts.month,parts.day].join('-');
    const upcoming=dates=>dates.filter(date=>/^\d{4}-\d{2}-\d{2}$/.test(date||'')&&date>=today&&Number.isFinite(Date.parse(date))).sort()[0];
    const nextDate=new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
    const saturdayRegimen=String(profile.currentList||'').split('\n').some(entry=>{
      const [name,,schedule]=entry.split('|').map(value=>value.trim());
      return isCompoundedTirzepatide(name)&&/^Saturday nights?$/i.test(schedule||'');
    });
    const saturday=new Date(today);
    const daysUntilSaturday=(6-saturday.getUTCDay()+7)%7;
    const cutoffPassed=Number(parts.hour)*60+Number(parts.minute)>20*60+45;
    saturday.setUTCDate(saturday.getUTCDate()+(daysUntilSaturday===0&&cutoffPassed?7:daysUntilSaturday));
    const saturdayDate=saturdayRegimen?saturday.toISOString().slice(0,10):undefined;
    const scheduledInjection=upcoming([profile.nextInjectionDate,medicationSource?.nextInjectionDate]
      .filter(date=>!(saturdayRegimen&&cutoffPassed&&daysUntilSaturday===0&&date===today)));
    const injectionDate=scheduledInjection||saturdayDate;
    for(const [label,symbol,date] of [
      ['Next Injection','syringe',injectionDate],
      ['Next Weight Check','⚖',upcoming([profile.nextWeightDate])],
      ['Next Appointment','calendar',upcoming([profile.nextAppointmentDate,...(api.upcomingAppointments?.()||[])])]
    ]){
      const injection=label==='Next Injection';
      const item=injection?action(null,openInjectionHistory):make('div');
      const copy=make('span');copy.append(make('b',label),make('span',date?nextDate.format(Date.parse(date))+(injection&&date===saturdayDate?' at 8:45 PM ET':''):injection?'See injection history':'Not scheduled'));
      item.className='medical-progress-row';item.append(dashboardIcon(symbol),copy);nextPanel.append(item);
    }
    const keyPanel=make('section');keyPanel.className='medical-concept-panel medical-key-panel';
    keyPanel.append(panelHeading('Key Metrics','◈'));
    for(const [label,key,symbol] of [['Body Fat','bodyFat','▱'],['Muscle','muscle','muscle'],['Body Water','water','◌'],['Bone Mass','boneMass','⬡']]){
      const value=pairs[key][0];
      const row=make('div');row.className='medical-key-row';
      row.append(dashboardIcon(symbol),make('span',label),make('strong',Number.isFinite(value)?value.toFixed(1)+'%':'—'));
      const bar=make('div');bar.className='medical-key-track';const fill=make('span');fill.style.width=Number.isFinite(value)?Math.max(0,Math.min(100,value))+'%':'0%';bar.append(fill);row.append(bar);keyPanel.append(row);
    }
    panels.append(vitalsPanel,nextPanel);
    const hero=make('div');hero.className='medical-reference-layout';
    const right=make('div');right.className='medical-reference-right';
    const overviewCard=make('section');overviewCard.className='medical-reference-overview';
    const scanDate=make('small');scanDate.className='medical-panel-date';
    const scanReading=composition.find(row=>['bmi','bodyFat','muscle','water','boneMass'].some(key=>Number.isFinite(row[key])));
    const scanTime=measurementTime(scanReading);
    if(Number.isFinite(scanTime)){
      const dateOnly=scanReading.date?.length===10 && scanTime===Date.parse(scanReading.date);
      scanDate.textContent='Last scan: '+(dateOnly?scanReading.date:formatTime.format(scanTime));
    }
    const healthTitle=make('h3','Health Overview');healthTitle.prepend(dashboardIcon('⌁'));
    overviewCard.append(healthTitle,scanDate,metrics);
    const middle=make('div');middle.className='medical-reference-middle';
    middle.append(compositionPanel,progressPanel);
    const lower=make('div');lower.className='medical-reference-lower';
    lower.append(journey,keyPanel);
    right.append(overviewCard,middle,lower);
    hero.append(stage,right);
    dashboard.append(hero,panels);
    const medicationPanel=make('section');medicationPanel.className='medical-concept-panel medical-reference-medications';medicationPanel.id='medical-current-medications';medicationPanel.append(panelHeading('Current Medications','pill'));panels.insertBefore(medicationPanel,nextPanel);target.replaceChildren(dashboard);
    const appleVitalTypes=['RestingHeartRate','HeartRate','OxygenSaturation','HeartRateVariabilitySDNN'];
    const privateVitals=mergeVitals(savedProfile);
    window.thMedicalAppleHealth?.attachScanner(scanner,stage,vitalCards.flatMap(([key,, ,unit],index)=>
      privateVitals[key]&&privateVitals[key+'Date']?[{
        type:appleVitalTypes[index], value:privateVitals[key], unit,date:privateVitals[key+'Date'],
        kind:'Individual sample',source:'Saved TisZod vitals'
      }]:[]
    ));
    const userList=String(profile.currentList||'').split('\n').map(line=>line.trim()).filter(Boolean);
    if(userList.length){
      const grid=make('div');grid.className='medical-regimen';
      for(const entry of userList){
        const [name,dose,schedule]=entry.split('|').map(value=>value.trim());
        const hasHistory=isCompoundedTirzepatide(name);
        const card=hasHistory?action(null,openInjectionHistory):make('section');
        const info=make(hasHistory?'span':'div');info.className='medical-regimen-copy';
        if(hasHistory){
          card.className='medical-injection-card';
          card.setAttribute('aria-haspopup','dialog');
          card.setAttribute('aria-label',name+' injection history');
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
        if(amount){
          const compact=amount.replace(/syringe units/gi,'units').replace(/,?\s*patient-reported(?=\))/gi,'');
          const dosage=make(hasHistory?'span':'p',compact);
          dosage.title=amount;info.append(dosage);
        }
        if(schedule)info.append(make(hasHistory?'span':'p',schedule));
        card.append(info);
        grid.append(card);
      }
      const count=make('small','('+userList.length+')');count.className='medical-panel-date';medicationPanel.append(count,grid);
    }else{
      const reviewed=api.records().filter(record=>record.kind==='Medication record'&&api.current(record));
      if(reviewed.length){
        const list=make('ul');
        for(const record of reviewed){
          const item=make('li');item.append(action(api.current(record),()=>api.open(record)));list.append(item);
        }
        medicationPanel.append(list);
      }else medicationPanel.append(make('p','No current medications have been confirmed.'));
    }
    if(loadMessage)target.append(make('p',loadMessage));
  }
  function edit() {
    const target = $('medical-about-profile'), form = make('form');
    form.className = 'medical-about-edit';
    const inputs = {};
    for (const [key,label] of fields) {
      const input = make(key === 'conditions' || key.endsWith('Note') ? 'textarea' : 'input');
      if (key === 'ageAsOf' || key.endsWith('Date')) input.type = 'date';
      input.value = profile[key] || ''; inputs[key] = input;
      const field = make('label',label); field.append(input); form.append(field);
    }
    const current = make('textarea'); current.rows = 3; current.value = profile.currentList || '';
    const currentField = make('label','Current medications: name | dose | schedule (one per line)');
    currentField.append(current); form.append(currentField);
    const submit = make('button','Save in this browser'), message = make('p');
    message.setAttribute('role','status');
    const pending={};
    const sync=action('Save vitals across devices',async()=>{
      const row=Object.fromEntries(vitalKeys.map(key=>[key,inputs[key].value.trim()]));
      if(vitalCards.some(([key])=>!row[key]||!row[key+'Date']||!Number.isFinite(Number(row[key])))){
        message.textContent='Enter a number and date for each vital.';
        return;
      }
      const signature=JSON.stringify(row);
      if(pending.signature!==signature){
        pending.signature=signature;
        pending.id=undefined;
        pending.savedAt=new Date().toISOString();
      }
      const buttons=Array.from(form.querySelectorAll('button'));
      buttons.forEach(button=>button.disabled=true);
      message.textContent='Saving private vitals…';
      try{
        await writeMedicalRecord({...row,savedAt:pending.savedAt},pending,undefined,
          'TisZod Vitals Entry.json','medicalVitals');
        syncedVitals=await loadVitals();
        profile=mergeVitals(profile);
        renderProfile();
      }catch(error){message.textContent=error.message;}
      finally{buttons.forEach(button=>button.disabled=false);}
    });
    form.append(submit,sync,action('Cancel',renderProfile),message);
    form.onsubmit = event => {
      event.preventDefault();
      const next = Object.fromEntries(Object.entries(inputs).map(([key,input]) => [key,input.value.trim()]));
      next.currentList = current.value.trim();
      next.profileUpdatedAt=new Date().toISOString();
      try {localStorage.setItem(api.key+':about',JSON.stringify(next));}
      catch {message.textContent = 'This browser could not save the profile.';return;}
      profile = mergeVitals({...savedProfile,...next}); renderProfile();
    };
    target.replaceChildren(form);
    inputs.height.focus();
  }
  async function loadProfile() {
    const medication=api.medicationSource().catch(()=>undefined);
    const doseLog=readAddedDoses().catch(()=>null);
    const vitals=loadVitals().catch(()=>null);
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
    const privateVitals=await vitals;
    if(privateVitals){syncedVitals=privateVitals;profile=mergeVitals(profile);}
    else loadMessage+=' Private vitals could not be loaded.';
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
  function addMedicalSidebar(){
    const sidebar=document.querySelector('.th-sidebar nav');
    const system=[...sidebar?.querySelectorAll('.th-nav-label')||[]].find(label=>label.textContent.trim()==='System');
    if(!system||sidebar.querySelector('.medical-sidebar-tools'))return;
    const group=make('div');group.className='medical-sidebar-tools';
    const heading=make('div','Medical tools');heading.className='th-nav-label';group.append(heading);
    const shortcuts=[
      ['⌁','Vitals & Trends','#medical-latest-vitals'],['muscle','Body Composition','#medical-body-scan'],
      ['⚖','Weight Journey','#weight-title'],['pill','Medications','#medical-current-medications'],
      ['syringe','Injection History',null],['lab','Lab Results','#medical-browse'],
      ['calendar','Appointments','#medical-upcoming'],['shield','Insurance & Providers','#medical-browse']
    ];
    for(const [symbol,label,href] of shortcuts){
      const link=href?make('a'):action(null,openInjectionHistory);
      if(href)link.href=href;
      else link.setAttribute('aria-haspopup','dialog');
      link.className='th-nav-link';
      const icon=dashboardIcon(symbol);icon.className='th-nav-icon';
      link.append(icon,document.createTextNode(label));group.append(link);
    }
    system.before(group);
  }
  window.thMedicalAbout = {
    careTeam,openInjectionHistory,
    start(options) {
      addMedicalSidebar();
      api = options; profile = {}; savedProfile = {}; syncedVitals = {}; compositionSource=null; medicationSource=null; injections=[]; loadMessage = '';
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
