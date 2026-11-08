(() => {
 'use strict';
 const form = document.querySelector('.module-search');
 if (!form) return;
 const scope = form.dataset.searchScope;
 const input = form.querySelector('input');
 const status = form.querySelector('[role=status]');
 const results = form.querySelector('ul');
 const normalize = value => String(value ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const withQuery = (href, query) => {
  const url = new URL(href, location.href);
  url.searchParams.set('q', query);
  return url.href;
 };
 const text = node => node?.textContent.trim() || '';
 const cardLinks = selector => Array.from(document.querySelectorAll(selector), link => ({
  title: text(link.querySelector('h2,h3,strong')),
  keywords: text(link),
  href: link.href
 }));

 function finance(query, matches) {
  const collections = cardLinks('.finance-collection-cards a');
  const items = collections.filter(item => matches(item.keywords)).map(item => ({
   title:item.title, detail:'Open Finance collection', href:item.href
  }));
  const searchable = collections.filter(item => /(?:finance-documents|-transactions)\.html$/.test(new URL(item.href).pathname));
  for (const item of searchable) items.push({
   title:'Search '+item.title, detail:'Open with your search applied', href:withQuery(item.href,query)
  });
  return {items,note:items.length > searchable.length ? 'Matching collections and record searches' : 'Choose a collection to search its records.'};
 }

 function pets() {
  return Array.from(document.querySelectorAll('.pet-tabs [role=tab]')).flatMap(tab => {
   const panel = document.getElementById(tab.getAttribute('aria-controls'));
   if (!panel) return [];
   const name = text(tab.querySelector('strong'));
   const profile = {
    title: name, detail: 'Pet profile',
    keywords: [text(tab), text(panel.querySelector('.profile-head')),
     ...Array.from(panel.querySelectorAll('[data-field]'), field => field.value)].join(' '),
    open: () => openPetProfile(tab)
   };
   const files = Array.from(panel.querySelectorAll('.documents a,.info-card .card-link a,.history-content li a'), link => ({
    title: text(link), detail: name, href: link.href, external: true
   }));
   return [profile, ...files];
  });
 }

 async function driveMatches(roots, matches, isCurrent, include = () => true) {
  const queue = roots.map(record => ({record, parent:[]}));
  const visited = new Set();
  const found = [];
  let reads = 0, partial = false;
  while (queue.length && found.length < 60 && isCurrent()) {
   const folders = [];
   while (queue.length && folders.length < 6 && found.length < 60) {
    const {record,parent} = queue.shift();
    if (!include(record,parent)) continue;
    const title = record.displayName || record.name;
    const key = record.id || record.readerUrl;
    if (key && visited.has(key)) continue;
    if (key) visited.add(key);
    const detail = parent.join(' / ');
    if (matches([title, record.name, detail].join(' '))) {
     found.push({title, detail: detail || (record.folder ? 'Folder' : 'Document'), open: () => thDriveRecords.open(record)});
    }
    if (record.virtualFiles) queue.push(...record.virtualFiles.map(child => ({record:child,parent:[...parent,title]})));
    else if (record.folder && record.id) folders.push({record,parent:[...parent,title]});
   }
   const batch = folders.slice(0, 100 - reads);
   reads += batch.length;
   if (batch.length < folders.length) partial = true;
   await Promise.all(batch.map(async ({record,parent}) => {
    try {
     const children = await thDriveRecords.children(record);
     queue.push(...children.map(child => ({record:child,parent})));
    } catch { partial = true; }
   }));
  }
  return {items:found, partial:partial || queue.length > 0};
 }

 async function garage(query, matches) {
  const collections = cardLinks('.garage-collections a');
  const shortcuts = collections.map(item => ({title:item.title, detail:'Open collection with this search', href:withQuery(item.href,query)}));
  if (typeof thAuthorized !== 'function' || !thAuthorized()) return {items:shortcuts, note:'Open a collection to sign in and see matching Garage items.'};
  try {
   const {profiles,registry,activeFleet,inactiveFleet} = await thFleetData();
   const seen = new Set();
   const deleted = new Set(profiles.filter(item => /^deleted$/i.test(item.status)).flatMap(item => [
    normalize([item.year,item.make,item.model].join(' ')), normalize(item.vin)
   ]).filter(Boolean));
   const matchesByName = [];
   for (const item of [...profiles,...registry,...activeFleet,...inactiveFleet]) {
    const title = [item.year,item.make,item.model].filter(Boolean).join(' ') || item.name;
    const name = normalize(title);
    const vin = normalize(item.vin);
    if (!name || seen.has(name) || (vin && seen.has(vin)) || deleted.has(name) || (vin && deleted.has(vin))) continue;
    if (!matches([title,item.name,item.vin,item.tag,item.category,item.engine].join(' '))) continue;
    seen.add(name);
    if (vin) seen.add(vin);
    const category = item.category || '';
    const label = /mak\s*daddy.*legend/i.test(title) ? 'Vehicles'
     : /trailer|camper|^rvs?$/i.test(category) ? 'Trailers'
     : /boat|watercraft/i.test(category) ? 'Watercraft'
     : /equipment|tractor|small engine/i.test(category) ? 'Equipment'
     : /off-road|atv|quad|golf cart|moped|scooter|mini bike|bicycle/i.test(category) ? 'Off-Road'
     : /car|truck|suv|van|classic|motorcycle/i.test(category) ? 'Vehicles' : '';
    const collection = collections.find(entry => entry.title === label);
    const lookup = item.vin || title;
    matchesByName.push({title, detail:label || 'Garage item', href:collection && withQuery(collection.href,lookup),
     open:() => {
      input.value = lookup;
      draw({items:collections.map(entry => ({title:entry.title, detail:'Search this collection', href:withQuery(entry.href,lookup)})),
       note:'Choose a collection for ' + title + '.'});
     }});
   }
   return {items:[...matchesByName.slice(0,55),...shortcuts],note:matchesByName.length ? matchesByName.length+' matching Garage items. You can also open any collection with your search.' : 'No indexed Garage items matched. You can still search within a collection.'};
  } catch {
   return {items:shortcuts,note:'The Garage index could not load. You can still search within a collection.'};
  }
 }

 async function personal(query, matches, isCurrent) {
  const collections = cardLinks('nav.tiles a');
  const shortcuts = collections.map(item => ({
   title:item.title,
   detail:item.title === 'Family' || item.title === 'Education' ? 'Browse collection' : 'Open collection with this search',
   href:['Identification','Medical'].includes(item.title) ? withQuery(item.href,query) : item.href
  }));
  if (typeof thAuthorized !== 'function' || !thAuthorized()) return {items:shortcuts,note:'Open a collection to sign in and find private records.'};
  try {
   const preferences = readPersonVisibility();
   const [identification, education, drive] = await Promise.allSettled([
    readIdentification(matches,preferences), readEducation(matches,preferences), readPersonalFolders(matches,isCurrent,preferences)
   ]);
   const records = [identification,education].flatMap(result => result.status === 'fulfilled' ? result.value : []);
   if (drive.status === 'fulfilled') records.push(...drive.value.items);
   const partial = [identification,education,drive].some(result => result.status === 'rejected') || drive.value?.partial || records.length > 56;
   const note = records.length ? records.length+' matching personal records.' : 'No indexed records matched. Choose a collection to continue.';
   return {items:[...records.slice(0,56),...shortcuts],note,partial};
  } catch {
   return {items:shortcuts,note:'The private index could not load. You can still open a collection.'};
  }
 }

 async function readPersonVisibility() {
   const preferences = await thValues("'Identification Records'!D1:E2000",'UNFORMATTED_VALUE');
   const hidden = new Set(['Heather','Alexis']);
   for (const [key,value] of preferences) {
    if (!String(key).startsWith('person-visibility:')) continue;
    const person = key.slice(18);
    if (String(value) === 'true') hidden.add(person);
    if (String(value) === 'false') hidden.delete(person);
   }
   return hidden;
 }

 async function readIdentification(matches,preferences) {
   const [rows,hidden] = await Promise.all([thValues("'Identification Records'!A1:B2000",'UNFORMATTED_VALUE'),preferences]);
   if (rows[0]?.[0] !== 'ID') throw Error('Identification index unavailable');
   return rows.slice(1).flatMap(([id,value]) => {
    if (!id) return [];
    let record;
    try { record = JSON.parse(value); } catch { return []; }
    if (!record?.name || record.hidden || record.deleted || String(record.person || '').split(' & ').some(person => hidden.has(person))) return [];
    if (!matches([record.name,record.person,record.category].join(' '))) return [];
    return [{title:record.name,detail:['Identification',record.person].filter(Boolean).join(' · '),href:withQuery('identification.html',record.name)}];
   });
 }

 async function readEducation(matches,preferences) {
  const {owner,isBook,isCareer,isManual,readRecords} = thLibraryBooks;
  let hidden = [];
  try {
   const saved = JSON.parse(localStorage.getItem('tiszod-education-hidden-people') || '[]');
   if (Array.isArray(saved)) hidden = saved;
  } catch {}
  const [records,hiddenPeople] = await Promise.all([readRecords(),preferences]);
  return records.flatMap(({data}) => {
   const person = owner(data);
   if (!data.name || data.deleted || data.hidden || hidden.includes(person) || hiddenPeople.has(person) || isBook(data) || isCareer(data) || isManual(data)) return [];
   if (!matches([data.name,person,data.category,data.folder].join(' '))) return [];
   const url = new URL(withQuery('education.html',data.name));
   url.searchParams.set('person',person);
   return [{title:data.name,detail:'Education · '+person,href:url.href}];
  });
 }

 async function readPersonalFolders(matches,isCurrent,preferences) {
  const hidden = await preferences;
  const roots = await thDriveRecords.findFolders('TisZod');
  const collections = (await Promise.all(roots.map(root => thDriveRecords.children(root)))).flat().filter(file => file.folder);
  const family = collections.filter(file => file.name === 'Family');
  const medical = collections.filter(file => /^(health & medical|medical)$/i.test(file.name));
  const education = collections.filter(file => file.name === 'Education');
  const sources = [family,medical,education].filter(files => files.length === 1).map(([file]) => file);
  const outcome = await driveMatches(sources,matches,isCurrent,(record,parent) => {
   const name = record.name.replace(/^\d{2} /,'');
   if (/^archive - review|^recovered exports - needs review|^verified duplicates|^temporary office files|^~\$/i.test(name)) return false;
   if (['Family','Education'].includes(parent[0]) && parent.length === 1 && [...hidden].some(person => normalize(name) === normalize(person))) return false;
   if (parent[0] === 'Family' && /^personal records$/i.test(name)) return false;
   return true;
  });
  return {...outcome,partial:outcome.partial || sources.length !== 3};
 }

 async function readCareerDocuments(matches) {
  const {isCareer,readRecords} = thLibraryBooks;
  return (await readRecords()).flatMap(({data}) => {
   if (!data.name || data.deleted || data.hidden || !isCareer(data)) return [];
   if (!matches([data.name,data.folder,data.category].join(' '))) return [];
   return [{title:data.name,detail:'Saved Career document',href:withQuery('career.html?view=saved',data.name)}];
  });
 }

 function draw({items,note,partial}) {
  status.textContent = note || (items.length ? items.length+' '+(items.length === 1 ? 'result' : 'results') : 'No matches found.');
  if (partial) status.textContent += ' Some folders or additional results could not be included.';
  results.replaceChildren(...items.slice(0,60).map(item => {
   const row = document.createElement('li');
   const control = document.createElement(item.href ? 'a' : 'button');
   if (item.href) {
    control.href = item.href;
    if (item.external) {control.target = '_blank'; control.rel = 'noopener noreferrer';}
   } else {
    control.type = 'button';
    control.addEventListener('click',item.open);
   }
   control.textContent = item.title;
   if (item.detail) {
    const detail = document.createElement('small');
    detail.textContent = item.detail;
    control.append(detail);
   }
   row.append(control);
   return row;
  }));
 }

 let request = 0;
 form.addEventListener('submit', async event => {
  event.preventDefault();
  const query = input.value.trim();
  const words = normalize(query).split(' ').filter(Boolean);
  if (!words.length) return;
  const current = ++request;
  const matches = value => words.every(word => normalize(value).includes(word));
  status.textContent = 'Searching…';
  results.replaceChildren();
  try {
   let outcome;
   if (scope === 'garage') outcome = await garage(query,matches);
   else if (scope === 'finance') outcome = finance(query,matches);
   else if (scope === 'personal') outcome = await personal(query,matches,() => current === request);
   else if (scope === 'pets') outcome = {items:pets().filter(item => matches([item.title,item.detail,item.keywords].join(' ')))};
   else {
    if (typeof thAuthorized !== 'function' || !thAuthorized()) {
     if (current === request) draw({items:[],note:'Sign in to search these private folders.'});
     return;
    }
    const recreation = scope === 'hobbies' ? await window.thLoadRecreationSearchEntries?.() : undefined;
    if (current !== request) return;
    const entries = scope === 'career' ? window.thCareerSearchEntries : recreation?.entries || window.thRecreationSearchEntries;
    if (!entries?.length && scope !== 'career') {
     if (current === request) draw({items:[],note:'The folders are still loading or could not connect. Try again after they appear.'});
     return;
    }
    const drive = driveMatches(entries || [],matches,() => current === request);
    if (scope === 'career') {
     const [folders,saved] = await Promise.all([drive,readCareerDocuments(matches).catch(() => null)]);
     outcome = {items:[...(saved || []),...folders.items],partial:folders.partial || !entries || !saved};
    } else {
     outcome = await drive;
     outcome.partial ||= recreation?.partial;
    }
   }
   if (current === request) draw(outcome);
  } catch {
   if (current === request) draw({items:[],note:'Search could not finish. Please try again.'});
  }
 });
 function clearResults() {
  request++;
  status.textContent = '';
  results.replaceChildren();
 }
 input.addEventListener('input',clearResults);
 window.addEventListener('storage', event => {
  if (typeof TH_SESSION_KEY !== 'undefined' && event.key === TH_SESSION_KEY) clearResults();
 });
})();
