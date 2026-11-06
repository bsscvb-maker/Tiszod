/* Family collections are resolved in the signed-in browser. */
(() => {
 const mount = document.querySelector('[data-family-collections]');
 const area = mount.dataset.familyCollections;
 const people = ['Aiden', 'Alexis', 'Tracy', 'Todd'];
 const labels = {
  family: 'Family records', education: 'School records by person', medical: 'Medical records by person',
  hobbies: 'Family activities', identification: 'Family identification records'
 };
 const photo = name => name.startsWith('assets/') ? name : 'assets/family-unique/' + name + '.webp';
 // A photograph is assigned to one location only. The viewer illustrates all other locations individually.
 const photos = new Map(Object.entries({
  'family/Aiden': 'aiden-family', 'family/Alexis': 'alexis-family',
  'family/Tracy': 'tracy-family', 'family/Todd': 'todd-family',
  'education/Aiden': 'aiden-education', 'education/Alexis': 'alexis-education',
  'medical/Aiden': 'aiden-medical', 'medical/Alexis': 'alexis-medical',
  'medical/Tracy': 'tracy-medical', 'medical/Todd': 'todd-medical',
  'hobbies/Aiden': 'aiden-recreation', 'hobbies/Alexis': 'alexis-recreation',
  'hobbies/Todd': 'todd-recreation', 'identification/Alexis': 'alexis-id', 'identification/Aiden': 'assets/family/identification.webp',
  'family/Aiden/01 School & IEP': 'classroom', 'family/Alexis/01 School': 'alexis-school',
  'family/Aiden/01 School & IEP/Early Childhood Special Education': 'early-childhood',
  'family/Aiden/01 School & IEP/Preschool Screening & Assessment': 'preschool',
  'family/Aiden/01 School & IEP/Report Cards & Progress': 'progress',
  'family/Aiden/02 Health & Support': 'health-forms',
  'family/Aiden/02 Health & Support/Syringomyelia': 'mri',
  'family/Aiden/02 Health & Support/Medicaid & Health Insurance': 'coverage',
  'family/Aiden/03 Activities & Sports': 'basketball',
  'family/Aiden/04 Photos & Keepsakes': 'keepsakes',
  'family/Aiden/05 Personal Records': 'archive-boxes',
  'family/Alexis/02 Health': 'assets/medical/providers.webp',
  'family/Alexis/02 Health/Dental': 'dental',
  'family/Alexis/02 Health/Vision Care': 'vision',
  'family/Alexis/02 Health/Prescriptions': 'prescription',
  'family/Alexis/03 Activities & Volunteering': 'volunteering',
  'family/Alexis/03 Activities & Volunteering/Girl Scouts': 'scouts',
  'family/Alexis/03 Activities & Volunteering/Horseback Riding': 'horse',
  'family/Alexis/03 Activities & Volunteering/Ice Skating': 'skating',
  'family/Alexis/03 Activities & Volunteering/Running': 'running',
  'family/Alexis/03 Activities & Volunteering/Busch Gardens': 'coaster',
  'family/Alexis/03 Activities & Volunteering/Tidewater Striders - Youth Advisory Committee': 'race-medal',
  'family/Alexis/01 School/School Awards & Honors': 'graduation',
  'family/Alexis/04 Personal Records': 'folders',
  'family/Alexis/04 Personal Records/DMV & Driver Records': 'driver',
  'family/Todd/Cards': 'greetings', 'family/Todd/Tickets': 'assets/family/tickets.webp',
  'medical/Aiden/02 Health & Support': 'therapy',
  'medical/Alexis/02 Health': 'medical-lab',
  'medical/Todd/About Me': 'health-envelopes',
  'family/Aiden/02 Health & Support/Immunization Records': 'vaccination',
  'family/Aiden/02 Health & Support/Syringomyelia/Diagnosis and Letters': 'radiographs',
  'family/Aiden/02 Health & Support/Syringomyelia/Diagnosis and Letters/Test Results': 'scanner',
  'family/Aiden/05 Personal Records/Archives & OneNote Recovery': 'scan-disc',
  'family/Alexis/04 Personal Records/Letters, Photos & Keepsakes': 'film',
  'education/Alexis/01 School/School Awards & Honors': 'education-award',
  'education/Aiden/01 School & IEP': 'assets/family/school.webp',
  'education/Alexis/01 School': 'assets/family/school-reports.webp',
  'hobbies/Aiden/03 Activities & Sports': 'assets/family/sports.webp',
  'hobbies/Alexis/03 Activities & Volunteering': 'assets/family/volunteering.webp',
  'hobbies/Todd/Tickets': 'assets/family/archive.webp'
 }));
 const coverFor = path => {
  const name = photos.get(path.join('/'));
  return name ? photo(name) : undefined;
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

 async function readFamily() {
  const roots = await thDriveRecords.findFolders('TisZod');
  const candidates = await Promise.all(roots.map(root => thDriveRecords.children(root)));
  const families = candidates.flat().filter(file => file.folder && file.name === 'Family');
  const contents = await Promise.all(families.map(folder => thDriveRecords.children(folder)));
  const matches = contents.filter(files => people.every(name => files.some(file => file.folder && file.name === name)));
  if (matches.length !== 1) throw Error('Could not uniquely locate TisZod / Family.');
  return matches[0];
 }

 async function recordsFor(name, files) {
  const get = title => files.find(exact(title));
  const school = files.find(file => file.folder && /^01 School\b/.test(file.name));
  const health = files.find(file => file.folder && /^02 Health\b/.test(file.name));
  const activities = files.find(file => file.folder && /^03 Activities\b/.test(file.name));
  const personal = get('Personal Records');
  const keep = name === 'Alexis' && personal && ['family', 'identification'].includes(area)
   ? await thDriveRecords.children(personal) : [];
  if (area === 'education') return [school];
  if (area === 'medical') return name === 'Todd' ? toddMedical : name === 'Tracy' ? files : [health];
  if (area === 'hobbies') return name === 'Todd'
   ? [get('Tickets'), ...files.filter(file => /running club group photos/i.test(file.name))]
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

 function personCard(name, original, records) {
  const description = {
   family: 'Browse records',
   education: 'Browse school records',
   medical: 'Browse medical records',
   hobbies: 'Browse activities',
   identification: 'Browse ID records'
  };
  return thDriveRecords.card({
   ...original, name, folder: true, driveAction: area === 'family',
   url: area === 'family' ? original.url : undefined,
   cardLabel: description[area],
   coverPath: [area, name],
   coverFor,
   virtualFiles: records
  });
 }

 async function render() {
  mount.hidden = false;
  mount.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = labels[area];
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = 'Loading family collections…';
  const cards = document.createElement('div');
  cards.className = 'legal-cards';
  mount.append(heading, status, cards);
  try {
   const families = await readFamily();
   const members = ['education', 'identification'].includes(area) ? people.slice(0, 2)
    : area === 'hobbies' ? people.filter(name => name !== 'Tracy') : people;
   const results = await Promise.allSettled(members.map(async name => {
    const original = families.find(file => file.folder && file.name === name);
    const files = area === 'medical' && name === 'Todd' ? [] : await thDriveRecords.children(original);
    const records = (await recordsFor(name, files)).filter(Boolean).map(record => decorate(record, [area, name]));
    if (records.length && area === 'education') {
     const section = document.createElement('div');
     section.dataset.educationFamily = name;
     section.append(...records.map(record => thDriveRecords.card({...record, cardLabel: 'Browse school records'})));
     return section;
    }
    if (records.length) return personCard(name, original, records);
    throw Error('Collection unavailable.');
   }));
   cards.replaceChildren(...results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []));
   const unavailable = members.filter((_, i) => results[i].status === 'rejected');
   status.textContent = unavailable.length ? 'Could not load collections for ' + unavailable.join(', ') + '.' : '';
  } catch {
   status.textContent = 'Could not load the TisZod Family folder. Check that your signed-in Google account has access.';
  }
 }

 const start = window.thStart;
 window.thStart = async (...args) => {
  if (area === 'family') return render();
  await Promise.all([start(...args), render()]);
  if (area === 'medical' && ['#weight-title', '#medical-about', '#medical-browse'].includes(location.hash)) {
   document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }
 };
})();
