/* Document metadata stays in the signed-in owner's workbook; originals stay in Drive. */
window.TiszodVehicleDocuments = (() => {
  const SHEET = 'Portal Vehicle Documents';
  const documentCovers={'1hxWWS6KbK_LQ7sQIMZp7okT_iv-CxWiT':'assets/1977-ford-truck-shop-manual-cover.svg'};
  const categories = ['Purchase','Title','Registration','State Inspections','Warranty & Plans','Insurance & Finance','Manuals & Specs','Service Documents','Pictures','Other','Riding Gear','Data & Backups','Saved Web Pages','Sale & Transfer','Other Files'];
  const tabs = categories.slice(0,8).map((name,i)=>({id:'documents-'+i,name})).concat({id:'documents-pictures',name:'Pictures'},{id:'documents-sale',name:'Sale & Transfer'},{id:'documents-files',name:'Other Files'},{id:'documents-all',name:'All Documents'});
  const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const assetKey = a => String(a.reportId || (a.profileRow?'profile-'+a.profileRow:'item-'+String(a.year+' '+a.make+' '+a.model).toLowerCase().replace(/[^a-z0-9]/g,'')));
  const assetName = a => [a.year,a.make,a.model].filter(Boolean).join(' ');
  const fields=['id','assetKey','vehicle','category','name','url','fileId','sourceFolder','sourcePath','mime','notes','kind','status','updated','alternateCopies'];
  function documentCategory(r){
    const name=r.name||'',path=r.sourcePath||'',category=r.category||'Other';
    if(category==='Other Files')return 'Other Files';
    const documentFile=/pdf|officedocument|msword|vnd.google-apps.(?:document|spreadsheet|presentation)|text\/(?:plain|html|csv)/i.test(r.mime||'')||/\.(?:pdf|docx?|xlsx?|pptx?|txt|rtf|csv)$/i.test(name);
    if(/Owners CD|\/support(?:\/|$)/i.test(path)&&!(/\.pdf$/i.test(name)))return 'Other Files';
    if(!documentFile&&!/^image\//i.test(r.mime||'')&&!/\.(?:jpe?g|png|heic|webp|gif|bmp|tiff?)$/i.test(name)&&r.kind!=='folder')return 'Other Files';
    if(category==='Pictures')return 'Pictures';
    const image=/^image\//i.test(r.mime||'')||/\.(?:jpe?g|png|heic|webp|gif|bmp|tiff?)$/i.test(name);
    const scannedDocument=/\b(?:title|registration|receipt|invoice|bill of sale|contract|insurance|inspection|warranty|certificate|instructions?|manual|wiring|diagram|specifications?)\b/i.test(name);
    const referenceImage=/Manuals & Specs|Owners CD|\/support(?:\/|$)|\/How to/i.test(path);
    if(image&&!scannedDocument)return 'Pictures';
    if(image&&scannedDocument){if(/inspection/i.test(name))return 'State Inspections';if(/registration/i.test(name))return 'Registration';if(/\btitle\b|certificate of origin/i.test(name))return 'Title';if(/insurance/i.test(name))return 'Insurance & Finance';if(/warranty/i.test(name))return 'Warranty & Plans';if(/invoice|receipt/i.test(name)&&category==='Photos & Accessories')return 'Service Documents';}
    if(/\/Selling(?:\/|$)/i.test(path)&&/bill of sale|sales aid/i.test(name))return 'Sale & Transfer';
    if(/state[ _-]*inspection/i.test(path+' '+name))return 'State Inspections';
    if(/manual|instructions?|installation guide|fit guide|wiring diagram/i.test(name)||referenceImage)return 'Manuals & Specs';
    if(category==='Photos & Accessories')return 'Other';
    if(category==='State Inspections'||/\bstate[\s_-]*inspection\b|\b(?:SI|S\.I\.)\b/i.test(name)&&!/manual|guide|instructions/i.test(name))return 'State Inspections';
    if(category!=='Title & Registration')return category;
    if(/\/Registration(?:\/|$)/i.test(path))return 'Registration';
    if(/\bregistration\b|\bregist(?:er|ration)\b|\btag registration\b/i.test(name)&&!/\btitle\b/i.test(name))return 'Registration';
    if(/\btitle\b|certificate of origin/i.test(name))return 'Title';
    // Keep legacy mixed records accessible while their filing is clarified.
    return 'Registration';
  }
  function inTab(r,tab){return tab==='All Documents'||tab==='documents-all'?!['Pictures','Other Files'].includes(r.category):r.category===tab;}
  function parse(rows){return rows.slice(1).map((r,i)=>{const record={...Object.fromEntries(fields.map((key,j)=>[key,String(r[j]??'')])),row:i+2};record.category=documentCategory(record);return record;}).filter(r=>r.id&&r.status!=='Removed');}
  function driveUrl(value){try{const u=new URL(value);if(u.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(u.hostname))return '';return u.href}catch{return ''}}
  function fileId(url){try{const u=new URL(url);return u.pathname.match(/\/(?:d|folders)\/([a-zA-Z0-9_-]+)/)?.[1]||u.searchParams.get('id')||''}catch{return ''}}
  function driveFolderUrl(record){
    const id=record.fileId||fileId(record.url||'');
    const source=String(record.sourceFolder||'');
    const folder=fileId(source)||(/^[a-zA-Z0-9_-]+$/.test(source)?source:'');
    if(folder)return 'https://drive.google.com/drive/folders/'+encodeURIComponent(folder)+(id?'?select='+encodeURIComponent(id):'');
    return 'https://drive.google.com/drive/u/0/search?q='+encodeURIComponent(record.name||id||'');
  }
  function create({assets,getAsset,filingShortcut=false,onChange=async()=>{}}){
    let records=[],loaded=false,loading=null,loadError='',activeTab='details',current=null,query='',globalQuery='',globalVehicle='all',globalCategory='all',editRecord=null;
    const panel=document.createElement('section');panel.id='assetDocuments';panel.className='asset-tab-panel vehicle-documents';panel.hidden=true;document.getElementById('assetView').append(panel);
    const nav=document.querySelector('.asset-tabs');
    const label=document.createElement('span');label.className='document-tab-label';label.textContent='Documents';nav.append(label);
    for(const tab of tabs){const b=document.createElement('button');b.type='button';b.dataset.assetTab=tab.id;b.dataset.documentLabel=tab.name;b.textContent=tab.name;nav.append(b);}
    const hub=document.createElement('dialog');hub.className='vehicle-document-hub vehicle-documents';hub.setAttribute('aria-labelledby','documentHubTitle');
    hub.innerHTML='<div class="document-dialog-head"><div><span class="document-eyebrow">Your garage</span><h2 id="documentHubTitle">Vehicle documents</h2></div><button type="button" data-close-hub aria-label="Close vehicle documents">Close</button></div><p>Find paperwork across vehicles and file documents that need a vehicle. Originals stay in their Drive folders.</p><div class="document-toolbar"><label>Search<input type="search" id="documentHubSearch" placeholder="Purchase, warranty, registration…"></label><label>Vehicle<select id="documentHubVehicle"></select></label><label>Category<select id="documentHubCategory"><option value="all">All categories</option>'+categories.map(c=>'<option>'+esc(c)+'</option>').join('')+'</select></label><button type="button" data-new-document>Add document link</button><button type="button" data-refresh-documents>Refresh</button></div><div id="documentHubResults" aria-live="polite"></div>';
    document.body.append(hub);
    const preview=document.createElement('dialog');preview.className='vehicle-document-preview vehicle-documents';preview.setAttribute('aria-labelledby','documentPreviewTitle');
    preview.innerHTML='<div class="document-dialog-head"><h2 id="documentPreviewTitle">Document preview</h2><div class="document-actions"><a id="documentPreviewDrive" target="_blank" rel="noopener noreferrer">Open in Drive ↗</a><button type="button" data-close-preview>Close</button></div></div><p>If Google asks you to sign in or a preview is unavailable, use Open in Drive.</p><img id="vehicleDocumentCover" alt="Document cover" hidden style="display:none;max-width:100%;max-height:75vh;object-fit:contain;margin:0 auto"><iframe id="vehicleDocumentFrame" title="Vehicle document preview" referrerpolicy="no-referrer"></iframe>';
    document.body.append(preview);
    const editor=document.createElement('dialog');editor.className='vehicle-document-editor vehicle-documents';editor.setAttribute('aria-labelledby','documentEditorTitle');
    editor.innerHTML='<form id="vehicleDocumentForm"><div class="document-dialog-head"><h2 id="documentEditorTitle">File document</h2><button type="button" data-close-editor>Close</button></div><label>Document name<input name="name" required maxlength="250"></label><label>Vehicle<select name="assetKey"></select></label><label>Category<select name="category">'+categories.map(c=>'<option>'+esc(c)+'</option>').join('')+'</select></label><label>Google Drive link<input name="url" type="url" required placeholder="https://drive.google.com/file/d/…"></label><label>Notes<textarea name="notes" rows="3"></textarea></label><details><summary>File details</summary><label>Source folder link<input name="sourceFolder"></label><label>Source path<input name="sourcePath"></label><label>File type (MIME)<input name="mime" placeholder="image/jpeg or application/pdf"></label></details><p class="document-help">Choose a vehicle to move this item to its portal document list. The original Drive file stays in its current folder. Name changes apply to the portal listing.</p><p id="vehicleDocumentSaveStatus" role="status"></p><div class="document-actions"><button type="submit">Save document</button><button type="button" data-remove-document>Remove from portal</button></div><p class="document-help">Removing a link leaves the original Drive file in place.</p></form>';
    document.body.append(editor);
    const hubButtons=[];
    for(const target of [document.getElementById('openVehicles'),document.getElementById('addCategoryVehicleButton')].filter(Boolean)){
      const button=document.createElement('button');button.type='button';button.className='garage-open document-hub-button';button.textContent='Vehicle documents';button.addEventListener('click',()=>openHub(filingShortcut?'unassigned':'all'));target.insertAdjacentElement('afterend',button);hubButtons.push(button);
    }
    function alternateCopies(r){let copies;try{copies=JSON.parse(r.alternateCopies||'[]');}catch{return '';}if(!Array.isArray(copies)||!copies.length)return '';return '<details class="document-alternate-copies"><summary>Other existing Drive copies ('+copies.length+')</summary>'+copies.filter(c=>driveUrl(c.url)).map(c=>'<a href="'+esc(driveUrl(c.url))+'" target="_blank" rel="noopener noreferrer">'+esc(c.name)+' ↗</a>').join('')+'</details>';}
    const sharedButton=document.createElement('button');sharedButton.type='button';sharedButton.className='garage-open document-shared-button';sharedButton.textContent='Vehicle Reference & Accessories';sharedButton.addEventListener('click',()=>openHub('shared-reference'));
    if(hubButtons[0])hubButtons[0].insertAdjacentElement('afterend',sharedButton);
    queueMicrotask(()=>{const actions=document.querySelector('.vehicle-workspace-actions');if(actions)actions.append(sharedButton);});
    const sharedHubButton=document.createElement('button');sharedHubButton.type='button';sharedHubButton.textContent='Shared reference';sharedHubButton.addEventListener('click',()=>openHubSelection('shared-reference'));hub.querySelector('.document-toolbar').append(sharedHubButton);
    function openHubSelection(key){globalVehicle=key;globalCategory='all';globalQuery='';hub.querySelector('#documentHubSearch').value='';hub.querySelector('#documentHubCategory').value='all';paintHub();}
    function options(selected='all'){
      const sorted=assets.slice().sort((a,b)=>assetName(a).localeCompare(assetName(b))),known=new Set(sorted.map(assetKey)),other=new Map();
      for(const r of records)if(r.assetKey&&!known.has(r.assetKey)&&!other.has(r.assetKey))other.set(r.assetKey,r.vehicle||'Archived vehicle');
      const option=(key,name)=>'<option value="'+esc(key)+'"'+(key===selected?' selected':'')+'>'+esc(name)+'</option>';
      return '<option value="all">All vehicles</option><option value="unassigned">Needs filing</option>'+sorted.map(a=>option(assetKey(a),assetName(a))).join('')+(other.size?'<optgroup label="Other vehicles &amp; shared records">'+Array.from(other).sort((a,b)=>a[1].localeCompare(b[1])).map(([key,name])=>option(key,name)).join('')+'</optgroup>':'');
    }
    function updateCounts(){for(const tab of tabs){const n=records.filter(r=>r.kind!=='folder'&&r.assetKey===assetKey(current||{})&&inTab(r,tab.name)).length;const b=nav.querySelector('[data-asset-tab="'+tab.id+'"]');b.textContent=tab.name+(loaded?' ('+n+')':'');}const pending=records.filter(r=>r.kind!=='folder'&&!r.assetKey).length;for(const b of hubButtons)b.textContent=filingShortcut?'Needs filing'+(loaded?' · '+pending:''):'Vehicle documents'+(loaded?' · '+records.filter(r=>r.kind!=='folder').length:'')+(pending?' · '+pending+' need filing':'');}
    async function load(force=false){if(loaded&&!force)return;if(loading)return loading;loadError='';loading=thValues("'"+SHEET+"'!A1:O5000").then(rows=>{records=parse(rows);loaded=true;}).catch(error=>{loadError=error.message||'Could not load vehicle documents.';throw error;}).finally(()=>{loading=null;updateCounts();});return loading;}
    function rowsHtml(rows,global=false){if(!rows.length)return '<div class="document-empty"><strong>No documents '+(loaded?'filed here yet':'loaded yet')+'.</strong><p>'+(!loaded?'Use Refresh to try again.':'Add a Drive link, or check All Documents and Needs filing.')+'</p></div>';return '<div class="document-list">'+rows.map(r=>'<article class="document-row"><button type="button" class="document-thumbnail" data-preview-document="'+esc(r.id)+'" aria-label="Preview '+esc(r.name)+'"><img data-document-thumbnail="'+esc(r.id)+'" alt="" hidden><span class="document-thumbnail-status">Loading preview…</span></button><div class="document-copy"><strong>'+esc(r.name)+'</strong><div class="document-meta"><span>'+esc(r.category)+'</span>'+(global?'<span>'+esc(r.vehicle||'Needs filing')+'</span>':'')+'</div>'+(r.notes?'<p>'+esc(r.notes)+'</p>':'')+'<small>'+esc(r.sourcePath||'Added in portal')+'</small>'+alternateCopies(r)+'</div><div class="document-actions"><button type="button" data-preview-document="'+esc(r.id)+'">Preview</button><a href="'+esc(driveFolderUrl(r))+'" data-drive-document="'+esc(r.id)+'" target="_blank" rel="noopener noreferrer">Drive ↗</a><button type="button" data-edit-document="'+esc(r.id)+'">Edit / Move</button></div></article>').join('')+'</div>';}
    const thumbnailCache=new Map(),thumbnailPending=new Map();
    let pdfModule;
    async function makeThumbnail(r){
      const id=r.fileId||fileId(r.url);if(!id)throw new Error('No preview');
      if(documentCovers[id])return new URL(documentCovers[id],location.href).href;
      const meta=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=thumbnailLink,mimeType',{headers:{Authorization:'Bearer '+thToken}});
      if(!meta.ok)throw new Error('Drive access needed');
      const info=await meta.json();
      // Drive thumbnails can display in an image even when their host blocks fetch/CORS.
      if(info.thumbnailLink){try{return await imageThumbnail(info.thumbnailLink);}catch{}}
      if(info.thumbnailLink){
        try{const response=await fetch(info.thumbnailLink,{headers:{Authorization:'Bearer '+thToken}});
        if(response.ok)return URL.createObjectURL(await response.blob());}catch{/* Render the source image or PDF below if Google's thumbnail cannot be fetched. */}
      }
      if((info.mimeType||r.mime||'').startsWith('image/'))return thPhotoObjectUrl(id);
      if((info.mimeType||r.mime)==='application/pdf'||/\.pdf$/i.test(r.name)){
        const response=await thDriveFetch(id);if(!response.ok)throw new Error('No preview');
        pdfModule ||= import('./vendor/pdfjs/pdf.min.mjs');
        const pdfjs=await pdfModule;pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.compat.mjs',location.href).href;
        const task=pdfjs.getDocument({data:new Uint8Array(await response.arrayBuffer())});const doc=await task.promise;
        try{const page=await doc.getPage(1),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:240/base.width}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;return canvas.toDataURL('image/jpeg',.8);}finally{await task.destroy();}
      }
      throw new Error('Preview unavailable');
    }
    function imageThumbnail(url){return new Promise((resolve,reject)=>{const probe=new Image();probe.referrerPolicy='no-referrer';const timer=setTimeout(()=>{probe.src='';reject(new Error('Thumbnail timed out'));},12000);probe.onload=()=>{clearTimeout(timer);resolve(url);};probe.onerror=()=>{clearTimeout(timer);reject(new Error('Thumbnail unavailable'));};probe.src=url;});}
    async function thumbnailWithFallback(r){
      try{return await makeThumbnail(r);}catch(error){
        const id=r.fileId||fileId(r.url);
        if(id){try{return await imageThumbnail('https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w320');}catch{}}
        throw error;
      }
    }
    const thumbnailObserver=new IntersectionObserver(entries=>{
      for(const entry of entries){if(!entry.isIntersecting)continue;thumbnailObserver.unobserve(entry.target);const img=entry.target.querySelector('[data-document-thumbnail]'),r=records.find(r=>r.id===img.dataset.documentThumbnail);if(!r)continue;
        const key=r.fileId||r.url;
        const job=thumbnailCache.has(key)?Promise.resolve(thumbnailCache.get(key)):(thumbnailPending.get(key)||queueThumbnail(r,key));
        job.then(url=>{img.referrerPolicy='no-referrer';img.onload=()=>{img.hidden=false;img.nextElementSibling.hidden=true;};img.onerror=()=>{img.nextElementSibling.textContent='Preview unavailable';};img.src=url;}).catch(()=>{img.nextElementSibling.textContent='Preview unavailable';});
      }
    },{rootMargin:'160px'});
    const thumbnailQueue=[];let thumbnailActive=0;
    function queueThumbnail(r,key){const promise=new Promise((resolve,reject)=>thumbnailQueue.push({r,key,resolve,reject}));thumbnailPending.set(key,promise);pumpThumbnails();return promise;}
    function pumpThumbnails(){while(thumbnailActive<3&&thumbnailQueue.length){const task=thumbnailQueue.shift();thumbnailActive++;thumbnailWithFallback(task.r).then(url=>{thumbnailCache.set(task.key,url);task.resolve(url);},task.reject).finally(()=>{thumbnailPending.delete(task.key);thumbnailActive--;pumpThumbnails();});}}
    function observeThumbnails(root){root.querySelectorAll('[data-document-thumbnail]:not([data-observed])').forEach(img=>{img.dataset.observed='true';thumbnailObserver.observe(img.parentElement);});}
    const rowObserver=new MutationObserver(()=>{observeThumbnails(panel);observeThumbnails(hub);});
    rowObserver.observe(panel,{childList:true,subtree:true});rowObserver.observe(hub,{childList:true,subtree:true});
    hub.addEventListener('toggle',()=>{if(hub.open){hub.querySelectorAll('[data-document-thumbnail]').forEach(img=>{if(!img.src)thumbnailObserver.observe(img.parentElement);});}});
    function documentDate(record){
      const name=String(record.name||'');
      const iso=name.match(/\b((?:19|20)\d{2})[.\/_-](\d{1,2})[.\/_-](\d{1,2})(?!\d)/);
      const us=!iso&&name.match(/\b(\d{1,2})[.\/_-](\d{1,2})[.\/_-]((?:19|20)\d{2})(?!\d)/);
      if(!iso&&!us)return 0;
      const [year,month,day]=iso?[+iso[1],+iso[2],+iso[3]]:[+us[3],+us[1],+us[2]];
      const date=new Date(Date.UTC(year,month-1,day));
      return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?date.getTime():0;
    }
    function sorted(rows){return rows.slice().sort((a,b)=>documentDate(b)-documentDate(a)||a.name.localeCompare(b.name,undefined,{numeric:true})||a.id.localeCompare(b.id));}
    function matches(r,q){return [r.name,r.vehicle,r.category,r.notes,r.sourcePath].join(' ').toLowerCase().includes(q.trim().toLowerCase());}
    function paint(){if(!current||!activeTab.startsWith('documents-'))return;const tab=tabs.find(t=>t.id===activeTab)||tabs.at(-1),all=records.filter(r=>r.kind!=='folder'&&r.assetKey===assetKey(current)),shown=sorted(all.filter(r=>inTab(r,tab.name)&&matches(r,query)));const folders=records.filter(r=>r.kind==='folder'&&r.assetKey===assetKey(current));
      panel.innerHTML='<div class="document-section-head"><div><span class="document-eyebrow">Vehicle files</span><h3>'+esc(tab.name)+'</h3><p>'+esc(assetName(current))+' · '+shown.length+' '+(tab.name==='Pictures'?'picture':'document')+(shown.length===1?'':'s')+'</p></div><div class="document-actions"><button type="button" data-new-document>Add document link</button><button type="button" data-open-document-hub>All vehicles</button><button type="button" data-refresh-documents>Refresh</button></div></div><div class="document-toolbar"><label>Find a document<input type="search" data-document-search placeholder="Search names, notes, folders…" value="'+esc(query)+'"></label><span class="document-help">Originals open with your Google Drive access.</span></div><div data-document-results aria-live="polite">'+(loadError?'<p role="alert">'+esc(loadError)+'</p>':!loaded?'<p role="status">Loading documents…</p>':rowsHtml(shown))+'</div>'+(folders.length?'<details class="document-source-folders"><summary>Source folders ('+folders.length+')</summary>'+folders.map(r=>'<a href="'+esc(driveUrl(r.url))+'" target="_blank" rel="noopener noreferrer">'+esc(r.name)+' ↗</a>').join('')+'</details>':'');
    }
    function paintHub(){const select=hub.querySelector('#documentHubVehicle'),prior=globalVehicle;select.innerHTML=options(prior);select.value=prior;if(!select.value){select.value='all';globalVehicle='all';}const rows=sorted(records.filter(r=>r.kind!=='folder'&&(globalVehicle==='all'||globalVehicle==='unassigned'&&!r.assetKey||r.assetKey===globalVehicle)&&(globalCategory==='all'?!['Pictures','Other Files'].includes(r.category):r.category===globalCategory)&&matches(r,globalQuery)));hub.querySelector('#documentHubResults').innerHTML='<p class="document-result-count">'+rows.length+' document'+(rows.length===1?'':'s')+(globalVehicle==='unassigned'?(rows.length===1?' needs a confirmed vehicle':' need a confirmed vehicle'):'')+'</p>'+(loadError?'<p role="alert">'+esc(loadError)+'</p>':!loaded?'<p role="status">Loading documents…</p>':rowsHtml(rows,true));}
    async function openHub(vehicle='all'){globalVehicle=vehicle;hub.querySelector('#documentHubSearch').value=globalQuery='';hub.querySelector('#documentHubCategory').value=globalCategory='all';paintHub();hub.showModal();try{await load();}catch{}paintHub();}
    function openEditor(record=null,fromPanel=false){editRecord=record;const form=editor.querySelector('form');form.reset();form.elements.assetKey.innerHTML='<option value="">Needs filing — vehicle unconfirmed</option><option value="shared-reference">Vehicle Reference &amp; Accessories</option><option value="shared-equipment">Shared equipment manuals</option>'+assets.slice().sort((a,b)=>assetName(a).localeCompare(assetName(b))).map(a=>'<option value="'+esc(assetKey(a))+'">'+esc(assetName(a))+'</option>').join('');if(record?.assetKey&&!['shared-reference','shared-equipment'].includes(record.assetKey)&&!assets.some(a=>assetKey(a)===record.assetKey)){const o=document.createElement('option');o.value=record.assetKey;o.textContent=record.vehicle;form.elements.assetKey.append(o);}form.elements.assetKey.value=record?.assetKey||(fromPanel&&current?assetKey(current):'');form.elements.category.value=record?.category||(tabs.find(t=>t.id===activeTab)?.name!=='All Documents'&&fromPanel?tabs.find(t=>t.id===activeTab)?.name:'Other')||'Other';for(const k of ['name','url','notes','sourceFolder','sourcePath','mime'])form.elements[k].value=record?.[k]||'';editor.querySelector('[data-remove-document]').hidden=!record;editor.querySelector('#documentEditorTitle').textContent=record?'Edit / move document':'Add document link';editor.querySelector('#vehicleDocumentSaveStatus').textContent='';editor.showModal();form.elements.name.focus();}
    function afterChange(){updateCounts();paint();if(hub.open)paintHub();}
    async function write(record){const values=fields.map(k=>String(record[k]??''));if(record.row)await thWriteRanges([{sheet:SHEET,range:'A'+record.row+':O'+record.row,values:[values]}],'RAW');else record.row=await thAppendRow(SHEET,values,'RAW');if(!record.row)throw new Error('The document row was not confirmed. Refresh before trying again.');const verify=(await thValues("'"+SHEET+"'!A"+record.row+':O'+record.row))[0]||[];if(fields.some((k,i)=>String(verify[i]??'')!==String(record[k]??'')))throw new Error('The document save could not be verified. Refresh before trying again.');const keys=new Set([record.assetKey,editRecord?.assetKey].filter(Boolean));await onChange(assets.filter(a=>keys.has(assetKey(a))));}
    editor.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const form=e.target,msg=editor.querySelector('#vehicleDocumentSaveStatus'),url=driveUrl(form.elements.url.value);if(!url){msg.textContent='Use a Google Drive or Google Docs link.';return;}const a=assets.find(a=>assetKey(a)===form.elements.assetKey.value),next={...(editRecord||{}),id:editRecord?.id||'doc-'+(window.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)),assetKey:form.elements.assetKey.value,vehicle:a?assetName(a):form.elements.assetKey.value==='shared-reference'?'Vehicle Reference & Accessories':form.elements.assetKey.value==='shared-equipment'?'Shared equipment manuals':form.elements.assetKey.value?editRecord?.vehicle||'':'Unassigned',category:form.elements.category.value,name:form.elements.name.value.trim(),url,fileId:fileId(url),notes:form.elements.notes.value.trim(),sourceFolder:form.elements.sourceFolder.value.trim(),sourcePath:form.elements.sourcePath.value.trim(),mime:form.elements.mime.value.trim(),kind:'document',status:form.elements.assetKey.value?'Filed':'Needs filing',updated:new Date().toISOString()};if(!next.name){msg.textContent='Enter a document name.';return;}const buttons=editor.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);msg.textContent='Saving…';try{await write(next);const i=records.findIndex(r=>r.id===next.id);if(i<0)records.push(next);else records[i]=next;editor.close();afterChange();}catch(error){msg.textContent=error.message;}finally{buttons.forEach(b=>b.disabled=false);}});
    editor.querySelector('[data-remove-document]').addEventListener('click',async()=>{if(!editRecord||!confirm('Remove this document link from the portal? The original Drive file will remain.'))return;const next={...editRecord,status:'Removed',updated:new Date().toISOString()},msg=editor.querySelector('#vehicleDocumentSaveStatus');editor.querySelectorAll('button').forEach(b=>b.disabled=true);try{await write(next);records=records.filter(r=>r.id!==next.id);editor.close();afterChange();}catch(error){msg.textContent=error.message;}finally{editor.querySelectorAll('button').forEach(b=>b.disabled=false);}});
    editor.querySelector('[data-close-editor]').addEventListener('click',()=>editor.close());
    function handleClick(e){const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-new-document')){openEditor(null,panel.contains(b));return;}if(b.hasAttribute('data-open-document-hub')){openHub();return;}if(b.hasAttribute('data-refresh-documents')){load(true).catch(()=>{}).finally(()=>{paint();if(hub.open)paintHub();});return;}const r=records.find(r=>r.id===(b.dataset.previewDocument||b.dataset.editDocument));if(!r)return;if(b.dataset.editDocument){openEditor(r);return;}if(b.dataset.previewDocument){const url=driveUrl(r.url);if(!url)return;preview.querySelector('#documentPreviewTitle').textContent=r.name;preview.querySelector('#documentPreviewDrive').href=driveFolderUrl(r);preview.querySelector('#documentPreviewDrive').dataset.driveDocument=r.id;const cover=documentCovers[r.fileId||fileId(r.url)],coverImage=preview.querySelector('#vehicleDocumentCover'),frame=preview.querySelector('iframe');coverImage.hidden=!cover;coverImage.style.display=cover?'block':'none';frame.hidden=!!cover;frame.style.display=cover?'none':'';if(cover){coverImage.src=new URL(cover,location.href).href;frame.removeAttribute('src');preview.querySelector('p').textContent='Cover preview. This 2,827-page manual is too large for a reliable embedded preview. Use Open in Drive to open or download the full manual.';}else{coverImage.removeAttribute('src');preview.querySelector('p').textContent='If Google asks you to sign in or a preview is unavailable, use Open in Drive.';frame.src=r.fileId?'https://drive.google.com/file/d/'+encodeURIComponent(r.fileId)+'/preview':url;}preview.showModal();}}
    async function openDriveFolder(event){
      const link=event.target.closest('a[data-drive-document]');if(!link||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      const record=records.find(r=>r.id===link.dataset.driveDocument);if(!record)return;
      event.preventDefault();
      const opened=window.open(link.href,'_blank');if(!opened)return;opened.opener=null;
      const id=record.fileId||fileId(record.url);if(!id)return;
      try{
        const response=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=parents&supportsAllDrives=true',{headers:{Authorization:'Bearer '+thToken}});
        if(!response.ok)return;
        const info=await response.json();if(info.parents?.[0]&&!opened.closed)opened.location.href=driveFolderUrl({...record,sourceFolder:info.parents[0]});
      }catch{/* Keep the recorded Drive folder open if the current location cannot be checked. */}
    }
    panel.addEventListener('click',openDriveFolder);hub.addEventListener('click',openDriveFolder);preview.addEventListener('click',openDriveFolder);
    panel.addEventListener('click',handleClick);hub.addEventListener('click',handleClick);
    panel.addEventListener('input',e=>{if(!e.target.matches('[data-document-search]'))return;query=e.target.value;const tab=tabs.find(t=>t.id===activeTab);const rows=sorted(records.filter(r=>r.kind!=='folder'&&r.assetKey===assetKey(current)&&inTab(r,tab.name)&&matches(r,query)));panel.querySelector('[data-document-results]').innerHTML=rowsHtml(rows);});
    hub.querySelector('#documentHubSearch').addEventListener('input',e=>{globalQuery=e.target.value;paintHub();});
    hub.querySelector('#documentHubVehicle').addEventListener('change',e=>{globalVehicle=e.target.value;paintHub();});hub.querySelector('#documentHubCategory').addEventListener('change',e=>{globalCategory=e.target.value;paintHub();});
    hub.querySelector('[data-close-hub]').addEventListener('click',()=>hub.close());preview.querySelector('[data-close-preview]').addEventListener('click',()=>preview.close());preview.addEventListener('close',()=>preview.querySelector('iframe').removeAttribute('src'));
    load().catch(()=>{});
    return {render(tab,a){if(assetKey(current||{})!==assetKey(a))query='';current=a;activeTab=tab;panel.hidden=!tab.startsWith('documents-');updateCounts();if(!panel.hidden){document.querySelector('.edit-bar').hidden=true;paint();load().catch(()=>{}).finally(()=>{if(activeTab.startsWith('documents-'))paint();});}},openHub};
  }
  return {create,assetKey,parse,categories};
})();


