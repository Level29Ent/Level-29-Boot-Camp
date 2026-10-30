import * as THREE from 'three';
import {makePerson,applyLoadout,animatePerson} from './art.js';
import {styleFor} from './avatar-styles.js';

export function initWardrobeView(){
  const canvas=document.getElementById('wardrobeCanvas'),label=document.getElementById('wardrobeLabel');
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});}
  catch{label.textContent='3D preview unavailable. Catalog silhouettes and gameplay selection still work.';return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.05,20);
  camera.position.set(0,1.5,4.8);camera.lookAt(0,1.3,0);
  scene.add(new THREE.HemisphereLight('#edf4ff','#403d2b',2));
  const key=new THREE.DirectionalLight('#fff0db',3);key.position.set(3,4,4);scene.add(key);
  const rim=new THREE.DirectionalLight('#9ad2ff',2);rim.position.set(-3,3,-3);scene.add(rim);
  const model=makePerson(scene,0,0,'recruit',{cover:false,skin:0});
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(.65,.75,.06,48),new THREE.MeshStandardMaterial({color:'#26372e',roughness:.9}));
  floor.position.y=-.07;scene.add(floor);
  let rotate=true,angle=Math.PI,visible=false;
  const button=document.getElementById('wardrobeRotate');
  button.onclick=()=>{rotate=!rotate;button.textContent=rotate?'Pause rotation':'Resume rotation';};
  const resize=new ResizeObserver(()=>{
    const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  });resize.observe(canvas);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(canvas);
  window.addEventListener('b29:avatar-preview',event=>{
    const style=styleFor(event.detail.id);applyLoadout(model,'recruit',undefined,style?.id||null);
    angle=Math.PI;canvas.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
    label.textContent=style?style.name+' · '+style.pattern.material+' · 3D preview (selection is separate)':'Cloud kit override cleared · Standard recruit preview';
  });
  let last=performance.now();
  function frame(now){
    requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;
    if(!visible||document.getElementById('service').classList.contains('hidden'))return;
    if(rotate)angle+=dt*.32;
    model.rotation.y=angle;animatePerson(model,false,0);
    renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
}
