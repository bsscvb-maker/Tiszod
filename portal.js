/* Shared account controls and workbook connection state. */
(() => {
  const nav = document.querySelector('.th-sidebar nav');
  if (nav && !nav.querySelector('[href="black-mild.html"]')) {
    const link = document.createElement('a');
    const isCurrent = location.pathname.endsWith('/black-mild.html');
    link.className = 'th-nav-link' + (isCurrent ? ' active' : '');
    link.href = 'black-mild.html';
    if (isCurrent) link.setAttribute('aria-current', 'page');
    link.innerHTML = '<span class="th-nav-icon" style="font-family:Georgia,serif;color:#f0d18d">B&amp;M</span>Black &amp; Mild';
    const systemLabel = [...nav.querySelectorAll('.th-nav-label')].find(el => el.textContent.trim() === 'System');
    nav.insertBefore(link, systemLabel || null);
  }

  if (nav && !nav.querySelector('[href="plan-tracker.html"]')) {
    const link = document.createElement('a');
    const current = location.pathname.endsWith('/plan-tracker.html');
    link.className = 'th-nav-link' + (current ? ' active' : '');
    link.href = 'plan-tracker.html';
    if (current) link.setAttribute('aria-current', 'page');
    link.innerHTML = '<span class="th-nav-icon" aria-hidden="true">✓</span>Task Tracker';
    const system = [...nav.querySelectorAll('.th-nav-label')].find(el => el.textContent.trim() === 'System');
    const workspaceLabel=[...nav.querySelectorAll(".th-nav-label")].find(el=>el.textContent.trim()==="Workspaces");
    nav.insertBefore(link, workspaceLabel || system || null);
  }
  if(nav){const tracker=nav.querySelector('[href="plan-tracker.html"]');const label=[...nav.querySelectorAll(".th-nav-label")].find(el=>el.textContent.trim()==="Workspaces");if(tracker&&label)nav.insertBefore(tracker,label);}

  if(nav && !nav.querySelector('[href="interview.html"]')) {
    const link=document.createElement('a');link.href='interview.html';
    const active=location.pathname.endsWith('/interview.html');
    link.className='th-nav-link'+(active?' active':'');
    if(active)link.setAttribute('aria-current','page');
    link.innerHTML='<span class="th-nav-icon" aria-hidden="true">◉</span><span>Interview Prep</span>';
    nav.append(link);
  }
  if(nav&&!nav.querySelector('[href="bk.html"]')){const a=document.createElement('a');a.href='bk.html';const active=location.pathname.endsWith('/bk.html');a.className='th-nav-link'+(active?' active':'');if(active)a.setAttribute('aria-current','page');a.innerHTML='<span class="th-nav-icon"><img src="alliance-law-logo.svg" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:50%;background:white"></span><span>BK</span>';nav.append(a);}
  if(nav&&!nav.querySelector('[href="identification.html"]')){const a=document.createElement('a');a.href='identification.html';const active=location.pathname.endsWith('/identification.html');a.className='th-nav-link'+(active?' active':'');if(active)a.setAttribute('aria-current','page');a.innerHTML='<span class="th-nav-icon" aria-hidden="true">▣</span><span>Identification</span>';nav.append(a);}
  if(nav&&!nav.querySelector('[href="education.html"]')){const a=document.createElement('a');a.href='education.html';const active=location.pathname.endsWith('/education.html');a.className='th-nav-link'+(active?' active':'');if(active)a.setAttribute('aria-current','page');a.innerHTML='<span class="th-nav-icon" aria-hidden="true">▤</span><span>Education</span>';nav.append(a);}
  // Keep navigation order and icon spacing consistent on every page.
  if (nav) {
    const plan=nav.querySelector('[href="plan-tracker.html"]');
    if(plan)plan.innerHTML='<span class="th-nav-icon th-plan-icon" aria-hidden="true"><svg viewBox="0 0 32 32" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="30" height="30" rx="7" fill="#25477D"/><rect x="8" y="7" width="17" height="21" rx="3" fill="#142A49" stroke="#D5E8FF" stroke-width="1.5"/><rect x="12" y="4" width="9" height="6" rx="2" fill="#8CC9FF"/><path d="m11 16 2 2 4-4M19 16h3M11 23h11" stroke="#DAEEFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>Task Tracker</span>';
    const bm=nav.querySelector('[href="black-mild.html"]');
    if(bm)bm.innerHTML='<span class="th-nav-icon th-bm-icon" aria-hidden="true">B&amp;M</span><span>Black &amp; Mild</span>';
    const groups=[
      ['Overview',['./','plan-tracker.html','interview.html']],
      ['Workspaces',['bk.html','identification.html','education.html','finance.html','pets.html','freebirds.html','black-mild.html']],
      ['Vehicles & gear',['vehicles.html','equipment.html','watercraft.html']],
      ['System',['admin.html']]
    ];
    const known=new Set(groups.flatMap(g=>g[1]));
    const extras=[...nav.querySelectorAll('a')].filter(a=>!known.has(a.getAttribute('href')));
    const links=new Map([...nav.querySelectorAll('a')].map(a=>[a.getAttribute('href'),a]));
    nav.replaceChildren();
    groups.forEach(([label,paths])=>{
      const items=paths.map(path=>links.get(path)).filter(Boolean);
      if(!items.length)return;
      const heading=document.createElement('div');heading.className='th-nav-label';heading.textContent=label;nav.append(heading,...items);
    });
    nav.append(...extras);
    const style=document.createElement('style');
    style.textContent='.th-sidebar .th-nav-link{gap:14px;min-height:48px;margin-bottom:3px}.th-sidebar .th-nav-icon{flex:0 0 30px;width:30px;height:30px;overflow:hidden}.th-sidebar .th-bm-icon{font:700 10px/1 Georgia,serif;letter-spacing:-.3px;color:#f0d18d;white-space:nowrap}.th-sidebar .th-plan-icon{background:transparent}.th-sidebar nav{overflow-y:auto;min-height:0;padding-bottom:12px}.th-sidebar .th-nav-label{margin-top:22px}.th-sidebar .th-sidebar-foot{flex-shrink:0}@media(max-width:700px){.th-sidebar nav{overflow-x:auto;overflow-y:visible;padding-bottom:4px}.th-sidebar .th-nav-link{gap:8px;min-height:40px;margin-bottom:0}.th-sidebar .th-nav-icon{display:grid;flex-basis:24px;width:24px;height:24px}.th-sidebar .th-nav-icon svg{width:24px;height:24px}.th-sidebar .th-bm-icon{font-size:8px}}';
    document.head.append(style);
  }
  const header = document.querySelector('.th-app-topbar');
  const status = document.querySelector('#th-connection, #connectionStatus');
  if (header && status) {
    const account = document.createElement('div');
    account.className = 'th-account';
    account.innerHTML = '<span class="th-authorized">Authorized user</span><button type="button" class="th-sign-out" aria-label="Sign out of TisZod">Sign out</button><span class="th-account-mark" role="img" aria-label="TisZod logo"><img src="tiszod-crest.svg" alt=""></span>';
    status.replaceWith(account);
    account.prepend(status);
    account.querySelector('.th-sign-out').addEventListener('click', () => {
      if (typeof window.thSignOut === 'function') window.thSignOut();
      else if (typeof thSignOut === 'function') thSignOut();
    });
  }
  const start = window.thStart;
  if (typeof start !== 'function') return;
  window.thStart = async (...args) => {
    const result = await start(...args);
    const connection = document.querySelector('#th-connection, #connectionStatus');
    if (connection) {
      connection.textContent = 'Private workbook connected';
      connection.classList.add('connected');
    }
    return result;
  };
})();

/* Browser-style portal navigation. Only view state is restored; writes are never replayed. */
(() => {
  const main=document.querySelector('.th-app-main')||document.querySelector('.th-app > main');
  if(!main)return;
  let header=main.querySelector('.th-app-topbar');
  if(!header){header=document.createElement('header');header.className='th-app-topbar th-navigation-header';header.innerHTML='<div><strong>TisZod</strong><small>Personal workspace</small></div>';main.prepend(header);}
  const controls=document.createElement('nav');controls.className='th-browser-controls';controls.setAttribute('aria-label','Portal page navigation');
  const paths={back:'m14 6-6 6 6 6M8 12h12',forward:'m10 6 6 6-6 6M16 12H4',refresh:'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1',home:'m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10'};
  for(const [action,label] of [['back','Back one page'],['forward','Forward one page'],['refresh','Refresh this page'],['home','Portal Home']]){const b=document.createElement('button');b.type='button';b.dataset.thNavigate=action;b.title=label;b.setAttribute('aria-label',label);b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[action]+'"/></svg>';controls.append(b);}
  header.insertBefore(controls,header.children[1]||null);
  const style=document.createElement('style');style.textContent=`.th-browser-controls{display:flex;align-items:center;gap:5px;flex:none;margin:0 16px}.th-browser-controls button{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;min-width:36px;padding:7px;margin:0;border:1px solid #53677f;border-radius:8px;background:#172b45;color:#eef5ff;cursor:pointer}.th-browser-controls svg{width:20px;height:20px}.th-browser-controls button:hover:not(:disabled){background:#25477d;border-color:#8cc9ff}.th-browser-controls button:disabled{opacity:.32;cursor:default}.th-browser-controls button:focus-visible{outline:3px solid #8cc9ff;outline-offset:3px}.th-navigation-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid #35465a;margin-bottom:24px}.th-navigation-header strong,.th-navigation-header small{display:block}.th-navigation-header small{font-size:12px;color:#a9b8ca}@media(max-width:900px){.th-app-topbar{height:auto;min-height:76px;flex-wrap:wrap;gap:12px;padding-top:12px;padding-bottom:12px}.th-browser-controls{order:3;flex-basis:100%;margin:0}.th-account{margin-left:auto}}`;document.head.append(style);
  const key='th-navigation-next',maxKey='th-navigation-max';
  const portalHome=new URL('./',location.href).href;
  const viewControls=()=>[...document.querySelectorAll('input[type=search][id],select[id],.history-filters input[type=date][id]')].filter(e=>!e.closest('form,dialog,.th-module-search,#th-auth'));
  const controlValues=()=>Object.fromEntries(viewControls().map(e=>[e.id,e.value]));
  function setControls(values){for(const [id,value]of Object.entries(values||{})){const el=document.getElementById(id);if(el&&!el.closest('form,dialog'))el.value=value}}
  let restoring=false,ready=false,dataReady=false;
  function capture(){
    const s={scroll:scrollY,controls:controlValues()};
    if(typeof finTab!=='undefined'){s.finance=finTab;s.financeFilter=finFilter;}
    if(window.thViewAdapter)s.workspace=window.thViewAdapter.capture();
    if(window.thReaderAdapter)s.reader=window.thReaderAdapter.capture();
    try{const frame=document.querySelector('iframe[src*="tracker-tasks"]');if(frame?.contentWindow?.portalTaskNavigation)s.tasks=frame.contentWindow.portalTaskNavigation.capture()}catch{}
    s.pet=document.querySelector('.pet-tabs [aria-selected="true"]')?.id;
    if(typeof currentItem!=='undefined')s.pair=document.getElementById('overlay')?.classList.contains('open')?currentItem?.row:null;
    if(typeof taskFilter!=='undefined')s.taskFilter=taskFilter;
    return s;
  }
  function restore(s){
    if(!s)return;restoring=true;
    try{
      setControls(s.controls);
      if(s.finance&&typeof finTab!=='undefined'){finTab=s.finance;finFilter=s.financeFilter||'';finRender();}
      if(s.workspace&&window.thViewAdapter)window.thViewAdapter.restore(s.workspace);
      else if(s.controls){for(const el of viewControls()){if(Object.hasOwn(s.controls,el.id))el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}))}}
      setControls(s.controls);
      if(s.workspace&&window.thViewAdapter)window.thViewAdapter.restore(s.workspace);
      if(window.thReaderAdapter)window.thReaderAdapter.restore(s.reader);
      try{if(s.tasks)document.querySelector('iframe[src*="tracker-tasks"]')?.contentWindow?.portalTaskNavigation?.restore(s.tasks)}catch{}
      if(s.pet)document.getElementById(s.pet)?.click();
      if('pair'in s&&typeof currentItem!=='undefined'){const item=items.find(x=>x.row===s.pair);if(item)openItem(item,false);else document.getElementById('overlay')?.classList.remove('open');}
      if(s.taskFilter!==undefined)document.querySelector('[data-filter="'+CSS.escape(s.taskFilter)+'"]')?.click();
      scrollTo({top:s.scroll||0,behavior:'instant'});requestAnimationFrame(()=>scrollTo({top:s.scroll||0,behavior:'instant'}));
    }finally{restoring=false;update();}
  }
  const current=()=>history.state?.thNav;
  function update(){controls.querySelector('[data-th-navigate="back"]').disabled=window.navigation?!navigation.canGoBack:history.length<=1;controls.querySelector('[data-th-navigate="forward"]').disabled=window.navigation?!navigation.canGoForward:!(current()?.index<Number(sessionStorage.getItem(maxKey)||0));}
  function replace(view=capture()){history.replaceState({...history.state,thNav:{index:current()?.index||0,view}},'');}
  function record(before){const after=capture();const comparable=s=>JSON.stringify({...s,scroll:0});if(comparable(before)===comparable(after))return;replace(before);const index=(current()?.index||0)+1;history.pushState({...history.state,thNav:{index,view:after}},'');sessionStorage.setItem(maxKey,index);update();}
  function init(){const prior=current();if(prior){ready=true;if(dataReady||typeof window.thStart!=='function')restore(prior.view);}else{const index=Number(sessionStorage.getItem(key)||0);sessionStorage.removeItem(key);history.replaceState({...history.state,thNav:{index,view:capture()}},'');sessionStorage.setItem(maxKey,index);ready=true;}update();}
  controls.addEventListener('click',e=>{const action=e.target.closest('[data-th-navigate]')?.dataset.thNavigate;if(!action)return;if(action==='back')history.back();if(action==='forward')history.forward();if(action==='refresh'){replace();location.reload();}if(action==='home'){replace();sessionStorage.setItem(key,(current()?.index||0)+1);location.href=portalHome;}});
  addEventListener('popstate',()=>{clearTimeout(inputTimer);restore(current()?.view);});
  addEventListener('pagehide',()=>{if(ready&&!restoring)replace()});
  window.navigation?.addEventListener('currententrychange',update);
  let inputTimer;
  document.addEventListener('change',e=>{if(!ready||restoring||!viewControls().includes(e.target))return;const before=current()?.view;setTimeout(()=>{if(!restoring)record(before||capture())},0)},true);
  document.addEventListener('input',e=>{if(!ready||restoring||!viewControls().includes(e.target))return;clearTimeout(inputTimer);const before=current()?.view;inputTimer=setTimeout(()=>record(before||capture()),450)},true);
  addEventListener('pageshow',()=>{if(ready)update();});
  document.addEventListener('click',e=>{
    if(!ready||restoring||e.target.closest('.th-browser-controls'))return;
    if(e.target.closest('#identity-refresh,#education-refresh,#tax-refresh,#history-refresh'))replace();
    if(e.target.closest('#backReports,#backDashboard,#backCategory')&&current()?.index>0){e.preventDefault();e.stopImmediatePropagation();history.back();return;}
    const link=e.target.closest('a[href]');
    if(link&&!link.target&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){const url=new URL(link.href);if(url.origin===location.origin&&url.pathname.startsWith(new URL('./',location.href).pathname)&&!url.hash){replace();sessionStorage.setItem(key,(current()?.index||0)+1);}}
    if(e.target.closest('form,#th-auth,.th-module-search,.sidebar-order-open,.sidebar-drag-handle'))return;
    const before=capture();setTimeout(()=>{if(!restoring)record(before)},0);
  },true);
  // Embedded tracker sends view snapshots, never task mutations.
  let frameBefore=null;
  window.portalNavigation={before:(fromChange=false)=>{if(ready&&!restoring)frameBefore=fromChange?(current()?.view||capture()):capture()},after:()=>{if(!ready||restoring||!frameBefore)return;const before=frameBefore;frameBefore=null;record(before)}};
  function connectFrame(){const frame=document.querySelector('iframe[src*="tracker-tasks"]');if(!frame)return;frame.addEventListener('load',()=>{if(current()?.view?.tasks)restore(current().view);else if(ready)replace()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{init();connectFrame()},{once:true});else{init();connectFrame();}
  const start=window.thStart;if(typeof start==='function')window.thStart=async(...args)=>{const saved=dataReady?capture():current()?.view;const result=await start(...args);dataReady=true;ready=true;if(saved)restore(saved);replace();return result;};
})();

/* Unified personal portal presentation. Moves existing elements; never copies club records. */
(() => {
 const nav=document.querySelector('.th-sidebar nav');
 if(nav){
  const links=new Map([...nav.querySelectorAll('a')].map(a=>[a.getAttribute('href'),a]));
  const order=[['Main',['./']],['Modules',['plan-tracker.html','interview.html','bk.html','identification.html','education.html','finance.html','pets.html','freebirds.html','black-mild.html','vehicles.html','equipment.html','watercraft.html']],['System',['admin.html']]];
  const known=new Set(order.flatMap(g=>g[1]));const extras=[...links].filter(([href])=>!known.has(href)).map(([,a])=>a);
  nav.replaceChildren();for(const [name,paths]of order){const items=paths.map(p=>links.get(p)).filter(Boolean);if(!items.length)continue;const label=document.createElement('div');label.className='th-nav-label'+(name==='System'?' th-system-label':'');label.textContent=name;nav.append(label);if(name==='System')nav.append(...extras);nav.append(...items)}
 }
 const header=document.querySelector('.th-app-topbar');
 if(header&&nav){const search=document.createElement('div');search.className='th-module-search';const input=document.createElement('input');input.type='search';input.placeholder='Search modules…';input.setAttribute('aria-label','Search TisZod modules');const results=document.createElement('div');results.className='th-search-results';results.hidden=true;search.append(input,results);header.insertBefore(search,header.querySelector('.th-account')||null);input.oninput=()=>{results.replaceChildren();const q=input.value.trim().toLowerCase();if(!q){results.hidden=true;return}for(const a of nav.querySelectorAll('a'))if(a.textContent.toLowerCase().includes(q)){const link=document.createElement('a');link.href=a.getAttribute('href');link.textContent=a.textContent.trim();results.append(link)}if(!results.children.length){const p=document.createElement('p');p.textContent='No matching modules';results.append(p)}results.hidden=false};input.onkeydown=e=>{if(e.key==='Escape'){results.hidden=true;input.blur()}};document.addEventListener('click',e=>{if(!search.contains(e.target))results.hidden=true})}
 if(document.body.dataset.thPage!=='home')return;
 const main=document.querySelector('main.dashboard'),grid=main?.querySelector('.workspaces');if(!main||!grid)return;
 const heading=main.querySelector('.dash-heading');heading?.querySelector('h1')?.replaceChildren(document.createTextNode('Personal Command Center'));
 const h2=grid.querySelector('h2');if(h2)h2.textContent='Modules';
 grid.classList.add('th-module-grid');grid.setAttribute('aria-label','Personal modules');
 const modulePaths=['plan-tracker.html','interview.html','finance.html','pets.html','freebirds.html','black-mild.html','vehicles.html','equipment.html','watercraft.html','admin.html'];
 for(const path of ['plan-tracker.html','black-mild.html']){if(grid.querySelector('[href="'+path+'"]'))continue;const source=nav?.querySelector('[href="'+path+'"]');if(!source)continue;const a=document.createElement('a');a.href=path;a.className='workspace';const icon=source.querySelector('.th-nav-icon')?.cloneNode(true)||document.createElement('span');icon.className='workspace-icon';const body=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=path==='plan-tracker.html'?'Task Tracker':'Black & Mild';small.textContent=path==='plan-tracker.html'?'Your tasks, priorities, and next steps':'Your Black & Mild records';body.append(strong,small);a.append(icon,body);grid.append(a)}
 const cards=[...grid.querySelectorAll('a.workspace')];cards.sort((a,b)=>modulePaths.indexOf(a.getAttribute('href'))-modulePaths.indexOf(b.getAttribute('href'))).forEach(a=>{a.classList.add('th-module-card');const icon=a.querySelector('.workspace-icon'),body=[...a.children].find(c=>c.querySelector('strong'));const art=document.createElement('span');art.className='th-module-art';if(icon)art.append(icon);if(body)body.classList.add('th-module-body');a.prepend(art);grid.append(a)});
 const title=document.createElement('div');title.className='th-module-heading';const label=document.createElement('h2');label.textContent='Modules';title.append(label);
 const stats=main.querySelector('.stats');if(stats)heading?.after(stats);stats?.after(title,grid);
 const lower=document.createElement('div');lower.className='th-lower-dashboard';const taskPanel=main.querySelector('[aria-label="Plan dashboard"]'),attention=main.querySelector('#attention');if(attention)lower.append(attention);if(taskPanel)lower.append(taskPanel);grid.after(lower);
 const old=main.querySelector('.dash-grid');if(old&&!old.children.length)old.remove();
})();

;(() => {
function init(){
const side=document.querySelector('#sidebar,.th-sidebar');if(!side)return;
const bssc=side.id==='sidebar',labels=[...side.querySelectorAll(bssc?'.nav-label':'.th-nav-label')],items=[...side.querySelectorAll(bssc?'button[data-module]':'a.th-nav-link')];if(!labels.length||!items.length)return;
const key='sidebar-order-v1:'+(bssc?'bssc':'tiszod'),id=e=>bssc?e.dataset.module:e.getAttribute('href'),map=new Map(items.map(e=>[id(e),e]));
const groups=labels.map((label,index)=>({label,index,host:bssc?label.nextElementSibling:label.parentElement}));
const defaults=items.map(el=>{let group=0;for(const g of groups)if(g.label.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)group=g.index;return{id:id(el),group}});
function normalize(rows){const seen=new Set();return [...(Array.isArray(rows)?rows:[]),...defaults].filter(r=>r&&map.has(r.id)&&!seen.has(r.id)&&seen.add(r.id)).map(r=>({id:r.id,group:Number.isInteger(r.group)&&groups[r.group]?r.group:0}))}
function apply(){for(const g of groups){const entries=rows.filter(r=>r.group===g.index).map(r=>map.get(r.id));if(bssc)g.host.append(...entries);else{let anchor=g.label;for(const el of entries){anchor.after(el);anchor=el}}}const setup=side.querySelector('.sidebar-order-open');if(setup&&!bssc){const admin=side.querySelector('[href="admin.html"]');if(admin)admin.after(setup)}}
let rows=defaults,editing=false,dragged=null;try{rows=normalize(JSON.parse(localStorage.getItem(key)))}catch{}apply();
const style=document.createElement('style');style.textContent='.sidebar-order-open{font:600 11px system-ui!important;margin-left:6px;padding:3px 6px!important;min-height:26px!important;background:#1e293b!important;color:#fff!important;border:1px solid #64748b!important;border-radius:5px;letter-spacing:normal;text-transform:none}.sidebar-drag-handle{display:none;flex:0 0 18px!important;width:18px!important;margin-left:auto;cursor:grab;color:#cbd5e1;font:20px/1 system-ui;touch-action:none}.sidebar-arranging .sidebar-drag-handle{display:inline-flex;align-items:center;justify-content:center}.sidebar-arranging [data-sidebar-item]{outline:1px dashed #64748b;outline-offset:-2px}.sidebar-arranging .sidebar-drop-target{outline:2px solid #67e8d9!important}.sidebar-drag-handle:focus-visible{outline:2px solid #67e8d9}.sidebar-order-status{display:block;color:#fca5a5;font-size:11px}';document.head.append(style);
const toggle=document.createElement('button');toggle.type='button';toggle.className='sidebar-order-open';toggle.textContent=bssc?'Edit order':'⚙';toggle.setAttribute('aria-label','Reorder sidebar items');toggle.setAttribute('aria-pressed','false');if(bssc)labels[0].append(toggle);else{const admin=side.querySelector('[href="admin.html"]');if(admin)admin.after(toggle);else side.append(toggle);toggle.title='Sidebar setup';toggle.setAttribute('aria-label','Sidebar setup: reorder modules');toggle.style.cssText='display:block;width:42px;height:38px;margin:10px 0 8px 16px;font-size:22px!important'}
const status=document.createElement('span');status.className='sidebar-order-status';status.setAttribute('role','status');toggle.after(status);
function save(next){try{localStorage.setItem(key,JSON.stringify(next));rows=next;apply();status.textContent=''}catch{status.textContent='Order could not be saved.'}}
function move(source,target,after){if(source===target)return;const from=rows.find(r=>r.id===source),to=rows.find(r=>r.id===target);if(!from||!to)return;const next=rows.filter(r=>r.id!==source).map(r=>({...r})),at=next.findIndex(r=>r.id===target);next.splice(at+(after?1:0),0,{id:source,group:to.group});save(next)}
toggle.onclick=()=>{editing=!editing;side.classList.toggle('sidebar-arranging',editing);toggle.textContent=bssc?(editing?'Done':'Edit order'):(editing?'✓':'⚙');toggle.setAttribute('aria-pressed',String(editing));toggle.title=editing?'Done arranging modules — changes save automatically':'Sidebar setup: reorder modules'};
side.addEventListener('click',e=>{if(editing&&e.target.closest('[data-sidebar-item]')){e.preventDefault();e.stopImmediatePropagation()}},true);
for(const el of items){el.dataset.sidebarItem=id(el);const handle=document.createElement('span');handle.className='sidebar-drag-handle';handle.textContent='⠿';handle.draggable=true;handle.tabIndex=0;handle.setAttribute('role','button');handle.setAttribute('aria-label','Drag to reorder '+el.textContent.trim());handle.title='Drag to reorder; use arrow keys to move';el.append(handle);
handle.addEventListener('dragstart',e=>{if(!editing){e.preventDefault();return}dragged=id(el);e.dataTransfer.setData('text/plain',dragged);e.dataTransfer.effectAllowed='move';e.stopPropagation()});
handle.addEventListener('dragend',()=>{dragged=null;side.querySelectorAll('.sidebar-drop-target').forEach(x=>x.classList.remove('sidebar-drop-target'))});
handle.addEventListener('keydown',e=>{if(!editing||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const at=rows.findIndex(r=>r.id===id(el)),target=rows[at+(e.key==='ArrowUp'?-1:1)];if(target){move(id(el),target.id,e.key==='ArrowDown');handle.focus()}});
el.addEventListener('dragover',e=>{if(editing&&dragged){e.preventDefault();el.classList.add('sidebar-drop-target')}});
el.addEventListener('dragleave',()=>el.classList.remove('sidebar-drop-target'));
el.addEventListener('drop',e=>{if(!editing||!dragged)return;e.preventDefault();e.stopPropagation();const after=e.clientY>el.getBoundingClientRect().top+el.getBoundingClientRect().height/2;move(dragged,id(el),after);el.classList.remove('sidebar-drop-target');dragged=null});
}
for(const g of groups){g.label.addEventListener('dragover',e=>{if(editing&&dragged)e.preventDefault()});g.label.addEventListener('drop',e=>{if(!editing||!dragged)return;e.preventDefault();const next=rows.filter(r=>r.id!==dragged).map(r=>({...r}));const at=next.findIndex(r=>r.group>g.index);next.splice(at<0?next.length:at,0,{id:dragged,group:g.index});save(next);dragged=null})}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
/* Header Home replaces the redundant sidebar Home. Keep group indices stable. */
(()=>{const nav=document.querySelector('.th-sidebar nav');if(!nav)return;nav.querySelector('a[href="./"]')?.remove();for(const label of nav.querySelectorAll('.th-nav-label'))if(label.textContent.trim()==='Main')label.hidden=true;})();
