'use strict';(()=>{
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let records=[],editing=null,ready=false,page=1;
const safe=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:''}catch{return ''}};
const message=t=>$('education-status').textContent=t;
async function save(r,d){if(!thAuthorized())throw Error('Sign in again to save.');d.updatedAt=new Date().toISOString();let range="'Education Records'!A:B",method='POST',suffix=':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',values=[[r?.id||crypto.randomUUID(),JSON.stringify(d)]];
if(r){const live=await thValues("'Education Records'!A"+r.row+":B"+r.row,'UNFORMATTED_VALUE');if(live[0]?.[0]!==r.id||JSON.parse(live[0][1]).updatedAt!==r.data.updatedAt)throw Error('This record changed elsewhere. Refresh before saving.');range="'Education Records'!A"+r.row+":B"+r.row;method='PUT';suffix='?valueInputOption=RAW'}
const res=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+TH_SHEET_ID+'/values/'+encodeURIComponent(range)+suffix,{method,headers:{Authorization:'Bearer '+thToken,'Content-Type':'application/json'},body:JSON.stringify({values})});if(!res.ok)throw Error('Save failed. Check your connection and retry.');await window.thStart()}
window.thStart=async()=>{const rows=await thValues("'Education Records'!A1:B2000",'UNFORMATTED_VALUE');if(rows[0]?.[0]!=='ID')throw Error('Education records could not load.');records=rows.slice(1).map((r,i)=>({id:r[0],row:i+2,data:JSON.parse(r[1]||'{}')})).filter(r=>r.id);const folderSelect=$('education-folder'),prior=folderSelect.value;folderSelect.innerHTML='<option value="">All folders</option>'+[...new Set(records.map(r=>r.data.folder).filter(Boolean))].sort().map(f=>'<option value="'+esc(f)+'">'+esc(f)+'</option>').join('');folderSelect.value=prior;ready=true;render();message('Private education records connected.');$('th-connection').textContent='Private workbook connected'};


let selectedPerson='',selectedCategory='',selectedFolder='',recordPage=1;
const isEducation=true;
function title(d){
 let n=String(d.name||'Document').replace(/\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|rtf|epub|txt)$/i,'').replace(/_/g,' ');
 if(!isEducation){if(/social security/i.test(n))return 'Social Security Card';if(/birth certificate/i.test(n)&&!/process/i.test(n))return 'Birth Certificate';if(/marriage certificate/i.test(n))return 'Marriage Certificate';if(/boater.*license/i.test(n))return 'Boating License';if(/drivers? license/i.test(n))return /replacement/i.test(n)?'Driver’s License — Replacement Record':'Driver’s License';}
 return n;
}
function preview(d){
 if(/\.epub$/i.test(d.name||''))return '<div class="book-jacket" data-book-cover="'+esc(d.url.match(/\/d\/([^/]+)/)?.[1]||'')+'"><span class="book-jacket-title">'+esc(title(d))+'</span><small>EPUB · Read book</small></div>';
 let u;try{u=new URL(safe(d.url))}catch{return '<span class="record-placeholder">Document</span>'}
 const folder=u.pathname.includes('/folders/'),id=u.pathname.match(/\/d\/([^/]+)/)?.[1];
 if(folder)return '<span class="record-placeholder">▤<small>Archive folder</small></span>';
 if(id&&['drive.google.com','docs.google.com'].includes(u.hostname))return '<iframe class="record-preview" src="https://drive.google.com/file/d/'+encodeURIComponent(id)+'/preview" title="'+esc(title(d))+' preview" loading="lazy" tabindex="-1" referrerpolicy="no-referrer"></iframe>';
 return '<span class="record-placeholder">'+esc(d.category||'Document')+'</span>';
}
function card(r){const d=r.data,u=safe(d.url),epub=/\.epub$/i.test(d.name||'');return '<article class="education-card visual-record">'+(u&&!d.deleted?'<a '+(epub?'data-read-book="'+esc(r.id)+'" ':'')+'class="record-link" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(title(d))+'">'+preview(d)+'<div class="record-caption"><h3>'+esc(title(d))+'</h3><small>'+esc(d.person||'General')+' · '+esc(d.category||'')+'</small>'+(isEducation&&d.folder?'<small>'+esc(d.folder)+'</small>':'')+(d.expires?'<small>Expires '+esc(d.expires)+'</small>':'')+'</div></a>':'<h3>'+esc(title(d))+'</h3>')+'<footer>'+(d.deleted?'<button data-restore="'+esc(r.id)+'">Restore</button>':'<button data-edit="'+esc(r.id)+'">Edit</button><button data-delete="'+esc(r.id)+'">Delete</button>')+'</footer></article>'}
function groupCard(label,count,attribute,value){return '<button class="education-card person-record" '+attribute+'="'+esc(value)+'"><span class="person-avatar" aria-hidden="true">'+esc(isEducation?'▤':label.charAt(0))+'</span><h3>'+esc(label)+'</h3><p>'+count+' '+(count===1?'document':'documents')+'</p></button>'}
function render(){
 const q=$('education-search').value.trim().toLowerCase(),person=$('education-person').value,category=$('education-category').value,deleted=$('education-view').value==='deleted';
 const list=records.filter(r=>!!r.data.deleted===deleted&&(!person||r.data.person===person)&&(!category||r.data.category===category)&&[r.data.name,r.data.person,r.data.category,r.data.folder,r.data.notes].join(' ').toLowerCase().includes(q));
 $('education-pin-section').hidden=true;
 const grid=$('education-grid'),chosen=person||selectedPerson;
 const heading=grid.previousElementSibling;
 let shown=list,html='<div class="record-breadcrumb"><button data-record-back="root">← '+(isEducation?'Education':'People')+'</button>';
 if(!isEducation&&chosen){shown=shown.filter(r=>(r.data.person||'General')===chosen);html+='<strong>'+esc(chosen)+'</strong>';}
 if(isEducation&&selectedCategory){shown=shown.filter(r=>(r.data.category||'Other')===selectedCategory);html+='<strong>'+esc(selectedCategory)+'</strong>';}
 if(isEducation&&selectedFolder){shown=shown.filter(r=>(r.data.folder||'')===selectedFolder||r.data.folder?.startsWith(selectedFolder+'/'));html+='<button data-record-back="category">← '+esc(selectedCategory||'Categories')+'</button><strong>'+esc(selectedFolder)+'</strong>';}
 html+='</div>';
 if(!q&&!person&&!category&&!deleted&&!chosen&&!isEducation){heading.textContent='Choose a person';$('education-count').textContent=list.length+' documents';grid.innerHTML=[...new Set(['Todd','Aiden','Alexis','Heather','Tracy',...list.map(r=>r.data.person||'General')])].map(p=>groupCard(p,list.filter(r=>(r.data.person||'General')===p).length,'data-person',p)).join('');return}
 if(isEducation&&!selectedCategory&&!q&&!category&&!deleted){heading.textContent='Choose a category';$('education-count').textContent=list.length+' records';grid.innerHTML=['School','Certificates','Books','Career','Other'].filter(c=>list.some(r=>(r.data.category||'Other')===c)).map(c=>groupCard(c,list.filter(r=>(r.data.category||'Other')===c).length,'data-record-category',c)).join('');return}
 if(isEducation&&selectedCategory&&!selectedFolder&&!q&&!category&&!deleted){const groups=[...new Set(shown.map(r=>r.data.folder?.split('/')[0]).filter(Boolean))].sort();if(groups.length){heading.textContent=selectedCategory;const loose=shown.filter(r=>!r.data.folder);$('education-count').textContent=shown.length+' records';grid.innerHTML=html+groups.map(f=>groupCard(f,shown.filter(r=>r.data.folder===f||r.data.folder?.startsWith(f+'/')).length,'data-folder',f)).join('')+loose.slice(0,24).map(card).join('');return}}
 heading.textContent=q?'Search results':isEducation?(selectedFolder||selectedCategory||category||'Documents'):(chosen||'Documents');
 $('education-count').textContent=shown.length+' '+(shown.length===1?'document':'documents');
 const pages=Math.max(1,Math.ceil(shown.length/18));recordPage=Math.max(1,Math.min(recordPage,pages));
 grid.innerHTML=html+shown.sort((a,b)=>title(a.data).localeCompare(title(b.data))).slice((recordPage-1)*18,recordPage*18).map(card).join('')+(shown.length?'':'<p class="record-empty">No documents here yet.</p>')+(pages>1?'<div class="record-breadcrumb"><button data-record-page="-1" '+(recordPage===1?'disabled':'')+'>← Previous</button><span>Page '+recordPage+' of '+pages+'</span><button data-record-page="1" '+(recordPage===pages?'disabled':'')+'>Next →</button></div>':'');
}
document.querySelector('.education').addEventListener('click',e=>{
 const link=e.target.closest('[data-read-book]');if(link){e.preventDefault();const r=records.find(r=>r.id===link.dataset.readBook);const id=r?.data.url.match(/\/d\/([^/]+)/)?.[1];if(id&&window.thReadBook)window.thReadBook(id,title(r.data),r.data.url);return;}
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.person){selectedPerson=b.dataset.person;recordPage=1;render()}
 if(b.dataset.recordCategory){selectedCategory=b.dataset.recordCategory;selectedFolder='';recordPage=1;render()}
 if(b.dataset.folder){selectedFolder=b.dataset.folder;recordPage=1;render()}
 if(b.dataset.recordBack){selectedFolder='';if(b.dataset.recordBack==='root'){selectedPerson='';selectedCategory='';$('education-person').value='';$('education-category').value='';$('education-search').value=''}recordPage=1;render()}
 if(b.dataset.recordPage){recordPage+=Number(b.dataset.recordPage);render()}
});
function edit(id){if(!ready)return;editing=records.find(r=>r.id===id)||null;const f=$('education-form');f.reset();for(const k of ['name','person','category','url','expires','notes'])f.elements.namedItem(k).value=editing?.data[k]||({person:selectedPerson||'Todd',category:selectedCategory||'Other'}[k]||'');$('education-save-status').textContent='';$('education-dialog').showModal()}
document.querySelector('.education').onclick=async e=>{const b=e.target.closest('button');if(!b||!ready)return;try{if(b.id==='education-add')edit();else if(b.id==='education-prev'){page=Math.max(1,page-1);render()}else if(b.id==='education-next'){page++;render()}else if(b.dataset.edit)edit(b.dataset.edit);else {const id=b.dataset.delete||b.dataset.restore;if(!id)return;const r=records.find(r=>r.id===id),d={...r.data};if(b.dataset.delete){if(!confirm('Remove this document from the dashboard? You can restore it from Deleted documents. Its original Drive file stays unchanged.'))return;d.deleted=true}else d.deleted=false;await save(r,d)}}catch(err){message(err.message)}};
$('education-form').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('[type=submit]');b.disabled=true;try{const d={...(editing?.data||{favorite:false,deleted:false})};for(const k of ['name','person','category','url','expires','notes'])d[k]=f.elements.namedItem(k).value.trim();if(!safe(d.url))throw Error('Enter a complete https:// document link.');await save(editing,d);$('education-dialog').close();message('Document saved.')}catch(err){$('education-save-status').textContent=err.message}finally{b.disabled=false}};
for(const id of ['education-search','education-person','education-category','education-folder','education-view'])$(id).addEventListener(id==='education-search'?'input':'change',()=>{page=1;recordPage=1;render()});$('education-refresh').onclick=()=>window.thStart().catch(e=>message(e.message));$('education-close').onclick=()=>$('education-dialog').close();

for(const id of ['education-prev','education-next','education-page','education-folder']){const el=document.getElementById(id);if(el)el.hidden=true;}document.querySelector('label:has(#education-folder)')?.setAttribute('hidden','');
for(const id of ['education-person','education-category','education-view'])$(id).addEventListener('change',()=>{selectedPerson='';selectedCategory='';selectedFolder='';recordPage=1;render()});

const jacketStyle=document.createElement('style');jacketStyle.textContent='.book-jacket{height:270px;background:linear-gradient(120deg,#17394c,#31635b);color:#fff;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:28px 24px;box-sizing:border-box;text-align:center;border-left:12px solid #0003;position:relative}.book-jacket-title{font:700 23px/1.4 Georgia,serif;overflow:hidden;max-height:190px}.book-jacket img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#10202c}.book-jacket small{color:#e0ebef}';document.head.append(jacketStyle);
let coverBusy=0;const coverQueue=[];
async function pumpCovers(){if(coverBusy>=3||!coverQueue.length||!window.thBookCover)return;const el=coverQueue.shift();if(!el.isConnected){pumpCovers();return}coverBusy++;try{const url=await window.thBookCover(el.dataset.bookCover);if(url&&el.isConnected){const img=document.createElement('img');img.src=url;img.alt=el.querySelector('.book-jacket-title')?.textContent+' — book cover';el.replaceChildren(img)}}catch{}finally{coverBusy--;pumpCovers()}}
const coverObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){coverObserver.unobserve(entry.target);coverQueue.push(entry.target);pumpCovers()}},{rootMargin:'150px'});
function observeCovers(){document.querySelectorAll('[data-book-cover]').forEach(el=>{if(!el.dataset.observed){el.dataset.observed='true';coverObserver.observe(el)}})}
new MutationObserver(observeCovers).observe($('education-grid'),{childList:true,subtree:true});
window.addEventListener('tiszod-drive-books-connected',()=>{document.querySelectorAll('[data-book-cover]').forEach(el=>{if(!el.querySelector('img')){coverQueue.push(el);pumpCovers()}})});

})();