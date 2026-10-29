(()=>{'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dialog=document.createElement('dialog');dialog.id='fuelCapture';dialog.setAttribute('aria-labelledby','fuelCaptureTitle');
 dialog.innerHTML=`<form id="fuelCaptureForm"><header><div><small>VEHICLES / LOG FUEL</small><h2 id="fuelCaptureTitle">Fuel log</h2></div><button type="button" id="fuelClose" aria-label="Close fuel entry">✕</button></header>
 <div class="fuel-body"><section class="fuel-vehicle"><label>Active vehicle<select name="vehicle" required></select></label><p id="fuelCurrent" class="fuel-muted"></p></section><div class="fuel-workspace"><section class="fuel-evidence"><div class="fuel-section-title"><span>01</span><div><h3>Photos</h3><p class="fuel-muted">Upload a receipt and mileage photo to read the details.</p></div></div>
 <div class="fuel-photos"><section><h3>Fuel receipt</h3><label class="fuel-photo-pick">＋ Add receipt photo<input id="fuelReceiptFile" type="file" accept="image/jpeg,image/png,image/webp"></label><button type="button" data-camera="fuelReceiptFile">Take photo</button><img id="fuelReceiptPreview" hidden alt="Receipt preview"><p id="fuelReceiptStatus" class="fuel-muted"></p></section>
 <section><h3>Odometer</h3><label class="fuel-photo-pick">＋ Add mileage photo<input id="fuelOdoFile" type="file" accept="image/jpeg,image/png,image/webp"></label><button type="button" data-camera="fuelOdoFile">Take photo</button><img id="fuelOdoPreview" hidden alt="Odometer preview"><p id="fuelOdoStatus" class="fuel-muted"></p></section></div>
 <p class="fuel-review-note">Review the numbers before saving. You can also enter them yourself if a photo is hard to read.</p>
 </section><section class="fuel-details"><div class="fuel-section-title"><span>02</span><div><h3>Fill-up details</h3><p class="fuel-muted">Check the numbers, then save your fill-up.</p></div></div><div class="fuel-fields">
 <label>Date<input type="date" name="date" required></label><label>Odometer (miles)<input type="number" name="odo" step=".1" min="0" inputmode="decimal" required></label>
 <label>Gallons<input type="number" name="gallons" step=".001" min=".001" inputmode="decimal" required></label><label>Price per gallon ($)<input type="number" name="price" step=".001" min=".001" inputmode="decimal" required></label>
 <label>Total paid ($)<input type="number" name="total" step=".01" min=".01" inputmode="decimal" required></label><label>Full tank?<select name="full"><option value="unknown">Choose / not sure</option><option value="yes">Yes — filled the tank</option><option value="no">No — partial fill</option></select></label>
 <label>Station<input name="station" required autocomplete="off"></label><label>Location<input name="location" autocomplete="off"></label>
 <label>Payment account<input name="account" list="fuelAccounts" required placeholder="Choose or enter account"><datalist id="fuelAccounts"></datalist></label>
 <label>Payment method<select name="method"><option>Debit</option><option>Credit card</option><option>Cash</option><option>Digital</option></select></label>
 <label>Receipt number<input name="receipt"></label><label>Notes<input name="notes"></label></div>
 <section class="fuel-match"><h3>Finance transaction</h3><p class="fuel-muted" id="fuelMatchHint">Checking for a matching transaction…</p><select id="fuelTransactionMatch" aria-label="Finance transaction to link"></select></section>
 <label class="fuel-confirm"><input type="checkbox" name="reviewed" required> I checked the vehicle, date, mileage, fuel amount, and payment account.</label>
 <p class="fuel-muted">One save updates mileage, fuel history, and Finance. New expenses stay Pending in Reconciliation until they clear.</p>
 <p id="fuelSaveStatus" role="status" aria-live="polite"></p></section></div></div><footer><button type="button" id="fuelCancel">Cancel</button><button type="submit" id="fuelSave">Save fill-up</button></footer></form>`;
 document.body.append(dialog);
 const form=dialog.querySelector('form'),$=id=>document.getElementById(id),field=n=>form.elements[n];
 let vehicles=[],onSaved=null,currentEntry=null,tx=[],busy=false,reading=0,files={},links={},previews={},ocrLoader,readGeneration={receipt:0,odo:0},financeLoaded=false;
 const localDate=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
 function vehicle(){return vehicles.find(v=>v.key===field('vehicle').value);}
 function values(){const v=vehicle();return {...currentEntry,vehicle:v?.key,name:v?.name,date:field('date').value,odo:Number(field('odo').value),gallons:Number(field('gallons').value),price:Number(field('price').value),total:Number(field('total').value),full:field('full').value,station:field('station').value.trim(),location:field('location').value.trim(),account:field('account').value.trim(),method:field('method').value,receipt:field('receipt').value.trim(),notes:field('notes').value.trim()};}
 function refreshMatch(){
  const e=values(),selected=$('fuelTransactionMatch').value,matches=FuelCore.candidates(e,tx),prior=tx.find(x=>x.r[0]===currentEntry?.transactionId);
  if(prior&&!matches.some(x=>x.row===prior.row))matches.push(prior);
  $('fuelTransactionMatch').innerHTML=(matches.length?'':'<option value="">Add a new pending expense</option>')+matches.map(x=>'<option value="'+x.row+'">Link '+esc(x.r[1])+' · '+esc(x.r[3])+' · $'+Number(x.r[8]).toFixed(2)+' · '+esc(x.r[9])+'</option>').join('');
  if(matches.some(x=>String(x.row)===selected))$('fuelTransactionMatch').value=selected;
  if(prior)$('fuelTransactionMatch').value=prior.row;
  $('fuelMatchHint').textContent=matches.length?'Matching transaction found. Review the selection below; its bank posting status will be kept.':'No matching expense found. This will create one Pending transaction.';
 }
 function selectVehicle(){const v=vehicle();$('fuelCurrent').textContent=v?'Current mileage: '+(v.current==null?'not recorded':Number(v.current).toLocaleString()+' mi')+'. Older receipts will not lower it.':'';field('reviewed').checked=false;refreshMatch();}
 async function open(options={}){
  if(busy||dialog.open)return;
  vehicles=options.vehicles||vehicles;onSaved=options.onSaved||onSaved;
  if(!vehicles.length)return alert('No active vehicles are available for fuel logging. Mark a vehicle Active in Vehicles first.');
  if(options.entry&&!vehicles.some(v=>v.key===options.entry.vehicle))return alert('Fuel entries can only be edited for an active vehicle.');
  delete dialog.dataset.uncertain;form.reset();tx=[];financeLoaded=false;files={};links={};readGeneration.receipt++;readGeneration.odo++;
  for(const url of Object.values(previews))URL.revokeObjectURL(url);previews={};
  currentEntry=options.entry?{...options.entry,editing:true}:{id:'fuel-'+FuelCore.uuid()};
  for(const kind of ['Receipt','Odo']){$('fuel'+kind+'Preview').hidden=true;$('fuel'+kind+'Status').textContent='';}
  $('fuelSaveStatus').textContent='';$('fuelSave').disabled=true;
  field('vehicle').innerHTML=vehicles.map(v=>'<option value="'+esc(v.key)+'">'+esc(v.name)+'</option>').join('');
  const chosen=options.selected||currentEntry.vehicle||vehicles[0]?.key;if(vehicles.some(v=>v.key===chosen))field('vehicle').value=chosen;
  field('vehicle').disabled=!!options.entry;
  field('date').value=localDate();
  let rememberedAccount;try{rememberedAccount=localStorage.getItem('tiszod-last-fuel-account');}catch{}if(rememberedAccount)field('account').value=rememberedAccount;
  if(options.entry){for(const key of ['date','odo','gallons','price','total','full','station','location','notes','receipt'])field(key).value=currentEntry[key]??'';links.receipt=currentEntry.receiptPhoto||'';links.odo=currentEntry.odoPhoto||'';}
  dialog.showModal();selectVehicle();
  try{tx=await TisFuelStore.transactions();financeLoaded=true;$('fuelAccounts').innerHTML=[...new Set(tx.map(x=>x.r[2]).filter(Boolean))].map(a=>'<option value="'+esc(a)+'"></option>').join('');
   const prior=tx.find(x=>x.r[0]===currentEntry.transactionId);if(prior){field('account').value=prior.r[2]||'';field('method').value=prior.r[11]||'Debit';}
   refreshMatch();$('fuelSave').disabled=false;
  }catch(error){$('fuelSaveStatus').textContent='Could not load Finance. '+error.message;}
 }
 function close(){if(busy||reading)return;dialog.close();}
 $('fuelClose').onclick=close;$('fuelCancel').onclick=close;
 dialog.addEventListener('cancel',e=>{if(busy||reading)e.preventDefault();});
 field('vehicle').onchange=selectVehicle;
 form.addEventListener('input',e=>{if(e.target.name!=='reviewed'){field('reviewed').checked=false;refreshMatch();}});
 form.addEventListener('change',e=>{if(e.target.name&&e.target.name!=='reviewed')field('reviewed').checked=false;});
 dialog.querySelectorAll('[data-camera]').forEach(button=>button.onclick=()=>{const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.setAttribute('capture','environment');input.onchange=()=>{const file=input.files[0];if(file)acceptPhoto(button.dataset.camera==='fuelReceiptFile'?'receipt':'odo',file);};input.click();});
 $('fuelReceiptFile').onchange=e=>{if(e.target.files[0])acceptPhoto('receipt',e.target.files[0]);};$('fuelOdoFile').onchange=e=>{if(e.target.files[0])acceptPhoto('odo',e.target.files[0]);};
 let ocrTail=Promise.resolve();
 async function ocrImage(file){const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1800/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return canvas;}finally{URL.revokeObjectURL(url);}}
 function loadOCR(){if(window.Tesseract)return Promise.resolve();return ocrLoader||=(new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';s.onload=resolve;s.onerror=()=>{ocrLoader=null;reject(Error('Photo reading could not load. Enter the numbers below.'));};document.head.append(s);}));}
 async function acceptPhoto(kind,file){
  const prefix=kind==='receipt'?'Receipt':'Odo',message=$('fuel'+prefix+'Status'),generation=++readGeneration[kind];
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>15*1024*1024){message.textContent='Choose a JPG, PNG, or WebP photo under 15 MB.';return;}
  files[kind]=file;delete links[kind];if(previews[kind])URL.revokeObjectURL(previews[kind]);previews[kind]=URL.createObjectURL(file);$('fuel'+prefix+'Preview').src=previews[kind];$('fuel'+prefix+'Preview').hidden=false;
  reading++;$('fuelSave').disabled=true;field('reviewed').checked=false;message.textContent='Reading photo…';let worker,release;const previous=ocrTail;ocrTail=new Promise(resolve=>release=resolve);
  // Never overwrite values the user typed while OCR was working.
  const before=Object.fromEntries(['date','odo','gallons','price','total','station','location','receipt'].map(k=>[k,field(k).value]));
  try{await previous;if(readGeneration[kind]!==generation)return;await loadOCR();worker=await Tesseract.createWorker('eng',1,{logger:m=>{if(readGeneration[kind]===generation&&m.status==='recognizing text')message.textContent='Reading photo… '+Math.round(m.progress*100)+'%';}});
   if(kind==='odo')await worker.setParameters({tessedit_char_whitelist:'0123456789., ',tessedit_pageseg_mode:'11'});
   const {data}=await worker.recognize(await ocrImage(file));if(readGeneration[kind]!==generation)return;
   const parsed=kind==='receipt'?FuelCore.parseReceipt(data.text):{};let odos=kind==='odo'?FuelCore.parseOdometer(data.text):[];const current=Number(vehicle()?.current);if(odos.length>1&&current>0){const near=odos.filter(n=>n>=current-10000&&n<=current+10000);if(near.length===1)odos=near;}
   if(odos.length===1)parsed.odo=odos[0];
   for(const [key,value] of Object.entries(parsed))if(field(key)&&field(key).value===before[key])field(key).value=value;
   if(parsed.card&&!field('account').value)field('account').value='Debit ••••'+parsed.card;
   message.textContent=kind==='odo'?(odos.length===1?'Mileage detected. Check it against the photo.':'Mileage could not be read confidently. Enter the display reading below.'):(Object.keys(parsed).length?'Details detected. Check each value against the receipt.':'Enter the receipt details below. The photo will still be attached.');refreshMatch();
  }catch(error){if(readGeneration[kind]===generation)message.textContent='Enter the numbers below. '+error.message;}
  finally{if(worker)await worker.terminate().catch(()=>{});release();reading--;$('fuelSave').disabled=busy||reading>0||!financeLoaded;}
 }
 form.onsubmit=async event=>{
  event.preventDefault();if(busy||reading||!form.reportValidity())return;
  const entry=values(),v=vehicle(),message=$('fuelSaveStatus');
  try{FuelCore.validate(entry);}catch(error){message.textContent=error.message;return;}
  busy=true;for(const input of form.querySelectorAll('input,select,button'))input.disabled=true;message.textContent='Saving photos…';
  try{
   for(const kind of ['receipt','odo'])if(files[kind]&&!links[kind])links[kind]=await TisFuelStore.upload(files[kind],v.name+' '+kind,entry.id);
   entry.receiptPhoto=links.receipt||'';entry.odoPhoto=links.odo||'';
   message.textContent='Saving mileage, fuel history, and Finance together…';
   const result=await TisFuelStore.save(entry,v,$('fuelTransactionMatch').value);
   try{localStorage.setItem('tiszod-last-fuel-vehicle',v.key);localStorage.setItem('tiszod-last-fuel-account',entry.account);}catch{}
   message.textContent='Saved. Mileage, fuel history, and Finance are updated.';
   document.dispatchEvent(new CustomEvent('tiszod-fuel-saved',{detail:result.entry}));
   await onSaved?.(result.entry);dialog.close();
   const toast=document.createElement('p');toast.className='fuel-toast';toast.setAttribute('role','status');toast.textContent='✓ Fuel saved · Mileage, fuel history & Finance updated';document.body.append(toast);setTimeout(()=>toast.remove(),6500);
  }catch(error){message.textContent=error.message;if(error.uncertain)dialog.dataset.uncertain='true';}
  finally{busy=false;for(const input of form.querySelectorAll('input,select,button'))input.disabled=false;field('vehicle').disabled=!!currentEntry.editing;$('fuelSave').disabled=dialog.dataset.uncertain==='true';}
 };
 window.TisFuel={open,escape:esc};
})();

