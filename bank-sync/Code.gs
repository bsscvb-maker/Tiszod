/** Tiszod Bank Sync. All permanent tokens remain server-side. */
function plaidRequest_(path, payload) {
  const p = PropertiesService.getScriptProperties();
  const clientId = p.getProperty('PLAID_CLIENT_ID');
  const secret = p.getProperty('PLAID_SECRET');
  if (!clientId || !secret) throw new Error('Missing Plaid configuration.');
  const r = UrlFetchApp.fetch('https://production.plaid.com' + path, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify(Object.assign({}, payload, {client_id: clientId, secret: secret}))
  });
  const data = JSON.parse(r.getContentText());
  if (r.getResponseCode() !== 200) throw new Error('Plaid: ' + (data.error_code || r.getResponseCode()));
  return data;
}
function checkPlaidConnection() {
  const r = plaidRequest_('/link/token/create', linkOptions_());
  if (!r.link_token) throw new Error('Plaid did not return a Link token.');
  console.log('SUCCESS: Plaid Production credentials accepted.');
}
function linkOptions_() {
  return {client_name: 'Tiszod Personal Finance', language: 'en',
    country_codes: ['US'], products: ['transactions'],
    account_filters: {depository: {account_subtypes: ['checking', 'savings']}},
    user: {client_user_id: 'tiszod-personal-owner'}};
}
function startPersonalConnection() {
  const p = PropertiesService.getScriptProperties();
  if (p.getProperty('PLAID_ACCESS_TOKEN')) throw new Error('An account is already connected.');
  const options = linkOptions_();
  options.hosted_link = {url_lifetime_seconds: 1800};
  const r = plaidRequest_('/link/token/create', options);
  if (!r.hosted_link_url || !r.link_token) throw new Error('Hosted Link unavailable.');
  p.setProperty('PLAID_SETUP_LINK_TOKEN', r.link_token);
  p.setProperty('PLAID_SETUP_EXPIRES', r.expiration);
  console.log('Open this temporary connection page: ' + r.hosted_link_url);
}

function finishPersonalConnection() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = PropertiesService.getScriptProperties();
    let accessToken = p.getProperty('PLAID_ACCESS_TOKEN');
    if (!accessToken) {
      const linkToken = p.getProperty('PLAID_SETUP_LINK_TOKEN');
      if (!linkToken) throw new Error('No setup session found.');
      const result = plaidRequest_('/link/token/get', {link_token: linkToken});
      const tokens = [];
      (result.link_sessions || []).forEach(function(session) {
        const items = session.results && session.results.item_add_results || [];
        items.forEach(function(item) { if (item.public_token) tokens.push(item.public_token); });
        if (!items.length && session.on_success && session.on_success.public_token) tokens.push(session.on_success.public_token);
      });
      const uniqueTokens = [...new Set(tokens)];
      if (uniqueTokens.length !== 1) throw new Error('Expected one completed bank connection; found ' + uniqueTokens.length + '.');
      const exchange = plaidRequest_('/item/public_token/exchange', {public_token: uniqueTokens[0]});
      if (!exchange.access_token || !exchange.item_id) throw new Error('Incomplete token exchange.');
      p.setProperties({PLAID_ACCESS_TOKEN: exchange.access_token, PLAID_ITEM_ID: exchange.item_id});
      accessToken = exchange.access_token;
    }
    const result = plaidRequest_('/accounts/get', {access_token: accessToken});
    if (!result.item) throw new Error('No bank connection returned.');
    const mapping = {};
    ['checking', 'savings'].forEach(function(kind) {
      const matches = (result.accounts || []).filter(function(a) { return a.type === 'depository' && a.subtype === kind; });
      if (matches.length !== 1) throw new Error('Select exactly one personal ' + kind + ' account.');
      mapping[kind] = matches[0].account_id;
    });
    p.setProperty('PLAID_ACCOUNT_MAP', JSON.stringify(mapping));
    p.setProperty('PLAID_CONNECTED_AT', new Date().toISOString());
    p.deleteProperty('PLAID_SETUP_LINK_TOKEN');
    p.deleteProperty('PLAID_SETUP_EXPIRES');
    console.log('SUCCESS: Personal checking and savings connected. Permanent tokens saved privately.');
  } finally { lock.releaseLock(); }
}

// Append to the private Apps Script setup code. No credentials belong in GitHub.
const TISZOD_BOOK_ID = '1uC1tKyX4DnBKXH-4pIz8tm3zAvxdWr6ecrxrwUS9Hts';
const TISZOD_PORTAL_CLIENT = '881518334290-kimg628u5oriddlrqoq6vb619m8gn13s.apps.googleusercontent.com';
const TISZOD_BANK_HEADERS = ['Bank transaction ID','Account type','Date','Description','Amount (inflow positive)','Bank status','Replaces pending ID','Merchant','Currency','Imported at','Removed at'];

function syncPersonalBankNow() {
  const result = syncPersonalBank_('Apps Script administrator');
  console.log(JSON.stringify(result));
}

// A small minute timer starts the bank job at/after 03:30 Eastern once per day.
// Google time triggers can be delayed; the job retries during the 03:30–04:29 window.
function scheduledPersonalBankSync() {
  const p=PropertiesService.getScriptProperties();
  const now=new Date();
  const day=Utilities.formatDate(now,'America/New_York','yyyy-MM-dd');
  const clock=Utilities.formatDate(now,'America/New_York','HHmm');
  if(clock<'0330' || clock>'0429' || p.getProperty('DAILY_SYNC_DATE')===day) return;
  if(Date.now()-Number(p.getProperty('DAILY_SYNC_ATTEMPT_MS')||0)<300000) return;
  p.setProperty('DAILY_SYNC_ATTEMPT_MS',String(Date.now()));
  const result=syncPersonalBank_('Daily 3:30 AM Eastern schedule');
  if(result.ok) p.setProperty('DAILY_SYNC_DATE',day);
}

function installDailySchedule() {
  const existing=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='scheduledPersonalBankSync';});
  if(!existing.length) ScriptApp.newTrigger('scheduledPersonalBankSync').timeBased().everyMinutes(1).create();
  console.log('Daily 3:30 AM America/New_York schedule installed. Timer checks each minute.');
}

function syncPersonalBank_(actor) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('A bank sync is already running. Try again shortly.');
  try {
    const p = PropertiesService.getScriptProperties();
    const last = Number(p.getProperty('LAST_SYNC_FINISHED_MS') || 0);
    if (Date.now() - last < 60000) return JSON.parse(p.getProperty('LAST_SYNC_RESULT') || '{}');
    const token = p.getProperty('PLAID_ACCESS_TOKEN');
    const map = JSON.parse(p.getProperty('PLAID_ACCOUNT_MAP') || '{}');
    if (!token || !map['checking'] || !map['savings']) throw new Error('PersonalBank setup is incomplete.');
    const balances = plaidRequest_('/accounts/balance/get', {access_token: token, options: {account_ids: [map['checking'],map['savings']]}});
    const checked = {};
    ['checking','savings'].forEach(function(mask) {
      const a = balances.accounts.find(function(x) { return x.account_id === map[mask]; });
      if (!a || !a.balances || typeof a.balances.current !== 'number' || a.balances.iso_currency_code !== 'USD') throw new Error('PersonalBank did not supply complete USD balances for ' + mask + '.');
      checked[mask] = a.balances;
    });
    const originalCursor = p.getProperty('PLAID_TRANSACTIONS_CURSOR') || '';
    let batch;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        batch = {added: [], modified: [], removed: [], cursor: originalCursor};
        let more = true, pages = 0;
        while (more) {
          if (++pages > 40) throw new Error('Transaction import is too large for one run.');
          const request = {access_token: token, count: 500};
          if (batch.cursor) request.cursor = batch.cursor;
          const page = plaidRequest_('/transactions/sync', request);
          batch.added.push(...page.added); batch.modified.push(...page.modified); batch.removed.push(...page.removed);
          batch.cursor = page.next_cursor; more = page.has_more;
          batch.updateStatus = page.transactions_update_status || 'unknown';
        }
        break;
      } catch (error) {
        if (attempt === 0 && String(error.message).includes('TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION')) continue;
        throw error;
      }
    }
    const book = SpreadsheetApp.openById(TISZOD_BOOK_ID);
    const bank = bankSheet_(book, 'PersonalBank Bank Feed', TISZOD_BANK_HEADERS);
    const status = bankSheet_(book, 'Bank Sync Status', ['Field','Value']);
    const now = new Date().toISOString();
    const existing = bank.getLastRow() > 1 ? bank.getRange(2,1,bank.getLastRow()-1,TISZOD_BANK_HEADERS.length).getValues() : [];
    const rows = new Map(existing.map(function(row) { return [String(row[0]),row]; }));
    const accountMasks = {}; Object.keys(map).forEach(function(mask) { accountMasks[map[mask]] = mask; });
    batch.added.concat(batch.modified).forEach(function(t) {
      const mask = accountMasks[t.account_id]; if (!mask) return;
      if (!t.transaction_id || !Number.isFinite(t.amount)) throw new Error('Incomplete bank transaction.');
      rows.set(t.transaction_id, [t.transaction_id,mask,t.date,bankText_(t.name),-t.amount,t.pending?'Pending':'Posted',t.pending_transaction_id || '',bankText_(t.merchant_name || ''),t.iso_currency_code || '',now,'']);
    });
    batch.removed.forEach(function(t) { const row = rows.get(t.transaction_id); if (row) { row[5] = 'Removed'; row[10] = now; } });
    const allRows = [...rows.values()].sort(function(a,b) { return String(b[2]).localeCompare(String(a[2])) || String(a[0]).localeCompare(String(b[0])); });
    if (allRows.length) bank.getRange(2,1,allRows.length,TISZOD_BANK_HEADERS.length).setValues(allRows);
    ['checking','savings'].forEach(function(kind) {
      const title=kind==='checking'?'Personal Finance Settings':'Capital One Savings Settings';
      const settings=book.getSheetByName(title);
      if(!settings) throw new Error('Open the '+kind+' page first to initialize its settings.');
      settings.getRange('A2:B3').setValues([['Bank available balance',typeof checked[kind].available==='number'?checked[kind].available:''],['Bank current balance',checked[kind].current]]);
      settings.getRange('A7:B10').setValues([['Last successful bank sync',now],['Bank source','Plaid'],['Bank transaction update status',batch.updateStatus],['Bank sync schedule','3:30 AM America/New_York']]);
    });
    const result = {ok:true,lastSuccess:now,transactions:allRows.filter(function(row) {return row[5]!=='Removed';}).length,transactionUpdateStatus:batch.updateStatus};
    status.getRange(2,1,7,2).setValues([['Last successful sync',now],['Source','PersonalBank via Plaid'],['Transactions',result.transactions],['Transaction update status',batch.updateStatus],['Triggered by',actor],['Bank freshness','Balances retrieved on request; transactions follow Plaid bank updates'],['Ledger handling','Bank feed imported; ledger classifications and cleared flags preserved']]);
    SpreadsheetApp.flush();
    // Commit the cursor only after all sheet writes succeed; retries upsert the same bank IDs.
    p.setProperties({PLAID_TRANSACTIONS_CURSOR:batch.cursor,LAST_SYNC_FINISHED_MS:String(Date.now()),LAST_SYNC_RESULT:JSON.stringify(result)});
    return result;
  } finally { lock.releaseLock(); }
}

function bankSheet_(book, title, headers) {
  let sheet = book.getSheetByName(title);
  if (!sheet) {sheet=book.insertSheet(title);sheet.getRange(1,1,1,headers.length).setValues([headers]);sheet.setFrozenRows(1);}
  const actual = sheet.getRange(1,1,1,headers.length).getValues()[0];
  if (JSON.stringify(actual)!==JSON.stringify(headers)) throw new Error(title+' headers do not match; sync stopped.');
  return sheet;
}
function bankText_(value) {const text=String(value);return /^[=+@-]/.test(text)?"'"+text:text;}

function doPost(e) {
  try {
    if (!e || !e.postData || e.postData.contents.length > 12000) throw new Error('Invalid request.');
    const request = JSON.parse(e.postData.contents);
    if (request.action !== 'sync') throw new Error('Unsupported action.');
    const actor = verifyPortalUser_(request.token);
    return bankJson_(syncPersonalBank_(actor));
  } catch (error) {return bankJson_({ok:false,error:String(error.message).slice(0,180)});}
}
function doGet() {return bankJson_({ok:true,service:'Tiszod bank sync',requiresAuthentication:true});}
function bankJson_(value) {return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function verifyPortalUser_(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 6000) throw new Error('Sign in to the portal first.');
  const check=UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?access_token='+encodeURIComponent(token),{muteHttpExceptions:true});
  const info=JSON.parse(check.getContentText());
  const client=info.issued_to || info.azp || info.aud || info.audience;
  if(check.getResponseCode()!==200 || client!==TISZOD_PORTAL_CLIENT || Number(info.expires_in)<=0) throw new Error('Your portal sign-in has expired.');
  const userResponse=UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{Authorization:'Bearer '+token},muteHttpExceptions:true});
  const user=JSON.parse(userResponse.getContentText());
  const email=String(user.email||'').toLowerCase();
  if(userResponse.getResponseCode()!==200 || user.verified_email!==true || email!==String(Session.getEffectiveUser().getEmail()).toLowerCase()) throw new Error('Bank sync is restricted to the Tiszod project owner.');
  return email;
}

function registerPortalEndpoint() {
  const url=ScriptApp.getService().getUrl();
  if(!url)throw new Error('Deploy the authenticated web app first.');
  const book=SpreadsheetApp.openById(TISZOD_BOOK_ID);
  ['Personal Finance Settings','Capital One Savings Settings'].forEach(function(name){
    const settings=book.getSheetByName(name);if(!settings)throw new Error(name+' missing.');
    settings.getRange('A6:B6').setValues([['Bank sync endpoint',url]]);
  });
  console.log('Tiszod Sync button connected to its own backend.');
}
