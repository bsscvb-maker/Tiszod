window.thMedicalFolders = (() => {
  const make = (tag,text) => {const e=document.createElement(tag);if(text!=null)e.textContent=text;return e;};
  function source(record,open,back,label='Open document'){
    const button=make('button',label);button.type='button';button.onclick=()=>open(record,back);return button;
  }
  function table(headers,rows,clickRow=true){
    const el=make('table'), head=make('thead'), body=make('tbody'), labels=make('tr');
    for(const header of headers){const th=make('th',header);th.scope='col';labels.append(th);}
    head.append(labels);el.append(head,body);
    for(const row of rows){const tr=make('tr');
      const link=clickRow&&row.find(item=>item?.tagName==='BUTTON');
      if(link){tr.classList.add('medical-click-row');tr.onclick=event=>{if(!event.target.closest('button,a'))link.click();};}
      for(const item of row){const td=make('td');if(typeof item==='string')td.textContent=item;else td.append(item);tr.append(td);}body.append(tr);}
    return el;
  }
  function injectionHistory(entries,edit) {
    const rows=(Array.isArray(entries)?entries:[]).filter(item=>/tirzepatide|zepbound/i.test(item?.product||''));
    if(!rows.length)return make('p','No recorded tirzepatide or Zepbound injections are available.');
    const minutes=time=>{
      const match=String(time||'').match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
      if(!match)return -1;
      const [,hour,minute,period]=match;
      return (period?Number(hour)%12+(period.toUpperCase()==='PM'?12:0):Number(hour))*60+Number(minute);
    };
    const area=make('div');area.className='medical-folder-table';
    area.classList.add('medical-injection-table');
    const headers=['Dose #','Date','Time (Eastern)','Product','Reported Dose','Notes'];
    if(edit)headers.push('Action');
    area.append(table(headers,
      [...rows].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||minutes(b.time)-minutes(a.time)).map(item=>
        {
          const cells=[item.doseNumber ?? '—',item.date,item.time,item.product,item.dose ?? '—',item.notes]
            .map(value=>value==null||value===''?'Not recorded':String(value));
          if(!edit)return cells;
          if(!item.dose||/^(?:missed|postponed)\b/i.test(item.notes||''))return [...cells,'—'];
          const button=make('button','Edit');
          button.type='button';
          button.setAttribute('aria-label','Edit injection '+item.date+(item.time?' '+item.time:''));
          button.onclick=()=>edit(item);
          return [...cells,button];
        }),false));
    area.tabIndex=0;
    area.setAttribute('role','region');
    area.setAttribute('aria-label','Injection history table');
    return area;
  }
  const sorted=(records,date)=>[...records].sort((a,b)=>date(b).localeCompare(date(a))||a.name.localeCompare(b.name));
  const title = name=>name.replace(/\.[^.]+$/,'').replace(/^(?:19|20)\d\d(?:[-.]\d\d){1,2}\s*[-–]\s*/,'');
  const insuranceMatchers = [
    ['UnitedHealthcare',/united\s*health\s*care|\buhc\b/i],
    ['Trustmark',/trust\s*mark/i],
    ['Blue Cross Blue Shield',/blue cross|blue shield|\bbcbs\b/i],
    ['Aetna',/aetna/i],
    ['Delta Dental',/delta dental/i],
    ['Optima',/optima/i],
    ['CVS Caremark',/caremark/i]
  ];
  const logoFiles={'Aetna':'aetna.svg','CVS Caremark':'caremark.svg','Delta Dental':'delta.png','UnitedHealthcare':'united.svg','Trustmark':'trustmark.png','Blue Cross Blue Shield':'bcbs.svg','Optima':'optima.png'};
  function carrier(record){return insuranceMatchers.find(([,pattern])=>pattern.test([record.name,...record.path].join(' ')))?.[0]||'Unsorted insurance documents';}
  function enrich(folder, options) {
    const {records,date,detail,summary,open} = options;
    const section=folder.name;
    const children=records.filter(record=>record.path[0]===folder.name || record.path[0]===folder.originalName);
    const virtual=(name,files,dashboard)=>({
      ...folder,id:folder.id+'-'+name.replace(/[^\w]+/g,'-'),name,virtualFiles:files,
      medicalArt:undefined,dashboard,hideSupporting:true
    });
    function shell(heading,description){
      const box=make('section');box.className='medical-folder-dashboard';
      box.append(make('h3',heading),make('p',description));return box;
    }
    function visionView(files,back) {
      const ordered=sorted(files,date), latest=ordered[0];
      const box=shell('Latest eyeglass prescription','Prescription details from the latest dated vision record.');
      if(!latest){box.append(make('p','No vision prescriptions were found.'));return box;}
      const rx=summary().vision?.[latest.id];
      box.append(make('p',(rx?.place||title(latest.name))+' · '+(rx?.date||date(latest)||'Date unlisted')+
        (rx?.expires?' · Expires '+rx.expires:'')));
      if(rx){
        const face=make('div');face.className='medical-vision-face';
        const diagram=make('img');diagram.src='assets/medical/eyes.svg';diagram.alt='Face shown from the front. Your right eye is on the left of the picture.';
        face.append(diagram);
        const values=make('div');values.className='medical-eye-values';
        for(const [side,sphere,add] of [['Right eye (OD)',rx.rightSphere,rx.rightAdd],['Left eye (OS)',rx.leftSphere,rx.leftAdd]]){
          const eye=make('section');eye.append(make('strong',side),make('p','Sphere '+sphere+' · Add '+add));values.append(eye);
        }
        face.append(values);box.append(face);
      }else box.append(make('p','Open the original for prescription values.'));
      box.append(source(latest,open,back,'Open latest prescription'));
      if(ordered.length>1){
        const older=make('details');older.append(make('summary','Previous prescriptions'),
          table(['Date','Prescription'],ordered.slice(1).map(record=>[date(record)||'Unlisted',source(record,open,back,title(record.name))])));
        box.append(older);
      }
      return box;
    }
    function medicationView(files,back){
      const med=sorted(files.filter(record=>record.kind==='Medication record'),date);
      const box=shell('Medication history','Newest records first. Select a medication to view the original. Schedules and duration appear when verified.');
      const injections=summary().injections||[];
      if(injections.length){
        const log=make('details');log.open=true;
        const manage=make('button','Manage injections');
        manage.type='button';
        manage.onclick=()=>thMedicalAbout.openInjectionHistory();
        log.append(make('summary','Tirzepatide / Zepbound injection log'),manage,injectionHistory(injections));
        box.append(log);
      }
      const search=make('input');search.type='search';search.placeholder='Search medications';search.setAttribute('aria-label','Search medication history');
      const area=make('div');area.className='medical-folder-table medical-medication-table';box.append(search,area);
      function show(){
        const q=search.value.trim().toLowerCase();
        const rows=med.map(record=>{
          const reviewed=detail(record);
          const label=title(record.name).replace(/^(?:(?:Kroger|Walgreens|CVS)\s*[-–]\s*)/i,'');
          const strength=label.match(/\b\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s*(?:mg|mcg|g|%)\b/i)?.[0];
          return [date(record)||'Unlisted',source(record,open,back,reviewed.label||label.replace(/\s+[-–]\s+Scan(?: \d+)?$/i,'')),reviewed.dose||strength||'Unverified',reviewed.schedule||'Unverified'];
        }).filter(row=>row[1].textContent.toLowerCase().includes(q));
        area.replaceChildren(rows.length?table(['Date','Medication','Strength','Directions / duration'],rows):make('p','No matching medication records.'));
      }
      search.oninput=show;show();return box;
    }
    function recordsView(files,heading,description,back){
      const box=shell(heading,description);
      const rows=sorted(files,date).map(record=>[date(record)||'Unlisted',source(record,open,back,title(record.name))]);
      box.append(rows.length?table(['Record date','Record'],rows):make('p','No matching records were found.'));
      return box;
    }
    if(section==='Prescriptions'){
      const vision=children.filter(record=>record.kind==='Eyeglass prescription');
      const meds=children.filter(record=>record.kind!=='Eyeglass prescription');
      return {...folder,virtualFiles:[
        {...virtual('Vision',vision,back=>visionView(vision,back)),hideSupporting:true},
        virtual('Medications',meds,back=>medicationView(meds,back))
      ]};
    }
    if(section==='Insurance'){
      const groups=new Map(insuranceMatchers.map(([name])=>[name,[]]));
      for(const record of children){const name=carrier(record);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(record);}
      const order=['UnitedHealthcare','Trustmark','Blue Cross Blue Shield','Optima','Delta Dental','Aetna','CVS Caremark','Unsorted insurance documents'];
      const rank=name=>order.includes(name)?order.indexOf(name):order.length-2;
      const carriers=[...groups].sort(([a],[b])=>rank(a)-rank(b)).filter(([name,files])=>files.length||insuranceMatchers.slice(0,4).some(([carrier])=>carrier===name)).map(([name,files])=>({
        ...virtual(name,files,back=>recordsView(files,'Coverage records','Record dates are shown below. Coverage start and end remain unverified.',back)),
        medicalLogo:Boolean(logoFiles[name]),medicalCoverImage:logoFiles[name]?'assets/medical/carriers/'+logoFiles[name]:undefined
      }));
      return {...folder,virtualFiles:[...carriers,{...folder,name:'Original folder archive'}]};
    }
    if(section==='Test Result'){
      const results=()=>children.filter(record=>!['Test order'].includes(record.kind));
      return {...folder,virtualFiles:results,hideSupporting:true,dashboard:back=>{
        const box=shell('Test results','Select a result to open its original report.');
        const list=summary().tests||[];
        const ids=new Set(list.flatMap(item=>item.ids));
        const rows=list.flatMap(item=>{
          const doc=children.find(record=>record.id===item.ids[0]);
          return doc?[[item.date,source(doc,open,back,item.name),item.result]]:[];
        });
        for(const record of sorted(results().filter(item=>!ids.has(item.id)),date)){
          rows.push([date(record)||'Unlisted',source(record,open,back,title(record.name)),'See report']);
        }
        if(rows.length)box.append(table(['Report date','Test','Result'],rows));
        const orders=children.filter(record=>record.kind==='Test order');
        if(orders.length){
          const list=make('details');list.append(make('summary','Lab orders without a linked result'),recordsView(orders,'Lab orders','These are requests for testing.',back));box.append(list);
        }
        return box;
      }};
    }
    if(section==='Billing'){
      const visible=()=>children.filter(record=>!(summary().hiddenBillingIds||[]).includes(record.id));
      return {...folder,virtualFiles:visible,hideSupporting:true,dashboard:back=>recordsView(visible(),'Billing records','Select a statement to review the original.',back)};
    }
    if(section==='Immunizations'){
      const vaccines=children.filter(record=>/vacci|immuniz|covid|booster/i.test(record.name));
      return {...folder,virtualFiles:vaccines,hideSupporting:true,dashboard:back=>{
        const doses=summary().vaccines||[];
        if(!doses.length)return recordsView(vaccines,'Immunization records','Open the card to see the doses.',back);
        const box=shell('COVID-19 vaccination history','Each documented administration is shown once. The original cards are under Supporting documents.');
        box.append(table(['Dose','Date','Vaccine','Location'],doses.map(item=>{
          const record=vaccines.find(doc=>doc.id===item.id);
          return [record?source(record,open,back,item.label):item.label,item.date,item.product,item.location];
        })));
        return box;
      }};
    }
    if(section==='Providers'){
      const groups=new Map();
      for(const record of children){
        const name=record.path[1]||'Other provider records';
        if(!groups.has(name))groups.set(name,[]);
        groups.get(name).push(record);
      }
      return {...folder,virtualFiles:[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([name,files])=>
        virtual(name,files,back=>recordsView(files,name,'Visits, correspondence, and supporting records.',back)))};
    }
    return {...folder,dashboard:back=>recordsView(children,section+' overview','Newest dated records first. Open a supporting document for full details.',back),hideSupporting:true};
  }
  return {enrich,injectionHistory};
})();
