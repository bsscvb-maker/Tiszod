(() => {
 const people = new Set(['Todd','Tracy','Aiden','Alexis','Zach']);
 const themes = [
  [/prescription|medication/i,'assets/medical/prescriptions.webp','assets/family-unique/prescription.webp'],
  [/immun|vaccin/i,'assets/medical/immunizations.webp','assets/family-unique/vaccination.webp'],
  [/dental/i,'assets/medical/dental.webp','assets/family-unique/dental.webp'],
  [/vision|eyeglass/i,'assets/medical/vision.webp','assets/family-unique/vision.webp'],
  [/lab|screening|test result/i,'assets/medical/labs.webp','assets/family-unique/medical-lab.webp','assets/family-unique/radiographs.webp'],
  [/bill|receipt|payment/i,'assets/medical/billing.webp','assets/medical/claims.webp'],
  [/insurance|coverage/i,'assets/medical/insurance.webp','assets/medical/coverage.webp','assets/family-unique/coverage.webp'],
  [/provider|visit|care team/i,'assets/medical/providers.webp','assets/family-unique/therapy.webp'],
  [/weight|composition/i,'assets/medical/weight.webp'],
  [/timeline|history/i,'assets/medical/timeline.webp','assets/medical/history.webp'],
  [/admin|quarantine|archive/i,'assets/family-unique/archive-boxes.webp','assets/career/folders/iqvia-boxed-archive.jpg'],
  [/medical|health|about me/i,'assets/family-unique/health-forms.webp','assets/medical/notes.webp']
 ];
 const extras = [
  'assets/medical/plans.webp','assets/family-unique/mri.webp','assets/family-unique/scanner.webp',
  'assets/family-unique/folders.webp','assets/career/folders/pc-forms.webp','assets/career/folders/verification.webp',
  'assets/career/folders/shop-paperwork.webp','assets/career/folders/onboarding.webp',
  'assets/career/folders/iqvia-archive-benefits.jpg','assets/career/folders/resume-planning.jpg'
 ];
 const assigned = new Map(), used = new Set();
 window.thMedicalCardCover = record => {
  const path = record.coverPath;
  if (path?.[0] === 'medical' && path.length === 2 && people.has(path[1])) {
   return 'assets/medical/person-cover-'+path[1].toLowerCase()+'.jpg';
  }
  const key = record.id || record.readerUrl || JSON.stringify(path || [record.name]);
  if (assigned.has(key)) return assigned.get(key);
  const topical = themes.filter(([pattern])=>pattern.test(record.name)).flatMap(([, ...photos])=>photos);
  const alternatives = record.folder || record.directReader ? extras : [];
  const fallback = record.folder || record.directReader ? themes.flatMap(([, ...photos])=>photos) : [];
  const candidates = [
   ...(record.medicalArt?['assets/medical/'+record.medicalArt+'.webp']:[]),
   ...topical,...alternatives,...fallback
  ];
  const cover = candidates.find(url=>!used.has(url));
  if (cover) {
   assigned.set(key,cover);
   used.add(cover);
  }
  return cover;
 };
})();
