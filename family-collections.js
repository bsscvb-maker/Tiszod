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
 const photo = name => /\.(?:jpg|png|webp)$/.test(name) ? name : 'assets/family-unique/' + name + '.webp';
 // A photograph is assigned to one location only. The viewer illustrates all other locations individually.
 const photos = new Map(Object.entries({
  'family/Aiden': 'aiden-family', 'family/Alexis': 'alexis-family',
  'family/Tracy': 'tracy-family', 'family/Todd': 'todd-family',
  'education/Aiden': 'aiden-education', 'education/Alexis': 'alexis-education',
  'medical/Aiden': 'aiden-medical', 'medical/Alexis': 'alexis-medical',
  'medical/Tracy': 'tracy-medical', 'medical/Todd': 'todd-medical',
  'hobbies/Aiden': 'aiden-recreation', 'hobbies/Alexis': 'alexis-recreation',
  'hobbies/Todd': 'command-photos/off-road-jaguar-chrome.jpg', 'hobbies/Zach': 'assets/family/sports.webp', 'hobbies/Tracy': 'assets/family/volunteering.webp', 'identification/Alexis': 'alexis-id', 'identification/Aiden': 'assets/family/identification.webp',
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
  'hobbies/Aiden/Activities & Sports': 'assets/family/sports.webp',
  'hobbies/Alexis/Activities & Volunteering': 'assets/family/volunteering.webp',
  'hobbies/Todd/Tickets': 'assets/family/archive.webp',
  'hobbies/Todd/Black & Mild': 'assets/hobbies/black-and-mild-logo.png',
  'hobbies/Todd/Freebirds': 'freebirds-boot.jpg'
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
   : [activities];
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
   coverFor: area==='medical'?path=>path.length===2?'assets/medical/mythic-book.svg':coverFor(path):coverFor,
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
  card.append(avatar);
 }

 async function renderMedicalPeople(cards,status){
  const members=['Todd','Tracy','Aiden','Alexis','Zach'];
  const notices=[];
  const [folders,portraits]=await Promise.all([
   readPeopleFolders().catch(()=>{notices.push('Family folders could not load.');return [];}),
   loadPortraits(()=>notices.push('Profile photos could not load.'))
  ]);
  const missing=[];
  const entries=await Promise.all(members.map(async name=>{
   const original=folders.find(file=>file.folder&&file.name.trim().toLowerCase()===name.toLowerCase());
   let files=[];
   if(name!=='Todd'&&original){
    try{files=await thDriveRecords.children(original)}catch{missing.push(name)}
   }
   const records=(await recordsFor(name,files)).map(record=>decorate(record,[area,name]));
   const card=personCard(name,original,records);
   card.classList.add('medical-person-card');
   card.dataset.person=name;
   appendPortrait(card,name,portraits);
   return card;
  }));
  cards.replaceChildren(...entries);
  if(missing.length)notices.push('Could not open records for '+missing.join(', ')+'.');
  status.textContent=notices.join(' ');
 }

 async function render() {
  if (area === 'hobbies') {
   window.thFamilyRecreationSearchEntries = undefined;
   document.getElementById('hobby-portrait-status').textContent='';
  }
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
  try {
   const portraitRead=area==='hobbies'?loadPortraits(()=>{document.getElementById('hobby-portrait-status').textContent='Profile photos could not load. Use Refresh to try again.';}):Promise.resolve(new Map());
   const [personFolders,portraits]=await Promise.all([readPeopleFolders(),portraitRead]);
   const members = ['education', 'identification'].includes(area) ? people.slice(0, 2)
    : area === 'hobbies' ? ['Todd','Aiden','Alexis','Zach','Tracy'] : people;
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
    if (area === 'hobbies') {
     if(name==='Todd')records.push(...(window.thRecreationSearchEntries||[]));
     const card=personCard(name,original,records);
     card.classList.add('recreation-person');
     appendPortrait(card,name,portraits);
     return {card,records};
    }
    if (records.length) return {card:personCard(name, original, records), records};
    throw Error('Collection unavailable.');
   }));
   const available = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
   cards.replaceChildren(...available.map(entry => entry.card || entry));
   if (area === 'hobbies') window.thFamilyRecreationSearchEntries = available.flatMap(entry => entry.records || []);
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
   try{await start(...args)}finally{await render()}
   return;
  }
  await Promise.all([start(...args), render()]);
  if (area === 'medical' && ['#weight-title', '#medical-about', '#medical-browse'].includes(location.hash)) {
   document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }
 };
})();
