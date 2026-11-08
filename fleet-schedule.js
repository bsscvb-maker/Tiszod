/* Schedule edits affect due dates and readings, independently of service completion. */
function createFleetScheduleDateEditor({esc,ownershipDate,ownershipIso,getAsset,scheduleFor,writeChanges,workBusy,renderRecommended}){
 let saving=false,activeRow=null;
 function setEditing(row,editing){
  activeRow=editing?row:null;
  row.querySelector('[data-schedule-fields]').hidden=!editing;
  row.querySelector('[data-schedule-date]').hidden=editing;
  row.querySelector('[data-edit-schedule]').hidden=editing;
  row.querySelector('[data-save-schedule]').hidden=!editing;
  row.querySelector('[data-cancel-schedule]').hidden=!editing;
  if(editing)row.querySelector('input[type="date"]').focus();
  else row.querySelector('[data-edit-schedule]').focus();
 }
 return {
  get saving(){return saving},
  notes(task){
   const notes=String(task.notes??'').trim();
   return notes&&!/^\d+(?:\.\d+)?$/.test(notes)
    ?'<small style="display:block;white-space:normal">'+esc(notes)+'</small>':'';
  },
  field(task){
   const date=ownershipDate(task.nextDate);
   const raw=String(task.nextReading??'').replace(/,/g,'').trim();
   const reading=/^\d+(?:\.\d+)?$/.test(raw)?raw:'';
   return '<span data-schedule-date>'+esc(task.nextDate||'No date listed')+'</span>'+
    '<div data-schedule-fields hidden>'+
    '<label>Due date <input type="date" aria-label="Due date for '+esc(task.task)+'" value="'+(date?ownershipIso(date):'')+'"></label> '+
    '<label>Due reading <input type="number" min="0" step="any" inputmode="decimal" aria-label="Due reading for '+esc(task.task)+'" value="'+esc(reading)+'"></label></div>';
  },
  action(task){
   return '<button type="button" class="schedule-action" data-edit-schedule="'+task.sheetRow+'" aria-label="Edit schedule for '+esc(task.task)+'">Edit</button> '+
    '<button type="button" class="schedule-action" data-save-schedule="'+task.sheetRow+'" hidden>Save</button> '+
    '<button type="button" class="schedule-action" data-cancel-schedule hidden>Cancel</button>';
  },
  async handle(button){
   if(saving||workBusy())return;
   const row=button.closest('tr');
   const date=row.querySelector('input[type="date"]'),reading=row.querySelector('input[type="number"]');
   if(button.hasAttribute('data-edit-schedule')){
    if(activeRow?.isConnected&&activeRow!==row){
     document.getElementById('scheduleDateStatus').textContent='Save or cancel the current edit first.';
     activeRow.querySelector('input[type="date"]').focus();
    }else setEditing(row,true);
    return;
   }
   if(button.hasAttribute('data-cancel-schedule')){
    date.value=date.defaultValue;reading.value=reading.defaultValue;
    setEditing(row,false);return;
   }
   const asset=getAsset(),sheetRow=Number(button.dataset.saveSchedule);
   const task=scheduleFor(asset)?.tasks.find(item=>item.sheetRow===sheetRow);
   if(!task||!date.reportValidity()||!reading.reportValidity())return;
   const changes=[];
   if(date.value!==date.defaultValue)changes.push({column:'G',key:'nextDate',value:date.value});
   if(reading.value!==reading.defaultValue)changes.push({column:'H',key:'nextReading',value:reading.value});
   if(!changes.length){setEditing(row,false);return}
   const status=document.getElementById('scheduleDateStatus');
   const cancel=row.querySelector('[data-cancel-schedule]');
   saving=true;
   date.disabled=reading.disabled=button.disabled=cancel.disabled=true;
   status.textContent='Saving schedule…';
   try{
    await writeChanges(sheetRow,changes);
    for(const {key,value} of changes)task[key]=value;
    if(getAsset()===asset&&!document.getElementById('assetView').hidden&&
      !document.getElementById('assetRecommended').hidden){
     const selected=[...document.querySelectorAll('#assetRecommended [data-select-service]:checked')].map(el=>el.dataset.selectService);
     renderRecommended(asset);
     for(const el of document.querySelectorAll('#assetRecommended [data-select-service]')){
      el.checked=selected.includes(el.dataset.selectService);
     }
     document.querySelector('[data-edit-schedule="'+sheetRow+'"]')?.focus();
     document.getElementById('scheduleDateStatus').textContent='Schedule saved for '+task.task+'.';
    }
   }catch(error){
    status.textContent=error.message||'Could not save the schedule. Try again.';
   }finally{
    saving=false;
    date.disabled=reading.disabled=button.disabled=cancel.disabled=false;
   }
  }
 };
}
