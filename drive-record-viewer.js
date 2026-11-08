/* Shared Drive folder browser, thumbnail cards, and in-portal preview. */
(() => {
const legalViewer=document.getElementById('legal-view');
const legalViewerBody=document.getElementById('legal-view-body');
const legalViewerBack=document.getElementById('legal-view-back');
let legalViewRequest;
const inlineViewer=legalViewer.tagName!=='DIALOG';
const navigationCards=new WeakMap();
let openTrail=[], navigationVersion=0;
function saveTrail(trail){
 const state={...history.state,thDriveTrail:trail};
 if(window.portalNavigation)window.portalNavigation.push(state,location.href);
 else history.pushState(state,'');
}
function closeFromNavigation(){
 if(!inlineViewer&&openTrail.length){
  navigationVersion++;
  openTrail=[];
  saveTrail([]);
 }
 closeLegalRecord();
}
async function restoreNavigation(){
 if(inlineViewer)return;
 const trail=history.state?.thDriveTrail||[];
 if(JSON.stringify(trail)===JSON.stringify(openTrail))return;
 const version=++navigationVersion;
 if(!trail.length){
  openTrail=[];
  if(legalViewer.open)closeLegalRecord();
  return;
 }
 if(typeof thAuthorized==='function'&&!thAuthorized())return;
 for(let depth=0;depth<trail.length;depth++){
  const selector='[data-th-drive-id="'+CSS.escape(trail[depth])+'"]';
  const root=depth?legalViewerBody:document;
  let button=root.querySelector(selector);
  while(!button&&depth&&version===navigationVersion){
   const more=legalViewerBody.querySelector('[data-th-drive-more]:not([hidden]):not(:disabled)');
   if(!more||more.textContent!=='Load more')break;
   await more.onclick();
   button=root.querySelector(selector);
  }
  if(version!==navigationVersion||!button)return;
  const entry=navigationCards.get(button);
  if(!entry)return;
  openTrail=trail.slice(0,depth+1);
  await showLegalRecord(entry.record,entry.back);
 }
}
if(!inlineViewer){
 addEventListener('popstate',()=>void restoreNavigation());
 addEventListener('pageshow',event=>{if(event.persisted)void restoreNavigation()});
 legalViewer.addEventListener('cancel',event=>{
  event.preventDefault();
  closeFromNavigation();
 });
}
function closeLegalRecord(){
 if(!inlineViewer){legalViewer.close();return;}
 if(legalViewer.hidden)return;
 legalViewer.hidden=true;
 legalViewer.dispatchEvent(new Event('close'));
}
document.getElementById('legal-view-close').onclick=closeFromNavigation;
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
const legalMimePrefix='application/vnd.google-apps.';
let legalPdfModule;
async function legalDriveRequest(path,params,record,signal){
 if(!thAuthorized())throw Object.assign(Error('Sign in again to view this file.'),{status:401});
 const headers={Authorization:'Bearer '+thToken};
 const keys=record.resourceKeys||(record.resourceKey?[record.id+'/'+record.resourceKey]:[]);
 if(keys.length)headers['X-Goog-Drive-Resource-Keys']=keys.join(',');
 const response=await fetch('https://www.googleapis.com/drive/v3/files'+path+'?'+new URLSearchParams(params),{headers,signal});
 if(!response.ok)throw Object.assign(Error('Drive could not load this record.'),{status:response.status});
 return response;
}
async function legalFolderPage(record,pageToken,signal,coverFilter){
 const params={q:"'"+record.id+"' in parents and trashed = false",fields:'nextPageToken,files(id,name,mimeType,webViewLink,thumbnailLink,resourceKey,capabilities(canDownload))',pageSize:'50',orderBy:'folder,name_natural',supportsAllDrives:'true',includeItemsFromAllDrives:'true'};
 if(coverFilter){
  params.q+=' and ('+coverFilter+')';
  params.orderBy='name_natural';
 }
 if(pageToken)params.pageToken=pageToken;
 const result=await (await legalDriveRequest('',params,record,signal)).json();
 return {nextPageToken:result.nextPageToken,files:(result.files||[]).map(file=>{
  const folder=file.mimeType===legalMimePrefix+'folder';
  const fallback=folder?'https://drive.google.com/drive/folders/':'https://drive.google.com/file/d/';
  return {id:file.id,name:file.name,folder,url:file.webViewLink||fallback+file.id,mime:file.mimeType,thumbnail:file.thumbnailLink,resourceKey:file.resourceKey,canDownload:file.capabilities?.canDownload};
 })};
}
async function findDriveFolders(name){
 const escaped=name.replace(/['\\]/g,'\\async function legalMedia(record,signal){');
 const params={q:"name = '"+escaped+"' and mimeType = '"+legalMimePrefix+"folder' and trashed = false",
  fields:'nextPageToken,files(id,name,resourceKey)',pageSize:'100',supportsAllDrives:'true',includeItemsFromAllDrives:'true'};
 const folders=[];
 do{
  const result=await (await legalDriveRequest('',params,{},AbortSignal.timeout(15000))).json();
  folders.push(...(result.files||[]));
  if(!result.nextPageToken)break;
  params.pageToken=result.nextPageToken;
 }while(true);
 return folders;
}
async function driveChildren(record){
 const files=[];
 let pageToken;
 do{
  const page=await legalFolderPage(record,pageToken,AbortSignal.timeout(15000));
  files.push(...page.files);
  pageToken=page.nextPageToken;
 }while(pageToken);
 return files;
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
async function careerFolderPhoto(record,signal){
 const searchDescendants=record.coverPath?.[0]==='Employers'&&
  record.coverPath[1]==='Berkley'&&record.coverPath[2]==='Berkley Machine Works Pictures';
 const imageFilter="mimeType contains 'image/'";
 const filter=searchDescendants?imageFilter+" or mimeType = '"+legalMimePrefix+"folder'":imageFilter;
 const queue=[{folder:record,depth:0}];
 let remainingRequests=12;
 for(const {folder,depth} of queue){
  let pageToken,photoIndex=0;
  do{
   if(remainingRequests--<=0)return null;
   const page=await legalFolderPage(folder,pageToken,signal,filter);
   for(const file of page.files){
    if(file.folder&&searchDescendants)queue.push({folder:file,depth:depth+1});
    // Reserve a different image for each ancestor that borrows from this folder.
    if(file.canDownload!==false&&/^image\/(jpeg|png|webp|gif|bmp|avif)$/.test(file.mime)&&photoIndex++===depth){
     return legalMedia(file,signal);
    }
   }
   pageToken=page.nextPageToken;
  }while(pageToken);
 }
 return null;
}

async function legalPdf(blob){
 legalPdfModule ||= import('./vendor/pdfjs/pdf.min.mjs');
 const pdfjs=await legalPdfModule;
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.compat.mjs',location.href).href;
 const wasmUrl=new URL('./vendor/pdfjs/wasm/',location.href).href;
 return pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer()),wasmUrl});
}
async function legalPdfPage(pdf,number,width){
 const page=await pdf.getPage(number);
 const viewport=page.getViewport({scale:width/page.getViewport({scale:1}).width});
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
 await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
 return canvas;
}
async function legalDocumentCover(record,signal){
 const blob=await legalMedia(record,signal);
 if(blob.type!=='application/pdf')return {blob,photo:true};
 const task=await legalPdf(blob);
 try{
  const pdf=await task.promise;
  let selected, sparsePage, sparseInk=0;
  for(let number=1;number<=Math.min(pdf.numPages,8);number++){
   if(signal?.aborted)return null;
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
const careerFolderSymbols=[
 [/sql|software|systems|computer|desktop|network|server|servicenow|dnc\s*50/i,'M3 4h18v13H3zM8 21h8M12 17v4M7 8l3 3-3 3m6 0h4'],
 [/email|correspondence|communications/i,'M3 5h18v14H3zM3 5l9 8 9-8'],
 [/customers|suppliers|vendors|contacts/i,'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20v-2a6 6 0 0 1 12 0v2m2-9a3 3 0 0 0 0-6m1 9a4 4 0 0 1 3 4v2'],
 [/résum|resume|cover letter|application|references|job search|job postings/i,'M7 3h7l4 4v14H7zM14 3v5h4M10 12h5m-5 4h5'],
 [/benefits|retirement|pension|payroll|401k|fidelity|schwab|cobra/i,'M12 2v20m4-15H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H7'],
 [/reviews|performance|reports|analytics|metrics|insights/i,'M4 4v16h16M8 16v-4m4 4V8m4 8V6'],
 [/training|plans|instructions|resources|education/i,'M3 5c4-1 7 0 9 2 2-2 5-3 9-2v14c-4-1-7 0-9 2-2-2-5-3-9-2zM12 7v14'],
 [/photos|pictures|images|screenshots|media|video/i,'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M16 9h.01'],
 [/archive|backup|recovered|duplicate/i,'M4 8h16v12H4zM3 4h18v4H3zM9 12h6'],
 [/drafting|machine|engineering|shop|tools|leadwell|weiler|fixture|spindle|lathe|milling/i,'M4 19L19 4v15zM10 16l6-6v6z'],
 [/travel|expenses|transport/i,'M12 22s7-5 7-12a7 7 0 0 0-14 0c0 7 7 12 7 12zM12 10h.01'],
 [/employers|company|operations|projects/i,'M3 7h18v13H3zM8 7V4h8v3M3 12h18m-11 0v3h4v-3']
];
function careerFolderSymbol(path){
 for(const part of [...path].reverse()){
  if(/^(19|20)\d{2}$/.test(part))return 'M4 6h16v14H4zM8 3v6m8-6v6M4 10h16';
  const match=careerFolderSymbols.find(([pattern])=>pattern.test(part));
  if(match)return match[1];
 }
 return 'M3 6h7l2 3h9v11H3z';
}
function uniqueCover(key,symbol){
 // Each location gets an original composition, including archives with no usable preview.
 let state=2166136261;
 for(const ch of key)state=Math.imul(state^ch.codePointAt(0),16777619)>>>0;
 const random=max=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return Math.floor(state/4294967296*max);};
 const hue=random(360), accent=(hue+65+random(155))%360, focus=100+random(310);
 const bg=`hsl(${hue} 39% 16%)`, paper=`hsl(${accent} 62% 78%)`;
 const panels=Array.from({length:4+random(5)},(_,i)=>{
  const x=38+i*57+random(60),y=44+random(142),w=75+random(127),h=53+random(96),angle=random(64)-32;
  const tone=(hue+i*17+random(57))%360;
  const marks=Array.from({length:2+random(6)},(_,j)=>`<path d="M14 ${18+j*7}h${15+random(w-30)}"/>`).join('');
  return `<g transform="translate(${x} ${y}) rotate(${angle})"><rect width="${w}" height="${h}" rx="${4+random(10)}" fill="hsl(${tone} 40% ${24+random(36)}%)" stroke="${paper}" stroke-opacity=".37"/><g stroke="${paper}" stroke-opacity=".55">${marks}</g></g>`;
 }).join('');
 const signature=Array.from(key,ch=>ch.codePointAt(0).toString(16)).join('.');
 const emblem=symbol?`<g transform="translate(${Math.max(152,focus)} 180)"><circle r="118" fill="${bg}" fill-opacity=".95" stroke="${paper}" stroke-width="2"/><path transform="translate(-88 -88) scale(7.3)" d="${symbol}" fill="none" stroke="${paper}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></g>`:'';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><desc>${signature}</desc><defs><radialGradient id="light" cx="${focus/6.4}%" cy="39%" r="70%"><stop stop-color="hsl(${hue} 40% 42%)"/><stop offset="1" stop-color="${bg}"/></radialGradient><pattern id="grid" width="19" height="19" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${paper}" opacity=".17"/></pattern></defs><rect width="640" height="360" fill="url(#light)"/><rect width="640" height="360" fill="url(#grid)"/><circle cx="${focus}" cy="170" r="${70+random(90)}" fill="none" stroke="${paper}" stroke-opacity=".37"/><g transform="translate(20 22)">${symbol?'':panels}</g>${emblem}<rect x="24" y="24" width="592" height="312" rx="15" fill="none" stroke="${paper}" stroke-opacity=".25"/></svg>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
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
 const careerFolder=record.folder&&document.body.dataset.thPage==='career';
 card.className='legal-file';
 if(careerFolder){
  card.classList.add('career-folder-tile');
  if(record.coverPath?.length===2&&record.coverPath[0]==='Employers')card.classList.add('career-employer-tile');
 }
 if((record.folder&&record.medicalCover)||record.medicalArt||record.medicalCoverImage)card.classList.add('medical-photo-card');caption.textContent=record.displayName??record.name;caption.title=record.name;actions.className='legal-actions';
 const type=document.createElement('span');type.className='legal-kind';type.textContent=record.kindLabel??(record.map?'Map':record.directReader?(record.cardLabel?'Timeline':'Rules'):record.folder?'Folder':'Document');card.append(type,caption);
 if(record.id||record.directReader||record.virtualFiles){
  const button=document.createElement(record.directReader?'a':'button');
  if(record.directReader){
   button.href=record.readerUrl;
   if(record.closeOnOpen)button.addEventListener('click',closeFromNavigation);
  }else button.type='button';
  button.className='legal-thumbnail';
  if(careerFolder)button.setAttribute('aria-label','Open '+(record.displayName??record.name));
  const art=document.createElement('span'),label=document.createElement('span'),labelTitle=document.createElement('span');
  art.className='legal-thumbnail-art';art.textContent='Loading cover…';art.style.fontSize='.85rem';art.setAttribute('aria-hidden','true');
  label.className='legal-thumbnail-label';labelTitle.className='legal-thumbnail-title';labelTitle.textContent=((record.folder&&record.medicalCover)||record.medicalArt||record.medicalCoverImage)?record.name:record.cardLabel||(record.map?'Enlarge map':record.directReader?'Search rules':record.folder?'Browse files':'Preview');
  if(careerFolder)labelTitle.textContent=record.displayName??record.name;
  label.append(labelTitle);
  button.append(art,label);
  if(!record.directReader){
   if(!inlineViewer&&record.id){
    button.dataset.thDriveId=record.id;
    navigationCards.set(button,{record,back});
   }
   button.onclick=()=>{
    if(!inlineViewer&&record.id){
     navigationVersion++;
     openTrail=legalViewerBody.contains(button)?[...openTrail,record.id]:[record.id];
     saveTrail(openTrail);
    }
    return showLegalRecord(record,back);
   };
  }
  if(window.thMedicalCardCover){
   card.classList.add('medical-themed-card');
   const image=document.createElement('img');
   image.alt='';
   image.loading='lazy';
   image.src=thMedicalCardCover(record);
   art.replaceChildren(image);
  }else if(record.folder||record.directReader||record.medicalArt||record.medicalCoverImage){
   const folderPhoto=record.coverFor?.(record.coverPath)??record.legalFolderPhotoFor?.(record.name);
   const fallback=()=>uniqueCover(
    JSON.stringify(record.coverPath?[...record.coverPath,record.id]:[document.body.dataset.thPage,record.id,record.name]),
    (careerFolder||record.folder&&record.coverPath?.[0]==='hobbies')?careerFolderSymbol(record.coverPath??[record.name]):undefined
   );
   const image=document.createElement('img');
   image.alt='';
   if(record.medicalLogo)image.classList.add('medical-carrier-logo');
   image.dataset.photo='';
   const medicalImage=record.medicalArt&&'assets/medical/'+record.medicalArt+'.webp';
   const recreationImage=record.cover&&'assets/hobbies/'+record.cover+'.webp'+(record.cover==='striders-trailer'?'?v=power-logo':'');
   image.onerror=()=>{image.onerror=null;image.src=fallback();};
   image.src=recreationImage||folderPhoto||record.medicalCoverImage||medicalImage||fallback();
   art.replaceChildren(image);
   if(careerFolder&&!folderPhoto){
    legalCoverJobs.set(button,async()=>{
     if(!button.isConnected)return;
     const timeout=AbortSignal.timeout(12000);
     const signal=back&&legalViewRequest?AbortSignal.any([timeout,legalViewRequest.signal]):timeout;
     const photo=await careerFolderPhoto(record,signal).catch(()=>null);
     if(!photo||!button.isConnected||signal.aborted)return;
     const url=URL.createObjectURL(photo);
     const cover=new Image();
     cover.alt='';
     cover.dataset.photo='';
     try{
      cover.src=url;
      await cover.decode();
      if(button.isConnected&&!signal.aborted)art.replaceChildren(cover);
     }catch{}finally{URL.revokeObjectURL(url)}
    });
    legalCoverObserver.observe(button);
   }
  }else{
   legalCoverJobs.set(button,async()=>{
    const unavailable=()=>{art.textContent='Thumbnail unavailable · Tap to preview'};
    const fallbackPhoto=record.coverPath&&uniqueCover(JSON.stringify([...record.coverPath,record.id]));
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
     if(fallbackPhoto&&!img.hasAttribute('data-cover-fallback')){
      img.dataset.coverFallback='';
      img.dataset.photo='';
      img.style.objectFit='cover';
      img.src=fallbackPhoto;
      return;
     }
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
 legalViewerBack.hidden=!back;legalViewerBack.onclick=!inlineViewer&&openTrail.length>1?()=>history.back():back||null;
 document.getElementById('legal-view-title').textContent=record.displayName??record.name;
 const actions=document.getElementById('legal-view-actions');
 actions.replaceChildren();
 const showDriveAction=record.driveAction&&record.url&&!(record.folder&&document.body.dataset.thPage==='career');
 if(showDriveAction)actions.append(legalLink(record.folder?'Open full Drive folder':'Open in Drive',record.url));
 legalDownloadAction(actions,record);
 if(record.libraryActions){
  const email=document.createElement('a');
  email.textContent='Email Drive link';
  const url=new URL(record.url);
  if(record.resourceKey)url.searchParams.set('resourcekey',record.resourceKey);
  email.href='mailto:?subject='+encodeURIComponent(record.displayName)+'&body='+encodeURIComponent(url.href+'\n\nThe recipient will need access to the file in Google Drive.');
  actions.append(email);
 }
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
 if(inlineViewer){
  legalViewer.hidden=false;
  document.getElementById('legal-view-title').focus();
 }else if(!legalViewer.open)legalViewer.showModal();
 if(!record.folder){
  status.textContent='Loading preview…';
  try{
   if(record.bookPages?.length&&window.thManualReader){
    status.textContent=record.bookPages.length+' available scanned pages';
    const files=new Map(record.bookPages.map(page=>[page.number,page.file]));
    thManualReader.book(legalViewerBody,[...files.keys()],async(number,signal)=>{
     const blob=await legalMedia(files.get(number),signal);
     if(signal.aborted)return;
     const url=URL.createObjectURL(blob);
     const img=new Image();
     img.alt='Original page '+number;
     img.src=url;
     try{await img.decode();return img;}finally{URL.revokeObjectURL(url);}
    },request.signal);
    return;
   }
   const isText=record.libraryActions&&record.mime?.startsWith('text/')&&record.size<=1024*1024;
   if(isText){
    const response=await legalDriveRequest('/'+encodeURIComponent(record.id),{alt:'media',supportsAllDrives:'true'},record,request.signal);
    const value=await response.text();
    if(request.signal.aborted)return;
    const preview=document.createElement('pre');preview.className='library-preview-text';preview.textContent=value;
    status.textContent='';legalViewerBody.append(preview);return;
   }
   const supported=/^(application\/(pdf|vnd\.google-apps\.(document|spreadsheet|presentation))|image\/(jpeg|png|webp|gif|bmp|avif))$/;
   if(record.libraryActions&&!supported.test(record.mime)){
    const url=new URL('https://drive.google.com/file/d/'+encodeURIComponent(record.id)+'/preview');
    if(record.resourceKey)url.searchParams.set('resourcekey',record.resourceKey);
    const frame=document.createElement('iframe');frame.className='library-preview-frame';frame.title=record.displayName;
    frame.src=url.href;status.textContent='If this format cannot be previewed here, use Open in Drive or Download.';
    legalViewerBody.append(frame);return;
   }
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
   if(record.readingMode&&window.thManualReader){
    await thManualReader.render(pdf,legalViewerBody,status,number=>legalPdfPage(pdf,number,Math.max(320,Math.min(1500,legalViewerBody.clientWidth*2))),request.signal,record.bookMode);
    return;
   }
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
 const more=document.createElement('button');more.type='button';more.dataset.thDriveMore='';more.textContent='Load more';more.hidden=true;container.append(more);
 async function loadPage(pageToken){
  more.disabled=true;
  try{
   const result=record.virtualFiles?{files:typeof record.virtualFiles==='function'?record.virtualFiles():record.virtualFiles}:await legalFolderPage(record,pageToken,request.signal);
   if(request.signal.aborted)return;
   const order=record.childOrder;
   const entries=order?[...result.files].sort((a,b)=>
    (order.get(a.name)??Infinity)-(order.get(b.name)??Infinity)
   ):result.files;
   for(const file of entries){
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
    const stridersCollection=file.folder&&record.tidewaterStriders&&['Events','Board Records'].includes(file.name);
    const cover=record.indianCove?indianCoveCovers.get(file.name):
     record.tidewaterStriders?stridersCovers.get(file.name):
     record.stridersCollection?stridersSubfolderCovers.get(file.name):undefined;
    if(record.medicalCover&&/^archive - review|^verified duplicates|^recovered exports - needs review|^temporary office files|^~\$/i.test(file.name))continue;
    files.append(legalFileCard({...file,
     cover,stridersCollection,medicalCover:record.medicalCover,
     displayName:file.displayName??(file.folder?record.childFolderLabel?.(file.name):undefined),
     childFolderLabel:record.childFolderLabel,driveAction:file.driveAction??record.driveAction,
     legalFolderPhotoFor:file.legalFolderPhotoFor??(file.folder?record.legalFolderPhotoFor:undefined),
     coverFor:file.coverFor??record.coverFor,
     coverPath:file.coverPath??[...(record.coverPath??[document.body.dataset.thPage,record.id,record.name]),file.name],
     excludedFolderIds:record.excludedFolderIds,
     medicalArt:file.medicalArt,
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

window.thDriveRecords = { card: legalFileCard, open: showLegalRecord, children: driveChildren, findFolders: findDriveFolders, request: legalDriveRequest, close: closeLegalRecord, restoreNavigation, uniqueCover, cover: legalDocumentCover };
})();
