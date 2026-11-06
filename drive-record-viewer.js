/* Shared Drive folder browser, thumbnail cards, and in-portal preview. */
(() => {
const legalViewer=document.getElementById('legal-view');
const legalViewerBody=document.getElementById('legal-view-body');
const legalViewerBack=document.getElementById('legal-view-back');
let legalViewRequest;
document.getElementById('legal-view-close').onclick=()=>legalViewer.close();
legalViewer.addEventListener('close',()=>{
 legalViewRequest?.abort();
 legalViewerBody.replaceChildren();
 legalViewerBack.onclick=null;
});
function legalLink(label,url){
 const link=document.createElement('a');
 link.textContent=label;link.href=url;link.target='_blank';link.rel='noopener noreferrer';
 return link;
}
function legalDownloadAction(target,record){
 if(record.folder||!record.id||record.canDownload===false)return;
 const nativeType=!record.downloadOriginal&&new URL(record.url).pathname.match(/^\/(document|spreadsheets|presentation)\//)?.[1];
 const base='https://docs.google.com/'+nativeType+'/d/'+record.id;
 const download=nativeType==='presentation'?base+'/export/pdf':nativeType?base+'/export?format=pdf':'https://drive.google.com/uc?export=download&id='+record.id;
 const url=new URL(download);
 if(record.resourceKey&&!nativeType)url.searchParams.set('resourcekey',record.resourceKey);
 target.append(legalLink(nativeType?'Download PDF':'Download',url.href));
}
const indianCoveRules={name:'Campground Rules',readerUrl:'indian-cove-rules.html',cover:'indian-cove-rules'};
const indianCoveCovers=new Map([
 ['Billing and Payments','indian-cove-billing'],
 ['Deeds','indian-cove-deed'],
 ['Resort Communications','indian-cove-communications']
]);
const stridersCovers=new Map([
 ['Events','striders-events'],
 ['Board Records','striders-board'],
 ['POWER Closeout and Trailer Return','striders-trailer'],
 ['Course Maps and Meeting Point','striders-maps']
]);
const stridersSubfolderCovers=new Map([
 ['Banquet','striders-banquet'],
 ['Summer Picnic','striders-picnic'],
 ['Summer Series','striders-summer-series'],
 ['Working Calendar','striders-calendar'],
 ['Membership Dues','striders-membership'],
 ['Race Schedule','striders-race-schedule'],
 ['Application','striders-application'],
 ['Head Shots','striders-headshots']
]);
function stridersSubfolderCover(name, parentCover){
 const matched=stridersSubfolderCovers.get(name);
 if(matched)return matched;
 if(/^20\d{2}$/.test(name)&&parentCover==='striders-board')return 'striders-archive';
 if(parentCover==='striders-archive'&&/^\d{2}[ .-]20\d{2}$/.test(name))return 'striders-calendar';
 return parentCover;
}
const legalMimePrefix='application/vnd.google-apps.';
let legalPdfModule;
async function legalDriveRequest(path,params,record,signal){
 if(!thAuthorized())throw Error('Sign in again to view this file.');
 const headers={Authorization:'Bearer '+thToken};
 if(record.resourceKey)headers['X-Goog-Drive-Resource-Keys']=record.id+'/'+record.resourceKey;
 const response=await fetch('https://www.googleapis.com/drive/v3/files'+path+'?'+new URLSearchParams(params),{headers,signal});
 if(!response.ok)throw Error('Drive could not load this record.');
 return response;
}
async function legalFolderPage(record,pageToken,signal){
 const params={q:"'"+record.id+"' in parents and trashed = false",fields:'nextPageToken,files(id,name,mimeType,webViewLink,thumbnailLink,resourceKey,capabilities(canDownload))',pageSize:'50',orderBy:'folder,name_natural',supportsAllDrives:'true',includeItemsFromAllDrives:'true'};
 if(pageToken)params.pageToken=pageToken;
 const result=await (await legalDriveRequest('',params,record,signal)).json();
 return {nextPageToken:result.nextPageToken,files:(result.files||[]).map(file=>{
  const folder=file.mimeType===legalMimePrefix+'folder';
  const fallback=folder?'https://drive.google.com/drive/folders/':'https://drive.google.com/file/d/';
  return {id:file.id,name:file.name,folder,url:file.webViewLink||fallback+file.id,mime:file.mimeType,thumbnail:file.thumbnailLink,resourceKey:file.resourceKey,canDownload:file.capabilities?.canDownload};
 })};
}
async function legalMedia(record,signal){
 const path='/'+encodeURIComponent(record.id);
 const mime=record.mime||(await (await legalDriveRequest(path,{fields:'mimeType',supportsAllDrives:'true'},record,signal)).json()).mimeType;
 if(['document','spreadsheet','presentation'].some(type=>mime===legalMimePrefix+type)){
  return (await legalDriveRequest(path+'/export',{mimeType:'application/pdf'},record,signal)).blob();
 }
 if(!/^image\/(jpeg|png|webp|gif|bmp|avif)$/.test(mime)&&mime!=='application/pdf')throw Error('This file type does not have an in-portal preview.');
 return (await legalDriveRequest(path,{alt:'media',supportsAllDrives:'true'},record,signal)).blob();
}
async function legalPdf(blob){
 legalPdfModule ||= import('./vendor/pdfjs/pdf.min.mjs');
 const pdfjs=await legalPdfModule;
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.compat.mjs',location.href).href;
 return pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer())});
}
async function legalPdfPage(pdf,number,width){
 const page=await pdf.getPage(number);
 const viewport=page.getViewport({scale:width/page.getViewport({scale:1}).width});
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
 await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
 return canvas;
}
async function legalDocumentCover(record){
 const blob=await legalMedia(record);
 if(blob.type!=='application/pdf')return {blob,photo:true};
 const task=await legalPdf(blob);
 try{
  const pdf=await task.promise;
  let selected, sparsePage, sparseInk=0;
  for(let number=1;number<=Math.min(pdf.numPages,8);number++){
   const canvas=await legalPdfPage(pdf,number,640);
   const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   let darkInk=0, visibleInk=0;
   for(let offset=0;offset<pixels.length;offset+=16){
    if(pixels[offset+3]<=128)continue;
    const shade=(pixels[offset]+pixels[offset+1]+pixels[offset+2])/3;
    if(shade<180)darkInk++;
    if(shade<235)visibleInk++;
   }
   // Skip sparse cover sheets when an early page has enough dark detail.
   if(darkInk>=pixels.length/16*.0015){
    selected=canvas;
    break;
   }
   if(visibleInk>sparseInk){
    sparsePage=canvas;
    sparseInk=visibleInk;
   }
  }
  if(!selected&&!sparsePage)return null;
  if(!selected){
   // Make faint scans easier to see in the thumbnail.
   const context=sparsePage.getContext('2d');
   const image=context.getImageData(0,0,sparsePage.width,sparsePage.height);
   for(let offset=0;offset<image.data.length;offset+=4){
    for(let channel=0;channel<3;channel++){
     const index=offset+channel;
     image.data[index]=255-3*Math.max(0,248-image.data[index]);
    }
   }
   context.putImageData(image,0,0);
  }
  const image=await new Promise(resolve=>(selected||sparsePage).toBlob(resolve,'image/jpeg',.9));
  return image?{blob:image,photo:false,fitPage:!selected}:null;
 }finally{await task.destroy()}
}
const legalFolderThemes=[
 {pattern:/divorce|dissolution|separation|marriage/i,tone:'plum',art:'<path d="M65 26 59 46l8 9-8 16 6 15" stroke-dasharray="4 5"/><circle cx="44" cy="57" r="13"/><circle cx="83" cy="57" r="13"/><path d="m35 43 4-7h10l4 7m21 0 4-7h10l4 7"/>'},
 {pattern:/sealing|pardon|expungement|restoration/i,tone:'teal',art:'<rect x="42" y="48" width="44" height="31" rx="5"/><path d="M51 48V38a13 13 0 0 1 26 0v10m-13 12v7"/>'},
 {pattern:/support|custody|family/i,tone:'teal',art:'<circle cx="48" cy="42" r="8"/><circle cx="80" cy="42" r="8"/><circle cx="64" cy="57" r="6"/><path d="M34 67v-3a14 14 0 0 1 20-13m40 16v-3a14 14 0 0 0-20-13M52 80v-3a12 12 0 0 1 24 0v3"/>'},
 {pattern:/settlement|claims?|litigation|leasing|kroger|refund/i,tone:'blue',art:'<rect x="38" y="30" width="52" height="44" rx="4"/><path d="M47 41h21m-21 9h15m-15 9h10"/><circle cx="83" cy="70" r="15"/><path d="m76 70 5 5 9-10"/>'},
 {pattern:/bankruptcy|court|legal/i,tone:'gold',art:'<path d="M64 29v49m-14 0h28M42 40h44M43 40l-10 19h20L43 40Zm42 0L75 59h20L85 40ZM33 59a10 8 0 0 0 20 0m22 0a10 8 0 0 0 20 0"/>'}
];
function medicalFolderArt(name, parentArt){
 if (/vision|eyeglass|optometry|optical/i.test(name)) return 'vision';
 if (/records by year|^\d{4}$/i.test(name)) return 'history';
 if (/coverage history/i.test(name)) return 'coverage';
 if (/past plans/i.test(name)) return 'plans';
 if (/claims/i.test(name)) return 'claims';
 if (/insurance|trustmark/i.test(name)) return 'insurance';
 if (/notes|referrals/i.test(name)) return 'notes';
 if (/immunization|vaccine/i.test(name)) return 'immunizations';
 if (/billing|receipt|payment/i.test(name)) return 'billing';
 if (/lab|screening/i.test(name)) return 'labs';
 if (/dental|orthodont/i.test(name)) return 'dental';
 if (/weight|composition|tracking/i.test(name)) return 'weight';
 return parentArt;
}
function legalFolderCover(name,medicalTone){
 const medicalThemes={
  teal:'<path d="M58 32h12v15h15v12H70v18H58V59H43V47h15Z"/>',
  blue:'<rect x="43" y="33" width="42" height="48" rx="5"/><path d="M52 57h24m-24 9h24m-24-22h10"/>',
  plum:'<path d="M56 32h16m-12 0v20l-13 24a5 5 0 0 0 4 7h26a5 5 0 0 0 4-7L68 52V32M54 68h20"/>',
  gold:'<rect x="41" y="39" width="46" height="39" rx="4"/><path d="M48 50h31m-31 10h12m-12 9h19"/>'
 };
 const theme=medicalThemes[medicalTone]?{tone:medicalTone,art:medicalThemes[medicalTone]}:legalFolderThemes.find(({pattern})=>pattern.test(name))||
  {tone:'gold',art:'<path d="M36 43h22l6 6h28v25H36z"/><path d="M44 43V33h34v16m-25-8h16"/>'};
 const cover=document.createElement('span');
 cover.className='legal-folder-cover';cover.dataset.tone=theme.tone;
 cover.innerHTML='<svg viewBox="0 0 320 150" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'+
  '<g opacity=".25"><path d="M15 36V17h19m252 0h19v19M15 114v19h19m252 0h19v-19"/><path d="M25 28h34m-34 7h20m216-7h34m-20 7h20M25 122h34m202 0h34"/><circle cx="160" cy="75" r="66" stroke-dasharray="1 5"/></g>'+
  '<g opacity=".38" fill="#162130"><path d="M54 41h49v73H54z" transform="rotate(-15 78 77)"/><path d="M217 40h49v73h-49z" transform="rotate(15 241 77)"/><path d="M61 55h31m-31 8h25m-25 8h28m-28 8h19" transform="rotate(-15 78 77)"/><path d="M226 54h29m-29 8h22m-22 8h25m-25 8h18" transform="rotate(15 241 77)"/></g>'+
  '<circle cx="160" cy="75" r="56" fill="#111b2a" fill-opacity=".8" stroke-opacity=".7"/><circle cx="160" cy="75" r="50" stroke-opacity=".3"/>'+
  '<g transform="translate(96 21)" stroke-width="2.3">'+theme.art+'</g>'+
  '<g fill="currentColor"><path d="m160 12 3 5-3 5-3-5zm0 116 3 5-3 5-3-5z"/><circle cx="38" cy="75" r="2"/><circle cx="282" cy="75" r="2"/></g></svg>';
 return cover;
}
const legalCoverJobs=new WeakMap();
const legalCoverObserver=new IntersectionObserver(entries=>{
 for(const entry of entries){
  if(!entry.isIntersecting)continue;
  legalCoverObserver.unobserve(entry.target);
  legalCoverJobs.get(entry.target)?.();
 }
});
function legalFileCard(record,back){
 const card=document.createElement('article'),caption=document.createElement('strong'),actions=document.createElement('div');
 card.className='legal-file';if(record.medicalArt||record.medicalCoverImage)card.classList.add('medical-photo-card');caption.textContent=record.displayName??record.name;actions.className='legal-actions';
 const type=document.createElement('span');type.className='legal-kind';type.textContent=record.map?'Map':record.directReader?(record.cardLabel?'Timeline':'Rules'):record.folder?'Folder':'Document';card.append(type,caption);
 if(record.id||record.directReader){
  const button=document.createElement(record.directReader?'a':'button');
  if(record.directReader)button.href=record.readerUrl;else button.type='button';
  button.className='legal-thumbnail';
  const art=document.createElement('span'),label=document.createElement('span');
  art.className='legal-thumbnail-art';art.textContent='Loading cover…';art.style.fontSize='.85rem';art.setAttribute('aria-hidden','true');
  label.className='legal-thumbnail-label';label.textContent=(record.medicalArt||record.medicalCoverImage)?record.name:record.cardLabel||(record.map?'Enlarge map':record.directReader?'Search rules':record.folder?'Browse files':'Preview');
  button.append(art,label);
  if(!record.directReader)button.onclick=()=>showLegalRecord(record,back);
  if(record.folder||record.directReader||record.medicalArt||record.medicalCoverImage){
   const fallback=legalFolderCover(record.name,record.medicalCover);
   const folderPhoto=record.legalFolderPhotoFor?.(record.name);
   if(folderPhoto){
    const image=document.createElement('img');
    image.alt='';
    image.dataset.photo='';
    image.onerror=()=>art.replaceChildren(fallback);
    image.src=folderPhoto;
    art.replaceChildren(image);
   }else if(record.cover||record.medicalArt||record.medicalCoverImage){
    const image=document.createElement('img');
    image.alt='';
    if(record.medicalLogo)image.classList.add('medical-carrier-logo');
    image.src=record.medicalCoverImage||(record.medicalArt?'assets/medical/'+record.medicalArt+'.webp':'assets/hobbies/'+record.cover+'.webp'+(record.cover==='striders-trailer'?'?v=power-logo':''));
    image.onerror=()=>art.replaceChildren(fallback);
    art.replaceChildren(image);
   }else art.replaceChildren(fallback);
  }else{
   legalCoverJobs.set(button,async()=>{
    const unavailable=()=>{art.textContent='Thumbnail unavailable · Tap to preview'};
    const cover=await legalDocumentCover(record).catch(()=>null);
    if(!button.isConnected)return;
    const img=document.createElement('img');
    img.alt='';img.referrerPolicy='no-referrer';
    const objectUrl=cover?URL.createObjectURL(cover.blob):null;
    const fallback=new URL('https://drive.google.com/thumbnail');
    fallback.searchParams.set('id',record.id);
    fallback.searchParams.set('sz','w640');
    if(record.resourceKey)fallback.searchParams.set('resourcekey',record.resourceKey);
    function release(){if(objectUrl)URL.revokeObjectURL(objectUrl)}
    img.onload=()=>{art.replaceChildren(img);release()};
    img.onerror=()=>{
     if(img.src===objectUrl){release();img.src=record.thumbnail||fallback.href;return}
     if(record.thumbnail&&img.src===record.thumbnail){img.src=fallback.href;return}
     unavailable();
    };
    if(cover?.photo)img.dataset.photo='';
    if(cover?.fitPage)img.style.objectFit='contain';
    if(record.map)img.dataset.map='';
    img.src=objectUrl||record.thumbnail||fallback.href;
   });
   legalCoverObserver.observe(button);
  }
  card.append(button);
 }
 legalDownloadAction(actions,record);
 if(actions.childElementCount)card.append(actions);
 return card;
}
async function showLegalRecord(record,back){
 legalViewRequest?.abort();
 const request=new AbortController();
 legalViewRequest=request;
 legalViewerBack.hidden=!back;legalViewerBack.onclick=back||null;
 document.getElementById('legal-view-title').textContent=record.displayName??record.name;
 const actions=document.getElementById('legal-view-actions');
 actions.replaceChildren();legalDownloadAction(actions,record);
 if(record.downloadReport){
  const download=document.createElement('button');
  download.type='button';download.textContent='Download PDF';
  download.onclick=record.downloadReport;actions.append(download);
 }
 if(record.readerUrl){
  const reader=document.createElement('a');
  reader.href=record.readerUrl;
  reader.textContent='Read digital bylaws';
  actions.prepend(reader);
 }
 const status=document.createElement('p');status.setAttribute('role','status');
 legalViewerBody.replaceChildren(status);
 if(!legalViewer.open)legalViewer.showModal();
 if(!record.folder){
  status.textContent='Loading preview…';
  try{
   const blob=await legalMedia(record,request.signal);
   if(request.signal.aborted)return;
   if(blob.type.startsWith('image/')){
    const img=document.createElement('img'),url=URL.createObjectURL(blob);
    img.className='legal-preview-image';img.alt=record.name;
    request.signal.addEventListener('abort',()=>URL.revokeObjectURL(url),{once:true});
    img.onerror=()=>{status.textContent='This image could not be displayed.';img.remove()};
    img.src=url;status.textContent='';legalViewerBody.append(img);return;
   }
   const task=await legalPdf(blob);
   if(request.signal.aborted){await task.destroy();return}
   request.signal.addEventListener('abort',()=>{task.destroy().catch(()=>{})},{once:true});
   const pdf=await task.promise;
   if(record.map){
    const canvas=await legalPdfPage(pdf,1,2400);
    if(request.signal.aborted)return;
    canvas.className='legal-preview-image';
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label',record.name);
    const frame=document.createElement('div'),zoom=document.createElement('button');
    frame.style.overflow='auto';
    frame.tabIndex=0;
    frame.setAttribute('aria-label','Scrollable map');
    zoom.type='button';
    zoom.textContent='Zoom in';
    zoom.setAttribute('aria-pressed','false');
    zoom.onclick=()=>{
     const enlarged=zoom.getAttribute('aria-pressed')==='true';
     zoom.setAttribute('aria-pressed',String(!enlarged));
     zoom.textContent=enlarged?'Zoom in':'Fit to view';
     canvas.style.maxWidth=enlarged?'':'none';
     canvas.style.width=enlarged?'':'1500px';
     if(enlarged)frame.scrollTo(0,0);
    };
    frame.append(canvas);actions.prepend(zoom);legalViewerBody.append(frame);
    status.textContent='Use Zoom in to read map details.';
    return;
   }
   const pages=document.createElement('div'),next=document.createElement('button');
   next.type='button';legalViewerBody.append(pages,next);
   let page=1;
   async function render(){
    next.disabled=true;
    try{
     const canvas=await legalPdfPage(pdf,page,Math.max(320,Math.min(1500,pages.clientWidth*2)));
     if(request.signal.aborted)return;
     canvas.className='legal-preview-image';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Page '+page);
     pages.append(canvas);status.textContent='Page '+page+' of '+pdf.numPages;
     next.hidden=page>=pdf.numPages;next.textContent='Show page '+(page+1);page++;
    }catch{if(!request.signal.aborted)status.textContent='Could not render this page.'}
    finally{next.disabled=false}
   }
   next.textContent='Show page 1';next.onclick=render;await render();
  }catch(error){if(!request.signal.aborted)status.textContent=error.message||'Preview unavailable.'}
  return;
 }
 const returnToFolder=()=>showLegalRecord(record,back);
 if(record.dashboard)legalViewerBody.insertBefore(record.dashboard(returnToFolder),status);
 if(record.dashboardOnly){status.remove();return;}
 const container=record.hideSupporting?document.createElement('details'):legalViewerBody;
 if(record.hideSupporting){
  const summary=document.createElement('summary');summary.textContent='Supporting documents';
  container.append(summary,status);legalViewerBody.append(container);
 }
 status.textContent='Loading folder…';
 const files=document.createElement('div');files.className='legal-cards';container.append(files);
 const more=document.createElement('button');more.type='button';more.textContent='Load more';more.hidden=true;container.append(more);
 async function loadPage(pageToken){
  more.disabled=true;
  try{
   const result=record.virtualFiles?{files:typeof record.virtualFiles==='function'?record.virtualFiles():record.virtualFiles}:await legalFolderPage(record,pageToken,request.signal);
   if(request.signal.aborted)return;
   for(const file of result.files){
    if(file.folder&&record.excludedFolderIds?.has(file.id))continue;
    if(record.indianCove){
     if(/^Original Communications Files$|^Duplicates - Review for Deletion$/i.test(file.name))continue;
     if(/^Campground Maps and Rules$/i.test(file.name)){
      const maps=await legalFolderPage(file,null,request.signal);
      if(request.signal.aborted)return;
      const map=maps.files.find(item=>item.name==='Campground - Map and General Rules.pdf');
      if(map)files.append(legalFileCard({...map,name:'Campground Maps',map:true},returnToFolder));
      files.append(legalFileCard({...indianCoveRules,directReader:true},returnToFolder));
      continue;
     }
    }
    if(record.indianCoveBilling&&file.name==='Original Invoices and Receipts')continue;
    const stridersCollection=file.folder&&(record.stridersCollection||
     (record.tidewaterStriders&&['Events','Board Records'].includes(file.name)));
    const cover=record.indianCove?indianCoveCovers.get(file.name):
     record.tidewaterStriders?stridersCovers.get(file.name):
     stridersCollection?stridersSubfolderCover(file.name,record.cover):undefined;
    if(record.medicalCover&&/^archive - review|^verified duplicates|^recovered exports - needs review|^temporary office files|^~\$/i.test(file.name))continue;
    files.append(legalFileCard({...file,
     cover,stridersCollection,medicalCover:record.medicalCover,
     displayName:file.folder?record.childFolderLabel?.(file.name):undefined,
     legalFolderPhotoFor:file.folder?record.legalFolderPhotoFor:undefined,
     excludedFolderIds:record.excludedFolderIds,
     medicalArt:file.medicalArt||(file.folder&&record.medicalArt?medicalFolderArt(file.name,record.medicalArt):undefined),
     stridersMaps:record.tidewaterStriders&&file.name==='Course Maps and Meeting Point',
     map:record.stridersMaps&&file.mime==='application/pdf',
     indianCoveBilling:record.indianCove&&file.name==='Billing and Payments'
    },returnToFolder));
   }
   status.textContent=files.children.length?'':'This folder is empty.';
   more.textContent='Load more';more.hidden=!result.nextPageToken;more.onclick=()=>loadPage(result.nextPageToken);
  }catch{
   if(!request.signal.aborted){
    status.textContent='Could not load this folder.';
    more.hidden=false;more.textContent='Try again';more.onclick=()=>loadPage(pageToken);
   }
  }finally{more.disabled=false}
 }
 await loadPage();
}

window.thDriveRecords = { card: legalFileCard, open: showLegalRecord };
})();
