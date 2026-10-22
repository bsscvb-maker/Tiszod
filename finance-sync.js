/* Tiszod's own sync configuration and metadata; never uses BSSC's bank connection. */
(() => {
  const button=document.getElementById('finance-sync'),label=document.getElementById('finance-sync-status');
  let endpoint='',lastSuccess='',busy=false;
  function paint(){
    const date=new Date(lastSuccess),valid=lastSuccess&&!Number.isNaN(date.getTime());
    button.classList.toggle('success',Boolean(valid));label.className='finance-sync-status'+(valid?' success':'');
    label.textContent=valid?'LAST SYNC · '+date.toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',timeZoneName:'short'}):endpoint?'Ready to sync · no successful bank sync recorded':'Bank connection setup needed';
  }
  async function status(){
    if(!thToken)return;
    const result=await finRequest(finSettings('A6:B10')+'?valueRenderOption=UNFORMATTED_VALUE');
    const values=Object.fromEntries(result.values||[]);
    endpoint=String(values['Bank sync endpoint']||'');lastSuccess=String(values['Last successful bank sync']||'');
    if(!busy)paint();
  }
  if(thToken)status().catch(()=>{label.textContent='Bank sync status unavailable';});
  const original=window.thStart;
  window.thStart=async function(){await original();try{await status();}catch(error){label.textContent='Bank sync status unavailable';}};
  button.addEventListener('click',async()=>{
    if(busy)return;
    if(!thToken){label.textContent='Sign in to Tiszod first.';return;}
    try{await status();}catch(error){label.textContent='Could not read the sync connection.';return;}
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)){
      label.textContent='Personal bank connection needs setup. Your saved records are unchanged.';label.classList.add('error');return;
    }
    busy=true;button.disabled=true;button.classList.remove('success');button.textContent='Syncing…';label.className='finance-sync-status';label.textContent='Updating your personal bank balances and activity…';
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action:'sync',token:thToken,account:FIN_SAVINGS?'savings':'checking'}),signal:AbortSignal.timeout(120000)});
      if(!response.ok)throw new Error('Bank sync service could not be reached.');
      const result=await response.json();if(!result.ok||!result.lastSuccess)throw new Error(result.error||'Bank sync did not confirm completion.');
      await original();lastSuccess=result.lastSuccess;paint();finStatus('Bank sync completed.');
    }catch(error){label.className='finance-sync-status error';label.textContent='Sync failed: '+error.message;}
    finally{busy=false;button.disabled=false;button.textContent='Sync';}
  });
  document.getElementById('finance-refresh').addEventListener('click',async()=>{
    try{await original();await status();finStatus('Saved records refreshed.');}catch(error){finStatus(error.message,true);}
  });
})();
