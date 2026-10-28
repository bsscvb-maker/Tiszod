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
    link.innerHTML = '<span class="th-nav-icon" aria-hidden="true">✓</span>Plan Tracker';
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
  // Keep navigation order and icon spacing consistent on every page.
  if (nav) {
    const plan=nav.querySelector('[href="plan-tracker.html"]');
    if(plan)plan.innerHTML='<span class="th-nav-icon th-plan-icon" aria-hidden="true"><svg viewBox="0 0 32 32" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="30" height="30" rx="7" fill="#25477D"/><rect x="8" y="7" width="17" height="21" rx="3" fill="#142A49" stroke="#D5E8FF" stroke-width="1.5"/><rect x="12" y="4" width="9" height="6" rx="2" fill="#8CC9FF"/><path d="m11 16 2 2 4-4M19 16h3M11 23h11" stroke="#DAEEFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>Plan Tracker</span>';
    const bm=nav.querySelector('[href="black-mild.html"]');
    if(bm)bm.innerHTML='<span class="th-nav-icon th-bm-icon" aria-hidden="true">B&amp;M</span><span>Black &amp; Mild</span>';
    const groups=[
      ['Overview',['./','plan-tracker.html','interview.html']],
      ['Workspaces',['finance.html','pets.html','freebirds.html','black-mild.html']],
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
  let restoring=false,ready=false;
  function capture(){
    const s={scroll:scrollY};
    if(typeof finTab!=='undefined'){s.finance=finTab;s.financeFilter=finFilter;}
    if(window.thViewAdapter)s.workspace=window.thViewAdapter.capture();
    s.pet=document.querySelector('.pet-tabs [aria-selected="true"]')?.id;
    if(typeof currentItem!=='undefined')s.pair=document.getElementById('overlay')?.classList.contains('open')?currentItem?.row:null;
    if(typeof taskFilter!=='undefined')s.taskFilter=taskFilter;
    return s;
  }
  function restore(s){
    if(!s)return;restoring=true;
    try{
      if(s.finance&&typeof finTab!=='undefined'){finTab=s.finance;finFilter=s.financeFilter||'';finRender();}
      if(s.workspace&&window.thViewAdapter)window.thViewAdapter.restore(s.workspace);
      if(s.pet)document.getElementById(s.pet)?.click();
      if('pair'in s&&typeof currentItem!=='undefined'){const item=items.find(x=>x.row===s.pair);if(item)openItem(item,false);else document.getElementById('overlay')?.classList.remove('open');}
      if(s.taskFilter!==undefined)document.querySelector('[data-filter="'+CSS.escape(s.taskFilter)+'"]')?.click();
      scrollTo({top:s.scroll||0,behavior:'instant'});
    }finally{restoring=false;update();}
  }
  const current=()=>history.state?.thNav;
  function update(){controls.querySelector('[data-th-navigate="back"]').disabled=!(current()?.index>0);controls.querySelector('[data-th-navigate="forward"]').disabled=!(current()?.index<Number(sessionStorage.getItem(maxKey)||0));}
  function replace(view=capture()){history.replaceState({...history.state,thNav:{index:current()?.index||0,view}},'');}
  function record(before){const after=capture();const comparable=s=>JSON.stringify({...s,scroll:0});if(comparable(before)===comparable(after))return;replace(before);const index=(current()?.index||0)+1;history.pushState({...history.state,thNav:{index,view:after}},'');sessionStorage.setItem(maxKey,index);update();}
  function init(){const prior=current();if(prior){ready=true;restore(prior.view);}else{const index=Number(sessionStorage.getItem(key)||0);sessionStorage.removeItem(key);history.replaceState({...history.state,thNav:{index,view:capture()}},'');sessionStorage.setItem(maxKey,index);ready=true;}update();}
  controls.addEventListener('click',e=>{const action=e.target.closest('[data-th-navigate]')?.dataset.thNavigate;if(!action)return;if(action==='back'){const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);if(dialog){dialog.close();return;}history.back();}if(action==='forward')history.forward();if(action==='refresh'){replace();location.reload();}if(action==='home'&&!location.pathname.endsWith('/Tiszod/')){replace();sessionStorage.setItem(key,(current()?.index||0)+1);location.href='./';}});
  addEventListener('popstate',()=>restore(current()?.view));
  addEventListener('pageshow',()=>{if(ready)update();});
  document.addEventListener('click',e=>{
    if(!ready||restoring||e.target.closest('.th-browser-controls'))return;
    if(e.target.closest('#backReports,#backDashboard,#backCategory')&&current()?.index>0){e.preventDefault();e.stopImmediatePropagation();history.back();return;}
    const link=e.target.closest('a[href]');
    if(link&&!link.target&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){const url=new URL(link.href);if(url.origin===location.origin&&url.pathname.startsWith(new URL('./',location.href).pathname)&&!url.hash){replace();sessionStorage.setItem(key,(current()?.index||0)+1);}}
    const control=e.target.closest('[data-tab],[data-fin-open],[data-asset-tab],[data-category],[data-open-asset],[data-filter],.pet-tabs [role="tab"],.card[data-row],#openVehicles,#openReports,[data-report-link],#backReports,#backDashboard,#backCategory,#close');
    if(!control||control.closest('form,dialog'))return;
    const before=capture();queueMicrotask(()=>record(before));
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  const start=window.thStart;if(typeof start==='function')window.thStart=async(...args)=>{const result=await start(...args);if(window.thViewAdapter&&!current()?.view?.workspace)replace();else if(current()?.view)restore(current().view);return result;};
})();

/* Unified personal portal presentation. Moves existing elements; never copies club records. */
(() => {
 const nav=document.querySelector('.th-sidebar nav');
 if(nav){
  const links=new Map([...nav.querySelectorAll('a')].map(a=>[a.getAttribute('href'),a]));
  const order=[['Main',['./']],['Modules',['plan-tracker.html','interview.html','finance.html','pets.html','freebirds.html','black-mild.html','vehicles.html','equipment.html','watercraft.html']],['System',['admin.html']]];
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
 for(const path of ['plan-tracker.html','black-mild.html']){if(grid.querySelector('[href="'+path+'"]'))continue;const source=nav?.querySelector('[href="'+path+'"]');if(!source)continue;const a=document.createElement('a');a.href=path;a.className='workspace';const icon=source.querySelector('.th-nav-icon')?.cloneNode(true)||document.createElement('span');icon.className='workspace-icon';const body=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=path==='plan-tracker.html'?'Plan Tracker':'Black & Mild';small.textContent=path==='plan-tracker.html'?'Your tasks, priorities, and next steps':'Your Black & Mild records';body.append(strong,small);a.append(icon,body);grid.append(a)}
 const cards=[...grid.querySelectorAll('a.workspace')];cards.sort((a,b)=>modulePaths.indexOf(a.getAttribute('href'))-modulePaths.indexOf(b.getAttribute('href'))).forEach(a=>{a.classList.add('th-module-card');const icon=a.querySelector('.workspace-icon'),body=[...a.children].find(c=>c.querySelector('strong'));const art=document.createElement('span');art.className='th-module-art';if(icon)art.append(icon);if(body)body.classList.add('th-module-body');a.prepend(art);grid.append(a)});
 const title=document.createElement('div');title.className='th-module-heading';const label=document.createElement('h2');label.textContent='Modules';title.append(label);
 const stats=main.querySelector('.stats');if(stats)heading?.after(stats);stats?.after(title,grid);
 const lower=document.createElement('div');lower.className='th-lower-dashboard';const taskPanel=main.querySelector('[aria-label="Plan dashboard"]'),attention=main.querySelector('#attention');if(attention)lower.append(attention);if(taskPanel)lower.append(taskPanel);grid.after(lower);
 const old=main.querySelector('.dash-grid');if(old&&!old.children.length)old.remove();
})();
