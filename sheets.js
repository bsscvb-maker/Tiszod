/* THBudget reads the owner's private workbook in the signed-in browser.
   No workbook values or access tokens are shipped with GitHub Pages. */
const TH_SHEET_ID = '1uC1tKyX4DnBKXH-4pIz8tm3zAvxdWr6ecrxrwUS9Hts';
const TH_CLIENT_ID = '881518334290-kimg628u5oriddlrqoq6vb619m8gn13s.apps.googleusercontent.com';
let thToken = '';
let thExpiresAt=0;
const TH_REQUIRED_SCOPES=['https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/drive.file','https://www.googleapis.com/auth/drive.readonly'];
let thNeedsDriveConsent=false;
const thHasScopes=s=>TH_REQUIRED_SCOPES.every(scope=>String(s||'').split(/\s+/).includes(scope));
let thTokenClient;
const TH_SESSION_KEY = 'thbudget-session-photos-v1';
try {
  const candidates=[localStorage.getItem(TH_SESSION_KEY),sessionStorage.getItem(TH_SESSION_KEY)].map(value=>{try{return JSON.parse(value||'null')}catch{return null}}).filter(Boolean);
  const saved=candidates.filter(s=>s.expiresAt>Date.now()+30000&&thHasScopes(s.scope)).sort((a,b)=>b.expiresAt-a.expiresAt)[0];
  if(saved){thToken=saved.token;thExpiresAt=saved.expiresAt;}
  else {thNeedsDriveConsent=candidates.some(s=>s.expiresAt>Date.now()+30000&&!thHasScopes(s.scope));localStorage.removeItem(TH_SESSION_KEY);sessionStorage.removeItem(TH_SESSION_KEY);}
} catch (_) {localStorage.removeItem(TH_SESSION_KEY);sessionStorage.removeItem(TH_SESSION_KEY);}


function thClearSession() {
  thToken = '';
  thExpiresAt=0;
  localStorage.removeItem(TH_SESSION_KEY);
  sessionStorage.removeItem(TH_SESSION_KEY);
  sessionStorage.removeItem('tiszod-vehicle-annual-usage-v1');
}

function thSignOut() {
  // Sign out of the portal without revoking the user's Google consent grant.
  thClearSession();
  location.reload();
}


const TH_STARTUP_RELEASE='20261030-startup-recovery-2';
function thRecoverStartup(error){
 // A rendering failure is not a Google authentication failure.
 if(error?.status===401)return false;
 const url=new URL(location.href);
 if(url.searchParams.get('portal_update')!==TH_STARTUP_RELEASE){
  url.searchParams.set('portal_update',TH_STARTUP_RELEASE);
  thStatus('Updating the portal…');
  location.replace(url.href);
  return true;
 }
 document.getElementById('th-auth').hidden=true;
 document.documentElement.classList.remove('th-session-pending');
 let panel=document.getElementById('th-workspace-error');
 if(!panel){
  panel=document.createElement('section');panel.id='th-workspace-error';panel.setAttribute('role','alert');
  panel.style.cssText='margin:20px;padding:20px;border:1px solid #6382ad;border-radius:10px;background:#152943;color:#f4f8ff;overflow-wrap:anywhere';
  const title=document.createElement('h2');title.textContent='This page could not finish opening';
  const message=document.createElement('p');message.textContent='Your Google sign-in is connected. You can open another module from the menu, or reload this page.';
  const detail=document.createElement('p');detail.textContent=String(error?.message||error||'Page startup error');
  const retry=document.createElement('button');retry.type='button';retry.textContent='Reload page';retry.onclick=()=>{const u=new URL(location.href);u.searchParams.set('retry',Date.now().toString());location.replace(u.href)};
  panel.append(title,message,detail,retry);
  (document.querySelector('.th-app-main')||document.querySelector('main')||document.body).prepend(panel);
 }
 return true;
}

// Loading-only layers reuse the unchanged crest; the normal logo remains its original image.
function thPrepareAuthSpinner(auth) {
 const logo=auth.querySelector('img.th-auth-logo');
 if(!logo||!/(?:^|\/)tiszod-crest\.svg(?:[?#]|$)/.test(logo.getAttribute('src')||''))return;
 const ns='http://www.w3.org/2000/svg',source=logo.getAttribute('src');
 const node=(tag,attributes={})=>{const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))el.setAttribute(key,value);return el};
 const shell=document.createElement('span');shell.className='th-auth-logo th-auth-logo-shell';
 const svg=node('svg',{viewBox:'0 0 551 560',class:'th-auth-logo-layered','aria-hidden':'true',focusable:'false'});
 const defs=node('defs'),outer=node('clipPath',{id:'th-auth-gear-clip',clipPathUnits:'userSpaceOnUse'});
 outer.append(node('path',{d:'M0 0H551V560H0Z M473 272A185 185 0 1 0 103 272A185 185 0 1 0 473 272Z','clip-rule':'evenodd','fill-rule':'evenodd'}));
 const clip=node('clipPath',{id:'th-auth-center-clip',clipPathUnits:'userSpaceOnUse'});clip.append(node('circle',{cx:'288',cy:'272',r:'186'}));defs.append(outer,clip);
 const gear=node('image',{href:source,width:'551',height:'560',class:'th-auth-gear','clip-path':'url(#th-auth-gear-clip)'});
 const center=node('image',{href:source,width:'551',height:'560','clip-path':'url(#th-auth-center-clip)'});
 svg.append(defs,gear,center);logo.replaceWith(shell);logo.classList.remove('th-auth-logo');logo.classList.add('th-auth-logo-original');shell.append(logo,svg);
}

function thStatus(message) {
  const loading = message === 'Opening your private workbook…';
  const auth = document.getElementById('th-auth');
  if(!document.getElementById('th-login-spin-style')){const style=document.createElement('style');style.id='th-login-spin-style';style.textContent="/* Spin the gear around its artwork center; keep the original crest and its center still. */\n#th-auth#th-auth.th-auth-loading .th-auth-logo{animation:none!important;transform:none!important}\n#th-auth .th-auth-logo-shell{position:relative;flex:none;overflow:visible}\n#th-auth .th-auth-logo-original{display:block;width:100%;height:100%;object-fit:contain}\n#th-auth .th-auth-logo-layered{position:absolute;inset:0;display:none;width:100%;height:100%;overflow:visible}\n#th-auth.th-auth-loading .th-auth-logo-original{visibility:hidden}\n#th-auth.th-auth-loading .th-auth-logo-layered{display:block}\n#th-auth#th-auth.th-auth-loading .th-auth-gear{transform-box:view-box;transform-origin:52.26860254% 48.57142857%;animation:th-auth-gear-spin 1.8s linear infinite!important;animation-play-state:running!important;will-change:transform}\n@keyframes th-auth-gear-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}\n";document.head.append(style);}
  thPrepareAuthSpinner(auth);
  auth.classList.toggle('th-auth-loading', loading);
  auth.setAttribute('aria-busy', String(loading));
  if(loading){auth.hidden=false;document.documentElement.classList.remove('th-session-pending');}
  document.getElementById('th-sign-in').hidden = loading;
  const authMessage = document.getElementById('th-auth-message');
  if (loading) {
    authMessage.textContent = 'Please wait';
    authMessage.setAttribute('aria-label', 'Please wait. Signing you in.');
  } else {
    authMessage.textContent = message;
    authMessage.removeAttribute('aria-label');
  }
}
async function thLoadWorkspace(){
 thStatus('Opening your private workbook…');
 // Paint the loading logo before starting workbook rendering on desktop and Safari.
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 await window.thStart();
 await new Promise(resolve=>requestAnimationFrame(resolve));
 document.getElementById('th-auth').setAttribute('aria-busy','false');
}
function thAuthorized() { return Boolean(thToken)&&thExpiresAt>Date.now()+5000; }
function thSignIn() {
  if (!window.google?.accounts?.oauth2) {
    thStatus('Google sign-in is still loading. Please try again.');
    return;
  }
  thTokenClient ||= google.accounts.oauth2.initTokenClient({
    client_id: TH_CLIENT_ID,
    scope: TH_REQUIRED_SCOPES.join(' ')+' https://www.googleapis.com/auth/userinfo.email',
    include_granted_scopes: true,
    callback: async response => {
      if (!response.access_token) {
        thStatus(response.error || 'Sign-in did not finish. Please try again.');
        return;
      }
      if(!google.accounts.oauth2.hasGrantedAllScopes(response,...TH_REQUIRED_SCOPES)){thStatus('Approve workbook and Drive access together to connect the portal, books, and pictures.');return;}
      thToken = response.access_token;
      thExpiresAt=Date.now()+Math.max(0,Number(response.expires_in)||3600)*1000;
      thNeedsDriveConsent=false;
      const session = JSON.stringify({token:thToken,expiresAt:thExpiresAt,scope:response.scope});
      localStorage.setItem(TH_SESSION_KEY, session);
      sessionStorage.setItem(TH_SESSION_KEY, session);
      thStatus('Opening your private workbook…');
      try {
        await thLoadWorkspace();
        document.getElementById('th-auth').hidden = true;
        window.dispatchEvent(new Event('tiszod-drive-books-connected'));
      } catch (error) {
        if(thRecoverStartup(error))return;
        if (error.status === 401) thClearSession();
        thStatus(error.message);
      }
    },
    error_callback:()=>thStatus('Sign-in was not completed. Use Sign in with Google to try again.')
  });
  thTokenClient.requestAccessToken({prompt: ''});
}
async function thSheets(path) {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + TH_SHEET_ID + path;
  let response;
  for (const delay of [0, 1000, 3000, 8000]) {
    if (delay) await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 250));
    try {
      response = await fetch(url, {
        cache: 'no-store',
        headers: {Authorization: 'Bearer ' + thToken}
      });
    } catch (error) {
      if (delay === 8000) throw new Error('Could not reach Google Sheets. Check your connection and try again.');
      continue;
    }
    if (![429, 500, 502, 503, 504].includes(response.status)) break;
  }
  if (!response.ok) {
    if (response.status === 401) { const error = new Error('Your sign-in expired. Please sign in again.'); error.status = 401; throw error; }
    if (response.status === 403 || response.status === 404) throw new Error('This Google account cannot open the TisZod workbook. Sign in with the account that owns it.');
    throw new Error('Google Sheets could not load the workbook (HTTP ' + response.status + '). Please try again.');
  }
  return response.json();
}
async function thValues(range, valueRenderOption = "FORMATTED_VALUE") {
  const result = await thSheets('/values/' + encodeURIComponent(range) + '?valueRenderOption=' + valueRenderOption);
  return result.values || [];
}
async function thFleetData() {
  const ranges = [
    "'Fleet List'!A1:I100",
    "'Mileage-2025.10.16'!A1:K",
    "'Portal Asset Profiles'!A1:AD",
    "'Vehicle Registry'!A1:G100"
  ];
  const query = new URLSearchParams({valueRenderOption:'FORMATTED_VALUE',fields:'valueRanges(values)'});
  for (const range of ranges) query.append('ranges',range);
  const [summary, readings] = await Promise.all([
    thSheets('/values:batchGet?' + query),
    thValues("'Mileage-2025.10.16'!E5:K", "UNFORMATTED_VALUE")
  ]);
  const [fr, mr, pr, rr] = ranges.map((_,i)=>summary.valueRanges?.[i]?.values||[]);
  const activeFleet = fr.slice(1).map(r => ({year:r[0],make:r[1],model:r[2],status:r[3]})).filter(v => v.year || v.make || v.model);
  const inactiveFleet = fr.slice(1).map(r => ({year:r[5],make:r[6],model:r[7],status:r[8]})).filter(v => v.year || v.make || v.model);
  const vehicles = mr.slice(4).map((r,i)=>({...r,...Object.fromEntries((readings[i]||[]).map((value,j)=>[j+4,value])),__row:i+5})).filter(r => r[1] && Number(r[2]) >= 1900 && Number(r[2]) <= 2100).map(r => ({
    sheetRow:r.__row,
    name:r[1],year:r[2],serviceStart:r[3],startMileage:r[4],currentMileage:r[5],addedMileage:r[6],
    daysDriven:r[7],monthsDriven:r[8],monthlyEstimate:r[9],annualEstimate:r[10]
  }));
  const profiles = pr.slice(1).map((r,i) => ({lastUpdated:r[29]||'',reportId:r[0],name:r[1],year:r[2],make:r[3],model:r[4],color:r[5],category:r[7],status:r[8],reportOdometer:r[10],vin:r[11],tag:r[13],engine:r[15],transmission:r[16],tireSize:r[17],photo:r[24],renewal:r[14],vehicleNumber:r[12],sourceType:r[6],department:r[9],insuranceCompany:r[18],driver:r[22],reportDate:r[26],reportNotes:r[27],ownershipStart:r[28],photoFileId:r[23],profileRow:i+2})).filter(p => p.name);
  const registry = rr.slice(1).map((r,i)=>({...r,__row:i+2})).filter(r => r[1] && r[2]).map(r => ({registryRow:r.__row,category:r[0],year:r[1],make:r[2],model:r[3],vin:r[4],tag:r[5],status:r[6]}));
  return {asOf:mr[0]?.[1] || '',activeFleet,inactiveFleet,vehicles,profiles,registry};
}
async function thFleetServiceData() {
  const [sr, sch] = await Promise.all([
    thValues("'Portal Service History'!A1:G5000"),
    thValues("'Portal Service Schedules'!A1:I5000")
  ]);
  const services = sr.slice(1).map((r,i)=>({...r,__row:i+2})).filter(r => r[0] && r[3]).map(r => ({sheetRow:r.__row,asset:r[0],id:r[1],date:r[2],item:r[3],odometer:r[4],cost:r[5],notes:r[6]}));
  const schedules={};
  for(const [index,r] of sch.slice(1).entries())if(r[0]&&r[2]){
    const entry=schedules[r[0]]||={sourceName:r[1],tasks:[]};
    entry.tasks.push({sheetRow:index+2,task:r[2],interval:r[3]||'',lastDate:r[4]||'',lastReading:r[5]||'',nextDate:r[6]||'',nextReading:r[7]||'',notes:r[8]||''});
    schedules[r[0]]=entry;
  }
  return {services,schedules};
}

async function thWriteCell(sheet, cell, value) {
  if (!thToken) throw new Error('Sign in again to save changes.');
  const range="'"+sheet.replace(/'/g,"''")+"'!"+cell;
  const response=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+TH_SHEET_ID+'/values/'+encodeURIComponent(range)+'?valueInputOption=USER_ENTERED',{
    method:'PUT',headers:{Authorization:'Bearer '+thToken,'Content-Type':'application/json'},
    body:JSON.stringify({range,majorDimension:'ROWS',values:[[value]]})
  });
  if (!response.ok) {
    const detail=await response.json().catch(()=>({}));
    throw new Error(response.status===401?'Your sign-in expired. Sign out and sign in again.':(detail.error?.message||'Could not save the change.'));
  }
}
// Send related cell/range updates in one request instead of one per cell.
async function thWriteRanges(updates, valueInputOption = 'USER_ENTERED') {
  if (!updates.length) return;
  if (!thToken) throw new Error('Sign in again to save changes.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try {
    const response=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+TH_SHEET_ID+'/values:batchUpdate',{
      method:'POST',signal:controller.signal,
      headers:{Authorization:'Bearer '+thToken,'Content-Type':'application/json'},
      body:JSON.stringify({valueInputOption,data:updates.map(({sheet,range,values})=>({range:"'"+sheet.replace(/'/g,"''")+"'!"+range,majorDimension:'ROWS',values}))})
    });
    if (!response.ok) {
      const detail=await response.json().catch(()=>({}));
      throw new Error(response.status===401?'Your sign-in expired. Sign out and sign in again.':(detail.error?.message||'Could not save the updates.'));
    }
  } catch(error) {
    if(error.name==='AbortError')throw new Error('The workbook took too long to respond. Refresh and check the saved service before trying again.');
    throw error;
  } finally {clearTimeout(timer)}
}
async function thAppendRow(sheet, values, valueInputOption = 'USER_ENTERED') {
  if (sheet === 'Mileage-2025.10.16') {
    // This sheet has other tables below the mileage register. Sheets' :append
    // finds the last of those tables and shifts a new entry into its columns.
    const rows = await thValues("'Mileage-2025.10.16'!A1:K");
    const row = Math.max(5, rows.length + 1);
    const range = "'Mileage-2025.10.16'!B" + row + ':K' + row;
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + TH_SHEET_ID + '/values/' + encodeURIComponent(range) + '?valueInputOption=USER_ENTERED', {
      method: 'PUT', headers: {Authorization:'Bearer ' + thToken, 'Content-Type':'application/json'},
      body: JSON.stringify({range, majorDimension:'ROWS', values:[values.slice(1, 11)]})
    });
    if (!response.ok) {const detail=await response.json().catch(()=>({}));throw new Error(detail.error?.message||'Could not add a mileage record.')}
    return row;
  }
  const appendRanges={'Mileage-2025.10.16':'A5:K','Portal Service History':'A:G','Portal Service Schedules':'A:I','FreeBirds':'A:P','Portal Asset Profiles':'A:AC'};
  const range="'"+sheet.replace(/'/g,"''")+"'!"+(appendRanges[sheet]||'A:Z');
  const response=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+TH_SHEET_ID+'/values/'+encodeURIComponent(range)+':append?valueInputOption='+encodeURIComponent(valueInputOption)+'&insertDataOption=INSERT_ROWS',{
    method:'POST',headers:{Authorization:'Bearer '+thToken,'Content-Type':'application/json'},
    body:JSON.stringify({values:[values]})
  });
  if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(detail.error?.message||'Could not add a row.')}
  const result=await response.json();
  return Number(result.updates?.updatedRange?.match(/![A-Z]+(\d+)/)?.[1])||0;
}
async function thDriveFetch(fileId,options={}) {
  if(!thAuthorized()){const error=new Error('Your portal session expired. Sign in to the portal again to reconnect Drive.');error.status=401;throw error;}
  const response=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(fileId)+'?alt=media',{...options,headers:{...(options.headers||{}),Authorization:'Bearer '+thToken}});
  if(response.status===401){thClearSession();const error=new Error('Your portal session expired. Sign in to the portal again to reconnect Drive.');error.status=401;throw error;}
  return response;
}
async function thPhotoObjectUrl(fileId) {
  const response=await thDriveFetch(fileId);
  if(!response.ok)throw new Error('This Google account cannot open that picture.');
  return URL.createObjectURL(await response.blob());
}

async function thUploadFreebirdPhoto(file, row) {
  if (!thToken) throw new Error('Sign in again to add a picture.');
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP picture.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Choose a picture under 12 MB.');
  const boundary='thbudget-'+crypto.randomUUID();
  const metadata=JSON.stringify({name:'FreeBirds row '+row+' - '+file.name});
  const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,`--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`,file,`\r\n--${boundary}--`],{type:'multipart/related; boundary='+boundary});
  const response=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{Authorization:'Bearer '+thToken,'Content-Type':'multipart/related; boundary='+boundary},body});
  if (!response.ok) {const detail=await response.json().catch(()=>({}));throw new Error('Picture upload failed: '+(detail.error?.message||response.status));}
  const {id}=await response.json();
  if (!id) throw new Error('Picture upload did not return a file ID.');
  await thWriteCell('FreeBirds','P'+row,id);
  return id;
}
async function thUploadAssetPhoto(file, asset) {
  if (!thToken) throw new Error('Sign in again to add a photo.');
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP photo.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Choose a photo under 12 MB.');
  const boundary = 'thbudget-' + crypto.randomUUID();
  const metadata = JSON.stringify({name: [asset.year,asset.make,asset.model].filter(Boolean).join(' ') + ' photo' + (file.name.match(/\.[a-z0-9]+$/i)?.[0] || '')});
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`, file, `\r\n--${boundary}--`
  ], {type:'multipart/related; boundary=' + boundary});
  const upload = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method:'POST',headers:{Authorization:'Bearer '+thToken,'Content-Type':'multipart/related; boundary='+boundary},body
  });
  if (!upload.ok) { const detail=await upload.json().catch(()=>({})); throw new Error('Photo upload failed: '+(detail.error?.message||('Google returned '+upload.status))); }
  const {id} = await upload.json();
  if (!id) throw new Error('Photo upload did not return a file ID.');
  const url = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w800';
  const base = 'https://sheets.googleapis.com/v4/spreadsheets/' + TH_SHEET_ID + '/values/';
  let endpoint, values, method;
  if (asset.profileRow) {
    endpoint = base + encodeURIComponent("'Portal Asset Profiles'!X"+asset.profileRow+':Y'+asset.profileRow) + '?valueInputOption=RAW';
    values = [[id,url]]; method = 'PUT';
  } else {
    const row = Array(25).fill('');
    Object.assign(row,{1:[asset.year,asset.make,asset.model].filter(Boolean).join(' '),2:asset.year,3:asset.make,4:asset.model,7:asset.category,8:asset.status,11:asset.vin,13:asset.tag,23:id,24:url});
    endpoint = base + encodeURIComponent("'Portal Asset Profiles'!A:AA") + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
    values = [row]; method = 'POST';
  }
  const save = await fetch(endpoint,{method,headers:{Authorization:'Bearer '+thToken,'Content-Type':'application/json'},body:JSON.stringify({values})});
  if (!save.ok) { const detail=await save.json().catch(()=>({})); throw new Error('Photo uploaded, but its vehicle link could not be saved: '+(detail.error?.message||('Google returned '+save.status))); }
  const result = await save.json();
  if (!asset.profileRow) asset.profileRow = Number(result.updates?.updatedRange?.match(/![A-Z]+(\d+)/)?.[1]) || 0;
  asset.photoFileId=id;
  return url;
}
async function thTab(position) {
  const meta = await thSheets('?fields=sheets.properties(title,index,gridProperties(rowCount,columnCount))');
  const sheet = meta.sheets?.sort((a,b) => a.properties.index-b.properties.index)[position-1]?.properties;
  if (!sheet) throw new Error('This workbook section was not found.');
  const rows = await thValues("'" + sheet.title.replace(/'/g,"''") + "'!A1:T300");
  return {title:sheet.title,rows,rowCount:sheet.gridProperties.rowCount,columnCount:Math.min(sheet.gridProperties.columnCount,20)};
}
document.getElementById('th-auth').classList.add('th-auth-ready');
document.getElementById('th-sign-in').addEventListener('click', thSignIn);
if (thToken) {
  document.getElementById('th-auth').hidden=true;
  document.documentElement.classList.remove('th-session-pending');
  Promise.resolve().then(() => window.thStart()).then(() => {
    document.getElementById('th-auth').hidden = true;
  }).catch(error => {
    if(thRecoverStartup(error))return;
    if (error.status === 401) thClearSession();
    thStatus(error.message);
    document.getElementById('th-auth').hidden = false;
    document.documentElement.classList.remove('th-session-pending');
  });
}

if(thNeedsDriveConsent)thStatus('Sign in once to connect Google Drive, books, and pictures with your portal session.');
// Keep the same portal session across tabs; signing out clears every tab.
addEventListener('storage',event=>{
 if(event.key!==TH_SESSION_KEY)return;
 let saved;try{saved=JSON.parse(event.newValue||'null')}catch{}
 if(saved?.expiresAt>Date.now()+30000&&thHasScopes(saved.scope)){thToken=saved.token;thExpiresAt=saved.expiresAt;sessionStorage.setItem(TH_SESSION_KEY,event.newValue);window.dispatchEvent(new Event('tiszod-drive-books-connected'));}
 else {thClearSession();document.getElementById('th-auth').hidden=false;document.documentElement.classList.remove('th-session-pending');thStatus('Sign in to reconnect your portal and Google Drive.');}
});
if(thNeedsDriveConsent)document.documentElement.classList.remove('th-session-pending');

