'use strict';(()=>{
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let records=[],editing=null,ready=false,page=1;
const viewMode=new URLSearchParams(location.search).get('view');
const careerMode=location.pathname.endsWith('/career.html');
const bookMode=!careerMode&&viewMode==='books';
const careerLanding=careerMode&&viewMode!=='saved';
const dedicated=bookMode||careerMode;
const {owner,isBook,isCareer,readRecords}=thLibraryBooks;
if(bookMode){
 document.title='TisZod · Library · Books';
 document.body.dataset.thPage='home-library';
 document.querySelector('.education').classList.add('education-books');
 document.querySelector('.education-heading h1').textContent='Books';
 document.querySelector('.education-heading p').textContent='Browse, search, and read your book collection.';
 document.querySelector('.th-app-topbar strong').textContent='Library';
 document.querySelector('.th-app-topbar small').textContent='Books';
 document.querySelector('.education-heading').insertAdjacentHTML('beforebegin','<nav class="education-books-nav" aria-label="Library collections"><a href="home-library.html">← All collections</a><a href="home-library.html?collection=manuals">Manuals</a><a href="home-library.html?collection=recipes">Recipes</a><a href="home-library.html?collection=purchases">Purchases</a><a href="?view=books" aria-current="page">Books</a></nav>');
 $('education-add').textContent='+ Add book';
 $('education-category').closest('label').hidden=true;
 $('education-form').elements.person.closest('label').hidden=true;
 
}

if(careerMode){
 document.body.classList.toggle('career-landing',careerLanding);
 $('career-drive').hidden=!careerLanding;
 $('career-view-link').href=careerLanding?'?view=saved':'career.html';
 $('career-view-link').textContent=careerLanding?'Saved documents':'Back to Career';
 $('education-add').hidden=careerLanding;
 $('education-add').textContent='+ Add career document';
 $('education-category').closest('label').hidden=true;
 $('education-form').elements.person.closest('label').hidden=true;
}
const careerCovers = new Map([
 ['Employers/PC Mobile One/Advetising Ads', 'assets/career/folders/pc-advertising.webp'],
 ['Employers/PC Mobile One/Business Cards', 'assets/career/folders/pc-business-cards.webp'],
 ['Employers/PC Mobile One/Business Taxes', 'assets/career/folders/pc-tax.webp'],
 ['Employers/PC Mobile One/Civic League Material', 'assets/career/folders/pc-community.webp'],
 ['Employers/PC Mobile One/Customers', 'assets/career/folders/pc-customers.webp'],
 ['Employers/PC Mobile One/Flyers', 'assets/career/folders/pc-flyers.webp'],
 ['Employers/PC Mobile One/Forms', 'assets/career/folders/pc-forms.webp'],
 ['Employers/PC Mobile One/Icons', 'assets/career/folders/pc-icons.webp'],
 ['Employers/PC Mobile One/Merchant Credit Card Machine', 'assets/career/folders/pc-payment-terminal.webp'],
 ['Employers/PC Mobile One/Pc Mobile One Bank Account', 'assets/career/folders/pc-banking.webp'],
 ['Employers/PC Mobile One/PC Mobile One Uniforms', 'assets/career/folders/pc-uniforms.webp'],
 ['Employers/PC Mobile One/Quickbooks Backups', 'assets/career/folders/pc-backups.webp'],
 ['Employers/PC Mobile One/Suppliers', 'assets/career/folders/pc-suppliers.webp'],
 ['Employers/IQVIA/SQL', 'assets/career/folders/iqvia-sql.webp'],
 ['Employers/IQVIA/Work', 'assets/career/folders/iqvia-work.webp'],
 ['Employers/IQVIA/Yearbook', 'assets/career/folders/iqvia-yearbook.webp'],
 ['Employers/AbbVie/Benefits and Retirement', 'assets/career/folders/benefits.webp'],
 ['Employers/AbbVie/Onboarding and Agreements', 'assets/career/folders/onboarding.webp'],
 ['Employers/AbbVie/Onboarding and Agreements/Expense Card', 'assets/legal/financial-records.webp'],
 ['Employers/AbbVie/Onboarding and Agreements/Identity and Background Checks', 'assets/family/identification.webp'],
 ['Employers/AbbVie/Onboarding and Agreements/Offers and Agreements', 'assets/legal/separation-agreements.webp'],
 ['Employers/AbbVie/Onboarding and Agreements/Orientation and Policies', 'assets/legal/personal-records.webp'],
 ['Employers/AbbVie/Separation', 'assets/career/folders/separation.webp'],
 ['Employers/AbbVie/Travel and Expenses', 'assets/career/folders/travel.webp'],
 ['Employers/AbbVie/Verification', 'assets/career/folders/verification.webp'],
 ['Employers/AbbVie/Work Projects', 'assets/career/folders/projects.webp'],
 ['Employers/Berkley/Berkley Customers', 'assets/career/folders/shop-customers.webp'],
 ['Employers/Berkley/Berkley Machine Works Pictures', 'assets/career/folders/shop-history.webp'],
 ['Employers/Berkley/Berkley Paper Work', 'assets/career/folders/shop-paperwork.webp'],
 ['Employers/Berkley/Berkley Shop Information', 'assets/career/folders/shop-tools.webp'],
 ['Employers/Berkley/Drafting Office', 'assets/career/folders/drafting.webp'],
 ['Employers/Berkley/Milling Machines', 'assets/career/folders/milling.webp'],
 // Arrow and Lancer photos: https://www.cincinnatimachineretrofit.com/gallery/
 ['Employers/Berkley/Milling Machines/Arrow 750', 'assets/career/machines/arrow-750.jpg'],
 ['Employers/Berkley/Milling Machines/DNC50', 'assets/career/machines/dnc50.png'],
 ['Employers/Berkley/Milling Machines/Lancer 1250', 'assets/career/machines/lancer-1250.jpg'],
 ['Employers/Berkley/Milling Machines/LeadWell 1650', 'assets/career/machines/leadwell-1650.jpg'],
 // Maxim photo: https://www.southernfabsales.com/machines/1994-cincinnati-milacron-maxim-630-horizontal-machining-center-4433
 ['Employers/Berkley/Milling Machines/Maxim 630', 'assets/career/machines/maxim-630.jpg'],
 // Weiler photo: https://mach4metal.com/en/cnc-lathes/teach-in/weiler-e-70
 ['Employers/Berkley/Milling Machines/Weiler E70', 'assets/career/machines/weiler-e70.jpg'],
 ['Employers/PC Mobile One/Computer Sales', 'assets/career/folders/computer-sales.webp'],
 ['Resumes and Job Search/2026 Job Search/Applications', 'assets/career/folders/applications.webp'],
 ['Resumes and Job Search/2026 Job Search/Cover Letters', 'assets/career/folders/cover-letters.webp'],
 ['Resumes and Job Search/2026 Job Search/Employer Research', 'assets/career/folders/employer-research.webp'],
 ['Resumes and Job Search/2026 Job Search/Job Postings', 'assets/career/folders/job-postings.jpg'],
 ['Resumes and Job Search/2026 Job Search/Resume Planning', 'assets/career/folders/resume-planning.jpg'],
 ['Resumes and Job Search/2026 Job Search/Resumes', 'assets/career/folders/resumes.jpg'],
 ['Resumes and Job Search/2026 Job Search/Resumes/Drafts and Working Versions', 'assets/career/folders/resume-drafts.jpg'],
 ['Resumes and Job Search/2026 Job Search/Resumes/Employer Versions', 'assets/career/folders/resume-employer-versions.jpg'],
 ['Resumes and Job Search/2026 Job Search/Resumes/Role-Based Resumes', 'assets/career/folders/resume-role-versions.jpg'],
 ['Resumes and Job Search/Career Fair and Highlights/Career Fair', 'assets/career/folders/career-fair.jpg'],
 ['Resumes and Job Search/Career Fair and Highlights/Career Highlights', 'assets/career/folders/career-highlights.jpg'],
 ['Resumes and Job Search/Previous Resumes and Profiles/Dated Resumes', 'assets/career/folders/dated-resumes.jpg'],
 ['Resumes and Job Search/Previous Resumes and Profiles/LinkedIn Profiles', 'assets/career/folders/linkedin-profiles.jpg'],
 ['Resumes and Job Search/Previous Resumes and Profiles/Undated and Specialized Resumes', 'assets/career/folders/specialized-resumes.jpg'],
 ['Resumes and Job Search/References and Work Samples/Job Descriptions', 'assets/career/folders/job-descriptions.jpg'],
 ['Resumes and Job Search/References and Work Samples/Peer Resumes and Review Copies', 'assets/career/folders/peer-resume-review.jpg'],
 ['Resumes and Job Search/References and Work Samples/Reference Letters', 'assets/career/folders/reference-letters.jpg'],
 ['Employers/IQVIA/Benefits and Retirement', 'assets/career/folders/iqvia-retirement.jpg'],
 ['Employers/IQVIA/Evaluadim', 'assets/career/folders/iqvia-evaluadim.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01', 'assets/career/folders/iqvia-career-archive.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/AbbVie', 'assets/career/folders/iqvia-abbvie.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/Benefits', 'assets/career/folders/iqvia-archive-benefits.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/CSC-Building', 'assets/career/folders/iqvia-csc-building.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/CSC-Systems', 'assets/career/folders/iqvia-csc-systems.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/Education', 'assets/career/folders/iqvia-education.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/IQVIA Self Help iPad Screenshots-2021.09.02', 'assets/career/folders/iqvia-ipad-help.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/Misc', 'assets/career/folders/iqvia-misc.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/Pictures', 'assets/career/folders/iqvia-archive-pictures.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/Resume', 'assets/career/folders/iqvia-archive-resume.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/ServiceNow', 'assets/career/folders/iqvia-servicenow.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/Telecom-Phone Menu Options', 'assets/career/folders/iqvia-telecom.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/Templates', 'assets/career/folders/iqvia-templates.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/Travel', 'assets/career/folders/iqvia-travel.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/User Id and Passwords', 'assets/career/folders/iqvia-access.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/Yearbook', 'assets/career/folders/iqvia-archive-yearbook.jpg'],
 ['Employers/IQVIA/IQVIA-2007.06.11-2021.11.01/zzz-Archive', 'assets/career/folders/iqvia-boxed-archive.jpg'],
 ['Employers', 'assets/career/employers-cover.webp'],
 ['Employers/AbbVie', 'assets/career/employers/abbvie.svg'],
 ['Employers/Advance', 'assets/career/employers/advance.svg'],
 ['Employers/Berkley', 'assets/career/berkley-machine-works.webp'],
 ['Employers/HireGenics', 'assets/career/employers/hiregenics.svg'],
 ['Employers/IQVIA', 'assets/career/employers/iqvia.svg'],
 ['Employers/PC Mobile One', 'assets/career/employers/pc-mobile-one-ad.png'],
 ['Career Development', 'assets/family-unique/education-award.webp'],
 ['Resumes and Job Search', 'command-photos/interview.jpg'],
 ['Employment Documents', 'assets/family-unique/folders.webp'],
 ['Benefits and Retirement', 'assets/family-unique/coverage.webp'],
 ['Archive', 'assets/family-unique/archive-boxes.webp'],
 ['Resumes and Job Search/2026 Job Search', 'assets/legal/reference.webp'],
 ['Resumes and Job Search/Resume and Executive Bio', 'command-photos/education.jpg'],
 ['Resumes and Job Search/References and Work Samples', 'assets/family-unique/health-envelopes.webp'],
 ['Resumes and Job Search/Career Fair and Highlights', 'assets/family-unique/graduation.webp'],
 ['Resumes and Job Search/Previous Resumes and Profiles', 'assets/family/archive.webp'],
 ['Career Development/Training and Resources', 'assets/family-unique/classroom.webp'],
 ['Career Development/Development Plans', 'assets/family-unique/progress.webp'],
 ['Career Development/Accomplishments', 'assets/family-unique/race-medal.webp'],
 ['Career Development/Insights Discovery', 'assets/career/development/insights-discovery.webp'],
 ['Career Development/Performance Reviews', 'assets/family/school-reports.webp'],
 ['Career Development/Development Plans/2024', 'assets/hobbies/striders-calendar.webp'],
 ['Career Development/Development Plans/2025', 'command-photos/tasks.webp'],
 ['Career Development/Development Plans/Instructions', 'assets/home-library/books-cover.webp']
]);
const careerCover = path => careerCovers.get(path.join('/'));

async function loadCareerFolder(){
 const host=$('career-drive');
 const status=document.createElement('p');
 status.setAttribute('role','status');
 status.textContent='Loading your Career folders…';
 host.replaceChildren(status);
 try{
  const roots=await thDriveRecords.findFolders('TisZod');
  const folders=(await Promise.all(roots.map(root=>thDriveRecords.children(root)))).flat().filter(file=>file.folder);
  const current=folders.filter(file=>file.name==='Career');
  const matches=current.length?current:folders.filter(file=>file.name==='Career & Employment');
  if(matches.length!==1)throw Error('Could not locate the Career folder.');
  const root=matches[0];
  const entries=await thDriveRecords.children(root);
  if(!status.isConnected)return;
  entries.sort((a,b)=>Number(b.folder)-Number(a.folder)||a.name.localeCompare(b.name));
  const cards=document.createElement('div');
  cards.className='legal-cards';
  for(const entry of entries){
   const displayName=entry.folder&&entry.name==='Resumes and Job Search'?'Resume':entry.name;
   const card=thDriveRecords.card({...entry,displayName,driveAction:true,coverPath:[entry.name],coverFor:careerCover});
   cards.append(card);
  }
  status.textContent=entries.length?'':'No folders or documents are available here yet.';
  host.replaceChildren(cards,status);
  $('th-connection').textContent='Private Drive connected';
 }catch{
  if(!status.isConnected)return;
  $('th-connection').textContent='Drive unavailable';
  status.textContent='The Career Drive folder could not load. Use Refresh to try again.';
 }
}

const safe=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:''}catch{return ''}};
const message=t=>$('education-status').textContent=t;
async function save(r,d){if(!thAuthorized())throw Error('Sign in again to save.');d.updatedAt=new Date().toISOString();let range="'Education Records'!A:B",method='POST',suffix=':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',values=[[r?.id||crypto.randomUUID(),JSON.stringify(d)]];
if(r){const live=await thValues("'Education Records'!A"+r.row+":B"+r.row,'UNFORMATTED_VALUE');if(live[0]?.[0]!==r.id||JSON.parse(live[0][1]).updatedAt!==r.data.updatedAt)throw Error('This record changed elsewhere. Refresh before saving.');range="'Education Records'!A"+r.row+":B"+r.row;method='PUT';suffix='?valueInputOption=RAW'}
const res=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+TH_SHEET_ID+'/values/'+encodeURIComponent(range)+suffix,{method,headers:{Authorization:'Bearer '+thToken,'Content-Type':'application/json'},body:JSON.stringify({values})});if(!res.ok)throw Error('Save failed. Check your connection and retry.');await window.thStart()}
async function loadPortraits(){
 try{
  const rows=await thValues("'Identification Records'!D1:E2000",'UNFORMATTED_VALUE');
  const photos=new Map(rows.filter(([key,value])=>typeof key==='string'&&key.startsWith('person-photo:')&&typeof value==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)));
  for(const badge of $('education-people').querySelectorAll('.education-portrait')){
   const person=badge.closest('[data-person]').dataset.person;
   const source=photos.get('person-photo:'+person);
   badge.style.backgroundImage=source?'url("'+source+'")':'';
   badge.classList.toggle('has-custom-portrait',Boolean(source));
  }
 }catch{}
}
window.thStart=async()=>{if(careerLanding){await loadCareerFolder();return;}records=await readRecords();const folderSelect=$('education-folder'),prior=folderSelect.value;folderSelect.innerHTML='<option value="">All folders</option>'+[...new Set(records.map(r=>r.data.folder).filter(Boolean))].sort().map(f=>'<option value="'+esc(f)+'">'+esc(f)+'</option>').join('');folderSelect.value=prior;ready=true;render();if(!dedicated)void loadPortraits();message(bookMode?'Private book collection connected.':careerMode?'Private career records connected.':'Private education records connected.');$('th-connection').textContent='Private workbook connected'};


let selectedPerson='',selectedCategory='',selectedFolder='',recordPage=1;
const personLabels={Todd:'Todd',Aiden:'Aiden',Alexis:'Alexis',Tracy:'Tracy'};
const visibilityKey='tiszod-education-hidden-people';
let hiddenPeople=new Set(),showHiddenPeople=false;
try{
 const saved=JSON.parse(localStorage.getItem(visibilityKey)||'[]');
 if(Array.isArray(saved))hiddenPeople=new Set(saved.filter(name=>Object.hasOwn(personLabels,name)));
}catch{}
function renderPeople(){
 $('education-people').hidden=dedicated||Boolean(selectedPerson);
 $('education-visibility').hidden=dedicated||Boolean(selectedPerson)||!hiddenPeople.size;
 const toggle=$('education-show-hidden');
 toggle.textContent=showHiddenPeople?'Hide hidden people':'Show hidden people ('+hiddenPeople.size+')';
 toggle.setAttribute('aria-pressed',String(showHiddenPeople));
 for(const tile of $('education-people').querySelectorAll('[data-education-tile]')){
  const person=tile.dataset.educationTile;
  const hidden=hiddenPeople.has(person);
  tile.hidden=hidden&&!showHiddenPeople;
  const button=tile.querySelector('[data-education-hide]');
  button.setAttribute('aria-checked',String(hidden));
 }
}

const isEducation=true;
function title(d){
 let n=String(d.name||'Document').replace(/\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|rtf|epub|txt)$/i,'').replace(/_/g,' ');
 if(!isEducation){if(/social security/i.test(n))return 'Social Security Card';if(/birth certificate/i.test(n)&&!/process/i.test(n))return 'Birth Certificate';if(/marriage certificate/i.test(n))return 'Marriage Certificate';if(/boater.*license/i.test(n))return 'Boating License';if(/drivers? license/i.test(n))return /replacement/i.test(n)?'Driver’s License — Replacement Record':'Driver’s License';}
 return n;
}
function preview(d){
 if(/\.epub$/i.test(d.name||''))return '<div class="book-jacket" data-book-cover="'+esc(d.url.match(/\/d\/([^/]+)/)?.[1]||'')+'"><span class="book-jacket-title">'+esc(title(d))+'</span><small>EPUB · Read book</small></div>';
 let u;try{u=new URL(safe(d.url))}catch{return '<span class="record-placeholder">Document</span>'}
 const folder=u.pathname.includes('/folders/'),id=u.pathname.match(/\/d\/([^/]+)/)?.[1];
 if(folder)return '<span class="record-placeholder">▤<small>Archive folder</small></span>';
 if(id&&['drive.google.com','docs.google.com'].includes(u.hostname))return '<iframe class="record-preview" src="https://drive.google.com/file/d/'+encodeURIComponent(id)+'/preview" title="'+esc(title(d))+' preview" loading="lazy" tabindex="-1" referrerpolicy="no-referrer"></iframe>';
 return '<span class="record-placeholder">'+esc(d.category||'Document')+'</span>';
}
function card(r){const d=r.data,u=safe(d.url),epub=/\.epub$/i.test(d.name||'');return '<article data-file-id="'+esc(r.id)+'" class="education-card visual-record">'+(u&&!d.deleted?'<a '+(epub?'data-read-book="'+esc(r.id)+'" ':'')+'class="record-link" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(title(d))+'">'+preview(d)+'<div class="record-caption"><h3>'+esc(title(d))+'</h3><small>'+esc(personLabels[owner(d)])+' · '+esc(d.category||'')+'</small>'+(isEducation&&d.folder?'<small>'+esc(d.folder)+'</small>':'')+(d.expires?'<small>Expires '+esc(d.expires)+'</small>':'')+'</div></a>':'<h3>'+esc(title(d))+'</h3>')+(d.category==='Books'?'<p class="book-tags">'+esc(bookInfo(d).kind)+' · '+esc(bookInfo(d).genre)+(bookInfo(d).suggested?' (suggested)':'')+'</p>':'')+'<footer>'+(d.deleted?'<button data-restore="'+esc(r.id)+'">Restore</button>':'<button data-edit="'+esc(r.id)+'">Edit</button><button data-delete="'+esc(r.id)+'">Delete</button>')+'</footer></article>'}
const schoolPhotos=[
 ['Trinity Lutheran','trinity','Trinity Lutheran church campus, Norfolk'],
 ['Lake Taylor','lake-taylor','Lake Taylor Senior High School entrance'],
 ['Old Dominion','odu','Old Dominion University Education Building'],
 ['Computer Training','computer-training','Representative office storefront'],
 ['Tidewater Community','tcc','TCC · Chesapeake campus']
];
function groupCard(label,count,attribute,value){
 const photo=selectedCategory==='School'&&attribute==='data-folder'&&schoolPhotos.find(([match])=>label.includes(match));
 const image=photo?'<img class="school-building" src="assets/schools/'+photo[1]+'.jpg" alt="'+esc(photo[2])+'" loading="lazy" width="1000" height="560"><span class="school-card-caption">'+esc(photo[2])+'</span>':'<span class="person-avatar" aria-hidden="true">'+esc(isEducation?'▤':label.charAt(0))+'</span>';
 return '<button class="education-card person-record'+(photo?' school-record':'')+'" '+attribute+'="'+esc(value)+'">'+image+'<span class="school-card-label"><h3>'+esc(label)+'</h3><p>'+count+' '+(count===1?'document':'documents')+'</p></span></button>';
}

const genreOptions=['Action & Adventure','Mystery & Crime','Thriller & Suspense','Fantasy','Science Fiction','Horror','Romance','Literary & Classics','Young Adult','Biography & Memoir','History & Politics','Science & Nature','Business & Money','Self-Help & Psychology','Religion & Spirituality','Humor','Home & Reference','Uncategorized'];
function bookInfo(d){
 const name=title(d),n=name.toLowerCase(),author=d.author||name.split(' - ').slice(-1)[0].trim();
 let kind='Uncategorized',genre='Uncategorized';
 const rules=[
 [/you are a badass|how to get rich|wall street analyst|48 laws of power/,'Nonfiction','Business & Money'],
 [/tipping point|outliers|blink|drive - pink/,'Nonfiction','Self-Help & Psychology'],
 [/power of now|new earth|mere christianity|god delusion/,'Nonfiction','Religion & Spirituality'],
 [/brief history of time|short history of nearly everything|elegant universe|selfish gene|physics of star trek|molecular mechanisms/,'Nonfiction','Science & Nature'],
 [/guns, germs|people.s history|lies my teacher|black hawk down|audacity of hope/,'Nonfiction','History & Politics'],
 [/kitchen confidential|not about the bike/,'Nonfiction','Biography & Memoir'],
 [/sedaris|carlin|clarkson|handler/,'Nonfiction','Humor'],
 [/superfreakonomics/,'Nonfiction','Business & Money'],
 [/dream home|manual|user.?guide|encyclopedia|meaningful.metrics|replacement parts|instructions/,'Nonfiction','Home & Reference'],
 [/maximum ride|percy jackson|harry potter|unfortunate events|pretty little liars|twilight/,'Fiction','Young Adult'],
 [/darktower|darktower|wheel of time|discworld|narnia|alvin maker|tolkien|hobb|maguire|maquire|gaiman/,'Fiction','Fantasy'],
 [/asimov|clarke|enders game|ender in exile|enderverse|hhgttg|dirk gently|minority report|scanner darkly|fahrenheit|illustrated man|diamond age|children of men|1984|jurassic park|lost world|timeline|jumper|the host/,'Fiction','Science Fiction'],
 [/christie|dexter|red dragon|godfather|alex cross|womans murder club/,'Fiction','Mystery & Crime'],
 [/cussler|clancy|fleming|bourne|ludlum/,'Fiction','Action & Adventure'],
 [/sparks|steel|suzannes diary/,'Fiction','Romance'],
 [/king|koontz|vampire chronicles|joe pitt|american psycho|something wicked|abraham lincoln.*vampire/,'Fiction','Horror'],
 [/grisham|brown_? dan|brown dan|patterson/,'Fiction','Thriller & Suspense'],
 [/picoult|palahniuk|coelho|achebe|rand|salinger|vonnegut|mccarthy|tolstoy|hemingway|uris|rum diary|screwjack|fear and loathing|crash - ballard|screwtape/,'Fiction','Literary & Classics']
 ];
 for(const [pattern,k,g]of rules)if(pattern.test(n)){kind=k;genre=g;break}
 return {kind:d.bookKind||kind,genre:d.genre||genre,author:name.includes(' - ')||d.author?author:'Unknown author',format:(d.name.match(/\.([a-z0-9]+)$/i)?.[1]||'Other').toUpperCase(),suggested:!d.genre&&!d.bookKind};
}
const bookTools=document.createElement('section');bookTools.id='book-tools';bookTools.hidden=true;bookTools.innerHTML='<div class="book-quick"><strong>Browse books</strong>'+['All books','Fiction','Nonfiction','Action & Adventure','Mystery & Crime','Fantasy','Science Fiction','Horror','Romance'].map(x=>'<button type="button" data-book-preset="'+esc(x)+'">'+esc(x)+'</button>').join('')+'</div><div class="book-filters"><label>Fiction / nonfiction<select id="book-kind"><option value="">All books</option><option>Fiction</option><option>Nonfiction</option><option>Uncategorized</option></select></label><label>Genre<select id="book-genre"><option value="">All genres</option>'+genreOptions.map(g=>'<option>'+esc(g)+'</option>').join('')+'</select></label><label>Author<select id="book-author"><option value="">All authors</option></select></label><label>Format<select id="book-format"><option value="">All formats</option><option>EPUB</option><option>PDF</option><option>M4A</option><option>XLSX</option></select></label><label>Sort<select id="book-sort"><option value="title">Title A–Z</option><option value="reverse">Title Z–A</option><option value="author">Author A–Z</option><option value="genre">Genre</option><option value="kind">Fiction / nonfiction</option><option value="format">Format</option></select></label><button type="button" id="book-reset">Clear filters</button></div><p>Suggested genres are based on titles and authors. Use Edit to correct a book’s details. Uncertain titles remain Uncategorized.</p>';
$('education-count').after(bookTools);
const bookStyle=document.createElement('style');bookStyle.textContent='#book-tools{padding:16px;margin:16px 0;background:#132c40;border:1px solid #365a72;border-radius:10px}#book-tools[hidden]{display:none}.book-quick,.book-filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.book-filters{margin-top:14px}.book-filters label{display:flex;flex-direction:column;gap:5px}.book-filters select{max-width:240px;padding:10px;color:#edf6ff;background:#0d1c2a;border:1px solid #547991;border-radius:6px}#book-tools p{font-size:12px;color:#c5d8e8;margin-bottom:0}.book-tags{font-size:12px;color:#aadaed;margin:8px 0}.book-quick button[aria-pressed=true]{background:#396f95}';document.head.append(bookStyle);
function resetBookFilters(){for(const id of ['book-kind','book-genre','book-author','book-format'])$(id).value='';$('book-sort').value='title'}
bookTools.addEventListener('change',()=>render());
bookTools.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='book-reset'){resetBookFilters();$('education-search').value=''}if(b.dataset.bookPreset){resetBookFilters();const p=b.dataset.bookPreset;if(['Fiction','Nonfiction'].includes(p))$('book-kind').value=p;else if(p!=='All books')$('book-genre').value=p}render()});
const fields=document.querySelector('.education-fields');
fields.insertAdjacentHTML('beforeend','<label>Book author<input name="author" maxlength="300"></label><label>Fiction / nonfiction<select name="bookKind"><option value="">Suggested automatically</option><option>Fiction</option><option>Nonfiction</option><option>Uncategorized</option></select></label><label>Book genre<select name="genre"><option value="">Suggested automatically</option>'+genreOptions.map(g=>'<option>'+esc(g)+'</option>').join('')+'</select></label>');
function bookSortGroup(data){
 const name=data.name||'';
 if(!/\.m4a$/i.test(name)&&!/\.m4a(?:[?#]|$)/i.test(data.url||''))return 0;
 if(/chapter\s*0*1\s*[-–—]\s*28\b/i.test(name))return 3;
 return /chapter\s*0*(?:[1-9]|1\d|2[0-8])\b/i.test(name)?2:1;
}
function renderBooks(shown,html){
 const authors=[...new Set(shown.map(r=>bookInfo(r.data).author))].sort();const prior=$('book-author').value;
 $('book-author').innerHTML='<option value="">All authors</option>'+authors.map(a=>'<option>'+esc(a)+'</option>').join('');$('book-author').value=prior;
 const kind=$('book-kind').value,genre=$('book-genre').value,author=$('book-author').value,format=$('book-format').value,sort=$('book-sort').value;
 const filtered=shown.filter(r=>{const i=bookInfo(r.data);return(!kind||i.kind===kind)&&(!genre||i.genre===genre)&&(!author||i.author===author)&&(!format||i.format===format)});
 filtered.sort((a,b)=>{const bottom=bookSortGroup(a.data)-bookSortGroup(b.data);if(bottom)return bottom;const x=bookInfo(a.data),y=bookInfo(b.data);if(sort==='reverse')return title(b.data).localeCompare(title(a.data));if(sort!=='title'){const c=String(x[sort]).localeCompare(String(y[sort]));if(c)return c}return title(a.data).localeCompare(title(b.data),undefined,{numeric:true})});
 $('education-count').textContent=filtered.length+' of '+shown.length+' books · one scrolling page';
 $('education-grid').innerHTML=html+filtered.map(card).join('')+(filtered.length?'':'<p>No books match these filters.</p>');
 for(const b of bookTools.querySelectorAll('[data-book-preset]')){const p=b.dataset.bookPreset;b.setAttribute('aria-pressed',String(p===kind||p===genre||(p==='All books'&&!kind&&!genre&&!author&&!format)))}
}

function render(){
 const view=selectedPerson||'Todd';
 const landing=!dedicated&&!selectedPerson;
 const q=landing?'':$('education-search').value.trim().toLowerCase();
 if(!careerMode){
  renderPeople();
  $('education-person-heading').hidden=dedicated||!selectedPerson;
  $('education-person-title').textContent=personLabels[view];
 }
 $('education-search-label').textContent=bookMode?'Search books':careerMode?'Search saved career documents':'Search '+personLabels[view]+'’s documents';
 for(const option of $('education-category').options)if(['Books','Career'].includes(option.value))option.hidden=dedicated||view==='Todd';
 const workspace=document.querySelector('.education');
 workspace.dataset.person=view;
 workspace.classList.toggle('education-landing',landing);
 const showDocuments=!careerLanding&&Boolean(dedicated||q||selectedPerson==='Todd'||selectedPerson==='Tracy'||(selectedPerson&&records.some(r=>owner(r.data)===view&&!isBook(r.data))));
 $('education-documents').hidden=!showDocuments;
 if(!showDocuments)return;
 const booksView=bookMode||selectedCategory==='Books'||$('education-category').value==='Books';bookTools.hidden=!booksView;
 const person=view,category=dedicated?'':$('education-category').value,deleted=$('education-view').value==='deleted';
 const list=records.filter(r=>!!r.data.deleted===deleted&&(bookMode?isBook(r.data):careerMode?isCareer(r.data):owner(r.data)===person&&!isBook(r.data)&&!isCareer(r.data))&&(!category||r.data.category===category)&&[r.data.name,r.data.person,r.data.category,r.data.folder,r.data.notes].join(' ').toLowerCase().includes(q));
 $('education-pin-section').hidden=true;
 const grid=$('education-grid'),chosen=person;
 const heading=grid.previousElementSibling;
 let shown=list,html='<div class="record-breadcrumb"><button data-record-back="root">← '+(isEducation?'Education':'People')+'</button>';
 if(!isEducation&&chosen){shown=shown.filter(r=>(r.data.person||'General')===chosen);html+='<strong>'+esc(chosen)+'</strong>';}
 if(isEducation&&selectedCategory){shown=shown.filter(r=>(r.data.category||'Other')===selectedCategory);html+='<strong>'+esc(selectedCategory)+'</strong>';}
 if(isEducation&&selectedFolder){shown=shown.filter(r=>(r.data.folder||'')===selectedFolder||r.data.folder?.startsWith(selectedFolder+'/'));html+='<button data-record-back="category">← '+esc(selectedCategory||'Categories')+'</button><strong>'+esc(selectedFolder)+'</strong>';}
 html+='</div>';
 if(!q&&!person&&!category&&!deleted&&!chosen&&!isEducation){heading.textContent='Choose a person';$('education-count').textContent=list.length+' documents';grid.innerHTML=[...new Set(['Todd','Aiden','Alexis','Heather','Tracy',...list.map(r=>r.data.person||'General')])].map(p=>groupCard(p,list.filter(r=>(r.data.person||'General')===p).length,'data-person',p)).join('');return}
 if(!dedicated&&isEducation&&!selectedCategory&&!q&&!category&&!deleted){heading.textContent=list.length?'Choose a category':'Documents';$('education-count').textContent=list.length+' records';grid.innerHTML=['School','Certificates','Books','Career','Other'].filter(c=>list.some(r=>(r.data.category||'Other')===c)).map(c=>groupCard(c,list.filter(r=>(r.data.category||'Other')===c).length,'data-record-category',c)).join('')||'<p class="record-empty">No documents here yet.</p>';return}
 if(isEducation&&selectedCategory!=='Books'&&selectedCategory&&!selectedFolder&&!q&&!category&&!deleted){const groups=[...new Set(shown.map(r=>r.data.folder?.split('/')[0]).filter(Boolean))].sort();if(groups.length){heading.textContent=selectedCategory;const loose=shown.filter(r=>!r.data.folder);$('education-count').textContent=shown.length+' records';grid.innerHTML=html+groups.map(f=>groupCard(f,shown.filter(r=>r.data.folder===f||r.data.folder?.startsWith(f+'/')).length,'data-folder',f)).join('')+loose.map(card).join('');return}}
 heading.textContent=q?'Search results':careerMode?'Saved career documents':isEducation?(selectedFolder||selectedCategory||category||'Documents'):(chosen||'Documents');
 $('education-count').textContent=shown.length+' '+(shown.length===1?'document':'documents');
 if(booksView){if(bookMode)heading.textContent='Book collection';renderBooks(shown,bookMode?'':html);return}
 grid.innerHTML=(careerMode?'':html)+shown.sort((a,b)=>title(a.data).localeCompare(title(b.data))).map(card).join('')+(shown.length?'':'<p class="record-empty">No documents here yet.</p>');
}
document.querySelector('.education').addEventListener('click',e=>{
 const link=e.target.closest('[data-read-book]');if(link){e.preventDefault();const r=records.find(r=>r.id===link.dataset.readBook);const id=r?.data.url.match(/\/d\/([^/]+)/)?.[1];if(id&&window.thReadBook)window.thReadBook(id,title(r.data),r.data.url);return;}
 const b=e.target.closest('button');if(!b)return;
 if(b.id==='education-show-hidden'){
  showHiddenPeople=!showHiddenPeople;
  renderPeople();
  return;
 }
 const unhideAll=b.id==='education-unhide-all';
 if(unhideAll||b.dataset.educationHide){
  const person=b.dataset.educationHide;
  if(unhideAll)hiddenPeople.clear();
  else if(hiddenPeople.has(person))hiddenPeople.delete(person);
  else hiddenPeople.add(person);
  if(!hiddenPeople.size)showHiddenPeople=false;
  try{localStorage.setItem(visibilityKey,JSON.stringify([...hiddenPeople]));}catch{}
  renderPeople();
  if(unhideAll)$('education-people').querySelector('[data-person]').focus();
  else if(b.closest('[hidden]'))$('education-show-hidden').focus();
  return;
 }
 if(b.dataset.person||b.hasAttribute('data-education-home')){selectedPerson=b.dataset.person||'';selectedCategory='';selectedFolder='';$('education-search').value='';$('education-category').value='';$('education-view').value='active';resetBookFilters();recordPage=1;render();if(selectedPerson)$('education-person-title').focus();else ($('education-people').querySelector('[data-education-tile]:not([hidden]) [data-person]')||$('education-show-hidden')).focus();return;}
 if(b.dataset.recordCategory){selectedCategory=b.dataset.recordCategory;selectedFolder='';recordPage=1;render()}
 if(b.dataset.folder){selectedFolder=b.dataset.folder;recordPage=1;render()}
 if(b.dataset.recordBack){selectedFolder='';if(b.dataset.recordBack==='root'){selectedCategory='';$('education-person').value='';$('education-category').value='';$('education-search').value=''}recordPage=1;render()}
 if(b.dataset.recordPage){recordPage+=Number(b.dataset.recordPage);render()}
});
function edit(id){if(!ready)return;editing=records.find(r=>r.id===id)||null;const f=$('education-form');f.reset();for(const k of ['name','person','category','url','expires','notes','author','bookKind','genre'])f.elements.namedItem(k).value=editing?.data[k]||({person:selectedPerson||'Todd',category:bookMode?'Books':careerMode?'Career':selectedCategory||'Other'}[k]||'');$('education-save-status').textContent='';$('education-dialog').showModal()}
document.querySelector('.education').onclick=async e=>{const b=e.target.closest('button');if(!b||!ready)return;try{if(b.id==='education-add')edit();else if(b.id==='education-prev'){page=Math.max(1,page-1);render()}else if(b.id==='education-next'){page++;render()}else if(b.dataset.edit)edit(b.dataset.edit);else {const id=b.dataset.delete||b.dataset.restore;if(!id)return;const r=records.find(r=>r.id===id),d={...r.data};if(b.dataset.delete){if(!confirm('Remove this document from the dashboard? You can restore it from Deleted documents. Its original Drive file stays unchanged.'))return;d.deleted=true}else d.deleted=false;await save(r,d)}}catch(err){message(err.message)}};
$('education-form').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('[type=submit]');b.disabled=true;try{const d={...(editing?.data||{favorite:false,deleted:false})};for(const k of ['name','person','category','url','expires','notes','author','bookKind','genre'])d[k]=f.elements.namedItem(k).value.trim();if(!safe(d.url))throw Error('Enter a complete https:// document link.');await save(editing,d);$('education-dialog').close();message('Document saved.')}catch(err){$('education-save-status').textContent=err.message}finally{b.disabled=false}};
for(const id of ['education-search','education-person','education-category','education-folder','education-view'])$(id).addEventListener(id==='education-search'?'input':'change',()=>{page=1;recordPage=1;render()});$('education-refresh').onclick=()=>window.thStart().catch(e=>message(e.message));$('education-close').onclick=()=>$('education-dialog').close();

for(const id of ['education-prev','education-next','education-page','education-folder']){const el=document.getElementById(id);if(el)el.hidden=true;}document.querySelector('label:has(#education-folder)')?.setAttribute('hidden','');
for(const id of ['education-category','education-view'])$(id).addEventListener('change',()=>{selectedCategory='';selectedFolder='';recordPage=1;render()});

const jacketStyle=document.createElement('style');jacketStyle.textContent='.book-jacket{height:270px;background:linear-gradient(120deg,#17394c,#31635b);color:#fff;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:28px 24px;box-sizing:border-box;text-align:center;border-left:12px solid #0003;position:relative}.book-jacket-title{font:700 23px/1.4 Georgia,serif;overflow:hidden;max-height:190px}.book-jacket img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#10202c}.book-jacket small{color:#e0ebef}';document.head.append(jacketStyle);
let coverBusy=0;const coverQueue=[];
async function pumpCovers(){if(coverBusy>=3||!coverQueue.length||!window.thBookCover)return;const el=coverQueue.shift();if(!el.isConnected){pumpCovers();return}coverBusy++;try{const url=await window.thBookCover(el.dataset.bookCover);if(url&&el.isConnected){const img=document.createElement('img');img.src=url;img.alt=el.querySelector('.book-jacket-title')?.textContent+' — book cover';el.replaceChildren(img)}}catch{}finally{coverBusy--;pumpCovers()}}
const coverObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){coverObserver.unobserve(entry.target);coverQueue.push(entry.target);pumpCovers()}},{rootMargin:'150px'});
function observeCovers(){document.querySelectorAll('[data-book-cover]').forEach(el=>{if(!el.dataset.observed){el.dataset.observed='true';coverObserver.observe(el)}})}
new MutationObserver(observeCovers).observe($('education-grid'),{childList:true,subtree:true});
window.addEventListener('tiszod-drive-books-connected',()=>{document.querySelectorAll('[data-book-cover]').forEach(el=>{if(!el.querySelector('img')){coverQueue.push(el);pumpCovers()}})});


window.thViewAdapter={capture:()=>({selectedPerson,selectedCategory,selectedFolder}),restore:s=>{selectedPerson=s?.selectedPerson||'';selectedCategory=s?.selectedCategory||'';selectedFolder=s?.selectedFolder||'';render()}};

window.thFileBrowser?.mount({name:'education',host:'education-grid',deleted:()=>$('education-view').value==='deleted',change:(ids,deleted)=>window.thFileBrowser.updateJSON('Education Records',records,ids,deleted)});
})();
