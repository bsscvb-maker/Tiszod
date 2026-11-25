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
  let syncedVitals = {}, savedVitalHistory = [];
  let driveComposition = [];
  const compositionRecord = 'medicalBodyComposition';
  const compositionFields = [['weight','Weight (lb)'],['bmi','BMI'],['bodyFat','Body fat (%)'],['muscle','Muscle (%)'],['water','Body water (%)']];
  async function loadDriveComposition() {
    const files = await api.list("'me' in owners and appProperties has { key='tiszodRecord' and value='"+compositionRecord+"' }");
    const rows = await Promise.all(files.map(async file => {
      const response = await thDriveFetch(file.id,{cache:'no-store'});
      if (!response.ok) throw Error('Private weigh-ins could not be loaded.');
      return {...await response.json(),driveId:file.id};
    }));
    return rows.sort((a,b)=>String(a.savedAt).localeCompare(String(b.savedAt)));
  }
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
    savedVitalHistory=rows;
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
  const saturdayInjection=(name,schedule='')=>isCompoundedTirzepatide(name)&&(
    /\bsaturdays?\b/i.test(schedule)||(/levocarnitine/i.test(name)&&/^(?:once )?weekly$/i.test(schedule))
  );
  function nextCheckDates(today,injectionLogged,weightLogged){
    const date=new Date(today);
    const daysToSaturday=(6-date.getUTCDay()+7)%7;
    const offsetDate=days=>new Date(date.getTime()+days*86400000).toISOString().slice(0,10);
    return {
      injection:offsetDate(daysToSaturday||(injectionLogged?7:0)),
      weight:offsetDate(weightLogged?1:0)
    };
  }
  const injectionProduct = name => /zepbound/i.test(name) ? 'Zepbound'
    : /levocarnitine/i.test(name) ? 'Compounded tirzepatide + Levocarnitine'
    : 'Compounded tirzepatide + B12';
  let selectedInjectionProduct = '';
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

  async function writeMedicalRecord(row,pending,driveId,name,recordType,parentId){
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
      if(parentId)metadata.parents=[parentId];
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
  function openInjectionHistory(medication){
    const dialog=$('medical-injection-history');
    selectedInjectionProduct = medication?.name ? injectionProduct(medication.name) : '';
    $('medical-injection-title').textContent = medication?.name || 'Tirzepatide';
    $('medical-injection-regimen').textContent = [medication?.dose, medication?.schedule].filter(Boolean).join(' · ');
    const edit = $('medical-injection-edit-medication');
    edit.hidden = !medication?.edit;
    edit.onclick = medication?.edit ? () => { dialog.close(); medication.edit(); } : null;
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
        fields.product.value=injectionProduct(row.product);
        fields.mg.value=row.mg??String(row.dose).match(/([\d.]+)\s*mg\b/i)?.[1]??'';
        fields.units.value=row.units??String(row.dose).match(/([\d.]+)\s*(?:syringe\s*)?units?\b/i)?.[1]??'';
        fields.notes.value=row.notes||'';
      }
      if(!row && selectedInjectionProduct) fields.product.value = selectedInjectionProduct;
      if(!isEdit)setEasternNow();
      submit.textContent=isEdit?'Save changes':'Save injection';
      $('medical-dose-form-title').textContent=isEdit?'Edit injection':'Add injection';
      $('medical-dose-review').textContent=!isEdit&&row?'Copied from the '+row.date+' entry. Confirm that the dose and notes apply to this injection.':'Review the values before saving.';
      dialog.showModal();
      fields.date.focus();
    }
    editDose=row=>openForm(row,true);
    copyDose=row=>openForm(row,false);
    $('medical-dose-add').onclick=()=>copyDose(injections.filter(row=>canEditDose(row)&&(!selectedInjectionProduct||injectionProduct(row.product)===selectedInjectionProduct)).sort((a,b)=>
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
    const readings=[...legacy,...confirmed,...driveComposition];
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

  const editFilename = 'TisZod Medical Profile Edits.json';
  const editTag = "appProperties has { key='tiszodRecord' and value='medicalProfileEdits' }";
  let profileEdits = {};
  let profileEditId;
  let profileEditsReady = false;
  let profileWritePending = false;
  let profileWrite = {};

  async function readProfileEdits() {
    const files = await api.list("'me' in owners and " + editTag);
    if (files.length > 1) throw Error('Multiple private profile edit files were found.');
    if (!files.length) return {};
    const response = await thDriveFetch(files[0].id,{cache:'no-store'});
    if (!response.ok) throw Error('Could not read the private profile edits.');
    return {...await response.json(),driveId:files[0].id};
  }

  async function saveProfileEdits(changes) {
    if (!profileEditsReady || profileWritePending) throw Error('Wait for the private profile to finish syncing.');
    profileWritePending = true;
    try {
      const {driveId,...latest} = await readProfileEdits();
      if (JSON.stringify(latest) !== JSON.stringify(profileEdits)) {
        throw Error('The private profile changed on another device. Refresh this page and try again.');
      }
      const row = {...latest,...changes};
      const saved = await writeMedicalRecord(row,profileWrite,driveId || profileEditId,editFilename,'medicalProfileEdits');
      const {driveId:verifiedId,...verified} = saved;
      profileEditId = verifiedId;
      profileEdits = verified;
      profileWrite = {};
      profile = mergeVitals({...savedProfile,...profileEdits});
    } finally {
      profileWritePending = false;
    }
  }

  async function loadProfileEdits() {
    const {driveId,...edits} = await readProfileEdits();
    profileEdits = edits;
    profileEditId = driveId;
    profileEditsReady = true;
    profile = {...savedProfile,...edits};
    const key = api.key + ':about';
    const legacy = JSON.parse(localStorage.getItem(key) || '{}');
    if (!Object.keys(legacy).length) return;
    const changes = {};
    const legacyMedicationTime = Date.parse(legacy.medicationListUpdatedAt || legacy.profileUpdatedAt);
    const driveMedicationTime = Date.parse(profile.medicationListUpdatedAt || profile.profileUpdatedAt) || 0;
    if (legacyMedicationTime >= driveMedicationTime) {
      for (const name of ['currentList','pastList']) {
        if (typeof legacy[name] === 'string') changes[name] = legacy[name];
      }
      changes.medicationListUpdatedAt = new Date().toISOString();
    }
    const legacyProfileTime = Date.parse(legacy.profileUpdatedAt);
    if (legacyProfileTime >= (Date.parse(profile.profileUpdatedAt) || 0)) {
      for (const [name] of fields) {
        if (typeof legacy[name] === 'string') changes[name] = legacy[name];
      }
      changes.profileUpdatedAt = legacy.profileUpdatedAt;
    }
    if (Object.keys(changes).length) await saveProfileEdits(changes);
    localStorage.removeItem(key);
  }

  let medicationTab = 'currentList';
  const medicationLines = value => String(value || '').split('\n').map(line => line.trim()).filter(Boolean);

  function editMedication(entry, index, activeList) {
    const dialog = make('dialog');
    const form = make('form');
    form.className = 'medical-about-edit';
    const heading = make('h3', entry ? 'Edit medication' : 'Add medication');
    heading.id = 'medical-medication-editor-title';
    dialog.setAttribute('aria-labelledby', heading.id);
    form.append(heading);
    const values = entry.split('|').map(value => value.trim());
    const inputs = ['Name', 'Dose or label strength', 'Schedule'].map((label, position) => {
      const field = make('label', label);
      const input = make('input');
      input.value = values[position] || '';
      input.required = position === 0;
      field.append(input);
      form.append(field);
      return input;
    });
    const status = make('p');
    status.setAttribute('role', 'status');
    const persist = async destination => {
      const fields = inputs.map(input => input.value.trim());
      if (!fields[0] || fields.some(value => value.includes('|'))) {
        status.textContent = 'Enter a medication name and remove any vertical bars.';
        return;
      }
      if (profileWritePending) return;
      status.textContent = 'Saving to private Drive…';
      try {
        const lists = {
          currentList: medicationLines(profile.currentList),
          pastList: medicationLines(profile.pastList)
        };
        const updated = fields.join(' | ');
        if (index >= 0) lists[activeList].splice(index, 1);
        lists[destination].splice(destination === activeList && index >= 0 ? index : lists[destination].length, 0, updated);
        const changes = {
          currentList: lists.currentList.join('\n'),
          pastList: lists.pastList.join('\n'),
          medicationListUpdatedAt: new Date().toISOString()
        };
        await saveProfileEdits(changes);
      } catch (error) {
        status.textContent = error.message;
        return;
      }
      medicationTab = destination;
      dialog.close();
      renderProfile();
      document.querySelector('#medical-current-medications [aria-pressed="true"]')?.focus();
    };
    form.onsubmit = event => { event.preventDefault(); persist(activeList); };
    form.append(make('button', 'Save across devices'));
    if (entry) {
      const isCurrent = activeList === 'currentList';
      form.append(action(isCurrent ? 'Move to Past' : 'Restore to Current',
        () => persist(isCurrent ? 'pastList' : 'currentList')));
    }
    if (isCompoundedTirzepatide(values[0] || '')) {
      form.append(action('Injection history', () => { dialog.close(); openInjectionHistory(); }));
    }
    form.append(action('Cancel', () => dialog.close()), status);
    dialog.append(form);
    dialog.addEventListener('close', () => dialog.remove(), {once:true});
    document.body.append(dialog);
    dialog.showModal();
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
    const metricStatus=window.thMedicalMetricStatus;
    const compositionTypes=['BodyMass','BodyMassIndex','BodyFatPercentage','Muscle','BodyWaterPercentage','BoneMass'];
    const statusByKey=new Map();
    const compositionCards=[];
    for(const [index,[symbol,label,value,unit,,key]] of metricData.entries()){
      const isWeight=key==='weight';
      const source=isWeight?(weightRows[0]||metricsFor(key)[0]):(metricsFor(key)[0]||weightRows[0]);
      const makeReading=(row,amount)=>({
        type:compositionTypes[index],value:amount,unit:unit.trim(),source:isWeight?'TisZod':(row?.source||'TisZod scale'),
        date:row?.date,time:measurementTime(row)
      });
      const entry=makeReading(source,value);
      const history=(isWeight?weighIns:composition).map(row=>makeReading(row,isWeight?asPounds(row):row[key]));
      if(isWeight)entry.goal={min:180,max:189};
      const status=metricStatus.compare(entry,history);
      statusByKey.set(key,status);
      if(Number.isFinite(value))compositionCards.push({...entry,label,status});

      const card=make('div');card.className='medical-command-metric';
      card.append(dashboardIcon(symbol),make('span',label),
        make('strong',Number.isFinite(value)?value.toFixed(1)+unit:'—'),metricStatus.badge(status));
      if(source)card.title='Recorded '+(source.date||formatTime.format(measurementTime(source)));
      if(key==='bmi'&&!bmiPair.length&&Number.isFinite(value))card.title='Estimated from recorded weight and profile height';
      metrics.append(card);
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
        spark.append(svg('rect',{x:labelX,y:labelY,width:57,height:21,rx:5,fill:'#172a40',stroke:'#6a8dac'}),tip);
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
    const appleVitalTypes=['RestingHeartRate','HeartRate','OxygenSaturation','HeartRateVariabilitySDNN'];
    function renderLatestVitals(appleReadings=new Map(),compare=metricStatus.compare){
      const items=vitalCards.map(([key,label,symbol,unit],index)=>{
        const savedDate=profile[key+'Date'];
        const savedTime=Date.parse(savedDate);
        const apple=appleReadings.get(appleVitalTypes[index]);
        const useApple=apple&&(!profile[key]||!Number.isFinite(savedTime)||apple.time>=savedTime);
        const value=useApple?apple.value.toLocaleString('en-US',{maximumFractionDigits:2}):String(profile[key]??'').trim();
        const recorded=useApple?apple.date:savedDate;
        const timestamp=Date.parse(recorded);
        const item=make('div');
        item.append(dashboardIcon(symbol),make('span',label),make('strong',value||'—'),
          make('small',value?unit:''),
          metricStatus.badge(compare(useApple?apple:{type:appleVitalTypes[index],value,unit,date:savedDate,time:savedTime})));
        if(value&&Number.isFinite(timestamp)){
          const stamp=make('time',(useApple?formatTime:vitalDateLabel).format(timestamp));
          stamp.dateTime=recorded;
          const dateLine=make('small');
          dateLine.append(stamp);
          item.append(dateLine);
        }
        if(useApple)item.append(make('small',apple.source||'Apple Health'));
        return item;
      });
      vitalGrid.replaceChildren(...items);
    }
    renderLatestVitals();
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
    const saturdayRegimen=medicationLines(profile.currentList).some(entry=>{
      const [name,,schedule]=entry.split('|').map(value=>value.trim());
      return saturdayInjection(name,schedule);
    });
    const injectionLogged=injections.some(row=>row.date===today&&isCompoundedTirzepatide(row.product)&&canEditDose(row));
    const weightLogged=weightRows.some(row=>{
      if(/^\d{4}-\d{2}-\d{2}$/.test(row.date||''))return row.date===today;
      const time=measurementTime(row);
      if(!Number.isFinite(time))return false;
      const fields=Object.fromEntries(eastern.formatToParts(time).map(({type,value})=>[type,value]));
      return [fields.year,fields.month,fields.day].join('-')===today;
    });
    const nextChecks=nextCheckDates(today,injectionLogged,weightLogged);
    const injectionDate=saturdayRegimen?nextChecks.injection:upcoming([profile.nextInjectionDate,medicationSource?.nextInjectionDate]);
    for(const [label,symbol,date] of [
      ['Next Injection','syringe',injectionDate],
      ['Next Weight Check','⚖',nextChecks.weight],
      ['Next Appointment','calendar',upcoming([profile.nextAppointmentDate,...(api.upcomingAppointments?.()||[])])]
    ]){
      const injection=label==='Next Injection';
      const item=injection?action(null,openInjectionHistory):make('div');
      const copy=make('span');copy.append(make('b',label),make('span',date?nextDate.format(Date.parse(date)):injection?'See injection history':'Not scheduled'));
      item.className='medical-progress-row';item.append(dashboardIcon(symbol),copy);nextPanel.append(item);
    }
    const keyPanel=make('section');keyPanel.className='medical-concept-panel medical-key-panel';
    keyPanel.append(panelHeading('Key Metrics','◈'));
    for(const [label,key,symbol] of [['Body Fat','bodyFat','▱'],['Muscle','muscle','muscle'],['Body Water','water','◌'],['Bone Mass','boneMass','⬡']]){
      const value=pairs[key][0];
      const row=make('div');row.className='medical-key-row';
      row.append(dashboardIcon(symbol),make('span',label),make('strong',Number.isFinite(value)?value.toFixed(1)+'%':'—'));
      const bar=make('div');bar.className='medical-key-track';const fill=make('span');fill.style.width=Number.isFinite(value)?Math.max(0,Math.min(100,value))+'%':'0%';bar.append(fill);row.append(bar,metricStatus.badge(statusByKey.get(key)));keyPanel.append(row);
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
    const medicationPanel=make('section');medicationPanel.className='medical-concept-panel medical-reference-medications';medicationPanel.id='medical-current-medications';medicationPanel.append(panelHeading('Medications','pill'));panels.insertBefore(medicationPanel,nextPanel);target.replaceChildren(dashboard);
    const privateVitals=mergeVitals(savedProfile);
    const vitalEntries=row=>vitalCards.flatMap(([key,,,unit],index)=>
      row[key]&&row[key+'Date']?[{
        type:appleVitalTypes[index],value:row[key],unit,date:row[key+'Date'],
        kind:'Individual sample',source:'Saved TisZod vitals'
      }]:[]
    );
    window.thMedicalAppleHealth?.attachScanner(scanner,stage,vitalEntries(privateVitals), [
      ...(Number.isFinite(height) && height > 0 ? [{
        type:'Height',value:Math.floor(height/12)+' ft '+height%12+' in',source:'TisZod'
      }] : []),
      ...compositionCards
    ],renderLatestVitals,savedVitalHistory.flatMap(vitalEntries));
    const controls=make('div');
    controls.className='medical-medication-controls';
    for(const [key,label] of [['currentList','Current'],['pastList','Past']]){
      const button=action(label+' ('+medicationLines(profile[key]).length+')',()=>{
        medicationTab=key;
        renderProfile();
        document.querySelector('#medical-current-medications [aria-pressed="true"]')?.focus();
      });
      button.setAttribute('aria-pressed',String(key===medicationTab));
      controls.append(button);
    }
    controls.append(action('Add medication',()=>editMedication('',-1,'currentList')));
    medicationPanel.append(controls);
    const userList=medicationLines(profile[medicationTab]);
    if(userList.length){
      const grid=make('div');grid.className='medical-regimen';
      for(const [index,entry] of userList.entries()){
        const [name,dose,savedSchedule]=entry.split('|').map(value=>value.trim());
        const activeList = medicationTab;
        const schedule=activeList==='currentList'&&saturdayInjection(name,savedSchedule)?'Every Saturday':savedSchedule;
        const edit = () => editMedication(entry,index,activeList);
        const amount = activeList==='currentList' ? loggedMedicationAmount(name,dose) : dose;
        const hasHistory = isCompoundedTirzepatide(name) || /zepbound/i.test(name);
        const card=action(null,hasHistory
          ? ()=>openInjectionHistory({name,dose:amount,schedule,edit})
          : edit);
        card.className='medical-injection-card';
        card.setAttribute('aria-haspopup','dialog');
        card.setAttribute('aria-label',hasHistory ? name+' injection history' : 'Edit '+name);
        const info=make('span');info.className='medical-regimen-copy';
        const visuals=[
          [/citalopram/i,'citalopram','Tablet marked 0 and 6 separated by a score line'],
          [/wellbutrin\s+xl/i,'wellbutrin-xl','Tablet marked G 785'],
          [/tirzepatide.*levocarnitine/i,null,'Blue-cap vial labeled Tirzepatide + Levocarnitine'],
          [/tirzepatide/i,'tirzepatide-vial','Vial labeled Tirzepatide + B12']
        ];
        const visual=visuals.find(([match])=>match.test(name));
        if(visual){
          const picture=make('span'),image=make('img');
          picture.className='medical-regimen-photo';
          image.src=visual[1]===null
            ? 'data:image/webp;base64,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'
            : 'assets/medical/'+visual[1]+(visual[1]==='tirzepatide-vial'?'-pink.svg':'-imprint.webp');
          image.alt=visual[2];
          picture.append(image);card.append(picture);
        }
        info.append(make('strong',name));
        if(amount){
          const compact=amount.replace(/syringe units/gi,'units').replace(/,?\s*patient-reported(?=\))/gi,'');
          const dosage=make('span',compact);
          dosage.title=amount;info.append(dosage);
        }
        if(schedule)info.append(make('span',schedule));
        card.append(info);
        grid.append(card);
      }
      medicationPanel.append(grid);
    }else if(medicationTab==='pastList'){
      medicationPanel.append(make('p','No past medications.'));
    }else{
      const reviewed=api.records().filter(record=>record.kind==='Medication record'&&api.current(record));
      if(reviewed.length && profile.currentList == null){
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
    const submit = make('button','Save across devices'), message = make('p');
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
    const composition = make('fieldset');
    composition.append(make('legend','Add a Weight Gurus reading'));
    const date = make('input');
    date.type = 'date';
    const dateLabel = make('label','Weigh-in date');
    dateLabel.append(date);
    composition.append(dateLabel);
    const measurements = compositionFields.map(([key,label]) => {
      const input = make('input');
      input.type = 'number';
      input.step = '0.1';
      input.min = '0';
      const field = make('label',label);
      field.append(input);
      composition.append(field);
      return [key,input];
    });
    const status = make('p');
    status.setAttribute('role','status');
    const pendingComposition = {};
    const saveComposition = action('Save body composition to Google Drive',async () => {
      const row = {date:date.value,unit:'lb',source:'Weight Gurus'};
      for (const [key,input] of measurements) row[key] = Number(input.value);
      if (!row.date || !measurements.every(([key])=>row[key]>0) ||
          [row.bodyFat,row.muscle,row.water].some(value=>value>100)) {
        status.textContent = 'Enter the date and all five readings.';
        return;
      }
      const signature = JSON.stringify(row);
      if (pendingComposition.signature !== signature) {
        pendingComposition.signature = signature;
        pendingComposition.id = undefined;
        pendingComposition.savedAt = new Date().toISOString();
      }
      const buttons = Array.from(form.querySelectorAll('button'));
      buttons.forEach(button=>button.disabled=true);
      status.textContent = 'Saving body composition to Google Drive…';
      try {
        const existing = (await loadDriveComposition()).findLast(entry=>entry.date===row.date);
        const saved = await writeMedicalRecord({...row,savedAt:pendingComposition.savedAt},
          pendingComposition,existing?.driveId,'TisZod Body Composition '+row.date+'.json',compositionRecord);
        driveComposition = [...driveComposition.filter(entry=>entry.date!==row.date),saved];
        api.onWeighIns?.(chartWeighIns(savedProfile));
        status.textContent = 'Body composition saved and verified in Google Drive.';
      } catch (error) { status.textContent = error.message; }
      finally { buttons.forEach(button=>button.disabled=false); }
    });
    composition.append(saveComposition,status);
    form.append(composition);
    form.onsubmit = async event => {
      event.preventDefault();
      if (profileWritePending) return;
      const next = Object.fromEntries(Object.entries(inputs).map(([key,input]) => [key,input.value.trim()]));
      next.currentList = current.value.trim();
      next.pastList = profile.pastList || '';
      next.medicationListUpdatedAt = new Date().toISOString();
      next.profileUpdatedAt=new Date().toISOString();
      message.textContent = 'Saving to private Drive…';
      try {await saveProfileEdits(next);}
      catch (error) {message.textContent = error.message;return;}
      renderProfile();
    };
    target.replaceChildren(form);
    inputs.height.focus();
  }
  async function loadProfile() {
    const medication=api.medicationSource().catch(()=>undefined);
    const doseLog=readAddedDoses().catch(()=>null);
    const vitals=loadVitals().catch(()=>null);
    const driveReadings=loadDriveComposition().catch(()=>null);
    const source=api.compositionSource?.().catch(()=>{loadMessage+=' Body composition source could not be loaded.';return null;});
    try {
      const files = await api.list("'me' in owners and name = '"+profileFilename+"'");
      if (files.length === 1) {
        const result = await thDriveFetch(files[0].id,{cache:'no-store'});
        if (!result.ok) throw Error('Could not read profile');
        savedProfile = await result.json();
      } else if (files.length > 1) loadMessage = 'More than one private profile was found. ';
      else loadMessage = 'No private Drive profile was found for this account. ';
    } catch {loadMessage = 'The private Drive profile could not be loaded. ';}
    [compositionSource,medicationSource]=await Promise.all([source,medication]);
    syncInjections();
    if($('medical-injection-history').open)renderInjectionHistory();
    profile = savedProfile;
    try {await loadProfileEdits();}
    catch {loadMessage += ' Private profile edits could not be synced.';}
    const privateVitals=await vitals;
    const savedComposition=await driveReadings;
    if (savedComposition) driveComposition=savedComposition;
    else loadMessage+=' Private weigh-ins could not be loaded.';
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
    saveReview(row,pending,driveId,parentId) {
      return writeMedicalRecord(row,pending,driveId,'TisZod Medical Review.json','medicalReview',parentId);
    },
    start(options) {
      addMedicalSidebar();
      medicationTab = 'currentList';
      profileEdits = {}; profileEditId = undefined; profileEditsReady = false; profileWritePending = false; profileWrite = {};
      api = options; profile = {}; savedProfile = {}; syncedVitals = {}; driveComposition=[]; compositionSource=null; medicationSource=null; injections=[]; loadMessage = '';
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
