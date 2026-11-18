/* OEM service references are stored with each model rule. Capacities are level-check guides. */
(function(){
 const clean=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const sources={honda:'https://cf.hondappsv.com/files/OP/OP000023GLOBAL/GX120-200_Component.pdf',kohler:'https://www.resources.kohler.com/power/kohler/enginesUS/pdf/20_590_06.pdf',kt:'https://resources.kohler.com/power/kohler/enginesUS/pdf/Gasoline_Full_line.pdf',husqvarna:'https://www.husqvarna.com/us/support/brushcutters-and-grasstrimmers/330lk/',echo:'https://support.echo-usa.com/en/Blowers/Specifications-3d10',stihl:'https://www.stihlusa.com/webcontent/cmsfilelibrary/instructionmanuals/stihl-fs-56-owners-instruction-manual.pdf',briggs:'https://www.briggsandstratton.com/en-us/support/faqs/mower-oil-type-and-capacity',cat:'https://h-cpc.cat.com/cmms/v2?cid=410&f=product&gid=1000009531&it=product&lid=en&nc=1&pid=1000024758&sc=CA',coleman:'https://www.manualslib.com/manual/3425130/Coleman-Powersports-B200-196cc.html',coolster:'https://manualzz.com/doc/67062352/coolster-atv-3050c-manual',xpro:'https://xprousa.com/pages/maintenance-for-atv-p013',craftsman:'https://www.manualslib.com/manual/2149049/Craftsman-Ws410.html'};
 function record(a){let r={};try{r=JSON.parse(a.reportNotes||'{}')}catch(_){}return r}
 function applicable(a){return /equipment|tractor|offroad|quad|minibike|scooter|moped|bicycle|golfcart/.test(clean(a.category+' '+a.sourceType))||/mancodingo|mangodingo|coleman|coolster|xpro/.test(clean(a.make))}
 function service(a){
  if(!applicable(a))return null;
  const r=record(a),s=r.specs||{},name=clean(a.make+' '+a.model),engine=clean(a.engine),raw=[r.legacyNotes,s.additionalDetails,a.fullReport,a.reportText].filter(Boolean).join('\n');
  let out={manufacturer:a.make||'Manufacturer needs confirmation',oilType:'Engine model needed',oilFilter:'Engine model needed',oilCapacity:'Engine model needed',note:'Confirm the engine model before selecting oil or a filter.'};
  const set=(oilType,oilFilter,oilCapacity,source,note='')=>Object.assign(out,{oilType,oilFilter,oilCapacity,source,note});
  const mix=(brand,ratio,source)=>set(brand+' air-cooled two-stroke oil','None — no crankcase oil filter',ratio+':1 fuel mix · '+(ratio===50?'2.6':'3.2')+' fl oz oil / US gal gasoline',source,'Oil is mixed with fuel; no crankcase fill.');
  if(/electric|\d+watt|hubmotor/.test(engine)||/volpam|makdaddylegend|trek|huffy|dumpcart|spikeaerator|lincolnelectric|smallenginemanuals/.test(name))set('Not applicable — no combustion engine','Not applicable','Not applicable','', '');
  else if(/hondagx200/.test(engine)||/dewalt.*dxpw3425|mancodingo.*285/.test(name))set('Honda SAE 10W-30 · API SJ or later','None — splash lubrication','0.60 L / 0.63 US qt; check fill level',sources.honda);
  else if(/husqvarna.*yth24k48/.test(name)||/kt735/.test(engine))set('Kohler SAE 10W-30','Kohler 12 050 01-S','1.9 L / 2.0 US qt with filter',sources.kt);
  else if(/cubcadet.*kohlercourage/.test(name))set('Kohler SAE 10W-30','Kohler 12 050 01-S','1.5 L / 1.6 US qt with filter (Courage SV600)',sources.kohler,'For the recorded 20 HP / 597 cc Courage engine.');
  else if(/husqvarna.*(122hd45|330lx|330lk)/.test(name))mix('Husqvarna HP / XP+',50,sources.husqvarna);
  else if(/echo.*pb2520/.test(name))mix('ECHO Power Blend / Red Armor · JASO FD / ISO-L-EGD',50,sources.echo);
  else if(/stihl.*fs56/.test(name))mix('STIHL HP Ultra',50,sources.stihl);
  else if(/caterpillar.*rp6500/.test(name))set('Cat SAE 10W-30 (SAE 30 for suitable temperatures)','None — splash lubrication','1.1 US qt; check dipstick level',sources.cat);
  else if(/coleman.*b200/.test(name))set('SAE 15W-40 — factory B200 specification','None — factory engine','0.60 L / 0.63 US qt — factory engine',sources.coleman,engine.includes('224')?'B200 manual is for the factory 196 cc engine; the recorded 224 cc engine needs identification before using factory fill specifications.':'');
  else if(/coolster.*3050c/.test(name))set('SAE 15W-40 four-stroke oil','No spin-on filter; confirm engine strainer','0.8 L per 3050C manual; check level',sources.coolster,'Portal lists 90 cc; manufacturer 3050C documentation lists 110 cc. Confirm engine before service.');
  else if(/xpro.*(jaguar200|200)/.test(name))set('SAE 15W-40 · API SF or later','Confirm engine strainer / filter configuration','0.8 L per factory manual; check level',sources.xpro);
  else if(/craftsman.*18inchchainsaw/.test(name))mix('Craftsman two-cycle',40,'https://www.manualslib.com/guide/3098847/craftsman-s165-s185-18-inch-42cc-chainsaw-manual.html');
  else if(/craftsman.*10.*polesaw/.test(name))set('Craftsman air-cooled two-stroke oil — confirm model / mix ratio','None — two-stroke engine','Mix ratio requires exact model','', 'Bar and chain oil is separate from engine fuel-mix oil.');
  else if(/craftsman.*ws410/.test(name))set('SAE 30 four-stroke oil','None','90 mL / 3.04 fl oz (WS410 manual)',sources.craftsman,'Record also mentions WS430; confirm model before using fill quantity.');
  else if(/briggs|bs\d/.test(engine)||/yardmachine.*mtd760|murrayselect|craftsman.*lt2000|lawnboy/.test(name))set('Briggs & Stratton SAE 30 above 40°F; synthetic 5W-30 for wider temperatures',/craftsman.*lt2000/.test(name)?'Briggs & Stratton 492932S':/yardmachine.*mtd760/.test(name)?'Engine model 21B807: verify filter fitment (conflicting old record)':'Exact engine model needed for filter', 'Check dipstick; exact engine model needed for capacity',sources.briggs);
  else if(/taotao.*moped/.test(name))set('SAE 15W-40 — recorded owner specification','None — recorded owner specification','1.0 US qt recorded; check engine dipstick','', 'Historical owner notes; exact scooter engine model is not recorded.');
  else if(/troybilt.*tb240/.test(name))set('Honda SAE 10W-30 (factory GCV160)','None — factory GCV160','Fill to dipstick level (factory GCV160)',sources.honda,'Confirm installed engine matches the factory Honda GCV160.');
  else if(/troyb[ui]lt.*4cycle/.test(name))set('SAE 30 four-stroke oil — confirm trimmer model','None — four-cycle handheld trimmer','Exact model needed for fill quantity','');
  else if(/dewalt.*aircompressor/.test(name))set('Not applicable — oil-free compressor pump','None','No oil fill','https://www.dewalt.com/GLOBALBOM/QU/D55168/2/Instruction_Manual/EN/N032485_D55168.pdf','15 gal / 1.6 HP D55168 identification matched to the existing equipment photo.');
  // Saved user specifications remain visible when no verified model rule supplies a value.
  if(out.oilType==='Engine model needed'&&s.oilType)out.oilType=s.oilType;
  if(out.oilFilter==='Engine model needed'&&s.oilFilter&&!/wrench|drain plug/i.test(s.oilFilter))out.oilFilter=s.oilFilter;
  // Keep the summary to the three requested service values.
  if(/xpro|coleman/.test(name))out.oilFilter='None';
  const simple=(value,kind)=>{
   if(/^(None|Not applicable|No oil fill|No spin-on)/i.test(value))return 'None';
   if(/needed|requires exact|Confirm|verify filter|Check dipstick|Fill to dipstick/i.test(value))return 'Unknown';
   let text=value.split(' — ')[0].split(';')[0].replace(/\s*\([^)]*\)/g,'').replace(/\s+per .*$/i,'').replace(/\s+recorded.*$/i,'').trim();
   if(kind==='oil')text=text.replace(/ · API .*$/,'').replace('ECHO Power Blend / Red Armor · JASO FD / ISO-L-EGD air-cooled two-stroke oil','ECHO two-stroke oil').replace(' air-cooled two-stroke oil',' two-stroke oil').replace(' (SAE 30 for suitable temperatures)','').replace(' above 40°F','');
   if(kind==='amount')text=text.replace(' fuel mix','').replace(' oil / US gal gasoline',' / US gal gasoline').replace(' with filter','');
   return text;
  };
  out.oilType=simple(out.oilType,'oil');out.oilFilter=simple(out.oilFilter,'filter');out.oilCapacity=simple(out.oilCapacity,'amount');
  return out;
 }
 function defaults(a){const d=service(a);return d?{oilType:d.oilType,oilFilter:d.oilFilter,oilCapacity:d.oilCapacity,oilSource:d.source||'',oilServiceNote:d.note||''}:{};}
 function card(a,esc,specs){const base=service(a);if(!base)return '';const d={...base,...specs};const muted=['sold','inactive','totaled','repo'].includes(clean(a.status))||d.oilType==='None';return '<aside class="card-oil'+(muted?' is-muted':'')+'" aria-label="Oil and filter">'+[['Oil',d.oilType],['Oil Filter',d.oilFilter],['Oil Amount',d.oilCapacity]].map(([k,v])=>'<div><b>'+esc(k)+':</b> <b class="oil-value">'+esc(v)+'</b></div>').join('')+'</aside>';}

 window.TiszodSmallEngineOil={service,defaults,card};
})();
