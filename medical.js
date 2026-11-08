(() => {
  const categories = ['Prescriptions', 'Providers & Visits', 'Labs & Screening', 'Dental', 'Insurance', 'Billing & Receipts', 'Immunizations', 'Body Composition'];
  const folderLabels = {'Billing & Receipts':'Billing','Labs & Screening':'Test Result','Providers & Visits':'Providers'};
  const isAdministrative = name => /^(?:\d{2}[ ._-]+)?(?:admin(?:istrative)? access|quarantine)\b/i.test(name);
  const canonical = name => Object.keys(folderLabels).find(key => folderLabels[key] === name) || name;
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
  let workbook, workbookWeights = [], manualWeights = [], browserWeights = [], folderSummaries = {};

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
  const compositionFilename='TisZod About Me - Body Composition.json';
  const exclude = file => file.name===compositionFilename|| /^archive - review|^recovered exports - needs review|^verified duplicates|^temporary office files|^~\$/i.test(file.name);
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
      else found.push({ ...file, path, category: canonical(path[0]), date: dateFromName(file.name), kind: kindOf(file,path) });
    }
    return found.concat(...await Promise.all(branches));
  }
  const detail = record => review[record.id] || {};
  const status = record => detail(record).status || (record.kind === 'Billing record' ? 'Needs review' : '');
  const eventDate = record => detail(record).date || record.date;
  const eventName = record => detail(record).label?.trim() || '';
  function confirmedEvents(state) {
    const unique = new Map();
    for (const record of records.filter(r => status(r) === state)) {
      const date = eventDate(record), name = eventName(record);
      const fingerprint = [name.toLowerCase().replace(/\s+/g,' '),date,state].join('|');
      if (name && date.length === 10) unique.set(fingerprint,record);
    }
    return [...unique.values()];
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
      review = next; renderResults(); thMedicalAbout.refresh();
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
    thMedicalWeightChart.render($('weight-history'),weights,Number($('weight-range').value));
  }
  function updateWeights() {
    weights = thMedicalWeightChart.merge(workbookWeights,[...(Array.isArray(manualWeights)?manualWeights:[]),...browserWeights]);
    renderWeight();
    thMedicalAbout.refresh();
  }
  function renderCollections(entries) {
    const tabs = $('medical-folder-tabs'), panel = $('medical-folders');
    const admin=entries.filter(entry=>isAdministrative(entry.originalName||entry.name));
    $('medical-admin-folders').hidden=!admin.length;
    $('medical-admin-cards').replaceChildren(...admin.map(entry=>thDriveRecords.card(entry)));
    entries=entries.filter(entry=>!isAdministrative(entry.originalName||entry.name));
    const choices = [['All files',entries],...entries.filter(entry=>entry.folder||entry.directReader).map(entry=>[entry.name,[entry]])];
    const controls = choices.map(([label,items],index) => {
      const tab=button(label,()=>select(index));
      tab.id='medical-folder-tab-'+index;
      tab.setAttribute('role','tab');
      tab.setAttribute('aria-controls',panel.id);
      tab.onkeydown=event=>{
        const offsets={ArrowLeft:-1,ArrowRight:1,Home:-index,End:choices.length-index-1};
        if(!Object.hasOwn(offsets,event.key))return;
        event.preventDefault();
        const next=(index+offsets[event.key]+choices.length)%choices.length;
        select(next);controls[next].focus();
      };
      return tab;
    });
    function select(index) {
      controls.forEach((control,i)=>{control.setAttribute('aria-selected',String(i===index));control.tabIndex=i===index?0:-1;});
      panel.setAttribute('aria-labelledby',controls[index].id);
      panel.replaceChildren(...choices[index][1].map(entry=>thDriveRecords.card(entry)));
    }
    tabs.replaceChildren(...controls);
    select(0);
  }
  async function loadWeight() {
    try {
      if (workbook && thAuthorized()) {
        const response = await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(workbook.id)+'?alt=media&supportsAllDrives=true',{
          headers:{Authorization:'Bearer '+thToken},cache:'no-store'
        });
        if (response.ok) workbookWeights = await readMedicalWeights(await response.arrayBuffer());
      }
    } catch (error) {console.warn('Could not read the weight series.',error.name);}
    updateWeights();
  }
  function revealTodd(hash=location.hash){
    const inTodd=['#medical-todd','#medical-about','#medical-browse','#timeline-title','#weight-title'].includes(hash);
    $('medical-todd').hidden=!inTodd;
    if(hash==='#timeline-title')$('medical-timeline-panel').hidden=false;
  }
  window.addEventListener('hashchange',()=>revealTodd());
  $('medical-landing-search').addEventListener('submit',event=>{
    event.preventDefault();
    const query=$('medical-landing-query').value.trim();
    if(!query)return;
    $('medical-search').value=query;
    visitFilter='';
    revealTodd('#timeline-title');
    resetResults();
    if(location.hash!=='#timeline-title')location.hash='timeline-title';
    else $('timeline-title').scrollIntoView();
  });
  $('medical-content').addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');
    if(link)revealTodd(link.hash);
  });
  window.thStart = async () => {
    workbookWeights = []; manualWeights = []; browserWeights = []; weights = []; folderSummaries = {};
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
      const toddFolder=files.find(file=>file.folder&&file.name==='Todd');
      const folders = files.filter(file => file.folder);
      const rootFiles = files.filter(file => !file.folder);
      const indexed = await Promise.allSettled(folders.filter(folder=>!isAdministrative(folder.name)).map(folder => walk(folder,[folder.name],new Set())));
      records = indexed.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      records.push(...rootFiles.map(file => ({...file,path:['Body Composition'],category:'Body Composition',kind:'Document',date:dateFromName(file.name)})));
      workbook = rootFiles.find(f => /^body composition(?: metrics)?\.xlsx$/i.test(f.name));
      const ordered = [...new Set([...categories,...folders.map(f=>canonical(f.name))])];
      $('medical-category').replaceChildren();
      $('medical-year').replaceChildren();
      for (const [value,name] of [['','All categories'],...ordered.map(name=>[name,folderLabels[name] || name]),['Tests','All test records'],['Eyeglass prescriptions','Eyeglass prescriptions']]) $('medical-category').add(new Option(name,value));
      $('medical-year').add(new Option('All years',''));
      for (const year of [...new Set(records.map(r=>eventDate(r).slice(0,4)).filter(Boolean))].sort().reverse()) $('medical-year').add(new Option(year,year));
      const order = ['Billing','Dental','Immunizations','Insurance','Test Result','Prescriptions','Providers'];
      const rank = name => order.includes(name) ? order.indexOf(name) : order.length;
      const usedMedicalArt = new Set(['providers']);
      const cards = folders.map(folder => {
        const category=canonical(folder.name);
        const [art,medicalCover] = collections[category] || [null,'blue'];
        const medicalArt = usedMedicalArt.has(art) ? undefined : art;
        if (medicalArt) usedMedicalArt.add(medicalArt);
        return thMedicalFolders.enrich({...folder,originalName:folder.name,name:folderLabels[category] || folder.name,medicalCover,medicalArt},{
          records,date:eventDate,detail,summary:()=>folderSummaries,open:(record,back)=>thDriveRecords.open(record,back)
        });
      }).sort((a,b)=>rank(a.name)-rank(b.name));
      cards.push({id:'medical-care-team',name:'Care Team',folder:true,dashboardOnly:true,dashboard:()=>thMedicalAbout.careTeam(),medicalCoverImage:'assets/medical/care-team.svg'});
      cards.push({name:'Medical Timeline',directReader:true,readerUrl:'#timeline-title',cardLabel:'Open timeline',medicalCoverImage:'assets/medical/timeline.webp'});
      revealTodd();
      renderCollections(cards);
      $('medical-status').textContent = indexed.some(r=>r.status==='rejected') ? 'Some folders could not be indexed. Their folder cards remain available.' : records.length+' Drive records indexed · Reviews are saved in this browser.';
      for (const id of ['medical-search','medical-category','medical-year','medical-review']) $(id)[id==='medical-search'?'oninput':'onchange'] = () => {visitFilter='';resetResults();};
      $('medical-more').onclick = () => {limit+=30;renderResults();};
      $('weight-range').onchange = renderWeight;
      const weighInKey=key+':weigh-ins', weighInForm=$('medical-add-weigh-in');
      try {
        const saved=JSON.parse(localStorage.getItem(weighInKey)||'[]');
        if(Array.isArray(saved)) browserWeights=saved;
      } catch {}
      weighInForm.onsubmit=event=>{
        event.preventDefault();
        const fields=new FormData(weighInForm), date=fields.get('date'), weight=Number(fields.get('weight'));
        const status=weighInForm.querySelector('[role="status"]');
        if(!date || !Number.isFinite(weight) || weight<=0) return;
        const next=[...browserWeights.filter(row=>row.date!==date || Number.isFinite(row.time)),{date,weight,unit:'lb',source:'Self-reported weigh-in'}];
        try {localStorage.setItem(weighInKey,JSON.stringify(next));}
        catch {status.textContent='This browser could not save the weigh-in.';return;}
        browserWeights=next;
        updateWeights();
        weighInForm.reset();
        status.textContent='Weigh-in saved.';
      };
      const query = new URLSearchParams(location.search).get('q');
      if (query) {
        $('medical-search').value=query.slice(0,120);
        revealTodd('#timeline-title');
      }
      renderResults(); $('medical-dashboard').hidden = false; $('medical-jump').hidden = false;
      const importForm=$('medical-import-weigh-ins');
      importForm.onsubmit=async event=>{
        event.preventDefault();
        const file=new FormData(importForm).get('history');
        const status=importForm.querySelector('[role="status"]');
        const button=importForm.querySelector('button');
        button.disabled=true;
        try {
          const [header,...lines]=(await file.text()).trim().split(/\r?\n/);
          const columns=header.split(',').map(value=>value.trim().replace(/^"|"$/g,''));
          const weightColumn=columns.indexOf('Weight (lb)'), dateColumn=columns.indexOf('Date/Time');
          if(weightColumn<0 || dateColumn<0) throw Error();
          const imported=new Map();
          for(const line of lines){
            const values=line.split(',').map(value=>value.trim().replace(/^"|"$/g,''));
            const weight=Number(values[weightColumn]), time=Date.parse(values[dateColumn]+' UTC');
            if(values.length!==columns.length || !Number.isFinite(weight) || weight<=0 || !Number.isFinite(time)) continue;
            imported.set(time,{date:new Date(time).toISOString().slice(0,10),time,weight,unit:'lb',source:'Scale CSV'});
          }
          if(!imported.size) throw Error();
          const next=[...browserWeights.filter(row=>!imported.has(row.time)),...imported.values()];
          localStorage.setItem(weighInKey,JSON.stringify(next));
          browserWeights=next;
          updateWeights();
          importForm.reset();
          status.textContent=imported.size+' readings imported.';
        } catch {status.textContent='Could not import the file. Use a scale CSV with Weight (lb) and Date/Time columns.';}
        finally {button.disabled=false;}
      };
      thMedicalAbout.start({
        key, list,
        async compositionSource(){
          if(!toddFolder)return null;
          const sources=(await children(toddFolder.id)).filter(file=>!file.folder&&file.name===compositionFilename);
          if(sources.length>1)throw Error('More than one body composition source was found.');
          if(!sources.length)return null;
          const response=await thDriveFetch(sources[0].id,{cache:'no-store'});
          if(!response.ok)throw Error('Body composition source could not load.');
          return response.json();
        },
        onFolderSummaries: value => {
          folderSummaries=value||{};
          const hidden = new Set(folderSummaries.hiddenBillingIds||[]);
          records=records.filter(record=>!hidden.has(record.id));
          renderResults();
        }, onWeighIns: readings => {manualWeights=readings;updateWeights();}, records: () => records, weights: () => weights, workbook: () => workbook,
        eventName, eventDate, confirmedEvents,
        current: record => status(record) === 'Current' ? [eventName(record),detail(record).dose,detail(record).schedule].filter(Boolean).join(' · ') : '',
        open: record => thDriveRecords.open(record)
      });
      void loadWeight();
    } catch(error) {
      if (error.status === 401) throw error;
      $('medical-status').textContent = error.message || 'Medical records could not be loaded.';
    }
  };
})();
