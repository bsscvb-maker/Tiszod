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
  function openInjectionHistory(){
    const dialog=$('medical-injection-history');
    $('medical-injection-rows').replaceChildren(thMedicalFolders.injectionHistory(savedProfile.folderSummaries?.injections));
    if(!dialog.open)dialog.showModal();
  }
  function loggedMedicationAmount(name, dose) {
    const compound = /^compounded tirzepatide (?:with|\+) b12$/i;
    if(compound.test(name)&&medicationSource?.reportedDose)return medicationSource.reportedDose;
    if (!compound.test(name) || dose !== 'Current dose to confirm') return dose;
    const latest = (savedProfile.folderSummaries?.injections || [])
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

  function renderProfile() {
    const target=$('medical-about-profile'), stamp=$('medical-profile-updated');
    const updated=Date.parse(profile.profileUpdatedAt);
    stamp.hidden=!Number.isFinite(updated);
    if(!stamp.hidden){
      stamp.dateTime=new Date(updated).toISOString();
      stamp.textContent='Profile as of '+new Intl.DateTimeFormat('en-US',{
        timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'
      }).format(updated);
    }
    const overview=make('div');overview.className='medical-body-profile';
    const figure=make('figure'),silhouette=make('img');
    silhouette.src='assets/medical/body-profile.svg';silhouette.alt='Generic human body reference';
    figure.append(silhouette,make('figcaption',profile.height||'Height unlisted'));
    const grid=make('dl'),height=heightInches(profile.height);
    const composition=compositionReadings(profile);
    const weights=api.weights().slice(-2).reverse().map(asPounds);
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
      const formatTime=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
      const dates=make('p');dates.className='medical-measurement-dates';
      for(const [index,label] of ['Current','Prior'].entries()){
        const row=composition[index];
        if(row)dates.append(make('span',label+': '+(row.date?.length===10?row.date:formatTime.format(measurementTime(row)))));
      }
      const updated=Date.parse(compositionSource?.updatedAt);
      if(Number.isFinite(updated))dates.append(make('span','Updated: '+formatTime.format(updated)));
      measurements.append(make('h3','Body composition'),dates,readings);
    }
    overview.append(figure,measurements);target.replaceChildren(overview,make('h3','Current medications'));
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
    const medication=api.medicationSource?.().catch(()=>null);
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
    api.onFolderSummaries?.(savedProfile.folderSummaries);
    api.onWeighIns?.(savedProfile.weighIns);
    try {
      const local=JSON.parse(localStorage.getItem(api.key+':about')||'{}');
      if(savedProfile.currentList && !(Date.parse(local.profileUpdatedAt)>=Date.parse(savedProfile.profileUpdatedAt)))delete local.currentList;
      profile={...savedProfile,...local};
    }
    catch {profile = savedProfile;}
    if (!$('medical-about-profile').querySelector('form')) renderProfile();
  }
  window.thMedicalAbout = {
    careTeam,
    start(options) {
      api = options; profile = {}; savedProfile = {}; compositionSource=null; medicationSource=null; loadMessage = '';
      $('medical-about-edit').onclick = edit;
      renderProfile(); void loadProfile();
    },
    refresh() {
      if (!api) return;
      if (!$('medical-about-profile').querySelector('form')) renderProfile();
    }
  };
})();
