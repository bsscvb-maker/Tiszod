'use strict';(()=>{
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let records=[],selected=false;
const status=t=>$('investment-status').textContent=t;
const docs=()=>records.filter(r=>r.data.kind!=='collection');
const collection=()=>records.find(r=>r.data.kind==='collection');
const preview=d=>'https://drive.google.com/file/d/'+encodeURIComponent(d.fileId)+'/preview';
const valid=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:''}catch{return ''}};
window.thStart=async()=>{const rows=await thValues("'Investment Records'!A1:B1000",'UNFORMATTED_VALUE');if(rows[0]?.[0]!=='ID')throw Error('Investment records unavailable.');records=rows.slice(1).filter(r=>r[0]).map((r,i)=>({id:r[0],row:i+2,data:JSON.parse(r[1]||'{}')}));render();status('Private investment records connected.');};
function render(){
$('investment-summary').hidden=selected;$('investment-detail').hidden=!selected;
const c=collection()?.data||{},active=docs().filter(r=>!r.data.deleted),cover=active.find(r=>r.data.name.includes('Original stock'));
$('investment-summary').innerHTML='<button class="investment-cover" id="investment-open">'+(cover?'<iframe src="'+preview(cover.data)+'" title="Original stock certificate preview" loading="lazy" tabindex="-1"></iframe>':'')+'<span><h2>'+esc(c.name||'Investments')+'</h2><p>'+esc(c.status||'Historical records')+'</p><small>'+active.length+' documents · 1999–2015</small></span></button>';
$('investment-open').onclick=()=>{selected=true;render()};
if(!selected)return;
$('investment-title').textContent=c.name||'Investment records';$('investment-note').textContent=c.notes||'No notes yet.';$('investment-state').textContent=c.status||'Historical records';
$('investment-shares').textContent=c.shares===''||c.shares==null?'—':c.shares;$('investment-value').textContent=c.value===''||c.value==null?'—':Number(c.value).toLocaleString('en-US',{style:'currency',currency:'USD'});
const q=$('investment-search').value.trim().toLowerCase(),cat=$('investment-category').value,deleted=$('investment-view').value==='deleted';
const list=docs().filter(r=>Boolean(r.data.deleted)===deleted&&(!cat||r.data.category===cat)&&(r.data.name+' '+r.data.originalName+' '+r.data.category).toLowerCase().includes(q));
$('investment-count').textContent=list.length+' documents';$('investment-grid').innerHTML=list.map(r=>'<article class="investment-doc" data-file-id="'+esc(r.id)+'"><button class="investment-preview" data-open="'+esc(r.id)+'"><iframe src="'+preview(r.data)+'" title="'+esc(r.data.name)+' preview" loading="lazy" tabindex="-1"></iframe><span><strong>'+esc(r.data.name)+'</strong><small>'+esc(r.data.category)+'</small></span></button><footer><button data-download="'+esc(r.id)+'">Download PDF</button></footer></article>').join('')||'<p>No matching documents.</p>';
}
$('investment-back').onclick=()=>{selected=false;render()};for(const id of ['investment-search','investment-category','investment-view'])$(id).addEventListener(id.endsWith('search')?'input':'change',render);
$('investment-refresh').onclick=()=>window.thStart().catch(e=>status(e.message));
let opened=null;
$('investment-grid').onclick=e=>{const b=e.target.closest('button');if(!b)return;const r=records.find(r=>r.id===(b.dataset.open||b.dataset.download));if(!r)return;if(b.dataset.download){download(r);return}opened=r.id;$('investment-reader-title').textContent=r.data.name;$('investment-reader-frame').src=preview(r.data);$('investment-original').href=valid(r.data.url);$('investment-reader').showModal();};
async function download(r){try{status('Preparing download…');const response=await thDriveFetch(r.data.fileId);if(!response.ok)throw Error('Download unavailable. Use the document viewer to download from Drive.');const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download=r.data.originalName||r.data.name+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status('Download ready.')}catch(e){status(e.message)}}
$('investment-reader-download').onclick=()=>{const r=records.find(r=>r.id===opened);if(r)download(r)};$('investment-reader-close').onclick=()=>$('investment-reader').close();$('investment-reader').addEventListener('close',()=>{opened=null;$('investment-reader-frame').src='about:blank'});
$('investment-edit').onclick=()=>{const c=collection()?.data;if(!c)return;for(const key of ['status','shares','value','notes'])$('investment-form').elements[key].value=c[key]??'';$('investment-save-status').textContent='';$('investment-dialog').showModal()};$('investment-cancel').onclick=()=>$('investment-dialog').close();
$('investment-form').onsubmit=async e=>{e.preventDefault();const r=collection(),button=e.submitter;button.disabled=true;try{const live=await thValues("'Investment Records'!A"+r.row+':B'+r.row,'UNFORMATTED_VALUE');if(live[0]?.[0]!==r.id||live[0]?.[1]!==JSON.stringify(r.data))throw Error('This record changed elsewhere. Refresh before saving.');const values=Object.fromEntries(new FormData(e.target)),next={...r.data,...values,updatedAt:new Date().toISOString()};if(values.value!==''&&!Number.isFinite(Number(values.value)))throw Error('Enter a valid current value.');const response=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+TH_SHEET_ID+'/values/'+encodeURIComponent("'Investment Records'!B"+r.row)+'?valueInputOption=RAW',{method:'PUT',headers:{Authorization:'Bearer '+thToken,'Content-Type':'application/json'},body:JSON.stringify({values:[[JSON.stringify(next)]]})});if(!response.ok)throw Error('Could not save.');r.data=next;$('investment-dialog').close();render()}catch(e){$('investment-save-status').textContent=e.message}finally{button.disabled=false}};
window.thViewAdapter={capture:()=>({selected,opened}),restore:s=>{selected=Boolean(s?.selected);render();if(s?.opened){document.querySelector('[data-open="'+CSS.escape(s.opened)+'"]')?.click()}else if($('investment-reader').open)$('investment-reader').close()}};
window.thFileBrowser?.mount({name:'investments',host:'investment-grid',deleted:()=>$('investment-view').value==='deleted',change:(ids,deleted)=>window.thFileBrowser.updateJSON('Investment Records',records,ids,deleted)});
})();
