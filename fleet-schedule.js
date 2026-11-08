/* A due-date edit writes only the schedule date. */
function createFleetScheduleDateEditor({esc,ownershipDate,ownershipIso,getAsset,scheduleFor,writeDate,workBusy,renderRecommended}){
 let saving=false;
 return {
  get saving(){return saving},
  field(task){
   const date=ownershipDate(task.nextDate);
   return '<input type="date" required aria-label="Due date for '+esc(task.task)+'" value="'+(date?ownershipIso(date):'')+'"> '+
    '<button type="button" class="schedule-action" data-save-due-date="'+task.sheetRow+'" aria-label="Save due date for '+esc(task.task)+'">Save date</button>';
  },
  async save(button){
   if(saving||workBusy())return;
   const asset=getAsset(),row=Number(button.dataset.saveDueDate);
   const task=scheduleFor(asset)?.tasks.find(item=>item.sheetRow===row);
   const input=button.parentElement.querySelector('input[type="date"]');
   if(!task||!input.reportValidity())return;
   const date=input.value;
   const status=document.getElementById('scheduleDateStatus');
   saving=true;
   input.disabled=button.disabled=true;
   status.textContent='Saving due date…';
   try{
    await writeDate(row,date);
    task.nextDate=date;
    if(getAsset()===asset&&!document.getElementById('assetView').hidden&&
      !document.getElementById('assetRecommended').hidden){
     const selected=[...document.querySelectorAll('#assetRecommended [data-select-service]:checked')].map(el=>el.dataset.selectService);
     renderRecommended(asset);
     for(const el of document.querySelectorAll('#assetRecommended [data-select-service]')){
      el.checked=selected.includes(el.dataset.selectService);
     }
     document.querySelector('[data-save-due-date="'+row+'"]')?.focus();
     document.getElementById('scheduleDateStatus').textContent='Due date saved for '+task.task+'.';
    }
   }catch(error){
    status.textContent=error.message||'Could not save the due date. Try again.';
   }finally{
    saving=false;
    input.disabled=button.disabled=false;
   }
  }
 };
}
