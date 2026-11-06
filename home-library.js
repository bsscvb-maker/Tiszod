(() => {
  const get = id => document.getElementById(id);
  const query = get('library-query');
  const collections = get('library-collections');
  const category = get('library-topic');
  const refresh = get('library-refresh');
  const results = get('library-results');
  const status = get('library-status');
  const notice = get('library-notice');
  const more = get('library-more');
  const sections = ['Manuals', 'Recipes', 'Purchases'];
  const folderMime = 'application/vnd.google-apps.folder';
  const pageSize = 24;
  const topicRules = [
    ['Lighting', /\b(light|lights|lighting|bulb|lamp|lantern|flashlight|headlamp|led)\b/],
    ['Appliances', /\b(appliance|appliances|refrigerator|freezer|washer|dryer|microwave|dishwasher|vacuum|air fryer|coffee maker|blender|toaster|dehumidifier|humidifier|oven)\b/],
    ['Automotive', /\b(automotive|vehicle|vehicles|car|truck|motorcycle|ford|toyota|honda|ram|harley|dash cam|jump starter|obd)\b/],
    ['Electronics', /\b(electronics|computer|laptop|tablet|camera|router|bluetooth|headphones|speaker|monitor|charger|usb|television|tv)\b/],
    ['Tools & outdoors', /\b(tools?|outdoors?|camping|cycling|saw|drill|generator|mower|trimmer|grill)\b/],
    ['Household', /\b(household|blanket|bedding|furniture|heater|thermostat|fan)\b/],
    ['Receipts & orders', /\b(receipts?|orders?|invoices?|confirmation|packing slip|purchases?)\b/]
  ];
  const synonyms = [
    ['heated', 'electric', 'warming'],
    ['blanket', 'throw'],
    ['light', 'lighting', 'lamp', 'bulb', 'led'],
    ['manual', 'instructions', 'guide'],
    ['receipt', 'invoice', 'order'],
    ['car', 'automotive', 'vehicle'],
    ['tv', 'television']
  ];
  const stopWords = new Set(['a', 'an', 'the', 'for', 'my', 'show', 'find', 'me', 'with', 'of', 'please']);
  const normalize = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const quote = value => "'" + value.replace(/['\\]/g, '\\$&') + "'";
  const parentClause = id => quote(id) + ' in parents';

  let documents = [];
  let folders = [];
  let visible = pageSize;
  let loaded = false;
  let timer;
  let indexing;
  let contentSearch;
  let contentMatches = new Set();
  let contentStatus = '';

  async function listDrive(filter, folder, fields, signal) {
    const params = {
      q: filter + ' and trashed = false',
      fields: 'nextPageToken,incompleteSearch,files(' + fields + ')',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true'
    };
    const files = [];
    do {
      const response = await thDriveRecords.request('', params, folder, AbortSignal.any([signal, AbortSignal.timeout(20000)]));
      const page = await response.json();
      if (page.incompleteSearch) throw new Error('Drive returned an incomplete listing.');
      files.push(...(page.files || []));
      params.pageToken = page.nextPageToken || '';
    } while (params.pageToken);
    return files;
  }

  async function loadLibrary() {
    indexing?.abort();
    contentSearch?.abort();
    clearTimeout(timer);
    const controller = new AbortController();
    indexing = controller;
    const {signal} = controller;
    refresh.disabled = true;
    loaded = false;
    notice.hidden = true;
    results.replaceChildren();
    more.hidden = true;
    status.textContent = 'Reading your Drive folders…';
    try {
      const rootFields = 'id,name,resourceKey';
      const rootType = 'mimeType = ' + quote(folderMime);
      const parents = await listDrive(rootType + " and name = 'TisZod'", {}, rootFields, signal);
      const roots = (await Promise.all(parents.map(parent => listDrive(
        rootType + " and name = 'Home & Purchases' and " + parentClause(parent.id), parent, rootFields, signal
      )))).flat();
      // A directly shared Home & Purchases folder may be visible without its parent.
      const candidates = roots.length ? roots : await listDrive(rootType + " and name = 'Home & Purchases'", {}, rootFields, signal);
      if (candidates.length !== 1) {
        throw new Error(candidates.length ? 'More than one Home & Purchases folder matched. Check which copy is available in this Google account.' : 'Home & Purchases was not found. Sign in with the Google account that can open the Drive folder.');
      }
      const root = candidates[0];
      const childFolders = await listDrive(rootType + ' and ' + parentClause(root.id), root, rootFields, signal);
      const queue = childFolders.filter(folder => sections.includes(folder.name)).map(folder => ({
        ...folder, section: folder.name, path: []
      }));
      const unavailable = sections.filter(name => queue.filter(folder => folder.section === name).length !== 1);
      if (unavailable.length) throw new Error('Drive could not identify one folder for ' + unavailable.join(', ') + '.');
      const catalog = new Map();
      const scanned = [];
      const failures = [];
      const fields = 'id,name,description,mimeType,webViewLink,resourceKey,size,capabilities(canDownload)';
      while (queue.length) {
        await Promise.all(queue.splice(0, 6).map(async folder => {
          try {
            const items = await listDrive(parentClause(folder.id), folder, fields, signal);
            scanned.push(folder);
            for (const file of items) {
              if (file.mimeType === folderMime) {
                queue.push({...file, section: folder.section, path: [...folder.path, file.name]});
                continue;
              }
              if (file.mimeType === 'application/vnd.google-apps.shortcut' || /^(?:~\$|desktop\.ini$|thumbs\.db$)/i.test(file.name)) continue;
              const title = file.name.replace(/\.[a-z0-9]{1,6}$/i, '');
              const path = [folder.section, ...folder.path].join(' / ');
              const titleKey = normalize(title);
              const topics = topicRules.filter(([,pattern]) => pattern.test(normalize(title + ' ' + folder.path.join(' ')))).map(([name]) => name);
              catalog.set(file.id, {
                id: file.id, name: file.name, displayName: title, mime: file.mimeType, section: folder.section,
                path, titleKey, topics, index: normalize([title, path, file.description || '', ...topics].join(' ')),
                url: file.webViewLink || 'https://drive.google.com/open?id=' + encodeURIComponent(file.id),
                resourceKey: file.resourceKey, canDownload: file.capabilities?.canDownload, size: Number(file.size),
                driveAction: true, libraryActions: true
              });
            }
          } catch (error) {
            if (signal.aborted || error.status === 401) throw error;
            failures.push(folder);
          }
        }));
      }
      if (signal.aborted) return;
      if (!scanned.length) throw new Error('The document folders could not be read. Check your Drive access and try again.');
      documents = [...catalog.values()];
      folders = scanned;
      loaded = true;
      if (failures.length) {
        notice.textContent = failures.length + ' Drive folder(s) could not be read. Refresh to retry them.';
        notice.hidden = false;
      }
      for (const name of ['', ...sections]) {
        get('library-count-' + (name || 'all')).textContent = documents.filter(file => !name || file.section === name).length.toLocaleString();
      }
      updateCategories();
      search(false);
    } catch (error) {
      if (signal.aborted) return;
      if (error.status === 401) throw error;
      status.textContent = error.message || 'Drive could not be reached. Refresh to try again.';
    } finally {
      if (indexing === controller) refresh.disabled = false;
    }
  }

  const selectedSection = () => collections.querySelector('input:checked').value;
  function updateCategories() {
    const selection = category.value;
    const names = new Set(documents.filter(file => !selectedSection() || file.section === selectedSection()).flatMap(file => file.topics));
    category.replaceChildren(new Option('All categories', ''));
    for (const name of [...names].sort()) category.add(new Option(name, name));
    category.value = names.has(selection) ? selection : '';
  }

  function terms() {
    return [...new Set(normalize(query.value).split(' ').filter(word => word && !stopWords.has(word)))];
  }

  function score(file, words) {
    if (!words.length) return 0;
    const variants = words.map(word => {
      if (file.titleKey.includes(word)) return 12;
      if (file.index.includes(word)) return 6;
      const related = synonyms.find(group => group.includes(word));
      return related?.some(value => file.index.includes(value)) ? 3 : 0;
    });
    if (variants.some(value => !value)) return contentMatches.has(file.id) ? 1 : -1;
    return variants.reduce((total, value) => total + value, 0) + (file.titleKey.includes(words.join(' ')) ? 30 : 0);
  }

  function fileCard(file) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'library-document';
    button.dataset.collection = file.section;
    button.dataset.file = file.id;
    const badge = document.createElement('span');
    badge.className = 'library-file-tag';
    const extension = file.name.match(/\.([a-z0-9]{1,6})$/i)?.[1];
    badge.textContent = extension?.toUpperCase() || 'DRIVE';
    const title = document.createElement('strong');
    title.textContent = file.displayName;
    const path = document.createElement('span');
    path.className = 'library-path';
    path.textContent = file.path;
    const action = document.createElement('span');
    action.className = 'library-open';
    action.textContent = 'Preview document →';
    button.append(badge, title, path, action);
    button.addEventListener('click', () => thDriveRecords.open(file));
    li.append(button);
    return li;
  }

  function render(append = false) {
    if (!loaded) return;
    const words = terms();
    const section = selectedSection();
    const ranked = documents
      .filter(file => (!section || file.section === section) && (!category.value || file.topics.includes(category.value)))
      .map(file => ({file, rank: score(file, words)}))
      .filter(item => item.rank >= 0)
      .sort((a, b) => b.rank - a.rank || a.file.displayName.localeCompare(b.file.displayName, undefined, {numeric: true}));
    get('library-results-title').textContent = words.length ? 'Search results' : 'Browse documents';
    const shown = Math.min(ranked.length, visible);
    const count = ranked.length === 1 ? '1 document' : ranked.length.toLocaleString() + ' documents';
    const summary = ranked.length ? count + (shown < ranked.length ? ' · Showing ' + shown : '') : 'No matching documents.';
    status.textContent = summary + (contentStatus ? ' ' + contentStatus : '');
    const focused = results.contains(document.activeElement) ? document.activeElement.dataset.file : null;
    if (!append) results.replaceChildren();
    const start = results.children.length;
    results.append(...ranked.slice(start, shown).map(({file}) => fileCard(file)));
    more.hidden = shown >= ranked.length;
    if (append) results.children[start]?.querySelector('button')?.focus();
    else if (focused) (results.querySelector('[data-file="' + CSS.escape(focused) + '"]') || query).focus({preventScroll: true});
  }

  async function searchContent(words, controller) {
    const {signal} = controller;
    const section = selectedSection();
    const relevant = folders.filter(folder => !section || folder.section === section);
    const requested = words.filter(word => word.length > 1).slice(0, 8);
    if (!relevant.length || !requested.length) return;
    const textClause = requested.map(word => 'fullText contains ' + quote(word)).join(' and ');
    const batches = [];
    let failed = false;
    for (let offset = 0; offset < relevant.length; offset += 20) batches.push(relevant.slice(offset, offset + 20));
    contentStatus = 'Checking text indexed by Drive…';
    render();
    const matched = new Set();
    for (let offset = 0; offset < batches.length; offset += 4) {
      await Promise.all(batches.slice(offset, offset + 4).map(async batch => {
        try {
          const scope = '(' + batch.map(folder => parentClause(folder.id)).join(' or ') + ')';
          const headers = {resourceKeys: batch.filter(folder => folder.resourceKey).map(folder => folder.id + '/' + folder.resourceKey)};
          const files = await listDrive(scope + ' and ' + textClause, headers, 'id', signal);
          files.forEach(file => matched.add(file.id));
        } catch {
          failed = true;
        }
      }));
      if (signal.aborted) return;
    }
    if (signal.aborted) return;
    contentMatches = matched;
    contentStatus = failed ? 'Some document text could not be searched.' : '';
    render();
  }

  function search(wait) {
    contentSearch?.abort();
    clearTimeout(timer);
    contentMatches = new Set();
    contentStatus = '';
    visible = pageSize;
    render();
    const words = terms();
    if (!loaded || !words.length) return;
    const controller = new AbortController();
    contentSearch = controller;
    if (wait) timer = setTimeout(() => searchContent(words, controller), 500);
    else searchContent(words, controller);
  }

  query.addEventListener('input', () => search(true));
  get('library-search').addEventListener('submit', event => {
    event.preventDefault();
    search(false);
  });
  collections.addEventListener('change', () => {
    updateCategories();
    search(false);
  });
  category.addEventListener('change', () => { visible = pageSize; render(); });
  refresh.addEventListener('click', () => loadLibrary().catch(() => {
    status.textContent = 'Your Google session expired. Reload this page to sign in again.';
  }));
  more.addEventListener('click', () => { visible += pageSize; render(true); });
  window.thStart = loadLibrary;
})();
