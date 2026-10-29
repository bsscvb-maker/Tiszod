/* Private workbook records. No receipt content or credentials are stored in source. */
(()=>{'use strict';
 const SHEET='Portal Fuel Log',HEADERS=['ID','Vehicle key','Vehicle','Date','Odometer','Gallons','Price per gallon','Total','Full tank','Station','Location','Notes','Receipt number','Receipt photo','Odometer photo','Transaction ID','Created','State','Review flag'];
 const val=v=>({userEnteredValue:typeof v==='number'?{numberValue:v}:{stringValue:String(v??'')}});
 const row=e=>[e.id,e.vehicle,e.name,e.date,e.odo,e.gallons,e.price,e.total,e.full,e.station,e.location,e.notes,e.receipt,e.receiptPhoto,e.odoPhoto,e.transactionId,e.created,e.deleted?'Deleted':'Active',e.flag?'Yes':''];
 const decode=(r,i)=>({row:i+2,id:r[0],vehicle:r[1],name:r[2],date:r[3],odo:FuelCore.number(r[4]),gallons:FuelCore.number(r[5]),price:FuelCore.number(r[6]),total:FuelCore.number(r[7]),full:r[8]||'unknown',station:r[9]||'',location:r[10]||'',notes:r[11]||'',receipt:r[12]||'',receiptPhoto:r[13]||'',odoPhoto:r[14]||'',transactionId:r[15]||'',created:r[16]||'',deleted:r[17]==='Deleted',flag:r[18]==='Yes'});
 async function request(path,body){
  if(!thAuthorized())throw Error('Sign in to Tiszod again before saving.');
  const response=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+TH_SHEET_ID+path,{method:'POST',headers:{Authorization:'Bearer '+thToken,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json();if(!response.ok)throw Error(result.error?.message||'The workbook could not be saved.');return result;
 }
 async function meta(){return thSheets('?fields=sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))');}
 async function read(){const m=await meta(),sheet=m.sheets.find(s=>s.properties.title===SHEET);if(!sheet)return {meta:m,sheet:null,entries:[]};return {meta:m,sheet:sheet.properties,entries:(await thValues("'"+SHEET+"'!A2:S5000")).map((r,i)=>decode(r,i)).filter(e=>e.id)};}
 async function ensure(){let state=await read();if(state.sheet)return state;try{await request(':batchUpdate',{requests:[{addSheet:{properties:{title:SHEET,gridProperties:{rowCount:1000,columnCount:19,frozenRowCount:1}}}}]});}catch(error){state=await read();if(!state.sheet)throw error;}state=await read();return state;}
 async function transactions(){return (await thValues("'Personal Finance Transactions'!A2:O5000")).map((r,i)=>({row:i+2,r})).filter(x=>x.r[0]);}
 function legacy(vehicle){
  const spec=(window.FUEL_LEGACY||{})[vehicle.key];if(!spec)return [];
  let data=spec.entries;try{const stored=JSON.parse(localStorage.getItem(spec.storage)||'null');if(Array.isArray(stored))data=stored;}catch{}
  return data.map(x=>spec.compact&&x.d?{date:x.d,odo:x.o,gallons:x.g,price:x.p,total:x.t,full:x.partial?'no':'yes',flag:!!x.flag}:x).map((x,i)=>({id:'import-'+vehicle.key+'-'+x.date+'-'+x.odo,vehicle:vehicle.key,name:vehicle.name,date:x.date,odo:x.odo,gallons:x.gallons,price:x.price,total:x.total,full:x.full||'yes',station:x.station||'Historical import',notes:x.notes||'',flag:!!x.flag,created:'Historical import'})).filter(e=>/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&Number.isFinite(e.odo)&&e.gallons>0);
 }
 function merge(vehicle,cloud){const all=cloud.filter(e=>e.vehicle===vehicle.key),known=new Set(all.map(e=>e.date+'|'+e.odo));return [...all.filter(e=>!e.deleted),...legacy(vehicle).filter(e=>!known.has(e.date+'|'+e.odo))];}
 async function history(vehicle){const state=await read();return merge(vehicle,state.entries);}
 async function upload(file,label,id){
  if(!file)return '';if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('Choose a JPG, PNG, or WebP image.');if(file.size>15*1024*1024)throw Error('Choose a photo under 15 MB.');
  const boundary='fuel-'+FuelCore.uuid(),metadata={name:label+' '+id+' '+file.name,appProperties:{tiszodFuelId:id}};
  const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n','--'+boundary+'\r\nContent-Type: '+file.type+'\r\n\r\n',file,'\r\n--'+boundary+'--'],{type:'multipart/related; boundary='+boundary});
  const response=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',{method:'POST',headers:{Authorization:'Bearer '+thToken},body});const result=await response.json();if(!response.ok||!result.id)throw Error(result.error?.message||'The photo could not be saved.');return result.webViewLink||'https://drive.google.com/file/d/'+result.id+'/view';
 }
 const update=(sheetId,rowIndex,startColumnIndex,values)=>({updateCells:{range:{sheetId,startRowIndex:rowIndex,endRowIndex:rowIndex+1,startColumnIndex,endColumnIndex:startColumnIndex+values.length},rows:[{values:values.map(val)}],fields:'userEnteredValue'}});
 async function save(entry,vehicle,transactionRow){
  FuelCore.validate(entry);const state=await ensure(),tx=await transactions();
  const already=state.entries.find(x=>x.id===entry.id);if(already&&!entry.editing)return {entry:already,recovered:true};
  const duplicate=state.entries.find(x=>!x.deleted&&x.vehicle===entry.vehicle&&x.id!==entry.id&&x.date===entry.date&&Math.abs(x.odo-entry.odo)<.05);
  if(duplicate)throw Error('This vehicle already has a fuel entry at that date and reading. Open its fuel history to edit it.');
  const candidates=FuelCore.candidates(entry,tx),prior=entry.transactionId?tx.find(t=>t.r[0]===entry.transactionId):null;
  let match=transactionRow?tx.find(x=>x.row===Number(transactionRow)):prior;
  if(transactionRow&&!candidates.some(x=>x.row===Number(transactionRow))&&Number(transactionRow)!==prior?.row)throw Error('The selected bank transaction changed. Review the match again.');
  if(!match&&candidates.length)throw Error('A matching transaction now exists. Review and link it before saving.');
  if(prior&&!String(prior.r[0]).startsWith('fuel-tx-')&&Math.abs(FuelCore.number(prior.r[8])-entry.total)>.005)throw Error('The total must match the linked bank transaction. Review it in Finance first.');
  if(match&&match.r[6]&&match.r[6]!==entry.name)throw Error('That transaction is linked to another vehicle. Review it in Finance first.');
  entry.transactionId=match?.r[0]||'fuel-tx-'+entry.id;entry.created=already?.created||new Date().toISOString();
  const notes=['Fuel receipt '+(entry.receipt||''),entry.gallons+' gal @ $'+entry.price.toFixed(3),entry.odo.toLocaleString()+' mi',entry.location,entry.notes,entry.receiptPhoto&&'Receipt: '+entry.receiptPhoto,entry.odoPhoto&&'Odometer: '+entry.odoPhoto,'Fuel ID: '+entry.id].filter(Boolean).join(' · ');
  const finance=state.meta.sheets.find(s=>s.properties.title==='Personal Finance Transactions')?.properties;
  const mileage=state.meta.sheets.find(s=>s.properties.title==='Mileage-2025.10.16')?.properties;
  if(!finance||!mileage)throw Error('Finance or mileage sheet is missing. No fuel records were written.');
  const requests=[update(state.sheet.sheetId,0,0,HEADERS)];
  const imported=merge(vehicle,state.entries).filter(e=>!state.entries.some(x=>x.id===e.id)&&!(e.date===entry.date&&Math.abs(e.odo-entry.odo)<.05));
  // Only fuel-history rows are imported: historical spending is never added again.
  const newRows=[...imported,...(!already?[entry]:[])];if(newRows.length)requests.push({appendCells:{sheetId:state.sheet.sheetId,rows:newRows.map(e=>({values:row(e).map(val)})),fields:'userEnteredValue'}});
  if(already)requests.push(update(state.sheet.sheetId,already.row-1,0,row(entry)));
  if(match){
   const r=match.r.concat(Array(15).fill('')).slice(0,15),oldNote=String(r[10]||'').split(' · Fuel receipt')[0];
   Object.assign(r,{4:'Transportation',5:'Fuel',6:entry.name,10:(oldNote&&!oldNote.includes('Fuel ID: '+entry.id)?oldNote+' · ':'')+notes});
   // A posted bank match keeps its bank amount, date, account, and cleared status.
   if(String(r[0]).startsWith('fuel-tx-'))Object.assign(r,{1:entry.date,2:entry.account,3:entry.station,8:entry.total,11:entry.method});
   requests.push(update(finance.sheetId,match.row-1,0,r));
  }else{
   requests.push({appendCells:{sheetId:finance.sheetId,rows:[{values:[entry.transactionId,entry.date,entry.account,entry.station,'Transportation','Fuel',entry.name,0,entry.total,'Pending',notes,entry.method,'Expense','','No'].map(val)}],fields:'userEnteredValue'}});
  }
  const readings=await thValues("'Mileage-2025.10.16'!B5:F1500",'UNFORMATTED_VALUE');
  if(vehicle.mileageRow){
   const current=FuelCore.number(readings[vehicle.mileageRow-5]?.[4]);if(!Number.isFinite(current))throw Error('Current mileage could not be verified. Refresh Vehicles.');
   if(entry.odo>current)requests.push(update(mileage.sheetId,vehicle.mileageRow-1,5,[entry.odo]));
  }else{
   const n=mileage.gridProperties.rowCount+1;
   requests.push({appendDimension:{sheetId:mileage.sheetId,dimension:'ROWS',length:1}});
   const values=['',vehicle.mileageName,vehicle.year,entry.date,entry.odo,entry.odo];
   const formula=['=F'+n+'-E'+n,'=TODAY()-D'+n,'=H'+n+'/30.4375','=IFERROR(G'+n+'/I'+n+',0)','=J'+n+'*12'];
   const cells=values.map(val).concat(formula.map(v=>({userEnteredValue:{formulaValue:v}})));
   cells[3]={userEnteredValue:{formulaValue:'=DATE('+entry.date.split('-').map(Number).join(',')+')'}};
   requests.push({updateCells:{range:{sheetId:mileage.sheetId,startRowIndex:n-1,endRowIndex:n,startColumnIndex:0,endColumnIndex:11},rows:[{values:cells}],fields:'userEnteredValue'}});
  }
  try{await request(':batchUpdate',{requests});}catch(error){
   try{const check=await read(),saved=check.entries.find(x=>x.id===entry.id);if(saved&&JSON.stringify(row(saved))===JSON.stringify(row(entry)))return {entry:saved,recovered:true};}catch{}
   const uncertain=new Error('Save was not confirmed. Reopen fuel history before retrying. Your photos may already be saved. '+error.message);uncertain.uncertain=true;throw uncertain;
  }
  return {entry};
 }
 window.TisFuelStore={read,history,transactions,save,upload,merge,legacy};
})();
