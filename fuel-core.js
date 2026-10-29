(function(root){
 'use strict';
 const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const merchant=s=>normalize(s).replace(/^seveneleven/,'7eleven').replace(/gas|petroleum|fuel|\d{4,}/g,'');
 const number=s=>Number(String(s??'').replace(/[$,\s]/g,''));
 function parseReceipt(text){
  const out={},s=text.replace(/\r/g,'');
  const date=s.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/);
  if(date)out.date=`${date[3]}-${date[1].padStart(2,'0')}-${date[2].padStart(2,'0')}`;
  const fuel=s.match(/([\d.,]+)\s*GAL(?:LONS)?\b[^\n]*?@\s*\$?\s*([\d.,]+)/i);
  if(fuel){out.gallons=number(fuel[1]);out.price=number(fuel[2]);}
  const total=s.match(/(?:FUEL\s+TOTAL|TOTAL\s+FUEL|SALE\s+TOTAL|GRAND\s+TOTAL|TOTAL)\s*[:$]?\s*\$?\s*(\d+[.,]\d{2})\b/i);
  if(total)out.total=number(total[1].replace(',','.'));
  if(!out.total&&out.gallons&&out.price)out.total=Math.round(out.gallons*out.price*100)/100;
  const known=s.match(/7[\s-]*ELEVEN|WAWA|SHELL|EXXON|MARATHON|CHEVRON|SUNOCO|COSTCO|KROGER|CIRCLE\s*K|SPEEDWAY|MOBIL|BP\b/i);
  if(known)out.station=/7[\s-]*ELEVEN/i.test(known[0])?'7-Eleven':known[0];
  const receipt=s.match(/(?:RECEIPT|TRANS(?:ACTION)?)\s*#?\s*:?\s*([A-Z0-9-]+)/i);if(receipt)out.receipt=receipt[1];
  const card=s.match(/[*xX•]{3,}\s*(\d{4})\b/);if(card)out.card=card[1];
  const lines=s.split('\n');const address=lines.find(l=>/^\s*\d{2,6}\s+[A-Z].*\b(?:RD|ROAD|ST|STREET|DR|DRIVE|BLVD|HWY|PKWY|AVE|AVENUE)\b/i.test(l));if(address)out.location=address.trim();
  return out;
 }
 function parseOdometer(text){
  const candidates=String(text).match(/\b\d{1,3}(?:,\d{3})+(?:\.\d)?\b|\b\d{4,7}(?:\.\d)?\b/g)||[];
  return candidates.map(number).filter(n=>n>0&&n<2000000);
 }
 function validate(e){
  if(!e.vehicle)throw Error('Choose a vehicle.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||new Date(e.date+'T12:00:00Z').toISOString().slice(0,10)!==e.date)throw Error('Choose a valid purchase date.');
  for(const [key,label] of [['odo','Odometer'],['gallons','Gallons'],['price','Price per gallon'],['total','Total paid']])if(!Number.isFinite(e[key])||e[key]<(key==='odo'?0:0.001))throw Error('Enter a valid '+label.toLowerCase()+'.');
  if(!e.station.trim())throw Error('Enter the station name.');
  if(!e.account.trim())throw Error('Choose or enter the payment account.');
  if(!['yes','no','unknown'].includes(e.full))throw Error('Choose whether the tank was filled.');
  if(Math.abs(e.gallons*e.price-e.total)>Math.max(1,e.total*.05))throw Error('Gallons × price does not match the total. Correct the numbers before saving.');
  return e;
 }
 function candidates(e,rows){return rows.filter(x=>!['void','voided','deleted'].includes(String(x.r[9]).toLowerCase())&&Math.abs(number(x.r[8])-e.total)<.005&&merchant(x.r[3]).includes(merchant(e.station))&&merchant(e.station).length>=2&&Math.abs(new Date(x.r[1])-new Date(e.date))<=3*86400000);}
 function records(entries){
  const a=entries.filter(e=>!e.deleted).slice().sort((a,b)=>a.odo-b.odo||a.date.localeCompare(b.date));let previous=null,baseline=null,volume=0,unknown=false;
  return a.map(e=>{const miles=previous?e.odo-previous.odo:null;volume+=e.gallons;if(e.full==='unknown')unknown=true;let mpg=null,flag=!!e.flag;
   if(e.full==='yes'){if(baseline&&!unknown&&e.odo>baseline.odo){mpg=(e.odo-baseline.odo)/volume;if(mpg>80)flag=true;}baseline=e;volume=0;unknown=false;}
   previous=e;return {...e,miles,mpg,flag};});
 }
 const uuid=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
 const api={uuid,normalize,merchant,number,parseReceipt,parseOdometer,validate,candidates,records};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FuelCore=api;
})(typeof window==='undefined'?globalThis:window);
