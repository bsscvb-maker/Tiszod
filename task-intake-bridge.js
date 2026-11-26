'use strict';
{
 const book='1sZgS4EeY-pj_A-OVuAjShuKcOG5MMyCzQm1MmrlfLko';
 const tab="'TisZod Task Intake'!";
 async function request(path,options={}) {
  if (!thToken) throw Error('Sign in to reconnect task intake.');
  const response=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+book+path,{
   ...options,headers:{Authorization:'Bearer '+thToken,'Content-Type':'application/json'}
  });
  const result=await response.json();
  if(!response.ok) throw Error(result.error?.message||'Task intake is unavailable.');
  return result;
 }
 async function read() {
  return (await request('/values/'+encodeURIComponent(tab+'A2:L'))).values||[];
 }
 window.taskIntake={
  read,
  ready: thAuthorized,
  async preview(id) {
   if(!id)return null;
   const rows=(await request('/values/'+encodeURIComponent("'Email Previews'!A2:C1000"))).values||[];
   const row=rows.find(row=>row[0]===id);
   if(!row?.[1])return null;
   try{return JSON.parse(row[1]);}catch{throw Error('This saved email preview could not be read.');}
  },
  async update(id,{status,due,priority,category}) {
   if(!['Needs review','Open','Done','Dismissed'].includes(status))throw Error('Choose a valid status.');
   if(due!==undefined&&due!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(due))throw Error('Choose a valid date.');
   if(priority!==undefined&&!['High','Medium','Low'].includes(priority))throw Error('Choose a priority.');
   if(category!==undefined&&(typeof category!=='string'||category.length>200))throw Error('Choose a valid category.');
   const rows=await read(),index=rows.findIndex(row=>row[0]===id);
   if(index<0)throw Error('Task is no longer available. Refresh and try again.');
   const row=index+2,data=[{range:tab+'G'+row,values:[[status]]}];
   if(due!==undefined)data.push({range:tab+'E'+row,values:[[due]]});
   if(priority!==undefined)data.push({range:tab+'I'+row,values:[[priority]]});
   if(category!==undefined)data.push({range:tab+'L'+row,values:[[category]]});
   await request('/values:batchUpdate',{method:'POST',body:JSON.stringify({valueInputOption:'RAW',data})});
  }
 };
 if (thAuthorized()) window.dispatchEvent(new Event('tiszod-task-intake-ready'));
}
