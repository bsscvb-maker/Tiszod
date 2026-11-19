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

 function open(panel, versions, loadPdf, renderPage) {
  panel.innerHTML = `<section class="bk-reference bk-panel" aria-label="Case Reference">
   <header class="bk-panel-head"><div><h3>Bankruptcy case packet</h3><p class="bk-muted">Search the schedules, Chapter 13 plan, and trustee questionnaire.</p></div>
   <label>Packet version <select data-ref-version></select></label></header>
   <div class="bk-reference-search"><label>Search this packet<input type="search" placeholder="Creditor, vehicle, amount, or phrase" autocomplete="off" maxlength="160" disabled></label>
   <p role="status" data-ref-status>Opening the private case packet…</p></div>
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
  let pdf, pageNumber, index, sections, generation = 0, pageRender = 0;

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
    text.textContent = index[pageNumber - 1] || 'Page text is indexing…';
    details.append(summary, text);
    sheet.replaceChildren(canvas, details);
   } catch {
    if (sequence === pageRender) sheet.textContent = 'Could not display this page. Use Open original PDF.';
   }
  }

  function searchPacket() {
   const query = normalize(search.value).toLowerCase();
   results.replaceChildren();
   contents.hidden = Boolean(query);
   const matches = query ? index.map((text, i) => ({text, page: i + 1, query}))
    .filter(match => match.text.toLowerCase().includes(query)) : [];
   const indexed = index.filter(text => typeof text === 'string').length;
   const progress = indexed < pdf.numPages ? ` · Indexing ${indexed} of ${pdf.numPages} pages` : '';
   status.textContent = (query ? `${matches.length} matching ${matches.length === 1 ? 'page' : 'pages'}` :
    `${pdf.numPages} PDF pages`) + progress;
   for (const match of matches) {
    const item = document.createElement('li');
    const section = sections.filter(([number]) => number <= match.page).pop()?.[1];
    const link = button((section ? section + ' · ' : '') + 'Page ' + match.page, () => {
     showPage(match.page, match);
     if (matchMedia('(max-width: 850px)').matches) passage.scrollIntoView({block:'nearest'});
    });
    const text = document.createElement('p');
    excerpt(match.text, query, text);
    link.append(text);
    item.append(link);
    results.append(item);
   }
  }

  async function load(version, startPage) {
   const request = ++generation;
   ++pageRender;
   pdf = null;
   index = [];
   search.disabled = pageInput.disabled = previous.disabled = next.disabled = copy.disabled = true;
   contents.replaceChildren();
   results.replaceChildren();
   sheet.replaceChildren();
   passage.hidden = true;
   find('[data-ref-count]').textContent = '';
   original.href = version.link;
   status.textContent = 'Opening the private case packet…';
   try {
    const documentPdf = await loadPdf(version);
    if (request !== generation || !root.isConnected) return;
    pdf = documentPdf;
    sections = version.related === 'case-reference:initial' ? shortcuts : [];
    for (const [page, label] of sections) {
     if (page <= pdf.numPages) contents.append(button(label + ' · ' + page, () => showPage(page)));
    }
    find('[data-ref-count]').textContent = 'of ' + pdf.numPages;
    pageInput.max = pdf.numPages;
    search.disabled = pageInput.disabled = copy.disabled = false;
    showPage(startPage);
    searchPacket();
    for (let first = 1; first <= pdf.numPages && root.isConnected && request === generation; first += 6) {
     await Promise.all(Array.from({length: Math.min(6, pdf.numPages - first + 1)}, async (_, offset) => {
      const page = await documentPdf.getPage(first + offset);
      const content = await page.getTextContent();
      if (request === generation) index[first + offset - 1] = normalize(content.items.map(item => item.str || '').join(' '));
     }));
     if (request === generation && root.isConnected) searchPacket();
    }
    const currentText = sheet.querySelector('details p');
    if (request === generation && currentText) currentText.textContent = index[pageNumber - 1] || 'No extractable text on this page.';
   } catch {
    if (request === generation) status.textContent = 'Could not finish loading the packet. Check Google Drive access or open the original PDF.';
   }
  }

  if (!versions.length) {
   root.replaceChildren();
   const empty = document.createElement('p');
   empty.textContent = 'No Case Reference packet is linked for this case year.';
   root.append(empty);
   return;
  }
  for (const version of versions) select.add(new Option(dateLabel(version.created) + ' · ' + version.title, version.id));
  const bookmarked = versions.find(version => version.id === hash.get('packet'));
  select.value = (bookmarked || versions[0]).id;
  select.onchange = () => load(versions.find(version => version.id === select.value), 1);
  search.oninput = searchPacket;
  pageInput.onchange = () => showPage(pageInput.value);
  previous.onclick = () => showPage(pageNumber - 1);
  next.onclick = () => showPage(pageNumber + 1);
  copy.onclick = async () => {
   const url = new URL(location.href);
   url.hash = new URLSearchParams({tab:'case-reference', year:versions[0].year, packet:select.value, page:pageNumber});
   try {
    await navigator.clipboard.writeText(url.href);
    status.textContent = 'Page link copied.';
   } catch {
    status.textContent = 'Could not copy the page link.';
   }
  };
  const firstPage = Number.parseInt(hash.get('page'), 10) || 1;
  load(bookmarked || versions[0], firstPage);
 }
 return {open};
})();
