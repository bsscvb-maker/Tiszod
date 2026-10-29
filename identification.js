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
function card(r){const d=r.data,u=safe(d.url);if(d.sides?.length&&!d.deleted)return pictureCard(r);return '<article data-file-id="'+esc(r.id)+'" class="identity-card visual-record">'+(u&&!d.deleted?'<a class="record-link" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(title(d))+'">'+preview(d)+'<div class="record-caption"><h3>'+esc(title(d))+'</h3><small>'+esc(d.person||'General')+' · '+esc(d.category||'')+'</small>'+(isEducation&&d.folder?'<small>'+esc(d.folder)+'</small>':'')+(d.expires?'<small>Expires '+esc(d.expires)+'</small>':'')+'</div></a>':'<h3>'+esc(title(d))+'</h3>')+'<footer>'+(d.deleted?'<button data-restore="'+esc(r.id)+'">Restore</button>':'<button data-edit="'+esc(r.id)+'">Edit</button><button data-delete="'+esc(r.id)+'">Delete</button>')+'</footer></article>'}
const personStyles={Todd:['todd','TH','Me'],Aiden:['aiden','A','Son'],Alexis:['alexis','A','Stepdaughter'],Heather:['heather','H','Ex'],Tracy:['tracy','T','Girlfriend']};
function groupCard(label,count,attribute,value){const profile=attribute==='data-person'?(personStyles[label]||['other',label.charAt(0),'Documents']):null;return '<button class="identity-card person-record'+(profile?' person-profile person-'+profile[0]:'')+'" '+attribute+'="'+esc(value)+'">'+(profile?'<span class="person-topline"><span class="person-avatar" aria-hidden="true">'+esc(profile[1])+'</span><span class="person-relationship">'+esc(profile[2])+'</span></span>':'<span class="person-avatar" aria-hidden="true">'+esc(isEducation?'▤':label.charAt(0))+'</span>')+'<h3>'+esc(label)+'</h3><p>'+count+' '+(count===1?'document':'documents')+'</p>'+(profile?'<span class="person-open" aria-hidden="true">↗</span>':'')+'</button>';}
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
 if(isEducation&&selectedCategory&&!selectedFolder&&!q&&!category&&!deleted){const groups=[...new Set(shown.map(r=>r.data.folder?.split('/')[0]).filter(Boolean))].sort();if(groups.length){heading.textContent=selectedCategory;const loose=shown.filter(r=>!r.data.folder);$('identity-count').textContent=shown.length+' records';grid.innerHTML=html+groups.map(f=>groupCard(f,shown.filter(r=>r.data.folder===f||r.data.folder?.startsWith(f+'/')).length,'data-folder',f)).join('')+loose.map(card).join('');return}}
 heading.textContent=q?'Search results':isEducation?(selectedFolder||selectedCategory||category||'Documents'):(chosen||'Documents');
 $('identity-count').textContent=shown.length+' '+(shown.length===1?'document':'documents');
 grid.innerHTML=html+shown.sort((a,b)=>title(a.data).localeCompare(title(b.data))).map(card).join('')+(shown.length?'':'<p class="record-empty">No documents here yet.</p>');
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
$('identity-form').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('[type=submit]');b.disabled=true;try{const d={...(editing?.data||{favorite:false,deleted:false})};for(const k of ['name','person','category','url','expires','notes'])d[k]=f.elements.namedItem(k).value.trim();if(d.sides?.length)d.sides=d.sides.map((side,i)=>i===0?{...side,url:d.url}:side);if(!safe(d.url))throw Error('Enter a complete https:// document link.');await save(editing,d);$('identity-dialog').close();message('Document saved.')}catch(err){$('identity-save-status').textContent=err.message}finally{b.disabled=false}};
for(const id of ['identity-search','identity-person','identity-category','identity-view'])$(id).addEventListener(id==='identity-search'?'input':'change',()=>{recordPage=1;render()});$('identity-refresh').onclick=()=>window.thStart().catch(e=>message(e.message));$('identity-close').onclick=()=>$('identity-dialog').close();

for(const id of ['identity-person','identity-category','identity-view'])$(id).addEventListener('change',()=>{selectedPerson='';selectedCategory='';selectedFolder='';recordPage=1;render()});


let openedPictureId=null;
const pictureDialog=document.createElement('dialog');pictureDialog.id='identity-pictures';
pictureDialog.setAttribute('aria-labelledby','identity-pictures-title');
pictureDialog.innerHTML='<header><h2 id="identity-pictures-title"></h2><button type="button" id="identity-pictures-close" aria-label="Close pictures">✕</button></header><p>Enhanced pictures · untouched originals are also available below.</p><div id="identity-picture-sides"></div>';
document.body.append(pictureDialog);
const pictureStyle=document.createElement('style');pictureStyle.textContent='#identity-pictures{width:min(1180px,95vw);max-width:95vw;max-height:92dvh;overflow:auto;background:#101d2c;color:#edf5ff;border:1px solid #57748f;border-radius:12px;padding:22px}#identity-pictures::backdrop{background:#000b}#identity-pictures header{display:flex;align-items:center;gap:16px;justify-content:space-between}#identity-pictures h2{margin:0}#identity-picture-sides{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.identity-side{min-width:0;border:1px solid #45627c;border-radius:9px;padding:14px}.identity-side iframe,.identity-side img{width:100%;height:340px;object-fit:contain;border:0;background:#07111e}.identity-side footer{display:flex;flex-wrap:wrap;gap:12px;margin-top:14px}.identity-side a{color:#b9e5ff}.identity-side .side-download{padding:10px 14px;border-radius:6px;color:white;background:#285d83;text-decoration:none}.identity-picture-card{padding:0!important;width:100%;border:0!important;border-radius:0!important;text-align:left;color:inherit!important;background:transparent!important;cursor:pointer}.identity-picture-card .record-caption{padding:18px}.identity-picture-card .record-caption h3{margin:0 0 12px}.identity-picture-card:hover h3{text-decoration:underline}.identity-picture-card .record-preview{pointer-events:none}.identity-picture-card .picture-cover{position:relative}.identity-picture-card .picture-cover:after{content:"";position:absolute;inset:0}.identity-picture-card img{width:100%;height:270px;object-fit:contain;background:#091727;display:block}@media(max-width:760px){#identity-picture-sides{grid-template-columns:1fr}.identity-side iframe,.identity-side img{height:300px}}';document.head.append(pictureStyle);
function pictureCard(r){const d=r.data;return '<article data-file-id="'+esc(r.id)+'" class="identity-card visual-record"><button type="button" class="identity-picture-card" data-identity-open="'+esc(r.id)+'" aria-label="'+esc(title(d))+' — front and back"><div class="picture-cover">'+preview(d)+'</div><div class="record-caption"><h3>'+esc(title(d))+'</h3><small>'+esc(d.person)+' · '+(d.sides.length>1?'Front &amp; back':'Front picture')+'</small>'+(d.expires?'<small>Expires '+esc(d.expires)+'</small>':'')+'</div></button><footer><button data-edit="'+esc(r.id)+'">Edit</button><button data-delete="'+esc(r.id)+'">Delete</button></footer></article>'}
function sideFileId(side){try{const u=new URL(side.url);return ['drive.google.com','docs.google.com'].includes(u.hostname)?u.pathname.match(/\/d\/([^/]+)/)?.[1]||'':''}catch{return ''}}
async function loadOriginalImage(side,holder){
 const id=sideFileId(side);if(!id||typeof thPhotoObjectUrl!=='function')return;
 try{const url=await originalUrl(id);if(!holder.isConnected)return;const img=document.createElement('img');img.src=url;img.alt=side.label+' of identification document';holder.replaceChildren(img);const download=holder.closest('.identity-side')?.querySelector('.side-download');if(download){download.href=url;download.download=side.filename||'Identification-'+side.label;download.removeAttribute('target')}}catch{/* Google Drive's signed-in preview and download links remain available. */}
}
const originalImages=new Map();
function originalUrl(id){if(!originalImages.has(id))originalImages.set(id,thPhotoObjectUrl(id).catch(e=>{originalImages.delete(id);throw e}));return originalImages.get(id)}
function openPictures(id){
 const r=records.find(r=>r.id===id);if(!r?.data.sides?.length)return;
 openedPictureId=id;$('identity-pictures-title').textContent=title(r.data)+' · '+(r.data.person||'');
 $('identity-picture-sides').innerHTML=r.data.sides.map((side,index)=>{const fileId=sideFileId(side),url=safe(side.url),download=fileId?'https://drive.google.com/uc?export=download&amp;id='+encodeURIComponent(fileId):url;return '<section class="identity-side"><h3>'+esc(side.label)+'</h3><div class="identity-side-image" data-side-index="'+index+'">'+(fileId?'<iframe src="https://drive.google.com/file/d/'+encodeURIComponent(fileId)+'/preview" title="'+esc(side.label)+' picture" loading="lazy" referrerpolicy="no-referrer"></iframe>':'')+'</div><footer><a class="side-download" href="'+download+'" target="_blank" rel="noopener noreferrer" download="'+esc(side.filename||'Identification-'+side.label)+'">Download '+esc(side.label.toLowerCase())+' ('+esc((side.filename||'image').split('.').pop().toUpperCase())+')</a><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">View full-size '+esc(side.label.toLowerCase())+' ↗</a>'+(side.originalUrl?'<a href="'+esc(safe(side.originalUrl))+'" target="_blank" rel="noopener noreferrer">Original photo ↗</a>':'')+'</footer></section>'}).join('');
 if(!pictureDialog.open)pictureDialog.showModal();
 for(const holder of $('identity-picture-sides').querySelectorAll('[data-side-index]'))loadOriginalImage(r.data.sides[Number(holder.dataset.sideIndex)],holder);
}
$('identity-pictures-close').onclick=()=>{openedPictureId=null;pictureDialog.close()};
pictureDialog.addEventListener('close',()=>{openedPictureId=null});
document.querySelector('.identification').addEventListener('click',e=>{const b=e.target.closest('[data-identity-open]');if(b){e.preventDefault();openPictures(b.dataset.identityOpen)}});
const frontObserver=new MutationObserver(()=>{for(const button of document.querySelectorAll('[data-identity-open]')){const holder=button.querySelector('.picture-cover');if(holder.dataset.loaded)continue;holder.dataset.loaded='true';const r=records.find(r=>r.id===button.dataset.identityOpen);if(r?.data.sides?.[0])loadOriginalImage(r.data.sides[0],holder)}});frontObserver.observe($('identity-grid'),{childList:true,subtree:true});

window.thViewAdapter={capture:()=>({selectedPerson,selectedCategory,selectedFolder,openedPictureId}),restore:s=>{selectedPerson=s?.selectedPerson||'';selectedCategory=s?.selectedCategory||'';selectedFolder=s?.selectedFolder||'';render();if(s?.openedPictureId)openPictures(s.openedPictureId);else if(pictureDialog.open){openedPictureId=null;pictureDialog.close()}}};

window.thFileBrowser?.mount({name:'identification',host:'identity-grid',deleted:()=>$('identity-view').value==='deleted',change:(ids,deleted)=>window.thFileBrowser.updateJSON('Identification Records',records,ids,deleted)});
})();
