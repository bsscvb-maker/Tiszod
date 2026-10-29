'use strict';(()=>{
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let records=[],editing=null,ready=false;
const safe=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:''}catch{return ''}};
const message=t=>$('identity-status').textContent=t;
async function save(r,d){if(!thAuthorized())throw Error('Sign in again to save.');d.updatedAt=new Date().toISOString();let range="'Identification Records'!A:B",method='POST',suffix=':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',values=[[r?.id||crypto.randomUUID(),JSON.stringify(d)]];
if(r){const live=await thValues("'Identification Records'!A"+r.row+":B"+r.row,'UNFORMATTED_VALUE');if(live[0]?.[0]!==r.id||JSON.parse(live[0][1]).updatedAt!==r.data.updatedAt)throw Error('This record changed elsewhere. Refresh before saving.');range="'Identification Records'!A"+r.row+":B"+r.row;method='PUT';suffix='?valueInputOption=RAW'}
const res=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+TH_SHEET_ID+'/values/'+encodeURIComponent(range)+suffix,{method,headers:{Authorization:'Bearer '+thToken,'Content-Type':'application/json'},body:JSON.stringify({values})});if(!res.ok)throw Error('Save failed. Check your connection and retry.');await window.thStart()}
window.thStart=async()=>{const rows=await thValues("'Identification Records'!A1:B2000",'UNFORMATTED_VALUE');if(rows[0]?.[0]!=='ID')throw Error('Identification records could not load.');records=rows.slice(1).map((r,i)=>({id:r[0],row:i+2,data:JSON.parse(r[1]||'{}')})).filter(r=>r.id);ready=true;render();message('Private identification records connected.');$('th-connection').textContent='Private workbook connected'};

let selectedPerson='',selectedFolder='';
function title(d){
 let n=String(d.name||'Document').replace(/\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|rtf|epub|txt)$/i,'').replace(/_/g,' ');
 if("identification"==='identification'){
 if(/social security/i.test(n))return 'Social Security Card';
 if(/birth certificate/i.test(n)&&!/process/i.test(n))return 'Birth Certificate';
 if(/marriage certificate/i.test(n))return 'Marriage Certificate';
 if(/boater.*license/i.test(n))return 'Boating License';
 if(/drivers? license/i.test(n))return "Driver’s License"+(/replacement/i.test(n)?' — Replacement Record':'');
 }
 return n;
}
function preview(d){
 const u=safe(d.url);let id='';try{const p=new URL(u);if(['drive.google.com','docs.google.com'].includes(p.hostname))id=p.pathname.match(/\/d\/([^/]+)/)?.[1]||''}catch{}
 return id?'<iframe class="record-preview" src="https://drive.google.com/file/d/'+encodeURIComponent(id)+'/preview" title="'+esc(title(d))+' preview" loading="lazy" tabindex="-1" referrerpolicy="no-referrer"></iframe>':'<div class="record-preview record-placeholder">'+esc(d.category||'Folder')+'</div>';
}
function card(r){const d=r.data,u=safe(d.url);return '<article class="identity-card visual-record">'+(u&&!d.deleted?'<a class="record-link" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+preview(d)+'<h3>'+esc(title(d))+'</h3></a>':'<h3>'+esc(title(d))+'</h3>')+'<small>'+esc(d.category||'')+'</small>'+(d.expires?'<p>Expires '+esc(d.expires)+'</p>':'')+'<footer>'+(d.deleted?'<button data-restore="'+esc(r.id)+'">Restore</button>':'<button data-edit="'+esc(r.id)+'">Edit</button><button data-delete="'+esc(r.id)+'">Delete</button>')+'</footer></article>'}
function render(){
 const q=$('identity-search').value.toLowerCase(),person=$('identity-person').value,category=$('identity-category').value,deleted=$('identity-view').value==='deleted';
 const list=records.filter(r=>!!r.data.deleted===deleted&&(!person||r.data.person===person)&&(!category||r.data.category===category)&&[r.data.name,r.data.person,r.data.category,r.data.folder,r.data.notes].join(' ').toLowerCase().includes(q));
 $('identity-pin-section').hidden=true;
 const grid=$('identity-grid');$('identity-count').textContent=list.length+' documents';
 const heading=grid.previousElementSibling;heading.textContent=selectedPerson||person||'People';
 const chosen=person||selectedPerson;
 if(!chosen){grid.innerHTML=[...new Set(['Todd','Aiden','Alexis','Heather','Tracy',...list.map(r=>r.data.person||'General')])].map(p=>{const count=list.filter(r=>(r.data.person||'General')===p).length;return '<button class="identity-card person-record" data-person="'+esc(p)+'"><span class="person-avatar">'+esc(p.charAt(0))+'</span><h3>'+esc(p)+'</h3><p>'+count+' documents</p></button>'}).join('');return}
 let shown=list.filter(r=>(r.data.person||'General')===chosen);
 const folders="identification"==='education'?[...new Set(shown.map(r=>r.data.folder?.split('/')[0]||r.data.category||'Other'))].sort():[];
 let html='<div class="record-breadcrumb"><button data-record-back="people">← People</button><strong>'+esc(chosen)+'</strong>'+(selectedFolder?'<button data-record-back="folders">← Folders</button><span>'+esc(selectedFolder)+'</span>':'')+'</div>';
 if(folders.length&&!selectedFolder&&!q&&!category){grid.innerHTML=html+folders.map(f=>'<button class="identity-card person-record" data-folder="'+esc(f)+'"><span class="person-avatar">▤</span><h3>'+esc(f.replace(/^\d+-/,''))+'</h3><p>'+shown.filter(r=>(r.data.folder?.split('/')[0]||r.data.category||'Other')===f).length+' documents</p></button>').join('');return}
 if(selectedFolder)shown=shown.filter(r=>(r.data.folder?.split('/')[0]||r.data.category||'Other')===selectedFolder);
 const pages=Math.max(1,Math.ceil(shown.length/24));recordPage=Math.min(recordPage,pages);
 grid.innerHTML=html+shown.sort((a,b)=>title(a.data).localeCompare(title(b.data))).slice((recordPage-1)*24,recordPage*24).map(card).join('')+(shown.length?'':'<p>No documents here yet.</p>')+(pages>1?'<div class="record-breadcrumb"><button data-record-page="-1" '+(recordPage===1?'disabled':'')+'>← Previous</button><span>Page '+recordPage+' of '+pages+'</span><button data-record-page="1" '+(recordPage===pages?'disabled':'')+'>Next →</button></div>':'');
}
let recordPage=1;
document.querySelector('.identification').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.person){selectedPerson=b.dataset.person;selectedFolder='';recordPage=1;render()}
 if(b.dataset.folder){selectedFolder=b.dataset.folder;recordPage=1;render()}
 if(b.dataset.recordBack){if(b.dataset.recordBack==='people'){selectedPerson='';$('identity-person').value=''}selectedFolder='';recordPage=1;render()}
 if(b.dataset.recordPage){recordPage+=Number(b.dataset.recordPage);render()}
});
const recordStyle=document.createElement('style');recordStyle.textContent='.record-link{display:block;color:inherit;text-decoration:none}.record-link:hover h3{text-decoration:underline}.record-preview{display:block;width:100%;height:230px;border:0;border-radius:8px;background:#182436;pointer-events:none}.record-link{position:relative}.record-link:after{content:"";position:absolute;inset:0}.record-link h3{margin:15px 0}.record-placeholder{display:grid;place-items:center;font-size:24px}.person-record{text-align:left;cursor:pointer;min-height:170px;color:inherit}.person-avatar{display:grid;place-items:center;width:48px;height:48px;border-radius:12px;background:#285581;font:700 24px system-ui}.record-breadcrumb{grid-column:1/-1;display:flex;align-items:center;gap:14px;flex-wrap:wrap}.visual-record footer{margin-top:16px}';document.head.append(recordStyle);
function edit(id){if(!ready)return;editing=records.find(r=>r.id===id)||null;const f=$('identity-form');f.reset();for(const k of ['name','person','category','url','expires','notes'])f.elements.namedItem(k).value=editing?.data[k]||({person:'Todd',category:'Other'}[k]||'');$('identity-save-status').textContent='';$('identity-dialog').showModal()}
document.querySelector('.identification').onclick=async e=>{const b=e.target.closest('button');if(!b||!ready)return;try{if(b.id==='identity-add')edit();else if(b.dataset.edit)edit(b.dataset.edit);else {const id=b.dataset.delete||b.dataset.restore;if(!id)return;const r=records.find(r=>r.id===id),d={...r.data};if(b.dataset.delete){if(!confirm('Remove this document from the dashboard? You can restore it from Deleted documents. Its original Drive file stays unchanged.'))return;d.deleted=true}else d.deleted=false;await save(r,d)}}catch(err){message(err.message)}};
$('identity-form').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('[type=submit]');b.disabled=true;try{const d={...(editing?.data||{favorite:false,deleted:false})};for(const k of ['name','person','category','url','expires','notes'])d[k]=f.elements.namedItem(k).value.trim();if(!safe(d.url))throw Error('Enter a complete https:// document link.');await save(editing,d);$('identity-dialog').close();message('Document saved.')}catch(err){$('identity-save-status').textContent=err.message}finally{b.disabled=false}};
for(const id of ['identity-search','identity-person','identity-category','identity-view'])$(id).addEventListener(id==='identity-search'?'input':'change',render);$('identity-refresh').onclick=()=>window.thStart().catch(e=>message(e.message));$('identity-close').onclick=()=>$('identity-dialog').close();

document.getElementById('identity-person').addEventListener('change',()=>{selectedPerson='';selectedFolder='';recordPage=1;render()});
})();