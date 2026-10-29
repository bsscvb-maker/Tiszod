'use strict';(()=>{
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let records=[],editing=null,ready=false;
const safe=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:''}catch{return ''}};
const message=t=>$('identity-status').textContent=t;
async function save(r,d){if(!thAuthorized())throw Error('Sign in again to save.');d.updatedAt=new Date().toISOString();let range="'Identification Records'!A:B",method='POST',suffix=':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',values=[[r?.id||crypto.randomUUID(),JSON.stringify(d)]];
if(r){const live=await thValues("'Identification Records'!A"+r.row+":B"+r.row,'UNFORMATTED_VALUE');if(live[0]?.[0]!==r.id||JSON.parse(live[0][1]).updatedAt!==r.data.updatedAt)throw Error('This record changed elsewhere. Refresh before saving.');range="'Identification Records'!A"+r.row+":B"+r.row;method='PUT';suffix='?valueInputOption=RAW'}
const res=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+TH_SHEET_ID+'/values/'+encodeURIComponent(range)+suffix,{method,headers:{Authorization:'Bearer '+thToken,'Content-Type':'application/json'},body:JSON.stringify({values})});if(!res.ok)throw Error('Save failed. Check your connection and retry.');await window.thStart()}
window.thStart=async()=>{const rows=await thValues("'Identification Records'!A1:B2000",'UNFORMATTED_VALUE');if(rows[0]?.[0]!=='ID')throw Error('Identification records could not load.');records=rows.slice(1).map((r,i)=>({id:r[0],row:i+2,data:JSON.parse(r[1]||'{}')})).filter(r=>r.id);ready=true;render();message('Private identification records connected.');$('th-connection').textContent='Private workbook connected'};


let selectedPerson='',selectedCategory='',selectedFolder='',recordPage=1;
const isEducation=false;
function title(d){
 let n=String(d.name||'Document').replace(/\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|rtf|epub|txt)$/i,'').replace(/_/g,' ');
 if(!isEducation){if(/social security/i.test(n))return 'Social Security Card';if(/birth certificate/i.test(n)&&!/process/i.test(n))return 'Birth Certificate';if(/marriage certificate/i.test(n))return 'Marriage Certificate';if(/boater.*license/i.test(n))return 'Boating License';if(/drivers? license/i.test(n))return /replacement/i.test(n)?'Driver’s License — Replacement Record':'Driver’s License';}
 return n;
}
function preview(d){
 let u;try{u=new URL(safe(d.url))}catch{return '<span class="record-placeholder">Document</span>'}
 const folder=u.pathname.includes('/folders/'),id=u.pathname.match(/\/d\/([^/]+)/)?.[1];
 if(folder)return '<span class="record-placeholder">▤<small>Archive folder</small></span>';
 if(id&&['drive.google.com','docs.google.com'].includes(u.hostname))return '<iframe class="record-preview" src="https://drive.google.com/file/d/'+encodeURIComponent(id)+'/preview" title="'+esc(title(d))+' preview" loading="lazy" tabindex="-1" referrerpolicy="no-referrer"></iframe>';
 return '<span class="record-placeholder">'+esc(d.category||'Document')+'</span>';
}
function card(r){const d=r.data,u=safe(d.url);return '<article class="identity-card visual-record">'+(u&&!d.deleted?'<a class="record-link" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(title(d))+'">'+preview(d)+'<div class="record-caption"><h3>'+esc(title(d))+'</h3><small>'+esc(d.person||'General')+' · '+esc(d.category||'')+'</small>'+(isEducation&&d.folder?'<small>'+esc(d.folder)+'</small>':'')+(d.expires?'<small>Expires '+esc(d.expires)+'</small>':'')+'</div></a>':'<h3>'+esc(title(d))+'</h3>')+'<footer>'+(d.deleted?'<button data-restore="'+esc(r.id)+'">Restore</button>':'<button data-edit="'+esc(r.id)+'">Edit</button><button data-delete="'+esc(r.id)+'">Delete</button>')+'</footer></article>'}
function groupCard(label,count,attribute,value){return '<button class="identity-card person-record" '+attribute+'="'+esc(value)+'"><span class="person-avatar" aria-hidden="true">'+esc(isEducation?'▤':label.charAt(0))+'</span><h3>'+esc(label)+'</h3><p>'+count+' '+(count===1?'document':'documents')+'</p></button>'}
function render(){
 const q=$('identity-search').value.trim().toLowerCase(),person=$('identity-person').value,category=$('identity-category').value,deleted=$('identity-view').value==='deleted';
 const list=records.filter(r=>!!r.data.deleted===deleted&&(!person||r.data.person===person)&&(!category||r.data.category===category)&&[r.data.name,r.data.person,r.data.category,r.data.folder,r.data.notes].join(' ').toLowerCase().includes(q));
 $('identity-pin-section').hidden=true;
 const grid=$('identity-grid'),chosen=person||selectedPerson;
 const heading=grid.previousElementSibling;
 let shown=list,html='<div class="record-breadcrumb"><button data-record-back="root">← '+(isEducation?'Education':'People')+'</button>';
 if(!isEducation&&chosen){shown=shown.filter(r=>(r.data.person||'General')===chosen);html+='<strong>'+esc(chosen)+'</strong>';}
 if(isEducation&&selectedCategory){shown=shown.filter(r=>(r.data.category||'Other')===selectedCategory);html+='<strong>'+esc(selectedCategory)+'</strong>';}
 if(isEducation&&selectedFolder){shown=shown.filter(r=>(r.data.folder||'')===selectedFolder||r.data.folder?.startsWith(selectedFolder+'/'));html+='<button data-record-back="category">← '+esc(selectedCategory||'Categories')+'</button><strong>'+esc(selectedFolder)+'</strong>';}
 html+='</div>';
 if(!q&&!person&&!category&&!deleted&&!chosen&&!isEducation){heading.textContent='Choose a person';$('identity-count').textContent=list.length+' documents';grid.innerHTML=[...new Set(['Todd','Aiden','Alexis','Heather','Tracy',...list.map(r=>r.data.person||'General')])].map(p=>groupCard(p,list.filter(r=>(r.data.person||'General')===p).length,'data-person',p)).join('');return}
 if(isEducation&&!selectedCategory&&!q&&!category&&!deleted){heading.textContent='Choose a category';$('identity-count').textContent=list.length+' records';grid.innerHTML=['School','Certificates','Books','Career','Other'].filter(c=>list.some(r=>(r.data.category||'Other')===c)).map(c=>groupCard(c,list.filter(r=>(r.data.category||'Other')===c).length,'data-record-category',c)).join('');return}
 if(isEducation&&selectedCategory&&!selectedFolder&&!q&&!category&&!deleted){const groups=[...new Set(shown.map(r=>r.data.folder?.split('/')[0]).filter(Boolean))].sort();if(groups.length){heading.textContent=selectedCategory;const loose=shown.filter(r=>!r.data.folder);$('identity-count').textContent=shown.length+' records';grid.innerHTML=html+groups.map(f=>groupCard(f,shown.filter(r=>r.data.folder===f||r.data.folder?.startsWith(f+'/')).length,'data-folder',f)).join('')+loose.slice(0,24).map(card).join('');return}}
 heading.textContent=q?'Search results':isEducation?(selectedFolder||selectedCategory||category||'Documents'):(chosen||'Documents');
 $('identity-count').textContent=shown.length+' '+(shown.length===1?'document':'documents');
 const pages=Math.max(1,Math.ceil(shown.length/18));recordPage=Math.max(1,Math.min(recordPage,pages));
 grid.innerHTML=html+shown.sort((a,b)=>title(a.data).localeCompare(title(b.data))).slice((recordPage-1)*18,recordPage*18).map(card).join('')+(shown.length?'':'<p class="record-empty">No documents here yet.</p>')+(pages>1?'<div class="record-breadcrumb"><button data-record-page="-1" '+(recordPage===1?'disabled':'')+'>← Previous</button><span>Page '+recordPage+' of '+pages+'</span><button data-record-page="1" '+(recordPage===pages?'disabled':'')+'>Next →</button></div>':'');
}
document.querySelector('.identification').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.person){selectedPerson=b.dataset.person;recordPage=1;render()}
 if(b.dataset.recordCategory){selectedCategory=b.dataset.recordCategory;selectedFolder='';recordPage=1;render()}
 if(b.dataset.folder){selectedFolder=b.dataset.folder;recordPage=1;render()}
 if(b.dataset.recordBack){selectedFolder='';if(b.dataset.recordBack==='root'){selectedPerson='';selectedCategory='';$('identity-person').value='';$('identity-category').value='';$('identity-search').value=''}recordPage=1;render()}
 if(b.dataset.recordPage){recordPage+=Number(b.dataset.recordPage);render()}
});
function edit(id){if(!ready)return;editing=records.find(r=>r.id===id)||null;const f=$('identity-form');f.reset();for(const k of ['name','person','category','url','expires','notes'])f.elements.namedItem(k).value=editing?.data[k]||({person:selectedPerson||'Todd',category:selectedCategory||'Other'}[k]||'');$('identity-save-status').textContent='';$('identity-dialog').showModal()}
document.querySelector('.identification').onclick=async e=>{const b=e.target.closest('button');if(!b||!ready)return;try{if(b.id==='identity-add')edit();else if(b.dataset.edit)edit(b.dataset.edit);else {const id=b.dataset.delete||b.dataset.restore;if(!id)return;const r=records.find(r=>r.id===id),d={...r.data};if(b.dataset.delete){if(!confirm('Remove this document from the dashboard? You can restore it from Deleted documents. Its original Drive file stays unchanged.'))return;d.deleted=true}else d.deleted=false;await save(r,d)}}catch(err){message(err.message)}};
$('identity-form').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('[type=submit]');b.disabled=true;try{const d={...(editing?.data||{favorite:false,deleted:false})};for(const k of ['name','person','category','url','expires','notes'])d[k]=f.elements.namedItem(k).value.trim();if(!safe(d.url))throw Error('Enter a complete https:// document link.');await save(editing,d);$('identity-dialog').close();message('Document saved.')}catch(err){$('identity-save-status').textContent=err.message}finally{b.disabled=false}};
for(const id of ['identity-search','identity-person','identity-category','identity-view'])$(id).addEventListener(id==='identity-search'?'input':'change',()=>{recordPage=1;render()});$('identity-refresh').onclick=()=>window.thStart().catch(e=>message(e.message));$('identity-close').onclick=()=>$('identity-dialog').close();

for(const id of ['identity-person','identity-category','identity-view'])$(id).addEventListener('change',()=>{selectedPerson='';selectedCategory='';selectedFolder='';recordPage=1;render()});
})();
