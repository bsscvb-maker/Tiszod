/* Personal-only command center. Reads existing TisZod records without changing them. */
(() => {
 if(document.body.dataset.thPage!=='home')return;
 const main=document.querySelector('main.dashboard'),heading=main?.querySelector('.dash-heading');if(!heading)return;
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
 const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
 const command=el('section','personal-command');command.setAttribute('aria-label','Personal Command Center');
 const hero=el('header','pc-hero'),copy=el('div','pc-copy');copy.append(el('span','pc-eyebrow','TISZOD · PERSONAL WORKSPACE'),el('h1','','Personal Command Center'),el('p','','Your life at a glance. One place to keep moving forward.'));
 const health=el('div','pc-health');health.setAttribute('role','status');const healthLabel=el('small','','OVERALL PORTAL HEALTH'),healthValue=el('strong','','Checking'),healthDetail=el('span','','Verifying personal modules…');health.append(healthLabel,healthValue,healthDetail);hero.append(copy,health);
 const kpis=el('div','pc-kpis');const values={};
 const initialFacts={vehicles:['Service due: checking schedules…','Reading logs: checking register…'],cash:['Checking: waiting for saved balance','Savings: waiting for saved balance'],debt:['Add current balances in Finance','Review minimum payments and due dates'],tasks:['Critical priorities: checking tracker…','Waiting on others: checking tracker…']};
 const facts=(id,lines)=>{values[id].bullets.replaceChildren(...lines.map(text=>el('li','',text)))};
 for(const [id,label,icon,detail,href]of [['vehicles','ACTIVE VEHICLES','▰','From your vehicle register','vehicles.html'],['cash','CASH ON HAND','$','Posted checking + savings balances','finance.html'],['debt','TOTAL DEBT','↘','2026 creditor balances','bk.html'],['tasks','ACTIVE TASKS','✓','Your personal task tracker','plan-tracker.html']]){const a=el('a','pc-kpi');a.href=href;const symbol=el('span','pc-kpi-icon',icon),title=el('span','pc-kpi-label',label),value=el('strong','','—'),note=el('small','',detail);const bullets=el('ul','pc-kpi-facts');values[id]={value,note,bullets};facts(id,initialFacts[id]);a.append(symbol,title,value,note,bullets);kpis.append(a)}
 const goal=el('section','pc-goal');goal.setAttribute('aria-label','$100 bank balance goal');const goalHead=el('div','pc-goal-head');goalHead.append(el('div','', 'YOUR NEXT WIN'),el('h2','','Keep $100 in checking'),el('strong','pc-goal-target','$100.00 target'));const track=el('div','pc-goal-track');track.setAttribute('role','progressbar');track.setAttribute('aria-label','Checking balance toward $100');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuetext','Balance not loaded');const fill=el('span');track.append(fill);const goalNote=el('div','pc-goal-note','Sign in to compare your saved posted checking balance with this goal.');goal.append(goalHead,track,goalNote);command.append(hero,kpis,goal);heading.replaceWith(command);
 const originalStats=main.querySelector('.stats');if(originalStats){const details=el('details','pc-fleet-details'),summary=el('summary','','Vehicle register details');details.append(summary,originalStats);main.querySelector('.th-lower-dashboard')?.prepend(details)}
 const arts={ 'interview.html':['interview',''],'identification.html':['identification',''],'education.html':['education',''],'plan-tracker.html':['tasks','YOUR NEXT STEP'],'finance.html':['finance','MONEY & MOMENTUM'],'pets.html':['pets','HONEY & HARLEY'],'freebirds.html':['freebirds','THE COLLECTION'],'black-mild.html':['black-mild','YOUR DAILY RECORDS'],'vehicles.html':['vehicles','THE GARAGE'],'equipment.html':['equipment','TOOLS FOR THE JOB'],'watercraft.html':['watercraft','ON THE WATER'],'admin.html':['admin','BEHIND THE SCENES']};
 const cards=[...main.querySelectorAll('.th-module-card')];cards.forEach(card=>{const path=card.getAttribute('href'),[art,caption]=arts[path]||['admin','PERSONAL MODULE'];const image=card.querySelector('.th-module-art');if(image){const ext={tasks:'webp',finance:'webp',admin:'webp','black-mild':'webp',equipment:'jpeg'}[art]||'jpg';image.style.backgroundImage='url("command-photos/'+art+'.'+ext+'?v=20261029-distinct-cards")';image.replaceChildren()}const badge=el('span','pc-module-status','CHECKING');badge.title='Checking that this module page is reachable';card.append(badge);card.dataset.modulePath=path});
 const bkCard=cards.find(c=>c.getAttribute('href')==='bk.html');if(bkCard){const image=bkCard.querySelector('.th-module-art');if(image){image.style.backgroundImage='url("alliance-law-logo.svg")';image.style.backgroundSize='contain';image.style.backgroundPosition='center';image.style.backgroundRepeat='no-repeat';image.style.backgroundColor='#fff';}}
 async function checkModules(){healthValue.textContent='Checking';health.dataset.state='checking';let available=0;const operational=cards.filter(c=>c.dataset.modulePath!=='admin.html');await Promise.all(cards.map(async card=>{const badge=card.querySelector('.pc-module-status');try{const r=await fetch(card.dataset.modulePath,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();badge.textContent='LIVE';badge.dataset.state='live';badge.title='Module page reachable. Private records load after sign-in.';if(card.dataset.modulePath!=='admin.html')available++}catch{badge.textContent='CHECK';badge.dataset.state='error';badge.title='Module page could not be reached'}}));health.dataset.state=available===operational.length?'live':'error';healthValue.textContent=available===operational.length?'Pages reachable':'Needs attention';healthDetail.textContent=available+' / '+operational.length+' modules reachable · Workbook '+(document.querySelector('.th-connection.connected')?'connected':'sign-in required')}
 async function loadMoney(){const read=async name=>{try{const rows=await thValues("'"+name+"'!A1:B20",'UNFORMATTED_VALUE');const data=Object.fromEntries(rows);const raw=data['Bank current balance'];return {value:raw!==undefined&&raw!==''&&Number.isFinite(Number(raw))?Number(raw):null,at:[data['Last successful bank sync'],data['Manual current balance updated']].filter(x=>x&&Number.isFinite(Date.parse(x))).sort((a,b)=>Date.parse(b)-Date.parse(a))[0]||''}}catch{return {value:null}}};const [checking,savings]=await Promise.all([read('Personal Finance Settings'),read('Capital One Savings Settings')]);facts('cash',['Checking: '+(checking.value!==null?money(checking.value)+' · '+stamp(checking.at):'unavailable'),'Savings: '+(savings.value!==null?money(savings.value)+' · '+stamp(savings.at):'unavailable')]);const balances=[checking.value,savings.value].filter(x=>x!==null);values.cash.value.textContent=balances.length===2?money(balances.reduce((a,b)=>a+b,0)):'—';values.cash.note.textContent=balances.length===2?'Current checking + savings · Saved balances':balances.length?'Total unavailable · One account missing':'Saved bank balances unavailable';if(checking.value!==null){const p=Math.min(100,Math.max(0,checking.value));fill.style.width=p+'%';track.setAttribute('aria-valuenow',String(p));track.setAttribute('aria-valuetext',money(checking.value)+' posted balance toward $100');goalNote.textContent=money(checking.value)+' current checking balance as of '+stamp(checking.at)+' · '+(checking.value>=100?'Goal met — keep the buffer.':money(Math.max(0,100-checking.value))+' to reach your $100 buffer.')+' Pending activity can change what you can spend.';goal.dataset.met=String(checking.value>=100)}else goalNote.textContent='Checking balance not available yet. Open Finance to connect or update it.';if(balances.length)healthDetail.textContent=healthDetail.textContent.replace('sign-in required','connected')}
 async function loadTasks(){try{const r=await fetch('https://script.google.com/macros/s/AKfycbx9nruVEhEGyygWwdAknNRRvDCC7vIVnTxtWUq44_NCqoV9t3sDhAVP3CMmEAsbYA2XTQ/exec?action=getAll',{signal:AbortSignal.timeout(18000),cache:'no-store'});let d=await r.json();d=d.data||d;if(!Array.isArray(d.tasks))throw Error();const active=d.tasks.filter(t=>t.status!=='done'&&t.tier!=='parked');values.tasks.value.textContent=active.length;facts('tasks',[active.filter(t=>{let p;const notes=String(t.notes||''),at=notes.lastIndexOf('\n[TISZOD_TASKV2]');if(at>=0)try{p=JSON.parse(notes.slice(at+'\n[TISZOD_TASKV2]'.length)).priority}catch{}return (p||t.tier)==='tier1'}).length+' critical-priority tasks',active.filter(t=>t.status==='waiting').length+' tasks waiting on others']);values.tasks.note.textContent='Ready, working, and waiting tasks'}catch{values.tasks.value.textContent='—';values.tasks.note.textContent='Task service unavailable · Open tracker';facts('tasks',['Open tracker to review priorities','Check waiting tasks for follow-up'])}}

 const stamp=value=>{const d=new Date(value);return value&&!Number.isNaN(d.getTime())?d.toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',timeZoneName:'short'}):'date unavailable'};
 for(const id of Object.keys(values)){const n=el('small','pc-checked','Not checked yet');values[id].checked=n;values[id].note.after(n);}
 function dashboardAssets(D){const categories=['Cars','Trucks','SUVs','Vans','Classic','Motorcycles','Boats','Personal Watercraft','Trailers','RVs','Golf Carts','ATVs & Quads','Scooters & Mopeds','Mini Bikes','Tractors','Yard Equipment','Outdoor Equipment','Shop Equipment','Bicycles'];const workspaceCategories=categories.filter(c=>!['Tractors','Yard Equipment','Outdoor Equipment','Shop Equipment','Boats','Personal Watercraft'].includes(c));const belongsHere=a=>workspaceCategories.includes(a.category)||a.category==='Unfiled';function normalizeCategory(p){
 const source=String(p.category||'').toLowerCase(), name=clean([p.make,p.model,p.name].filter(Boolean).join(' '));
 if(p.category==='Unfiled')return 'Unfiled';
 if(categories.includes(p.category))return p.category; // The saved section takes priority over automatic guesses.
 // Identify distinctive models first, even when an old profile has a valid but incorrect section.
 if(/seadoo|jetski|personalwatercraft|yamaha.*(lst|waverunner|vx|fx)|kawasaki.*(jf650|jetski|stx)/.test(name)||/jet ski|jetski|personal watercraft/.test(source))return 'Personal Watercraft';
 if(/sienna|caravan|townandcountry|pacifica|odyssey|sedona|carnival|transit|sprinter|promaster|expressvan|savana|astrovan|van$/.test(name))return 'Vans';
 if(/sailboat|pontoon|speedboat|motorboat|bayliner|bowrider/.test(name))return 'Boats';
 if(/1999chevrolettahoe/.test(name)||String(p.year)==='1977'||/classic|project|antique/.test(source))return 'Classic';
 if(/4runner|aspen|tahoe|enclave|suburban|trailblazer|navigator|tracker|highlander|cherokee|explorer|expedition/.test(name))return 'SUVs';
 if(/ram3500|fordf150|fordf250|fordf350|silverado|pickup|chevrolets10|toyotatacoma/.test(name))return 'Trucks';
 if(/civic|mustang|sedan|coupe/.test(name))return 'Cars';
 if(categories.includes(p.category))return p.category;
 if(/pressurewasher|powerwasher/.test(name))return 'Outdoor Equipment';
 if(/aircompressor|compressor/.test(name))return 'Shop Equipment';
 if(/weedeater|weedwacker|brushcutter|trimmer|blower|chainsaw|mower/.test(name)&&!/motorcycle/.test(source))return 'Yard Equipment';
 if(/classic|project|antique/.test(source)||String(p.year)==='1977'||name.includes('1999chevrolettahoe'))return 'Classic';
 if(/boat/.test(source))return 'Boats';
 if(/trailer/.test(source)&&!name.includes('keystone'))return 'Trailers';
 if(/\brv\b|camper|motorhome/.test(source)||name.includes('keystone'))return 'RVs';
 if(source==='cars & suvs'&&/civic|mustang|sedan|coupe/.test(name))return 'Cars';
 if(/truck|suv|cars & suvs/.test(source)){
  if(/4runner|aspen|tahoe|enclave|suburban|suv|highlander|cherokee|explorer|expedition/.test(name))return 'SUVs';
  if(/ram|f150|f250|f350|silverado|pickup|truck/.test(name))return 'Trucks';
  return source.includes('truck')?'Trucks':'SUVs';
 }
 if(/small engine/.test(source))return 'Outdoor Equipment';
 const match=categories.find(x=>x.toLowerCase()===source);
 if(match)return match;
 if(/car/.test(source))return 'Cars';
 return 'Shop Equipment';
}
const registry=D.registry||[], profiles=D.profiles||[];
function matchingProfile(r){
 const vin=clean(r.vin), name=clean(r.make+' '+r.model);
 return profiles.find(p=>vin&&clean(p.vin)===vin)||profiles.find(p=>{
  const pn=clean(p.make+' '+p.model);
  if(clean(r.make)==='ram'&&name.includes('3500'))return clean(p.make)==='ram'&&pn.includes('3500');
  if(clean(r.make)==='westbrook')return clean(p.make)==='stirling';
  return clean(p.make)===clean(r.make)&&String(p.year)===String(r.year)&&[clean(r.model).slice(0,5),clean(p.model).slice(0,5)].some(t=>t.length>=4&&name.includes(t)&&pn.includes(t));
 });
}
const used=new Set(), deletedProfiles=profiles.filter(p=>clean(p.status)==='deleted');
const primary=registry.map((r,i)=>{const p=matchingProfile(r);if(p)used.add(p);if(p&&clean(p.status)==='deleted')return null;return {...p,...r,status:p?.status||r.status||'Active',category:p?.category?normalizeCategory(p):normalizeCategory(r),id:'r'+i,photo:p?.photo||''}}).filter(Boolean);
const extras=profiles.filter(p=>!used.has(p)&&clean(p.status)!=='deleted').map((p,i)=>({...p,status:p.status||'Active',category:normalizeCategory(p),id:'p'+i}));
const listed=[...(D.activeFleet||[]),...(D.inactiveFleet||[])];
function sameListedAsset(a,b){
 const am=clean(a.make),bm=clean(b.make),an=clean(a.model),bn=clean(b.model);
 if((am==='stirling'||am==='westbrook'||an.includes('stirling'))&&(bm==='stirling'||bm==='westbrook'||bn.includes('stirling')))return true;
 if(am!==bm&&!(am==='harleydavidson'&&bm==='harleydavidson'))return false;
 if(am==='ram'&&an.includes('3500')&&bn.includes('3500'))return true;
 if(am==='trek'&&bm==='trek'&&an.includes('7200')&&bn.includes('7200'))return true;
 if(am==='harleydavidson'&&bm==='harleydavidson'&&String(a.year)===String(b.year)&&((an.includes('ultra')&&bn.includes('ultra'))||(an.includes('roadglide')&&bn.includes('roadglide'))))return true;
 if(am==='xpro'&&an==='200'&&bn.includes('jaguar200'))return true;
 return String(a.year)===String(b.year)&&(an===bn||an.length>=4&&bn.includes(an)||bn.length>=4&&an.includes(bn));
}
function listedCategory(a){const n=clean(a.make+' '+a.model);
 if(/tahoe/.test(n))return 'Classic';
 if(/seadoo|yamaha.*lst|kawasaki.*jf650/.test(n))return 'Personal Watercraft';
 if(/sailboat/.test(n))return 'Boats';
 if(/sienna|caravan|townandcountry|pacifica|odyssey|sedona|carnival|transit|sprinter|promaster|expressvan|savana|astrovan/.test(n))return 'Vans';
 if(/mango.*dingo/.test(n))return 'Golf Carts';
 if(/taotao.*moped/.test(n))return 'Scooters & Mopeds';
 if(/harley|kawasaki|honda.*cx500/.test(n))return 'Motorcycles';
 if(/ram|f150|s10|tacoma/.test(n))return 'Trucks';
 if(/aspen|trailblazer|navigator|tracker/.test(n))return 'SUVs';
 if(/stirling/.test(n))return 'Trailers';
 if(/keystone/.test(n))return 'RVs';
 if(/trek/.test(n))return 'Bicycles';
 return 'Cars';
}
const assets=primary.concat(extras);
for(const [i,item] of listed.entries())if(!deletedProfiles.some(p=>sameListedAsset(p,item))&&!assets.some(a=>sameListedAsset(a,item)))assets.push({...item,status:item.status||'Active',category:listedCategory(item),id:'f'+i});
// Correct legacy category values for known vehicles before section filtering.
for(const a of assets){const n=clean([a.make,a.model].join(' '));if(/harleydavidson|roadglide|fltrk|flhtcui|electraglide|ultraclassic/.test(n))a.category='Motorcycles';else if(/ram3500|fordf150|fordf250|fordf350|chevrolets10|silverado|toyotatacoma/.test(n))a.category='Trucks';else if(/fordmustang|hondacivic/.test(n))a.category='Cars';}
assets.splice(0,assets.length,...assets.filter(belongsHere));

return assets;}
 async function loadFleet(){
  const D=await thFleetData(),assets=dashboardAssets(D),active=assets.filter(a=>clean(a.status)==='active');
  values.vehicles.value.textContent=active.length;values.vehicles.note.textContent='Active items in your Vehicles directory';
  document.getElementById('activeCount').textContent=active.length;
  document.getElementById('inactiveCount').textContent=assets.filter(a=>clean(a.status)==='inactive').length;
  document.getElementById('vehicleCardCount').textContent=active.length+' active · '+assets.length+' total';
  const alias={'ram3500':'3500 DRW','fordmustang':'Mustang','hondacivic':'Civic','harleydavidsonroadglide':'FLTRK','harleydavidsonultra':'FLHTCUI','keystonebullet':'Bullet','fordf150':'F150','stirlingtrailer':'Stirling'};
  const logs=active.filter(a=>{const name=clean(a.make+' '+a.model),byAlias=Object.entries(alias).find(([key])=>name.startsWith(key));const match=D.vehicles.filter(m=>String(m.year)===String(a.year)).filter(m=>{const k=clean(m.name);return k===name||byAlias&&k===clean(byAlias[1])||k&&name.includes(k)}).sort((a,b)=>b.sheetRow-a.sheetRow)[0];const r=match?.currentMileage??a.reportOdometer;return r!==null&&r!==undefined&&String(r).trim()!==''&&Number.isFinite(Number(String(r).replace(/,/g,'')))}).length;
  document.getElementById('trackedCount').textContent=logs;
  let due=null;try{const rows=await thValues("'Portal Service Schedules'!A1:I400"),day=new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'}),limit=new Date(day+'T00:00:00Z');limit.setUTCDate(limit.getUTCDate()+30);due=active.filter(a=>{const name=clean([a.make,a.model,a.name].filter(Boolean).join(' ')),key=scheduleKeys.find(([p])=>p.test(name))?.[1];return key&&rows.slice(1).some(r=>{const d=dueDate(r[6]);return r[0]===key&&r[2]&&d&&d<=limit})}).length}catch{}
  document.getElementById('missingCount').textContent=due===null?'—':due;
  facts('vehicles',[due===null?'Service dates unavailable':due+' active vehicles with service due / within 30 days',logs+' of '+active.length+' active vehicles with readings']);
 }
 async function loadDebt(){
  try{const rows=await thValues("'BK Project Items'!A1:N2000",'UNFORMATTED_VALUE');if(rows[0]?.[0]!=='ID')throw Error();const records=rows.slice(1).filter(r=>r[0]&&r[1]==='Creditor'&&!['Archived','Deleted'].includes(r[3])&&String(r[12]||'2026')==='2026'),data=records.map(r=>{try{return JSON.parse(r[11]||'{}')}catch{return {}}}),known=data.filter(d=>typeof d.balance==='number'&&Number.isFinite(d.balance)),unknown=data.length-known.length;values.debt.value.textContent=known.length?money(known.reduce((sum,d)=>sum+d.balance,0)):'—';values.debt.note.textContent='2026 recorded creditor balances'+(unknown?' · Partial total':'');facts('debt',[known.filter(d=>d.balance!==0).length+' accounts with reported amounts',unknown?unknown+' balances unknown · Excluded':'Includes hidden/entered rows · Excludes archived/deleted']);}
  catch{values.debt.value.textContent='—';values.debt.note.textContent='Creditor records unavailable';facts('debt',['Unable to refresh debt total','Open BK to review creditors'])}
 }
 window.thDashboardAssets=dashboardAssets;
 const start=window.thStart;let refreshing=null;
 async function refresh(){
  if(refreshing)return refreshing;
  refreshing=(async()=>{
   await Promise.allSettled([typeof start==='function'?start():Promise.resolve(),...[[loadMoney,'cash'],[loadTasks,'tasks'],[loadDebt,'debt']].map(async([fn,id])=>{try{await fn();values[id].checked.textContent='Checked '+stamp(new Date().toISOString())}catch{values[id].value.textContent='—';values[id].checked.textContent='Refresh failed · '+stamp(new Date().toISOString())}})]);
   try{await loadFleet();values.vehicles.checked.textContent='Checked '+stamp(new Date().toISOString())}catch{values.vehicles.value.textContent='—';values.vehicles.checked.textContent='Refresh failed · '+stamp(new Date().toISOString())}
  })();try{await refreshing}finally{refreshing=null}
 }
 window.thStart=refresh;
 const refreshIfConnected=()=>{if(!document.hidden&&typeof thAuthorized==='function'&&thAuthorized())refresh()};
 setInterval(refreshIfConnected,30000);window.addEventListener('focus',refreshIfConnected);document.addEventListener('visibilitychange',refreshIfConnected);window.addEventListener('tiszod-drive-books-connected',refreshIfConnected);
 checkModules();
})();
