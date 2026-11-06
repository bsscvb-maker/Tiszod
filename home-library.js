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
  const collectionInfo = {
    Manuals: ['Find owner’s guides, model numbers, and setup instructions.', 'Try heated blanket, desk lamp, or a model number.'],
    Recipes: ['Find saved recipes by dish, ingredient, or occasion.', 'Try banana bread, chicken, or pumpkin.'],
    Purchases: ['Find receipts, invoices, and records of past orders.', 'Try a retailer, product, or order number.']
  };
  const sections = Object.keys(collectionInfo);
  const home = get('library-home');
  const workspace = get('library-workspace');
  const workspaceTitle = get('library-collection-title');
  const catalogPanel = get('library-catalog');
  const reader = get('legal-view');
  const matches = get('library-matches');
  const globalQuery = get('library-global-query');
  let activeSection = '';
  let reading;
  let catalogs;
  const currentCatalog = () => catalogs?.[activeSection];
  let coverRequest;
  let catalogPath = '';
  let catalogSearchGroup = false;
  const manualBreadcrumb = get('manual-breadcrumb');
  const manualProduct = get('manual-product');
  let ranked = [];
  let previewTrigger;
  const folderMime = 'application/vnd.google-apps.folder';
  const pageSize = 24;
  const topicRules = [
    ['Lighting', /\b(light|lights|lighting|bulb|lamp|lantern|flashlight|headlamp|led)\b/],
    ['Appliances', /\b(appliance|appliances|refrigerator|freezer|washer|dryer|microwave|dishwasher|vacuum|air fryer|coffee maker|blender|toaster|dehumidifier|humidifier|oven)\b/],
    ['Automotive', /\b(automotive|vehicle|vehicles|car|truck|motorcycle|ford|toyota|honda|ram|harley|dash cam|jump starter|obd)\b/],
    ['Electronics', /\b(electronics|computer|laptop|tablet|camera|router|bluetooth|headphones|speaker|monitor|charger|usb|television|tv)\b/],
    ['Tools & outdoors', /\b(tools?|outdoors?|camping|cycling|saw|drill|generator|mower|trimmer|grill)\b/],
    ['Household', /\b(household|blanket|bedding|furniture|heater|thermostat|fan)\b/],
    ['Main dishes', /\b(chicken|pork|beef|steak|salmon|casserole|pasta)\b/],
    ['Desserts & baking', /\b(desserts?|cookies?|cake|cheesecake|brownies?|banana bread|muffins?|pie)\b/],
    ['Sides & appetizers', /\b(appetizers?|dip|dips|salad|slaw|side dish|sweet potatoes)\b/],
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
    get('library-home-retry').hidden = true;
    get('library-home-status').textContent = '';
    closePreview();
    loaded = false;
    notice.hidden = true;
    results.replaceChildren();
    more.hidden = true;
    status.textContent = 'Reading your Drive folders…';
    try {
      const rootFields = 'id,name,resourceKey';
      const rootType = 'mimeType = ' + quote(folderMime);
      const libraryFolder = rootType + " and name = 'Library'";
      const parents = await listDrive(rootType + " and name = 'TisZod'", {}, rootFields, signal);
      const roots = (await Promise.all(parents.map(parent => listDrive(
        libraryFolder + " and " + parentClause(parent.id), parent, rootFields, signal
      )))).flat();
      // A directly shared Library folder may be visible without its parent.
      const candidates = roots.length ? roots : await listDrive(libraryFolder, {}, rootFields, signal);
      if (candidates.length !== 1) {
        throw new Error(candidates.length ? 'More than one Library folder matched. Check which copy is available in this Google account.' : 'The Library folder was not found. Sign in with the Google account that can open the Drive folder.');
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
      catalogs = Object.fromEntries(sections.map(section => [section, thLibraryCatalog.build(documents.filter(file => file.section === section), section)]));
      if (!currentCatalog()?.nodes.has(catalogPath)) catalogPath = '';
      folders = scanned;
      loaded = true;
      if (failures.length) {
        notice.textContent = failures.length + ' Drive folder(s) could not be read. Refresh to retry them.';
        notice.hidden = false;
      }
      for (const name of sections) {
        const count = documents.filter(file => file.section === name).length;
        get('library-count-' + name).textContent = count.toLocaleString() + (count === 1 ? ' document' : ' documents');
      }
      if (failures.length) get('library-home-status').textContent = notice.textContent;
      updateCategories();
      search(false);
    } catch (error) {
      if (signal.aborted) return;
      if (error.status === 401) throw error;
      status.textContent = error.message || 'Drive could not be reached. Refresh to try again.';
      get('library-home-status').textContent = status.textContent;
      get('library-home-retry').hidden = false;
      for (const name of sections) get('library-count-' + name).textContent = 'Drive unavailable';
    } finally {
      if (indexing === controller) refresh.disabled = false;
    }
  }

  const selectedSection = () => activeSection;

  function closePreview() {
    if (reading) thDriveRecords.close();
  }

  function drawMatchRail() {
    if (!reading) return;
    const fragment = document.createDocumentFragment();
    const label = document.createElement('h2');
    label.textContent = 'In these results';
    fragment.append(label);
    const inGroup = currentCatalog()?.nodes.get(catalogPath)?.files;
    const railFiles = inGroup || ranked.map(({file}) => file);
    const selected = railFiles.find(file => file.id === reading);
    const nearby = railFiles.slice(0, visible);
    if (selected && !nearby.includes(selected)) nearby.unshift(selected);
    for (const file of nearby) {
      const item = document.createElement('button');
      item.type = 'button';
      item.textContent = file.displayName;
      if (file.id === reading) item.setAttribute('aria-current', 'true');
      item.addEventListener('click', () => openPreview(file));
      fragment.append(item);
    }
    matches.replaceChildren(fragment);
  }

  function openPreview(file, trigger) {
    reading = file.id;
    if (trigger) previewTrigger = trigger;
    catalogPanel.hidden = true;
    matches.hidden = false;
    drawMatchRail();
    thDriveRecords.open({...file, readingMode: true});
  }

  reader.addEventListener('close', () => {
    reading = null;
    matches.hidden = true;
    matches.replaceChildren();
    catalogPanel.hidden = false;
    if (reader.dataset.restoreFocus === 'yes') {
      const fallback = previewTrigger?.dataset.file;
      const button = fallback && results.querySelector('[data-file="' + CSS.escape(fallback) + '"]');
      (button || query).focus();
    }
    delete reader.dataset.restoreFocus;
    previewTrigger = null;
  });
  get('legal-view-close').addEventListener('click', () => { reader.dataset.restoreFocus = 'yes'; }, {capture: true});

  function showLocation(focus = false) {
    const params = new URLSearchParams(location.search);
    catalogPath = '';
    catalogSearchGroup = false;
    activeSection = sections.find(name => name.toLowerCase() === params.get('collection')) || '';
    const across = params.get('view') === 'search';
    closePreview();
    home.hidden = Boolean(activeSection || across);
    workspace.hidden = !home.hidden;
    query.value = across ? globalQuery.value : '';
    category.value = '';
    if (home.hidden) {
      const [description, tip] = collectionInfo[activeSection] || ['Search manuals, recipes, and purchases together.', 'Try a product, recipe, retailer, or order number.'];
      workspaceTitle.textContent = activeSection || 'All documents';
      get('library-collection-description').textContent = description;
      get('library-collection-cover').dataset.collection = activeSection;
      get('library-search-label').textContent = activeSection ? 'Search ' + activeSection.toLowerCase() : 'Search all documents';
      get('library-search-tip').textContent = tip;
      for (const tab of collections.querySelectorAll('a')) {
        if (tab.dataset.collection === activeSection) tab.setAttribute('aria-current', 'page');
        else tab.removeAttribute('aria-current');
      }
    }
    updateCategories();
    search(false);
    if (focus) (home.hidden ? workspaceTitle : home.querySelector('h1')).focus();
  }

  for (const link of document.querySelectorAll('.library-card, .library-breadcrumb a, .library-tabs a')) {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (link.href === location.href) return;
      history.pushState(null, '', link.href);
      showLocation(true);
    });
  }
  get('library-global-search').addEventListener('submit', event => {
    event.preventDefault();
    if (!globalQuery.value.trim()) return;
    history.pushState(null, '', '?view=search');
    showLocation(true);
  });
  window.addEventListener('popstate', () => showLocation(true));
  function updateCategories() {
    category.closest('.library-controls').classList.toggle('manual-controls', Boolean(activeSection));
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

  function fileCard(file, words, rank) {
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
    if (words.length) {
      const evidence = document.createElement('span');
      evidence.className = 'library-evidence';
      evidence.textContent = rank === 1 ? 'Matched by Drive search' :
        words.every(word => file.titleKey.includes(word)) ? 'Title match' : 'Related terms or file details';
      path.append(evidence);
    }
    const action = document.createElement('span');
    action.className = 'library-open';
    action.textContent = 'Read document →';
    button.append(badge, title, path, action);
    button.addEventListener('click', () => openPreview(file, button));
    li.append(button);
    return li;
  }

  function moveCatalog(entry, fromSearch = false) {
    catalogPath = entry?.id || '';
    catalogSearchGroup = fromSearch;
    visible = pageSize;
    closePreview();
    render();
    get('library-results-title').focus();
  }

  function cardArt(entry) {
    const cover = document.createElement('span');
    cover.className = 'manual-art';
    if (entry.art === 'collection') cover.classList.add('manual-art-triptych');
    else if (Number.isInteger(entry.art)) {
      const index = entry.art - 1;
      const tile = index % 25;
      cover.classList.add('library-art-tile');
      cover.style.backgroundImage = 'url("assets/home-library/browse-' + (Math.floor(index / 25) + 1) + '.webp")';
      cover.style.backgroundPosition = (tile % 5) * 25 + '% ' + (Math.floor(tile / 5) * 25) + '%';
    } else {
      cover.classList.add('library-art-label');
      const label = document.createElement('span');
      label.textContent = entry.title.split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word)).slice(0, 2).map(word => word[0]).join('').toUpperCase();
      label.setAttribute('aria-hidden', 'true');
      cover.append(label);
    }
    if (entry.photo) {
      const photo = new Image();
      photo.alt = '';
      photo.loading = 'lazy';
      photo.referrerPolicy = 'no-referrer';
      photo.addEventListener('error', () => photo.remove(), {once: true});
      photo.src = entry.photo;
      cover.append(photo);
    }
    return cover;
  }

  function catalogCard(entry, fromSearch) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'manual-card';
    const title = document.createElement('strong');
    title.textContent = entry.title;
    const caption = document.createElement('small');
    caption.textContent = entry.count.toLocaleString() + (entry.count === 1 ? ' file' : ' files');
    if (fromSearch) caption.textContent = entry.parent.parent.title + ' / ' + entry.parent.title + ' · ' + caption.textContent;
    button.append(cardArt(entry), title, caption);
    button.addEventListener('click', () => moveCatalog(entry, fromSearch));
    li.append(button);
    return li;
  }


  function showProduct(entry) {
    const key = entry ? activeSection + entry.id : '';
    if (manualProduct.dataset.entry === key) return;
    coverRequest?.abort();
    if (manualProduct.dataset.objectUrl) {
      URL.revokeObjectURL(manualProduct.dataset.objectUrl);
      delete manualProduct.dataset.objectUrl;
    }
    manualProduct.dataset.entry = key;
    manualProduct.replaceChildren();
    manualProduct.hidden = !entry;
    if (!entry) return;

    const cover = cardArt(entry);
    manualProduct.append(cover);
    if (entry.source) {
      const source = document.createElement('a');
      source.href = entry.source;
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
      source.textContent = 'Product photo source ↗';
      manualProduct.append(source);
      return;
    }
    const candidate = entry.files.find(file => file.mime === 'application/pdf' || /^image\/(jpeg|png|webp|gif|bmp|avif)$/.test(file.mime));
    const caption = document.createElement('small');
    caption.textContent = entry.art ? 'Illustrative photo' : activeSection === 'Manuals' ? 'Product photo unavailable' : 'Document cover unavailable';
    manualProduct.append(caption);
    if (!candidate || entry.art) return;

    const controller = new AbortController();
    coverRequest = controller;
    thDriveRecords.cover(candidate, controller.signal).then(result => {
      if (!result || controller.signal.aborted) return;
      const img = new Image();
      img.alt = 'Cover from ' + candidate.displayName;
      const url = URL.createObjectURL(result.blob);
      manualProduct.dataset.objectUrl = url;
      img.src = url;
      cover.replaceChildren(img);
      caption.textContent = 'From your original document';
    }).catch(() => {});
  }

  function renderCatalog(catalog, words, append) {
    const title = get('library-results-title');
    const entry = catalog.nodes.get(catalogPath) || catalog.root;
    const searching = words.length && !catalogSearchGroup;
    manualBreadcrumb.replaceChildren();
    manualBreadcrumb.hidden = searching || !entry.id;
    showProduct(entry.files && !searching ? entry : null);
    if (!manualBreadcrumb.hidden) {
      const addCrumb = (label, action) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', action);
        manualBreadcrumb.append(button);
      };
      if (catalogSearchGroup) addCrumb('← Search results', () => moveCatalog(null));
      else {
        const trail = [];
        for (let current = entry.parent; current; current = current.parent) trail.unshift(current);
        for (const ancestor of trail) addCrumb(ancestor.title, () => moveCatalog(ancestor));
      }
    }
    let entries;
    if (searching) {
      entries = [...new Set(ranked.map(({file}) => catalog.byFile.get(file.id)).filter(Boolean))];
    } else {
      entries = entry.files || [...entry.children.values()].sort((a, b) => thLibraryCatalog.compare(a.title, b.title));
    }
    const fileLevel = Boolean(entry.files && !searching);
    results.classList.toggle('manual-card-grid', !fileLevel);
    title.textContent = searching ? (activeSection === 'Manuals' ? 'Matching products and groups' : 'Matching groups') : entry.id ? entry.title : 'Browse by category';
    const count = entry.count.toLocaleString() + (entry.count === 1 ? ' file' : ' files');
    status.textContent = searching ? (entries.length ? entries.length.toLocaleString() + ' matching groups' : 'No matching documents.') + (contentStatus ? ' ' + contentStatus : '') :
      count;
    if (!append) results.replaceChildren();
    const start = results.children.length;
    results.append(...entries.slice(start, visible).map(item => fileLevel ? fileCard(item, [], 0) : catalogCard(item, searching)));
    more.hidden = visible >= entries.length;
    if (append) results.children[start]?.querySelector('button')?.focus();
    drawMatchRail();
  }

  function render(append = false) {
    if (!loaded) return;
    const words = terms();
    const section = selectedSection();
    ranked = documents
      .filter(file => (!section || file.section === section) && (section || !category.value || file.topics.includes(category.value)))
      .map(file => ({file, rank: score(file, words)}))
      .filter(item => item.rank >= 0)
      .sort((a, b) => b.rank - a.rank || a.file.displayName.localeCompare(b.file.displayName, undefined, {numeric: true}));
    if (section) { renderCatalog(currentCatalog(), words, append); return; }
    results.classList.remove('manual-card-grid');
    manualBreadcrumb.hidden = true;
    showProduct(null);
    get('library-results-title').textContent = words.length ? 'Search results' : 'Browse documents';
    const shown = Math.min(ranked.length, visible);
    const count = ranked.length === 1 ? '1 document' : ranked.length.toLocaleString() + ' documents';
    const summary = ranked.length ? count + (shown < ranked.length ? ' · Showing ' + shown : '') : 'No matching documents.';
    status.textContent = summary + (contentStatus ? ' ' + contentStatus : '');
    const focused = results.contains(document.activeElement) ? document.activeElement.dataset.file : null;
    if (!append) results.replaceChildren();
    const start = results.children.length;
    results.append(...ranked.slice(start, shown).map(({file, rank}) => fileCard(file, words, rank)));
    drawMatchRail();
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
    if (!loaded || workspace.hidden || !words.length) return;
    const controller = new AbortController();
    contentSearch = controller;
    if (wait) timer = setTimeout(() => searchContent(words, controller), 500);
    else searchContent(words, controller);
  }

  query.addEventListener('input', () => {
    closePreview();
    catalogPath = '';
    catalogSearchGroup = false;
    search(true);
  });
  get('library-search').addEventListener('submit', event => {
    event.preventDefault();
    closePreview();
    catalogPath = '';
    catalogSearchGroup = false;
    search(false);
  });
  category.addEventListener('change', () => { closePreview(); visible = pageSize; render(); });
  const retry = () => loadLibrary().catch(() => {
    const message = 'Your Google session expired. Reload this page to sign in again.';
    status.textContent = message;
    get('library-home-status').textContent = message;
  });
  refresh.addEventListener('click', retry);
  get('library-home-retry').addEventListener('click', retry);
  more.addEventListener('click', () => { visible += pageSize; render(true); });
  showLocation();
  window.thStart = loadLibrary;
})();
