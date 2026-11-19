'use strict';

window.thCaseReference = (() => {
 const shortcuts = [
  [1, 'Assets and liabilities summary'], [3, 'Vehicles and other property'],
  [9, 'Property claimed as exempt'], [11, 'Secured creditors'],
  [15, 'Unsecured creditors'], [27, 'Leases and contracts'], [28, 'Codebtors'],
  [29, 'Income'], [31, 'Expenses'], [34, 'Statement of Financial Affairs'],
  [53, 'Chapter 13 Plan'], [64, 'Trustee Questionnaire']
 ];
 const normalize = text => text.replace(/\s+/g, ' ').trim();
 const dateLabel = stamp => stamp ? stamp.slice(0, 10) : 'Undated';

 function open(panel, versions, supporting, loadPdf, renderPage) {
  panel.innerHTML = `<section class="bk-reference bk-panel" aria-label="Case Reference">
   <header class="bk-panel-head"><div><h3>Search bankruptcy documents</h3><p class="bk-muted">Search the case packet and supporting PDFs in one place.</p></div>
   <label>Open a PDF <select data-ref-version></select></label></header>
   <div class="bk-reference-search"><label>Search inside all reference PDFs<input type="search" placeholder="Try 341 meeting, payment, or trustee" autocomplete="off" maxlength="160"></label>
   <p role="status" data-ref-status>Opening the private PDFs…</p></div>
   <div class="bk-reference-grid">
    <div><nav data-ref-shortcuts aria-label="Packet sections"></nav><ol data-ref-results></ol></div>
    <section class="bk-reference-reader" aria-label="PDF page">
     <div class="bk-reference-controls"><button type="button" data-ref-prev aria-label="Previous page" disabled>←</button>
     <label>Page <input type="number" min="1" value="1" data-ref-page disabled></label><span data-ref-count></span>
     <button type="button" data-ref-next aria-label="Next page" disabled>→</button>
     <button type="button" data-ref-copy disabled>Copy page link</button>
     <a data-ref-original target="_blank" rel="noopener noreferrer">Open original PDF ↗</a></div>
     <p data-ref-passage hidden></p><div data-ref-sheet></div>
    </section>
   </div></section>`;
  const root = panel.firstElementChild;
  const find = selector => root.querySelector(selector);
  const search = find('input[type=search]');
  const select = find('[data-ref-version]');
  const status = find('[data-ref-status]');
  const results = find('[data-ref-results]');
  const contents = find('[data-ref-shortcuts]');
  const pageInput = find('[data-ref-page]');
  const previous = find('[data-ref-prev]');
  const next = find('[data-ref-next]');
  const copy = find('[data-ref-copy]');
  const original = find('[data-ref-original]');
  const sheet = find('[data-ref-sheet]');
  const passage = find('[data-ref-passage]');
  const hash = new URLSearchParams(location.hash.slice(1));
  const documents = [...versions, ...supporting];
  const indexed = new Map();
  const failed = new Set();
  let pdf, pageNumber, current, generation = 0, pageRender = 0, indexing = false;

  function button(label, action) {
   const element = document.createElement('button');
   element.type = 'button';
   element.textContent = label;
   element.onclick = action;
   return element;
  }

  function excerpt(text, query, target) {
   const start = text.toLowerCase().indexOf(query);
   const first = Math.max(0, start - 70);
   const end = Math.min(text.length, start + query.length + 105);
   const mark = document.createElement('mark');
   mark.textContent = text.slice(start, start + query.length);
   target.replaceChildren((first ? '…' : '') + text.slice(first, start), mark,
    text.slice(start + query.length, end) + (end < text.length ? '…' : ''));
  }

  async function showPage(requested, match) {
   if (!pdf) return;
   const sequence = ++pageRender;
   pageNumber = Math.max(1, Math.min(pdf.numPages, Math.trunc(Number(requested)) || 1));
   pageInput.value = pageNumber;
   previous.disabled = pageNumber === 1;
   next.disabled = pageNumber === pdf.numPages;
   passage.hidden = !match;
   if (match) excerpt(match.text, match.query, passage);
   sheet.textContent = 'Loading page ' + pageNumber + '…';
   try {
    const canvas = await renderPage(pdf, pageNumber, Math.max(320, sheet.clientWidth));
    if (sequence !== pageRender || !root.isConnected) return;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Original PDF page ' + pageNumber);
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Read page text';
    const text = document.createElement('p');
    details.append(summary, text);
    sheet.replaceChildren(canvas, details);
    const pageText = indexed.get(current.id)?.[pageNumber - 1] ?? await readPageText(pdf, pageNumber);
    text.textContent = pageText || 'No extractable text on this page.';
   } catch {
    if (sequence === pageRender) sheet.textContent = 'Could not display this page. Use Open original PDF.';
   }
  }

  async function readPageText(source, number) {
   const page = await source.getPage(number);
   const content = await page.getTextContent();
   return normalize(content.items.map(item => item.str || '').join(' '));
  }

  function searchDocuments() {
   const query = normalize(search.value).toLowerCase();
   contents.hidden = Boolean(query);
   results.replaceChildren();
   if (!query) {
    status.textContent = `Search ${documents.length} PDFs by word or phrase.`;
    return;
   }

   let totalMatches = 0;
   let matchedFiles = 0;
   for (const doc of documents) {
    const matches = (indexed.get(doc.id) || []).flatMap((text, i) =>
     text.toLowerCase().includes(query) ? [{text, page:i + 1, query}] : []);
    if (!matches.length) continue;
    matchedFiles++;
    totalMatches += matches.length;
    for (const match of matches) {
     const item = document.createElement('li');
     const link = button(doc.title + ' · Page ' + match.page, async () => {
      if (current?.id === doc.id && pdf) await showPage(match.page, match);
      else await load(doc, match.page, match);
      if (matchMedia('(max-width: 850px)').matches) passage.scrollIntoView({block:'nearest'});
     });
     const text = document.createElement('p');
     excerpt(match.text, query, text);
     link.append(text);
     item.append(link);
     results.append(item);
    }
   }
   const completed = indexed.size + failed.size;
   const progress = completed < documents.length ? ` · Searching PDF ${completed + 1} of ${documents.length}…` : '';
   const unavailable = failed.size ? ` · ${failed.size} PDF${failed.size === 1 ? '' : 's'} could not be searched` : '';
   status.textContent = `${totalMatches} matching ${totalMatches === 1 ? 'page' : 'pages'} in ${matchedFiles} ${matchedFiles === 1 ? 'PDF' : 'PDFs'}` + progress + unavailable;
  }

  async function indexDocuments() {
   if (indexing) return;
   indexing = true;
   for (const doc of documents) {
    if (!root.isConnected) break;
    try {
     const source = await loadPdf(doc);
     const pages = [];
     for (let first = 1; first <= source.numPages; first += 6) {
      if (!root.isConnected) return;
      const batch = await Promise.all(Array.from({length: Math.min(6, source.numPages - first + 1)},
       (_, offset) => readPageText(source, first + offset)));
      pages.push(...batch);
     }
     indexed.set(doc.id, pages);
    } catch {
     failed.add(doc.id);
    }
    if (root.isConnected) searchDocuments();
   }
  }

  async function load(version, startPage, match) {
   const request = ++generation;
   ++pageRender;
   current = version;
   select.value = version.id;
   pdf = null;
   pageInput.disabled = previous.disabled = next.disabled = copy.disabled = true;
   contents.replaceChildren();
   sheet.textContent = 'Opening PDF…';
   passage.hidden = true;
   find('[data-ref-count]').textContent = '';
   original.href = version.link;
   try {
    const documentPdf = await loadPdf(version);
    if (request !== generation || !root.isConnected) return;
    pdf = documentPdf;
    if (version.related === 'case-reference:initial') {
     for (const [page, label] of shortcuts) {
      if (page <= pdf.numPages) contents.append(button(label + ' · ' + page, () => showPage(page)));
     }
    }
    find('[data-ref-count]').textContent = 'of ' + pdf.numPages;
    pageInput.max = pdf.numPages;
    pageInput.disabled = copy.disabled = false;
    await showPage(startPage, match);
   } catch {
    if (request === generation) sheet.textContent = 'Could not load this PDF. Check Google Drive access or open the original PDF.';
   }
  }

  if (!documents.length) {
   root.replaceChildren();
   const empty = document.createElement('p');
   empty.textContent = 'No Case Reference PDFs are linked for this case year.';
   root.append(empty);
   return;
  }
  for (const [label, files] of [['Case packet versions', versions], ['Supporting documents', supporting]]) {
   if (!files.length) continue;
   const group = document.createElement('optgroup');
   group.label = label;
   for (const doc of files) group.append(new Option(files === versions ? dateLabel(doc.created) + ' · ' + doc.title : doc.title, doc.id));
   select.append(group);
  }
  const bookmarked = documents.find(doc => doc.id === hash.get('packet'));
  select.onchange = () => load(documents.find(doc => doc.id === select.value), 1);
  search.oninput = () => {
   searchDocuments();
   if (normalize(search.value)) indexDocuments();
  };
  searchDocuments();
  pageInput.onchange = () => showPage(pageInput.value);
  previous.onclick = () => showPage(pageNumber - 1);
  next.onclick = () => showPage(pageNumber + 1);
  copy.onclick = async () => {
   const url = new URL(location.href);
   url.hash = new URLSearchParams({tab:'case-reference', year:current.year, packet:select.value, page:pageNumber});
   try {
    await navigator.clipboard.writeText(url.href);
    status.textContent = 'Page link copied.';
   } catch {
    status.textContent = 'Could not copy the page link.';
   }
  };
  const firstPage = Number.parseInt(hash.get('page'), 10) || 1;
  load(bookmarked || documents[0], firstPage);
 }
 return {open};
})();
