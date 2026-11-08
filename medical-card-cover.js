(() => {
 const emblems=[
  'M0-30V29M-11-25Q8-35 16-21T-5-7T-11 9T10 15T0 29',
  'M0-35 7-10 32 0 7 7 0 34-8 7-32 0-8-10Z',
  'M13-28A31 31 0 1 0 25 20A27 27 0 0 1 13-28Z',
  'M0-33 23-14 19 12Q15 25 0 34Q-15 25-19 12L-23-14Z M0-16v32m-15-16h30',
  'M0 29V-25m0 24q20-29 29-12-2 18-29 21m0-4q-23-27-29-10 1 19 29 20'
 ];
 window.thMedicalCardCover=record=>{
  const key=JSON.stringify([record.coverPath,record.path,record.id,record.name]);
  let seed=2166136261;
  for(const char of key)seed=Math.imul(seed^char.codePointAt(0),16777619)>>>0;
  const next=max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*max);};
  const hue=next(360), angle=next(37)-18, x=134+next(53), y=19+next(10), width=144+next(43);
  const gold='hsl('+ (33+next(19)) +' 72% 71%)';
  const emblem=emblems[next(emblems.length)];
  const stars=Array.from({length:13},()=>'<circle cx="'+next(480)+'" cy="'+next(270)+'" r="'+(.7+next(3)/2)+'"/>').join('');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270"><defs><radialGradient id="l"><stop stop-color="hsl('+hue+' 29% 34%)"/><stop offset="1" stop-color="#101821"/></radialGradient><linearGradient id="b"><stop stop-color="hsl('+hue+' 42% 17%)"/><stop offset="1" stop-color="hsl('+hue+' 40% 31%)"/></linearGradient></defs><path fill="url(#l)" d="M0 0h480v270H0z"/><g fill="'+gold+'" opacity=".6">'+stars+'</g><g transform="translate('+x+' '+y+') rotate('+angle+' 80 111)"><rect x="7" y="8" width="'+width+'" height="222" rx="10" fill="#070d12" opacity=".76"/><rect x="4" y="4" width="'+width+'" height="221" rx="9" fill="#c8b68a"/><rect width="'+width+'" height="211" rx="8" fill="url(#b)" stroke="#101821" stroke-width="3"/><g fill="none" stroke="'+gold+'"><rect x="16" y="12" width="'+(width-26)+'" height="185" rx="6"/><rect x="22" y="18" width="'+(width-38)+'" height="173" rx="4" opacity=".54"/><path d="M11 2v206m22-169h20m-20 137h20"/><g transform="translate('+Math.round(width*.55)+' 105)"><circle r="43" opacity=".74"/><circle r="37" stroke-dasharray="1 4"/><path d="'+emblem+'" stroke-width="2"/></g></g></g></svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 };
})();
