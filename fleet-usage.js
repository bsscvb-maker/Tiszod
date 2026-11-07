/* Shared year-to-date usage for Garage collections. */
function createFleetUsage({workspace,assets,getServices,onRefresh,serviceAssetKey,specRecord,isLegend,clean,mileageFor,ownershipDate,ownershipText,ownershipIso,cardNumber,usesHours,esc}){
 const usageCacheKey='tiszod-vehicle-annual-usage-v1';
 const usageYear=new Date().getFullYear();
 let usageCache={}, usageReadings=null, usageRefresh=null;
 function readCache(){
  try{return JSON.parse(sessionStorage.getItem(usageCacheKey))||{}}catch{return {}}
 }
 const stored=readCache();
 usageCache=stored[workspace]||(workspace==='vehicles'?stored:{})||{};
 if(usageCache.year!==usageYear)usageCache={};
 function refreshAnnualUsage(){
  if(getServices()||usageRefresh||Date.now()-(usageCache.savedAt||0)<60000)return;
  usageRefresh=thValues("'Portal Service History'!A2:E5000").then(rows=>{
   usageReadings=rows.filter(row=>row[0]&&row[3]).map(row=>({asset:row[0],date:row[2],odometer:row[4]}));
   usageCache={year:usageYear,savedAt:Date.now(),metrics:Object.fromEntries(assets.map(a=>[serviceAssetKey(a),annualVehicleUsage(a)]))};
   try{sessionStorage.setItem(usageCacheKey,JSON.stringify({...readCache(),[workspace]:usageCache}))}catch{}
   onRefresh();
  }).catch(()=>{}).finally(()=>{usageRefresh=null});
 }
 function annualVehicleUsage(a){
  const today=new Date(),year=today.getFullYear(),start=new Date(year,0,1),key=serviceAssetKey(a),points=[];
  const cached=usageCache.metrics?.[key];
  const services=getServices();
  if(!services&&!usageReadings&&cached?.value!=null)return cached;
  const trailer=a.category==='Trailers',legend=isLegend(a),record=specRecord(a),usePrior=trailer||legend;
  const historyKeys=legend?['legend','makdaddylegend','makdaddy']:[clean(key)];
  const number=value=>String(value??'').trim()===''?NaN:Number(String(value).replace(/,/g,''));
  let prior;
  const add=(raw,value,service=false)=>{
   const date=ownershipDate(String(raw||'').slice(0,10)),reading=number(value);
   if(!date||date>today||!Number.isFinite(reading)||reading<0)return;
   if(date>=start)points.push({date,reading});
   else if(usePrior&&service&&(!prior||date>prior.date||(date.getTime()===prior.date.getTime()&&reading>prior.reading)))prior={date,reading};
  };
  for(const entry of (services||usageReadings||[]))if(historyKeys.includes(clean(entry.asset)))add(entry.date,entry.odometer,true);
  for(const entry of (window.FUEL_LEGACY||{})[key]?.entries||[])add(entry.date||entry.d,entry.odo??entry.o);
  const m=mileageFor(a);if(m)add(m.serviceStart,m.startMileage);
  points.sort((x,y)=>x.date-y.date||x.reading-y.reading);
  const saved=trailer?record.annualUsageBaselines?.[year]:null;
  const opening=number(saved?.reading);
  const confirmed=Number.isFinite(opening)&&opening>=0;
  const first=confirmed?{date:start,reading:opening}:points[0]?.date.getTime()===start.getTime()?points[0]:prior||points[0];
  const current=number(m?.currentMileage),latest=points[points.length-1];
  const end=Number.isFinite(current)?(trailer?current:Math.max(current,latest?.reading??current)):latest?.reading;
  const comparable=confirmed||prior||points.length>1||Number.isFinite(current);
  const value=comparable&&first&&Number.isFinite(end)&&end>=first.reading?Math.round((end-first.reading)*10)/10:null;
  const uncertain=!trailer&&(record.specs.odometerBrand==='NOT ACTUAL'||/keystonebullet/.test(clean(a.make+' '+a.model)));
  const source=confirmed?saved.source:first&&first===prior?'Latest service reading before January 1 ('+ownershipText(ownershipIso(prior.date))+')':'First available dated reading this calendar year';
  const detail=value===null?'':source+' · '+cardNumber(first.reading)+' to '+cardNumber(end)+(trailer?' tracked mi':'');
  return {year,value:uncertain?null:value,unit:usesHours(a)?'hours':'mi',date:first&&first===prior?start:first?.date,detail};
 }
 function compareVehicleUsage(a,b,metrics,yearOrder){
  if(yearOrder==='usage'){
   const x=metrics.get(a),y=metrics.get(b);
   const group=u=>u.value===null?2:u.unit==='hours'?1:0;
   const order=group(x)-group(y)||(y.value??-1)-(x.value??-1);
   if(order)return order;
  }else{
   const ay=Number.parseInt(a.year,10),by=Number.parseInt(b.year,10),ak=Number.isFinite(ay),bk=Number.isFinite(by);
   const order=ak&&bk?(yearOrder==='oldest'?ay-by:by-ay):Number(bk)-Number(ak);if(order)return order;
  }
  return String(a.make||'').localeCompare(String(b.make||''))||String(a.model||'').localeCompare(String(b.model||''));
 }
 function annualUsageLabel(u){
  const value=u.value===null?(getServices()||usageReadings||usageCache.savedAt?'Not enough comparable readings':'Pending'):u.value.toLocaleString('en-US',{maximumFractionDigits:1})+' '+u.unit;
  return '<span class="card-stat" title="'+esc(u.detail||'First available reading this calendar year through the latest recorded reading')+'">'+u.year+' use: <b>'+esc(value)+'</b></span>';
 }
 return {annualVehicleUsage,compareVehicleUsage,annualUsageLabel,refreshAnnualUsage};
}
