'use strict';
{
 const portal=document.currentScript.dataset.portal;
 const endpoint='https://script.google.com/macros/s/AKfycbxDmQ4OoIlIqu6QwDzxOkWaPmUAv0WnEzGHJZv5TUxJA8snSDkd_YUZiH1FobycL6V_jQ/exec';
 let running;
 function sessionToken(){
  const key=portal==='bssc'?'bssc-google-session-edit-v2':'thbudget-session-photos-v1';
  let session;
  try{session=JSON.parse(window.parent.localStorage.getItem(key)||'null');}catch{}
  if(!session||session.expiresAt<=Date.now()||(portal==='bssc'&&Date.now()-session.lastActivity>=3600000))throw Error('Sign in to the portal to check email.');
  const token=portal==='bssc'?session.accessToken:session.token;
  if(!token)throw Error('Sign in to the portal to check email.');
  return token;
 }
 async function post(action){
  const response=await fetch(endpoint,{method:'POST',credentials:'omit',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action,portal,token:sessionToken()}),signal:AbortSignal.timeout(25000),cache:'no-store'});
  let result;try{result=await response.json();}catch{throw Error('The email check service did not respond. Saved tasks are still available.');}
  if(!response.ok||!result.ok)throw Error(result.error||'The email check could not start.');
  return result;
 }
 async function check(report){
  let state=await post('requestScan');
  const requestedAt=state.requestedAt;
  const started=Date.now();
  for(;;){
   const blocked=state.accounts.filter(a=>a.error);
   if(blocked.length)throw Error((blocked.every(a=>/authorization/i.test(a.error))?'Email checking needs Google authorization for ':'Email checking could not finish for ')+blocked.map(a=>a.label).join(', ')+'. Saved tasks have been refreshed.');
   const finished=state.accounts.filter(a=>a.complete&&a.request>=requestedAt&&a.checkedAt>=requestedAt);
   if(finished.length===state.accounts.length&&state.accounts.length)return {complete:true,message:'Email check complete. Tasks are up to date.'};
   report('Checking email… '+finished.length+' of '+state.accounts.length+' mailboxes finished.');
   if(Date.now()-started>=150000)return {complete:false,message:'Email check is still running. New tasks will appear automatically.'};
   await new Promise(resolve=>setTimeout(resolve,3000));
   state=await post('scanStatus');
  }
 }
 window.requestTaskEmailCheck=function(report=()=>{}){
  if(!running)running=check(report).finally(()=>{running=null;});
  return running;
 };
}
