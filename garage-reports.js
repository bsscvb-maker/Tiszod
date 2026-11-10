(() => {
  if (document.documentElement.classList.contains('garage-reports-view')) {
    document.querySelector('.th-app-topbar strong').textContent = 'Garage Reports';
    document.querySelector('.th-app-topbar small').textContent = 'Inventory, maintenance, and fuel reports';
  }
  const section = document.querySelector('#garage-reports');
  if (!document.documentElement.classList.contains('garage-reports-view')) { window.thStart = () => {}; return; }
  const form = section.querySelector('form');
  const status = section.querySelector('[role="status"]');
  const preview = section.querySelector('.report-preview');
  const table = preview.querySelector('table');
  const exportMenu = section.querySelector('.report-export');
  const summary = preview.querySelector('.report-summary');
  const recallTools = preview.querySelector('.report-recall-tools');
  const workList = preview.querySelector('.report-work-list');
  const run = form.querySelector('[type="submit"]');
  const download = section.querySelector('[data-download]');
  const print = section.querySelector('[data-print]');
  const gate = document.querySelector('#th-auth');
  const connect = section.querySelector('[data-connect]');
  const filters = form.elements;
  let result;
  let generation = 0;
  let expiredTimer;

  const clean = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const title = item => [item.year, item.make, item.model].filter(Boolean).join(' ') || item.name;
  const dateKey = value => {
    const text = String(value ?? '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return '';
    const [, month, day, year] = match;
    const date = new Date(Date.UTC(+year, +month - 1, +day));
    return date.getUTCMonth() === +month - 1 && date.getUTCDate() === +day
      ? date.toISOString().slice(0, 10) : '';
  };
  const today = () => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return [fields.year, fields.month, fields.day].join('-');
  };

  function collection(item) {
    const category = item.category || '';
    const name = clean(title(item));
    if (/trailer|camper|^rvs?$/i.test(category) || /trailer|keystonebullet|yamahaezloader/.test(name)) return 'Trailers';
    if (/boat|watercraft/i.test(category) || /waverunner|jetski|seadoo|sailboat/.test(name)) return 'Watercraft';
    if (/equipment|tractor|small engine/i.test(category)) return 'Equipment';
    if (/makdaddylegend/.test(name)) return 'Vehicles';
    if (/off.road|atv|quad|moped|scooter|mini bike|bicycle|golf cart/i.test(category) || /jaguar200|colemanb200|trek7200/.test(name)) return 'Off-Road';
    return 'Vehicles';
  }

  function inventory(data) {
    const items = [];
    const identity = item => clean(title(item)).replace(/harleydavidson/, 'harley');
    const matches = (left, right) => {
      if (left.vin && right.vin) return clean(left.vin) === clean(right.vin);
      if (identity(left) === identity(right)) return true;
      const names = [left, right].map(item => clean(item.make + ' ' + item.model));
      if (names.every(name => /^(westbrook|stirling)/.test(name))) return true;
      if (names.every(name => /^ram3500/.test(name))) return true;
      const a = clean(left.model);
      const b = clean(right.model);
      const make = clean(left.make);
      return make === clean(right.make) && String(left.year) === String(right.year)
        && a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a));
    };
    for (const item of [...data.profiles].reverse().concat(data.registry, data.activeFleet, data.inactiveFleet)) {
      if (!title(item)) continue;
      const previous = items.find(existing => matches(existing, item));
      if (previous) {
        for (const field of ['category', 'vin', 'tag', 'status']) previous[field] ||= item[field];
      } else items.push({...item});
    }
    return items.filter(item => clean(item.status) !== 'deleted');
  }

  const serviceKeys={'keystone':'331','ram3500':'3500','toyota4runner':'4Runner','chrysleraspen':'Aspen','hondacivic':'Civic','fordmustang':'Mustang','fordf150':'F150','harleydavidsonultra':'FLHTCUI','harleydavidsonroad':'FLTRK','makdaddy':'Legend','stirling':'Stirling','westbrook':'Stirling','trek':'trek','colemanb200':'B200','volpam':'SP03','coolster':'3050C','xpro':'Xpro'};
  function serviceAssetKey(a){const name=clean(a.make+' '+a.model),legacy=Object.entries(serviceKeys).find(([prefix])=>name.startsWith(prefix))?.[1];return legacy||(a.reportId&&String(a.reportId).startsWith('PDF-')?'report-'+String(a.reportId).slice(4):'')||(a.profileRow?'profile-'+a.profileRow:'item-'+clean(a.year+' '+a.make+' '+a.model))}
  const scheduleKeys=[[/trek.*7200/, 'trek7200'],[/harley.*(ultra|flhtcui)/,'harleydavidsonultra'],[/lifetime.*spitfire/,'lifetimespitfire'],[/keystone.*bullet/,'keystonebullet'],[/stirling|westbrook.*trailer/,'stirling'],[/makdaddy.*legend/,'makdaddylegend'],[/harley.*(roadglide|fltrk)/,'harleydavidsonroad'],[/ram.*3500/,'ram3500'],[/coleman.*(b200|8200)/,'colemanb200'],[/volpam.*sp03/,'volpamsp03'],[/coolster.*3050/,'coolster3050'],[/ford.*f150/,'fordf150'],[/xpro.*jaguar/,'xprojaguar'],[/ford.*mustang/,'fordmustang'],[/toyota.*4runner/,'toyota4runner'],[/chrysler.*aspen/,'chrysleraspen'],[/honda.*civic/,'hondacivic'],[/husqvarna.*122hd4[5s]/,'husqvarna122hd4s'],[/echo.*pb2520/,'echopb2520'],[/dewalt.*aircompressor/,'dewaltaircompressor'],[/dewalt.*dxpw3425|dewalt.*pressurewasher/,'dewaltdxpw3425'],[/craftsman.*18.*chainsaw/,'craftsman18inchchainsaw'],[/craftsman.*10.*polesaw/,'craftsman10polesaw'],[/husqvarna.*yth24k48/,'husqvarnayth24k48'],[/cubcadet.*kohler/,'cubcadetkohler'],[/husqvarna.*330lx|husqvarna.*weedeater/,'husqvarna330lx'],[/stihl.*fs56/,'stihlfs56']];
  function scheduleKeyFor(a){const name=clean([a.make,a.model,a.name].filter(Boolean).join(' '));const entry=scheduleKeys.find(([pattern])=>pattern.test(name));return entry?entry[1]:serviceAssetKey(a)}

  const complianceEvidence={
   '1FAFP40604F200855':{inspectionDue:'2027-04-30',inspectionLast:'2026-04-27',inspectionSource:'Inspection certificate dated April 27, 2026'},
   '3C63RRRL1KG580434':{inspectionDue:'2027-03-31',inspectionLast:'2026-03-11',inspectionSource:'Inspection certificate dated March 11, 2026'},
   '4YDT33126LT434476':{registrationMode:'permanent',registrationSource:'Permanent trailer registration',inspectionDue:'2027-03-31',inspectionLast:'2026-03-11',inspectionSource:'Inspection certificate dated March 11, 2026'},
   '2SSUBE1A1MB148250':{registrationMode:'permanent',registrationSource:'Permanent trailer registration'},
   '1HD1KZF15PB653889':{registrationDue:'2026-09-30',registrationSource:'Registration expiration printed on August 12, 2024 document; confirm any later renewal',inspectionDue:'2027-09-30',inspectionLast:'2026-09-17',inspectionSource:'Inspection certificate dated September 17, 2026'},
   '1A8HX58N88F122005':{inspectionDue:'2027-08-31',inspectionLast:'2026-08-11',inspectionSource:'Inspection certificate dated August 11, 2026'},
   '2HGFG3B83CH543158':{registrationDue:'2026-11-30',registrationLast:'2025-11-26',registrationSource:'Title / registration dated November 26, 2025'}
  };

  function complianceKind(label){
   const name=String(label||'').trim();
   if(/^(?:(?:renew|vehicle) )?registration(?: renewal)?$/i.test(name))return 'registration';
   if(/^(?:(?:annual|state|safety|vehicle) )+(?:safety )?inspection(?: passed)?$/i.test(name))return 'inspection';
   return '';
  }

  function usesHours(a){const name=clean(a.make+' '+a.model);if(/coolster3050/.test(name))return true;if(/colemanb200|xprojaguar200/.test(name))return false;return ['Boats','Personal Watercraft','Tractors','Yard Equipment','Outdoor Equipment','Shop Equipment','ATVs & Quads','Mini Bikes'].includes(a.readingCategory||a.category)||/pressurewasher|aircompressor|chainsaw|brushcutter|weedeater|trimmer|mower|leafblower|generator|jetski|waverunner/.test(name)}
  function readingName(a){return usesHours(a)?'Hours':'Mileage'}
  // Preserve documented historical readings separately from a current tracking value.
  function readingEvidence(a,m){
   if(cardNumber(m?.currentMileage)!==null)return {value:m.currentMileage,kind:'tracked'};
   const saved=specRecord(a),record=saved.sourceCsv?.record;
   if(record&&cardNumber(record.ODOMETERREADING)!==null)return {value:record.ODOMETERREADING,kind:'historical'};
   // Venture: transfer paperwork 2008-04-04, Drive 1xD1DVTrgWPmD7pn5V40-tdKaAcTTIrJw.
   // Elantra: Virginia title 2005-07-15, Drive 1a-OuDGiphiFWlDwPRVWtiJ_bt836uT99.
   const titleReadings={'1GNDX03E0YD210436':136993,'KMHJF24MXWU733164':37199};
   if(Object.hasOwn(titleReadings,String(a.vin||'').toUpperCase()))return {value:titleReadings[String(a.vin).toUpperCase()],kind:'historical'};
   if(cardNumber(a.reportOdometer)!==null)return {value:a.reportOdometer,kind:'starting'};
   return null;
  }
  function cardReading(a,m){
   const evidence=readingEvidence(a,m);if(!evidence)return 'Not recorded';
   const brand=specRecord(a).specs.odometerBrand;
   return cardNumber(evidence.value)+(usesHours(a)?' hours':' mi')+(brand==='NOT ACTUAL'?' · NOT ACTUAL':'')+(evidence.kind==='starting'?' · starting reading only':evidence.kind==='historical'?' · historical record':'');
  }
  function ownershipDate(value){const raw=String(value||'').trim(),iso=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/),us=raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(!iso&&!us)return null;const year=Number(iso?iso[1]:us[3]),month=Number(iso?iso[2]:us[1]),day=Number(iso?iso[3]:us[2]),date=new Date(year,month-1,day);return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:null}
  function ownershipIso(date){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')}
  function ownershipText(value){const date=ownershipDate(value);return date?[String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0'),date.getFullYear()].join('/'):''}
  function ownershipDuration(value,endValue){const start=ownershipDate(value);if(!start)return '';const today=new Date(),end=ownershipDate(endValue)||new Date(today.getFullYear(),today.getMonth(),today.getDate());if(start>end)return 'Check date';let months=(end.getFullYear()-start.getFullYear())*12+end.getMonth()-start.getMonth();let anchor=new Date(start.getFullYear(),start.getMonth()+months,Math.min(start.getDate(),new Date(start.getFullYear(),start.getMonth()+months+1,0).getDate()));if(anchor>end){months--;anchor=new Date(start.getFullYear(),start.getMonth()+months,Math.min(start.getDate(),new Date(start.getFullYear(),start.getMonth()+months+1,0).getDate()))}const days=Math.round((Date.UTC(end.getFullYear(),end.getMonth(),end.getDate())-Date.UTC(anchor.getFullYear(),anchor.getMonth(),anchor.getDate()))/86400000);return [Math.floor(months/12)?Math.floor(months/12)+' yr':'',months%12?months%12+' mo':'',days||!months?days+' days':''].filter(Boolean).join(' ')}
  function ownershipFor(a,m){const exact=Boolean(ownershipDate(a.ownershipStart)),date=exact?a.ownershipStart:m?.serviceStart;return {label:'Date Acquired',date:(ownershipText(date)||'Not recorded')+(!exact&&ownershipDate(date)?' (estimated)':''),end:ownershipText(specRecord(a).specs.endOfServiceDate),duration:date?ownershipDuration(date,specRecord(a).specs.endOfServiceDate):'Not recorded',durationLabel:'Length of Ownership'}}
  function renderGarageStats(){
   const active=assets.filter(a=>clean(a.status)==='active').length,inactive=assets.filter(a=>clean(a.status)==='inactive').length,sold=assets.filter(a=>clean(a.status)==='sold').length,managed=assets.filter(a=>clean(a.status)==='managed').length;
   const current=assets.filter(a=>['active','inactive'].includes(clean(a.status)));
   const today=new Date();today.setHours(0,0,0,0);
   const owned=current.map(a=>({a,date:ownershipDate(a.ownershipStart)})).filter(x=>x.date&&x.date<=today);
   const elapsed=x=>Math.max(0,((ownershipDate(specRecord(x.a).specs.endOfServiceDate)||today)-x.date)/86400000);
   const avgDays=owned.length?owned.reduce((sum,x)=>sum+elapsed(x),0)/owned.length:null;
   const longest=owned.reduce((best,x)=>!best||elapsed(x)>elapsed(best)?x:best,null);
   const high=current.filter(a=>!usesHours(a)).map(a=>({a,value:Number(String(mileageFor(a)?.currentMileage??'').replace(/,/g,''))})).filter(x=>Number.isFinite(x.value)&&x.value>=0&&String(mileageFor(x.a)?.currentMileage??'').trim()!=='').sort((a,b)=>b.value-a.value)[0];
   const stats=[['Total items',assets.length],['Active',active],['Inactive',inactive],['Sold',sold],['Managed',managed],['Average ownership',avgDays===null?'—':avgDays<365?Math.round(avgDays/30.4375)+' mo':(avgDays/365.25).toFixed(1)+' yr'],['Dates on file',owned.length+' / '+current.length]];
   document.getElementById('garageStats').innerHTML=stats.map(([label,value])=>'<div class="garage-stat"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></div>').join('');
   const name=a=>[a.year,a.make,a.model].filter(Boolean).join(' ')||'Unnamed item';
   document.getElementById('garageHighlights').innerHTML='<div class="garage-highlight"><span>LONGEST OWNED · CURRENT GARAGE</span><strong>'+esc(longest?name(longest.a):'No acquisition dates yet')+'</strong><small>'+esc(longest?ownershipDuration(longest.a.ownershipStart,specRecord(longest.a).specs.endOfServiceDate)+' · since '+ownershipText(longest.a.ownershipStart):'Add an acquisition date to see this stat.')+'</small></div><div class="garage-highlight"><span>HIGHEST RECORDED MILEAGE · CURRENT GARAGE</span><strong>'+esc(high?name(high.a):'No mileage readings yet')+'</strong><small>'+esc(high?high.value.toLocaleString('en-US',{maximumFractionDigits:1})+' miles':'Add a current reading to see this stat.')+'</small></div>';
  }
  function fact(label,value){return '<div class="asset-fact"><span>'+esc(label)+'</span><strong>'+esc(value||'Not recorded')+'</strong></div>'}
  // Additional quick-reference values live in the existing profile's AB cell.
  const quickSpecs=[['Length','length'],['Width','width'],['Height','height'],['Weight','weight'],['Ground clearance','groundClearance'],['Cargo bed capacity','cargoBed'],['Seat kit capacity','seatKit'],['Vehicle payload','payload'],['Towing capacity','towing'],['Maximum tongue weight','tongueWeight'],['Tire PSI','tirePsi'],['Lug nut size','lugNutSize'],["Frame material","frameMaterial"],["Frame angles","frameAngles"],["Wheel size","wheelSize"],["Fork","fork"],["Rear shock","rearShock"],["Brake levers","brakeLevers"],["Handlebar","handlebar"],["Stem","stem"],["Headset","headset"],["Front derailleur","frontDerailleur"],["Crankset","crankset"],["Rear derailleur","rearDerailleur"],["Pedals","pedals"],["Fuel tank capacity","fuelTank"],["Fuel economy","fuelEconomy"],["Spark plug","sparkPlug"],["Spark plug gap","sparkPlugGap"],["Oil type","oilType"],["Oil capacity","oilCapacity"],["Primary fluid","primaryFluid"],["Transmission fluid","transmissionFluid"],["Crankcase fluid","crankcaseFluid"],["Oil filter","oilFilter"],["Drain plug wrench","drainPlugWrench"],["Front tire PSI","frontTirePsi"],["Rear tire PSI","rearTirePsi"],["Spare tire PSI","spareTirePsi"],["Lug nut torque","lugNutTorque"],["Wheelbase","wheelbase"],["Seat height","seatHeight"],["Curb weight","curbWeight"],["Dry weight","dryWeight"],["Manufacturer","manufacturer"],["Brand","brand"],["Item weight","itemWeight"],["Product dimensions","productDimensions"],["Manufacturer part number","partNumber"],["Starting method","startingMethod"],["Engine model","engineModel"],["Engine serial number","engineSerial"],["Engine family","engineFamily"],["Manufactured","manufactured"],["Cutting head","cuttingHead"],["Product number","productNumber"],["Product serial number","productSerial"],["Dump cart model","dumpCartModel"],["Dump cart product number","dumpCartProduct"],["Dump cart serial number","dumpCartSerial"],["Gross vehicle weight rating","gvwr"],["Additional report details","additionalDetails"]];
  const legendSpecs={length:'116 in',width:'52 in',height:'75 in',weight:'1,248 lb',groundClearance:'16 in',cargoBed:'500 lb',seatKit:'500 lb',payload:'500 lb',towing:'500 lb (flat ground only)',tongueWeight:'150 lb',tirePsi:'20 PSI',lugNutSize:'19 mm'};
  function isLegend(a){return clean(a.make)==='makdaddy'&&clean(a.model).includes('legend')}

  const number = value => {
    const text = String(value ?? '').trim().replace(/[$,]/g, '');
    const match = text.match(/^(-?\d+(?:\.\d+)?)(?:\s*(?:mi|miles?|h|hr|hours?))?$/i);
    return match ? Number(match[1]) : null;
  };
  const daysBetween = (from, to) => (Date.parse(to) - Date.parse(from)) / 86400000;
  const roadAsset = item => /^(cars?|trucks?(?:\s*&\s*suvs?)?|suvs?|vans?|motorcycles?)$/i.test(item.category || '') ||
    (collection(item) === 'Vehicles' && !/makdaddy|golfcart/i.test(clean(title(item))));
  const vinFor = item => String(item.vin || '').trim().toUpperCase();
  const eligibleVin = item => (roadAsset(item) || collection(item) === 'Trailers') && /^[A-HJ-NPR-Z0-9]{17}$/.test(vinFor(item));
  const active = item => /^(active|managed)$/i.test(String(item.status || '').trim());
  const assetKey = item => vinFor(item) || clean(title(item));
  const taskKey = (item, task) => JSON.stringify([assetKey(item), task.sheetRow, task.task, task.lastDate, task.nextDate, task.nextReading]);
  const recallSite = 'https://www.nhtsa.gov/recalls';
  const readState = kind => {
    try { return JSON.parse(localStorage.getItem('tiszod-garage-report-' + kind) || '{}') || {}; }
    catch { return {}; }
  };
  function saveState(kind, key, entry) {
    const saved = readState(kind);
    if (entry) saved[key] = entry;
    else delete saved[key];
    localStorage.setItem('tiszod-garage-report-' + kind, JSON.stringify(saved));
  }
  function profileLink(item, schedule = false) {
    const group = collection(item);
    const page = group === 'Equipment' ? 'equipment.html' : group === 'Watercraft' ? 'watercraft.html' : 'vehicles.html';
    const query = new URLSearchParams({q: [item.make, item.model].filter(Boolean).join(' ') || title(item), asset: assetKey(item)});
    if (group === 'Trailers' || group === 'Off-Road') query.set('section', group === 'Trailers' ? 'trailers' : 'off-road');
    if (schedule) query.set('tab', 'recommended');
    return page + '?' + query;
  }
  function readingFor(item, fleet) {
    const model = clean(item.make + ' ' + item.model);
    const aliases = {ram3500:'3500drw', fordmustang:'mustang', harleydavidsonroadglide:'fltrk', harleydavidsonultra:'flhtcui'};
    const alias = Object.entries(aliases).find(([prefix]) => model.startsWith(prefix))?.[1];
    const readings = fleet.vehicles.filter(row => String(row.year) === String(item.year) && clean(row.name) &&
      (model === clean(row.name) || model.includes(clean(row.name)) || alias === clean(row.name)));
    readings.sort((a, b) => clean(b.name).length - clean(a.name).length || b.sheetRow - a.sheetRow);
    return number(readings[0]?.currentMileage) ?? number(item.reportOdometer);
  }
  function timestampDate(value) {
    const recorded = dateKey(value);
    if (recorded) return recorded;
    const time = new Date(value);
    if (!Number.isFinite(time.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(time);
    const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return [fields.year, fields.month, fields.day].join('-');
  }
  function statusFor(days, reached) {
    if (reached || (days !== null && days < 0)) return ['late', reached ? 'Reading reached' : 'Overdue'];
    if (days === 0) return ['soon', 'Due today'];
    if (days !== null) return [days <= 30 ? 'soon' : 'ok', 'Due in ' + days + ' days'];
    return ['unknown', 'Needs confirmation'];
  }
  function rangeIncludes(date, config) {
    if (!date) return false;
    if (date <= config.now) return true;
    if (config.window === 'custom') return (!config.from || date >= config.from) && (!config.to || date <= config.to);
    return daysBetween(config.now, date) <= Number(config.window);
  }
  function renewalItems(item, tasks, services) {
    const base = {...complianceEvidence[vinFor(item)]};
    const profileDue = dateKey(item.renewal);
    if (!base.registrationMode && !base.registrationDue && profileDue >= '2026-01-01') base.registrationDue = profileDue;
    try {
      const saved = JSON.parse(item.reportNotes || '{}');
      if (saved.type === 'vehicle-quick-specs-v1') Object.assign(base, saved.specs);
    } catch {}
    return ['registration', 'inspection'].flatMap(kind => {
      const task = tasks.find(entry => complianceKind(entry.task) === kind);
      const mode = base[kind + 'Mode'];
      if (['permanent', 'exempt', 'not-required'].includes(mode)) return [];
      const date = dateKey(task?.nextDate) || dateKey(base[kind + 'Due']);
      const logged = services.filter(entry => clean(entry.asset) === clean(serviceAssetKey(item)) &&
        String(entry.item || '').split(';').some(label => complianceKind(label) === kind))
        .map(entry => dateKey(entry.date)).filter(Boolean).sort().at(-1);
      const last = dateKey(task?.lastDate) || dateKey(base[kind + 'Last']) || logged;
      if (!roadAsset(item) && !date && !last && !task) return [];
      return [{kind, date, last}];
    });
  }
  async function operationalRows(config) {
    const [fleet, service] = await Promise.all([thFleetData(), thFleetServiceData()]);
    const deferrals = readState('deferrals');
    const rows = [];
    for (const item of inventory(fleet)) {
      const name = title(item);
      const group = collection(item);
      const common = {item, collection:group, state:item.status || 'Unspecified'};
      const tasks = service.schedules[scheduleKeyFor(item)]?.tasks || [];
      const maintenance = tasks.filter(task => !complianceKind(task.task));
      const reading = readingFor(item, fleet);
      const readingDate = timestampDate(item.lastUpdated);
      const stale = reading === null || !readingDate || daysBetween(readingDate, config.now) > 90;
      const intervals = maintenance.map(task => task.interval + ' ' + task.nextReading).join(' ');
      const scheduledInHours = /\bhours?\b/i.test(intervals) && !/\bmiles?\b/i.test(intervals);
      const unit = usesHours(item) || scheduledInHours ? 'hours' : 'miles';
      const readingText = reading === null ? '' : reading.toLocaleString() + ' ' + unit;
      if (config.type === 'renewals' || config.type === 'gaps') {
        const renewals = renewalItems(item, tasks, service.services);
        for (const renewal of renewals) {
          const label = renewal.kind === 'registration' ? 'Registration' : 'State inspection';
          if (config.type === 'gaps') {
            if (!renewal.date) rows.push({...common, cells:[name, group, label + ' due date missing', 'Check the current document']});
          } else if (!renewal.date || rangeIncludes(renewal.date, config)) {
            const [tone, state] = statusFor(renewal.date ? daysBetween(config.now, renewal.date) : null, false);
            rows.push({...common, date:renewal.date, tone, cells:[name, label, renewal.last, renewal.date, state]});
          }
        }
      }
      if (config.type === 'gaps') {
        if (maintenance.some(task => !dateKey(task.nextDate) && number(task.nextReading) === null))
          rows.push({...common, cells:[name, group, 'Service due point missing', 'Some tasks have neither a due date nor a due reading']});
        if (!maintenance.length) rows.push({...common, cells:[name, group, 'No recorded service schedule', 'Review the asset’s maintenance plan']});
        if (stale && (roadAsset(item) || maintenance.some(task => number(task.nextReading) !== null)))
          rows.push({...common, cells:[name, group, 'Needs a current reading', readingText ? 'Last profile update: ' + (readingDate || 'unknown') : 'No reading recorded']});
        continue;
      }
      if (config.type === 'renewals') continue;
      for (const task of maintenance) {
        const date = dateKey(task.nextDate);
        const target = number(task.nextReading);
        const taskUnit = /\bhours?\b/i.test(task.interval + ' ' + task.nextReading) ? 'hours' : /\bmiles?\b/i.test(task.interval + ' ' + task.nextReading) ? 'miles' : unit;
        const comparable = taskUnit === unit && reading !== null;
        const reached = target !== null && comparable && reading >= target;
        const key = taskKey(item, task);
        const deferred = deferrals[key];
        const days = date ? daysBetween(config.now, date) : null;
        const [tone, state] = statusFor(days, reached);
        const reasons = [date && (!reached || rangeIncludes(date, config)) ? statusFor(days, false)[1] : '', reached ? 'Due by ' + taskUnit : '',
          target !== null && (stale || !comparable) ? 'Needs a current reading' : ''].filter(Boolean);
        if (config.type === 'deferred') {
          if (deferred) rows.push({...common, key, task, date:deferred.date, tone:deferred.date <= config.now ? 'soon' : 'ok',
            cells:[name, task.task, deferred.date, deferred.reason, date, target === null ? '' : target + ' ' + taskUnit]});
        } else if ((reached || rangeIncludes(date, config) || (deferred && deferred.date <= config.now)) &&
            (!deferred || deferred.date <= config.now || reached || (days !== null && days < 0))) {
          rows.push({...common, key, task, date, tone,
            cells:[name, task.task, reasons.join(' · ') || state, date, target === null ? '' : target + ' ' + taskUnit,
              readingText, dateKey(task.lastDate), deferred ? deferred.date : '']});
        }
      }
    }
    return rows;
  }

  async function recallRows() {
    const state = readState('recalls');
    return inventory(await thFleetData()).map(item => {
      const vin = vinFor(item);
      const saved = state[assetKey(item)];
      const group = collection(item);
      const lookup = eligibleVin(item) ? recallSite + '?vin=' + encodeURIComponent(vin) :
        group === 'Watercraft' ? 'https://business.cpsc.gov/Recalls/uscgsearch.html' :
        group === 'Off-Road' || group === 'Equipment' ? 'https://www.cpsc.gov/Recalls' : recallSite;
      return {item, collection:group, state:item.status || 'Unspecified', lookup, eligible:eligibleVin(item),
        cells:[title(item), group, vin, saved?.status || (eligibleVin(item) ? 'Needs checking' : 'Manual lookup needed'), saved?.date || '',
          eligibleVin(item) ? 'NHTSA VIN lookup' : group === 'Watercraft' ? 'Coast Guard / manufacturer' : 'Manufacturer / dealer']};
    });
  }

  const reports = {
    attention: {name:"What needs attention?", filters:["collection","state","window"], headers:["Asset","Task","Why it needs attention","Due date","Due reading","Current reading","Last service","Review date"], read:operationalRows},
    renewals: {name:"Renewals and inspections", filters:["collection","state","window"], headers:["Asset","Renewal","Last recorded","Due date","Status"], read:operationalRows},
    deferred: {name:"Deferred work", filters:["collection","state"], headers:["Asset","Task","Review date","Reason","Original due date","Due reading"], read:operationalRows},
    gaps: {name:"Records that need updating", filters:["collection","state"], headers:["Asset","Collection","Missing or stale record","Details"], read:operationalRows},
    recalls: {name:"Safety recalls", filters:["collection","state"], headers:["Asset","Collection","VIN / serial","Recorded result","Date checked","Source"], read:recallRows},
    inventory: {
      name: 'Garage inventory', filters: ['collection', 'state'],
      headers: ['Asset', 'Collection', 'Category', 'Status', 'VIN / serial', 'Plate / tag'],
      read: async () => inventory(await thFleetData()).map(item => ({
        collection: collection(item), state: item.status || 'Unspecified',
        cells: [title(item), collection(item), item.category, item.status || 'Unspecified', item.vin, item.tag]
      }))
    },
    mileage: {
      name: 'Mileage and readings', filters: [],
      headers: ['Asset as logged', 'Model year', 'Service start', 'Starting reading', 'Current reading', 'Change'],
      read: async () => (await thFleetData()).vehicles.map(item => ({
        cells: [item.name, item.year, item.serviceStart, item.startMileage, item.currentMileage, item.addedMileage]
      }))
    },
    history: {
      name: 'Maintenance history and costs', filters: ['from', 'to'],
      headers: ['Date', 'Asset', 'Service', 'Reading', 'Recorded cost', 'Notes'],
      read: async () => (await thFleetServiceData()).services.map(item => ({
        date: dateKey(item.date),
        cells: [item.date, item.asset, item.item, item.odometer, item.cost, item.notes]
      }))
    },
    schedule: {
      name: 'Service schedule', filters: ['from', 'to'],
      headers: ['Due date', 'Asset', 'Task', 'Date status', 'Due reading', 'Interval', 'Notes'],
      read: async () => {
        const {schedules} = await thFleetServiceData();
        const now = today();
        return Object.entries(schedules).flatMap(([key, entry]) => entry.tasks.map(task => {
          const date = dateKey(task.nextDate);
          return {date, cells: [task.nextDate, entry.sourceName || key, task.task,
            date ? (date < now ? 'Past due' : date === now ? 'Due today' : 'Upcoming') : 'No date recorded',
            task.nextReading, task.interval, task.notes]};
        }));
      }
    },
    registration: {
      name: 'Recorded registration renewals', filters: ['collection', 'from', 'to'],
      headers: ['Renewal date', 'Asset', 'Collection', 'Plate / tag', 'Status'],
      read: async () => inventory(await thFleetData()).filter(item => item.renewal).map(item => ({
        date: dateKey(item.renewal), collection: collection(item),
        cells: [item.renewal, title(item), collection(item), item.tag, item.status]
      }))
    },
    fuel: {
      name: 'Fuel purchases and costs', filters: ['from', 'to'],
      headers: ['Date', 'Asset', 'Reading', 'Gallons', 'Price per gallon', 'Recorded total', 'Station'],
      read: async () => {
        const {entries} = await TisFuelStore.read();
        const keys = new Map(entries.filter(item => item.vehicle).map(item => [item.vehicle, item.name]));
        const names = {'3500': 'Ram 3500', Mustang: 'Ford Mustang', FLTRK: 'Harley-Davidson Road Glide',
          FLHTCUI: 'Harley-Davidson Ultra Classic', F150: 'Ford F-150'};
        for (const key of Object.keys(window.FUEL_LEGACY || {})) if (!keys.has(key)) keys.set(key, names[key] || key);
        return Array.from(keys, ([key, name]) => TisFuelStore.merge({key, name}, entries)).flat()
          .map(item => ({
            date: dateKey(item.date),
            cells: [item.date, item.name || item.vehicle, item.odo, item.gallons, item.price, item.total, item.station]
          }));
      }
    }
  };

  function clear() {
    clearTimeout(expiredTimer);
    result = null;
    table.replaceChildren();
    preview.hidden = exportMenu.hidden = true;
    exportMenu.open = false;
    summary.replaceChildren();
    recallTools.replaceChildren();
    workList.replaceChildren();
  }

  function updateFilters() {
    const report = reports[filters.report.value];
    section.querySelector('.report-source').textContent = ({
      attention: 'Overdue tasks stay visible in every window. Reading freshness uses the last recorded profile update.',
      deferred: 'Review dates and reasons are saved in this browser. A deferral does not change the service due date.',
      recalls: 'Use the official lookup and save the result for each asset.',
      mileage: 'Readings are shown as logged. The workbook includes both mileage and equipment hours.',
      schedule: 'Shows workbook schedule entries. Date status uses the recorded date. Review the due reading separately.',
      registration: 'Shows renewal dates recorded on asset profiles. Check the current registration document before relying on a date.'
    })[filters.report.value] || '';
    const planning = report.filters.includes('window');
    const range = form.querySelector('.report-range');
    range.hidden = range.disabled = !planning;
    for (const button of section.querySelectorAll('[data-report]'))
      button.setAttribute('aria-pressed', String(button.dataset.report === filters.report.value));
    for (const name of ['collection', 'state', 'from', 'to']) {
      const field = filters[name];
      field.disabled = !report.filters.includes(name) && !(planning && filters.window.value === 'custom' && ['from','to'].includes(name));
      field.closest('label').hidden = field.disabled;
    }
  }

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function linkTo(text, href, external = false) {
    const link = node('a', text);
    link.href = href;
    if (external) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    return link;
  }
  function action(text, onClick) {
    const button = node('button', text, 'garage-report-action secondary-action');
    button.type = 'button';
    button.onclick = onClick;
    return button;
  }
  function recordError() {
    status.textContent = 'This browser could not save the report note.';
  }
  function defer(row) {
    const saved = readState('deferrals')[row.key];
    const dialog = section.querySelector('.report-defer-dialog');
    const edit = dialog.querySelector('form');
    const message = dialog.querySelector('[role=status]');
    dialog.querySelector('h2').textContent = 'Review ' + row.task.task + ' later';
    edit.elements.date.min = today();
    edit.elements.date.value = saved?.date || '';
    edit.elements.reason.value = saved?.reason || '';
    message.textContent = '';
    edit.onsubmit = event => {
      event.preventDefault();
      try {
        saveState('deferrals', row.key, {date:edit.elements.date.value, reason:edit.elements.reason.value.trim()});
        dialog.close();
        form.requestSubmit();
      } catch { message.textContent = 'This browser could not save the deferral.'; }
    };
    dialog.showModal();
  }
  function renderGrouped(report, rows) {
    const groups = new Map();
    for (const row of rows) {
      const key = assetKey(row.item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    for (const group of groups.values()) {
      const item = group[0].item;
      const card = node('section', '', 'report-asset');
      const heading = node('h4');
      heading.append(linkTo(title(item), profileLink(item)));
      card.append(heading, node('p', collection(item) + ' · ' + (item.status || 'Status unknown')));
      const tasks = node('ul');
      for (const row of group) {
        const task = node('li', '', 'report-task');
        const title = node('strong');
        title.append(linkTo(row.cells[1], profileLink(item, true)));
        const labels = report.headers.slice(2).flatMap((header, index) => {
          const value = row.cells[index + 2];
          return value ? [node('span', header + ': ' + value)] : [];
        });
        task.append(title, ...labels);
        if (row.tone) task.dataset.tone = row.tone;
        if (row.task) task.append(action('Defer / edit review', () => defer(row)));
        if (report === reports.deferred) task.append(action('Resume tracking', () => {
          try { saveState('deferrals', row.key, null); form.requestSubmit(); } catch { recordError(); }
        }));
        tasks.append(task);
      }
      card.append(tasks);
      workList.append(card);
    }
  }
  async function checkRecallCampaigns(rows, output, trigger) {
    trigger.disabled = true;
    output.replaceChildren(node('p','Checking NHTSA campaign data…'));
    const requests = new Map();
    async function check(row) {
      const {year,make,model} = row.item;
      if (!/^\d{4}$/.test(String(year || '').trim()) || !make || !model ||
          ['Watercraft','Equipment'].includes(row.collection) || /bicycle|golf cart/i.test(row.item.category || '')) {
        return {row,message:'Manufacturer or specialty lookup needed'};
      }
      const query = new URLSearchParams({make,model,modelYear:year});
      const key = query.toString().toLowerCase();
      if (!requests.has(key)) requests.set(key,(async () => {
        const response = await fetch('https://api.nhtsa.gov/recalls/recallsByVehicle?' + query,
          {cache:'no-store',signal:AbortSignal.timeout(12000)});
        if (!response.ok) throw Error('Campaign lookup unavailable');
        const result = await response.json();
        if (!Array.isArray(result.results)) throw Error('Campaign lookup unavailable');
        return result.results;
      })());
      try {
        const campaigns = await requests.get(key);
        return {row,campaigns,message:campaigns.length ? campaigns.length + ' campaign matches' : 'No matching campaigns returned'};
      } catch { return {row,message:'Campaign lookup unavailable'}; }
    }
    try {
      const results = [];
      for (let offset = 0; offset < rows.length; offset += 5)
        results.push(...await Promise.all(rows.slice(offset,offset+5).map(check)));
      const sorted = results.sort((a,b) => Number(Boolean(b.campaigns?.length)) - Number(Boolean(a.campaigns?.length)));
      output.replaceChildren(node('p','NHTSA campaign matches by year, make, and model. Use the official VIN link to verify whether a repair is still open.'));
      for (const {row,campaigns,message} of sorted) {
        const result = node('details');
        result.append(node('summary',row.cells[0] + ' · ' + message),linkTo('Official lookup',row.lookup,true));
        for (const campaign of campaigns || []) {
          result.append(node('p',[campaign.NHTSACampaignNumber,campaign.Component,campaign.Summary,campaign.Remedy].filter(Boolean).join(' · ')));
        }
        output.append(result);
      }
    } finally {trigger.disabled = false;}
  }
  const recallSelectionTab = 'TisZod Recall Selection';
  async function recallSelection(write) {
    const metadata = await thSheets('?fields=sheets(properties(title))');
    const exists = metadata.sheets.some(sheet => sheet.properties.title === recallSelectionTab);
    if (!exists && !write) return new Set();
    if (!exists) {
      const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + TH_SHEET_ID + ':batchUpdate', {
        method:'POST',headers:{Authorization:'Bearer ' + thToken,'Content-Type':'application/json'},
        body:JSON.stringify({requests:[{addSheet:{properties:{title:recallSelectionTab,gridProperties:{rowCount:1,columnCount:1}}}}]})
      });
      if (!response.ok) throw Error('Could not create the private recall selection.');
    }
    if (write) {
      await thWriteCell(recallSelectionTab,'A1',JSON.stringify([...write]));
      return write;
    }
    const cells = await thValues("'" + recallSelectionTab + "'!A1");
    const values = JSON.parse(cells[0]?.[0] || '[]');
    if (!Array.isArray(values)) throw Error('Invalid recall selection.');
    return new Set(values);
  }
  function renderRecallPicker(rows) {
    const picker = node('details');
    picker.append(node('summary','Choose vehicles for recall checks'));
    const feedback = node('p','Loading your private selection…');
    feedback.setAttribute('role','status');
    picker.append(feedback);
    const results = node('div');
    const choices = [...new Map(rows.filter(row => vinFor(row.item)).map(row => [vinFor(row.item),row])).values()];
    const controls = choices.map(row => {
      const label = node('label');
      const checkbox = node('input');
      checkbox.type = 'checkbox';
      checkbox.disabled = true;
      const vin = vinFor(row.item);
      label.append(checkbox,document.createTextNode(' ' + row.cells[0] + ' · ' + row.state + ' · ' + vin));
      const line = node('div');
      line.append(label);
      picker.append(line);
      return {checkbox,vin};
    });
    const save = action('Save selection',async () => {
      save.disabled = check.disabled = true;
      try {
        const next = await recallSelection();
        for (const {checkbox,vin} of controls) {
          if (checkbox.checked) next.add(vin); else next.delete(vin);
        }
        await recallSelection(next);
        feedback.textContent = next.size + ' vehicles selected.';
      } catch {feedback.textContent = 'Could not save your private selection. Try again.';}
      finally {save.disabled = check.disabled = false;}
    });
    const check = action('Check Recalls',async () => {
      try {
        const selected = await recallSelection();
        const chosen = choices.filter(row => selected.has(vinFor(row.item)));
        if (!chosen.length) {feedback.textContent = 'Choose and save vehicles before checking recalls.';picker.open = true;return;}
        await checkRecallCampaigns(chosen,results,check);
      } catch {feedback.textContent = 'Could not load your private selection. Try again.';}
    });
    picker.append(save);
    save.disabled = check.disabled = true;
    recallTools.append(check,picker,results);
    void recallSelection().then(values => {
      for (const {checkbox,vin} of controls) {checkbox.checked = values.has(vin);checkbox.disabled = false;}
      feedback.textContent = values.size + ' vehicles selected. Save changes before checking.';
      save.disabled = check.disabled = false;
    }).catch(() => {feedback.textContent = 'Could not load your private selection. Reopen the report to retry.';});
  }
  function renderRecallTools(rows) {
    renderRecallPicker(rows);
    const vins = [...new Set(rows.filter(row => row.eligible).map(row => row.cells[2]))];
    recallTools.append(linkTo('Open NHTSA Recall Check', recallSite, true));
    if (vins.length) recallTools.append(action('Copy eligible VINs (' + vins.length + ')', async () => {
      try { await navigator.clipboard.writeText(vins.join('\n')); status.textContent = vins.length + ' VINs copied.'; }
      catch { status.textContent = 'Clipboard unavailable. Use the VINs in the report.'; }
    }));
    recallTools.append(node('p', 'Run checks on the official sites, then record the results here. Older or specialty vehicles may need a manufacturer or dealer check. Results are saved in this browser.'));
  }
  function recallControl(row) {
    const holder = node('div', '', 'report-recall-row');
    holder.append(linkTo(row.eligible ? 'Check VIN' : 'Open recall source', row.lookup, true));
    if (!row.eligible && clean(row.item.make) === 'ford')
      holder.append(linkTo('Contact Ford', 'https://www.ford.com/help/contact/', true));
    const select = node('select');
    select.setAttribute('aria-label', 'Recall result for ' + title(row.item));
    for (const value of ['Needs checking', 'Open recall', 'None found', 'Lookup unavailable']) select.add(new Option(value, value));
    select.value = row.cells[3] === 'Manual lookup needed' ? 'Needs checking' : row.cells[3];
    const save = action('Save result', () => {
      try {
        saveState('recalls', assetKey(row.item), select.value === 'Needs checking' ? null : {status:select.value, date:today()});
        form.requestSubmit();
      } catch { recordError(); }
    });
    holder.append(select, save);
    return holder;
  }
  function renderSummary(report, rows) {
    if (report === reports.attention || report === reports.renewals) {
      const counts = [['late','Overdue / reading reached'],['soon','Due within 30 days'],['ok','Later in range'],['unknown','Needs confirmation']];
      for (const [tone, label] of counts) {
        const item = node('div', '', 'report-metric');
        item.dataset.tone = tone;
        item.append(node('strong', String(rows.filter(row => row.tone === tone).length)), node('span', label));
        summary.append(item);
      }
    }
    if (report === reports.history || report === reports.fuel) {
      const totals = new Map();
      for (const row of rows) {
        const value = number(row.cells[report === reports.history ? 4 : 5]);
        if (value === null) continue;
        totals.set(row.cells[1], (totals.get(row.cells[1]) || 0) + value);
      }
      const dollars = new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'});
      if (totals.size) {
        const details = node('details', '', 'report-metric');
        const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
        details.append(node('summary', 'Recorded total ' + dollars.format(total) + ' · By asset'));
        const list = node('ul');
        for (const [asset, cost] of [...totals].sort((a,b) => b[1] - a[1])) list.append(node('li', asset + ' · ' + dollars.format(cost)));
        details.append(list);
        summary.append(details);
      }
    }
  }

  function show(report, rows, allRows = rows) {
    const grouped = report === reports.attention || report === reports.deferred;
    preview.classList.toggle('report-grouped', grouped);
    renderSummary(report, rows);
    if (grouped) renderGrouped(report, rows);
    if (report === reports.recalls) renderRecallTools(allRows);
    const head = table.createTHead().insertRow();
    for (const heading of report.headers) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = heading;
      head.append(cell);
    }
    if (report === reports.recalls) {
      const heading = node('th', 'Check and record');
      heading.scope = 'col';
      head.append(heading);
    }
    const body = table.createTBody();
    for (const row of rows) {
      const tr = body.insertRow();
      if (row.tone) tr.dataset.tone = row.tone;
      for (const [index, value] of row.cells.entries()) {
        const cell = tr.insertCell();
        cell.dataset.label = report.headers[index];
        if (index === 0 && row.item && !grouped) cell.append(linkTo(value, profileLink(row.item, report === reports.renewals)));
        else cell.textContent = value ?? '';
      }
      if (report === reports.recalls) tr.insertCell().append(recallControl(row));
    }
    preview.querySelector('h3').textContent = report.name;
    result = {report, rows};
    expiredTimer = setTimeout(() => {
      clear();
      connect.hidden = false;
      status.textContent = 'Sign in to run another report.';
    }, Math.max(0, thExpiresAt - Date.now() - 5000));
    preview.hidden = false;
    exportMenu.hidden = !rows.length;
  }

  window.thStart = () => { gate.hidden = true; };
  window.addEventListener('tiszod-drive-books-connected', () => {
    connect.hidden = true;
    form.requestSubmit();
  });
  window.addEventListener('storage', event => {
    if (event.key !== TH_SESSION_KEY) return;
    queueMicrotask(() => { if (!thAuthorized()) resetSession(); });
  });
  function resetSession() {
    generation++;
    run.disabled = false;
    clear();
    gate.hidden = true;
    connect.hidden = false;
    status.textContent = 'Sign in to run a Garage report.';
  }
  connect.addEventListener('click', () => {
    gate.hidden = false;
    gate.querySelector('#th-sign-in').focus();
  });
  gate.querySelector('[data-cancel]').addEventListener('click', () => {
    gate.hidden = true;
    connect.focus();
  });
  form.addEventListener('input', event => {
    generation++;
    run.disabled = false;
    updateFilters();
    clear();
    status.textContent = '';
    if (event.target.name === 'window' && event.target.value !== 'custom' && thAuthorized()) form.requestSubmit();
  });
  updateFilters();
  for (const button of section.querySelectorAll('[data-report]')) button.onclick = () => {
    filters.report.value = button.dataset.report;
    updateFilters();
    form.requestSubmit();
  };
  window.addEventListener('DOMContentLoaded', () => {
    connect.hidden = thAuthorized();
    if (thAuthorized()) form.requestSubmit();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    clear();
    if (!thAuthorized()) {
      status.textContent = 'Sign in with your TisZod Google account to run this report.';
      connect.hidden = false;
      connect.focus();
      return;
    }
    const selected = name => filters[name].disabled ? '' : filters[name].value;
    const from = selected('from');
    const to = selected('to');
    if (from && to && from > to) {
      status.textContent = 'Choose an end date on or after the start date.';
      filters.to.focus();
      return;
    }
    const current = ++generation;
    const type = filters.report.value;
    const report = reports[type];
    const planning = report.filters.includes('window');
    const group = selected('collection');
    const state = selected('state');
    const search = filters.search.value.trim().toLowerCase();
    run.disabled = true;
    status.textContent = 'Loading ' + report.name.toLowerCase() + '…';
    try {
      const allRows = await report.read({type, window:filters.window.value, now:today(), from, to});
      const rows = allRows.filter(row =>
        (!group || row.collection === group) &&
        (!state || (/^(active|managed)$/i.test(String(row.state).trim()) === (state === 'current'))) &&
        (planning || !from || (row.date && row.date >= from)) &&
        (planning || !to || (row.date && row.date <= to)) &&
        (!search || row.cells.some(cell => String(cell ?? '').toLowerCase().includes(search)))
      );
      if (current !== generation) return;
      if (!thAuthorized()) throw Object.assign(new Error('Your sign-in expired. Sign in and run the report again.'), {status: 401});
      rows.sort((a, b) => report === reports.history || report === reports.fuel
        ? (b.date || '').localeCompare(a.date || '')
        : (({late:0, soon:1, ok:2, unknown:3})[a.tone] ?? 4) - (({late:0, soon:1, ok:2, unknown:3})[b.tone] ?? 4)
          || (a.date || '9999').localeCompare(b.date || '9999') || String(a.cells[0]).localeCompare(String(b.cells[0])));
      status.textContent = rows.length ? rows.length + (rows.length === 1 ? ' record' : ' records') + ' found.' : 'No records match these filters.';
      if (!rows.length && report === reports.attention)
        status.textContent = 'No matching due tasks were found. Check Missing records for gaps in schedules or readings.';
      if (rows.length || report === reports.recalls || report === reports.attention) show(report, rows, allRows);
    } catch (error) {
      if (current !== generation) return;
      if (error.status === 401) {
        thClearSession();
        connect.hidden = false;
      }
      status.textContent = error.message || 'The report could not load. Try again.';
    } finally {
      if (current === generation) run.disabled = false;
    }
  });

  function exportable() {
    if (result && thAuthorized()) return true;
    clear();
    connect.hidden = false;
    status.textContent = 'Sign in and run the report again before exporting.';
    return false;
  }
  download.addEventListener('click', () => {
    if (!exportable()) return;
    const escape = value => {
      let text = String(value ?? '');
      if (typeof value !== 'number' && /^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const lines = [result.report.headers, ...result.rows.map(row => row.cells)];
    const csv = '\uFEFF' + lines.map(row => row.map(escape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'garage-' + filters.report.value + '-' + today() + '.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  print.addEventListener('click', () => {
    if (!exportable()) return;
    document.body.classList.add('printing-garage-report');
    try { window.print(); } finally { document.body.classList.remove('printing-garage-report'); }
  });
})();
