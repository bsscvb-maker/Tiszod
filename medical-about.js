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
    ['eyeCare','Ophthalmologist or eye-care practice'],
    ['conditions','Conditions and medical history']
  ];
  let api, profile = {}, savedProfile = {}, loadMessage = '';

  function renderProfile() {
    const target = $('medical-about-profile');
    const grid = make('dl');
    const overview=make('div');overview.className='medical-body-profile';
    const silhouette=make('img');silhouette.src='assets/medical/body-profile.svg';silhouette.alt='Generic human body silhouette';
    const weight = api.weights().at(-1);
    const entries = [
      ['Height',profile.height],
      ['Age',profile.age && profile.age+(profile.ageAsOf ? ' as of '+profile.ageAsOf : '')],
      ['Latest recorded weight',weight && weight.weight.toFixed(1)+(weight.unit?' '+weight.unit:' (unit not listed)')+' · '+weight.date],
      ['Primary care physician',profile.pcp,profile.contacts?.pcp],
      ['Ophthalmology',profile.eyeCare,profile.contacts?.eyeCare],
      ['Conditions and medical history',profile.conditions]
    ];
    for (const [label,value,contact] of entries) {
      const item=make('div'), data=make('dd',value||'Needs confirmation');
      if(contact?.address) data.append(make('p',contact.address));
      if(contact?.phone){
        const phone=make('a',contact.phone);phone.href='tel:'+contact.phone.replace(/[^+\d]/g,'');data.append(phone);
      }
      if(/^https:\/\//.test(contact?.url||'')){
        const line=make('p'),link=make('a',contact.linkLabel||'Practice website');
        link.href=contact.url;link.target='_blank';link.rel='noopener noreferrer';line.append(link);data.append(line);
      }
      item.append(make('dt',label),data);grid.append(item);
    }
    const med = make('ul');
    const reviewed = api.records().filter(record => record.kind === 'Medication record' && api.current(record));
    for (const item of Array.isArray(profile.medications) ? profile.medications : []) {
      med.append(make('li',[item.name,item.dose,item.note].filter(Boolean).join(' · ')));
    }
    overview.append(silhouette,grid);target.replaceChildren(overview,make('h3','Current medications'));
    const userList = String(profile.currentList || '').split('\n').map(line=>line.trim()).filter(Boolean);
    target.append(make('p',reviewed.length || userList.length?'Current medications you marked in the portal:':'Your full current medication list still needs confirmation.'));
    if (reviewed.length || userList.length) {
      const confirmed = make('ul');
      for (const item of userList) confirmed.append(make('li',item));
      for (const record of reviewed) {
        const li = make('li');
        li.append(action(api.current(record),()=>api.open(record)));
        confirmed.append(li);
      }
      target.append(confirmed);
    }
    if (med.childElementCount) target.append(make('p','Recent reports and details to verify:'),med);
    if (loadMessage) target.append(make('p',loadMessage));
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
    const currentField = make('label','Medications you confirm you take today (one per line)');
    currentField.append(current); form.append(currentField);
    const medicationInput = make('textarea');
    medicationInput.rows = 5;
    medicationInput.value = (profile.medications || []).map(item => [item.name,item.dose,item.note].join(' | ')).join('\n');
    const label = make('label','Medication name | dose | notes (one per line)');
    label.append(medicationInput); form.append(label);
    const submit = make('button','Save in this browser'), message = make('p');
    message.setAttribute('role','status');
    form.append(submit,action('Cancel',renderProfile),message);
    form.onsubmit = event => {
      event.preventDefault();
      const next = Object.fromEntries(Object.entries(inputs).map(([key,input]) => [key,input.value.trim()]));
      next.currentList = current.value.trim();
      next.medications = medicationInput.value.split('\n').map(line => {
        const [name,dose,...notes] = line.split('|').map(value => value.trim());
        return {name,dose,note:notes.join(' | ')};
      }).filter(item => item.name);
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
    try {profile = {...savedProfile,...JSON.parse(localStorage.getItem(api.key+':about') || '{}')};}
    catch {profile = savedProfile;}
    if (!$('medical-about-profile').querySelector('form')) renderProfile();
  }
  window.thMedicalAbout = {
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
