import * as THREE from 'three';
import {loadSettings,saveSettings,qualityProfile} from './game-feel.js';
export function initPresentation({renderer,lights,refresh}){
  const settings=loadSettings(),panel=document.createElement('section');panel.id='fieldSettings';panel.className='hidden';
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','fieldSettingsTitle');
  panel.innerHTML='<div class="sheet narrow"><div class="brief-phase">FIELD OPTIONS</div><h2 id="fieldSettingsTitle" class="sheet-title">MAKE IT YOURS</h2><label>Graphics<select id="graphicsQuality"><option value="performance">Performance · no shadows</option><option value="balanced">Balanced · soft shadows</option><option value="high">High · sharper resolution / shadows</option></select></label><label>Look sensitivity<input id="lookSensitivity" type="range" min="0.4" max="2" step="0.1"><output id="sensitivityValue"></output></label><label class="remember-choice"><input id="reduceMotion" type="checkbox"> Reduce camera effects & motion</label><p id="fieldSettingsStatus" role="status"></p><button id="closeFieldSettings" class="btn primary">Close options</button></div>';
  document.getElementById('app').appendChild(panel);
  const button=document.createElement('button');button.id='fieldSettingsButton';button.className='global-button';button.textContent='OPTIONS';button.setAttribute('aria-controls','fieldSettings');document.getElementById('app').appendChild(button);
  const quality=panel.querySelector('#graphicsQuality'),sensitivity=panel.querySelector('#lookSensitivity'),motion=panel.querySelector('#reduceMotion');
  let returnFocus=null,denseMode=false;
  function apply(){
    const p=qualityProfile(settings.quality,devicePixelRatio);
    // Ten moving soldiers/course opponents previously ran without shadow maps.
    // Balanced preserves that budget; High explicitly opts into dynamic shadows.
    if(denseMode&&settings.quality==='balanced'){p.shadows=false;p.ratio=Math.min(p.ratio,1.25);}
    renderer.setPixelRatio(p.ratio);renderer.shadowMap.enabled=p.shadows;
    if(lights.sun.shadow.mapSize.x!==p.mapSize){lights.sun.shadow.map?.dispose();lights.sun.shadow.map=null;lights.sun.shadow.mapSize.set(p.mapSize,p.mapSize);}
    document.body.classList.toggle('reduced-motion',settings.reducedMotion);refresh?.();
  }
  function close(){panel.classList.add('hidden');returnFocus?.focus();}
  button.onclick=()=>{
    // Pause local modes via their existing button; online rooms keep their clocks.
    window.dispatchEvent(new Event('b29:options-open'));
    returnFocus=document.activeElement;panel.classList.remove('hidden');quality.focus();
  };
  panel.querySelector('#closeFieldSettings').onclick=close;
  panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'){
    const items=[...panel.querySelectorAll('button,input,select')],index=items.indexOf(document.activeElement);
    if(e.shiftKey&&index===0){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&index===items.length-1){e.preventDefault();items[0].focus();}
  }};
  quality.value=settings.quality;sensitivity.value=settings.sensitivity;motion.checked=settings.reducedMotion;
  const update=()=>{settings.quality=quality.value;settings.sensitivity=+sensitivity.value;settings.reducedMotion=motion.checked;panel.querySelector('output').textContent=settings.sensitivity.toFixed(1)+'×';apply();panel.querySelector('#fieldSettingsStatus').textContent=saveSettings(settings)?'Options saved on this device.':'Storage unavailable · options apply for this session.';};
  quality.onchange=sensitivity.oninput=motion.onchange=update;panel.querySelector('output').textContent=settings.sensitivity.toFixed(1)+'×';apply();
  const feedback=document.createElement('div');feedback.id='fieldFeedback';feedback.setAttribute('aria-hidden','true');document.getElementById('app').appendChild(feedback);let clear;
  window.addEventListener('b29:feedback',e=>{feedback.dataset.kind=e.detail;feedback.classList.remove('pulse');void feedback.offsetWidth;feedback.classList.add('pulse');clearTimeout(clear);clear=setTimeout(()=>feedback.classList.remove('pulse'),260);});
  return {settings,apply,setDense:enabled=>{denseMode=enabled;apply();},isOpen:()=>!panel.classList.contains('hidden')};
}
export const feedback=kind=>window.dispatchEvent(new CustomEvent('b29:feedback',{detail:kind}));
// Merged, non-colliding scene accents: no external assets, lights or per-frame particles.
export function dressField(world,kind,extent=85){
  const vertices=[],colors=[],c=new THREE.Color();
  const add=(x,y,z,w,d,color)=>{c.set(color);for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]){vertices.push(x+a*w/2,y,z+b*d/2);colors.push(c.r,c.g,c.b);}};
  if(kind==='war'){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#998c68';ctx.fillRect(0,0,128,128);
    // Deterministic grit and tyre tracks, not per-frame random particles.
    for(let i=0;i<2200;i++){const x=(i*73)%128,y=(i*37+Math.floor(i/128)*19)%128;ctx.fillStyle=i%2?'#aa9e7c':'#877c60';ctx.fillRect(x,y,1,1);}
    ctx.fillStyle='#8c8061';ctx.fillRect(29,0,4,128);ctx.fillRect(94,0,4,128);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(8,12);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(45,65),new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.025,roughness:1}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.02;ground.receiveShadow=true;ground.userData.ownedPresentation=true;world.add(ground);

    for(const side of [-1,1])for(let z=-29;z<30;z+=4)add(side*20,.025,z,.18,1.8,'#d2c496');
    for(const z of [-24,24]){add(0,.028,z,12,.15,'#ead8a3');for(let x=-5;x<=5;x+=2)add(x,.03,z, .16,1.5,'#ead8a3');}
    for(const side of [-1,1])for(let z=-25;z<=25;z+=10)add(side*23,.03,z,2,2,'#645e49');
  }else if(!['swim','range','drill','combat','mout'].includes(kind)){
    for(let z=4;z>-extent;z-=6){for(const side of [-1,1])add(side*4.7,.026,z,.12,2.8,'#c8b78b');}
    for(let z=0;z>-extent;z-=20){add(0,.028,z,1,.12,'#cfba80');add(-.35,.029,z-.35,.13,.65,'#cfba80');add(.35,.029,z-.35,.13,.65,'#cfba80');}
  }
  if(!vertices.length)return;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.userData.ownedPresentation=true;world.add(mesh);
}
