/* Private EPUB reader. Book bytes stay in the browser. */
(()=>{'use strict';
let book,rendition,activeId='',generation=0,size=110,driveReadToken='';
const dlg=document.createElement('dialog');dlg.id='book-reader';
dlg.innerHTML='<header><h2 id="reader-title">Book reader</h2><button id="reader-close" aria-label="Close reader">✕</button></header><nav aria-label="Reading controls"><button id="reader-prev">← Previous</button><button id="reader-next">Next →</button><label>Chapter <select id="reader-chapters"><option>Loading…</option></select></label><button id="reader-smaller" aria-label="Smaller text">A−</button><button id="reader-larger" aria-label="Larger text">A+</button></nav><p id="reader-status" role="status" aria-live="polite"></p><div id="reader-help" hidden><button id="reader-connect">Connect Google Drive</button> <a id="reader-download" target="_blank" rel="noopener noreferrer">Download from Drive</a><label> or choose a downloaded EPUB <input id="reader-file" type="file" accept=".epub,application/epub+zip"></label></div><div id="reader-pages"></div>';
document.body.append(dlg);
const $=id=>document.getElementById(id),status=t=>$('reader-status').textContent=t;
const style=document.createElement('style');style.textContent='#book-reader{width:min(1100px,96vw);max-width:96vw;height:92dvh;max-height:94dvh;padding:16px;border:1px solid #68869a;border-radius:12px;background:#f7f3e8;color:#172434}#book-reader::backdrop{background:#000b}#book-reader[open]{display:flex;flex-direction:column;gap:8px}#book-reader header,#book-reader nav{display:flex;gap:10px;align-items:center;flex-wrap:wrap}#book-reader h2{flex:1;margin:0;font:700 20px system-ui}#book-reader button,#book-reader select{padding:8px;border:1px solid #65809a;border-radius:6px;background:#fff;color:#172434;cursor:pointer}#reader-chapters{max-width:min(350px,70vw)}#reader-pages{flex:1;min-height:200px;overflow:hidden;background:#fff}#reader-status{font:14px system-ui;margin:0}#reader-help{padding:12px;border:1px solid #aebdc8}#reader-help label{display:inline-block}#reader-help a{color:#174e86;text-decoration:underline}';document.head.append(style);
const loadScript=(src,global)=>window[global]?Promise.resolve():new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('Reader components could not load. Check your connection and retry.'));document.head.append(s)});
async function libraries(){await loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','JSZip');await loadScript('https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js','ePub')}
function dispose(){if(book){try{book.destroy()}catch{}}book=null;rendition=null;$('reader-pages').replaceChildren()}
async function display(bytes,run){
 await libraries();if(run!==generation||!dlg.open)return;
 const archive=await JSZip.loadAsync(bytes);const encryption=archive.file('META-INF/encryption.xml');
 if(encryption&&/EncryptedData/i.test(await encryption.async('text'))){const xml=await encryption.async('text');if(!/idpf.org\/2008\/embedding|ns.adobe.com\/pdf\/enc#RC/i.test(xml))throw Error('This book is encrypted and requires its original authorized reading app.')}
 dispose();book=ePub(bytes);await book.ready;if(run!==generation||!dlg.open){dispose();return}
 rendition=book.renderTo('reader-pages',{width:'100%',height:'100%',spread:'none',allowScriptedContent:false,allowPopups:false});
 rendition.themes.fontSize(size+'%');
 const nav=await book.loaded.navigation;$('reader-chapters').replaceChildren();function add(items,depth=0){for(const item of items||[]){const o=document.createElement('option');o.value=item.href;o.textContent='  '.repeat(depth)+item.label.trim();$('reader-chapters').append(o);add(item.subitems,depth+1)}}add(nav.toc);
 rendition.on('relocated',loc=>{try{localStorage.setItem('tiszod-reading:'+activeId,loc.start.cfi)}catch{}$('reader-prev').disabled=loc.atStart;$('reader-next').disabled=loc.atEnd;status('Reading position saved on this browser.');});
 let saved;try{saved=localStorage.getItem('tiszod-reading:'+activeId)}catch{}
 try{await rendition.display(saved||undefined)}catch{await rendition.display()}
 $('reader-help').hidden=true;
}
async function fetchBook(token,run){
 status('Loading your book…');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
 try{const r=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(activeId)+'?alt=media',{headers:{Authorization:'Bearer '+token},signal:controller.signal});if(!r.ok){if([401,403,404].includes(r.status))throw Error('Connect Google Drive with the account that owns this book, or download it and choose the EPUB below.');throw Error('Google Drive could not load this book. Please retry.')}const bytes=await r.arrayBuffer();if(run===generation)await display(bytes,run)}
 finally{clearTimeout(timer)}
}
function fail(e){status(e.name==='AbortError'?'The download timed out. Please try again.':e.message);$('reader-help').hidden=false}
window.thReadBook=async(id,name,url)=>{generation++;dispose();activeId=id;$('reader-title').textContent=name;$('reader-download').href=url;$('reader-help').hidden=true;$('reader-chapters').replaceChildren();if(!dlg.open)dlg.showModal();const run=generation;try{await fetchBook(driveReadToken||(typeof thToken==='string'?thToken:''),run)}catch(e){if(run===generation)fail(e)}};
$('reader-connect').onclick=()=>{if(!window.google?.accounts?.oauth2){status('Google sign-in is still loading. Try again.');return}const run=generation;google.accounts.oauth2.initTokenClient({client_id:TH_CLIENT_ID,scope:'https://www.googleapis.com/auth/drive.readonly',callback:async r=>{if(run!==generation||!dlg.open)return;if(!r.access_token){status('Drive connection was not completed. You can still choose a downloaded EPUB.');return}driveReadToken=r.access_token;window.dispatchEvent(new Event('tiszod-drive-books-connected'));try{await fetchBook(r.access_token,run)}catch(e){if(run===generation)fail(e)}},error_callback:()=>status('Drive sign-in was closed. Try again or choose a downloaded EPUB.')}).requestAccessToken({prompt:''})};
$('reader-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;const run=++generation;status('Opening EPUB…');try{await display(await f.arrayBuffer(),run)}catch(e){fail(e)}e.target.value=''};
$('reader-close').onclick=()=>dlg.close();dlg.addEventListener('close',()=>{generation++;dispose()});
async function turn(method){if(rendition)try{await rendition[method]()}catch(e){status('Could not turn the page: '+e.message)}}
$('reader-prev').onclick=()=>turn('prev');$('reader-next').onclick=()=>turn('next');
$('reader-chapters').onchange=()=>rendition?.display($('reader-chapters').value).catch(fail);
function font(delta){size=Math.max(70,Math.min(200,size+delta));rendition?.themes.fontSize(size+'%')}
$('reader-smaller').onclick=()=>font(-10);$('reader-larger').onclick=()=>font(10);
dlg.addEventListener('keydown',e=>{if(['INPUT','SELECT'].includes(e.target.tagName))return;if(e.key==='ArrowLeft'){e.preventDefault();turn('prev')}if(e.key==='ArrowRight'){e.preventDefault();turn('next')}});
new ResizeObserver(()=>{if(rendition)rendition.resize($('reader-pages').clientWidth,$('reader-pages').clientHeight)}).observe($('reader-pages'));

const coverUrls=new Map(),coverPending=new Map();
window.thBookCover=async id=>{
 if(coverUrls.has(id))return coverUrls.get(id);
 if(coverPending.has(id))return coverPending.get(id);
 const task=(async()=>{
 const token=driveReadToken||(typeof thToken==='string'?thToken:'');if(!token)return null;
 const r=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?alt=media',{headers:{Authorization:'Bearer '+token}});
 if(!r.ok)return null;await libraries();const zip=await JSZip.loadAsync(await r.arrayBuffer());
 const container=zip.file('META-INF/container.xml');if(!container)return null;
 const parser=new DOMParser(),xml=parser.parseFromString(await container.async('text'),'application/xml');
 const path=xml.getElementsByTagNameNS('*','rootfile')[0]?.getAttribute('full-path');if(!path||!zip.file(path))return null;
 const opf=parser.parseFromString(await zip.file(path).async('text'),'application/xml'),items=[...opf.getElementsByTagNameNS('*','item')];
 const coverId=[...opf.getElementsByTagNameNS('*','meta')].find(m=>m.getAttribute('name')==='cover')?.getAttribute('content');
 const item=items.find(i=>(i.getAttribute('properties')||'').split(/\s+/).includes('cover-image'))||items.find(i=>coverId&&i.getAttribute('id')===coverId)||items.find(i=>/cover/i.test(i.getAttribute('id')||'')&&/^image\//.test(i.getAttribute('media-type')||''));
 if(!item)return null;const base=path.includes('/')?path.slice(0,path.lastIndexOf('/')+1):'';
 const resolved=new URL(item.getAttribute('href'),'https://epub.invalid/'+base);
 const coverFile=zip.file(decodeURIComponent(resolved.pathname.slice(1)));if(!coverFile)return null;
 const type=item.getAttribute('media-type')||'image/jpeg';if(!['image/jpeg','image/png','image/gif','image/webp','image/svg+xml'].includes(type))return null;
 const url=URL.createObjectURL(new Blob([await coverFile.async('uint8array')],{type}));coverUrls.set(id,url);return url;
 })();coverPending.set(id,task);try{return await task}finally{coverPending.delete(id)}
};

})();