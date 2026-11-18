/* Shared vehicle specifications for profiles and printed service references. */
(() => {
const clean = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const legendSpecs={length:'116 in',width:'52 in',height:'75 in',weight:'1,248 lb',groundClearance:'16 in',cargoBed:'500 lb',seatKit:'500 lb',payload:'500 lb',towing:'500 lb (flat ground only)',tongueWeight:'150 lb',tirePsi:'20 PSI',lugNutSize:'19 mm'};
function isLegend(a){return clean(a.make)==='makdaddy'&&clean(a.model).includes('legend')}
const reportSpecificationSeeds=[["28","2003 Trek",{"frameMaterial":"Aluminum","frameAngles":"71.5° head; 73.5° seat","wheelSize":"26\"","tirePsi":"50 PSI","fork":"RST CT-COM C4","rearShock":"Not applicable","brakeLevers":"Aluminum linear-pull","handlebar":"Aluminum, 2\" rise","stem":"Aluminum threadless","headset":"1 1/8\" threadless Aheadset","frontDerailleur":"Shimano C102","crankset":"Shimano FC-203, 28/38/48 teeth","rearDerailleur":"Shimano Alivio","pedals":"Resin"}],["4M9MGC1A8PK183129","2023 MakDaddy",{"tirePsi":"20 PSI","lugNutSize":"19 mm"}],["1HD1FCW14YY615621","2000 Harley",{"fuelEconomy":"30 city / 33 highway MPG","towing":"300 lb","fuelTank":"4.99 gal","sparkPlug":"32342-04 (Harley-Davidson)","sparkPlugGap":"Report says 0.38–0.42 in (verify before service)","oilType":"Castrol Actevo semi-synthetic 20W-50 (as reported)","primaryFluid":"1 qt 20W-50","transmissionFluid":"20–24 oz 75W-90 gear oil","crankcaseFluid":"4 qt 20W-50","oilFilter":"PH6065B","drainPlugWrench":"Report says 5/8 mm (verify units)","frontTirePsi":"36 PSI","rearTirePsi":"40 PSI","length":"97.4 in","groundClearance":"5.12 in","wheelbase":"63.5 in","seatHeight":"27.2 in","curbWeight":"848.8 lb","dryWeight":"760.6 lb"}],["L9NLTNBJ3R1805653","2024 Coleman",{"tirePsi":"10 PSI (model title)","manufacturer":"Champion Motorsports Group","brand":"Coleman Powersports","itemWeight":"154 lb","productDimensions":"63.5 × 29.5 × 36 in","partNumber":"B200","startingMethod":"Recoil pull start"}],["54","2010 Coolster",{"tirePsi":"10 PSI (model title)"}],["SE09","2019 DeWALT",{"sparkPlug":"NGK BPR6ES","sparkPlugGap":"Report says .08 mm (.032 in); verify units","oilType":"SAE 10W-30","oilCapacity":"Check gray filler level","oilFilter":"N/A","drainPlugWrench":"10 mm crescent","tirePsi":"30 PSI","fuelTank":"Capacity unspecified in report"}],["SE21","2026 Husqvarna",{"engineFamily":"28 cc, 2-cycle","productDimensions":"20 in straight shaft","partNumber":"970545002","additionalDetails":"Husqvarna 330LK gas string trimmer with Rapid Replace head; listed as 330LX in report."}],["SE22","2026 Stihl",{"engineSerial":"287370268","manufactured":"August 2016 (date code 1699; report lists vehicle year 2026)","engineFamily":"41.4 cc two-stroke (as reported)","cuttingHead":"Stihl AutoCut 25-2 factory bump-feed head for FS 56 RC-E"}],["JTEBU5JR3L5808983","2020 Toyota",{"tirePsi":"36 PSI (notes; model title says 32 PSI)","lugNutSize":"Unknown (XX mm in report)","lugNutTorque":"Unknown (XX lb in report)"}],["1A8HX58N88F122005","2008 Chrysler",{"tirePsi":"33 PSI (model title)"}],["SE19","2021 Husqvarna",{"engineModel":"KT735-3090; 24 HP KOH; 48 in deck","engineSerial":"5110315383","productNumber":"960 43 03-30","productSerial":"042021A002186","dumpCartModel":"Y10 cu ft poly swivel dump cart","dumpCartProduct":"588 20 88-02","dumpCartSerial":"020120B27669","towing":"500 lb","fuelTank":"2.5 gal","sparkPlugGap":"Report says 0.030 mm (0.762 in); verify units","oilType":"SAE 30","oilCapacity":"2 qt / 1.9 L","drainPlugWrench":"7/16 in box wrench","frontTirePsi":"14 PSI","rearTirePsi":"10 PSI"}],["4YDT33126LT434476","2020 Keystone",{"tirePsi":"65 PSI","spareTirePsi":"65 PSI","lugNutSize":"Unknown (XX mm in report)","lugNutTorque":"Unknown (XX lb in report)"}],["2SSUBE1A1MB148250","2021 Stirling",{"tirePsi":"50 PSI","lugNutSize":"21 mm","gvwr":"2,720 lb"}],["3C63RRRL1KG580434","2019 Ram",{"frontTirePsi":"80 PSI (model title)","rearTirePsi":"65 PSI (model title)"}],["F15HNY31828","1977 Ford",{"tirePsi":"32 PSI (model title)"}],["1FAFP40604F200855","2004 Ford",{"tirePsi":"32 PSI (model title)"}]];
function reportSpecificationSeed(a){
 const vin=clean(a.vin),number=String(a.vehicleNumber||a.reportId||'').toLowerCase(),identity=String(a.year)+' '+a.make;
 return (reportSpecificationSeeds.find(([id])=>vin&&clean(id)===vin)||reportSpecificationSeeds.find(([id,name])=>id.toLowerCase()===number&&number)||[]) [2]||{};
}
function specRecord(a){
 const raw=String(a.reportNotes||'');let saved={};
 if(raw.trim().startsWith('{'))try{const parsed=JSON.parse(raw);if(parsed&&parsed.type==='vehicle-quick-specs-v1')saved=parsed}catch(_){}
 const specs={...(isLegend(a)?legendSpecs:{}),...reportSpecificationSeed(a),...partsAndFluidsDefaults(a),...(saved.specs||{}),...window.TiszodSmallEngineOil?.defaults(a)};
 if(!saved.specs){const psi=raw.match(/Tire\s*PSI\s*[:\s]*([\d.]+)\s*(?:lbs?|psi)?/i),lug=raw.match(/Lug\s*Nut\s*Size\s*[:\s]*([\d.]+)\s*mm/i);if(psi)specs.tirePsi=psi[1]+' PSI';if(lug)specs.lugNutSize=lug[1]+' mm'}
 return {...saved,type:'vehicle-quick-specs-v1',specs,legacyNotes:saved.legacyNotes??(saved.type?'':raw)};
}

const cardOilSpecs={
 '2020toyota4runner':['0W-20','6.6 qt','Toyota 04152-YZZA5'],
 '2019ram3500':['10W-30 diesel (API CK-4)','12.0 qt','Mopar 5083285AA'],
 '2004fordmustang':['5W-20','5.0 qt','Motorcraft FL-400S'],
 '2012hondacivic':['0W-20','3.9 qt','Honda 15400-PLM-A02'],
 '2016buickenclave':['5W-30','6.0 qt','ACDelco PF63E'],
 '1977fordf150':['10W-30','6 qt','Motorcraft FL-1A'],
 '2008chrysleraspen':['5W-20','6 qt (4.7L) / 7 qt (5.7L)','Mopar 5281090']
};
const motorcycleOilSpecs={
 '1HD1FCW14YY615621':['H-D 360 20W-50 · 62600007','3.5 qt','Harley-Davidson 63798-99B (chrome)','75W-90 gear oil · 20–24 fl oz','20W-50 · 32 fl oz (dry capacity)'],
 '1HD1KZF15PB653889':['H-D SYN-BLEND 15W-50 · 62600151','4.75 qt','Harley-Davidson 62700296A (black)','H-D Formula+ (62600004) · 28 fl oz','H-D Formula+ (62600004) · 30 fl oz']
};
function oilServiceFor(a){
 const key=clean([a.year,a.make,a.model].join(' '));
 const entry=motorcycleOilSpecs[String(a.vin||'').trim().toUpperCase()]||Object.entries(cardOilSpecs).find(([model])=>key.startsWith(model))?.[1];
 if(!entry)return null;
 const [type,amount,filterSpec,transmission,primary]=entry;
 const separator=filterSpec.indexOf(' ');
 const manufacturer=filterSpec.slice(0,separator);
 const filter=filterSpec.slice(separator+1);
 const engine=clean(a.engine);
 const capacity=key.startsWith('2008chrysleraspen')?(engine.includes('47l')?'6 qt':engine.includes('57l')?'7 qt':amount):amount;
 return {type,capacity,manufacturer,filter,transmission,primary};
}
function partsAndFluidsDefaults(a){
 const service=oilServiceFor(a);
 const {type,capacity,manufacturer,filter,transmission,primary}=service||{};
 const specs=service?{oilType:type,oilCapacity:capacity,oilFilter:manufacturer+' '+filter}:{};
 const model=clean([a.year,a.make,a.model].join(' '));
 if(model.startsWith('2020toyota4runner'))specs.frontBrakeParts='Toyota 04465-35330';
 if(model.startsWith('2012hondacivic'))specs.batteryPart='Advance Auto Parts 51RAGM';
 if(model.startsWith('2019ram3500'))specs.frontWipers='FS22 × 2 (Advance Auto warranty receipt)';
 if(model.startsWith('1999chevrolettahoe'))Object.assign(specs,{frontWipers:'XtraClear XQ18 × 2',rearWiper:'Bosch 40513',sparkPlug:'ACDelco R44LTS6 × 8'});
 if(transmission)Object.assign(specs,{transmissionFluid:transmission,primaryFluid:primary,drainPlugOring:'Harley-Davidson 11105 (1)'});
 if(String(a.vin||'').trim().toUpperCase()==='1HD1FCW14YY615621')specs.airFilter='Harley-Davidson 29462-99';
 return specs;
}
window.TiszodVehicleSpecs = {specRecord, oilServiceFor, isLegend};
})();
