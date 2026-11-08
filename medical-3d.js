/* TisZod interactive 3D anatomical avatar. Procedural illustrative model, not diagnostic imaging. */
(()=>{
const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
let modulePromise;
function getThree(){return modulePromise??=import(THREE_URL)}
const ATLAS_URL='https://cdn.jsdelivr.net/gh/Charleeh/ecorche@320805e06aee51e2e6f6b22533eb2a59d43f2d4d/model/ecorche.meshopt.glb';
const ADDONS='https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/';
let atlasPromise;
function getAtlas(THREE){
 return atlasPromise??=(async()=>{
  const [{GLTFLoader},{MeshoptDecoder},response]=await Promise.all([
   import(ADDONS+'loaders/GLTFLoader.js'),import(ADDONS+'libs/meshopt_decoder.module.js'),
   fetch(ATLAS_URL,{referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)})
  ]);
  if(!response.ok)throw Error('Anatomy atlas could not be downloaded.');
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const {scene}=await loader.parseAsync(await response.arrayBuffer(),'');
  const box=new THREE.Box3().setFromObject(scene),size=box.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<1||size.y>2.5||size.x/size.y>.85||size.z/size.y>.55){
   throw Error('Anatomy atlas bounds were unexpected.');
  }
  const layerNames=new Set();
  scene.traverse(node=>layerNames.add(node.name.replace(/[^a-z]/gi,'').toLowerCase()));
  if(['skeleton','superficialmuscles','deepmuscles'].some(label=>!layerNames.has(label))){
   throw Error('Anatomy atlas layers are incomplete.');
  }
  const atlasMuscle=new THREE.MeshStandardMaterial({color:0x8e4651,roughness:.55,metalness:.18});
  const atlasFascia=new THREE.MeshStandardMaterial({color:0x597ea9,roughness:.48,metalness:.25});
  const atlasBone=new THREE.MeshStandardMaterial({color:0x7c9cb9,roughness:.56,metalness:.15});
  const atlasCutaway=atlasMuscle.clone();
  atlasCutaway.transparent=true;atlasCutaway.opacity=.29;atlasCutaway.depthWrite=false;
  scene.traverse(node=>{
   if(!node.isMesh)return;
   const name=node.name.replace(/[^a-z]/gi,'').toLowerCase();
   let layer=node.parent;
   while(layer&& !/^(skeleton|superficialmuscles|deepmuscles)$/i.test(layer.name.replace(/[^a-z]/gi,'')))layer=layer.parent;
   if(layer?.name.toLowerCase()==='skeleton')node.material=atlasBone;
   else if(/pectoralismajor|rectusabdominis|externaloblique|serratusanterior/.test(name))node.material=atlasCutaway;
   else if(/fascia|tendon|aponeurosis|frontalis|orbicularis|temporalis/.test(name))node.material=atlasFascia;
   else node.material=atlasMuscle;
  });
  const scale=4.05/size.y,center=box.getCenter(new THREE.Vector3());
  scene.scale.setScalar(scale);scene.position.set(-center.x*scale,-2.11-box.min.y*scale,-center.z*scale);
  return scene;
 })().catch(error=>{atlasPromise=undefined;throw error;});
}
const active=new WeakMap();
window.thMedical3D={
 async mount(stage,figure){
  if(active.has(stage))return active.get(stage);
  const state={disposed:false,paused:false,mode:'anatomy',yaw:0,pitch:0,zoom:7.2,quality:'auto'};
  active.set(stage,state);
  try{
   const THREE=await getThree();if(state.disposed||!stage.isConnected)return;
   const scene=new THREE.Scene();
   const camera=new THREE.PerspectiveCamera(35,1,.1,100);
   const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'default'});
   const pixelRatio=()=>state.quality==='low'?1:state.quality==='high'?Math.min(devicePixelRatio||1,2):Math.min(devicePixelRatio||1,1.5);
   renderer.setPixelRatio(pixelRatio());renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.domElement.className='medical-three-canvas';
   renderer.domElement.setAttribute('aria-label','Rotatable 3D male body illustration. Drag to rotate; pinch or scroll to zoom.');
   renderer.domElement.style.touchAction='none';
   stage.append(renderer.domElement);
   const body=new THREE.Group();scene.add(body);
   scene.add(new THREE.HemisphereLight(0x8bc9ff,0x203859,1.45));
   const key=new THREE.DirectionalLight(0xe6f4ff,2.1);key.position.set(3,5,5);scene.add(key);
   const rim=new THREE.DirectionalLight(0x1ebfff,3.3);rim.position.set(-4,2,-4);scene.add(rim);
   const skin=new THREE.MeshStandardMaterial({color:0x997363,roughness:.72});
   const fascia=new THREE.MeshStandardMaterial({color:0x22436a,roughness:.52,metalness:.24});
   const fiber=new THREE.MeshStandardMaterial({color:0x894957,roughness:.56,metalness:.2});
   const tendon=new THREE.MeshStandardMaterial({color:0x608ac2,roughness:.46,metalness:.24});
   const torsoAnatomy=fascia.clone();torsoAnatomy.transparent=true;torsoAnatomy.opacity=.45;torsoAnatomy.depthWrite=false;
   const scan=new THREE.MeshStandardMaterial({color:0x267fba,emissive:0x082d57,transparent:true,opacity:.22,depthWrite:false,roughness:.35});
   const hair=new THREE.MeshStandardMaterial({color:0x171822,roughness:.86});
   const shadow=new THREE.MeshStandardMaterial({color:0x594047,roughness:.78});
   const iris=new THREE.MeshStandardMaterial({color:0x192d44,roughness:.34});
   const pale=new THREE.MeshStandardMaterial({color:0xbcc9d6,roughness:.55});
   const surface=new THREE.Group(), muscles=new THREE.Group(), face=new THREE.Group(), skeleton=new THREE.Group();
   const organs=new THREE.Group(), skinMeshes=[];
   let atlas,atlasSkeleton,atlasDeep,atlasMuscles;
   body.add(surface,muscles,face,skeleton,organs);
   const sphere=new THREE.SphereGeometry(1,28,20);
   function ell(group,material,x,y,z,sx,sy,sz,rotation=0){
    const mesh=new THREE.Mesh(sphere,material);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.rotation.z=rotation;
    group.add(mesh);return mesh;
   }
   // Horizontal elliptical sections describe a continuous silhouette with no limb seams.
   function loft(group,material,sections){
    const profile=new THREE.CatmullRomCurve3(sections.map(([y,x,z])=>new THREE.Vector3(x,y,z)));
    const radii=new THREE.CatmullRomCurve3(sections.map(([, , ,rx,rz],i)=>new THREE.Vector3(rx,rz,i)));
    const sides=32,steps=sections.length*5,vertices=[],indices=[];
    for(let row=0;row<=steps;row++){
     const t=row/steps,center=profile.getPoint(t),radius=radii.getPoint(t);
     for(let j=0;j<sides;j++){
      const angle=j/sides*Math.PI*2;
      vertices.push(center.x+Math.max(.002,radius.x)*Math.cos(angle),center.y,center.z+Math.max(.002,radius.y)*Math.sin(angle));
      if(row<steps){
       const a=row*sides+j,b=row*sides+(j+1)%sides;
       indices.push(a,a+sides,b,b,a+sides,b+sides);
      }
     }
    }
    for(let j=1;j<sides-1;j++)indices.push(0,j,j+1,steps*sides,steps*sides+j+1,steps*sides+j);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);group.add(mesh);return mesh;
   }
   function tube(group,material,points,radius){
    const curve=new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point)));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(14,points.length*3),radius,8,false),material);
    group.add(mesh);return mesh;
   }
   const torso=[
    [-.30,0,.005,.10,.10],[-.22,0,0,.28,.16],[-.05,0,0,.33,.22],[.15,0,0,.30,.18],
    [.41,0,0,.265,.17],[.62,0,0,.32,.20],[.88,0,0,.40,.22],[1.10,0,0,.46,.215],
    [1.24,0,0,.43,.18],[1.34,0,0,.23,.13],[1.44,0,0,.105,.10]
   ];
   skinMeshes.push(loft(surface,skin,torso));
   const neck=[[1.18,0,0,.18,.13],[1.32,0,0,.135,.115],[1.48,0,.015,.104,.11],[1.57,0,.025,.118,.115]];
   skinMeshes.push(loft(surface,skin,neck));
   const head=[[1.48,0,.06,.045,.055],[1.53,0,.051,.105,.109],[1.61,0,.027,.147,.137],
    [1.72,0,.019,.156,.155],[1.81,0,.013,.152,.151],[1.89,0,.002,.132,.135],[1.95,0,0,.073,.082],[1.97,0,0,.007,.01]];
   skinMeshes.push(loft(surface,skin,head));
   ell(face,hair,0,1.88,-.037,.145,.087,.124);
   ell(face,skin,0,1.674,.17,.028,.057,.034);
   ell(face,skin,0,1.637,.182,.039,.019,.029);
   tube(face,shadow,[[-.047,1.587,.148],[0,1.582,.164],[.047,1.587,.148]],.004);
   for(const s of [-1,1]){
    const side=(rows)=>rows.map(([y,x,z,rx,rz])=>[y,s*x,z,rx,rz]);
    const arm=side([
     [-.23,.70,.047,.044,.033],[-.18,.70,.035,.067,.041],[-.07,.685,.013,.069,.047],
     [.045,.67,.004,.053,.045],[.19,.639,0,.069,.059],[.36,.606,0,.093,.083],
     [.49,.582,-.012,.092,.088],[.62,.568,-.012,.092,.085],[.82,.538,0,.113,.105],
     [1.02,.498,0,.132,.124],[1.16,.46,0,.125,.137],[1.22,.439,0,.064,.085]
    ]);
    const leg=side([
     [-2.03,.245,.010,.062,.07],[-1.92,.242,-.004,.067,.071],[-1.73,.232,-.022,.074,.078],
     [-1.53,.218,-.050,.095,.106],[-1.31,.211,-.043,.114,.121],[-1.09,.196,-.011,.103,.107],
     [-.98,.183,.008,.103,.115],[-.83,.179,.008,.122,.129],[-.65,.177,.004,.147,.15],
     [-.43,.164,-.002,.175,.174],[-.23,.151,-.004,.179,.185],[-.10,.141,-.018,.137,.163]
    ]);
    skinMeshes.push(loft(surface,skin,arm),loft(surface,skin,leg));
    skinMeshes.push(ell(surface,skin,s*.244,-2.055,.075,.086,.06,.177,s*.02));
    skinMeshes.push(ell(surface,skin,s*.248,-2.074,.171,.09,.039,.096));
    for(let i=0;i<4;i++){
     const x=.65+i*.028,length=[.13,.155,.143,.116][i];
     skinMeshes.push(tube(surface,skin,[[s*x,-.168,.045],[s*(x+.006),-.218,.044],[s*(x+.006),-.168-length,.061]],.014-i*.0011));
    }
    skinMeshes.push(tube(surface,skin,[[s*.644,-.096,.037],[s*.617,-.144,.058],[s*.617,-.188,.075]],.021));
    ell(face,skin,s*.145,1.675,-.002,.025,.053,.036,s*.12);
    ell(face,pale,s*.066,1.724,.144,.029,.011,.014);
    ell(face,iris,s*.065,1.725,.157,.009,.009,.004);
    tube(face,shadow,[[s*.035,1.749,.152],[s*.069,1.755,.147],[s*.101,1.747,.13]],.006);
    // Long, overlapping muscle volumes and fine paths run along the limbs in anatomy mode.
    for(const [x,y,z,rx,ry,rz,tilt] of [
     [.24,1.099,.157,.198,.104,.071,-.13],[.461,1.067,.051,.107,.155,.107,.37],
     [.537,.79,.091,.080,.205,.056,.19],[.593,.355,.071,.065,.182,.053,.24],
     [.265,.62,.096,.066,.237,.046,-.27],[.105,.503,.157,.077,.214,.037,.07],
     [.161,-.52,.147,.095,.38,.058,-.06],[.248,-.57,.118,.079,.327,.065,.05],
     [.225,-1.44,-.075,.09,.235,.078,.09],[.219,-1.37,.086,.058,.282,.046,.10],
     [.20,1.032,-.165,.17,.24,.085,.28],[.178,-.50,-.116,.101,.295,.08,.06]
    ])ell(muscles,fiber,s*x,y,z,rx,ry,rz,s*tilt);
    for(let i=0;i<3;i++){
     const offset=i*.019;
     tube(muscles,tendon,[[s*(.415+offset),1.20,.091],[s*(.48+offset),1.00,.127],[s*(.52+offset),.80,.113],[s*(.56+offset),.57,.068]],.006);
     tube(muscles,tendon,[[s*(.13+offset),-.28,.174],[s*(.16+offset),-.55,.208],[s*(.167+offset),-.77,.177],[s*(.18+offset),-.96,.108]],.005);
    }
    tube(muscles,tendon,[[s*.16,1.47,.07],[s*.117,1.32,.1],[s*.057,1.17,.151]],.018);
    tube(muscles,tendon,[[s*.202,-1.04,.094],[s*.225,-1.52,.073],[s*.248,-1.98,.06]],.014);
    tube(skeleton,pale,[[s*.153,-.19,0],[s*.174,-.61,.013],[s*.187,-.99,.019],[s*.233,-1.68,.018],[s*.248,-2.02,.03]],.035);
    tube(skeleton,pale,[[s*.464,1.16,0],[s*.54,.79,0],[s*.577,.49,0],[s*.67,.02,0]],.026);
    ell(skeleton,pale,s*.183,-.99,.068,.074,.089,.045);
   }
   function organMaterial(color,emissive,opacity=1){
    return new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:.48,roughness:.53,
      transparent:opacity<1,opacity,depthWrite:opacity===1});
   }
   const systems={};
   function system(name){
    const group=new THREE.Group();organs.add(group);systems[name]=group;return group;
   }
   const lung=organMaterial(0x117bda,0x1257f2,.86),lungDetail=organMaterial(0x59d8ff,0x176fff);
   const heart=organMaterial(0xdd3824,0xff3f1a),vessel=organMaterial(0xfcb252,0xf75129);
   const liver=organMaterial(0x9d3038,0xb31830),gut=organMaterial(0x6e38d0,0x5226c5),gutEdge=organMaterial(0xb86ef2,0x7734e3);
   const lungs=system('lungs'),cardiac=system('heart'),digestive=system('digestive'),brain=system('brain');
   for(const s of [-1,1]){
    loft(lungs,lung,[[.61,s*.135,.174,.035,.034],[.70,s*.166,.184,.117,.067],[.89,s*.18,.19,.133,.071],[1.074,s*.159,.163,.091,.059],[1.185,s*.121,.13,.03,.026]]);
    for(let i=0;i<3;i++)tube(lungs,lungDetail,[[s*.065,1.08,.235],[s*.135,.96-i*.035,.259],[s*(.23-i*.023),.91-i*.069,.249]],.005);
    ell(brain,gutEdge,s*.063,1.82,.101,.079,.09,.102);
   }
   tube(lungs,lungDetail,[[0,1.43,.119],[0,1.26,.132],[0,1.095,.19]],.019);
   loft(cardiac,heart,[[.66,.095,.286,.014,.022],[.72,.062,.288,.06,.054],[.81,.041,.273,.109,.075],[.9,.035,.24,.102,.073],[.963,.012,.219,.065,.058]]);
   tube(cardiac,vessel,[[.028,.887,.294],[.029,.981,.273],[.052,1.033,.235],[.112,1.008,.208]],.026);
   tube(cardiac,vessel,[[-.029,.869,.322],[.024,.835,.353],[.043,.764,.336],[.09,.711,.313]],.008);
   ell(digestive,liver,-.094,.62,.151,.184,.085,.112,.22);
   ell(digestive,organMaterial(0xba6a63,0xae3628),.121,.518,.166,.093,.115,.074,-.47);
   tube(digestive,gutEdge,[[-.125,.42,.199],[-.154,.29,.215],[-.145,.08,.194],[-.064,.014,.168],[.053,.036,.167],[.141,.117,.179],[.156,.304,.195],[.13,.386,.19],[.016,.401,.185],[-.125,.42,.199]],.025);
   tube(digestive,gut,Array.from({length:35},(_,i)=>[Math.sin(i*.72)*.102,.071+i*.0086,.202+Math.cos(i*.72)*.018]),.021);
   for(let i=0;i<18;i++)ell(skeleton,pale,0,1.32-i*.083,-.11,.042,.029,.037);
   for(let i=0;i<7;i++)for(const s of [-1,1]){
    const y=1.12-i*.066;
    tube(skeleton,pale,[[0,y+.02,-.117],[s*.18,y,-.108],[s*.29,y-.038,.006],[s*.21,y-.06,.138],[0,y-.048,.16]],.012);
   }
   const thyroid=system('metabolism');
   const endocrine=organMaterial(0xffbe49,0xff8725);
   for(const side of [-1,1])ell(thyroid,endocrine,side*.045,1.31,.152,.037,.065,.027,side*.25);
   tube(thyroid,endocrine,[[-.045,1.29,.166],[0,1.285,.179],[.045,1.29,.166]],.014);
   thyroid.visible=false;
   const wholeBody=new THREE.Group();body.add(wholeBody);
   const wholeBodyMaterial=new THREE.MeshBasicMaterial({color:0x55dbff,transparent:true,opacity:.55,depthWrite:false});
   for(const [y,radius] of [[1.1,.62],[.45,.54],[-.25,.72],[-1.3,.52]]){
    const marker=new THREE.Mesh(new THREE.TorusGeometry(radius,.009,8,64),wholeBodyMaterial);
    marker.rotation.x=Math.PI/2;marker.position.y=y;wholeBody.add(marker);
   }
   const organCenters=Object.fromEntries(Object.entries(systems).map(([name,group])=>
    [name,new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3())]));
   stage.dataset.model='anatomy-v2';
   state.setMode=mode=>{
    state.mode=mode;
    const detailed=Boolean(atlas)&&mode!=='skin';
    surface.visible=!detailed;muscles.visible=!detailed&&mode==='anatomy';
    const selected=state.system;
    const whole=selected==='hydration'||selected==='fat';
    organs.visible=mode!=='skin'&&!whole&&selected!=='muscle'&&selected!=='bone';
    skeleton.visible=!detailed&&mode==='scan';
    wholeBody.visible=whole&&mode!=='skin';
    wholeBodyMaterial.color.setHex(selected==='fat'?0xffc957:0x55dbff);
    thyroid.visible=selected==='metabolism';
    face.visible=!detailed&&mode!=='scan';
    if(atlas){
     atlas.visible=detailed;
     atlasMuscles.visible=mode==='anatomy';atlasDeep.visible=mode==='anatomy'&&selected==='muscle';atlasSkeleton.visible=mode==='scan';
    }
    for(const mesh of skinMeshes)mesh.material=mode==='skin'?skin:mode==='scan'?scan:fascia;
    if(mode==='anatomy')skinMeshes[0].material=torsoAnatomy;
    brain.visible=mode==='scan'||state.system==='brain';
   };
   state.setSystem=name=>{
    state.system=name;
    const target=name;
    for(const [key,group] of Object.entries(systems)){
     const scale=key===target?1.12:1;
     group.scale.setScalar(scale);group.position.copy(organCenters[key]).multiplyScalar(1-scale);
     if(['heart','lungs','digestive','metabolism','brain'].includes(target))group.visible=key===target;
     else group.visible=true;
    }
    state.setMode(state.mode);
   };
   state.setMode(state.mode);
   void getAtlas(THREE).then(template=>{
    if(state.disposed||!stage.isConnected)return;
    atlas=template.clone(true);
    const normalize=name=>name.replace(/[^a-z]/gi,'').toLowerCase();
    atlas.traverse(node=>{
     const name=normalize(node.name);
     if(name==='skeleton')atlasSkeleton=node;
     if(name==='superficialmuscles')atlasMuscles=node;
     if(name==='deepmuscles')atlasDeep=node;
    });
    body.add(atlas);stage.dataset.model='ecorche-atlas';state.setMode(state.mode);
   }).catch(error=>{if(stage.isConnected)console.warn('Detailed atlas unavailable; anatomy illustration retained.',error);});
   const orbit=new THREE.Group();scene.add(orbit);
   const ringMaterial=new THREE.MeshBasicMaterial({color:0x00dfff,transparent:true,opacity:.55,side:THREE.DoubleSide});
   for(const y of [-2.13]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.75,.012,8,90),ringMaterial);
    ring.rotation.x=Math.PI/2;ring.position.y=y;orbit.add(ring);
   }
   const grid=new THREE.GridHelper(5,18,0x127fba,0x124467);grid.position.y=-2.2;scene.add(grid);
   const scanBeam=new THREE.Mesh(new THREE.PlaneGeometry(2.7,.025),new THREE.MeshBasicMaterial({color:0x86f9ff,transparent:true,opacity:.75,side:THREE.DoubleSide}));
   scanBeam.position.z=.58;scanBeam.visible=false;scene.add(scanBeam);
   const resize=()=>{
    if(!stage.isConnected)return;
    const width=Math.max(stage.clientWidth,200),height=Math.max(stage.clientHeight,350);
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
   };
   const observer=new ResizeObserver(resize);observer.observe(stage);resize();
   const pointers=new Map();let priorDistance=null;
   const down=e=>{renderer.domElement.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY])};
   const move=e=>{
    if(!pointers.has(e.pointerId))return;
    const old=pointers.get(e.pointerId);
    pointers.set(e.pointerId,[e.clientX,e.clientY]);
    if(pointers.size===1){state.yaw+=(e.clientX-old[0])*.008;state.pitch=Math.max(-.75,Math.min(.75,state.pitch+(e.clientY-old[1])*.006))}
    else if(pointers.size===2){const p=[...pointers.values()],distance=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);if(priorDistance)state.zoom=Math.max(5.3,Math.min(11,state.zoom-(distance-priorDistance)*.025));priorDistance=distance}
   };
   const up=e=>{pointers.delete(e.pointerId);priorDistance=null};
   renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);
   renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
   renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();state.zoom=Math.max(5.3,Math.min(11,state.zoom+e.deltaY*.008))},{passive:false});
   state.reset=()=>{state.yaw=0;state.pitch=0;state.zoom=7.2};
   state.setQuality=quality=>{state.quality=['low','auto','high'].includes(quality)?quality:'auto';renderer.setPixelRatio(pixelRatio());resize()};
   state.rotate=(delta)=>{state.yaw+=delta};
   state.zoomBy=(delta)=>{state.zoom=Math.max(5.3,Math.min(11,state.zoom+delta))};
   state.toggleFullscreen=async()=>{const target=figure;if(document.fullscreenElement===target){await document.exitFullscreen()}else if(target.requestFullscreen){await target.requestFullscreen()}else{figure.classList.toggle('medical-3d-expanded')}resize()};
   let clock=0,lastFrame=-Infinity;
   function render(t){
    if(state.disposed||!stage.isConnected){observer.disconnect();const geometries=new Set(),materials=new Set();atlas?.removeFromParent();scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)materials.add(object.material)});[skin,fascia,torsoAnatomy,scan,fiber,tendon,hair,shadow,iris,pale].forEach(material=>materials.add(material));geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());renderer.dispose();renderer.domElement.remove();state.disposed=true;return}
    requestAnimationFrame(render);
    if(t-lastFrame<1000/30&&!pointers.size)return;
    lastFrame=t;
    scanBeam.visible=state.mode==='scan';body.rotation.y=state.yaw;body.rotation.x=state.pitch;if(!state.paused){clock=t*.001;body.scale.y=1+Math.sin(clock*1.5)*.0025;orbit.rotation.y=clock*.1;scanBeam.position.y=Math.sin(clock*.7)*2;}
    camera.position.set(0,0,state.zoom);camera.lookAt(0,-.1,0);renderer.render(scene,camera);
   }
   requestAnimationFrame(render);
  }catch(err){stage.dataset.threeError='true';console.warn('3D scanner unavailable; 2D fallback retained.',err)}
  return state;
 }
};
})();
