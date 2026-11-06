/* Read text from the original PDF in the browser. Keep source-page images available for diagrams and scans. */
(() => {
  const create = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };

  function readLines(items) {
    const lines = [];
    let current = '';
    let y;
    function endLine() {
      if (current.trim()) lines.push(current.trim());
      current = '';
    }
    for (const item of items) {
      if (!('str' in item)) continue;
      const baseline = item.transform[5];
      if (current && Math.abs(baseline - y) > Math.max(2, item.height * .45)) endLine();
      current += current && item.str && !/\s$/.test(current) && !/^\s|^[,.;:!?%)]/.test(item.str) ? ' ' + item.str : item.str;
      y = baseline;
      if (item.hasEOL) endLine();
    }
    endLine();
    return lines;
  }

  function addText(article, lines) {
    let paragraph = [];
    function flush() {
      if (paragraph.length) article.append(create('p', paragraph.join(' ')));
      paragraph = [];
    }
    for (const line of lines) {
      const heading = line.length <= 72 && /[A-Z]{3}/.test(line) && line === line.toUpperCase() && /[A-Z]$/.test(line);
      const step = /^(?:[•●▪]|\d+[.)]\s)/.test(line);
      if (heading || step) {
        flush();
        article.append(create(heading ? 'h4' : 'p', line));
      } else {
        paragraph.push(line);
        if (/[.!?]$/.test(line) || paragraph.length >= 5) flush();
      }
    }
    flush();
  }

  function sourcePage(article, number, renderPage, signal, scan) {
    const source = create('details', '', 'manual-source-page');
    source.append(create('summary', scan ? 'Read scanned page' : 'View original page and diagrams'));
    source.addEventListener('toggle', async () => {
      if (!source.open || source.children.length > 1) return;
      const status = create('p', 'Loading source page…');
      source.append(status);
      try {
        const canvas = await renderPage(number);
        if (signal.aborted) return;
        canvas.className = 'legal-preview-image';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'Original page ' + number);
        status.replaceWith(canvas);
      } catch {
        if (!signal.aborted) status.textContent = 'The original page could not be displayed. Use Download to open the PDF.';
      }
    });
    article.append(source);
  }

  async function render(pdf, host, status, renderPage, signal) {
    const tools = create('div', '', 'manual-reader-tools');
    const label = create('label', 'Find in this manual');
    const input = create('input');
    input.type = 'search';
    input.placeholder = 'Try installation or troubleshooting';
    label.append(input);
    const summary = create('p');
    summary.setAttribute('role', 'status');
    tools.append(label, summary);
    const output = create('div', '', 'manual-reader-pages');
    const more = create('button', 'Show more pages');
    more.type = 'button';
    more.hidden = true;
    host.append(tools, output, more);
    const pages = [];
    let visible = 4;
    let complete = false;

    function draw(append = false) {
      if (signal.aborted) return;
      const query = input.value.toLowerCase().trim();
      const matches = pages.filter(page => !query || page.text.includes(query));
      const end = Math.min(matches.length, visible);
      if (!append) output.replaceChildren();
      for (const page of matches.slice(output.children.length, end)) {
        const article = create('article', '', 'manual-reader-page');
        article.append(create('h3', 'Page ' + page.number));
        if (page.lines.length) addText(article, page.lines);
        else article.append(create('p', 'This page has no extractable text. Open the original page below.'));
        sourcePage(article, page.number, renderPage, signal, !page.lines.length);
        output.append(article);
      }
      more.hidden = end >= matches.length;
      summary.textContent = query ? matches.length + ' matching pages' + (complete ? '' : ' so far') :
        (complete ? pdf.numPages + (pdf.numPages === 1 ? ' page' : ' pages') : 'Preparing text · ' + pages.length + ' of ' + pdf.numPages + ' pages');
      if (query && complete && !matches.length) summary.textContent = 'No matching text. Search covers pages with extractable text.';
    }

    input.addEventListener('input', () => { visible = 4; draw(); });
    more.addEventListener('click', () => {
      const previous = output.children.length;
      visible += 4;
      draw(true);
      const first = output.children[previous]?.querySelector('h3');
      if (first) { first.tabIndex = -1; first.focus(); }
    });
    status.textContent = 'Opening the manual in reading view…';
    for (let number = 1; number <= pdf.numPages; number++) {
      if (signal.aborted) return;
      let lines = [];
      try {
        const page = await pdf.getPage(number);
        lines = readLines((await page.getTextContent()).items);
      } catch {
        if (signal.aborted) return;
      }
      pages.push({number, lines, text: lines.join(' ').toLowerCase()});
      status.textContent = '';
      draw(true);
    }
    complete = true;
    draw(true);
  }

  window.thManualReader = {render};
})();
