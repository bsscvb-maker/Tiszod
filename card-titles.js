/* Keep card headings aligned while retaining their complete text. */
(() => {
 const titles = [
  '.legal-file:not(.medical-photo-card) > strong',
  '.legal-thumbnail-title',
  '.hobby-card > strong',
  '.legal-tile > strong',
  '.th-module-body > strong',
  '.record-caption > :is(h3,strong)',
  ':is(.education-card,.identity-card) > h3',
  '.school-card-label > h3',
  '.school-card-caption',
  '.task-card > h3',
  '.task-title-button > strong',
  '.focus-card > :is(h2,button)',
  '.library-card-body > strong',
  '.library-document > strong',
  '.fd-folder > strong',
  '.fd-file h3',
  '.category-card > strong',
  '.asset-card .card-copy > strong',
  '.card-body > h3',
  '.bk-year-card > strong',
  '.bk-document h3',
  '.tax-card-top > strong',
  '.info-card h3',
  '.medication-card h3',
  '.medical-regimen section > div > strong',
  '.document-copy > strong',
  '.tax-document-name',
  '.archive-item > strong'
 ].join(',\n');

 const style = document.createElement('style');
 style.textContent = titles + ' {min-inline-size:0;max-inline-size:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}'
  + '.legal-thumbnail-title,.medical-regimen section > div > strong,.document-copy > strong{display:block;}'
  + '.legal-thumbnail-label::after{flex-shrink:0;margin-inline-start:.35em;}'
  + '.medical-regimen section > div,.document-copy,.bk-file-info,.card-copy{min-inline-size:0;}';
 document.head.append(style);

 function addTitle(element) {
  if (!element.hasAttribute('title')) element.title = element.textContent.trim();
 }
 function decorate(root) {
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  if (root.matches(titles)) addTitle(root);
  root.querySelectorAll(titles).forEach(addTitle);
 }
 decorate(document.body);
 new MutationObserver(changes => {
  for (const change of changes) change.addedNodes.forEach(decorate);
 }).observe(document.body, {childList:true, subtree:true});
})();
