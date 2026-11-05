(() => {
'use strict';

const fileId = '1a9GMTWDqLLW_4uqxH1BeD3x3oM65LAO_';
const concepts = [
  ['Dues and late payments', /\b(dues|pay\w*|cost|price|late fee|deadline)\b/, /\b(dues|price|late fee)\b/],
  ['Guests and family', /\b(guests?|bring\w*|friend\w*|visitors?|spouses?|kids|family|children)\b/, /\b(guests?|spouses?|children|grandchildren)\b/],
  ['Stands and safety gear', /\b(stands?|climb\w*|saddles?|tree stand|harness\w*|elevated|fall)\b/, /\b(stands?|climbers?|harness\w*|saddle|elevated)\b/],
  ['Work parties and attendance', /\b(work part\w*|volunteer\w*|miss\w*|attendance|maintenance|meetings?|fines?)\b/, /\b(work part\w*|meeting\w*|fine|maintaining)\b/],
  ['Signing in and gate access', /\b(sign\w* in|check\w* in|check\w* out|sign\w* out|lock\w*|gate\w*|codes?|logbook)\b/, /\b(sign into|sign out|gate|logbook)\b/],
  ['Weapons and seasons', /\b(bow\w*|archery|shotguns?|rifles?|firearm\w*|muzzleload\w*|seasons?|dove)\b/, /\b(archery|firearm|rifle|shotgun|muzzleloader|dove|seasons?)\b/],
  ['Vehicles and trails', /\b(atvs?|utvs?|quads?|four wheel\w*|truck\w*|driv\w*|trails?)\b/, /\b(driv\w*|vehicles?|four wheel\w*|trails?)\b/],
  ['Alcohol, smoking and fires', /\b(beer|drinking|alcohol|smok\w*|cigarettes?|campfires?|fires?)\b/, /\b(alcohol|smoking|open fires)\b/],
  ['Club messages and photos', /\b(groupme|group chat|texting|messag\w*|pics?|pictures?|photos?)\b/, /\b(groupme|group chat|pictures?|photographs?)\b/],
  ['Membership and renewal', /\b(join\w*|renew\w*|membership|kick\w* out|expel\w*)\b/, /\b(membership|renew\w*|terminat\w*)\b/]
];

const normalize = value => value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const stop = new Set('a an the and or of to for at in on from with was were is are be being someone somebody person he she they their his her it this that i me my club what which how would could should rule section applies apply'.split(' '));

// BSSC governance ranking: exact phrase, 75% keyword coverage, then related concepts.
function match(section, query) {
  const q = normalize(query);
  if (!q) return { score: 0, topics: [], excerpt: '' };
  const content = normalize(section.title + ' ' + section.paragraphs.join(' '));
  const tokens = [...new Set(q.split(' ').filter(token => token.length > 2 && !stop.has(token)))];
  const words = new Set(content.split(' '));
  const count = tokens.filter(token => words.has(token)).length;
  const topics = concepts.filter(([, input, anchor]) => input.test(q) && anchor.test(content));
  const score = (content.includes(q) ? 100 : 0) +
    (tokens.length && count >= Math.ceil(tokens.length * .75) ? count * 5 : 0) + topics.length * 10;
  const excerpt = section.paragraphs.find(line => normalize(line).includes(q)) ||
    section.paragraphs.find(line => topics.some(([, , anchor]) => anchor.test(normalize(line)))) ||
    section.paragraphs.find(line => tokens.some(token => normalize(line).split(' ').includes(token))) || '';
  return { score, topics: topics.map(([label]) => label), excerpt: excerpt.slice(0, 350) };
}

function parseSections(text) {
  const headings = [...text.matchAll(/^\s*(MEMBERSHIPS|HUNTING|GUESTS|OTHER):\s*$/gmi)];
  if (headings.length !== 4) throw new Error('The digital reader could not identify the four sections in this PDF.');
  const intro = text.slice(0, headings[0].index).trim().replace(/^BACKWOODS HUNT CLUB\s+RULES AND REGULATIONS\s*/i, '');
  const sections = [{ title: 'Introduction', paragraphs: intro.split(/\n(?=SAFETY FIRST)/i).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean) }];
  headings.forEach((heading, index) => {
    const title = heading[1][0].toUpperCase() + heading[1].slice(1).toLowerCase();
    const body = text.slice(heading.index + heading[0].length, headings[index + 1]?.index).trim();
    const paragraphs = body.split(/\n(?=\s*(?:\d+\.|[AB]\.|BE SAFE,))/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
    sections.push({ title, paragraphs });
  });
  return sections;
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function renderReader(sections) {
  const input = document.getElementById('bylaws-search');
  const articles = document.getElementById('bylaws-articles');
  const nav = document.getElementById('bylaws-sections');
  const results = document.getElementById('bylaws-results');
  function draw() {
    const query = normalize(input.value);
    const matches = sections.map((section, index) => ({ section, index, ...match(section, query) }))
      .filter(result => !query || result.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
    nav.replaceChildren();
    articles.replaceChildren();
    results.hidden = !query;
    results.textContent = matches.length === 1 ? '1 matching section' :
      matches.length ? matches.length + ' matching sections' : 'No matching sections. Try another phrase or clear the search.';
    for (const { section, index, topics, excerpt } of matches) {
      const article = element('article', '', 'bylaws-article');
      article.id = 'bylaws-section-' + index;
      const jump = element('a', section.title);
      jump.href = '#' + article.id;
      jump.onclick = event => {
        event.preventDefault();
        article.scrollIntoView({ behavior: 'smooth', block: 'start' });
        article.focus({ preventScroll: true });
      };
      article.tabIndex = -1;
      nav.append(jump);
      article.append(element('h2', section.title));
      if (query) {
        const evidence = element('div', '', 'bylaws-evidence');
        evidence.append(element('strong', topics.length ? 'Related topics: ' + topics.join(', ') : 'Text match'));
        if (excerpt) evidence.append(element('p', excerpt));
        article.append(evidence);
      }
      article.append(...section.paragraphs.map(paragraph => element('p', paragraph)));
      articles.append(article);
    }
  }
  input.oninput = draw;
  draw();
}

let pdfUrl;
window.thStart = async () => {
  const status = document.getElementById('bylaws-status');
  const download = document.getElementById('bylaws-download');
  const layout = document.getElementById('bylaws-layout');
  layout.hidden = true;
  download.hidden = true;
  download.removeAttribute('href');
  if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  status.textContent = 'Loading the original bylaws…';
  try {
    const response = await thDriveFetch(fileId);
    if (!response.ok) throw new Error('Could not load the original PDF. Check that this Google account has access.');
    const blob = await response.blob();
    pdfUrl = URL.createObjectURL(blob);
    download.href = pdfUrl;
    download.hidden = false;

    const pdfjs = await import('./vendor/pdfjs/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.compat.mjs', location.href).href;
    const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
    try {
      const pdf = await task.promise;
      const pages = [];
      for (let number = 1; number <= pdf.numPages; number++) {
        const page = await pdf.getPage(number);
        const { items } = await page.getTextContent();
        pages.push(items.map(item => (item.str || '') + (item.hasEOL ? '\n' : '')).join(''));
      }
      renderReader(parseSections(pages.join('\n')));
      layout.hidden = false;
      status.textContent = '';
    } finally {
      await task.destroy();
    }
  } catch (error) {
    status.textContent = error.message || 'Could not open the bylaws.';
  }
};
})();
