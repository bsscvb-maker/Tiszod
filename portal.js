function portalNavBadge(color,glyph){return `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" focusable="false" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="30" height="30" rx="7" fill="${color}" stroke="#fff" stroke-width="1.5"/><g stroke="#fff" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`;}
/* Shared activity indicator: counts overlapping loads and saves, including failures. */
(()=>{
 const active=new Map();let sequence=0,settle=null,shownAt=0;
 // Match the login spinner: rotate only the gear around the artwork's actual hub.
 const brandLogo=document.querySelector('.th-sidebar .th-brand-mark img');
 if(brandLogo&&/(?:^|\/)tiszod-crest\.svg(?:[?#]|$)/.test(brandLogo.getAttribute('src')||'')){
  const ns='http://www.w3.org/2000/svg',source=brandLogo.getAttribute('src');
  const node=(tag,attributes={})=>{const el=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attributes))el.setAttribute(key,value);return el};
  const svg=node('svg',{viewBox:'0 0 551 560',class:'th-brand-logo-layered','aria-hidden':'true',focusable:'false'});
  const defs=node('defs'),outer=node('clipPath',{id:'th-brand-gear-clip',clipPathUnits:'userSpaceOnUse'});
  outer.append(node('path',{d:'M0 0H551V560H0Z M473 272A185 185 0 1 0 103 272A185 185 0 1 0 473 272Z','clip-rule':'evenodd','fill-rule':'evenodd'}));
  const clip=node('clipPath',{id:'th-brand-center-clip',clipPathUnits:'userSpaceOnUse'});clip.append(node('circle',{cx:'288',cy:'272',r:'186'}));defs.append(outer,clip);
  svg.append(defs,node('image',{href:source,width:'551',height:'560',class:'th-brand-gear','clip-path':'url(#th-brand-gear-clip)'}),node('image',{href:source,width:'551',height:'560','clip-path':'url(#th-brand-center-clip)'}));
  brandLogo.classList.add('th-brand-logo-original');brandLogo.after(svg);
 }
 const style=document.createElement('style');style.textContent=`.th-sidebar .th-brand-mark{position:relative;overflow:visible!important;animation:none!important;transform:none!important}.th-sidebar .th-brand-logo-original{display:block;width:100%;height:100%;object-fit:contain}.th-sidebar .th-brand-logo-layered{position:absolute;inset:0;display:none;width:100%;height:100%;overflow:visible}html.th-page-working .th-sidebar .th-brand-logo-original{visibility:hidden}html.th-page-working .th-sidebar .th-brand-logo-layered{display:block}html.th-page-working .th-sidebar .th-brand-gear{transform-box:view-box;transform-origin:52.26860254% 48.57142857%;animation:th-brand-gear-spin 1.8s linear infinite!important;will-change:transform}html.th-page-working .th-sidebar .th-brand-mark{filter:drop-shadow(0 0 6px #73baff90)}.th-activity-announcement{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}@keyframes th-brand-gear-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){html.th-page-working .th-sidebar .th-brand-gear{animation-duration:3.6s!important}}`;document.head.append(style);
 const announcement=document.createElement('span');announcement.className='th-activity-announcement';announcement.setAttribute('role','status');announcement.setAttribute('aria-live','polite');document.body.append(announcement);
 function update(){const working=active.size>0;document.documentElement.classList.toggle('th-page-working',working);const brand=document.querySelector('.th-sidebar .th-brand-mark');if(brand){brand.title=working?'Working…':'TisZod';brand.setAttribute('aria-label',working?'TisZod — working':'TisZod')}const area=document.querySelector('.th-app-main');if(area)area.setAttribute('aria-busy',String(working));const badge=document.querySelector('#th-connection,#connectionStatus');const label=working?([...active.values()].includes('Saving')?'Saving…':'Loading…'):'Page ready';if(badge){if(working){if(!badge.dataset.idleTitle)badge.dataset.idleTitle=badge.getAttribute('title')||'';badge.title=label;badge.setAttribute('aria-label',label+' '+badge.textContent);}else{badge.title=badge.dataset.idleTitle||'';delete badge.dataset.idleTitle;badge.removeAttribute('aria-label')}}if(announcement.textContent!==label)announcement.textContent=label;}
 function begin(label='Loading'){clearTimeout(settle);if(!document.documentElement.classList.contains('th-page-working'))shownAt=Date.now();const id=++sequence;active.set(id,label);update();let ended=false;return()=>{if(ended)return;ended=true;active.delete(id);if(active.size)update();else settle=setTimeout(update,Math.max(220,1100-(Date.now()-shownAt)))}}
 document.addEventListener('click',event=>{const control=event.target.closest('button,a[href]');if(!control||control.closest('#th-auth')||control.matches('.th-sign-out,[data-copy],[data-copy-user],[data-reveal],#account-toggle'))return;const done=begin();requestAnimationFrame(()=>requestAnimationFrame(done));},true);
 document.addEventListener('change',event=>{if(!event.target.matches('select')||event.target.closest('form,dialog,#th-auth'))return;const done=begin();requestAnimationFrame(()=>requestAnimationFrame(done));},true);
 window.thActivity={begin};
 const pageDone=begin();if(document.readyState==='complete')pageDone();else window.addEventListener('load',pageDone,{once:true});
 const originalFetch=window.fetch;window.fetch=async function(input,options){const method=String(options?.method||input?.method||'GET').toUpperCase(),done=begin(['GET','HEAD'].includes(method)?'Loading':'Saving');try{return await originalFetch.call(this,input,options)}finally{done()}};
 const start=window.thStart;if(typeof start==='function')window.thStart=async function(...args){const done=begin();try{return await start.apply(this,args)}finally{done()}};
})();

/* Shared account controls and workbook connection state. */
(() => {
  const nav = document.querySelector('.th-sidebar nav');
  const recreationChildren=['black-mild.html','freebirds.html'];
  if(nav)for(const link of nav.querySelectorAll('a[href]')){
    if(recreationChildren.includes(link.getAttribute('href')))link.remove();
  }
  if (nav && !nav.querySelector('[href="hobbies.html"]')) {
    const link = document.createElement('a');
    const current = location.pathname.endsWith('/hobbies.html');
    link.className = 'th-nav-link' + (current ? ' active' : '');
    link.href = 'hobbies.html';
    if (current) link.setAttribute('aria-current', 'page');
    link.innerHTML = '<span class="th-nav-icon" aria-hidden="true"></span><span>Recreation</span>';
    nav.append(link);
  }
  const recreation=nav?.querySelector('[href="hobbies.html"]');
  if(recreation&&recreationChildren.includes(location.pathname.split('/').pop())){
    recreation.classList.add('active');
    recreation.setAttribute('aria-current','location');
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

  if (nav && !nav.querySelector('[href="medical.html"]')) {
    const link = document.createElement('a');
    const current = location.pathname.endsWith('/medical.html');
    link.href = 'medical.html';
    link.className = 'th-nav-link' + (current ? ' active' : '');
    if (current) link.setAttribute('aria-current', 'page');
    link.innerHTML = '<span class="th-nav-icon" aria-hidden="true"><img src="medical-mark.svg" alt="" style="width:100%;height:100%;object-fit:contain"></span><span>Medical</span>';
    nav.append(link);
  }
  nav?.querySelectorAll('[href="interview.html"]').forEach(link=>link.remove());
  nav?.querySelectorAll('[href="bk.html"]').forEach(link=>link.remove());
  if(nav&&!nav.querySelector('[href="identification.html"]')){const a=document.createElement('a');a.href='identification.html';const active=location.pathname.endsWith('/identification.html');a.className='th-nav-link'+(active?' active':'');if(active)a.setAttribute('aria-current','page');a.innerHTML='<span class="th-nav-icon" aria-hidden="true">▣</span><span>Identification</span>';nav.append(a);}
  if(nav&&!nav.querySelector('[href="legal.html"]')){const a=document.createElement('a');a.href='legal.html';const active=/\/(legal|bk)\.html$/.test(location.pathname);a.className='th-nav-link'+(active?' active':'');if(active)a.setAttribute('aria-current','page');a.innerHTML='<span class="th-nav-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v17m-5 1h10M4 6h16M5 6l-3 7h6L5 6zm14 0-3 7h6l-3-7zM2 13a3 3 0 0 0 6 0m8 0a3 3 0 0 0 6 0"/></svg></span><span>Legal</span>';nav.append(a);}
  if(nav&&!nav.querySelector('[href="family.html"]')){
    const link=document.createElement('a');
    link.href='family.html';link.className='th-nav-link';
    if(document.body.dataset.thPage==='family'){link.classList.add('active');link.setAttribute('aria-current','page');}
    link.innerHTML='<span class="th-nav-icon" aria-hidden="true"></span><span>Family</span>';
    nav.append(link);
  }
  if(nav&&!nav.querySelector('[href="education.html"]')){const a=document.createElement('a');a.href='education.html';const active=location.pathname.endsWith('/education.html')&&document.body.dataset.thPage==='education';a.className='th-nav-link'+(active?' active':'');if(active)a.setAttribute('aria-current','page');a.innerHTML='<span class="th-nav-icon" aria-hidden="true">▤</span><span>Education</span>';nav.append(a);}
  if(nav&&!nav.querySelector('[href="accounts.html"]')){const a=document.createElement('a');a.href='accounts.html';const active=location.pathname.endsWith('/accounts.html');a.className='th-nav-link'+(active?' active':'');if(active)a.setAttribute('aria-current','page');a.innerHTML='<span class="th-nav-icon" aria-hidden="true">🔑</span><span>Accounts</span>';nav.append(a);}
  if (nav && !nav.querySelector('[href="career.html"]')) {
    const link = document.createElement('a');
    const current = document.body.dataset.thPage === 'career';
    link.className = 'th-nav-link' + (current ? ' active' : '');
    link.href = 'career.html';
    if (current) link.setAttribute('aria-current', 'page');
    link.innerHTML = '<span class="th-nav-icon" aria-hidden="true">▣</span><span>Career</span>';
    nav.append(link);
  }
  if (nav && !nav.querySelector('[href="home-library.html"]')) {
    const link = document.createElement('a');
    const current = document.body.dataset.thPage === 'home-library';
    link.href = 'home-library.html';
    link.className = 'th-nav-link' + (current ? ' active' : '');
    if (current) link.setAttribute('aria-current', 'page');
    link.innerHTML = '<span class="th-nav-icon" aria-hidden="true"></span><span>Library</span>';
    nav.append(link);
  }
  // Keep navigation order and icon spacing consistent on every page.
  if (nav) {
    const badges = [
      ['accounts.html', '#74592e', '<circle cx="11.5" cy="12" r="4.5"/><path d="m15 15.5 9 9m-3-3 3-3m-6 0 2.5-2.5"/>'],
      ['admin.html', '#465579', '<path d="M8 9h16M8 16h16M8 23h16"/><circle cx="13" cy="9" r="2.4" fill="#465579"/><circle cx="20" cy="16" r="2.4" fill="#465579"/><circle cx="12" cy="23" r="2.4" fill="#465579"/>'],
      ['career.html', '#635038', '<rect x="6" y="11" width="20" height="13" rx="2"/><path d="M12 11V8h8v3M6 16h20m-10 0v3"/>'],
      ['home-library.html', '#28606e', '<path d="M6 10h7l2 3h11v11H6zM10 17h12m-12 3h8"/>'],
      ['family.html', '#575080', '<circle cx="11.5" cy="11.5" r="3"/><circle cx="21" cy="13" r="2.5"/><path d="M5.5 23v-2a6 6 0 0 1 12 0v2h-12Zm14.5-5.5a5 5 0 0 1 6.5 4.7V23H21"/>'],
      ['education.html', '#234983', '<path d="m6 13 10-5 10 5-10 5-10-5Zm4 2v6q6 5 12 0v-6m4-2v8"/>'],
      ['identification.html', '#17636b', '<rect x="6.5" y="9" width="19" height="14" rx="2.5"/><circle cx="12.5" cy="14" r="2"/><path d="M9.5 20q3-4 6 0m3-6h4m-4 4h4"/>'],
      ['legal.html', '#654574', '<path d="M16 7v17m-5 0h10M8 11h16M9 11l-3 7h6l-3-7Zm14 0-3 7h6l-3-7ZM6 18a3 3 0 0 0 6 0m8 0a3 3 0 0 0 6 0"/>'],
      ['pets.html', '#873f4c', '<g fill="#fff" stroke="none"><ellipse cx="9" cy="14" rx="2.1" ry="2.8" transform="rotate(-23 9 14)"/><ellipse cx="14" cy="10.7" rx="2" ry="2.8"/><ellipse cx="19" cy="10.7" rx="2" ry="2.8"/><ellipse cx="23.5" cy="14" rx="2.1" ry="2.8" transform="rotate(23 23.5 14)"/><path d="M16.3 15c-2.4 0-3.1 2.1-5.1 4-2.3 2.3-.5 5.5 2.1 4.7l3-1 3 1c2.6.8 4.4-2.4 2.1-4.7-2-1.9-2.7-4-5.1-4Z"/></g>'],
      ['hobbies.html', '#2c6549', '<path d="m6 23 10-15 10 15H6Zm6 0 4-6 4 6m-4-6V8"/>']
    ];
    for (const [path, color, glyph] of badges) {
      const icon = nav.querySelector(`[href="${path}"] .th-nav-icon`);
      if (!icon) continue;
      icon.setAttribute('aria-hidden', 'true');
      icon.style.background = 'transparent';
      icon.innerHTML = portalNavBadge(color, glyph);
    }
    const vehiclesLink=nav.querySelector('[href="vehicles.html"]');
    if(vehiclesLink){
      const icon=vehiclesLink.querySelector('.th-nav-icon');
      if(icon){icon.classList.add('th-ford-icon');icon.innerHTML='<img src="ford-nav.svg?v=1" alt="" style="display:block;width:100%;height:100%;object-fit:contain">';}
    }
    const plan=nav.querySelector('[href="plan-tracker.html"]');
    if(plan)plan.innerHTML='<span class="th-nav-icon th-plan-icon" aria-hidden="true"><svg viewBox="0 0 32 32" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="30" height="30" rx="7" fill="#25477D"/><rect x="8" y="7" width="17" height="21" rx="3" fill="#142A49" stroke="#D5E8FF" stroke-width="1.5"/><rect x="12" y="4" width="9" height="6" rx="2" fill="#8CC9FF"/><path d="m11 16 2 2 4-4M19 16h3M11 23h11" stroke="#DAEEFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>Task Tracker</span>';
    const groups=[
      ['Overview',['./','plan-tracker.html']],
      ['Workspaces',['legal.html','identification.html','career.html','education.html','family.html','finance.html','home-library.html','medical.html','pets.html','hobbies.html','accounts.html']],
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
    style.textContent='.th-sidebar .th-nav-link{gap:14px;min-height:48px;margin-bottom:3px}.th-sidebar .th-nav-icon{flex:0 0 30px;width:30px;height:30px;overflow:hidden}.th-sidebar .th-bm-icon{font:700 10px/1 Georgia,serif;letter-spacing:-.3px;color:#f0d18d;white-space:nowrap}.th-sidebar .th-plan-icon{background:transparent}.th-sidebar .th-ford-icon{background:transparent!important;border-radius:0!important}.th-sidebar .th-ford-icon:before,.th-sidebar .th-ford-icon:after{content:none!important}.th-sidebar nav{overflow-y:auto;min-height:0;padding-bottom:12px}.th-sidebar .th-nav-label{margin-top:22px}.th-sidebar .th-sidebar-foot{flex-shrink:0}@media(max-width:700px){.th-sidebar nav{overflow-x:auto;overflow-y:visible;padding-bottom:4px}.th-sidebar .th-nav-link{gap:8px;min-height:40px;margin-bottom:0}.th-sidebar .th-nav-icon{display:grid;flex-basis:24px;width:24px;height:24px}.th-sidebar .th-nav-icon svg{width:24px;height:24px}.th-sidebar .th-bm-icon{font-size:8px}}';
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
  const main=document.querySelector('.th-app-main,.th-app > main,[data-th-navigation-main]');
  if(!main)return;
  let header=main.querySelector('.th-app-topbar');
  if(!header){header=document.createElement('header');header.className='th-app-topbar th-navigation-header';header.innerHTML='<div><strong>TisZod</strong><small>Personal workspace</small></div>';main.prepend(header);}
  const financeScope=document.body.dataset.financeNavigation;
  const financeHome=financeScope!==undefined?new URL('finance.html',location.href).href:null;
  const financeParent=financeScope?new URL(financeScope,location.href).href:
    financeHome&&location.search?financeHome:null;
  const portalHome=new URL('./',location.href).href;
  const atPortalHome=()=>[portalHome,new URL('index.html',portalHome).href].includes(location.href);
  const parentPage=financeParent||(
    document.body.dataset.thPage==='garage'&&location.search?new URL('garage.html',location.href).href:
    location.pathname!==new URL(portalHome).pathname&&!location.pathname.endsWith('/index.html')?portalHome:null);
  const controls=document.createElement('nav');controls.className='th-browser-controls';controls.setAttribute('aria-label','Portal page navigation');
  const paths={back:'m14 6-6 6 6 6M8 12h12',forward:'m10 6 6 6-6 6M16 12H4',refresh:'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1',home:'m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10'};
  for(const [action,label] of [['back','Back one page'],['forward','Forward one page'],['refresh','Refresh this page'],['home','Portal Home']]){const b=document.createElement('button');b.type='button';b.dataset.thNavigate=action;b.title=label;b.setAttribute('aria-label',label);b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[action]+'"/></svg>';controls.append(b);}
  header.insertBefore(controls,header.children[1]||null);
  const driveDialog=document.querySelector('dialog#legal-view');
  if(driveDialog){
    const dialogControls=controls.cloneNode(true);
    dialogControls.classList.add('th-dialog-navigation');
    driveDialog.prepend(dialogControls);
  }
  const style=document.createElement('style');style.textContent=`.th-dialog-navigation.th-browser-controls{margin:0 0 12px}.th-browser-controls{display:flex;align-items:center;gap:5px;flex:none;margin:0 16px}.th-browser-controls button{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;min-width:36px;padding:7px;margin:0;border:1px solid #53677f;border-radius:8px;background:#172b45;color:#eef5ff;cursor:pointer}.th-browser-controls svg{width:20px;height:20px}.th-browser-controls button:hover:not(:disabled){background:#25477d;border-color:#8cc9ff}.th-browser-controls button:disabled{opacity:.32;cursor:default}.th-browser-controls button:focus-visible{outline:3px solid #8cc9ff;outline-offset:3px}.th-navigation-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid #35465a;margin-bottom:24px}.th-navigation-header strong,.th-navigation-header small{display:block}.th-navigation-header small{font-size:12px;color:#a9b8ca}@media(max-width:900px){.th-app-topbar{height:auto;min-height:76px;flex-wrap:wrap;gap:12px;padding-top:12px;padding-bottom:12px}.th-browser-controls{order:3;flex-basis:100%;margin:0}.th-account{margin-left:auto}}`;document.head.append(style);
  const key='th-navigation-next',maxKey='th-navigation-max';
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
      if(window.thReaderAdapter)window.thReaderAdapter.restore(s.reader);
      try{if(s.tasks)document.querySelector('iframe[src*="tracker-tasks"]')?.contentWindow?.portalTaskNavigation?.restore(s.tasks)}catch{}
      if(window.thRestorePetView)window.thRestorePetView(s.pet);
      else if(s.pet)document.getElementById(s.pet)?.click();
      if('pair'in s&&typeof currentItem!=='undefined'){const item=items.find(x=>x.row===s.pair);if(item)openItem(item,false);else document.getElementById('overlay')?.classList.remove('open');}
      if(s.taskFilter!==undefined)document.querySelector('[data-filter="'+CSS.escape(s.taskFilter)+'"]')?.click();
      scrollTo({top:s.scroll||0,behavior:'instant'});requestAnimationFrame(()=>scrollTo({top:s.scroll||0,behavior:'instant'}));
    }finally{restoring=false;update();}
  }
  const current=()=>history.state?.thNav;
  function push(state,url){
    const index=(current()?.index||0)+1;
    history.pushState({...state,thNav:{index,view:capture()}},'',url);
    sessionStorage.setItem(maxKey,index);
    update();
  }
  const canGoBack=()=>window.navigation?navigation.canGoBack:(current()?.index||0)>0;
  function update(){
    const canBack=canGoBack()||Boolean(parentPage);
    const canForward=window.navigation?navigation.canGoForward:current()?.index<Number(sessionStorage.getItem(maxKey)||0);
    for(const button of document.querySelectorAll('.th-browser-controls [data-th-navigate="back"]'))button.disabled=!canBack;
    for(const button of document.querySelectorAll('.th-browser-controls [data-th-navigate="forward"]'))button.disabled=!canForward;
  }
  function replace(view=capture()){history.replaceState({...history.state,thNav:{index:current()?.index||0,view,awaitingQuery:!dataReady&&current()?.awaitingQuery}},'');}
  function record(before){const after=capture();const comparable=s=>JSON.stringify({...s,scroll:0});if(comparable(before)===comparable(after))return;replace(before);push(history.state,location.href);}
  function init(){const prior=current();if(prior){ready=true;if(dataReady||typeof window.thStart!=='function')restore(prior.view);}else{const index=Number(sessionStorage.getItem(key)||0);sessionStorage.removeItem(key);history.replaceState({...history.state,thNav:{index,view:capture(),awaitingQuery:typeof window.thStart==='function'&&(Boolean(financeHome)||new URLSearchParams(location.search).has('q'))}},'');sessionStorage.setItem(maxKey,index);ready=true;}update();}
  let inputTimer, clickTimer;
  function clearPendingHistory(){
    clearTimeout(inputTimer);
    clearTimeout(clickTimer);
  }
  document.addEventListener('click',e=>{
    const action=e.target.closest('.th-browser-controls [data-th-navigate]')?.dataset.thNavigate;
    if(!action)return;
    clearPendingHistory();
    if(action==='back'){
      if(canGoBack())history.back();
      else if(parentPage)location.replace(parentPage);
    }else if(action==='forward')history.forward();
    else if(action==='refresh'){replace();location.reload();}
    else if(action==='home'&&!atPortalHome()){
      replace();
      sessionStorage.setItem(key,(current()?.index||0)+1);
      location.assign(portalHome);
    }
  });
  addEventListener('popstate',()=>{clearPendingHistory();restore(current()?.view);update();});
  addEventListener('pagehide',()=>{clearPendingHistory();if(ready&&!restoring)replace()});
  window.navigation?.addEventListener('currententrychange',update);
  document.addEventListener('change',e=>{if(financeHome||!ready||restoring||!viewControls().includes(e.target))return;const before=current()?.view;setTimeout(()=>{if(!restoring)record(before||capture())},0)},true);
  document.addEventListener('input',e=>{if(financeHome||!ready||restoring||!viewControls().includes(e.target))return;clearTimeout(inputTimer);const before=current()?.view;inputTimer=setTimeout(()=>record(before||capture()),450)},true);
  addEventListener('pageshow',()=>{if(ready)update();});
  document.addEventListener('click',e=>{
    if(!ready||restoring||e.target.closest('.th-browser-controls,.th-mobile-menu,.th-mobile-close,.th-mobile-shade,[data-th-drive-id],#legal-view-close,#legal-view-back'))return;
    if(e.target.closest('#identity-refresh,#education-refresh,#tax-refresh,#history-refresh'))replace();
    const link=e.target.closest('a[href]');
    if(link&&!link.target&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){const url=new URL(link.href);if(url.origin===location.origin&&url.pathname.startsWith(new URL('./',location.href).pathname)&&(url.pathname!==location.pathname||url.search!==location.search||!url.hash)){clearPendingHistory();replace();sessionStorage.setItem(key,(current()?.index||0)+1);return;}}
    if(financeHome)return;
    if(document.body.dataset.thPage==='home-library' && e.target.closest('#library-results,#manual-breadcrumb,.library-card,.library-breadcrumb,.library-tabs'))return;
    if(e.target.closest('form,#th-auth,.th-module-search,.sidebar-order-open,.sidebar-drag-handle'))return;
    const before=capture(),index=current()?.index,url=location.href;
    clearTimeout(clickTimer);
    clickTimer=setTimeout(()=>{if(!restoring&&current()?.index===index&&location.href===url)record(before)},0);
  },true);
  // Embedded tracker sends view snapshots, never task mutations.
  let frameBefore=null;
  window.portalNavigation={push,replace,before:(fromChange=false)=>{if(ready&&!restoring)frameBefore=fromChange?(current()?.view||capture()):capture()},after:()=>{if(!ready||restoring||!frameBefore)return;const before=frameBefore;frameBefore=null;record(before)}};
  function connectFrame(){const frame=document.querySelector('iframe[src*="tracker-tasks"]');if(!frame)return;frame.addEventListener('load',()=>{if(current()?.view?.tasks)restore(current().view);else if(ready)replace()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{init();connectFrame()},{once:true});else{init();connectFrame();}
  const start=window.thStart;if(typeof start==='function')window.thStart=async(...args)=>{const prior=current();const saved=dataReady?capture():prior?.awaitingQuery?null:prior?.view;const result=await start(...args);dataReady=true;ready=true;if(saved)restore(saved);await window.thDriveRecords?.restoreNavigation?.();replace();return result;};
})();

/* Unified personal portal presentation. Moves existing elements; never copies club records. */
(() => {
 const nav=document.querySelector('.th-sidebar nav');
 if(nav){
  const links=new Map([...nav.querySelectorAll('a')].map(a=>[a.getAttribute('href'),a]));
  const order=[['Main',['./']],['Modules',['accounts.html','career.html','education.html','equipment.html','family.html','finance.html','garage.html','hobbies.html','home-library.html','identification.html','legal.html','medical.html','personal-records.html','pets.html','plan-tracker.html','vehicles.html','watercraft.html']],['System',['admin.html']]];
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
 const modulePaths=['plan-tracker.html','finance.html','career.html','home-library.html','pets.html','vehicles.html','equipment.html','watercraft.html','hobbies.html','medical.html','admin.html'];
 for(const path of ['plan-tracker.html','home-library.html','career.html']){if(grid.querySelector('[href="'+path+'"]'))continue;const source=nav?.querySelector('[href="'+path+'"]');if(!source)continue;const a=document.createElement('a');a.href=path;a.className='workspace';const icon=source.querySelector('.th-nav-icon')?.cloneNode(true)||document.createElement('span');icon.className='workspace-icon';const body=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');const [name,description]={'plan-tracker.html':['Task Tracker','Your tasks, priorities, and next steps'],'home-library.html':['Library','Find manuals, recipes, and purchase records'],'career.html':['Career']}[path];strong.textContent=name;body.append(strong);if(description){small.textContent=description;body.append(small)}a.append(icon,body);grid.append(a)}
 grid.querySelectorAll('a.workspace:is([href="black-mild.html"],[href="freebirds.html"])').forEach(card=>card.remove());
 const cards=[...grid.querySelectorAll('a.workspace')];cards.sort((a,b)=>modulePaths.indexOf(a.getAttribute('href'))-modulePaths.indexOf(b.getAttribute('href'))).forEach(a=>{a.classList.add('th-module-card');const icon=a.querySelector('.workspace-icon'),body=[...a.children].find(c=>c.querySelector('strong'));const art=document.createElement('span');art.className='th-module-art';if(icon)art.append(icon);if(body)body.classList.add('th-module-body');a.prepend(art);grid.append(a)});
 const title=document.createElement('div');title.className='th-module-heading';const label=document.createElement('h2');label.textContent='Modules';title.append(label);
 const stats=main.querySelector('.stats');if(stats)heading?.after(stats);stats?.after(title,grid);
 const lower=document.createElement('div');lower.className='th-lower-dashboard';const taskPanel=main.querySelector('[aria-label="Plan dashboard"]'),attention=main.querySelector('#attention');if(attention)lower.append(attention);if(taskPanel)lower.append(taskPanel);grid.after(lower);
 const old=main.querySelector('.dash-grid');if(old&&!old.children.length)old.remove();
})();


/* Header Home replaces the redundant sidebar Home. Keep group indices stable. */
(()=>{const nav=document.querySelector('.th-sidebar nav');if(!nav)return;nav.querySelector('a[href="./"]')?.remove();for(const label of nav.querySelectorAll('.th-nav-label'))if(label.textContent.trim()==='Main')label.hidden=true;})();

/* Compatibility helpers required by the bundled PDF.js, including its worker. */
if(!Uint8Array.prototype.toHex)Uint8Array.prototype.toHex=function(){return Array.from(this,b=>b.toString(16).padStart(2,'0')).join('')};
for(const C of [Map,WeakMap]){
 if(!C.prototype.getOrInsertComputed)C.prototype.getOrInsertComputed=function(k,f){if(!this.has(k))this.set(k,f(k));return this.get(k)};
 if(!C.prototype.getOrInsert)C.prototype.getOrInsert=function(k,v){if(!this.has(k))this.set(k,v);return this.get(k)};
}
if(!Uint8Array.fromBase64)Uint8Array.fromBase64=function(value){const s=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(s,c=>c.charCodeAt(0))};
if(!Uint8Array.prototype.toBase64)Uint8Array.prototype.toBase64=function(){let s='';for(let i=0;i<this.length;i+=8192)s+=String.fromCharCode(...this.subarray(i,i+8192));return btoa(s)};

/* Shared private Drive previews. Keep iframe handles for existing dialog controllers. */
(()=>{'use strict';
const states=new Map(),files=new Map();let library;
const pdfLibrary=()=>library||=(import('./vendor/pdfjs/pdf.min.mjs').then(pdf=>{pdf.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.compat.mjs',document.baseURI).href;return pdf}));
function driveId(value){try{const u=new URL(value,document.baseURI);return ['drive.google.com','docs.google.com'].includes(u.hostname)?u.pathname.match(/\/d\/([^/]+)/)?.[1]||u.searchParams.get('id')||'':''}catch{return ''}}
async function file(id){
 if(!files.has(id))files.set(id,(async()=>{
  if(typeof thAuthorized!=='function'||!thAuthorized())throw Error('Sign in to the portal to view this document.');
  const base='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id);
  const meta=await fetch(base+'?fields=mimeType,name&supportsAllDrives=true',{headers:{Authorization:'Bearer '+thToken}});
  if(!meta.ok)throw Error('This Google account cannot access this document.');
  const info=await meta.json(),native=info.mimeType.startsWith('application/vnd.google-apps.');
  const response=await fetch(base+(native?'/export?mimeType=application%2Fpdf':'?alt=media&supportsAllDrives=true'),{headers:{Authorization:'Bearer '+thToken}});
  if(!response.ok)throw Error('Unable to load this document. Open the original or reconnect Google.');
  return {blob:await response.blob(),type:native?'application/pdf':info.mimeType};
 })().catch(e=>{files.delete(id);throw e}));
 return files.get(id);
}
function dispose(holder){const old=states.get(holder);if(old){old.cancelled=true;if(old.url)URL.revokeObjectURL(old.url);old.task?.destroy().catch(()=>{});states.delete(holder)}}
async function render(holder,id,title='Document',full=false){
 dispose(holder);const state={cancelled:false};states.set(holder,state);holder.classList.remove('th-document-error');holder.classList.add('th-document-viewer');holder.classList.toggle('th-document-full',full);holder.textContent='Loading document…';
 try{
  const data=await file(id);if(state.cancelled||!holder.isConnected)return;
  if(data.type.startsWith('image/')){const img=document.createElement('img');img.alt=title;state.url=URL.createObjectURL(data.blob);img.src=state.url;holder.replaceChildren(img);return}
  if(data.type!=='application/pdf'){holder.textContent='Use Open original to view this file type.';return}
  state.url=URL.createObjectURL(data.blob);
  const frame=document.createElement('iframe');
  frame.title=title;
  frame.dataset.thNativePdf='true';
  frame.src=state.url+'#view=FitH'+(full?'':'&toolbar=0&navpanes=0');
  frame.style.cssText='display:block!important;width:100%!important;height:100%!important;min-height:0!important;border:0;background:#fff;flex:1';
  if(!full){frame.tabIndex=-1;frame.style.pointerEvents='none';}
  holder.replaceChildren(frame);
 }catch(error){fail(error)}
 function fail(error){if(!state.cancelled){holder.textContent=error.message||'Preview unavailable. Open the original document.';holder.classList.add('th-document-error')}}
}
window.thDocumentViewer={render,dispose,driveId};
const css=document.createElement('style');css.textContent='.th-document-viewer{box-sizing:border-box;display:flex!important;flex-direction:column;align-items:center;justify-content:center;width:100%;height:300px;min-height:0!important;overflow:hidden;background:#fff;color:#193047;font:14px/1.5 system-ui;text-align:center}.th-document-viewer>img,.th-document-page>canvas{display:block!important;width:100%!important;height:100%!important;min-height:0!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important}.th-document-page{flex:1;min-height:0;width:100%;overflow:hidden;display:flex;align-items:center;justify-content:center}.th-document-full{height:min(70dvh,800px);pointer-events:auto!important}.th-document-viewer nav{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;padding:8px;flex-shrink:0}.th-document-viewer nav button{font:14px system-ui;padding:8px}.th-document-error{padding:20px;overflow-wrap:anywhere}iframe[data-th-private-frame]{display:none!important}.th-document-viewer[hidden]{display:none!important}';document.head.append(css);
const frames=new Map();
function sync(frame){
 const src=frame.getAttribute('src')||'',id=driveId(src);let entry=frames.get(frame);
 if(!id){if(entry){dispose(entry.holder);entry.holder.remove();frames.delete(frame);frame.removeAttribute('data-th-private-frame')}return}
 if(!entry){const holder=document.createElement('div');holder.className=frame.className;frame.after(holder);entry={holder,id:null};frames.set(frame,entry)}
 frame.dataset.thPrivateFrame='true';const hidden=frame.hidden||frame.style.display==='none';if(entry.holder.hidden!==hidden)entry.holder.hidden=hidden;
 if(frame.closest('dialog')&&!frame.closest('dialog').open)return;
 if(entry.id!==id){entry.id=id;render(entry.holder,id,frame.title||'Document',!!frame.closest('dialog')).catch(()=>{})}
}
let pending=false;function scan(){pending=false;for(const holder of states.keys())if(!holder.isConnected)dispose(holder);for(const frame of document.querySelectorAll('iframe'))sync(frame);for(const [frame,entry]of frames)if(!frame.isConnected){dispose(entry.holder);entry.holder.remove();frames.delete(frame)}}
const observer=new MutationObserver(()=>{if(!pending){pending=true;queueMicrotask(scan)}});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src','hidden','style','open']});scan();
addEventListener('pagehide',()=>{for(const holder of states.keys())dispose(holder);files.clear()});
document.addEventListener('close',e=>{if(e.target.tagName==='DIALOG')for(const [frame,entry]of frames)if(e.target.contains(frame)){dispose(entry.holder);entry.id=null;entry.holder.replaceChildren()}},true);
})();


/* Phone navigation only: the existing desktop shell remains intact. */
(()=>{
 function init(){
 const side=document.querySelector('.th-sidebar'),main=document.querySelector('.th-app-main')||document.querySelector('.th-app > main');
 if(!side||!main||document.querySelector('.th-mobile-bar'))return;
 const media=matchMedia('(max-width:700px)');
 const bar=document.createElement('header');bar.className='th-mobile-bar';
 const header=main.querySelector('.th-app-topbar');
 const title=document.createElement('span');title.className='th-mobile-title';
 title.textContent=header?.querySelector('strong')?.textContent.trim()||'TisZod';
 const menu=document.createElement('button');menu.type='button';menu.className='th-mobile-menu';menu.textContent='Menu';menu.setAttribute('aria-expanded','false');
 const sidebarId=side.id||(side.id='th-mobile-navigation');
 menu.setAttribute('aria-controls',sidebarId);
 bar.append(title,menu);main.before(bar);
 const shade=document.createElement('div');shade.className='th-mobile-shade';shade.setAttribute('aria-hidden','true');document.body.append(shade);
 const close=document.createElement('button');close.type='button';close.className='th-mobile-close';close.textContent='Close menu';side.prepend(close);
 const actions=document.createElement('div');actions.className='th-mobile-actions';side.append(actions);
 const signOut=document.createElement('button');signOut.type='button';signOut.textContent='Sign out';
 signOut.onclick=()=>header?.querySelector('.th-sign-out')?.click();
 actions.append(signOut);
 const controls=header?.querySelector('.th-browser-controls');
 const toolbar=document.createElement('nav');toolbar.className='th-browser-controls th-mobile-toolbar';
 toolbar.setAttribute('aria-label','Portal page navigation');bar.prepend(toolbar);
 const search=header?.querySelector('.th-module-search');
 const nav=side.querySelector('nav');
 function moveForPhone(element, destination, insert){
  if(!element)return;
  const marker=document.createComment('Desktop position');
  element.before(marker);
  const place=()=>{if(media.matches)insert(destination,element);else marker.after(element);};
  media.addEventListener('change',place);
  place();
 }
 moveForPhone(controls,actions,(target,node)=>target.prepend(node));
 for(const action of ['back','forward','refresh']){
  const button=controls?.querySelector('[data-th-navigate='+action+']');
  moveForPhone(button,toolbar,(target,node)=>target.append(node));
 }
 moveForPhone(search,nav,(target,node)=>target.before(node));
 let lastFocus;
 function setOpen(open,trigger){
 open=Boolean(open&&media.matches);
 const wasOpen=document.body.classList.contains('th-mobile-menu-open');
 if(open&&!wasOpen)lastFocus=trigger||document.activeElement;
 signOut.hidden=!header?.querySelector('.th-sign-out');
 document.body.classList.toggle('th-mobile-menu-open',open);menu.setAttribute('aria-expanded',String(open));
 main.inert=open;bar.inert=open;
 side.inert=media.matches&&!open;
 if(open){side.setAttribute('role','dialog');side.setAttribute('aria-modal','true');side.setAttribute('aria-label','Navigation menu');close.focus();}
 else{side.removeAttribute('role');side.removeAttribute('aria-modal');side.removeAttribute('aria-label');if(wasOpen&&media.matches&&lastFocus?.isConnected)lastFocus.focus();}
 }
 menu.onclick=()=>setOpen(true,menu);close.onclick=shade.onclick=()=>setOpen(false);
 side.addEventListener('click',e=>{if(e.target.closest('a[href],.th-browser-controls button'))setOpen(false)});
 document.addEventListener('keydown',e=>{
 if(!document.body.classList.contains('th-mobile-menu-open'))return;
 if(e.key==='Escape'){e.preventDefault();setOpen(false);}
 if(e.key==='Tab'){const list=[...side.querySelectorAll('a[href],button,input,select,[tabindex="0"]')].filter(x=>!x.disabled&&x.getClientRects().length);const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 });
 media.addEventListener('change',()=>setOpen(false));setOpen(false);
 document.body.classList.add('th-mobile-shell');
 const style=document.createElement('style');style.textContent=`
 .th-mobile-bar,.th-mobile-shade,.th-mobile-close,.th-mobile-actions{display:none}
 @media(max-width:700px){
 body[data-th-page] .th-app{display:block!important;min-width:0}
 body[data-th-page] .th-app-main,body[data-th-page] .th-app>main{min-width:0;width:100%;box-sizing:border-box}
 html{scroll-padding-top:calc(72px + env(safe-area-inset-top))}
 body[data-th-page] .th-mobile-bar{display:grid;width:100%;margin:0!important;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:7px 12px;padding-top:calc(7px + env(safe-area-inset-top));background:#0e1421;border-bottom:2px solid #376fe6;position:sticky;top:0;z-index:80;min-height:60px;box-sizing:border-box}
 .th-mobile-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#ecf3ff;font:700 17px system-ui}
 .th-mobile-bar button,.th-mobile-close,.th-mobile-actions button{min-height:44px;min-width:44px;border:1px solid #415775;border-radius:9px;background:#172538;color:#ecf3ff;font:600 15px system-ui;padding:8px 12px}
 .th-mobile-bar .th-mobile-toolbar,.th-mobile-actions .th-browser-controls{order:0;flex-basis:auto;margin:0}
 .th-mobile-toolbar:empty{display:none}
 .th-mobile-toolbar button{padding:7px}
 body[data-th-page] .th-sidebar{position:fixed!important;inset:0 auto 0 0!important;box-sizing:border-box;width:min(320px,88vw)!important;height:100dvh!important;padding:16px!important;z-index:110;display:flex!important;flex-direction:column;transform:translateX(-105%);visibility:hidden;border:0!important;overflow-y:auto!important;background:#0e1421}
 body.th-mobile-menu-open .th-sidebar{transform:translateX(0)!important;visibility:visible}
 body.th-mobile-menu-open{overflow:hidden}
 .th-mobile-close{display:block;align-self:flex-end;margin-bottom:12px}
 .th-mobile-actions button[hidden]{display:none}
 body[data-th-page] .th-sidebar nav{display:flex!important;flex-direction:column!important;flex-wrap:nowrap!important;overflow-y:visible!important;overflow-x:hidden!important;flex:0 0 auto;gap:4px}
 body[data-th-page] .th-sidebar .th-nav-link{width:100%;box-sizing:border-box;min-height:48px!important;font-size:15px!important;padding:10px 12px!important}
 body[data-th-page] .th-sidebar .th-brand{padding:0 6px 16px!important}
 .th-mobile-actions{display:flex;gap:10px;flex-wrap:wrap;padding:20px 0}
 .th-mobile-shade{position:fixed;inset:0;z-index:100;background:#0009;border:0;border-radius:0}
 .th-mobile-menu-open .th-mobile-shade{display:block}
 body.th-mobile-shell .th-app-main>.th-app-topbar,body.th-mobile-shell .th-app>main>.th-app-topbar{display:none!important}
 body[data-th-page] .th-sidebar .th-module-search{min-width:0;max-width:none;flex:none;width:100%;margin:0 0 8px}
 body[data-th-page] .th-sidebar .th-module-search input{font-size:16px;box-sizing:border-box;min-height:44px}
 body[data-th-page] .th-sidebar .th-search-results{position:static;margin-top:5px}
 body[data-th-page] .dashboard,body[data-th-page] .admin-main,body[data-th-page] .finance-wrap{padding:16px 14px 24px!important}
 body[data-th-page] .th-page-content>.shell,body[data-th-page] .th-page-content>.wrap{padding-left:14px;padding-right:14px}
 body[data-th-page] .th-module-grid{grid-template-columns:minmax(0,1fr)!important}
 body[data-th-page] main.portal-section .portal-section-hero{padding:18px;margin-bottom:14px}
 body[data-th-page] main.portal-section .portal-section-hero h1{font-size:clamp(1.8rem,6vw,2.25rem)}
 .portal-section .portal-section-cards > .tile .portal-section-cover{max-height:165px}
 body[data-th-page] .pc-hero{display:block;min-height:0;padding:20px!important;background:#101a29}
 body[data-th-page] .pc-hero::before{display:none}
 body[data-th-page] .pc-copy h1{font-size:27px;line-height:1.12;margin:8px 0}
 body[data-th-page] .pc-eyebrow{font-size:9px;letter-spacing:.1em}
 body[data-th-page] .pc-copy p{font-size:13px;line-height:1.5}
 body[data-th-page] .pc-health{margin-top:16px;max-width:none;padding:12px 14px}
 body[data-th-page] .pc-health strong{font-size:17px}
 body[data-th-page] .personal-command{margin-bottom:18px}
 body[data-th-page] .pc-kpis{grid-template-columns:minmax(0,1fr);padding:0 16px}
 body[data-th-page] .pc-kpi{padding:16px 0;border-right:0;border-bottom:1px solid #ffffff20}
 body[data-th-page] .pc-kpi:last-child{border-bottom:0}
 body[data-th-page] .pc-kpi-facts{align-self:center;width:min(100%,270px);box-sizing:border-box}
 body[data-th-page="freebirds"] .th-app>main{padding:0 14px 24px}
 .th-mobile-bar :focus-visible,.th-sidebar :focus-visible{outline:3px solid #8cb8ff;outline-offset:2px}
 }`;document.head.append(style);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

/* Shared phone ergonomics. All layout overrides stop at 700px. */
(()=>{
 const style=document.createElement('style');style.textContent=`
 @media(max-width:700px){
 body[data-th-page] :is(input,select,textarea){font-size:16px!important;max-width:100%;box-sizing:border-box}
 body[data-th-page] :is(button,input:not([type=checkbox]):not([type=radio]),select){min-height:44px}
 body[data-th-page] :is(input[type=checkbox],input[type=radio]){width:22px;height:22px;flex-shrink:0}
 body[data-th-page] :is(.th-page-content,.th-page-content>*,.finance-wrap,.wrap,.shell){min-width:0;max-width:100%;box-sizing:border-box}
 body[data-th-page] .th-page-content{padding:16px 12px 24px}
 body[data-th-page] :is(.tax-heading,.identity-heading,.education-heading,.investment-heading,.fd-heading){align-items:flex-start;flex-direction:column;gap:12px}
 body[data-th-page] :is(.tax-toolbar,.identity-toolbar,.education-toolbar,.fd-tools,.history-filters){display:flex;flex-direction:column;align-items:stretch;gap:12px}
 body[data-th-page] :is(.tax-toolbar,.identity-toolbar,.education-toolbar,.fd-tools,.history-filters)>*{width:100%;min-width:0!important;box-sizing:border-box}
 body[data-th-page] :is(.identity-grid,.education-grid,.investment-grid,.identity-fields,.education-fields,.tax-fields,.credit-detail-grid,.complete-grid,.bk-form-grid){grid-template-columns:minmax(0,1fr)!important}
 body[data-th-page] :is(.identity-grid,.education-grid,.investment-grid,.complete-grid)>*{min-width:0}
 body[data-th-page] :is(.tax-tabs,.bk-tabs,.asset-tabs,.vehicle-workspace-actions,.vehicle-filter-bar,.finance-bank-nav,.history-nav){max-width:100%;flex-wrap:wrap;gap:8px}
 body[data-th-page] :is(.table-wrap,.bk-table-wrap,.history-table-wrap,.bm-table-wrap,.credit-table-wrap){max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
 body[data-th-page] :is(.tax-card,.account-login,.bk-document,.record-caption,.asset-detail-card){overflow-wrap:anywhere}
 body[data-th-page] :is(dialog,.bk-dialog,.work-dialog){box-sizing:border-box;width:calc(100% - 16px);max-width:calc(100% - 16px);max-height:calc(100dvh - 24px);padding:16px;overflow:auto}
 body[data-th-page] dialog :is(footer,.dialog-actions,.complete-actions,.bk-preview-tools,.tax-preview-actions){display:flex;flex-wrap:wrap;gap:8px}
 body[data-th-page] dialog :is(pre,.account-notes){white-space:pre-wrap;overflow-wrap:anywhere}
 body[data-th-page] .th-document-full{height:58dvh}
 body[data-th-page] :is(.bk-preview-header,.tax-preview-header){flex-wrap:wrap;gap:10px}
 body[data-th-page] :is(.bk-preview-header,.tax-preview-header) h2{font-size:18px;overflow-wrap:anywhere}
 body[data-th-page="freebirds"] .section-head{align-items:flex-start;flex-direction:column}
 body[data-th-page="freebirds"] .topline{flex-wrap:wrap;gap:8px}
 body[data-th-page="freebirds"] :is(.toolbar,.filter-row){min-width:0;max-width:100%}
 body[data-th-page="freebirds"] .add-fields{grid-template-columns:minmax(0,1fr)}
 body[data-th-page] .bm-main{padding:16px 12px 24px}
 body[data-th-page] .bm-head{flex-direction:column;align-items:stretch}
 body[data-th-page] .bm-counts{max-width:none;width:100%}
 body[data-th-page] .investment-metrics>div{min-width:0;flex-basis:100%;box-sizing:border-box}
 @media(max-width:380px){
 body[data-th-page] :is(.accounts-grid,.bk-years,.bk-quick,.stats,.metrics){grid-template-columns:minmax(0,1fr)!important}
 }
 }`;document.head.append(style);
})();

/* Compact phone equipment cards. */
(()=>{
 const style=document.createElement('style');
 style.textContent=`
 @media(max-width:700px){
 body[data-th-page] #categoryView #assetGrid .asset-card{display:grid;grid-template-columns:88px minmax(0,1fr);align-items:center;gap:10px 12px;min-height:0;padding:12px;border-radius:12px}
 body[data-th-page] #categoryView #assetGrid .card-status{position:static;grid-column:1/-1;justify-self:end;margin:0;padding:3px 8px;min-height:36px;font-size:12px}
 body[data-th-page] #categoryView #assetGrid .card-status select{min-height:30px;max-width:150px}
 body[data-th-page] #categoryView #assetGrid .card-photo{grid-column:1;grid-row:2;width:88px;height:76px;aspect-ratio:auto;align-self:center}
 body[data-th-page] #categoryView #assetGrid .card-copy{display:contents}
 body[data-th-page] #categoryView #assetGrid .card-copy>strong{grid-column:2;grid-row:2;display:block;font-size:16px;line-height:1.3;margin:0;align-self:center}
 body[data-th-page] #categoryView #assetGrid .card-copy>.card-stat{grid-column:1/-1;margin:0;font-size:13px;line-height:1.4}
 body[data-th-page] #categoryView #assetGrid .card-last-updated{grid-column:1/-1;margin:0;font-size:12px;line-height:1.4}
 body[data-th-page] #categoryView #assetGrid .card-ownership{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2px 12px;margin:0;padding:10px 0;border-top:1px solid #ffffff26;border-bottom:1px solid #ffffff26}
 body[data-th-page] #categoryView #assetGrid .card-ownership>span:nth-child(1){grid-column:1;grid-row:1}
 body[data-th-page] #categoryView #assetGrid .card-ownership>b:nth-child(2){grid-column:1;grid-row:2}
 body[data-th-page] #categoryView #assetGrid .card-ownership>span:nth-child(3){grid-column:2;grid-row:1}
 body[data-th-page] #categoryView #assetGrid .card-ownership>b:nth-child(4){grid-column:2;grid-row:2}
 body[data-th-page] #categoryView #assetGrid .card-ownership span{font-size:11px}
 body[data-th-page] #categoryView #assetGrid .card-ownership b{font-size:13px;margin:0}
 body[data-th-page] #categoryView #assetGrid .card-deadlines{grid-column:1/-1}
 body[data-th-page] #categoryView #assetGrid .card-open,body[data-th-page] #categoryView #assetGrid .card-mileage{position:static;grid-column:1/-1;width:100%;min-height:44px;margin:0;padding:10px;font-size:13px;text-align:center}
 body[data-th-page] #categoryView #assetGrid .card-open{grid-column:1/-1}
 }
 @media(max-width:700px){
  body[data-th-page] dialog[open]{box-sizing:border-box;max-inline-size:calc(100vw - 24px);max-block-size:calc(100dvh - 24px);overflow:auto;overscroll-behavior:contain}
  body[data-th-page] dialog[open] :is(input,select,textarea){box-sizing:border-box;min-inline-size:0;max-inline-size:100%;font-size:16px}
  body[data-th-page] dialog[open] .complete-grid{grid-template-columns:minmax(0,1fr)}
  body[data-th-page] dialog[open] .complete-grid > *{min-width:0}
 }
 @media(min-width:360px) and (max-width:700px){
 body[data-th-page] #categoryView #assetGrid .asset-card{grid-template-columns:88px minmax(0,1fr) minmax(0,1fr)}
 body[data-th-page] #categoryView #assetGrid .card-copy>strong{grid-column:2/-1}
 body[data-th-page] #categoryView #assetGrid .card-open{grid-column:1/3;grid-row:auto}
 body[data-th-page] #categoryView #assetGrid .card-mileage{grid-column:3}
 }`;
 document.head.append(style);
})();

/* Approved workspace consolidation: retain all original module pages and data. */
(function(){
 function consolidate(){
  const nav=document.querySelector('.th-sidebar nav');
  if(nav){
   const groups=[
    {name:'Garage',href:'garage.html',members:['vehicles.html','watercraft.html','equipment.html'],color:'#355a8a',glyph:'<path d="m5 13 11-6 11 6v12H5zM9 25V14h14v11M9 18h14m-14 4h14"/>'},
    {name:'Records',href:'personal-records.html',members:['family.html','identification.html','education.html','medical.html'],color:'#63547d',glyph:'<rect x="6" y="9" width="20" height="14" rx="2"/><circle cx="12" cy="14" r="2"/><path d="M9 20q3-4 6 0m3-6h5m-5 4h5"/>'}
   ];
   for(const group of groups){
    const links=[...nav.querySelectorAll('a.th-nav-link')].filter(a=>group.members.some(m=>(a.getAttribute('href')||'').split('?')[0]===m));
    const existing=nav.querySelector('a[href="'+group.href+'"]');
    const active=group.members.some(m=>location.pathname.endsWith('/'+m))||location.pathname.endsWith('/'+group.href);
    const link=existing||document.createElement('a');
    link.href=group.href;link.className='th-nav-link'+(active?' active':'');
    if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    link.innerHTML='<span class="th-nav-icon" style="background:transparent" aria-hidden="true">'+portalNavBadge(group.color,group.glyph)+'</span><span>'+group.name+'</span>';
    if(!existing){
     if(links.length)links[0].before(link);
     else [...nav.querySelectorAll('.th-nav-label')].find(label=>label.textContent.trim()==='Modules')?.after(link);
    }
    links.forEach(a=>a.remove());
   }
  }
  const cards=document.querySelectorAll('a.workspace');
  if(cards.length){
   const groups=[
    {name:'Garage',href:'garage.html',members:['vehicles.html','watercraft.html','equipment.html'],desc:'Vehicles, watercraft, and equipment',icon:'▰'},
    {name:'Records',href:'personal-records.html',members:['family.html','identification.html','education.html','medical.html'],desc:'Family, identification, education, and medical',icon:'▣'}
   ];
   for(const g of groups){
    const matches=[...document.querySelectorAll('a.workspace')].filter(a=>g.members.includes(a.getAttribute('href')));
    if(!matches.length)continue;
    const card=matches[0];card.href=g.href;
    const strong=card.querySelector('strong'),small=card.querySelector('small'),ico=card.querySelector('.workspace-icon');
    if(strong)strong.textContent=g.name;if(small)small.textContent=g.desc;if(ico)ico.textContent=g.icon;
    matches.slice(1).forEach(a=>a.remove());
   }
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',consolidate);
 else consolidate();
})();

/* Keep the module list stable regardless of the current page. */
(() => {
 function sortModules(){
  const nav=document.querySelector('.th-sidebar nav');
  const heading=[...nav?.querySelectorAll('.th-nav-label')||[]].find(label=>label.textContent.trim()==='Modules');
  if(!heading)return;
  const modules=[];
  for(let link=heading.nextElementSibling;link?.matches('a.th-nav-link');link=link.nextElementSibling){
   const label=link.cloneNode(true);
   label.querySelector('.th-nav-icon')?.remove();
   modules.push({link,name:label.textContent.trim()});
  }
  modules.sort((a,b)=>a.name.localeCompare(b.name,'en'));
  heading.after(...modules.map(module=>module.link));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sortModules);
 else sortModules();
})();


/* Load the iPhone-only finishing styles on every portal module. */
(()=>{const link=document.createElement('link');link.rel='stylesheet';link.href='iphone-finish.css?v=20261111-all-pages4';document.head.append(link)})();

/* TisZod iPhone experience v1: isolated from iPad and desktop. */
(()=>{
 function boot(){
  if(!document.body.matches('[data-th-page]')||document.querySelector('.tz-phone-dock'))return;
  const phone=matchMedia('(max-width:700px) and (pointer:coarse)');
  const paths=[
   ['Home','./','⌂'],['Garage','garage.html','▰'],['Health','medical.html','♡'],['Records','personal-records.html','▣'],['More','#tz-phone-more','☷']
  ];
  const dock=document.createElement('nav');dock.className='tz-phone-dock';dock.setAttribute('aria-label','iPhone quick navigation');
  const current=location.pathname.split('/').pop()||'index.html';
  const groupFor=p=>p==='index.html'?'Home':/garage|vehicle|watercraft|equipment/.test(p)?'Garage':/health|medical/.test(p)?'Health':/personal-record|family|identification|education/.test(p)?'Records':'More';
  const group=groupFor(current);
  for(const [label,href,glyph] of paths){
   const a=document.createElement('a');a.href=href;a.className='tz-phone-tab'+(group===label?' is-active':'');
   if(group===label)a.setAttribute('aria-current','page');
   const mark=document.createElement('span');mark.className='tz-phone-tab-icon';mark.setAttribute('aria-hidden','true');mark.textContent=glyph;
   const name=document.createElement('span');name.textContent=label;a.append(mark,name);
   if(label==='More')a.addEventListener('click',e=>{e.preventDefault();document.querySelector('.th-mobile-menu')?.click()});
   dock.append(a);
  }
  document.body.append(dock);
  const bar=document.querySelector('.th-mobile-bar');
  if(bar){
   const brand=document.createElement('span');brand.className='tz-phone-brand';brand.textContent='TisZod';
   bar.prepend(brand);
   const menu=bar.querySelector('.th-mobile-menu');if(menu){menu.textContent='☰';menu.setAttribute('aria-label','Open all modules')}
   const title=bar.querySelector('.th-mobile-title');if(title)title.textContent=group==='Home'?'Overview':group;
  }
  if(current==='index.html'){
   const main=document.querySelector('main.dashboard');
   if(main){
    const launch=document.createElement('section');launch.className='tz-phone-launch';
    launch.innerHTML='<div class="tz-phone-welcome"><span>YOUR PERSONAL WORKSPACE</span><h1>Good to see you.</h1><p>Everything important, right at your fingertips.</p></div><div class="tz-phone-launch-grid"></div>';
    const grid=launch.querySelector('.tz-phone-launch-grid');
    for(const [name,url,glyph,desc] of [['Garage','garage.html','▰','Vehicles & maintenance'],['Health','medical.html','♡','Your health overview'],['Finance','finance.html','$','Accounts & activity'],['Records','personal-records.html','▣','Family & documents'],['Pets','pets.html','♧','Care & insurance'],['Tasks','plan-tracker.html','✓','Plans & reminders']]){
     const a=document.createElement('a');a.href=url;a.className='tz-phone-launch-card';
     const icon=document.createElement('span');icon.className='tz-phone-launch-icon';icon.textContent=glyph;
     const title=document.createElement('strong');title.textContent=name;
     const subtitle=document.createElement('small');subtitle.textContent=desc;
     a.append(icon,title,subtitle);grid.append(a);
    }
    main.prepend(launch);
   }
  }
  document.body.classList.add('tz-phone-ready');
  const style=document.createElement('style');style.id='tz-phone-style';style.textContent=`
  .tz-phone-dock,.tz-phone-launch,.tz-phone-brand{display:none}
  @media(max-width:700px) and (pointer:coarse){
   html,body{max-width:100%;overflow-x:clip}
   body[data-th-page]{--tz-phone-bg:#090f1a;--tz-phone-card:#152235;--tz-phone-accent:#77aaff;background:var(--tz-phone-bg);padding-bottom:calc(84px + env(safe-area-inset-bottom))!important}
   body[data-th-page] .th-mobile-bar{grid-template-columns:auto minmax(0,1fr) auto auto!important;gap:9px!important;min-height:64px!important;padding:9px 14px!important;padding-top:calc(9px + env(safe-area-inset-top))!important;border-bottom:1px solid #263b59!important;background:#0c1625ee!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
   .tz-phone-brand{display:block;font-weight:900;letter-spacing:-.05em;color:#8db7ff;font-size:19px}
   .th-mobile-title{font-size:14px!important;color:#c4d6f0!important}
   .th-mobile-menu{font-size:21px!important;border-radius:13px!important;min-width:46px!important}
   .tz-phone-dock{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));position:fixed;bottom:0;left:0;right:0;z-index:95;padding:9px 6px calc(9px + env(safe-area-inset-bottom));background:#0d1727f5;border-top:1px solid #334766;box-shadow:0 -12px 40px #0008;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
   .tz-phone-tab{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:55px;text-decoration:none!important;color:#a8bad4!important;font:600 10px system-ui!important;border-radius:13px}
   .tz-phone-tab-icon{font-size:24px;line-height:1;display:grid;place-items:center;width:45px;height:31px}
   .tz-phone-tab.is-active{color:#e7f1ff!important}
   .tz-phone-tab.is-active .tz-phone-tab-icon{background:#244b81;color:#a9cdff;border-radius:11px}
   .tz-phone-tab:focus-visible,.tz-phone-launch-card:focus-visible{outline:3px solid #8db7ff;outline-offset:2px}
   body[data-th-page] :is(.dashboard,.th-page-content,.finance-wrap,.admin-main){padding-left:14px!important;padding-right:14px!important;padding-bottom:30px!important}
   body[data-th-page] :is(.panel,.stat,.admin-card,.tile,.th-module-card){border-radius:18px!important;box-shadow:0 7px 24px #0002}
   body[data-th-page] :is(.dash-heading,.admin-hero,.finance-head){border-radius:18px!important;padding:18px!important}
   body[data-th-page] :is(.stats,.dash-grid,.th-module-grid,.portal-section-cards){grid-template-columns:minmax(0,1fr)!important}
   body[data-th-page] .stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
   body[data-th-page] .stat{padding:15px!important;min-width:0}
   body[data-th-page] :is(.panel,.workspace,.stat,.tile){min-width:0;overflow-wrap:anywhere}
   body[data-th-page] :is(.th-module-card,.workspace,.tile,a.stat){touch-action:manipulation}
   body[data-th-page] :is(.table-wrap,.history-table-wrap,.bk-table-wrap){overflow-x:auto;max-width:100%;-webkit-overflow-scrolling:touch}
   body[data-th-page] :is(input,textarea,select){font-size:16px!important}
   body[data-th-page] :is(button,a.th-nav-link){min-height:44px}
   body[data-th-page] .th-sidebar{padding-bottom:calc(24px + env(safe-area-inset-bottom))!important}
   .tz-phone-launch{display:block;margin-bottom:20px}
   .tz-phone-welcome{padding:23px 20px;border:1px solid #2c4b73;border-radius:22px;background:linear-gradient(130deg,#1d385c,#101c2e 75%);margin-bottom:13px}
   .tz-phone-welcome span{font-size:10px;letter-spacing:.15em;font-weight:800;color:#95bcf5}
   .tz-phone-welcome h1{font-size:29px;letter-spacing:-.045em;line-height:1.1;margin:9px 0;color:#f0f6ff}
   .tz-phone-welcome p{font-size:13px;color:#c0d0e5;margin:0}
   .tz-phone-launch-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
   .tz-phone-launch-card{display:flex;flex-direction:column;align-items:flex-start;gap:7px;padding:16px 14px;min-height:112px;border:1px solid #2a405f;border-radius:18px;background:linear-gradient(150deg,#1b2d46,#111b2b);text-decoration:none!important;box-sizing:border-box;color:#eef5ff!important}
   .tz-phone-launch-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#294b78;color:#b5d6ff;font-size:22px}
   .tz-phone-launch-card strong{font-size:15px;line-height:1.15}
   .tz-phone-launch-card small{font-size:11px;color:#9eb2ce;line-height:1.3}
   body[data-th-page="home"] .dash-heading{display:none!important}
  }
  @media(min-width:701px), (pointer:fine){.tz-phone-dock,.tz-phone-launch,.tz-phone-brand{display:none!important}}
  `;document.head.append(style);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
