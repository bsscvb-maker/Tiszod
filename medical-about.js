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
    ['pcp','Primary care physician'], ['pcpNote','Primary care notes'],
    ['eyeCare','Ophthalmologist or eye-care practice'], ['eyeNote','Eye-care notes'],
    ['conditions','Conditions and medical history']
  ];
  let api, profile = {}, savedProfile = {}, loadMessage = '', request = 0;

  const normalize = text => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const aliases = [
    ['azithromycin','z pak','zpak','z pack','zithromax'],
    ['erythromycin','erythrocin']
  ];
  function matchMedication(record, query) {
    if (!query) return true;
    const terms = aliases.find(group => group.includes(query)) || [query];
    const source = ' ' + normalize([record.name,api.eventName(record)].join(' ')) + ' ';
    return terms.some(term => source.includes(' ' + term + ' '));
  }
  function sourceButton(record) {return action(record.name,() => api.open(record));}
  function renderYears() {
    const target = $('medical-about-years'), query = normalize($('medical-about-drug').value);
    const yearOf = record => api.eventDate(record).slice(0,4);
    const sources = api.records().filter(record => record.kind === 'Medication record' && matchMedication(record,query));
    const written = api.confirmedEvents('Prescription written').filter(record => matchMedication(record,query));
    const filled = api.confirmedEvents('Fill documented').filter(record => matchMedication(record,query));
    const availableYears = api.records().filter(record => record.kind === 'Medication record').map(yearOf).filter(year => /^\d{4}$/.test(year));
    const currentYear = new Date().getFullYear();
    const oldest = Math.min(currentYear,...availableYears.map(Number));
    const years = Array.from({length:currentYear-oldest+1},(_,i)=>String(currentYear-i));
    if ([...sources,...written,...filled].some(record=>!yearOf(record))) years.push('');
    target.replaceChildren();
    target.append(make('p',sources.length+' matching source files · '+written.length+' reviewed prescriptions · '+filled.length+' reviewed fills'));
    if (!years.length) return;
    const table = make('table'), head = make('thead'), body = make('tbody'), header = make('tr');
    for (const text of ['Year','Source files','Written','Filled']) {
      const th = make('th',text); th.scope = 'col'; header.append(th);
    }
    head.append(header); table.append(head,body);
    for (const year of years) {
      const row = make('tr'), group = sources.filter(record => yearOf(record) === year);
      const label = make('th',year || 'Undated'); label.scope = 'row';
      const cell = make('td');
      const detail = make('details'), summary = make('summary',String(group.length));
      summary.setAttribute('aria-label','View '+group.length+' source files for '+(year || 'undated records'));
      if (group.length) {detail.append(summary,...group.map(sourceButton)); cell.append(detail);}
      else cell.textContent = '0';
      row.append(label,cell,make('td',written.filter(record => yearOf(record)===year).length),
        make('td',filled.filter(record => yearOf(record)===year).length));
      body.append(row);
    }
    target.append(table);
  }
  function renderProfile() {
    const target = $('medical-about-profile');
    const grid = make('dl');
    const weight = api.weights().at(-1);
    const entries = [
      ['Height',profile.height],
      ['Age',profile.age && profile.age+(profile.ageAsOf ? ' as of '+profile.ageAsOf : '')],
      ['Latest recorded weight',weight && weight.weight.toFixed(1)+(weight.unit?' '+weight.unit:' (unit not listed)')+' · '+weight.date],
      ['Primary care physician',[profile.pcp,profile.pcpNote].filter(Boolean).join(' · ')],
      ['Ophthalmology',[profile.eyeCare,profile.eyeNote].filter(Boolean).join(' · ')],
      ['Conditions and medical history',profile.conditions]
    ];
    for (const [label,value] of entries) {
      const item = make('div'); item.append(make('dt',label),make('dd',value || 'Needs confirmation')); grid.append(item);
    }
    const med = make('ul');
    const reviewed = api.records().filter(record => record.kind === 'Medication record' && api.current(record));
    for (const item of Array.isArray(profile.medications) ? profile.medications : []) {
      med.append(make('li',[item.name,item.dose,item.note].filter(Boolean).join(' · ')));
    }
    target.replaceChildren(grid,make('h3','Current medication list and recent reports'));
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
    const shortcuts = make('div'); shortcuts.className = 'medical-about-shortcuts';
    const quickSearch = (label, value) => action(label,() => {
      $('medical-about-query').value = value;
      $('medical-about-search').requestSubmit();
      $('medical-about-query').focus();
    });
    if (profile.pcp) shortcuts.append(quickSearch('Find primary care records',profile.pcp.split(' ').at(-1)));
    shortcuts.append(quickSearch('Find eye-care records','eyeglass prescription'));
    if (api.workbook()) {
      const link = make('a','Open weight source'); link.href = api.workbook().url;
      link.target = '_blank'; link.rel = 'noopener'; shortcuts.append(link);
    }
    target.append(shortcuts);
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
      profile = next; renderProfile();
    };
    target.replaceChildren(form);
    inputs.height.focus();
  }
  async function search(event) {
    event.preventDefault();
    const serial = ++request;
    const query = $('medical-about-query').value.trim(), target = $('medical-about-search-results');
    const message = $('medical-about-search-status');
    target.replaceChildren();
    if (!query) {message.textContent = 'Enter a search term.';return;}
    const local = api.records().filter(record => normalize([record.name,...record.path].join(' ')).includes(normalize(query)));
    message.textContent = 'Checking record names and Drive’s text index…';
    let matches = local, fallback = false;
    try {
      const escaped = query.replaceAll('\\','\\\\').replaceAll("'","\\'");
      const files = await api.list("fullText contains '"+escaped+"'");
      const ids = new Set([...files,...local].map(file => file.id));
      matches = api.records().filter(record => ids.has(record.id));
    } catch {fallback = true;}
    if (serial !== request) return;
    matches.sort((a,b)=>api.eventDate(b).localeCompare(api.eventDate(a)));
    message.textContent = matches.length+' matching records'+(matches.length>30?' · first 30 shown':'')+
      (fallback?' · filename matches only.':' · image-only scans may be missing from the text index.');
    target.replaceChildren(...matches.slice(0,30).map(sourceButton));
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
    api.onWeighIns?.(savedProfile.weighIns);
    try {profile = {...savedProfile,...JSON.parse(localStorage.getItem(api.key+':about') || '{}')};}
    catch {profile = savedProfile;}
    if (!$('medical-about-profile').querySelector('form')) renderProfile();
  }
  window.thMedicalAbout = {
    start(options) {
      api = options; profile = {}; savedProfile = {}; loadMessage = '';
      $('medical-about-edit').onclick = edit;
      $('medical-about-drug').oninput = renderYears;
      $('medical-about-search').onsubmit = search;
      renderProfile(); renderYears(); void loadProfile();
    },
    refresh() {
      if (!api) return;
      if (!$('medical-about-profile').querySelector('form')) renderProfile();
      renderYears();
    }
  };
})();
