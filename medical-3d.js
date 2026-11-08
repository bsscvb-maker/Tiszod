/* TisZod interactive 3D anatomical avatar. Procedural illustrative model, not diagnostic imaging. */
(()=>{
const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
let modulePromise;
function getThree(){return modulePromise??=import(THREE_URL)}
const active=new WeakMap();
window.thMedical3D={
 async mount(stage,figure){
  if(active.has(stage))return active.get(stage);
  const state={disposed:false,paused:false,mode:'skin',yaw:0,pitch:0,zoom:7.6};
  active.set(stage,state);
  try{
   const THREE=await getThree();if(state.disposed||!stage.isConnected)return;
   const scene=new THREE.Scene();
   const camera=new THREE.PerspectiveCamera(35,1,.1,100);
   const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'default'});
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.domElement.className='medical-three-canvas';
   renderer.domElement.setAttribute('aria-label','Rotatable 3D male body illustration. Drag to rotate; pinch or scroll to zoom.');
   renderer.domElement.style.touchAction='none';
   stage.append(renderer.domElement);
   const body=new THREE.Group();scene.add(body);
   scene.add(new THREE.HemisphereLight(0xc9f3ff,0x33435d,2.1));
   const key=new THREE.DirectionalLight(0xffffff,2.6);key.position.set(3,5,5);scene.add(key);
   const rim=new THREE.DirectionalLight(0x16d9ff,2.2);rim.position.set(-4,2,-4);scene.add(rim);
   const skin=new THREE.MeshStandardMaterial({color:0xd9aa8c,roughness:.78,metalness:0});
   const darkSkin=new THREE.MeshStandardMaterial({color:0xb17d65,roughness:.85});
   const hair=new THREE.MeshStandardMaterial({color:0x41342f,roughness:1});
   const eye=new THREE.MeshStandardMaterial({color:0x292c33});
   const muscle=new THREE.MeshStandardMaterial({color:0xb75a58,roughness:.62,metalness:.08});
   const bone=new THREE.MeshStandardMaterial({color:0xe5e6d9,roughness:.48});
   const scan=new THREE.MeshStandardMaterial({color:0x3ae5ff,roughness:.2,metalness:.45,transparent:true,opacity:.46,wireframe:true});
   const parts=[];
   function ell(parent,x,y,z,sx,sy,sz,material,rotation=0){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),material);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.rotation.z=rotation;parent.add(mesh);parts.push(mesh);return mesh;
   }
   function link(parent,a,b,r1,r2,mat){
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),mid=A.clone().add(B).multiplyScalar(.5);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,A.distanceTo(B),16,1),mat);
    mesh.position.copy(mid);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());
    parent.add(mesh);parts.push(mesh);return mesh;
   }
   // Anatomically suggestive proportions; complete 360-degree geometry, not a flat image.
   ell(body,0,1.55,0,.24,.31,.23,skin);
   ell(body,0,1.82,-.04,.24,.13,.23,hair);
   ell(body,0,1.31,.05,.12,.13,.12,skin);
   ell(body,0,1.02,0,.49,.57,.27,skin);
   ell(body,0,.45,0,.36,.3,.25,skin);
   ell(body,0,.17,0,.36,.24,.25,skin);
   ell(body,-.18,1.1,.18,.24,.25,.11,skin);
   ell(body,.18,1.1,.18,.24,.25,.11,skin);
   ell(body,-.085,1.59,.215,.018,.018,.009,eye);
   ell(body,.085,1.59,.215,.018,.018,.009,eye);
   ell(body,0,1.49,.23,.055,.085,.065,darkSkin);
   for(const side of [-1,1]){
    ell(body,side*.53,1.13,0,.19,.19,.19,skin);
    link(body,[side*.55,1.09,0],[side*.67,.48,0],.145,.13,skin);
    ell(body,side*.67,.48,0,.14,.14,.14,skin);
    link(body,[side*.67,.45,0],[side*.73,-.02,.02],.13,.095,skin);
    ell(body,side*.73,-.13,.04,.105,.17,.085,skin);
    for(let i=0;i<4;i++)link(body,[side*(.65+i*.05),-.23,.04],[side*(.65+i*.05),-.43,.04],.024,.019,skin);
    ell(body,side*.22,.04,0,.24,.23,.24,skin);
    link(body,[side*.22,-.02,0],[side*.23,-.94,0],.22,.16,skin);
    ell(body,side*.23,-.96,.04,.18,.18,.18,skin);
    link(body,[side*.23,-1.02,0],[side*.25,-1.94,.02],.16,.105,skin);
    ell(body,side*.25,-2.01,.12,.145,.11,.27,skin);
   }
   // Dynamic mode swaps physical surface materials without changing the rotatable geometry.
   state.setMode=mode=>{
    state.mode=mode;
    for(const p of parts){
     if(p.material===hair||p.material===eye)continue;
     p.material=mode==='skin'?skin:mode==='anatomy'?muscle:mode==='scan'?scan:skin;
    }
    if(mode==='skin'){parts[0].material=skin;parts[1].material=hair;}
    if(mode==='anatomy'){parts[1].material=hair;}
    if(mode==='scan'){parts[1].material=scan;}
   };
   const orbit=new THREE.Group();scene.add(orbit);
   const ringMaterial=new THREE.MeshBasicMaterial({color:0x00dfff,transparent:true,opacity:.55,side:THREE.DoubleSide});
   for(const y of [-2.05,-.3,1.65]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(y===-2.05?.7:.9,.012,8,90),ringMaterial);
    ring.rotation.x=Math.PI/2;ring.position.y=y;orbit.add(ring);
   }
   const grid=new THREE.GridHelper(5,18,0x127fba,0x124467);grid.position.y=-2.2;scene.add(grid);
   const scanBeam=new THREE.Mesh(new THREE.PlaneGeometry(2.7,.025),new THREE.MeshBasicMaterial({color:0x86f9ff,transparent:true,opacity:.75,side:THREE.DoubleSide}));
   scanBeam.position.z=.58;scene.add(scanBeam);
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
   state.reset=()=>{state.yaw=0;state.pitch=0;state.zoom=7.6};
   let frame=0,clock=0;
   function render(t){
    if(state.disposed||!stage.isConnected){observer.disconnect();renderer.dispose();renderer.domElement.remove();state.disposed=true;return}
    if(!state.paused){clock=t*.001;body.rotation.y=state.yaw;body.rotation.x=state.pitch;body.scale.y=1+Math.sin(clock*1.5)*.0025;orbit.rotation.y=clock*.1;scanBeam.position.y=Math.sin(clock*.7)*2;}
    camera.position.set(0,0,state.zoom);camera.lookAt(0,-.1,0);renderer.render(scene,camera);frame=requestAnimationFrame(render);
   }
   frame=requestAnimationFrame(render);
  }catch(err){stage.dataset.threeError='true';console.warn('3D scanner unavailable; 2D fallback retained.',err)}
  return state;
 }
};
})();