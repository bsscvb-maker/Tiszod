/* Family collections are resolved in the signed-in browser. */
(() => {
 const mount = document.querySelector('[data-family-collections]');
 const area = mount?.dataset.familyCollections || 'identification';
 if (area === 'education' && ['books','career'].includes(new URLSearchParams(location.search).get('view'))) return;
 const people = ['Aiden', 'Alexis', 'Tracy', 'Todd'];
 const labels = {
  family: 'Family records', education: 'School records by person', medical: 'Medical records by person',
  hobbies: 'Family activities', identification: 'Family identification records'
 };
 const photo = name => /\.(?:jpg|png|svg|webp)$/.test(name) ? name : 'assets/family-unique/' + name + '.webp';
 // A photograph is assigned to one location only. The viewer illustrates all other locations individually.
 const photos = new Map(Object.entries({
  'family/Aiden': 'aiden-family', 'family/Alexis': 'alexis-family',
  'family/Tracy': 'tracy-family', 'family/Todd': 'todd-family',
  'education/Aiden': 'aiden-education', 'education/Alexis': 'alexis-education',
  'medical/Aiden': 'aiden-medical', 'medical/Alexis': 'alexis-medical',
  'medical/Tracy': 'tracy-medical', 'medical/Todd': 'todd-medical',
  'hobbies/Aiden': 'aiden-recreation', 'hobbies/Alexis': 'alexis-recreation',
  'hobbies/Todd': 'command-photos/off-road-jaguar-chrome.jpg', 'hobbies/Tracy': 'assets/hobbies/tracy-garden.svg', 'hobbies/Zach': 'assets/hobbies/zach-trail.svg', 'identification/Alexis': 'alexis-id', 'identification/Aiden': 'assets/family/identification.webp',
  'family/Aiden/01 School & IEP': 'classroom', 'family/Alexis/01 School': 'alexis-school',
  'family/Aiden/01 School & IEP/Early Childhood Special Education': 'early-childhood',
  'family/Aiden/01 School & IEP/Preschool Screening & Assessment': 'preschool',
  'family/Aiden/01 School & IEP/Report Cards & Progress': 'progress',
  'family/Aiden/Health & Support': 'health-forms',
  'family/Aiden/Health & Support/Syringomyelia': 'mri',
  'family/Aiden/Health & Support/Medicaid & Health Insurance': 'coverage',
  'family/Aiden/Activities & Sports': 'basketball',
  'family/Aiden/Photos & Keepsakes': 'keepsakes',
  'family/Aiden/Personal Records': 'archive-boxes',
  'family/Alexis/Health': 'assets/medical/providers.webp',
  'family/Alexis/Health/Dental': 'dental',
  'family/Alexis/Health/Vision Care': 'vision',
  'family/Alexis/Health/Prescriptions': 'prescription',
  'family/Alexis/Activities & Volunteering': 'volunteering',
  'family/Alexis/Activities & Volunteering/Girl Scouts': 'scouts',
  'family/Alexis/Activities & Volunteering/Horseback Riding': 'horse',
  'family/Alexis/Activities & Volunteering/Ice Skating': 'skating',
  'family/Alexis/Activities & Volunteering/Running': 'running',
  'family/Alexis/Activities & Volunteering/Busch Gardens': 'coaster',
  'family/Alexis/Activities & Volunteering/Tidewater Striders - Youth Advisory Committee': 'race-medal',
  'family/Alexis/01 School/School Awards & Honors': 'graduation',
  'family/Alexis/Personal Records': 'folders',
  'family/Alexis/Personal Records/DMV & Driver Records': 'driver',
  'family/Todd/Cards': 'greetings', 'family/Todd/Tickets': 'assets/family/tickets.webp',
  'medical/Aiden/Health & Support': 'therapy',
  'medical/Alexis/Health': 'medical-lab',
  'medical/Todd/About Me': 'health-envelopes',
  'family/Aiden/Health & Support/Immunization Records': 'vaccination',
  'family/Aiden/Health & Support/Syringomyelia/Diagnosis and Letters': 'radiographs',
  'family/Aiden/Health & Support/Syringomyelia/Diagnosis and Letters/Test Results': 'scanner',
  'family/Aiden/Personal Records/Archives & OneNote Recovery': 'scan-disc',
  'family/Alexis/Personal Records/Letters, Photos & Keepsakes': 'film',
  'education/Alexis/01 School/School Awards & Honors': 'education-award',
  'education/Aiden/01 School & IEP': 'assets/family/school.webp',
  'education/Alexis/01 School': 'assets/family/school-reports.webp',
  'hobbies/Aiden/Baseball': 'assets/family/sports.webp',
  'hobbies/Aiden/Ice Skating': 'skating',
  'hobbies/Aiden/Running': 'running',
  'hobbies/Alexis/Girl Scouts': 'scouts',
  'hobbies/Alexis/Horseback Riding': 'horse',
  'hobbies/Todd/Tickets': 'assets/hobbies/tickets.svg',
  'hobbies/Todd/Black & Mild': 'assets/hobbies/black-and-mild-logo.png',
  'hobbies/Todd/Freebirds': 'freebirds-logo.svg'
 }));
 const coverFor = path => {
  const key = path.join('/').replace(/^((?:family|medical|hobbies)\/(?:Aiden|Alexis)\/)0[2-5] /, '$1');
  const name = photos.get(key);
  return name ? photo(name) : area==='hobbies'?recreationFolderCover(path):undefined;
 };
 const decorate = (record, parent) => ({
  ...record,
  displayName: record.name.replace(/^\d{2} /, ''),
  coverPath: [...parent, record.name],
  coverFor,
  childFolderLabel: name => name.replace(/^\d{2} /, ''),
  driveAction: true
 });
 const exact = name => file => file.name.replace(/^\d{2} /, '') === name;
 const link = (name, readerUrl) => ({
  name, readerUrl, directReader: true, closeOnOpen: true, kindLabel: 'Section', cardLabel: 'Open section'
 });
 const toddMedical = [
  link('Weight history', 'medical.html#weight-title'),
  link('About Me', 'medical.html#medical-about'),
  link('Browse medical records', 'medical.html#medical-browse')
 ];

 const sourceFolder = area === 'education' ? 'Education' : 'Family';
 const sourcePeople = area === 'education' ? people.slice(0, 2) : people;

 async function readPeopleFolders() {
  const roots = await thDriveRecords.findFolders('TisZod');
  const readFolders=async entries=>area==='medical'
   ? (await Promise.allSettled(entries.map(entry=>thDriveRecords.children(entry)))).flatMap(result=>result.status==='fulfilled'?[result.value]:[])
   : Promise.all(entries.map(entry=>thDriveRecords.children(entry)));
  const candidates = await readFolders(roots);
  const folders = candidates.flat().filter(file => file.folder && file.name === sourceFolder);
  if(area==='medical'&&folders.length===1)return thDriveRecords.children(folders[0]);
  const contents = await readFolders(folders);
  const matches = contents.filter(files => sourcePeople.every(name => files.some(file => file.folder && file.name === name)));
  if (matches.length !== 1) throw Error('Could not uniquely locate TisZod / ' + sourceFolder + '.');
  return matches[0];
 }

 async function recordsFor(name, files) {
  const get = title => files.find(exact(title));
  const school = files.find(file => file.folder && /^01 School\b/.test(file.name));
  const health = files.find(file => file.folder && /^(?:02 )?Health\b/.test(file.name));
  const activities = files.find(file => file.folder && /^(?:03 )?Activities\b/.test(file.name));
  const personal = get('Personal Records');
  const keep = name === 'Alexis' && personal && ['family', 'identification'].includes(area)
   ? await thDriveRecords.children(personal) : [];
  if (area === 'education') return [school];
  if (area === 'medical') return name === 'Todd' ? toddMedical : name === 'Tracy' ? files :
   files.filter(file=>file.folder&&/^(?:\d{2}[ ._-]+)?(?:health|medical)\b/i.test(file.name));
  if (area === 'hobbies') return name === 'Todd'
   ? [link('Black & Mild','black-mild.html'), link('Freebirds','freebirds.html'),
      get('Tickets'), ...files.filter(file => /running club group photos/i.test(file.name))]
   : activities ? thDriveRecords.children(activities) : [];
  if (area === 'identification') {
   if (name === 'Alexis') return [keep.find(exact('DMV & Driver Records'))];
   const records = personal ? await thDriveRecords.children(personal) : [];
   return records.filter(file => /proof of birth|dmv accessibility placard/i.test(file.name));
  }
  if (name === 'Todd') {
   const posts = files.filter(file => /^Freebird Post\b/i.test(file.name));
   const collection = posts.length ? {name: 'Freebird Post', folder: true, virtualFiles: posts} : null;
   return [...files.filter(file => !posts.includes(file)), collection, ...toddMedical];
  }
  const keepsakes = keep.find(exact('Letters, Photos & Keepsakes'));
  return [...files, keepsakes];
 }

 function personCard(name, original, records, coverName = name) {
  const description = {
   family: 'Browse records',
   education: 'Browse school records',
   medical: 'Browse medical records',
   hobbies: 'Browse activities',
   identification: 'Browse ID records'
  };
  const card = thDriveRecords.card({
   ...original, name, folder: true, driveAction: area === 'family',
   url: area === 'family' ? original.url : undefined,
   cardLabel: description[area],
   coverPath: [area, coverName],
   coverFor,
   ...(area==='medical'&&name==='Todd'?{directReader:true,readerUrl:'#medical-todd',kindLabel:'Folder'}:{}),
   virtualFiles: records
  });
  return card;
 }

 async function loadPortraits(onError) {
  try {
   return thPersonPortraits.parse(await thValues(thPersonPortraits.range,'UNFORMATTED_VALUE'));
  } catch {
   try {
    return thPersonPortraits.parse(await thValues(thPersonPortraits.range,'UNFORMATTED_VALUE'));
   } catch {
    onError();
    return new Map();
   }
  }
 }

 function appendPortrait(card,name,portraits){
  const avatar=document.createElement('span');
  avatar.className=area==='medical'?'medical-person-portrait':'recreation-portrait';
  avatar.dataset.person=name;
  avatar.setAttribute('aria-hidden','true');
  const portrait=portraits.get(thPersonPortraits.nameKey(name));
  if(portrait){
   avatar.style.backgroundImage='url('+portrait+')';
   avatar.style.backgroundSize='cover';
   avatar.style.backgroundPosition='center';
  }else if(name==='Zach')avatar.textContent='Z';
  else avatar.classList.add('has-photo');
  const mount=area==='medical'?card.querySelector('.legal-thumbnail-art'):card;
  mount?.append(avatar);
 }

 function renderHideablePeople(cards,entries){
  const members=entries.map(card=>card.dataset.person);
  const prefix=area==='hobbies'?'recreation':'medical';
  const key='tiszod-'+prefix+'-hidden-people';
  let hidden=new Set();
  try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))hidden=new Set(saved.filter(name=>members.includes(name)));}catch{}
  let showHidden=false;
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className=prefix+'-show-hidden';
  cards.before(toggle);
  function updateVisibility(){
   toggle.hidden=!hidden.size;
   if(!hidden.size)showHidden=false;
   toggle.textContent=showHidden?'Back to visible people':'Show hidden people ('+hidden.size+')';
   toggle.setAttribute('aria-pressed',String(showHidden));
   for(const card of entries){
    const name=card.dataset.person,isHidden=hidden.has(name);
    card.hidden=showHidden?!isHidden:isHidden;
    const button=card.querySelector('.'+prefix+'-hide-person');
    button.textContent=isHidden?'Unhide':'Hide';
    button.setAttribute('aria-label','Hide '+name);
    button.setAttribute('aria-checked',String(isHidden));
   }
  }
  toggle.onclick=()=>{showHidden=!showHidden;updateVisibility();};
  for(const card of entries){
   const button=document.createElement('button');
   button.type='button';
   button.className=prefix+'-hide-person';
   button.setAttribute('role','switch');
   button.onclick=()=>{
    const name=card.dataset.person;
    if(hidden.has(name))hidden.delete(name);else hidden.add(name);
    try{localStorage.setItem(key,JSON.stringify([...hidden]));}catch{}
    updateVisibility();
    if(card.hidden)(toggle.hidden?entries.find(entry=>!entry.hidden)?.querySelector('.'+prefix+'-hide-person'):toggle)?.focus();
   };
   card.append(button);
  }
  cards.replaceChildren(...entries);
  updateVisibility();
 }

 let medicalFolders;
 function getMedicalFolders(){
  medicalFolders??=readPeopleFolders().catch(error=>{medicalFolders=undefined;throw error;});
  return medicalFolders;
 }
 function renderMedicalPeople(cards,status){
  const members=['Todd','Tracy','Aiden','Alexis','Zach'];
  const entries=members.map(name=>{
   let pendingRecords;
   const loadRecords=()=>pendingRecords??=(async()=>{
    const folders=await getMedicalFolders();
    const original=folders.find(file=>file.folder&&file.name.trim().toLowerCase()===name.toLowerCase());
    const files=original?await thDriveRecords.children(original):[];
    return (await recordsFor(name,files)).map(record=>decorate(record,[area,name]));
   })().catch(error=>{pendingRecords=undefined;throw error;});
   const card=personCard(name,undefined,loadRecords);
   card.classList.add('medical-person-card');
   card.dataset.person=name;
   appendPortrait(card,name,new Map());
   return card;
  });
  renderHideablePeople(cards,entries);
  status.textContent='';
  void loadPortraits(()=>{
   if(cards.isConnected)status.textContent='Profile photos could not load.';
  }).then(portraits=>{
   if(!cards.isConnected||!portraits.size)return;
   for(const card of entries){
    if(!portraits.has(thPersonPortraits.nameKey(card.dataset.person)))continue;
    card.querySelector('.medical-person-portrait')?.remove();
    appendPortrait(card,card.dataset.person,portraits);
   }
  });
 }

 function renderRecreationPeople(cards,status,clubsReady){
  const members=['Todd','Aiden','Alexis','Zach','Tracy'];
  let peopleFolders;
  const loadPeople=()=>peopleFolders??=readPeopleFolders().catch(error=>{peopleFolders=undefined;throw error;});
  const loaders=members.map(name=>{
   let pending;
   return ()=>pending??=(async()=>{
    const readRecords=async()=>{
     const original=(await loadPeople()).find(file=>file.folder&&file.name.trim().toLowerCase()===name.toLowerCase());
     return recordsFor(name,original?await thDriveRecords.children(original):[]);
    };
    if(name!=='Todd')return (await readRecords()).filter(Boolean).map(record=>decorate(record,[area,name]));
    const [records,clubs]=await Promise.allSettled([readRecords(),clubsReady]);
    if(records.status==='rejected'||clubs.status==='rejected')pending=undefined;
    const available=records.status==='fulfilled'?records.value:await recordsFor(name,[]);
    return [...available.filter(Boolean).map(record=>decorate(record,[area,name])),
     ...(clubs.status==='fulfilled'?window.thRecreationSearchEntries||[]:[])];
   })().catch(error=>{pending=undefined;throw error;});
  });
  const entries=members.map((name,index)=>{
   const card=personCard(name,undefined,loaders[index]);
   card.classList.add('recreation-person');
   card.dataset.person=name;
   appendPortrait(card,name,new Map());
   return card;
  });
  renderHideablePeople(cards,entries);
  status.textContent='';
  window.thLoadRecreationSearchEntries=async()=>{
   const results=await Promise.allSettled(loaders.map(load=>load()));
   return {entries:results.flatMap(result=>result.status==='fulfilled'?result.value:[]),
    partial:results.some(result=>result.status==='rejected')};
  };
  const portraitStatus=document.getElementById('hobby-portrait-status');
  portraitStatus.textContent='';
  void loadPortraits(()=>{
   if(cards.isConnected)portraitStatus.textContent='Profile photos could not load. Use Refresh to try again.';
  }).then(portraits=>{
   if(!cards.isConnected)return;
   for(const card of entries){
    if(!portraits.has(thPersonPortraits.nameKey(card.dataset.person)))continue;
    card.querySelector('.recreation-portrait')?.remove();
    appendPortrait(card,card.dataset.person,portraits);
   }
  });
 }

 async function render(clubsReady) {
  mount.hidden = false;
  mount.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = labels[area];
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = 'Loading ' + sourceFolder.toLowerCase() + ' collections…';
  const cards = document.createElement('div');
  cards.className = 'legal-cards';
  mount.append(heading, status, cards);
  if(area==='medical')return renderMedicalPeople(cards,status);
  if(area==='hobbies')return renderRecreationPeople(cards,status,clubsReady);
  try {
   const personFolders=await readPeopleFolders();
   const members = ['education', 'identification'].includes(area) ? people.slice(0, 2) : people;
   const results = await Promise.allSettled(members.map(async name => {
    const original = personFolders.find(file => file.folder && file.name === name);
    const files = !original || (area === 'medical' && name === 'Todd') ? [] : await thDriveRecords.children(original);
    const records = (await recordsFor(name, files)).filter(Boolean).map(record => decorate(record, [area, name]));
    if (records.length && area === 'education') {
     const section = document.createElement('div');
     section.dataset.educationFamily = name;
     section.append(...records.map(record => thDriveRecords.card({...record, cardLabel: 'Browse school records'})));
     return section;
    }
    if (records.length) return {card:personCard(name, original, records), records};
    throw Error('Collection unavailable.');
   }));
   const available = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
   cards.replaceChildren(...available.map(entry=>entry.card||entry));
   const unavailable = members.filter((_, i) => results[i].status === 'rejected');
   status.textContent = unavailable.length ? 'Could not load collections for ' + unavailable.join(', ') + '.' : '';
  } catch {
   status.textContent = 'Could not load the TisZod ' + sourceFolder + ' folder. Check that your signed-in Google account has access.';
  }
 }

 if (area === 'identification') {
  let folders;
  window.thRenderIdentificationCollection = async (name, section) => {
   section.textContent = 'Loading ID records?';
   try {
    folders ??= readPeopleFolders().catch(error => {
     folders = undefined;
     throw error;
    });
    const original = (await folders).find(file => file.folder && file.name === name);
    const files = await thDriveRecords.children(original);
    const records = (await recordsFor(name, files)).filter(Boolean).map(record => decorate(record, [area, name]));
    if (!section.isConnected) return;
    if (!records.length) {
     section.remove();
     return;
    }
    const cards = document.createElement('div');
    cards.className = 'legal-cards';
    cards.append(personCard('Identification archive', original, records, name));
    section.replaceChildren(cards);
   } catch {
    if (section.isConnected) section.textContent = 'Could not load the ID archive. Reopen this person to retry.';
   }
  };
  const start = window.thStart;
  window.thStart = (...args) => {
   folders = undefined;
   return start(...args);
  };
  return;
 }

 const start = window.thStart;
 window.thStart = async (...args) => {
  if (area === 'family') return render();
  if(area==='hobbies'){
   const clubsReady=start(...args);
   await render(clubsReady);
   return clubsReady;
  }
  await Promise.all([start(...args), render()]);
  if (area === 'medical' && ['#weight-title', '#medical-about', '#medical-browse'].includes(location.hash)) {
   document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }
 };
})();
