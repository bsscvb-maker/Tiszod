(() => {
  const day = 86400000;
  const prettyDate = (time, options) => new Intl.DateTimeFormat('en-US', {timeZone:'UTC',...options}).format(time);
  const number = value => Number(value.toFixed(1)).toLocaleString('en-US');
  function merge(history, manual) {
    const rows = new Map(history.map(row=>[row.time,row]));
    for (const row of Array.isArray(manual) ? manual : []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || row.unit !== 'lb' || !Number.isFinite(row.weight) || row.weight <= 0) continue;
      const time = Number.isFinite(row.time) ? row.time : Date.parse(row.date+'T00:00:00Z');
      if (Number.isFinite(time)) rows.set(time,{...row,time});
    }
    return [...rows.values()].sort((a,b)=>a.time-b.time).map(row=>row.unit==='kg'?{...row,weight:row.weight*2.2046226218,unit:'lb'}:row);
  }
  function geometry(rows,width,height,padding) {
    const {left,right,top,bottom} = padding;
    const first = rows[0], last = rows.at(-1);
    const min = Math.min(...rows.map(row=>row.weight)), max = Math.max(...rows.map(row=>row.weight));
    const step = [2,5,10,20,25,50,100].find(value=>value >= (max-min)/5) || Math.ceil((max-min)/500)*100;
    const floor = Math.floor((min-1)/step)*step, ceiling = Math.ceil((max+1)/step)*step;
    const x = row => first.time === last.time ? (left+width-right)/2 : left+(row.time-first.time)/(last.time-first.time)*(width-left-right);
    const y = value => top+(ceiling-value)/(ceiling-floor)*(height-top-bottom);
    const segments = [];
    for (const row of rows) {
      const previous = segments.at(-1)?.at(-1);
      if (!previous || row.time-previous.time > 45*day) segments.push([]);
      segments.at(-1).push(row);
    }
    const ticks = Array.from({length:Math.round((ceiling-floor)/step)+1},(_,i)=>floor+i*step);
    return {first,last,min,max,x,y,segments,ticks};
  }
  function render(target, rows, days) {
    target.replaceChildren();
    if (!rows.length) {target.textContent='No dated weigh-ins are available.';return;}
    const latest = rows.at(-1);
    const points = days ? rows.filter(row=>row.time>=latest.time-days*day) : rows;
    const w = Math.max(300,Math.min(920,target.clientWidth||820)), h = w<480?250:320;
    const pad = {left:44,right:21,top:20,bottom:34};
    const g = geometry(points,w,h,pad), {first,last,x,y} = g;
    const delta = last.weight-first.weight, known = first.unit && last.unit;
    const cards = document.createElement('div');cards.className='weight-scorecard';
    for (const [label,value,detail] of [
      ['Latest weigh-in',number(last.weight)+(last.unit?' '+last.unit:''),prettyDate(last.time,{dateStyle:'medium'})+(last.source?' · '+last.source:'')],
      ['Change in range',points.length<2?'—':(delta>0?'+':'')+number(delta)+(known?' lb':''),known?'First to latest reading':'Workbook units unlisted'],
      ['Recorded readings',String(points.length),prettyDate(first.time,{dateStyle:'medium'})+' to '+prettyDate(last.time,{dateStyle:'medium'})]
    ]) {
      const card=document.createElement('div'), caption=document.createElement('span'), amount=document.createElement('strong'), note=document.createElement('small');
      caption.textContent=label; amount.textContent=value; note.textContent=detail; card.append(caption,amount,note);cards.append(card);
    }
    target.append(cards);
    const svgNode = (name,attrs={},label) => {
      const element = document.createElementNS('http://www.w3.org/2000/svg',name);
      for (const [key,value] of Object.entries(attrs)) element.setAttribute(key,value);
      if (label!=null) element.textContent=label;
      return element;
    };
    const svg = svgNode('svg',{viewBox:`0 0 ${w} ${h}`,class:'weight-plot',role:'img','aria-label':'Recorded weight history. Latest '+number(last.weight)+' '+(last.unit||'unit unlisted')+'.'});
    for (const tick of g.ticks) {
      svg.append(svgNode('line',{x1:pad.left,x2:w-pad.right,y1:y(tick),y2:y(tick),class:'weight-grid'}));
      svg.append(svgNode('text',{x:pad.left-7,y:y(tick)+4,'text-anchor':'end'},number(tick)));
    }
    const count = first.time===last.time?1:w<480?3:5;
    for (let i=0;i<count;i++) {
      const time=first.time+(last.time-first.time)*i/Math.max(1,count-1);
      svg.append(svgNode('text',{x:x({time}),y:h-9,'text-anchor':count===1?'middle':i===0?'start':i===count-1?'end':'middle'},prettyDate(time,{month:'short',day:'numeric'})));
    }
    const defs=svgNode('defs'), gradient=svgNode('linearGradient',{id:'medical-weight-fill',x1:'0',x2:'0',y1:'0',y2:'1'});
    gradient.append(svgNode('stop',{offset:'0%', 'stop-color':'#35d6b1','stop-opacity':'.30'}),svgNode('stop',{offset:'100%','stop-color':'#35d6b1','stop-opacity':'.02'}));
    defs.append(gradient);svg.append(defs);
    for (let i=1;i<g.segments.length;i++) {
      const from=g.segments[i-1].at(-1), to=g.segments[i][0];
      svg.append(svgNode('line',{x1:x(from),y1:y(from.weight),x2:x(to),y2:y(to.weight),stroke:'#75b9af','stroke-width':2,'stroke-dasharray':'6 5'}));
    }
    for (const segment of g.segments) {
      const coords=segment.map(row=>[x(row),y(row.weight)].join(',')).join(' ');
      if (segment.length>1) svg.append(
        svgNode('polygon',{points:`${x(segment[0])},${h-pad.bottom} ${coords} ${x(segment.at(-1))},${h-pad.bottom}`,fill:'url(#medical-weight-fill)'}),
        svgNode('polyline',{points:coords,class:'weight-line'})
      );
      for (const row of segment) {
        const dot=svgNode('circle',{cx:x(row),cy:y(row.weight),r:row===last?6:segment.length===1?4:2,class:row===last?'weight-latest':'weight-dot'});
        dot.append(svgNode('title',{},row.date+' · '+number(row.weight)+' '+(row.unit||'(unit unlisted)')));svg.append(dot);
      }
    }
    target.append(svg);
    const note=document.createElement('p');note.className='weight-note';
    note.textContent=(g.segments.length>1?'Dashed lines connect readings more than 45 days apart. ':'')+
      (points.some(row=>!row.unit)?'Historical workbook readings have no unit label. Values are plotted as recorded.':'Weights shown in pounds.');
    target.append(note);
  }
  function download(rows) {
    if (!rows.length) return;
    const g=geometry(rows,612,440,{left:55,right:48,top:75,bottom:45}), y=v=>440-g.y(v);
    const label=(x,y,size,text)=>`BT /F1 ${size} Tf ${x} ${y} Td (${text.replace(/[()\\]/g,'\\$&')}) Tj ET\n`;
    let stream='0.08 0.16 0.22 rg\n'+label(48,390,25,'Body Composition - Weight History')+
      label(48,366,11,'Latest: '+number(g.last.weight)+' '+(g.last.unit||'(unit unlisted)')+'  |  '+g.last.date)+
      label(48,347,10,g.first.date+' to '+g.last.date+'  |  '+rows.length+' recorded readings');
    for (const tick of g.ticks) stream+='0.80 0.86 0.89 RG 0.5 w '+`55 ${y(tick)} m 564 ${y(tick)} l S\n`+label(25,y(tick)-3,8,number(tick));
    for (let i=1;i<g.segments.length;i++) {
      const from=g.segments[i-1].at(-1), to=g.segments[i][0];
      stream+=`0.32 0.54 0.51 RG 1 w [6 5] 0 d ${g.x(from)} ${y(from.weight)} m ${g.x(to)} ${y(to.weight)} l S [] 0 d\n`;
    }
    for (const segment of g.segments) {
      stream+='0.04 0.45 0.39 RG 2 w '+segment.map((r,i)=>`${g.x(r).toFixed(2)} ${y(r.weight).toFixed(2)} ${i?'l':'m'}`).join(' ')+' S\n';
      for(const row of segment) if(segment.length===1||row===g.last) stream+=`${g.x(row)-2} ${y(row.weight)-2} 4 4 re f\n`;
    }
    stream+=label(48,22,9,rows.some(row=>!row.unit)?'Historical workbook units unlisted. Dashed lines mark gaps over 45 days.':'Weights in pounds. Dashed lines mark gaps over 45 days.');
    const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 440] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}endstream`];
    let file='%PDF-1.4\n';const offsets=[];
    for(const [i,object] of objects.entries()){offsets.push(file.length);file+=`${i+1} 0 obj\n${object}\nendobj\n`;}
    const start=file.length;
    file+='xref\n0 6\n0000000000 65535 f \n'+offsets.map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
    const url=URL.createObjectURL(new Blob([file],{type:'application/pdf'})), link=document.createElement('a');
    link.href=url;link.download='Body Composition - Weight History.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  window.thMedicalWeightChart={merge,render,download};
})();
