'use strict';
(()=>{
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const types=['Creditor','Task','Document','Note','Question','Appointment','Financial reference'];
 const statusOptions={Creditor:['To verify','Verified','Resolved','Archived'],Task:['To do','In progress','Waiting','Done','Archived'],Document:['Needs review','To gather','Requested','Reported provided','Linked','Signed','Provided','Archived'],Note:['Active','Archived'],Question:['Open','Asked','Answered','Archived'],Appointment:['Scheduled','Completed','Canceled','Archived'],'Financial reference':['To review','Reviewing','Reviewed','Archived']};
 const sections=['Dashboard','Tasks','Documents','Creditors','Tax debts','Child support / alimony','Notes & questions','Timeline','Financial references','Project settings'];
 let items=[],allItems=[],caseRecords=[],settings={},caseYear='2026',folder='',section='Dashboard',editing=null,ready=false;
 function scopeCase(){items=allItems.filter(r=>r.year===caseYear);settings=caseRecords.find(r=>r.year===caseYear)?.details||{};if($('bk-case-year'))$('bk-case-year').value=caseYear;}
 function caseCards(){return '<section class="bk-years" aria-label="Bankruptcy years">'+caseRecords.map(c=>`<button class="bk-year-card ${c.year===caseYear?'selected':''}" data-case="${esc(c.year)}" aria-label="Open ${esc(c.year)} bankruptcy documents"><strong>${esc(c.year)}</strong><span>Chapter ${esc(c.details.chapter||'—')}</span><small>Case: ${esc(c.details.caseNumber||'Not recorded')}</small><small>Filed: ${reportChanged(c.details,['filedDate'],esc(c.details.filedDate||'Not recorded'))}</small><small>Discharged: ${esc(c.details.dischargeDate||'Not recorded')}</small></button>`).join('')+'</section>';}
 let bankruptcyFolder='';
 function folderControls(){const root=settings.rootTitle||caseYear,folders=settings.folders||[];return `${bankruptcyFolder?`<p><a href="${esc(bankruptcyFolder)}" target="_blank" rel="noopener noreferrer">Open Bankruptcy Folder</a></p>`:""}<p class="bk-muted">${esc(caseYear)} / ${esc(root)}${folder?' / '+esc(folder):''}</p><div class="bk-folders">${folder?'<button data-folder="">← '+esc(root)+'</button>':folders.map(f=>`<button data-folder="${esc(f)}">📁 ${esc(f)} <small>${items.filter(r=>r.type==='Document'&&r.folder===f).length} files</small></button>`).join('')}</div>`;}


 const creditorInfo=r=>{try{const v=JSON.parse(r.related||'{}');return v.kind==='creditor'?v:{}}catch{return {}}};
 const money=v=>Number(v).toLocaleString('en-US',{style:'currency',currency:'USD'});





 function reportChanged(d,keys,html){
 const c=d.reconciliationChanges,b=d.blueReconciliation;
 if(b&&(b.isNew||keys.some(k=>b.fields.includes(k)))){
  const key=keys.find(k=>b.fields.includes(k)),v=b.previousValues?.[key];
  const prior=c&&(c.isNew||keys.some(k=>c.fields.includes(k)))&&v!=null&&typeof v!=='object'?'<details class="bk-report-previous-green"><summary>11-page value</summary><small>'+esc(typeof v==='number'&&['balance','monthlyPayment'].includes(key)?money(v):v)+'</small></details>':'';
  return '<span class="bk-report-blue">'+html+'</span>'+prior;
 }
 return c&&(c.isNew||keys.some(k=>c.fields.includes(k)))?'<span class="bk-report-updated">'+html+'</span>':html;
 }
 function reconciliationHistoryHtml(d){return (d.reconciliationHistory||[]).length?'<details><summary>Previous portal values</summary>'+d.reconciliationHistory.map(h=>'<small>'+esc(h.at)+' · '+esc(h.source)+'\n'+(h.previousNotes?'Previous notes: '+esc(h.previousNotes)+'\n':'')+Object.entries(h.previousValues||{}).filter(([k])=>!['creditReportAccounts','sourceDocuments','creditReportReconciliation'].includes(k)).map(([k,v])=>k+': '+(typeof v==='object'?JSON.stringify(v):v??'Not recorded')).map(esc).join('\n')+'</small>').join('')+'</details>':'';}


 function blueReviewHtml(d){if(!d.blueReconciliation)return '';return '<div class="bk-report-blue">'+[d.addressReviewNote,d.accountMatchReview,d.sourceReviewNote].filter(Boolean).map(v=>'<small>'+esc(v)+'</small>').join('')+(d.reportedBalance!=null?'<small>Historical / unmatched report amount: '+money(d.reportedBalance)+' · '+esc(d.reportedBalanceDate||'')+'; current balance unconfirmed.</small>':'')+(d.judgmentReport?'<details><summary>Judgment report</summary><small>'+esc(JSON.stringify(d.judgmentReport,null,2))+'</small></details>':'')+'<details><summary>17-page report additions</summary><small>Report account reference: '+esc(d.strettoAccountReference||d.accountNumber||'Not supplied')+'\nLast activity: '+esc(d.lastActivityDate||'Not supplied')+'\nReport monthly payment: '+(d.strettoReportedMonthlyPayment!=null?money(d.strettoReportedMonthlyPayment):'Not supplied')+'</small></details></div>';}

 function creditorHistoryHtml(d){
  const snapshots=d.historicalDebtSnapshots||[];
  return snapshots.length?'<details><summary>Historical debt</summary>'+snapshots.map(p=>'<small><strong>'+esc(p.asOf)+'</strong>\nBalance: '+money(p.balance)+'\nPayment: '+money(p.monthlyPayment)+'\nAPR: '+(p.apr*100).toFixed(2)+'%\nPayoff order: '+esc(p.payoffOrder)+'\nHistorical calculator inputs</small>').join('')+'</details>':'';
 }


 function creditorAddressOnly(r){
  const d=intakeInfo(r);
  if(d.addressLine1)return [d.attention?'Attention: '+d.attention:'',d.addressLine1,d.addressLine2,[d.city,d.state].filter(Boolean).join(', ')+(d.zip?' '+d.zip:'')].filter(Boolean).join('\n');
  const lines=String(d.mailingAddress||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(lines.length&& !/^(?:\d|P\.?\s*O\.?\s*Box|Attention|Attn)/i.test(lines[0]))lines.shift();
  return lines.join('\n')||'Address not recorded';
 }

 function creditorSourcesHtml(r){
  const docs=items.filter(x=>x.type==='Document'&&safeLink(x.link));
  const links=new Map();
  if(safeLink(r.link))links.set(r.link,{title:'Source document',id:docs.find(x=>x.link===r.link)?.id});
  const d=creditorInfo(r);
  for(const doc of d.sourceDocuments||[])if(safeLink(doc.url))links.set(doc.url,{title:doc.label||'Source document',id:docs.find(x=>x.link===doc.url)?.id});
  for(const [key,url] of Object.entries(d))if(/SourceUrl$/.test(key)&&typeof url==='string'&&safeLink(url)&&!links.has(url))links.set(url,{title:key.replace(/SourceUrl$/,'').replace(/([A-Z])/g,' $1')+' evidence',id:docs.find(x=>x.link===url)?.id});
  const references=[r.source,r.notes,r.related].join(' ').toLowerCase();
  for(const doc of docs){
   const title=doc.title.toLowerCase();
   const sameCity=/chesapeake/i.test(r.title)&&/chesapeake/i.test(doc.title)&&/tax|bill/i.test(doc.title)||/norfolk/i.test(r.title)&&/norfolk/i.test(doc.title)&&/tax|bill/i.test(doc.title);
   if(sameCity||references.includes(doc.id.toLowerCase())||(title.length>12&&references.includes(title)))links.set(doc.link,{title:doc.title,id:doc.id});
  }
  return '<div class="bk-creditor-sources"><small><strong>Source documents</strong></small>'+(links.size?[...links].map(([url,doc])=>doc.id?'<button type="button" data-preview="'+esc(doc.id)+'">'+esc(doc.title)+'</button>':'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(doc.title)+' ↗</a>').join(' '):'<small>'+esc(r.source||'No source document linked')+'</small>')+'</div>';
 }

 function creditorAccountHtml(d){
  const refs=[...(d.accountReferences||[])];
  if(d.originalAccountNumber)refs.push({label:'Historical original account (collection linkage unverified)',value:d.originalAccountNumber});
  return '<span class="bk-data-number">'+esc(d.accountNumber||'Unknown')+'</span>'+(d.accountNumberScope?'<small>'+esc(d.accountNumberScope)+'</small>':'')+(d.accountNumberKind==='partial'?'<small>Partial number only</small>':'')+(refs.length?'<details><summary>Other references</summary>'+refs.map(r=>'<small><strong>'+esc(r.label)+'</strong>\n'+esc(r.value)+'</small>').join('')+'</details>':'');
 }

 function creditorReportHtml(d){
  const reports=d.creditReportAccounts||[];
  if(!reports.length)return '<small>'+esc(d.dataReviewNote||'No saved credit report entry')+'</small>';
  const labels={reportedAccountNumber:'Reported account reference',lastActivity:'Date of last activity',rawEntry:'Original report entry',creditor:'Reported name',opened:d.accountOpenedKind==='collection'?'Collection opened':'Account opened',originalCreditor:'Original creditor',balance:'Report balance',reported:'Balance reported',accountStatus:'Report status',paymentStatus:'Payment status',monthlyPayment:'Report monthly payment',lastPayment:'Last payment',closed:'Closed',creditLimit:'Credit limit',highestBalance:'Highest balance',pastDue:'Past due',worstPaymentStatus:'Worst payment status',lateCounts:'Late counts 30/60/90+',debtType:'Report type',remarks:'Remarks',contact:'Report contact'};
  return (d.collectionLegalNotice?'<details><summary>Collection notice</summary><small>Case '+esc(d.collectionLegalNotice.caseNumber)+' · judgment reported '+esc(d.collectionLegalNotice.judgmentDate)+'\n'+esc(d.collectionLegalNotice.source)+'</small></details>':'')+'<details><summary>Report details</summary>'+reports.map(p=>'<small><strong>'+esc(p.bureau)+' · '+esc(p.source)+'</strong>\n'+Object.entries(labels).filter(([k])=>p[k]).map(([k,label])=>label+': '+p[k]).map(esc).join('\n')+'</small>').join('')+'</details>';
 }

 function creditorPaymentHtml(d){
  const b=d.historicalPaymentBaseline;
  if(typeof d.monthlyPayment==='number')return '<strong>'+money(d.monthlyPayment)+'</strong><small>'+(d.paymentFrequency==='Semi-monthly'&&typeof d.paymentAmount==='number'?money(d.paymentAmount)+' twice monthly':d.monthlyPaymentBasis==='documented-contract'?'Monthly · contract':'Monthly')+'</small>';
  if(b&&typeof b.amount==='number')return '<strong>'+money(b.amount)+'</strong><small>Historical baseline · '+esc(b.asOf)+'</small><details><summary>Payment history</summary><small>'+esc(b.scope)+'\nSource: '+esc(b.sourceTab)+'!'+esc(b.sourceCell)+'\n'+esc(b.monthsFound)+' monthly tabs; budget entries, current amount unverified.\n'+esc((b.history||[]).map(h=>h.tab+': '+money(h.amount)).join('\n'))+'</small></details>';
  if(d.historicalPaymentCandidates?.length)return '<strong>Match needed</strong><small>'+d.historicalPaymentCandidates.map(b=>'…'+esc(b.ending)+': '+money(b.amount)+' ('+esc(b.asOf)+')').join('<br>')+'</small><small>Original card baselines; collection match unverified</small>';
  return '<strong>Unknown</strong>';
 }

 // Keep the creditor summary compact: existing account note and primary mailing address.
 const creditorDisplayNotes=r=>{
  const raw=String(r.notes||'');
  const marker=/MAILING ADDRESS FOR BANKRUPTCY REVIEW[^\n]*(?:\n|$)/i;
  const match=marker.exec(raw);if(!match)return raw;
  const before=raw.slice(0,match.index).trim();
  const address=raw.slice(match.index+match[0].length).split(/\n\s*(?:Additional servicer copy:|Address type:|Source:)/i)[0].trim();
  const d=creditorInfo(r),structured=d.addressLine1?[d.creditorName||r.title,d.attention&&'Attention: '+d.attention,d.addressLine1,d.addressLine2,[d.city,d.state].filter(Boolean).join(', ')+(d.zip?' '+d.zip:'')].filter(Boolean).join('\n'):address;
  return [before,structured].filter(Boolean).join('\n\n');
 };

 const creditorSection=r=>/tax/i.test(creditorInfo(r).category||'')?'Tax debts':/child support|alimony/i.test(creditorInfo(r).category||'')?'Child support / alimony':'Creditors';
 const isDebtSection=()=>['Creditors','Tax debts','Child support / alimony'].includes(section);
 const intakeFields=[['debtType','Type of debt','select',['Auto, Motor Vehicle, or Mobile Home','Credit card','Personal / installment loan','Lease / merchandise','Medical','Utilities','Collection','Tax','Child support / alimony','Other']],['creditorName','Creditor / lessor name'],['accountStatus','Account status','select',['Open','Closed','Charge off','Collection','Paid','Unknown']],['addressLine1','Street address line 1'],['addressLine2','Street address line 2'],['city','City'],['state','State'],['zip','ZIP'],['attention','Attention'],['accountNumber','Account number'],['accountOpenedDate','Account opened','date'],['originalAccountOpenedDate','Original account opened (collections only)','date'],['lastPaymentDate','Last payment reported','date'],['accountClosedDate','Account closed','date'],['creditorPhone','Creditor phone'],['originalCreditorName','Original creditor'],['monthlyPayment','Monthly payment','number']];
 function intakeInfo(r){
  const d={...creditorInfo(r)},lines=String(d.mailingAddress||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const cut=lines.findIndex(x=>/^Additional servicer/i.test(x));if(cut>=0)lines.splice(cut);
  if(!d.creditorName)d.creditorName=lines[0]||r.title||'';
  const place=lines[lines.length-1]?.match(/^(.+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if(place&&!d.addressLine1){d.city=place[1];d.state=place[2];d.zip=place[3];const middle=lines.slice(1,-1),attention=middle.find(x=>/^att(?:ention|n)\s*:/i.test(x));if(attention)d.attention=attention.replace(/^att(?:ention|n)\s*:\s*/i,'');const street=middle.filter(x=>x!==attention);d.addressLine1=street[0]||'';d.addressLine2=street.slice(1).join(', ');}
  if(!d.accountStatus){if(/charge.off/i.test(r.notes||''))d.accountStatus='Charge off';else if(/^Closed/i.test(r.notes||''))d.accountStatus='Closed';else if(/^Collection/i.test(r.notes||''))d.accountStatus='Collection';}
  if(!d.debtType){const c=d.category||'';d.debtType=/auto|vehicle loan/i.test(c)?'Auto, Motor Vehicle, or Mobile Home':/credit card/i.test(c)?'Credit card':/installment/i.test(c)?'Personal / installment loan':/lease/i.test(c)?'Lease / merchandise':/medical/i.test(c)?'Medical':/utilities/i.test(c)?'Utilities':/collections/i.test(c)?'Collection':/tax/i.test(c)?'Tax':/child support|alimony/i.test(c)?'Child support / alimony':'';}
  return d;
 }
 function missingIntake(r){const d=intakeInfo(r);return [['debtType','Debt type'],['creditorName','Creditor name'],['accountStatus','Account status'],['addressLine1','Street'],['city','City'],['state','State'],['zip','ZIP'],['accountNumber','Account number'],['balance','Amount owed'],['debtIncurredDate','Date incurred'],['monthlyPayment','Monthly payment']].filter(([key])=>d[key]===undefined||d[key]===null||d[key]===''||d[key]==='Unknown') .map(([,label])=>label).concat(d.accountNumberKind==='partial'?['Full account number']:[]);}

 const creditorRows=()=>items.filter(r=>r.type==='Creditor'&&r.status!=='Archived'&&(section==='Creditors'||creditorSection(r)===section));
 let showEnteredCreditors=true;
 let savingCreditorEntry=false;

 function creditorBreakdown(category){
 const records=creditorRows().filter(r=>(creditorInfo(r).category||'Uncategorized')===category);
 const included=records.filter(r=>typeof creditorInfo(r).balance==='number'&&creditorInfo(r).balance!==0);
 const total=included.reduce((sum,r)=>sum+creditorInfo(r).balance,0);
 const unknown=records.filter(r=>typeof creditorInfo(r).balance!=='number').length;
 return `<header class="bk-breakdown-head"><div><p class="bk-muted">${esc(caseYear)} · Creditor breakdown</p><h2 id="bk-breakdown-title">${esc(category)}</h2></div><button type="button" data-breakdown-close aria-label="Close breakdown">✕</button></header><div class="bk-breakdown-total"><span>Reported balance</span><strong>${money(total)}</strong><small>${included.length} account${included.length===1?'':'s'} included</small></div><div class="bk-breakdown-accounts">${included.map(r=>{const d=creditorInfo(r);return `<article class="bk-breakdown-account"><div><h3>${esc(r.title)}</h3>${r.notes?`<p>${reportChanged(d,['mailingAddress','addressLine1'],esc(creditorDisplayNotes(r)))}</p>`:''}${d.reported?`<small>Reported ${esc(d.reported)}</small>`:''}</div><strong>${money(d.balance)}</strong></article>`}).join('')}</div><div class="bk-breakdown-sum"><span>Category total</span><strong>${money(total)}</strong></div>${unknown?`<p class="bk-muted">${unknown} additional account${unknown===1?' has':'s have'} an unknown balance and ${unknown===1?'is':'are'} excluded from this total.</p>`:''}<footer><button type="button" data-breakdown-close>Close</button></footer>`;
 }
 function openCreditorBreakdown(category){
 let dialog=$('bk-creditor-breakdown');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='bk-creditor-breakdown';dialog.className='bk-dialog bk-breakdown';dialog.setAttribute('aria-labelledby','bk-breakdown-title');document.body.append(dialog);
 dialog.addEventListener('click',e=>{if(e.target.closest('[data-breakdown-close]'))dialog.close();else if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
 }
 dialog.innerHTML=creditorBreakdown(category);dialog.showModal();
 }

 function renderCreditors(){
 const q=$('bk-search').value.toLowerCase(),f=$('bk-filter').value;
 const all=items.filter(r=>r.type==='Creditor'&&(section==='Creditors'||creditorSection(r)===section)),active=creditorRows();
 const creditorLineNumbers=new Map(all.map((r,index)=>[r.id,index+1]));
 const list=all.filter(r=>(showEnteredCreditors||!creditorInfo(r).paperworkEntered)&&(creditorInfo(r).balance!==0)&&(f==='all'||(f==='archived'?r.status==='Archived':r.status!=='Archived'))&&[r.title,r.notes,r.related].join(' ').toLowerCase().includes(q));
 const totals={};let count=0;for(const r of active){const d=creditorInfo(r);if(typeof d.balance==='number'&&d.balance!==0){totals[d.category||'Uncategorized']=(totals[d.category||'Uncategorized']||0)+d.balance;count++;}}
 const total=Object.values(totals).reduce((a,b)=>a+b,0),pdf=items.find(r=>r.id==='bk-2026-creditor-pdf');
 $('bk-list').innerHTML=`<section class="bk-panel"><h2>${esc(caseYear)} ${esc(section)}</h2><p><strong style="font-size:1.8rem">${money(total)}</strong> reported balances · ${count} accounts with amounts · ${active.filter(r=>typeof creditorInfo(r).balance!=='number').length} amounts unknown</p><div class="bk-actions bk-creditor-actions"><button id="bk-creditor-unhide" aria-pressed="${showEnteredCreditors}">${showEnteredCreditors?'Hide entered rows':'Show all rows'}</button><span>${all.filter(r=>creditorInfo(r).paperworkEntered).length} marked entered</span><button id="bk-creditor-csv">Export Excel CSV</button><button id="bk-creditor-print">Export current list as PDF</button>${pdf&&safeLink(pdf.link)?`<a href="${esc(pdf.link)}" target="_blank" rel="noopener">Open saved attorney PDF ↗</a>`:''}</div><div class="bk-metrics">${Object.entries(totals).map(([k,v])=>`<button type="button" class="bk-metric bk-creditor-metric" data-creditor-category="${esc(k)}" aria-haspopup="dialog"><span>${esc(k)}</span><strong>${money(v)}</strong></button>`).join('')}</div></section><p>${list.length} matching creditor records · <span class="bk-report-updated">Green: 11-page report</span> · <span class="bk-report-blue">Blue: 17-page Stretto report</span></p><div class="bk-table-wrap bk-creditor-scroll"><table class="bk-table bk-creditor-table"><colgroup><col class="col-check"><col class="col-creditor"><col class="col-account"><col class="col-balance"><col class="col-payment"><col class="col-dates"><col class="col-review"><col class="col-edit"></colgroup><thead><tr><th aria-label="Entered in paperwork">✓</th><th>Creditor &amp; address</th><th>Account number</th><th>Balance / value</th><th>Payment</th><th>Dates</th><th>Review</th><th></th></tr></thead><tbody>${list.map(r=>{const lineNumber=creditorLineNumbers.get(r.id),d=creditorInfo(r),missing=missingIntake(r),dateLabel=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?v.slice(5,7)+'/'+v.slice(8,10)+'/'+v.slice(0,4):v||'—';return `<tr class="${d.paperworkEntered?'bk-entered-row':''}"><td class="bk-check-cell"><input type="checkbox" data-paperwork-entered="${esc(r.id)}" aria-label="Mark ${esc(r.title)} entered in paperwork" ${d.paperworkEntered?'checked':''} ${savingCreditorEntry?'disabled':''}></td><td class="bk-creditor-name"><strong><span aria-label="Line ${lineNumber}">${lineNumber}.</span> ${reportChanged(d,['title','creditorName'],esc(r.title))}</strong><div class="bk-creditor-tags"><span>${esc(d.category||'To categorize')}</span><span>${reportChanged(d,['accountStatus'],esc(intakeInfo(r).accountStatus||'Unknown'))}</span></div><small>${esc(creditorAddressOnly(r))}</small></td><td class="bk-account-cell">${reportChanged(d,['accountNumber','accountNumberScope','reportAccountNumber'],creditorAccountHtml(d))}</td><td class="bk-amount-cell"><strong>${reportChanged(d,['balance'],typeof d.balance==='number'?money(d.balance):'Unknown')}</strong>${typeof d.nadaValue==='number'?'<small>NADA '+money(d.nadaValue)+'</small>':''}</td><td class="bk-payment-cell" title="${esc(d.monthlyPaymentSource||d.historicalPaymentBaseline?.source||d.historicalPaymentReview||'')}">${reportChanged(d,['monthlyPayment'],creditorPaymentHtml(d))}</td><td class="bk-date-cell"><dl><div title="${esc(d.accountOpenedSource||'')}"><dt>${d.accountOpenedKind==='collection'?'Collection opened':'Opened'}</dt><dd>${reportChanged(d,['accountOpenedDate'],esc(dateLabel(d.accountOpenedDate)))}</dd></div>${d.originalAccountOpenedDate?'<div><dt>Original opened</dt><dd>'+esc(dateLabel(d.originalAccountOpenedDate))+'</dd></div>':''}<div title="${esc(d.purchaseDateSource||'')}"><dt>Purchased</dt><dd>${esc(dateLabel(d.purchaseDate))}</dd></div><div title="${esc(d.debtIncurredSource||'')}"><dt>Incurred</dt><dd>${esc(dateLabel(d.debtIncurredDate))}</dd></div><div><dt>Reported</dt><dd>${reportChanged(d,['reported'],esc(dateLabel(d.reported)))}</dd></div></dl></td><td class="bk-review-cell">${missing.length?'<details><summary>'+missing.length+' missing</summary><small>'+esc(missing.join('\n'))+'</small></details>':'<span class="bk-ready">Complete</span>'}${reportChanged(d,['creditReportAccounts'],creditorReportHtml(d))}${creditorHistoryHtml(d)}${blueReviewHtml(d)}${reconciliationHistoryHtml(d)}</td><td><button data-edit="${esc(r.id)}">Edit</button></td></tr>`}).join('')||'<tr><td colspan="8">No creditors found.</td></tr>'}</tbody></table></div>`;
 $('bk-list').querySelectorAll('[data-creditor-category]').forEach(button=>button.onclick=()=>openCreditorBreakdown(button.dataset.creditorCategory));
 $('bk-creditor-unhide').onclick=()=>{showEnteredCreditors=!showEnteredCreditors;renderCreditors()};
 $('bk-list').querySelectorAll('[data-paperwork-entered]').forEach(input=>input.onchange=async()=>{
  if(savingCreditorEntry)return;
  const r=items.find(item=>item.id===input.dataset.paperworkEntered);if(!r)return;
  const entered=input.checked,prior=Boolean(creditorInfo(r).paperworkEntered);
  savingCreditorEntry=true;$('bk-list').querySelectorAll('[data-paperwork-entered]').forEach(node=>node.disabled=true);
  message('Saving paperwork checkmark…');
  try{
   const current=await thValues("'BK Project Items'!A"+r.row+':N'+r.row,'UNFORMATTED_VALUE');
   if(current[0]?.[0]!==r.id||(current[0]?.[9]||'')!==r.updated)throw new Error('This record changed elsewhere. Refresh before marking it entered.');
   const data={...creditorInfo(r),paperworkEntered:entered,paperworkEnteredAt:entered?new Date().toISOString():''},updated=new Date().toISOString(),related=JSON.stringify(data);
   await request('/values:batchUpdate',{valueInputOption:'RAW',data:[{range:"'BK Project Items'!L"+r.row,values:[[related]]},{range:"'BK Project Items'!J"+r.row,values:[[updated]]}]});
   r.related=related;r.updated=updated;
   message(entered?'Marked entered. The record remains visible.':'Checkmark cleared.');
  }catch(error){input.checked=prior;message(error.message,true)}
  finally{savingCreditorEntry=false;renderCreditors()}
 });

 $('bk-creditor-csv').onclick=()=>{const cell=v=>'"'+String(v??'').replace(/"/g,'""').replace(/^[=+@-]/,"'$&")+'"';const rows=[['Line','Creditor','Category','Account number','Number type','Other account references','Reported balance','NADA value','Recorded monthly payment','Payment basis','Historical monthly baseline','Baseline month','Baseline source','Account opened','Opening date type','Original account opened','Last payment reported','Account closed','Creditor phone','Original creditor','Date of purchase','Date debt incurred','Reported','Notes'],...list.map(r=>{const d=creditorInfo(r);return [creditorLineNumbers.get(r.id),r.title,d.category,d.accountNumber||'',d.accountNumberScope||'',(d.accountReferences||[]).map(x=>x.label+': '+x.value).join('; '),d.balance??'',d.nadaValue??'',d.monthlyPayment??'',d.monthlyPaymentBasis||'',d.historicalPaymentBaseline?.amount??'',d.historicalPaymentBaseline?.asOf||'',d.historicalPaymentBaseline?d.historicalPaymentBaseline.sourceTab+'!'+d.historicalPaymentBaseline.sourceCell:'',d.accountOpenedDate||'',d.accountOpenedKind||'',d.originalAccountOpenedDate||'',d.lastPaymentDate||'',d.accountClosedDate||'',d.creditorPhone||'',d.originalCreditorName||'',d.purchaseDate||'',d.debtIncurredDate||'',d.reported||'—',creditorDisplayNotes(r)]})];const b=new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=caseYear+'-creditors.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)};
 $('bk-creditor-print').onclick=()=>{const w=window.open('','_blank');if(!w){message('Allow a popup to export the PDF.',true);return;}w.document.write('<!doctype html><html><head><title>'+esc(caseYear)+' Creditors</title><style>body{font:12px Arial;margin:30px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ccc;text-align:left;padding:8px;vertical-align:top}small{display:block}button,.bk-actions{display:none}h2{font-size:22px}.bk-metrics{margin:20px 0}.bk-metric{display:flex;justify-content:space-between;padding:4px}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body><h1>'+esc(caseYear)+' Creditor Inventory</h1><p>Exported '+new Date().toLocaleDateString()+' · Preliminary reported balances; amounts need confirmation.</p><p>Total: '+money(total)+'</p><table><thead><tr><th>Creditor</th><th>Category</th><th>Balance</th><th>NADA value</th><th>Date of purchase</th><th>Date debt incurred</th><th>Notes</th></tr></thead><tbody>'+list.map(r=>{const d=creditorInfo(r);return '<tr><td>'+esc(r.title)+'</td><td>'+esc(d.category||'Unknown')+'</td><td>'+(typeof d.balance==='number'?money(d.balance):'Unknown')+'</td><td>'+(typeof d.nadaValue==='number'?money(d.nadaValue):'—')+'</td><td>'+esc(d.purchaseDate||'—')+'</td><td>'+esc(d.debtIncurredDate||'—')+'</td><td>'+esc(creditorDisplayNotes(r))+'</td></tr>'}).join('')+'</tbody></table><p>Choose Save as PDF in the print dialog.</p></body></html>');w.document.close();w.focus();w.print();};
 }

 const safeLink=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:''}catch{return ''}};
 const done=r=>['Done','Archived','Answered','Completed','Canceled','Reviewed'].includes(r.status);
 const nowET=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`};
 const when=v=>v?String(v).replace('T',' ')+(v.includes('T')?' ET':''):'No date set';
 function message(v,error=false){$('bk-status').textContent=v;$('bk-status').classList.toggle('error',error)}
 async function request(path,body,method='POST'){if(!thAuthorized())throw new Error('Sign in again to save changes.');const response=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+TH_SHEET_ID+path,{method,headers:{Authorization:'Bearer '+thToken,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw new Error(response.status===401?'Your sign-in expired. Sign in again.':'The change was not saved. Check your connection and try again.');return response.json()}
 window.thStart=async()=>{message('Loading your private BK workspace…');const [r,s]=await Promise.all([thValues("'BK Project Items'!A1:N2000",'UNFORMATTED_VALUE'),thValues("'BK Case Records'!A1:B20",'UNFORMATTED_VALUE')]);try{const links=await thValues("'Legal Portal Links'!A2:C2",'UNFORMATTED_VALUE');const url=new URL(links[0]?.[2]);bankruptcyFolder=url.protocol==='https:'&&url.hostname==='drive.google.com'?url.href:''}catch{bankruptcyFolder=''}if(r[0]?.[0]!=='ID'||s[0]?.[0]!=='Year')throw new Error('The BK project records could not be read.');allItems=r.slice(1).map((v,i)=>({row:i+2,id:v[0],type:v[1],title:v[2]||'',status:v[3]||'',priority:v[4]||'Normal',due:v[5]||'',notes:v[6]||'',link:v[7]||'',created:v[8]||'',updated:v[9]||'',source:v[10]||'',related:v[11]||'',year:String(v[12]||'2026'),folder:v[13]||''})).filter(v=>v.id&&v.status!=='Deleted');caseRecords=s.slice(1).map((r,i)=>({year:String(r[0]),row:i+2,details:JSON.parse(r[1]||'{}')})).filter(r=>r.year&&r.year!=='undefined');scopeCase();ready=true;render();message('BK project loaded. Changes save to your private workbook.');$('th-connection').textContent='Private workbook connected'};
 function rowCard(r){return `<div class="bk-row"><div><strong>${esc(r.title)}</strong><small>${esc(r.type)} · ${esc(r.status)}${r.due?' · '+esc(when(r.due)):''}</small></div><button data-edit="${esc(r.id)}">Open</button></div>`}
 function stats(){return `<div class="bk-metrics">${[['Open tasks',items.filter(r=>r.type==='Task'&&!done(r)).length],['Documents tracked',items.filter(r=>r.type==='Document'&&r.status!=='Archived').length],['Open questions',items.filter(r=>r.type==='Question'&&!done(r)).length],['Files / links attached',items.filter(r=>r.type==='Document'&&r.status!=='Archived'&&safeLink(r.link)).length]].map(([a,b])=>`<div class="bk-metric"><span>${a}</span><strong>${b}</strong></div>`).join('')}</div>`}
 function render(){if(!ready)return;$('bk-tabs').innerHTML=sections.map(s=>`<button role="tab" aria-selected="${s===section}" data-section="${esc(s)}">${esc(s)}</button>`).join('');$('bk-archive').hidden=settings.projectState!=='Archived';$('bk-section-title').textContent=section==='Dashboard'?'Choose a year, then open a folder':caseYear+' · '+section;$('bk-add').textContent=section==='Documents'?'+ Add document':isDebtSection()?'+ Add creditor':'+ Add record';const panel=$('bk-content');
 if(section==='Dashboard'){
 const next=items.filter(r=>r.type==='Appointment'&&r.status==='Scheduled'&&r.due&&r.due>=nowET()).sort((a,b)=>a.due.localeCompare(b.due))[0];const tasks=items.filter(r=>r.type==='Task'&&!done(r)).sort((a,b)=>(a.priority==='High'?-1:1)-(b.priority==='High'?-1:1)||(a.due||'z').localeCompare(b.due||'z'));
 panel.innerHTML=caseCards()+`<div class="bk-case-banner"><div><small>SELECTED CASE</small><h2>${esc(caseYear)} · ${esc(settings.rootTitle||'Case records')}</h2><p>${esc(settings.caseNumber||'Case number not recorded')} · ${esc(settings.caseStatus||'Awaiting details')}</p></div><button class="primary" data-section="Documents">Browse documents →</button></div><div class="bk-quick"><button data-section="Documents"><strong>Documents & folders</strong><small>Find paperwork, open files, or add a document</small></button><button data-section="Creditors"><strong>Creditor list</strong><small>Gather creditors and track what needs checking</small></button><button data-section="Tasks"><strong>Tasks & next steps</strong><small>Keep track of what you need to do</small></button><button data-section="Notes & questions"><strong>Notes & questions</strong><small>Save information and questions for your attorney</small></button></div><div class="bk-grid"><section class="bk-panel"><div class="bk-panel-head"><h2>Your folders</h2><button data-section="Documents">View documents</button></div>${folderControls()}</section><section class="bk-panel"><div class="bk-panel-head"><h2>Next steps</h2><button data-add="Task">+ Add task</button></div>${next?rowCard(next):''}${tasks.slice(0,4).map(rowCard).join('')||'<p class="bk-empty">No tasks recorded for this year. Add a task when you are ready.</p>'}<button data-section="Project settings">View / edit case details</button></section></div>`;

 }else if(section==='Timeline'){const list=items.filter(r=>r.status!=='Archived').sort((a,b)=>(b.due||b.updated||b.created).localeCompare(a.due||a.updated||a.created));panel.innerHTML=`<section class="bk-panel"><div class="bk-panel-head"><h2>Project timeline</h2><button data-add="Appointment">+ Appointment</button></div><p class="bk-muted">Appointments use their scheduled date. Other records use their latest saved update.</p><div class="bk-timeline">${list.map(r=>`<article><small class="bk-muted">${esc(r.due?when(r.due):r.updated.slice(0,10))} · ${esc(r.type)} · ${esc(r.status)}</small><h3>${esc(r.title)}</h3><p>${esc(creditorDisplayNotes(r))}</p><button data-edit="${esc(r.id)}">Open record</button></article>`).join('')||'<p>No timeline entries yet.</p>'}</div></section>`;
 }else if(section==='Project settings'){panel.innerHTML=`<section class="bk-settings bk-panel"><h2>Project settings</h2><form id="bk-settings-form"><div class="bk-form-grid">${[['firm','Firm'],['attorney','Attorney'],['caseNumber','Case number'],['chapter','Chapter / proceeding'],['court','Court'],['filedDate','Filing date (if confirmed)'],['dischargeDate','Discharge date (if confirmed)']].map(([k,l])=>`<label>${l}<input name="${k}" value="${esc(settings[k])}" maxlength="300"></label>`).join('')}<label>Filing status<select name="caseStatus">${['Not confirmed','Awaiting documents','Historical / outcome unconfirmed','Preparing / consultation','Filed','Closed'].map(s=>`<option${settings.caseStatus===s?' selected':''}>${s}</option>`).join('')}</select></label><label>Project state<select name="projectState"><option${settings.projectState==='Active'?' selected':''}>Active</option><option${settings.projectState==='Archived'?' selected':''}>Archived</option></select></label><label class="bk-wide">Project notes<textarea name="projectNotes" rows="5" maxlength="12000">${esc(settings.projectNotes)}</textarea></label></div><p class="bk-muted">Archiving retains all records and links. Times are recorded in America/New_York. Only enter confirmed filing details.</p><button class="primary" type="submit">Save project settings</button><p id="bk-settings-status" role="status"></p></form></section>`;$('bk-settings-form').onsubmit=saveSettings;
 }else{const type=isDebtSection()?'Creditor':section==='Tasks'?'Task':section==='Documents'?'Document':section==='Financial references'?'Financial reference':'Note';panel.innerHTML=(section==='Documents'?folderControls():'')+(section==='Financial references'?`<div class="bk-finance">${[['finance.html','Finance','Your original financial records'],['dollar-bank-transactions.html','Dollar Bank','Historical register and bank export'],['capital-one-transactions.html','Capital One 360','Bank transaction history'],['way2go-transactions.html','Way2Go','Card statement history'],['credit-report.html','Credit Report','Bureau reports and review notes']].map(([url,title,desc])=>`<a href="${url}"><strong>${title} ↗</strong><small>${desc}</small></a>`).join('')}</div><p class="bk-muted">These links open the original financial records. Add project references below for specific transactions or accounts; include their record ID in Related record.</p>`:'')+`<div class="bk-toolbar"><label>Search<input id="bk-search" type="search" placeholder="Search titles, notes, related records…"></label><label>Show<select id="bk-filter"><option value="active">Active records</option><option value="all">All records</option><option value="archived">Archived records</option></select></label><button class="primary" data-add="${type}">+ ${type}</button>${section==='Notes & questions'?'<button data-add="Question">+ Question</button>':''}</div><div id="bk-list"></div>`;if(section==='Documents')$('bk-search').placeholder='Search every folder by filename or notes…';['bk-search','bk-filter'].forEach(id=>$(id).addEventListener(id==='bk-search'?'input':'change',renderList));renderList();}
 }


 const bkFileCache=new Map(),bkDataCache=new Map(),bkPdfCache=new Map(),bkObjectUrls=new Set();
 let bkPdfLibraryPromise;
 const documentDriveId=link=>{try{const u=new URL(link);if(!['drive.google.com','docs.google.com'].includes(u.hostname))return '';return u.pathname.match(/\/(?:d|folders)\/([a-zA-Z0-9_-]+)/)?.[1]||u.searchParams.get('id')||''}catch{return ''}};
 function bkPdfLibrary(){
  return bkPdfLibraryPromise||=(import(new URL('./vendor/pdfjs/pdf.min.mjs',document.baseURI).href).then(pdf=>{pdf.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.compat.mjs',document.baseURI).href;return pdf}));
 }
 async function bkDriveMeta(id){
  if(!bkFileCache.has(id))bkFileCache.set(id,(async()=>{const response=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=id,name,mimeType,capabilities(canDownload)&supportsAllDrives=true',{headers:{Authorization:'Bearer '+thToken}});if(!response.ok)throw new Error('Document access could not be verified. Reconnect Google Drive and try again.');return response.json()})().catch(error=>{bkFileCache.delete(id);throw error}));
  return bkFileCache.get(id);
 }
 async function bkDocumentData(id){
  if(!bkDataCache.has(id))bkDataCache.set(id,(async()=>{
   const meta=await bkDriveMeta(id),native=meta.mimeType.startsWith('application/vnd.google-apps.');
   const url='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+(native?'/export?mimeType=application%2Fpdf':'?alt=media&supportsAllDrives=true');
   const response=await fetch(url,{headers:{Authorization:'Bearer '+thToken}});
   if(!response.ok)throw new Error('The document could not be loaded. Check Google Drive access and try again.');
   return {meta,bytes:await response.arrayBuffer(),mime:native?'application/pdf':meta.mimeType};
  })().catch(error=>{bkDataCache.delete(id);throw error}));
  return bkDataCache.get(id);
 }
 async function bkPdfDocument(id){
  if(!bkPdfCache.has(id))bkPdfCache.set(id,(async()=>{const [pdf,file]=await Promise.all([bkPdfLibrary(),bkDocumentData(id)]);return pdf.getDocument({data:new Uint8Array(file.bytes.slice(0)),isEvalSupported:false,useWasm:false}).promise})().catch(error=>{bkPdfCache.delete(id);throw error}));
  return bkPdfCache.get(id);
 }
 const bkBlobUrl=blob=>{const url=URL.createObjectURL(blob);bkObjectUrls.add(url);return url};
 async function bkPageCanvas(pdf,number,width){
  const page=await pdf.getPage(number),base=page.getViewport({scale:1}),scale=width/base.width,ratio=Math.min(window.devicePixelRatio||1,2);
  const viewport=page.getViewport({scale:scale*ratio}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.style.width='100%';canvas.style.height='auto';
  await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'#ffffff'}).promise;return canvas;
 }
 let bkThumbObserver;
 function loadDocumentThumbnails(){
  bkThumbObserver?.disconnect();
  const targets=[...document.querySelectorAll('.bk-document-thumb[data-preview]')],queue=[];let active=0;
  async function load(button){
   const item=items.find(r=>r.id===button.dataset.preview),id=documentDriveId(item?.link);
   try{
    if(!id)throw new Error('This document must be opened in its original viewer.');
    const file=await bkDocumentData(id);
    if(file.mime==='application/pdf'){
     const holder=document.createElement('div');holder.style.cssText='width:100%;height:100%!important;pointer-events:none';button.replaceChildren(holder);await window.thDocumentViewer.render(holder,id,item.title,false);
    }else if(file.mime.startsWith('image/')){
     const img=document.createElement('img');img.alt='Preview of '+item.title;img.src=bkBlobUrl(new Blob([file.bytes],{type:file.mime}));button.replaceChildren(img);
    }else throw new Error('Preview unavailable for this file type.');
   }catch(error){button.textContent='Preview unavailable';button.title=error.message;button.classList.add('bk-thumb-fallback')}
  }
  function pump(){while(active<3&&queue.length){active++;load(queue.shift()).finally(()=>{active--;pump()})}}
  function enqueue(button){if(button.dataset.loaded)return;button.dataset.loaded='true';queue.push(button);pump()}
  if('IntersectionObserver'in window){bkThumbObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){bkThumbObserver.unobserve(entry.target);enqueue(entry.target)}},{rootMargin:'200px'});targets.forEach(button=>bkThumbObserver.observe(button))}
  else targets.forEach(enqueue);
 }
 async function downloadBkDocument(item,button,status){
  const id=documentDriveId(item.link);
  if(!id){window.open(item.link,'_blank','noopener');status.textContent='Use Download in the original document viewer.';return}
  button.disabled=true;status.textContent='Preparing download…';
  try{
   const file=await bkDocumentData(id),meta=file.meta;
   if(meta.capabilities?.canDownload===false)throw new Error('Downloading is restricted by the file owner.');
   const url=bkBlobUrl(new Blob([file.bytes],{type:file.mime})),a=document.createElement('a');a.href=url;a.download=meta.mimeType.startsWith('application/vnd.google-apps.')?meta.name.replace(/\.pdf$/i,'')+'.pdf':meta.name;a.style.display='none';document.body.append(a);a.click();a.remove();status.textContent='Download ready. On iPhone or iPad, use Save to Files if the document opens.';
  }catch(error){status.textContent=error.message}finally{button.disabled=false}
 }
 async function openBkDocument(id){
  const item=items.find(r=>r.id===id);if(!item||!safeLink(item.link))return;
  let dialog=$('bk-document-preview');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='bk-document-preview';dialog.className='bk-dialog bk-document-preview';dialog.setAttribute('aria-labelledby','bk-preview-title');document.body.append(dialog);dialog.addEventListener('close',()=>{dialog.querySelector('.bk-preview-stage')?.replaceChildren();dialog.classList.remove('bk-preview-expanded')})}
  const driveId=documentDriveId(item.link),previewToken=Symbol();dialog.bkPreviewToken=previewToken;let pageNumber=1,pdf=null,renderSequence=0;
  dialog.innerHTML=`<header class="bk-preview-header"><div><small>${esc(caseYear)} · Document</small><h2 id="bk-preview-title">${esc(item.title)}</h2></div><div class="bk-preview-tools"><button type="button" id="bk-preview-expand" aria-pressed="false">Expand</button><button type="button" id="bk-preview-download">Download</button><button type="button" id="bk-preview-close" aria-label="Close document preview">✕</button></div></header><nav class="bk-preview-pages" aria-label="Document pages" hidden><button type="button" id="bk-preview-prev" aria-label="Previous page">←</button><span id="bk-preview-page-label" aria-live="polite"></span><button type="button" id="bk-preview-next" aria-label="Next page">→</button></nav><div class="bk-preview-stage"><p role="status">Loading document…</p></div><footer class="bk-preview-footer"><p id="bk-preview-message" role="status" aria-live="polite"></p><a href="${esc(safeLink(item.link))}" target="_blank" rel="noopener noreferrer">Open original ↗</a></footer>`;
  const stage=dialog.querySelector('.bk-preview-stage'),message=$('bk-preview-message');
  async function renderPage(){
   const sequence=++renderSequence;stage.setAttribute('aria-busy','true');
   $('bk-preview-prev').disabled=pageNumber<=1;$('bk-preview-next').disabled=pageNumber>=pdf.numPages;$('bk-preview-page-label').textContent='Page '+pageNumber+' of '+pdf.numPages;
   try{const canvas=await bkPageCanvas(pdf,pageNumber,Math.max(260,stage.clientWidth-32));canvas.setAttribute('role','img');canvas.setAttribute('aria-label',item.title+' — page '+pageNumber);if(sequence===renderSequence&&dialog.open&&dialog.bkPreviewToken===previewToken){stage.replaceChildren(canvas);stage.scrollTop=0}}catch(error){message.textContent=error.message}finally{if(sequence===renderSequence)stage.setAttribute('aria-busy','false')}
  }
  $('bk-preview-close').onclick=()=>dialog.close();
  $('bk-preview-expand').onclick=e=>{const expanded=dialog.classList.toggle('bk-preview-expanded');e.currentTarget.textContent=expanded?'Restore size':'Expand';e.currentTarget.setAttribute('aria-pressed',String(expanded));if(pdf)requestAnimationFrame(renderPage)};
  $('bk-preview-download').onclick=()=>downloadBkDocument(item,$('bk-preview-download'),message);
  $('bk-preview-prev').onclick=()=>{if(pdf&&pageNumber>1){pageNumber--;renderPage()}};
  $('bk-preview-next').onclick=()=>{if(pdf&&pageNumber<pdf.numPages){pageNumber++;renderPage()}};
  dialog.showModal();
  try{
   if(!driveId)throw new Error('Open the original document to view this file.');
   const file=await bkDocumentData(driveId);if(!dialog.open||dialog.bkPreviewToken!==previewToken)return;
   if(file.mime==='application/pdf'){
    const frame=document.createElement('iframe');
    frame.title=item.title;
    frame.src=bkBlobUrl(new Blob([file.bytes],{type:'application/pdf'}))+'#view=FitH';
    frame.style.cssText='display:block;width:100%;height:100%;min-height:0;border:0;background:#fff';
    stage.style.padding='0';stage.style.overflow='hidden';stage.replaceChildren(frame);
   }
   else if(file.mime.startsWith('image/')){const image=document.createElement('img');image.alt=item.title;image.src=bkBlobUrl(new Blob([file.bytes],{type:file.mime}));stage.replaceChildren(image)}
   else{const iframe=document.createElement('iframe');iframe.src='https://drive.google.com/file/d/'+encodeURIComponent(driveId)+'/preview';iframe.title=item.title;stage.replaceChildren(iframe)}
  }catch(error){stage.replaceChildren();message.textContent=error.message}
 }
 addEventListener('pagehide',()=>{bkThumbObserver?.disconnect();for(const url of bkObjectUrls)URL.revokeObjectURL(url);bkObjectUrls.clear()});

 function attorneyQuickAccess(){
 if(caseYear!=='2026'||folder||$('bk-search')?.value.trim())return '';
 const guides=items.filter(r=>r.type==='Document'&&r.status!=='Archived'&&/^bk-2026-guide-[123]$/.test(r.id)&&safeLink(r.link)).sort((a,b)=>a.id.localeCompare(b.id));
 return guides.length?`<section class="bk-attorney-quick" aria-label="Attorney quick access"><h3>Attorney quick access</h3><div>${guides.map(r=>`<button type="button" data-preview="${esc(r.id)}" aria-haspopup="dialog"><strong>${esc(r.title.replace('J.D. Power valuation','valuation'))}</strong><small>${r.link.includes('1msmXn_K0VUY6ieSD8R8LRQFl6CrG_NBj')?'Cleaned J.D. Power copy · Nov 2, 2026':'Original J.D. Power PDF'}</small></button>`).join('')}</div></section>`:'';
 }

 function renderList(){if(isDebtSection()){renderCreditors();return;}const q=$('bk-search').value.toLowerCase(),filter=$('bk-filter').value;const allowed=isDebtSection()?['Creditor']:section==='Tasks'?['Task']:section==='Documents'?['Document']:section==='Financial references'?['Financial reference']:['Note','Question'];const list=items.filter(r=>allowed.includes(r.type)&&(section!=='Documents'||q||r.folder===folder)&&(filter==='all'||(filter==='archived'?r.status==='Archived':r.status!=='Archived'))&&[r.title,r.notes,r.related].join(' ').toLowerCase().includes(q)).sort((a,b)=>b.updated.localeCompare(a.updated));if(section==='Documents'){$('bk-list').innerHTML=attorneyQuickAccess()+`<p class="bk-count">${list.length} file${list.length===1?'':'s'}${q?' found across all folders':folder?' in this folder':' in the case root'}</p><div class="bk-document-list">${list.map(r=>`<article class="bk-document">${safeLink(r.link)?`<button type="button" class="bk-document-thumb" data-preview="${esc(r.id)}" aria-label="Preview ${esc(r.title)}"><span>Loading preview…</span></button>`:'<div class="bk-document-missing">No file</div>'}<div class="bk-file-info"><small>${esc(r.folder||settings.rootTitle||'Case root')}</small><h3>${esc(r.title)}</h3><span class="bk-muted">${esc(r.source?.startsWith('Original city-issued')?'Original bill':r.status==='Linked'?'File saved':r.status)}</span></div><div class="bk-file-actions">${safeLink(r.link)?'':'<span class="bk-muted">File needed</span>'}<button data-edit="${esc(r.id)}" aria-label="Edit ${esc(r.title)}">Details / edit</button></div></article>`).join('')||'<div class="bk-panel bk-empty">No files here yet. Use + Document to upload a file or add its link.</div>'}</div>`;loadDocumentThumbnails();return};$('bk-list').innerHTML=`<p class="bk-count">${list.length} matching records</p><div class="bk-table-wrap"><table class="bk-table"><thead><tr><th>Record</th><th>Status / priority</th><th>Date / follow-up</th><th></th></tr></thead><tbody>${list.length?list.map(r=>`<tr><td><strong>${esc(r.title)}</strong><small>${esc(r.notes.slice(0,450))}${r.notes.length>450?'…':''}</small>${safeLink(r.link)?`<a href="${esc(safeLink(r.link))}" target="_blank" rel="noopener noreferrer">Open file / link ↗</a>`:r.type==='Document'?'<small>No file linked yet</small>':''}${r.related?`<small>Related: ${esc(r.related)}</small>`:''}</td><td><span class="bk-tag">${esc(r.status)}</span><span class="bk-tag ${r.priority==='High'?'high':''}">${esc(r.priority)}</span><small>${esc(r.type)}</small></td><td class="${r.due&&r.due.slice(0,10)<nowET().slice(0,10)&&!done(r)?'bk-overdue':''}">${esc(when(r.due))}</td><td><button data-edit="${esc(r.id)}">Edit</button></td></tr>`).join(''):'<tr><td colspan="4">No matching records. Add one to get started.</td></tr>'}</tbody></table></div>`}
 function setStatuses(type,value){if($('bk-creditor-fields'))$('bk-creditor-fields').hidden=type!=='Creditor';const select=$('bk-item-form').elements.namedItem('status');select.innerHTML=statusOptions[type].map(s=>`<option>${esc(s)}</option>`).join('');select.value=statusOptions[type].includes(value)?value:statusOptions[type][0];$('bk-upload-label').hidden=type!=='Document'}

 function showCreditorFields(r){let box=$('bk-creditor-fields');if(!box){box=document.createElement('div');box.id='bk-creditor-fields';box.className='bk-form-grid bk-wide';box.innerHTML='<label>Debt category<input id="bk-creditor-category" maxlength="150" placeholder="Medical, Utilities, Credit cards..."></label><label>Reported balance (blank = unknown)<input id="bk-creditor-balance" type="number" min="0" step="0.01"></label><label>NADA value (optional)<input id="bk-creditor-nada" type="number" min="0" step="0.01"></label><label>Date of purchase (optional)<input id="bk-creditor-purchased" type="date"></label><label>Date debt incurred (optional)<input id="bk-creditor-incurred" type="date"></label><label>Balance reported date<input id="bk-creditor-reported" type="date"></label>';$('bk-item-form').querySelector('.bk-form-grid').append(box);}box.hidden=r.type!=='Creditor';const d=intakeInfo(r);
 if(!box.querySelector('[data-intake]'))box.insertAdjacentHTML('beforeend',intakeFields.map(([key,label,type,options])=>'<label>'+esc(label)+(type==='select'?'<select data-intake="'+key+'"><option value="">Unknown / not recorded</option>'+options.map(o=>'<option>'+esc(o)+'</option>').join('')+'</select>':'<input data-intake="'+key+'" '+(type==='number'?'type="number" min="0" step="0.01"':type==='date'?'type="date"':'type="text"')+' placeholder="Unknown / not recorded">')+'</label>').join('')+'<p class="bk-wide">Leave unknown values blank. Address line 2 and Attention are optional. A blank payment is unknown; enter 0 only when confirmed.</p>');
 for(const input of box.querySelectorAll('[data-intake]'))input.value=d[input.dataset.intake]??'';
$('bk-creditor-purchased').value=d.purchaseDate||'';$('bk-creditor-incurred').value=d.debtIncurredDate||'';$('bk-creditor-category').value=d.category||(section==='Tax debts'?'Taxes':section==='Child support / alimony'?'Child support / alimony':'');$('bk-creditor-balance').value=d.balance??'';$('bk-creditor-reported').value=d.reported||'';$('bk-creditor-nada').value=d.nadaValue??'';}

 function openItem(id,type='Task'){if(!ready){message('Sign in and load BK before adding records.',true);return}editing=id?items.find(r=>r.id===id):null;const f=$('bk-item-form');f.reset();const r=editing||{type,title:'',priority:'Normal',due:'',notes:'',link:'',related:'',source:'Entered in BK',year:caseYear,folder};for(const name of ['type','title','priority','notes','link','related'])f.elements.namedItem(name).value=r[name]||'';f.elements.namedItem('due').value=r.due?.length===10?r.due+'T00:00':r.due||'';const folderField=f.elements.namedItem('folder');folderField.innerHTML='<option value="">'+esc(settings.rootTitle||'Case root')+'</option>'+(settings.folders||[]).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');folderField.value=r.folder||'';$('bk-editor-case').textContent='Case year: '+caseYear;setStatuses(r.type,r.status);showCreditorFields(r);$('bk-delete-item').hidden=!editing;$('bk-editor-title').textContent=editing?'Edit '+r.type:'Add '+r.type;$('bk-source').textContent=editing?'Source: '+(r.source||'Entered in BK')+' · Updated '+r.updated:'';$('bk-save-status').textContent='';$('bk-item-dialog').showModal()}

 async function deleteItem(){if(!editing)return;const record={...editing};if(!window.confirm('Delete "'+record.title+'" from this case? Linked files will stay saved.'))return;const button=$('bk-delete-item');button.disabled=true;$('bk-save-status').textContent='Deleting…';try{const current=await thValues("'BK Project Items'!A"+record.row+':N'+record.row,'UNFORMATTED_VALUE');if(current[0]?.[0]!==record.id||(current[0]?.[9]||'')!==record.updated)throw new Error('This record changed elsewhere. Refresh before deleting.');const values=Array.from({length:14},(_,i)=>current[0]?.[i]??'');values[3]='Deleted';values[9]=new Date().toISOString();await request('/values/'+encodeURIComponent("'BK Project Items'!A"+record.row+':N'+record.row)+'?valueInputOption=RAW',{values:[values]},'PUT');$('bk-item-dialog').close();editing=null;await window.thStart();message('Record deleted. Linked files were kept.');}catch(error){$('bk-save-status').textContent=error.message}finally{button.disabled=false}}

 async function uploadFile(file){if(file.size>25*1024*1024)throw new Error('This uploader supports files up to 25 MB. For larger backups, add a private file link instead.');const boundary='bk-'+crypto.randomUUID();const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({name:file.name})+'\r\n--'+boundary+'\r\nContent-Type: '+(file.type||'application/octet-stream')+'\r\n\r\n',file,'\r\n--'+boundary+'--'],{type:'multipart/related; boundary='+boundary});const r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',{method:'POST',headers:{Authorization:'Bearer '+thToken},body});if(!r.ok)throw new Error('The document upload did not finish. Your record has not been saved.');const data=await r.json();if(!data.webViewLink)throw new Error('The file uploaded, but its link was not returned. Locate it in your Google Drive before retrying.');return data.webViewLink}
 async function saveItem(e){e.preventDefault();const f=e.target,button=$('bk-save-item');button.disabled=true;$('bk-save-status').textContent='Saving…';try{const type=f.elements.namedItem('type').value;if(!types.includes(type))throw new Error('Choose a valid record type.');const title=f.elements.namedItem('title').value.trim(),status=f.elements.namedItem('status').value;if(!title)throw new Error('Enter a title.');if(!statusOptions[type].includes(status))throw new Error('Choose a valid status.');let link=f.elements.namedItem('link').value.trim();if(link&&!safeLink(link))throw new Error('Use a complete https:// link.');const file=$('bk-upload').files?.[0];if(type==='Document'&&file){$('bk-save-status').textContent='Uploading your private document…';link=await uploadFile(file);f.elements.namedItem('link').value=link;$('bk-upload').value='';}
 if(type==='Creditor'){const amount=$('bk-creditor-balance').value.trim();f.elements.namedItem('related').value=JSON.stringify({kind:'creditor',...creditorInfo(editing||{}),...Object.fromEntries(Array.from($('bk-creditor-fields').querySelectorAll('[data-intake]'),input=>[input.dataset.intake,input.dataset.intake==='monthlyPayment'?(input.value.trim()===''?null:Number(input.value)):input.value.trim()])),nadaValue:$('bk-creditor-nada').value.trim()===''?null:Number($('bk-creditor-nada').value),category:$('bk-creditor-category').value.trim()||'Uncategorized',balance:amount===''?null:Number(amount),purchaseDate:$('bk-creditor-purchased').value,debtIncurredDate:$('bk-creditor-incurred').value,debtIncurredBasis:$('bk-creditor-incurred').value===creditorInfo(editing||{}).debtIncurredDate?creditorInfo(editing||{}).debtIncurredBasis:'owner-entered',reported:$('bk-creditor-reported').value});}
 const stamp=new Date().toISOString(),values=[editing?.id||'bk-'+crypto.randomUUID(),type,title,status,f.elements.namedItem('priority').value,f.elements.namedItem('due').value,f.elements.namedItem('notes').value,link,editing?.created||stamp,stamp,editing?.source||'Entered in BK',f.elements.namedItem('related').value,editing?.year||caseYear,f.elements.namedItem('folder').value];
 if(editing){const current=await thValues("'BK Project Items'!A"+editing.row+':N'+editing.row,'UNFORMATTED_VALUE');if(current[0]?.[0]!==editing.id||(current[0]?.[9]||'')!==editing.updated)throw new Error('This record changed elsewhere. Copy your edits, then refresh BK before saving.');await request('/values/'+encodeURIComponent("'BK Project Items'!A"+editing.row+':N'+editing.row)+'?valueInputOption=RAW',{values:[values]},'PUT')}else await request('/values/'+encodeURIComponent("'BK Project Items'!A:N")+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{values:[values]});$('bk-item-dialog').close();await window.thStart();message('Project record saved.');}catch(error){$('bk-save-status').textContent=error.message}finally{button.disabled=false}}
 async function saveSettings(e){e.preventDefault();const f=e.target,button=f.querySelector('[type=submit]');button.disabled=true;$('bk-settings-status').textContent='Saving…';try{const record=caseRecords.find(r=>r.year===caseYear);const current=await thValues("'BK Case Records'!A"+record.row+':B'+record.row,'UNFORMATTED_VALUE');const live=JSON.parse(current[0]?.[1]||'{}');if(String(current[0]?.[0])!==caseYear||live.updatedAt!==settings.updatedAt)throw new Error('Case details changed elsewhere. Refresh before saving.');const next={...live};for(const key of ['firm','attorney','caseNumber','chapter','court','filedDate','dischargeDate','caseStatus','projectState','projectNotes'])next[key]=f.elements.namedItem(key).value;next.updatedAt=new Date().toISOString();await request('/values/'+encodeURIComponent("'BK Case Records'!B"+record.row)+'?valueInputOption=RAW',{values:[[JSON.stringify(next)]]},'PUT');await window.thStart();message(caseYear+' case details saved.');}catch(error){$('bk-settings-status').textContent=error.message}finally{button.disabled=false}}
 $('bk-case-year').onchange=()=>{caseYear=$('bk-case-year').value;folder='';scopeCase();render()};
 $('bk-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-section]');if(b&&ready){section=b.dataset.section;render()}});
 $('bk-content').addEventListener('click',e=>{const preview=e.target.closest('[data-preview]');if(preview){openBkDocument(preview.dataset.preview);return;}const edit=e.target.closest('[data-edit]'),add=e.target.closest('[data-add]'),tab=e.target.closest('[data-section]'),year=e.target.closest('[data-case]'),dir=e.target.closest('[data-folder]');if(year){caseYear=year.dataset.case;folder='';section='Documents';scopeCase();render();return}if(dir){folder=dir.dataset.folder;section='Documents';render();return}if(edit)openItem(edit.dataset.edit);else if(add)openItem(null,add.dataset.add);else if(tab){section=tab.dataset.section;render()}});
 $('bk-add').onclick=()=>openItem(null,section==='Documents'?'Document':isDebtSection()?'Creditor':section==='Notes & questions'?'Note':'Task');$('bk-refresh').onclick=()=>window.thStart().catch(e=>message(e.message,true));$('bk-close').onclick=()=>$('bk-item-dialog').close();$('bk-delete-item').onclick=deleteItem;$('bk-item-form').onsubmit=saveItem;$('bk-item-form').elements.namedItem('type').onchange=e=>{setStatuses(e.target.value);if(e.target.value==='Creditor')showCreditorFields(editing||{type:'Creditor'});};
 $('bk-backup').onclick=()=>{if(!ready){message('Load BK before exporting.',true);return}const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),cases:caseRecords,items:allItems},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='TisZod-BK-project-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);message('BK backup downloaded. It contains private project information and file links, not copies of linked files.')};

 // Keep a viewport-level copy of the creditor headings during page scrolling.
 let frozenHead=null,headerFrame=0,headerSource=null;
 function syncCreditorHead(){
  headerFrame=0;
  const wrap=document.querySelector('.bk-creditor-scroll'),table=wrap?.querySelector('.bk-creditor-table'),head=table?.tHead;
  if(!head){frozenHead?.remove();frozenHead=null;headerSource=null;return;}
  const bar=document.querySelector('.th-app-topbar'),barRect=bar?.getBoundingClientRect(),barPosition=bar?getComputedStyle(bar).position:'';
  const top=barRect&&['sticky','fixed'].includes(barPosition)?Math.max(0,barRect.bottom):0;
  document.documentElement.style.setProperty('--bk-heading-top',top+'px');
  if(innerWidth>=1500){if(frozenHead)frozenHead.hidden=true;return;}
  const rect=wrap.getBoundingClientRect(),hr=head.getBoundingClientRect(),height=hr.height;
  if(hr.top>=top||rect.bottom<=top+height||rect.right<=0||rect.left>=innerWidth){if(frozenHead)frozenHead.hidden=true;return;}
  if(!frozenHead){frozenHead=document.createElement('div');frozenHead.className='bk bk-frozen-creditor-head';frozenHead.setAttribute('aria-hidden','true');frozenHead.inert=true;document.body.append(frozenHead);}
  if(headerSource!==head){const copy=table.cloneNode(false);copy.removeAttribute('id');copy.append(head.cloneNode(true));copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));frozenHead.replaceChildren(copy);headerSource=head;}
  const clone=frozenHead.firstElementChild,originalCells=[...head.querySelectorAll('th')];
  [...clone.querySelectorAll('th')].forEach((cell,i)=>{cell.style.width=originalCells[i].getBoundingClientRect().width+'px';cell.style.boxSizing='border-box';});
  const left=Math.max(0,rect.left),right=Math.min(innerWidth,rect.right);
  frozenHead.hidden=false;frozenHead.style.cssText='position:fixed;z-index:39;pointer-events:none;overflow:hidden;margin:0;max-width:none;top:'+top+'px;left:'+left+'px;width:'+Math.max(0,right-left)+'px;height:'+height+'px;';
  clone.style.cssText='table-layout:fixed;border-collapse:separate;border-spacing:0;min-width:0;width:'+table.getBoundingClientRect().width+'px;transform:translateX('+(rect.left-left-wrap.scrollLeft)+'px);';
 }
 function queueCreditorHead(){if(!headerFrame)headerFrame=requestAnimationFrame(syncCreditorHead);}
 addEventListener('scroll',queueCreditorHead,{capture:true,passive:true});
 addEventListener('resize',queueCreditorHead,{passive:true});
 new MutationObserver(queueCreditorHead).observe($('bk-content'),{childList:true,subtree:true});
 if(window.ResizeObserver){const observer=new ResizeObserver(queueCreditorHead);const bar=document.querySelector('.th-app-topbar');if(bar)observer.observe(bar);}
 queueCreditorHead();

 window.thViewAdapter={capture:()=>({section,caseYear,folder}),restore:s=>{if(sections.includes(s?.section)){section=s.section;if(caseRecords.some(c=>c.year===s.caseYear))caseYear=s.caseYear;folder=s.folder||'';scopeCase();render()}}};
})();


