(() => {
  const categories = ['Prescriptions', 'Providers & Visits', 'Labs & Screening', 'Dental', 'Insurance', 'Billing & Receipts', 'Immunizations', 'Body Composition'];
  const collections = {
    'Prescriptions': ['prescriptions','teal'],
    'Providers & Visits': ['providers','blue'],
    'Labs & Screening': ['labs','plum'],
    'Dental': ['dental','teal'],
    'Insurance': ['insurance','blue'],
    'Billing & Receipts': ['billing','gold'],
    'Immunizations': ['immunizations','plum'],
    'Body Composition': ['weight','teal']
  };
  const $ = id => document.getElementById(id);
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const button = (text, action, className) => {
    const el = node('button', text, className);
    el.type = 'button';
    el.onclick = action;
    return el;
  };
  const folderMime = 'application/vnd.google-apps.folder';
  const escapeQuery = s => s.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  let records = [], weights = [], review = {}, key = '', limit = 30, visitFilter = '';
  let workbook;

  async function list(query) {
    const files = [];
    let pageToken;
    do {
      if (!thAuthorized()) throw Object.assign(new Error('Sign in again to access Medical.'),{status:401});
      const params = new URLSearchParams({
        q: 'trashed = false and (' + query + ')', pageSize: '100',
        fields: 'nextPageToken,files(id,name,mimeType,webViewLink,thumbnailLink,resourceKey,capabilities(canDownload))',
        supportsAllDrives: 'true', includeItemsFromAllDrives: 'true', orderBy: 'folder,name_natural'
      });
      if (pageToken) params.set('pageToken', pageToken);
      const response = await fetch('https://www.googleapis.com/drive/v3/files?' + params, {
        headers: {Authorization: 'Bearer ' + thToken}, cache: 'no-store'
      });
      if (!response.ok) throw Object.assign(new Error('Could not read the Medical folders from Drive.'),{status:response.status});
      const data = await response.json();
      files.push(...(data.files || []).map(file => {
        const folder = file.mimeType === folderMime;
        return {...file, folder, mime: file.mimeType, canDownload: file.capabilities?.canDownload,
          url: file.webViewLink || 'https://drive.google.com/' + (folder ? 'drive/folders/' : 'file/d/') + file.id};
      }));
      pageToken = data.nextPageToken;
    } while (pageToken);
    return files;
  }
  const children = id => list("'" + escapeQuery(id) + "' in parents");
  const exclude = file => /^archive - review|^recovered exports - needs review|^verified duplicates|^temporary office files|^~\$/i.test(file.name);
  function dateFromName(name) {
    const match = name.match(/\b((?:19|20)\d\d)[.\/-](0[1-9]|1[0-2])(?:[.\/-](0[1-9]|[12]\d|3[01]))?(?![.\/-]\d)/);
    if (match) {
      const [,year,month,day] = match;
      if (!day || new Date(Date.UTC(+year,+month-1,+day)).toISOString().slice(0,10) === [year,month,day].join('-')) return [year,month,day].filter(Boolean).join('-');
    }
    return name.match(/\b(?:19|20)\d{2}\b/)?.[0] || '';
  }
  function kindOf(file, path) {
    const name = file.name;
    if (path.includes('Vision') || /eyeglass prescription|eye prescription/i.test(name)) return 'Eyeglass prescription';
    if (/\b(lab order|lab work order|laboratory order|screening order)s?\b/i.test(name)) return 'Test order';
    if (/test results?|lab results?|blood type record|pathology report/i.test(name)) return 'Test result';
    if (/\b(receipt|copay|co-pay)\b/i.test(name)) return 'Receipt';
    if (/\b(bill|billing document|balance statement|invoice)\b/i.test(name)) return 'Billing record';
    if (/appointment|reminder|cancelled/i.test(name)) return 'Appointment record';
    if (/visit summary|after visit|patient first.*visit|doctor visit|office visit|summary of visit/i.test(name)) return 'Visit record';
    if (path[0] === 'Prescriptions') return /guide|approval|denial|instructions/i.test(name) ? 'Medication reference' : 'Medication record';
    return 'Document';
  }
  async function walk(folder, path, visited) {
    if (visited.has(folder.id)) return [];
    visited.add(folder.id);
    const files = (await children(folder.id)).filter(file => !exclude(file));
    const branches = [];
    const found = [];
    for (const file of files) {
      if (file.folder) branches.push(walk(file, [...path,file.name], visited));
      else found.push({ ...file, path, category: path[0], date: dateFromName(file.name), kind: kindOf(file,path) });
    }
    return found.concat(...await Promise.all(branches));
  }
  const detail = record => review[record.id] || {};
  const status = record => detail(record).status || (record.kind === 'Billing record' ? 'Needs review' : '');
  const eventDate = record => detail(record).date || record.date;
  const eventName = record => detail(record).label?.trim() || '';
  function selectCategory(category, query = '', reviewStatus = '') {
    $('medical-category').value = category;
    $('medical-search').value = query;
    $('medical-year').value = '';
    $('medical-review').value = reviewStatus;
    visitFilter = '';
    resetResults();
    $('timeline-title').scrollIntoView({block:'start', behavior:'smooth'});
  }
  function metric(title, detailText, action) {
    const el = button('', action);
    el.append(node('strong', title), node('small', detailText));
    return el;
  }
  function confirmedEvents(state) {
    const unique = new Map();
    for (const record of records.filter(r => status(r) === state)) {
      const date = eventDate(record), name = eventName(record);
      const fingerprint = [name.toLowerCase().replace(/\s+/g,' '),date,state].join('|');
      if (name && date.length === 10) unique.set(fingerprint,record);
    }
    return [...unique.values()];
  }
  function amountFor(record) {
    const raw = detail(record).amount;
    return raw != null && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : null;
  }
  function renderKpis() {
    const by = category => records.filter(r => r.category === category).length;
    const count = (state) => records.filter(r => status(r) === state).length;
    const current = new Set(records.filter(r => status(r) === 'Current').map(r => eventName(r).toLowerCase()).filter(Boolean)).size;
    const bills = records.filter(r => status(r) === 'Confirmed open');
    const balances = bills.map(amountFor).filter(v => v !== null);
    const sum = balances.reduce((a,b) => a+b, 0);
    const billText = balances.length ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(sum) + ' across ' + balances.length + ' reviewed records' : 'No confirmed amounts entered';
    const visit = confirmedEvents('Visit confirmed').sort((a,b) => eventDate(b).localeCompare(eventDate(a)))[0];
    $('medical-kpis').replaceChildren(
      metric('Current medications', current ? current + ' confirmed · click to view' : 'Review medication records to set your list', () => selectCategory('Prescriptions','','Current')),
      metric('Medication history', confirmedEvents('Fill documented').length + ' confirmed fill events · ' + records.filter(r => r.kind === 'Medication record').length + ' source records', () => selectCategory('Prescriptions')),
      metric('Provider visits', visit ? 'Last confirmed visit · ' + eventDate(visit) : by('Providers & Visits') + ' provider documents to explore', () => selectCategory('Providers & Visits')),
      metric('Labs & screenings', records.filter(r => r.kind === 'Test result').length + ' result records · ' + records.filter(r => r.kind === 'Test order').length + ' order records', () => selectCategory('Tests')),
      metric('Bills to review', count('Needs review') + ' records with status to verify', () => selectCategory('','','Needs review')),
      metric('Confirmed open bills', billText, () => selectCategory('','','Confirmed open')),
      metric('Dental', by('Dental') + ' dental records', () => selectCategory('Dental')),
      metric('Insurance', by('Insurance') + ' coverage and claims records', () => selectCategory('Insurance'))
    );
  }
  function statuses(record) {
    if (record.kind === 'Medication record') return ['Current','Past','Prescription written','Fill documented','Needs review'];
    if (record.kind === 'Billing record' || record.kind === 'Receipt') return ['Confirmed open','Paid','Needs review'];
    if (record.category === 'Providers & Visits') return ['Visit confirmed','Needs review'];
    return ['Needs review'];
  }
  function reviewForm(record) {
    const saved = detail(record), form = node('form',null,'medical-review-form');
    const select = node('select');
    for (const s of ['',...statuses(record)]) select.add(new Option(s || 'Unreviewed',s));
    select.value = saved.status || '';
    const label = node('input'), date = node('input'), amount = node('input'), dose = node('input'), schedule = node('input');
    dose.value = saved.dose || ''; schedule.value = saved.schedule || '';
    label.value = saved.label || '';
    date.type = 'date';
    date.value = saved.date || (record.date.length === 10 ? record.date : '');
    amount.type = 'number'; amount.min = '0'; amount.step = '.01'; amount.value = saved.amount ?? '';
    const field = (name,input) => {const el = node('label',name);el.append(input);return el;};
    const submit = node('button','Save review');
    const error = node('p'); error.setAttribute('role','status');
    form.append(field('Status',select),field('Medication or provider name',label),field('Event date',date));
    if (record.kind === 'Medication record') form.append(field('Strength',dose),field('Schedule',schedule));
    if (statuses(record).includes('Paid')) form.append(field('Confirmed balance ($)',amount));
    form.append(submit,error);
    form.onsubmit = event => {
      event.preventDefault();
      if (['Current','Past','Prescription written','Fill documented','Visit confirmed'].includes(select.value) &&
          (!label.value.trim() || (['Prescription written','Fill documented','Visit confirmed'].includes(select.value) && !date.value))) {
        error.textContent = 'Enter the name and, for a visit, prescription, or fill, the event date.';
        return;
      }
      const next = {...review,[record.id]:{status:select.value,label:label.value.trim(),date:date.value,amount:amount.value,dose:dose.value.trim(),schedule:schedule.value.trim()}};
      try {localStorage.setItem(key,JSON.stringify(next));}
      catch {error.textContent = 'This browser could not save the review.';return;}
      review = next; renderKpis(); renderResults();
    };
    return form;
  }
  function renderHistory(category) {
    const target = $('medical-history');
    target.replaceChildren();
    const medication = category === 'Prescriptions';
    if (!medication && category !== 'Providers & Visits') return;
    const kinds = medication ? ['Fill documented','Prescription written'] : ['Visit confirmed'];
    for (const kind of kinds) {
      const totals = new Map();
      for (const record of confirmedEvents(kind)) {
        const name = eventName(record);
        const id = name.toLowerCase();
        const item = totals.get(id) || {name,count:0};
        item.count++;
        totals.set(id,item);
      }
      const top = [...totals.values()].sort((a,b) => b.count-a.count || a.name.localeCompare(b.name)).slice(0,10);
      const section = node('section',null,'medical-bars');
      section.append(node('strong',kind === 'Visit confirmed' ? 'Confirmed visits by provider' : kind === 'Fill documented' ? 'Documented fills by medication' : 'Written prescriptions by medication'));
      if (!top.length) section.append(node('small','Review source records to populate this history.'));
      for (const item of top) {
        const row = button('', () => {
          visitFilter = item.name.toLowerCase(); $('medical-search').value = item.name;
          $('medical-review').value = kind; resetResults();
        });
        const bar = node('progress');
        bar.max = top[0].count; bar.value = item.count; bar.setAttribute('aria-label',item.name);
        row.append(node('span',item.name),bar,node('strong',item.count)); section.append(row);
      }
      target.append(section);
    }
  }
  function renderResults() {
    const q = $('medical-search').value.trim().toLowerCase(), category = $('medical-category').value;
    const year = $('medical-year').value, state = $('medical-review').value;
    renderHistory(category);
    const filtered = records.filter(r => {
      const haystack = [r.name,...r.path,eventName(r),r.kind].join(' ').toLowerCase();
      const matchCategory = !category || r.category === category || (category === 'Tests' && r.kind.startsWith('Test ')) ||
        (category === 'Eyeglass prescriptions' && r.kind === 'Eyeglass prescription');
      return matchCategory && (!year || eventDate(r).startsWith(year)) && (!q || haystack.includes(q)) &&
        (!state || status(r) === state) && (!visitFilter || eventName(r).toLowerCase() === visitFilter);
    }).sort((a,b) => eventDate(b).localeCompare(eventDate(a)) || a.name.localeCompare(b.name));
    $('medical-count').textContent = filtered.length ? 'Showing ' + Math.min(limit,filtered.length) + ' of ' + filtered.length + ' records' : 'No records match these filters.';
    $('medical-more').hidden = filtered.length <= limit;
    $('medical-results').replaceChildren(...filtered.slice(0,limit).map(record => {
      const row = node('div',null,'medical-record');
      const item = button(record.name, () => thDriveRecords.open(record), 'medical-open');
      const sub = [eventDate(record),record.path.join(' › '),record.kind,status(record),eventName(record),detail(record).dose,detail(record).schedule].filter(Boolean).join(' · ');
      item.append(node('small',sub));
      const edit = button('Review', () => {
        const existing = row.querySelector('form');
        if (existing) { existing.remove(); edit.setAttribute('aria-expanded','false'); return; }
        row.append(reviewForm(record)); edit.setAttribute('aria-expanded','true');
        row.querySelector('select').focus();
      });
      edit.setAttribute('aria-expanded','false');
      edit.setAttribute('aria-label','Review ' + record.name);
      row.append(item,edit);return row;
    }));
  }
  function resetResults() {limit = 30;renderResults();}
  function renderWeight() {
    const target = $('weight-history');
    const days = Number($('weight-range').value);
    const last = weights.at(-1);
    target.replaceChildren();
    if (last) {
      const firstDate = days ? last.time - days*86400000 : -Infinity;
      const points = weights.filter(r => r.time >= firstDate);
      const min = Math.min(...points.map(r=>r.weight)), max = Math.max(...points.map(r=>r.weight));
      const first = points[0], change = last.weight-first.weight;
      target.append(node('p',last.weight.toFixed(1)+(last.unit?' '+last.unit:' (unit not listed)')+' latest · '+last.date+' · '+(change>0?'+':'')+change.toFixed(1)+' '+last.unit+' in range · '+points.length+' readings'));
      const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns,'svg');
      svg.setAttribute('viewBox','0 0 600 180');svg.setAttribute('class','medical-chart');svg.setAttribute('role','img');
      svg.setAttribute('aria-label','Weight trend. Low '+min.toFixed(1)+' and high '+max.toFixed(1)+' '+last.unit+'.');
      const line = document.createElementNS(ns,'polyline');
      line.setAttribute('points',points.map(r => [12+(r.time-first.time)/Math.max(1,last.time-first.time)*576,160-(r.weight-min)/Math.max(1,max-min)*142].join(',')).join(' '));
      svg.append(line);target.append(svg,node('small',first.date+' through '+last.date+' · Range '+min.toFixed(1)+'–'+max.toFixed(1)+' '+last.unit));
    } else target.append(node('p','No dated weight series could be read from the workbook.'));
    if (workbook) {
      const link = node('a','Open body composition workbook in Drive');
      link.href = workbook.url;link.target = '_blank';link.rel = 'noopener';const item = node('p'); item.append(link); target.append(item);
    }
  }
  async function loadWeight() {
    try {
      if (workbook && thAuthorized()) {
        const response = await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(workbook.id)+'?alt=media&supportsAllDrives=true',{
          headers:{Authorization:'Bearer '+thToken},cache:'no-store'
        });
        if (response.ok) weights = await readMedicalWeights(await response.arrayBuffer());
      }
    } catch (error) {console.warn('Could not read the weight series.',error.name);}
    renderWeight();
  }
  window.thStart = async () => {
    $('medical-content').hidden = false;
    $('medical-dashboard').hidden = true;
    $('medical-status').textContent = 'Connecting to your Medical records…';
    try {
      const candidates = await list("mimeType = '"+folderMime+"' and name = 'TisZod'");
      const roots = (await Promise.all(candidates.map(f => children(f.id)))).flat().filter(f => f.folder && /^(health & medical|medical)$/i.test(f.name));
      if (roots.length !== 1) throw new Error(roots.length ? 'More than one Medical folder was found.' : 'This Google account could not find TisZod → Health & Medical.');
      const root = roots[0];
      key = 'tiszod-medical-review-v1:' + root.id;
      try {review = JSON.parse(localStorage.getItem(key) || '{}') || {};} catch {review = {};}
      const files = (await children(root.id)).filter(file => !exclude(file));
      const folders = files.filter(file => file.folder);
      const rootFiles = files.filter(file => !file.folder);
      const indexed = await Promise.allSettled(folders.map(folder => walk(folder,[folder.name],new Set())));
      records = indexed.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      records.push(...rootFiles.map(file => ({...file,path:['Body Composition'],category:'Body Composition',kind:'Document',date:dateFromName(file.name)})));
      workbook = rootFiles.find(f => /body composition.*\.xlsx$/i.test(f.name));
      const ordered = [...new Set([...categories,...folders.map(f=>f.name)])];
      $('medical-category').replaceChildren();
      $('medical-year').replaceChildren();
      for (const [value,name] of [['','All categories'],...ordered.map(name=>[name,name]),['Tests','All test records'],['Eyeglass prescriptions','Eyeglass prescriptions']]) $('medical-category').add(new Option(name,value));
      $('medical-year').add(new Option('All years',''));
      for (const year of [...new Set(records.map(r=>eventDate(r).slice(0,4)).filter(Boolean))].sort().reverse()) $('medical-year').add(new Option(year,year));
      const cards = folders.sort((a,b) => ordered.indexOf(a.name)-ordered.indexOf(b.name)).map(folder => {
        const [medicalArt,medicalCover] = collections[folder.name] || ['providers','blue'];
        return thDriveRecords.card({...folder,medicalCover,medicalArt});
      });
      const eyeFolder = await (async () => {
        const rx = folders.find(f => f.name === 'Prescriptions');
        return rx && (await children(rx.id).catch(()=>[])).find(f => f.folder && f.name === 'Vision');
      })();
      if (eyeFolder) cards.splice(1,0,thDriveRecords.card({...eyeFolder,name:'Eyeglass Prescriptions',medicalCover:'blue',medicalArt:'vision'}));
      for (const file of rootFiles) cards.push(thDriveRecords.card({...file,medicalArt:'weight'}));
      $('medical-folders').replaceChildren(...cards);
      $('medical-status').textContent = indexed.some(r=>r.status==='rejected') ? 'Some folders could not be indexed. Their folder cards remain available.' : records.length+' Drive records indexed · Reviews are saved in this browser.';
      for (const id of ['medical-search','medical-category','medical-year','medical-review']) $(id)[id==='medical-search'?'oninput':'onchange'] = () => {visitFilter='';resetResults();};
      $('medical-more').onclick = () => {limit+=30;renderResults();};
      $('weight-range').onchange = renderWeight;
      renderKpis(); renderResults(); $('medical-dashboard').hidden = false; $('medical-jump').hidden = false;
      void loadWeight();
    } catch(error) {
      if (error.status === 401) throw error;
      $('medical-status').textContent = error.message || 'Medical records could not be loaded.';
    }
  };
})();
