/* Read just the dated weight columns from the signed-in Excel source. */
async function readMedicalWeights(buffer) {
  const view = new DataView(buffer), text = new TextDecoder();
  const signature = (offset, value) => offset >= 0 && offset+4 <= view.byteLength && view.getUint32(offset,true) === value;
  let end = buffer.byteLength-22;
  while (end >= Math.max(0,buffer.byteLength-65557) && !signature(end,0x06054b50)) end--;
  if (!signature(end,0x06054b50)) throw new Error('The workbook is not an Excel ZIP file.');
  const entries = new Map();
  let position = view.getUint32(end+16,true);
  for (let i=0; i<view.getUint16(end+10,true); i++) {
    if (!signature(position,0x02014b50)) throw new Error('Excel ZIP directory is incomplete.');
    const nameSize = view.getUint16(position+28,true);
    const name = text.decode(new Uint8Array(buffer,position+46,nameSize));
    entries.set(name, {method:view.getUint16(position+10,true), size:view.getUint32(position+20,true),
      expanded:view.getUint32(position+24,true), offset:view.getUint32(position+42,true)});
    position += 46+nameSize+view.getUint16(position+30,true)+view.getUint16(position+32,true);
  }
  async function xml(name) {
    const item = entries.get(name);
    if (!item) return null;
    if (item.expanded > 35*1024*1024 || !signature(item.offset,0x04034b50)) throw new Error('Unsupported workbook entry.');
    const start = item.offset+30+view.getUint16(item.offset+26,true)+view.getUint16(item.offset+28,true);
    const bytes = new Uint8Array(buffer,start,item.size);
    if (item.method !== 0 && item.method !== 8) throw new Error('Unsupported workbook compression.');
    const decoded = item.method === 0 ? text.decode(bytes) :
      await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    const doc = new DOMParser().parseFromString(decoded,'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid workbook XML.');
    return doc;
  }
  const tags = (element, name) => [...(element?.getElementsByTagNameNS('*',name) || [])];
  const sheets = await xml('xl/workbook.xml');
  const date1904 = ['1','true'].includes(tags(sheets,'workbookPr')[0]?.getAttribute('date1904'));
  const shared = tags(await xml('xl/sharedStrings.xml'),'si').map(item=>tags(item,'t').map(t=>t.textContent).join(''));
  const dateColumn = /^(date(?: and time|\/time| time)?|time|timestamp|measurement (?:date|time)|time of measurement|recorded at)(?:\b|$)/i;
  const weightColumn = /^(?:body )?weight(?:\s*[(\[\s]*(?:kg|lb|lbs|pounds|kilograms)[)\]]*)?$/i;
  const startDate = Date.UTC(1980,0,1), latestDate = Date.now()+86400000;
  function dateValue(raw) {
    const number = Number(raw);
    if (raw && Number.isFinite(number) && number > 25000 && number < 65000) {
      return (number+(date1904 ? 1462 : 0)-25569)*86400000;
    }
    return raw ? Date.parse(raw) : NaN;
  }
  const series = [];
  for (const name of [...entries.keys()].filter(k=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k))) {
    const doc = await xml(name);
    let dateCol, weightCol, unitCol, unit;
    const readings = [];
    for (const row of tags(doc,'row')) {
      const values = Object.fromEntries(tags(row,'c').map(cell=>{
        const col = cell.getAttribute('r')?.match(/^[A-Z]+/)?.[0];
        const raw = tags(cell,'v')[0]?.textContent ?? '';
        const type = cell.getAttribute('t');
        return [col,type === 's' ? shared[Number(raw)] : type === 'inlineStr' ? tags(cell,'t').map(t=>t.textContent).join('') : raw];
      }));
      if (!weightCol) {
        const cols = Object.keys(values);
        dateCol = cols.find(col=>dateColumn.test(String(values[col]).trim()));
        weightCol = cols.find(col=>weightColumn.test(String(values[col]).trim()));
        if (!dateCol || !weightCol) {weightCol = undefined; continue;}
        unitCol = cols.find(col=>/^(?:weight )?units?$/i.test(String(values[col]).trim()));
        const header = String(values[weightCol]);
        unit = /kg|kilogram/i.test(header) ? 'kg' : /lbs?|pound/i.test(header) ? 'lb' : '';
        continue;
      }
      const time = dateValue(values[dateCol]);
      const raw = String(values[weightCol] ?? '').trim();
      const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*(kg|lb|lbs)?$/i);
      const weight = match ? Number(match[1].replace(',','.')) : NaN;
      const rowUnit=String(values[unitCol]||'').trim();
      const measured=match?.[2]?.toLowerCase().replace('lbs','lb')
        || (/^(?:kg|kilograms?)$/i.test(rowUnit)?'kg':/^(?:lbs?|pounds?)$/i.test(rowUnit)?'lb':unit);
      if (!Number.isFinite(time) || time<startDate || time>latestDate || !(weight>0)) continue;
      readings.push({time,weight,unit:measured,date:new Date(time).toISOString().slice(0,10)});
    }
    if (readings.length) series.push(readings);
  }
  const known=series.flat().filter(row=>row.unit);
  const rows=known.length?known:(series.sort((a,b)=>b.length-a.length)[0]||[]);
  return [...new Map(rows.map(row=>[row.time,row])).values()].sort((a,b)=>a.time-b.time);
}
