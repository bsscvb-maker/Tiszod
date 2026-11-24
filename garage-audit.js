/* The Garage audit journal lives in the same private workbook as the assets. */
window.TiszodGarageAudit = (() => {
 const journal = 'Garage Audit Log';
 const fields = {
  'Mileage-2025.10.16': ['','Asset','Year','Tracking start','Starting reading','Current reading'],
  'Portal Asset Profiles': ['Asset ID','Name','Year','Make','Model','Color','', 'Section','Status','','Starting reading','VIN / serial number','Vehicle number','Plate','Renewal','Engine','Transmission','Tire size','','','','','','Photo file','Photo link','','','Specifications and notes','Acquired date'],
  'Vehicle Registry': [],
  'Portal Service History': ['Asset','Entry ID','Service date','Service item','Service reading','Cost','Notes'],
  'Portal Service Schedules': ['Asset','Name','Service item','Frequency','Last service date','Last service reading','Next due date','Next due reading','Notes'],
  'Portal Vehicle Documents': ['Document ID','Asset','Vehicle','Category','Document name','Link','File ID','Source folder','Source path','File type','Notes','Kind','Status','','Alternate copies'],
  'TisZod Recall Selection': ['Recall selection']
 };
 const headers = ['Time (UTC)','Asset key','Asset','Area','Location','Field','Before','After','Change','State','Actor','Operation ID'];
 let resolveAsset = () => null;
 let sheetPending;
 let actorToken, actorPending;
 const columns = text => [...text].reduce((n,c) => n*26+c.charCodeAt(0)-64,0)-1;
 const nameOf = a => [a.year,a.make,a.model].filter(Boolean).join(' ');
 const keyOf = a => String(a.reportId || (a.profileRow ? 'profile-'+a.profileRow : 'item-'+nameOf(a).toLowerCase().replace(/[^a-z0-9]/g,'')));
 const encoded = value => JSON.stringify(value ?? '');
 const rangeOf = (sheet, range) => "'" + sheet.replace(/'/g,"''") + "'!" + range;
 const delta = (label,before,after) => /^(Starting|Current) reading$/.test(label) && before !== '' && after !== '' && [before,after].every(x => Number.isFinite(Number(x))) ? Number((Number(after)-Number(before)).toFixed(6)) : '';
 const actor = () => {
  if(actorToken !== thToken){
   actorToken = thToken;
   actorPending = fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName)',{headers:{Authorization:'Bearer '+thToken}})
    .then(r => r.ok ? r.json() : {}).then(r => r.user?.emailAddress || r.user?.displayName || '').catch(() => '');
  }
  return actorPending;
 };
 async function findJournal(){
  const meta = await thSheets('?fields=sheets(properties(sheetId,title))');
  return meta.sheets.find(s => s.properties.title === journal)?.properties;
 }
 function ensureJournal(){
  if(!sheetPending)sheetPending = (async() => {
   const existing = await findJournal();
   if(existing)return existing;
   const sheetId = 1900372246;
   const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+TH_SHEET_ID+':batchUpdate',{
    method:'POST', headers:{Authorization:'Bearer '+thToken,'Content-Type':'application/json'},
    body:JSON.stringify({requests:[
     {addSheet:{properties:{sheetId,title:journal,gridProperties:{columnCount:12,frozenRowCount:1}}}},
     {updateCells:{start:{sheetId,rowIndex:0,columnIndex:0},rows:[{values:headers.map(stringCell)}],fields:'userEnteredValue'}}
    ]})
   });
   if(response.ok)return {sheetId,title:journal};
   const concurrent = await findJournal();
   if(concurrent)return concurrent;
   throw Error('Could not initialize the Garage Audit Log.');
  })().catch(error => {sheetPending=null;throw error});
  return sheetPending;
 }
 function stringCell(value){return {userEnteredValue:{stringValue:String(value ?? '')}}}
 function describe(sheet, range, row, oldRow){
  const a = resolveAsset(sheet,range,row,oldRow);
  if(a)return {key:keyOf(a),name:nameOf(a)};
  if(sheet==='Portal Vehicle Documents')return {key:row[1]||oldRow[1]||'',name:row[2]||oldRow[2]||'Unassigned documents'};
  if(sheet==='Portal Asset Profiles')return {key:'item-'+String(row[1]||oldRow[1]||'').toLowerCase().replace(/[^a-z0-9]/g,''),name:row[1]||oldRow[1]||'Garage'};
  return {key:'',name:'Garage'};
 }
 async function decorate(changes,state){
  const time = new Date().toISOString(), user = await actor(), id = crypto.randomUUID();
  return changes.map(({key,name,sheet,range,label,before,after}) => [
   time,key,name,sheet,range,label,encoded(before),encoded(after),delta(label,before,after),state,user,id
  ]);
 }
 function changesFor(update, oldRows){
  const {sheet,range,values} = update;
  const base = range.match(/^([A-Z]+)(\d+)/i);
  if(!base)return [];
  const start = columns(base[1].toUpperCase());
  return values.flatMap((row,r) => row.flatMap((after,c) => {
   const col = start+c, before = oldRows[r]?.[c] ?? '';
   if(after == null || String(after)===String(before) ||
     (sheet==='Portal Asset Profiles'&&col===29) || (sheet==='Portal Vehicle Documents'&&col===13) ||
     (sheet==='Mileage-2025.10.16'&&(col===0||col>=6)))return [];
   const target = describe(sheet,range,row,oldRows[r]||[]);
   return [{...target,sheet,range,label:fields[sheet][col]||'Column '+(col+1),before,after}];
  }));
 }
 let queue = Promise.resolve();
 function serialize(work){
  const run = () => navigator.locks ? navigator.locks.request('tiszod-garage-audit',work) : work();
  const next = queue.then(run,run);
  queue = next.catch(()=>{});
  return next;
 }
 async function record(changes, save){
  if(!changes.length)return save();
  await ensureJournal();
  const entries = await decorate(changes,'Unconfirmed');
  const first = await thAppendRows(journal,entries,'RAW');
  if(!first)throw Error('The Garage audit entry could not be confirmed. The change was stopped.');
  const result = await save();
  try{
   await thWriteRanges([{sheet:journal,range:'J'+first+':J'+(first+entries.length-1),values:entries.map(()=>['Saved'])}],'RAW');
  }catch(error){
   throw Error('The Garage change was saved. Its audit entry is marked Unconfirmed. Refresh before retrying. '+error.message);
  }
  return result;
 }
 function update(updates, save){
  const tracked = updates.filter(u => Object.hasOwn(fields,u.sheet) && !(u.sheet==='Portal Asset Profiles'&&/^AD\d+$/.test(u.range)));
  if(!tracked.length)return save();
  return serialize(async() => {
   const old = await Promise.all(tracked.map(u => thValues(rangeOf(u.sheet,u.range),'FORMULA')));
   return record(tracked.flatMap((u,i) => changesFor(u,old[i])),save);
  });
 }
 function append(sheet, rows, save){
  if(!Object.hasOwn(fields,sheet))return save();
  return serialize(() => record(rows.flatMap(values => changesFor({sheet,range:'A1',values:[values]},[]).map(change => ({...change,range:'New entry'}))),save));
 }
 async function fuelRequest(vehicle, before, after, oldReading, newReading, labels){
  const target = {key:vehicle.profileRow?'profile-'+vehicle.profileRow:'',name:vehicle.name};
  const changes = after.flatMap((value,i) => String(value??'')===String(before?.[i]??'') ? [] :
   [{...target,sheet:'Portal Fuel Log',range:'Fuel entry',label:labels[i],before:before?.[i]??'',after:value??''}]);
  if(newReading!==undefined)changes.push({...target,sheet:'Mileage-2025.10.16',range:'Fuel entry',label:'Current reading',before:oldReading??'',after:newReading});
  if(!changes.length)return null;
  const {sheetId}=await ensureJournal();
  const entries=await decorate(changes,'Saved');
  return {appendCells:{sheetId,rows:entries.map(row=>({values:row.map(stringCell)})),fields:'userEnteredValue'}};
 }
 function show(panel, asset, baseline){
  const heading=document.createElement('h2');
  heading.textContent=asset?'History':'Garage Audit Log';
  const label=document.createElement('label');
  label.textContent='Search history ';
  const search=document.createElement('input');
  search.type='search';
  label.append(search);
  const status=document.createElement('p');
  status.setAttribute('role','status');
  status.textContent='Loading history…';
  const output=document.createElement('div');
  output.style.overflowX='auto';
  panel.replaceChildren(heading,label,status,output);
  const names = asset ? new Set([keyOf(asset),'profile-'+asset.profileRow,'item-'+nameOf(asset).toLowerCase().replace(/[^a-z0-9]/g,'')]) : null;
  const text = value => {try{return String(JSON.parse(value)??'')}catch{return value||''}};
  const areas={'Mileage-2025.10.16':'Odometer','Portal Asset Profiles':'Details','Vehicle Registry':'Registry','Portal Service History':'Service Log','Portal Service Schedules':'Service Schedule','Portal Vehicle Documents':'Documents','Portal Fuel Log':'Fuel History','TisZod Recall Selection':'Recall report'};
  async function load(){
   if(!thAuthorized()){status.textContent='Connect the private workbook to view Garage history.';return}
   try{
    const all=await findJournal()?await thValues(rangeOf(journal,'A2:L')):[];
    const rows=all.filter(r => r[0] && (!asset || (r[1]?names.has(r[1]):r[2]===nameOf(asset)))).sort((a,b)=>b[0].localeCompare(a[0]));
    function paint(){
     const query=search.value.trim().toLowerCase();
     const table=document.createElement('table');
     const labels=['Date and time','Asset','Area','Field','Before','After','Change','Status','Changed by'];
     const header=table.createTHead().insertRow();
     for(const value of labels){const cell=document.createElement('th');cell.scope='col';cell.textContent=value;header.append(cell)}
     const body=table.createTBody();
     for(const r of rows){
      const values=[new Date(r[0]).toLocaleString(),r[2],areas[r[3]]||r[3],r[5],text(r[6]),text(r[7]),Number(r[8])>0?'+'+r[8]:r[8]||'',r[9],r[10]];
      if(query&&!values.join(' ').toLowerCase().includes(query))continue;
      const row=body.insertRow();
      for(const value of values){const cell=row.insertCell();cell.textContent=value??'';cell.style.overflowWrap='anywhere';cell.style.maxWidth='25rem'}
     }
     output.replaceChildren(...(body.rows.length?[table]:[]));
     status.textContent=body.rows.length?body.rows.length+' recorded changes':query?'No matching changes.':asset&&baseline!=null?'No changes recorded yet. Current reading: '+baseline+'.':'No changes recorded yet.';
    }
    search.oninput=paint;
    paint();
   }catch(error){status.textContent='Could not load Garage history. '+error.message}
  }
  load();
 }
 return {configure:fn=>{resolveAsset=fn},update,append,fuelRequest,show};
})();
