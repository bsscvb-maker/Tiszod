(() => {
 const answers=window.INTERVIEW_ANSWERS;
 const el=id=>document.getElementById(id);
 const synonyms={pharmaceutical:'pharma',pharmaceuticals:'pharma',years:'year',worked:'work',working:'work',users:'user',people:'user',stakeholders:'stakeholder',priorities:'priority',delays:'delay',delayed:'delay',conflicting:'conflict',disagreement:'conflict',disagree:'conflict',budgets:'budget',costs:'cost',tools:'tool',programs:'program',projects:'project'};
 const norm=s=>' '+s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).map(w=>synonyms[w]||w).join(' ')+' ';
 const stop=new Set('handle manage approach describe example work a an the me you your our we us i to of in on for and or is are do does how what would can have has about with tell please could it that this when been did ive im business give some much many more kind'.split(' '));
 const words=s=>norm(s).trim().split(/\s+/).filter(x=>x.length>2&&!stop.has(x));
 function rank(question){
  const q=norm(question),tokens=new Set(words(question));
  const duration=/\byear\b|\bhow long\b/.test(q);
  const career=/\bpharma\b|\blife sciences\b|\bindustry\b|\bcareer\b|\bexperience\b|\bwork\b/.test(q);
  const directYears=duration&&career&&!/\bai\b|\bclinical\b|\bstartup\b|\bbudget\b/.test(q);
  const directUsers=/\buser\b/.test(q)&&/\bhow many\b|\bnumber\b|\bpopulation\b|\bsize\b|\bscale\b/.test(q);
  return answers.map(a=>{
   let score=0;const vocab=new Set();
   for(const phrase of [a.q,...a.keys]){
    const n=norm(phrase);if(q.includes(n)&&n.trim())score+=n.trim().split(/\s+/).length>1?9:4;
    words(phrase).forEach(x=>vocab.add(x));
   }
   for(const w of tokens)if(vocab.has(w))score+=3;
   // Search the actual answer as well as question titles and aliases.
   const body=new Set(words([...a.cues,...a.paras].join(' ')));
   for(const w of tokens)if(body.has(w)&&!vocab.has(w))score+=1;
   if(a.id==='years')score+=directYears?100:-12;
   if(a.id==='intro'&&/\b(tell|little|bit|walk|introduce|summari|summary)\b/.test(q)&&/\byourself\b|\bbackground\b|\bresume\b|\bcareer\b/.test(q)&&!duration)score+=25;
   if(a.id==='users'&&directUsers)score+=100;
   // Clinical AI questions should not be routed to general personal AI use.
   if(a.id==='clinical'&&/\bclinical\b|\bhealth system\b|\bhospital\b/.test(q))score+=12;
   return {a,score};
  }).sort((a,b)=>b.score-a.score);
 }
 window.interviewRank=rank;
 let current='intro',size=22,recognition=null,listening=false,finalText='',timer=null,seconds=0;
 function renderTopics(){
  const filter=norm(el('filter').value).trim();el('topics').replaceChildren();
  const filtered=answers.filter(a=>norm([a.q,...a.keys,...a.cues].join(' ')).includes(filter));
  filtered.forEach(a=>{const b=document.createElement('button');b.type='button';b.textContent=a.q;b.setAttribute('aria-current',String(a.id===current));b.onclick=()=>{select(a.id);el('matchStatus').textContent='Selected topic';el('alternatives').replaceChildren();showAnswer();};el('topics').append(b);});
  if(!filtered.length)el('topics').textContent='No topics found. Try another word.';
 }
 function stopTimer(){if(timer)clearInterval(timer);timer=null;el('timer').textContent='Start practice timer';}
 function select(id){
  const a=answers.find(a=>a.id===id);if(!a)return;current=id;stopTimer();seconds=0;el('elapsed').textContent='0:00';
  el('answerTitle').textContent=a.q;el('cues').replaceChildren();
  a.cues.forEach(c=>{const s=document.createElement('span');s.textContent=c;el('cues').append(s);});
  el('answerText').replaceChildren();a.paras.forEach(text=>{const p=document.createElement('p');const split=text.indexOf('. ');const strong=document.createElement('strong');strong.textContent=split>=0?text.slice(0,split+1):text;p.append(strong);if(split>=0)p.append(document.createTextNode(text.slice(split+1)));el('answerText').append(p);});
  const words=a.paras.join(' ').split(/\s+/).length;el('length').textContent=words+' words · about '+Math.round(words/145*60)+'–'+Math.round(words/110*60)+' sec at 110–145 words/min';
  el('answerNote').textContent=a.note||'';renderTopics();
 }
 function setFocus(active){
  document.body.classList.toggle('interview-focus',active);
  el('focus').setAttribute('aria-pressed',String(active));el('focus').textContent=active?'Show all topics':'Focus view';
 }
 function showAnswer(){
  el('heardQuestion').textContent=el('question').value.trim();
  el('heardQuestion').hidden=!el('question').value.trim();
  setFocus(true);el('answerPanel').scrollIntoView({block:'start'});
 }
 function nextQuestion(){setFocus(false);el('question').value='';el('heardQuestion').hidden=true;el('alternatives').replaceChildren();el('question').focus();el('question').scrollIntoView({block:'center'});}
 el('nextQuestion').onclick=nextQuestion;
 el('myIntro').onclick=()=>{el('question').value='Tell me a little bit about yourself and your career';select('intro');el('matchStatus').textContent='Your opening introduction';el('alternatives').replaceChildren();showAnswer();};
 function match(){
  const text=el('question').value.trim();el('alternatives').replaceChildren();
  if(!text){el('matchStatus').textContent='Type a question or use the microphone first.';return;}
  const results=rank(text),top=results[0];
  if(top.score<4){setFocus(false);el('matchStatus').textContent='No clear match. Choose a topic or add more detail.';el('answerTitle').textContent='No prepared answer found';el('answerText').replaceChildren();el('cues').replaceChildren();el('answerNote').textContent='Try different wording or choose a topic. The previous answer has been cleared.';el('length').textContent='';stopTimer();return;}
  const close=results[1].score>0&&results[1].score>=top.score-3;
  select(top.a.id);el('matchStatus').textContent=close?'Several possible matches — choose the best fit below.':'Suggested answer — check that it fits the question.';
  results.filter(r=>close&&r.score>=top.score-3).slice(0,3).forEach(r=>{const b=document.createElement('button');b.type='button';b.textContent=r.a.q;b.onclick=()=>{select(r.a.id);el('matchStatus').textContent='Selected suggested topic';showAnswer();};el('alternatives').append(b);});
  showAnswer();
 }
 el('filter').oninput=renderTopics;el('match').onclick=match;
 el('clear').onclick=()=>{if(listening&&recognition)recognition.abort();el('question').value='';finalText='';el('alternatives').replaceChildren();el('matchStatus').textContent='Question cleared. Choose a topic or listen again.';};
 el('larger').onclick=()=>{size=Math.min(34,size+2);document.documentElement.style.setProperty('--answer-size',size+'px');};
 el('smaller').onclick=()=>{size=Math.max(16,size-2);document.documentElement.style.setProperty('--answer-size',size+'px');};
 el('focus').onclick=()=>setFocus(!document.body.classList.contains('interview-focus'));
 el('timer').onclick=()=>{if(timer){stopTimer();return;}seconds=0;el('elapsed').textContent='0:00';el('timer').textContent='Stop timer';timer=setInterval(()=>{seconds++;el('elapsed').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');},1000);};
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Speech){el('listen').disabled=true;el('listenStatus').textContent='Speech recognition is unavailable in this browser. Type the question or select a topic.';}
 else{
  recognition=new Speech();recognition.lang='en-US';recognition.continuous=true;recognition.interimResults=true;let failed=false,timeout=null,cancelled=false;
  recognition.onstart=()=>{listening=true;failed=false;el('listen').classList.add('listening');el('listen').textContent='■ Stop and find answer';el('listenStatus').textContent='Listening… click Stop when the question ends.';timeout=setTimeout(()=>recognition.stop(),45000);};
  recognition.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)finalText+=e.results[i][0].transcript+' ';else interim+=e.results[i][0].transcript;}el('question').value=(finalText+interim).trim();};
  recognition.onerror=e=>{failed=true;const messages={'not-allowed':'Microphone permission was denied. Allow it in browser settings, or type the question.','audio-capture':'No microphone is available. Connect one, or type the question.','no-speech':'No speech was heard. Try again or type the question.','network':'Speech service is unavailable. Type the question or choose a topic.','aborted':'Listening cancelled.'};el('listenStatus').textContent=messages[e.error]||'Listening stopped. Try again or type the question.';};
  recognition.onend=()=>{clearTimeout(timeout);listening=false;el('listen').classList.remove('listening');el('listen').textContent='● Listen to question';if(!failed)el('listenStatus').textContent=el('question').value.trim()?'Question captured. Review the suggested answer.':'No question captured. Try again or type it.';if(!cancelled&&el('question').value.trim())match();};
  el('listen').onclick=()=>{if(listening){recognition.stop();return;}finalText='';cancelled=false;el('question').value='';try{recognition.start();}catch(_){el('listenStatus').textContent='Could not start listening. Try again or type the question.';}};
  el('clear').onclick=()=>{cancelled=true;if(listening)recognition.abort();el('question').value='';finalText='';el('alternatives').replaceChildren();el('matchStatus').textContent='Question cleared. Choose a topic or listen again.';};
  window.addEventListener('pagehide',()=>recognition.abort());
 }
 window.addEventListener('pagehide',stopTimer);select(current);

 window.thViewAdapter={capture:()=>({current,size,focus:document.body.classList.contains('interview-focus')}),restore:s=>{if(s?.current)select(s.current);size=s?.size||22;el('answerText').style.fontSize=size+'px';setFocus(!!s?.focus)}};
})();
