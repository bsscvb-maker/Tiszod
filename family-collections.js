/* Family collections are resolved in the signed-in browser. */
(() => {
 const mount = document.querySelector('[data-family-collections]');
 const area = mount.dataset.familyCollections;
 const people = ['Aiden', 'Alexis', 'Tracy', 'Todd'];
 const labels = {
  family: 'Family records', education: 'School records by person', medical: 'Medical records by person',
  hobbies: 'Family activities', identification: 'Family identification records'
 };
 const folderPhotos = [
  [/school|iep|report card|honors/i, 'command-photos/education.jpg'],
  [/medicaid|insurance|cigna/i, 'assets/medical/insurance.webp'],
  [/dental/i, 'assets/medical/dental.webp'],
  [/vision/i, 'assets/medical/vision.webp'],
  [/prescription/i, 'assets/medical/prescriptions.webp'],
  [/health|doctor|therapy|immunization/i, 'assets/medical/hero.webp'],
  [/activities|sports|running|skating|volunteer/i, 'command-photos/recreation.webp'],
  [/ticket/i, 'assets/hobbies/striders-events.webp'],
  [/photo|keepsake|letters|^cards$/i, 'command-photos/family-portraits.jpg'],
  [/personal records|dmv|driver|birth/i, 'command-photos/identification.jpg'],
  [/freebird/i, 'freebird-boot.jpg']
 ];
 const photoFor = name => folderPhotos.find(([pattern]) => pattern.test(name))?.[1];
 const decorated = record => ({
  ...record,
  displayName: record.name.replace(/^\d{2} /, ''),
  legalFolderPhotoFor: photoFor,
  childFolderLabel: name => name.replace(/^\d{2} /, ''),
  driveAction: true
 });
 const exact = name => file => file.name.replace(/^\d{2} /, '') === name;
 const link = (name, readerUrl, image) => ({
  name, readerUrl, directReader: true, closeOnOpen: true, kindLabel: 'Section', cardLabel: 'Open section',
  legalFolderPhotoFor: () => image
 });
 const toddMedical = [
  link('Weight history', 'medical.html#weight-title', 'assets/medical/weight.webp'),
  link('About Me', 'medical.html#medical-about', 'assets/medical/body-profile.svg'),
  link('Browse medical records', 'medical.html#medical-browse', 'assets/medical/hero.webp')
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
   coverMark: name[0],
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
    const records = (await recordsFor(name, files)).filter(Boolean).map(record =>
     record.directReader ? record : decorated(record));
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
