/* Garage service schedule editing and deadline display. */
function fleetDueTone(days,remaining,readingWindow){
 if((days!==null&&days<0)||(remaining!==null&&remaining<0))return 'late';
 if((days!==null&&days<=30)||(remaining!==null&&remaining<=readingWindow))return 'soon';
 return days!==null||remaining!==null?'ok':'unknown';
}
function fleetDueLabel(tone){
 return {late:'Overdue',soon:'Due soon',ok:'Scheduled later',unknown:'Date or reading needed'}[tone];
}
function createFleetScheduleDateEditor({esc,ownershipDate,ownershipIso,getAsset,scheduleFor,writeChanges,workBusy,renderRecommended,addTask,usesHours}){
 let saving=false,dialog,target,task,unit;
 const definitions=[
  ['C','task','Service item','text'],
  ['D','interval','Frequency','text'],
  ['E','lastDate','Last performed','date'],
  ['F','lastReading','Reading at last service','number'],
  ['G','nextDate','Due date','date'],
  ['H','nextReading','Due reading','number'],
  ['I','notes','Notes','textarea']
 ];
 function noteText(value){
  const text=String(value??'').trim();
  return /^\d+(?:\.\d+)?$/.test(text)?'':text;
 }
 function inputValue(item,key,type){
  const raw=String(item[key]??'');
  if(type==='date'){const date=ownershipDate(raw);return date?ownershipIso(date):''}
  if(type==='number'){const reading=raw.replace(/,/g,'').trim();return /^\d+(?:\.\d+)?$/.test(reading)?reading:''}
  return key==='notes'?noteText(raw):raw;
 }
 function selectedRows(){
  return [...document.querySelectorAll('#assetRecommended [data-select-service]:checked')].map(el=>Number(el.dataset.selectService));
 }
 function updateSelection(){
  const count=selectedRows().length;
  const button=document.getElementById('completeSelected');
  button.disabled=count===0;
  button.textContent=count?'Complete '+count+(count===1?' item':' items'):'Complete selected items';
  document.getElementById('scheduleSelectionCount').textContent=count+' selected';
 }
 function refresh(itemName,deleted){
  if(getAsset()!==target||document.getElementById('assetView').hidden||document.getElementById('assetRecommended').hidden)return;
  const selected=selectedRows();
  renderRecommended(target);
  for(const el of document.querySelectorAll('#assetRecommended [data-select-service]'))el.checked=selected.includes(Number(el.dataset.selectService));
  updateSelection();
  const focus=deleted?document.getElementById('addScheduledTask'):document.querySelector('[data-edit-schedule="'+task.sheetRow+'"]');
  focus?.focus();
  document.getElementById('scheduleDateStatus').textContent=(deleted?'Removed from schedule: ':'Schedule saved for ')+itemName+'.';
 }
 async function save(changes,deleted){
  if(saving||workBusy())return;
  const status=dialog.querySelector('[role="status"]');
  const fields=[...dialog.querySelectorAll('input,textarea,button')];
  const itemName=task.task;
  saving=true;
  fields.forEach(field=>field.disabled=true);
  status.textContent=deleted?'Removing scheduled item…':'Saving schedule…';
  try{
   await writeChanges(task.sheetRow,changes);
   if(deleted){
    const schedule=scheduleFor(target);
    schedule.tasks=schedule.tasks.filter(item=>item!==task);
   }else{
    for(const {key,value} of changes)task[key]=value;
   }
   dialog.close();
   refresh(deleted?itemName:task.task,deleted);
  }catch(error){
   status.textContent=error.message||'Could not save the schedule. Try again.';
  }finally{
   saving=false;
   fields.forEach(field=>field.disabled=false);
  }
 }
 function open(){
  if(!dialog){
   dialog=document.createElement('dialog');dialog.className='work-dialog';
   dialog.setAttribute('aria-labelledby','schedule-edit-title');
   document.body.append(dialog);
   dialog.addEventListener('cancel',event=>{if(saving)event.preventDefault()});
  }
  const fields=definitions.map(([,key,label,type])=>{
   const text=label+(type==='number'?' ('+unit+')':'');
   const value=esc(inputValue(task,key,type));
   return '<label>'+text+(type==='textarea'
    ?'<textarea name="'+key+'" rows="3">'+value+'</textarea>'
    :'<input name="'+key+'" type="'+type+'" value="'+value+'"'+(key==='task'?' required':'')+(type==='number'?' min="0" step="any"':'')+'>')+'</label>';
  }).join('');
  dialog.innerHTML='<form><h2 id="schedule-edit-title">Edit scheduled service</h2><div class="complete-grid">'+fields+'</div>'+
   '<div class="complete-actions"><button type="submit">Save changes</button> <button type="button" data-add>+ Add scheduled item</button> '+
   '<button type="button" data-delete>Delete item</button> <button type="button" data-cancel>Cancel</button></div><p role="status"></p></form>';
  const form=dialog.querySelector('form');
  function changes(){
   return definitions.flatMap(([column,key,,type])=>{
    const value=form.elements[key].value.trim();
    return value===inputValue(task,key,type).trim()?[]:[{column,key,value}];
   });
  }
  form.onsubmit=event=>{
   event.preventDefault();
   if(!form.elements.task.value.trim()){form.elements.task.focus();dialog.querySelector('[role="status"]').textContent='Enter a service item name.';return}
   const edits=changes();
   if(edits.length)save(edits,false);
   else dialog.close();
  };
  dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  dialog.querySelector('[data-add]').onclick=()=>{
   if(changes().length){dialog.querySelector('[role="status"]').textContent='Save or cancel your edits before adding another item.';return}
   dialog.close();addTask();
  };
  dialog.querySelector('[data-delete]').onclick=()=>{
   if(saving||workBusy())return;
   if(confirm('Delete '+task.task+' from the schedule? Past service records will stay in the Service Log.')){
    // Blank the task name so the loader skips the row without shifting other schedule rows.
    save([{column:'C',key:'task',value:''}],true);
   }
  };
  dialog.showModal();
 }
 return {
  selectedRows,updateSelection,
  get saving(){return saving},
  notes(item){
   const notes=noteText(item.notes);
   return notes?'<small style="display:block;white-space:normal">'+esc(notes)+'</small>':'';
  },
  action(item){
   return '<button type="button" class="schedule-action" data-edit-schedule="'+item.sheetRow+'" aria-label="Edit schedule for '+esc(item.task)+'">Edit</button>';
  },
  handle(button){
   if(saving||workBusy())return;
   target=getAsset();
   task=scheduleFor(target)?.tasks.find(item=>item.sheetRow===Number(button.dataset.editSchedule));
   if(!task)return;
   unit=usesHours(target)?'hours':'miles';
   open();
  }
 };
}
