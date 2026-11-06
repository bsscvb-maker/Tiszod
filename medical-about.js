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
  let api, profile = {}, savedProfile = {}, loadMessage = '';

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
    const grid=make('dl'),weight=api.weights().at(-1),height=heightInches(profile.height);
    const pounds=weight?.unit==='lb'?weight.weight:weight?.unit==='kg'?weight.weight*2.2046226218:0;
    const bmi=height>0&&pounds>0?(703*pounds/(height*height)).toFixed(1):'Needs height and weight with units';
    for(const [label,value] of [
      ['Height',profile.height],
      ['Weight',weight&&Number(weight.weight.toFixed(1))+' '+(weight.unit||'(unit unlisted)')],
      ['Age',profile.age],
      ['BMI',bmi]
    ]){
      const item=make('div');item.append(make('dt',label),make('dd',value||'Needs confirmation'));grid.append(item);
    }
    const measurements=make('div');measurements.className='medical-measurements';
    measurements.append(make('h3','Vitals'),grid);
    const composition=profile.bodyComposition;
    if(composition?.date){
      const readings=make('dl');
      for(const [label,value,unit] of [
        ['Scale weight',composition.weight,' lb'],['Scale BMI',composition.bmi,''],
        ['Body fat',composition.bodyFat,'%'],['Muscle',composition.muscle,'%'],['Water',composition.water,'%']
      ]){
        if(!Number.isFinite(value))continue;
        const item=make('div');item.append(make('dt',label),make('dd',value+unit));readings.append(item);
      }
      const date=make('time',composition.date);date.dateTime=composition.date;
      const header=make('h3','Body composition');header.append(date);
      measurements.append(header,readings);
    }
    overview.append(figure,measurements);target.replaceChildren(overview,make('h3','Current medications'));
    const userList=String(profile.currentList||'').split('\n').map(line=>line.trim()).filter(Boolean);
    if(userList.length){
      const grid=make('div');grid.className='medical-regimen';
      for(const entry of userList){
        const [name,dose,schedule]=entry.split('|').map(value=>value.trim());
        const card=make('section'), info=make('div');
        const visuals=[
          [/citalopram/i,'citalopram','Tablet marked 0 and 6 separated by a score line'],
          [/wellbutrin\s+xl/i,'wellbutrin-xl','Tablet marked G 785'],
          [/tirzepatide/i,'tirzepatide-vial','Vial labeled Tirzepatide + B12']
        ];
        const visual=visuals.find(([match])=>match.test(name));
        if(visual){
          const picture=make('figure'),image=make('img');
          image.src='assets/medical/'+visual[1]+(visual[1]==='tirzepatide-vial'?'-pink.svg':'-imprint.webp');image.alt=visual[2];
          picture.append(image);card.append(picture);
        }
        info.append(make('strong',name));
        if(dose)info.append(make('p',dose));
        if(schedule)info.append(make('p',schedule));
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
    try {
      const files = await api.list("'me' in owners and name = '"+profileFilename+"'");
      if (files.length === 1) {
        const result = await thDriveFetch(files[0].id,{cache:'no-store'});
        if (!result.ok) throw Error('Could not read profile');
        savedProfile = await result.json();
      } else if (files.length > 1) loadMessage = 'More than one private profile was found. Browser edits are still available.';
      else loadMessage = 'No private Drive profile was found for this account. You can enter details here.';
    } catch {loadMessage = 'The private Drive profile could not be loaded. Browser edits are still available.';}
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
      api = options; profile = {}; savedProfile = {}; loadMessage = '';
      $('medical-about-edit').onclick = edit;
      renderProfile(); void loadProfile();
    },
    refresh() {
      if (!api) return;
      if (!$('medical-about-profile').querySelector('form')) renderProfile();
    }
  };
})();
