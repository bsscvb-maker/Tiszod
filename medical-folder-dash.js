window.thMedicalFolders = (() => {
  const make = (tag,text) => {const e=document.createElement(tag);if(text!=null)e.textContent=text;return e;};
  function source(record,open,back,label='Open document'){
    const button=make('button',label);button.type='button';button.onclick=()=>open(record,back);return button;
  }
  function table(headers,rows){
    const el=make('table'), head=make('thead'), body=make('tbody'), labels=make('tr');
    for(const header of headers){const th=make('th',header);th.scope='col';labels.append(th);}
    head.append(labels);el.append(head,body);
    for(const row of rows){const tr=make('tr');for(const item of row){const td=make('td');if(typeof item==='string')td.textContent=item;else td.append(item);tr.append(td);}body.append(tr);}
    return el;
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
  function carrier(record){return insuranceMatchers.find(([,pattern])=>pattern.test([record.name,...record.path].join(' ')))?.[0]||'Other insurance records';}
  function enrich(folder, options) {
    const {records,date,detail,summary,open} = options;
    const section=folder.name;
    const children=records.filter(record=>record.path[0]===folder.name || record.path[0]===folder.originalName);
    const virtual=(name,files,dashboard,art)=>({
      ...folder,id:folder.id+'-'+name.replace(/[^\w]+/g,'-'),name,virtualFiles:files,
      medicalArt:art||folder.medicalArt,dashboard,hideSupporting:true
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
        box.append(table(['Eye','Sphere','Add'],[['Right',rx.rightSphere,rx.rightAdd],['Left',rx.leftSphere,rx.leftAdd]]));
      }else box.append(make('p','Open the original for prescription values.'));
      box.append(source(latest,open,back,'Open latest prescription'));
      if(ordered.length>1){
        const older=make('details');older.append(make('summary','Previous prescriptions'),
          table(['Date','Record','Source'],ordered.slice(1).map(record=>[date(record)||'Unlisted',title(record.name),source(record,open,back)])));
        box.append(older);
      }
      return box;
    }
    function medicationView(files,back){
      const med=sorted(files.filter(record=>record.kind==='Medication record'),date);
      const box=shell('Medication history','Newest records first. Strengths may come from filenames. Schedules and duration are shown when documented in a review.');
      const search=make('input');search.type='search';search.placeholder='Search medications';search.setAttribute('aria-label','Search medication history');
      const area=make('div');area.className='medical-folder-table';box.append(search,area);
      function show(){
        const q=search.value.trim().toLowerCase();
        const rows=med.map(record=>{
          const reviewed=detail(record);
          const label=title(record.name).replace(/^(?:(?:Kroger|Walgreens|CVS)\s*[-–]\s*)/i,'');
          const strength=label.match(/\b\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s*(?:mg|mcg|g|%)\b/i)?.[0];
          return [date(record)||'Unlisted',reviewed.label||label.replace(/\s+[-–]\s+Scan(?: \d+)?$/i,''),reviewed.dose||strength||'See source',reviewed.schedule||'See source',source(record,open,back)];
        }).filter(row=>row[1].toLowerCase().includes(q));
        area.replaceChildren(rows.length?table(['Date','Medication','Strength','Directions / duration','Source'],rows):make('p','No matching medication records.'));
      }
      search.oninput=show;show();return box;
    }
    function recordsView(files,heading,description,back){
      const box=shell(heading,description);
      const rows=sorted(files,date).map(record=>[date(record)||'Unlisted',title(record.name),source(record,open,back)]);
      box.append(rows.length?table(['Record date','Record','Source'],rows):make('p','No matching records were found.'));
      return box;
    }
    if(section==='Prescriptions'){
      const vision=children.filter(record=>record.kind==='Eyeglass prescription');
      const meds=children.filter(record=>record.kind!=='Eyeglass prescription');
      return {...folder,virtualFiles:[
        {...virtual('Vision',vision,back=>visionView(vision,back),'vision'),hideSupporting:true},
        virtual('Medications',meds,back=>medicationView(meds,back),'prescriptions')
      ]};
    }
    if(section==='Insurance'){
      const groups=new Map(insuranceMatchers.slice(0,4).map(([name])=>[name,[]]));
      for(const record of children){const name=carrier(record);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(record);}
      const carriers=[...groups].map(([name,files])=>virtual(name,files,back=>recordsView(files,'Coverage records',
        'Coverage start and end are unverified. Dates below identify records; an ID card, claim, or authorization date may differ from policy dates.',back),'insurance'));
      return {...folder,virtualFiles:[...carriers,{...folder,name:'Original insurance folders'}],
        dashboard:back=>{
          const box=shell('Insurance by carrier','Open a carrier to see the evidence. Coverage start and end require a policy or eligibility record that confirms those dates.');
          box.append(table(['Carrier','Coverage start','Coverage end','Evidence'],carriers.map(item=>[
            item.name,'Unverified','Unverified',source(item,open,back,item.virtualFiles.length+' records')
          ])));return box;
        }};
    }
    if(section==='Immunizations'){
      const vaccines=children.filter(record=>/vacci|immuniz|covid|booster/i.test(record.name));
      return {...folder,dashboard:back=>recordsView(vaccines,'Immunization records',
        'Card dates are shown as recorded in the file index. Several cards may show the same doses; open the source to check dose dates and manufacturer.',back),hideSupporting:true};
    }
    return {...folder,dashboard:back=>recordsView(children,section+' overview','Newest dated records first. Open a supporting document for full details.',back),hideSupporting:true};
  }
  return {enrich};
})();
