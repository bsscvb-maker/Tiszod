'use strict';
(()=>{
 const $=id=>document.getElementById(id),bank=document.body.dataset.bankHistory;
 const config=bank==='way2go'?{title:'Way2Go',sheet:'Portal Way2Go History',limit:1000,defaultSource:'W2Go - July.pdf'}:bank==='dollar'?{title:'Dollar Bank',sheet:'Portal Dollar Bank History',limit:8500,defaultSource:'dollar 2021-2025.xlsx'}:{title:'Capital One 360',sheet:'Portal Capital One History',limit:500,defaultSource:'Capital One.csv'};
 let rows=[],filtered=[],page=1;const pageSize=100;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const numeric=x=>x===''||x==null?null:Number(x),money=x=>x==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(x);
 function message(text,error=false){$('history-status').textContent=text;$('history-status').classList.toggle('history-error',error)}
 function reset(){for(const [id,value] of Object.entries({'history-source':config.defaultSource,'history-year':'','history-category':'','history-direction':'','history-review':'','history-start':'','history-end':'','history-search':'','history-sort':'date-desc'}))$(id).value=value;page=1;render()}
 function options(id,items,label){$(id).innerHTML=`<option value="">${label}</option>`+items.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}
 window.thStart=async()=>{
  $('history-refresh').disabled=true;message('Loading your private transaction history…');
  try{let data=[];for(let start=1;start<=config.limit;start+=3000){const part=await thValues("'"+config.sheet+"'!A"+start+':Q'+Math.min(start+2999,config.limit),'UNFORMATTED_VALUE');data.push(...part)}
   if(data[0]?.[0]!=='ID')throw new Error('The history register headers could not be read.');
   rows=data.slice(1).filter(r=>r[0]).map(r=>({id:r[0],date:r[1]||'',description:r[2]||'',category:r[3]||'',reference:r[4]||'',withdrawal:numeric(r[5]),deposit:numeric(r[6]),net:numeric(r[7]),balance:numeric(r[8]),sourceType:r[9]||'',file:r[10]||'',sourceRow:r[11],comments:r[12]||'',flag:r[13]||'',originalDate:r[14]||'',raw:r[15]||'',kind:r[16]||'Transaction'}));
   options('history-source',[...new Set(rows.map(r=>r.file))],'All sources (may overlap)');options('history-year',[...new Set(rows.filter(r=>r.date).map(r=>r.date.slice(0,4)))].sort().reverse(),'All years');options('history-category',[...new Set(rows.map(r=>r.category).filter(Boolean))].sort(),'All categories');
   reset();message(`${rows.length.toLocaleString()} source rows loaded from your private workbook. History registers do not change your live Checking or Savings balances.`);$('th-connection').textContent='Private workbook connected';
  }catch(e){message(e.message,true);throw e}finally{$('history-refresh').disabled=false}
 };
 function amountQuery(text){
  const cleaned=text.trim().replace(/^\$/, '').replace(/,/g,'');
  if(!/^-?\d+(?:\.\d{1,2})?$/.test(cleaned))return null;
  const value=Number(cleaned);return Number.isSafeInteger(Math.round(value*100))?Math.abs(Math.round(value*100)):null;
 }
 function render(){
  const source=$('history-source').value,year=$('history-year').value,category=$('history-category').value,direction=$('history-direction').value,review=$('history-review').value,start=$('history-start').value,end=$('history-end').value,query=$('history-search').value.trim().toLowerCase();
  const exactAmount=amountQuery(query);
  const matchesQuery=r=>!query||(exactAmount!==null?[r.withdrawal,r.deposit].some(v=>v!==null&&Math.abs(Math.round(v*100))===exactAmount):[r.description,r.category,r.reference,r.comments,r.flag].join(' ').toLowerCase().includes(query));
  const included=rows.filter(r=>!source||r.file===source),dates=included.filter(r=>r.date).map(r=>r.date).sort();$('history-coverage').textContent=dates.length?`Source coverage: ${dates[0]} to ${dates.at(-1)} · ${included.length.toLocaleString()} rows${included.some(r=>!r.date)?' · Includes rows with dates needing review':''}`:'No dated rows in this selection.';
  $('history-overlap').hidden=!(bank==='dollar'&&!source);
  filtered=included.filter(r=>(!year||r.date.startsWith(year))&&(!category||r.category===category)&&(!start||r.date&&r.date>=start)&&(!end||r.date&&r.date<=end)&&matchesQuery(r)&&(!direction||(r.kind!=='Opening balance'&&(direction==='in'?r.deposit>0:direction==='out'?r.withdrawal>0:r.withdrawal>0&&r.deposit>0)))&&(!review||(review==='flagged'?Boolean(r.flag):review==='date'?!r.date:review==='both'?r.withdrawal>0&&r.deposit>0:r.kind==='Opening balance')));
  const sort=$('history-sort').value;filtered.sort((a,b)=>{if(sort==='source')return a.file.localeCompare(b.file)||Number(a.sourceRow)-Number(b.sourceRow);if(sort==='description')return a.description.localeCompare(b.description)||a.date.localeCompare(b.date);if(sort==='amount-desc')return (b.net??0)-(a.net??0);if(!a.date||!b.date)return Boolean(b.date)-Boolean(a.date);return (sort==='date-asc'?a.date.localeCompare(b.date):b.date.localeCompare(a.date))||a.file.localeCompare(b.file)||Number(a.sourceRow)-Number(b.sourceRow)});
  const tx=filtered.filter(r=>r.kind!=='Opening balance'),sum=key=>tx.reduce((a,r)=>a+Math.round((r[key]||0)*100),0)/100;
  $('history-metrics').innerHTML=[['Matching rows',filtered.length.toLocaleString()],['Rows with deposits',tx.filter(r=>r.deposit>0).length.toLocaleString()],['Deposits',money(sum('deposit'))],['Withdrawals',money(sum('withdrawal'))]].map(([label,value])=>`<div><span>${label}</span><strong>${esc(value)}</strong></div>`).join('');
  $('history-count-note').textContent=(exactAmount!==null?`Exact amount search: ${money(exactAmount/100)} in withdrawal or deposit amounts. Other filters still apply. `:'')+`Totals cover all matching transaction rows, excluding opening balance entries. Deposits include transfers and refunds; they are not automatically classified as paychecks. ${filtered.filter(r=>r.flag).length.toLocaleString()} matching rows have review flags.`;
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages);const visible=filtered;
  $('history-rows').innerHTML=visible.length?visible.map(r=>`<tr><td>${r.date?esc(r.date):'<span class="history-flag">Date needs review</span>'}</td><td><strong>${esc(r.description)}</strong>${r.comments?`<small>${esc(r.comments)}</small>`:''}${r.flag?`<small class="history-flag">${esc(r.flag)}</small>`:''}</td><td>${esc(r.category||'Uncategorized')}</td><td>${esc(r.reference||'—')}</td><td class="history-number">${money(r.withdrawal)}</td><td class="history-number">${money(r.deposit)}</td><td class="history-number">${money(r.balance)}</td><td>${esc(r.sourceType)}<small>Source row ${esc(r.sourceRow)}</small><button type="button" data-history-id="${esc(r.id)}">Details</button></td></tr>`).join(''):'<tr><td colspan="8">No transactions match these filters.</td></tr>';
  $('history-page').textContent=filtered.length.toLocaleString()+' rows · one scrolling page';$('history-prev').hidden=true;$('history-next').hidden=true;
 }
 for(const id of ['history-source','history-year','history-category','history-direction','history-review','history-start','history-end','history-search','history-sort'])$(id).addEventListener(id==='history-search'?'input':'change',()=>{page=1;render()});
 if($('history-search-button'))$('history-search-button').onclick=()=>{page=1;render()};
 $('history-search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();page=1;render()}});
 $('history-reset').onclick=reset;$('history-prev').onclick=()=>{page--;render()};$('history-next').onclick=()=>{page++;render()};$('history-refresh').onclick=()=>window.thStart().catch(()=>{});
 $('history-rows').addEventListener('click',e=>{const b=e.target.closest('[data-history-id]');if(!b)return;const r=rows.find(x=>x.id===b.dataset.historyId);$('history-detail-title').textContent=r.description;$('history-detail-meta').textContent=`${r.file} · source row ${r.sourceRow}`;let raw;try{raw=JSON.stringify(JSON.parse(r.raw),null,2)}catch{raw=r.raw}$('history-detail-text').textContent=`Original date: ${r.originalDate}\nReview: ${r.flag||'No import flags'}\n\n${raw}`;$('history-detail').showModal()});$('history-detail-close').onclick=()=>$('history-detail').close();
 $('history-export').onclick=()=>{if(!rows.length){message('Load the register before exporting.',true);return}const cell=v=>'"'+String(typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?"'"+v:v??'').replace(/"/g,'""')+'"';const lines=[['Date','Description','Category','Reference','Withdrawal','Deposit','Net amount','Source balance','Source file','Source row','Comments','Review flag','Original date'],...filtered.map(r=>[r.date,r.description,r.category,r.reference,r.withdrawal,r.deposit,r.net,r.balance,r.file,r.sourceRow,r.comments,r.flag,r.originalDate])];const blob=new Blob(['\uFEFF'+lines.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(bank==='way2go'?'Way2Go':bank==='dollar'?'Dollar-Bank':'Capital-One-360')+'-filtered-history.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);message(`${filtered.length.toLocaleString()} matching rows exported.`)};

window.thViewAdapter={capture:()=>({}),restore:()=>render()};
})();
