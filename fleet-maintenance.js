/* Starter checklists. The model manual controls service intervals and specifications. */
const fleetMaintenancePlans={
 offroad:{name:'ATV and minibike',source:'https://xprousa.com/pages/maintenance-for-atv-p013',items:[
  ['Monthly storage and tire check','Every 1 month','Check cold tire pressure, leaks, fuel condition and battery charge. Before returning to use, inspect brakes, throttle, steering, tires and engine-oil level where applicable. Follow the manual for storage and restart.','tire.*(pressure|inflation)'],
  ['Engine oil service review','Every 12 months','Check the manual and recorded date or reading. Change four-stroke engine oil and filter or screen if specified and due. Follow any earlier break-in, hours or mileage interval.','(engine oil|change oil)'],
  ['Annual off-road safety and drivetrain check','Every 12 months','Inspect air filter, chain or drive belt if fitted, fasteners, controls, brakes and leaks. Follow the exact model schedule for adjustments and replacements.']
 ]},
 electric:{name:'Electric scooter, bike or cart',source:'https://knowledge.ninebot.com/share-detail/1937983833627389952?lang=en',items:[
  ['Monthly tires, brakes and battery check','Every 1 month','Check cold tire pressure if pneumatic, brakes, lights and storage charge. Use the model manual for pressure and storage charging instructions.','tire.*(pressure|inflation)'],
  ['Annual electrical and chassis check','Every 12 months','Inspect charger and port, visible wiring, bearings and fasteners. Check the folding latch if fitted. Follow the model manual for drivetrain or gear lubricant if specified.']
 ]},
 marine:{name:'Powered watercraft',source:'https://www.yamahaboats.com/boating-resources/maintenance-matters/',items:[
  ['Monthly storage and bilge check','Every 1 month','Check battery, fuel condition, leaks, bilge and covers as fitted. Before launch, check safety gear, controls and drain plug. Follow the manual for flushing and winterization.'],
  ['Annual or hour-based marine service review','Every 12 months','Check the model hour and calendar limits. Service four-stroke engine oil and filter, and gearcase lubricant where fitted. Two-stroke systems and jet drives use their own procedures.','(engine oil|change oil)']
 ]},
 road:{name:'Road vehicle',source:'https://www.harley-davidson.com/us/en/content/motorcycle-maintenance/authorized-service.html',items:[
  ['Monthly tires and readiness check','Every 1 month','Check cold tire pressure and condition, lights, leaks, and battery charge during storage. Check brakes and controls before returning to use.','tire.*(pressure|inflation)'],
  ['Annual maintenance and oil service review','Every 12 months','Review the model schedule and any oil-life monitor. Change oil and filter if the engine is equipped and service is due. Follow the earlier mileage, hours, calendar or severe-use interval.','(engine oil|change oil)']
 ]},
 equipment:{name:'Powered equipment',source:'https://powerequipment.honda.com/lawn-mowers/maintenance-and-support',items:[
  ['Monthly storage and condition check','Every 1 month','Inspect guards, cables, battery or fuel storage, leaks and visible wear as fitted. Check the tool before use and follow its storage instructions.'],
  ['Annual equipment maintenance review','Every 12 months','Check the model manual and hour meter. Service oil, air filter and spark plug on applicable engines. For electric or oil-free equipment, follow the manual for its motor, battery and any specified lubrication.','(engine oil|change oil)']
 ]}
};
function fleetMaintenancePlan(a,tasks){
 const category=a.readingCategory||a.category;
 const name=[a.make,a.model,a.name,a.engine].filter(Boolean).join(' ').toLowerCase();
 const electric=/electric|battery.powered|volpam|ninebot|segway|e[- ]?bike|bev\b/.test(name);
 if(/kayak|canoe|paddle|sailboat|dump cart/.test(name)&&!a.engine&&!electric)return null;
 let plan;
 if(['Boats','Personal Watercraft'].includes(category))plan=fleetMaintenancePlans.marine;
 else if(['Yard Equipment','Outdoor Equipment','Shop Equipment','Tractors'].includes(category))plan=fleetMaintenancePlans.equipment;
 else if(category==='Golf Carts'||electric&&['Bicycles','Scooters & Mopeds','Off-Road','ATVs & Quads','Mini Bikes'].includes(category))
  plan=category==='Golf Carts'&&/\b(gas|gasoline|cc)\b|\d+cc/.test(name)?fleetMaintenancePlans.offroad:fleetMaintenancePlans.electric;
 else if(['Off-Road','ATVs & Quads','Mini Bikes','Scooters & Mopeds'].includes(category))plan=fleetMaintenancePlans.offroad;
 else if(['Cars','Trucks','SUVs','Trucks & SUVs','Vans','Classic','Motorcycles'].includes(category))plan=fleetMaintenancePlans.road;
 else if(category==='Unfiled'&&(a.engine||electric))plan=electric?fleetMaintenancePlans.electric:fleetMaintenancePlans.equipment;
 if(!plan)return null;
 const items=plan.items.filter(([title,,,alias])=>!tasks.some(task=>{
  const existing=String(task.task||'').toLowerCase();
  return existing===title.toLowerCase()||alias&&new RegExp(alias,'i').test(existing);
 }));
 const reference=plan===fleetMaintenancePlans.road&&category!=='Motorcycles'?'https://fordprotect.ford.com/premium-maintenance-plan':plan.source;
 return {...plan,source:reference,items};
}
function fleetMaintenancePlanMarkup(plan,esc){
 if(!plan?.items.length)return '';
 return '<section class="maintenance-starter"><h3>'+esc(plan.name)+' starter plan</h3>'+
  '<p>Suggested recurring reminders. Use the owner’s manual to confirm the exact model intervals and procedures.</p>'+
  '<ul>'+plan.items.map(([title,interval,notes])=>'<li><strong>'+esc(title)+'</strong> · '+esc(interval)+'<br>'+esc(notes)+'</li>').join('')+'</ul>'+
  '<p><a href="'+esc(plan.source)+'" target="_blank" rel="noopener noreferrer">Manufacturer maintenance reference</a></p>'+
  '<button type="button" class="schedule-action" id="addMaintenancePlan">Add missing items to schedule</button> <span id="maintenancePlanStatus" role="status"></span></section>';
}
async function saveFleetMaintenancePlan(asset,key,schedules,today){
 const add=async()=>{
  const fresh=(await thFleetServiceData()).schedules[key];
  const plan=fleetMaintenancePlan(asset,fresh?.tasks||[]);
  if(fresh)schedules[key]=fresh;
  else delete schedules[key];
  if(!plan?.items.length)return 0;
  const name=[asset.year,asset.make,asset.model].filter(Boolean).join(' ');
  const tasks=plan.items.map(([task,interval,notes])=>({task,interval,notes,lastDate:'',lastReading:'',nextDate:interval==='Every 1 month'?today:'',nextReading:''}));
  const row=await thAppendRows('Portal Service Schedules',tasks.map(t=>[key,name,t.task,t.interval,'','',t.nextDate,'',t.notes]),'RAW');
  if(!row)throw Error('The plan may have been saved. Reopen the schedule before trying again.');
  (schedules[key]||={sourceName:name,tasks:[]}).tasks.push(...tasks.map((task,index)=>({...task,sheetRow:row+index})));
  return tasks.length;
 };
 return navigator.locks?navigator.locks.request('tiszod-schedule-plan:'+key,add):add();
}
