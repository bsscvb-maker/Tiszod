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
}

function thSignOut() {
  // Sign out of the portal without revoking the user's Google consent grant.
  thClearSession();
  location.reload();
}

function thStatus(message) {
  const loading = message === 'Opening your private workbook…';
  const auth = document.getElementById('th-auth');
  auth.classList.toggle('th-auth-loading', loading);
  document.getElementById('th-sign-in').hidden = loading;
  const authMessage = document.getElementById('th-auth-message');
  if (loading) {
    authMessage.innerHTML = '<span class="th-wait-label">Please wait</span><span class="th-wait-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>';
    authMessage.setAttribute('aria-label', 'Please wait. Signing you in.');
  } else {
    authMessage.textContent = message;
    authMessage.removeAttribute('aria-label');
  }
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
        await window.thStart();
        document.getElementById('th-auth').hidden = true;
        window.dispatchEvent(new Event('tiszod-drive-books-connected'));
      } catch (error) {
        if (error.status === 401) thClearSession();
        thStatus(error.message);
      }
    },
    error_callback:()=>thStatus('Sign-in was not completed. Use Sign in with Google to try again.')
  });
  thTokenClient.requestAccessToken({prompt: ''});
}
async function thSheets(path) {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + TH_SHEET_ID + path, {
    headers: {Authorization: 'Bearer ' + thToken}
  });
  if (!response.ok) {
    if (response.status === 401) { const error = new Error('Your sign-in expired. Please sign in again.'); error.status = 401; throw error; }
    if (response.status === 403 || response.status === 404) throw new Error('This Google account cannot open the TisZod workbook. Sign in with the account that owns it.');
    throw new Error('The workbook could not be loaded. Please try again.');
  }
  return response.json();
}
async function thValues(range, valueRenderOption = "FORMATTED_VALUE") {
  const result = await thSheets('/values/' + encodeURIComponent(range) + '?valueRenderOption=' + valueRenderOption);
  return result.values || [];
}
async function thFleetData() {
  const [fr, mr, pr, notes, ownership, rr, readings] = await Promise.all([
    thValues("'Fleet List'!A1:I100"),
    thValues("'Mileage-2025.10.16'!A1:K"),
    thValues("'Portal Asset Profiles'!A1:Y1000"),
    thValues("'Portal Asset Profiles'!AA1:AB1000"),
    thValues("'Portal Asset Profiles'!AC1:AC1000"),
    thValues("'Vehicle Registry'!A1:G100"),
    thValues("'Mileage-2025.10.16'!E5:K", "UNFORMATTED_VALUE")
  ]);
  const activeFleet = fr.slice(1).map(r => ({year:r[0],make:r[1],model:r[2],status:r[3]})).filter(v => v.year || v.make || v.model);
  const inactiveFleet = fr.slice(1).map(r => ({year:r[5],make:r[6],model:r[7],status:r[8]})).filter(v => v.year || v.make || v.model);
  const vehicles = mr.slice(4).map((r,i)=>({...r,...Object.fromEntries((readings[i]||[]).map((value,j)=>[j+4,value])),__row:i+5})).filter(r => r[1] && Number(r[2]) >= 1900 && Number(r[2]) <= 2100).map(r => ({
    sheetRow:r.__row,
    name:r[1],year:r[2],serviceStart:r[3],startMileage:r[4],currentMileage:r[5],addedMileage:r[6],
    daysDriven:r[7],monthsDriven:r[8],monthlyEstimate:r[9],annualEstimate:r[10]
  }));
  const profiles = pr.slice(1).map((r,i) => ({reportId:r[0],name:r[1],year:r[2],make:r[3],model:r[4],color:r[5],category:r[7],status:r[8],reportOdometer:r[10],vin:r[11],tag:r[13],engine:r[15],transmission:r[16],tireSize:r[17],photo:r[24],renewal:r[14],vehicleNumber:r[12],sourceType:r[6],department:r[9],insuranceCompany:r[18],driver:r[22],reportDate:notes[i+1]?.[0],reportNotes:notes[i+1]?.[1],ownershipStart:ownership[i+1]?.[0],photoFileId:r[23],profileRow:i+2})).filter(p => p.name);
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
document.getElementById('th-sign-in').addEventListener('click', thSignIn);
if (thToken) {
  // A valid saved session can load each workspace behind its own page content.
  // Reserve the sign-in overlay for a new login or an actual access error.
  document.getElementById('th-auth').hidden = true;
  document.documentElement.classList.remove('th-session-pending');
  Promise.resolve().then(() => window.thStart()).then(() => {
    document.getElementById('th-auth').hidden = true;
  }).catch(error => {
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
