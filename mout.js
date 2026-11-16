import * as THREE from 'three';
import {bestDrill,saveDrillRecord} from './field-records.js';
import {feedback} from './presentation.js';
import * as A from './art.js';
import {MOUT_LIMIT,MOUT_MAGAZINE,MOUT_ROOMS,wallsFor,floorAt,canMove,createDrill,tickDrill,recordShot,clearedRooms,accuracyFor,extractDrill,drillScore} from './mout-rules.js';
const $=id=>document.getElementById(id);
const stamp=seconds=>Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');

export function initMout(api){
  const m={active:false};let state=createDrill(),position=new THREE.Vector3(0,0,5),doors=[],targets=[],solids=[],ownedMaterials=[],ownedTextures=[],weapon=null;
  let heldFire=false,cooldown=0,notice='',noticeUntil=0,look={yaw:0,pitch:.05},saved=null,flash=0;
  const raycaster=new THREE.Raycaster(),center=new THREE.Vector2();
  const clock=()=>api.now?api.now():performance.now();let lastClock=clock();
  function setNotice(text){notice=text;noticeUntil=state.elapsed+2;}
  function controls(enabled){
    const labels=enabled?{'e':'E<br><small>BREACH</small>',' ':'R<br><small>RELOAD</small>','c':'C<br><small>CROUCH</small>','shift':'RUN<br><small>SPRINT</small>'}:
      {'e':'E<br><small>USE</small>',' ':'↑<br><small>JUMP</small>','c':'C<br><small>CRAWL</small>','shift':'⇧<br><small>SPRINT</small>'};
    for(const [key,label] of Object.entries(labels)){
      const button=$('touchControls').querySelector(`[data-key="${key}"]`);if(button)button.innerHTML=label;
    }
  }
  function unlock(){if(document.pointerLockElement===api.canvas)document.exitPointerLock();heldFire=false;}
  m.exit=()=>{
    if(!m.active)return;
    m.active=false;touch=null;unlock();api.clearKeys();document.body.classList.remove('mout-active');$('moutHud').classList.add('hidden');controls(false);
    if(weapon){weapon.parent?.remove(weapon);weapon.geometry.dispose();weapon=null;}
    api.world.traverse(object=>{if(object.isLight)object.dispose?.();});
    api.clearWorld();
    for(const material of ownedMaterials)material.dispose();for(const texture of ownedTextures)texture.dispose();
    ownedMaterials=[];ownedTextures=[];doors=[];targets=[];solids=[];
    if(saved){
      api.lights.hemi.color.copy(saved.hemiColor);api.lights.hemi.groundColor.copy(saved.groundColor);api.lights.hemi.intensity=saved.hemiIntensity;
      api.lights.sun.color.copy(saved.sunColor);api.lights.sun.intensity=saved.sunIntensity;api.lights.sun.castShadow=saved.castShadow;
      api.scene.background=saved.background;api.scene.fog=saved.fog;api.renderer.toneMappingExposure=saved.exposure;
      api.renderer.shadowMap.enabled=saved.shadows;api.camera.fov=saved.fov;api.camera.updateProjectionMatrix();saved=null;
    }
  };
  m.open=()=>{api.stopModes();api.setMode('moutBrief');api.show('moutBrief');const best=bestDrill();$('moutBest').textContent=best?'YOUR BEST · '+best.score+' points · '+best.time.toFixed(2)+'s · '+best.accuracy+'% accuracy':'Complete an extraction to save your personal best on this device.';};
  $('btnMout').onclick=m.open;$('moutBack').onclick=api.title;
  $('moutDeploy').onclick=()=>start();$('moutRetry').onclick=()=>start();$('moutResultBack').onclick=api.title;
  $('moutPauseButton').onclick=()=>m.pause();$('moutResume').onclick=()=>m.pause();$('moutAbort').onclick=api.title;
  m.pause=()=>{
    if(!m.active||state.ended)return;
    if(api.mode()==='playing'){unlock();api.clearKeys();api.setMode('moutPause');api.show('moutPause');}
    else if(api.mode()==='moutPause'){lastClock=clock();api.clearKeys();api.setMode('playing');api.show(null);}
  };
  api.canvas.addEventListener('pointerdown',e=>{
    if(!m.active||state.ended||api.mode()!=='playing'||e.pointerType!=='mouse'||e.button!==0)return;
    heldFire=true;
    if(document.pointerLockElement!==api.canvas)try{api.canvas.requestPointerLock?.()?.catch?.(()=>{});}catch{/* Drag look is available in embedded webviews. */}
  });
  window.addEventListener('pointerup',()=>{heldFire=false;});window.addEventListener('blur',()=>{heldFire=false;});
  document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==api.canvas){heldFire=false;if(m.active)api.clearKeys();}});
  m.pointerMove=e=>{
    if(!m.active)return false;
    if(api.mode()!=='playing')return true;
    const gain=(api.input().keys.k ? .0012 : .0025)*(api.settings?.().sensitivity||1);
    if(document.pointerLockElement===api.canvas){look.yaw-=e.movementX*gain;look.pitch-=e.movementY*gain;}
    else if(e.pointerType==='mouse'&&e.buttons){
      if(e.buttons){look.yaw-=(e.movementX||0)*gain;look.pitch-=(e.movementY||0)*gain;}
    }
    look.pitch=THREE.MathUtils.clamp(look.pitch,-1.05,1.05);return true;
  };
  // Touch pointer movement in some webviews lacks movementX/Y.
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&m.active&&api.mode()==='playing')m.pause();});
  let touch=null;
  api.canvas.addEventListener('pointerdown',e=>{if(m.active&&e.pointerType!=='mouse')touch={id:e.pointerId,x:e.clientX,y:e.clientY};});
  api.canvas.addEventListener('pointermove',e=>{
    if(!m.active||!touch||touch.id!==e.pointerId||api.mode()!=='playing')return;
    look.yaw-=(e.clientX-touch.x)*.003*(api.settings?.().sensitivity||1);look.pitch=THREE.MathUtils.clamp(look.pitch-(e.clientY-touch.y)*.003*(api.settings?.().sensitivity||1),-1.05,1.05);
    touch={id:e.pointerId,x:e.clientX,y:e.clientY};
  });
  for(const event of ['pointerup','pointercancel'])api.canvas.addEventListener(event,()=>{touch=null;});

  function metalTexture(){
    const size=64,data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=(y*size+x)*4,rib=135+Math.sin(x/size*Math.PI*8)*65,wear=((x*13+y*29)%17)*2;
      data[i]=data[i+1]=data[i+2]=rib+wear;data[i+3]=255;
    }
    const tex=new THREE.DataTexture(data,size,size);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(4,2);tex.needsUpdate=true;ownedTextures.push(tex);return tex;
  }
  function build(){
    const texture=metalTexture(),palette=['#4c6158','#765c46','#596779'];
    const mats=palette.map(color=>new THREE.MeshStandardMaterial({color,metalness:.25,roughness:.82,bumpMap:texture,bumpScale:.055}));
    const dark=new THREE.MeshStandardMaterial({color:'#282e30',metalness:.6,roughness:.65});
    const floor=new THREE.MeshStandardMaterial({color:'#565955',metalness:.25,roughness:.9});
    const gold=new THREE.MeshStandardMaterial({color:'#ffc95b',roughness:.75});
    const lamp=new THREE.MeshBasicMaterial({color:'#fff5cd'});ownedMaterials.push(...mats,dark,floor,gold,lamp);
    function box(w,h,d,material,x,y,z,blocking=false){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;api.world.add(mesh);if(blocking)solids.push(mesh);return mesh;
    }
    box(25,.2,52,floor,0,-.22,-12);
    // Every modeled wall is also a ray occluder; collision uses the same layout.
    for(const r of MOUT_ROOMS){
      const mat=mats[r.side===-1?0:1];
      box(5.5,.12,8,dark,r.side*4.25,r.y-.08,r.z);
      box(5.5,.12,8,mat,r.side*4.25,r.y+2.86,r.z,true);
      for(const w of wallsFor(r))box(w.w,w.h,w.d,mat,w.x,w.y,w.z,true);
      // Corner posts and container corrugation are batched to keep draw calls bounded.
      const ribs=new A.Builder();
      for(const x of [r.side*1.5,r.side*7])for(const z of [r.z-4,r.z+4])ribs.box(.2,2.92,.2,'#30393b',x,r.y+1.4,z);
      for(let z=r.z-3.8;z<r.z+4;z+=.36)ribs.box(.065,2.65,.055,'#718078',r.side*7.1,r.y+1.35,z);
      for(let z=r.z-3.8;z<r.z+4;z+=.28){
        if(Math.abs(z-r.z)>1.1)ribs.box(.045,2.35,.05,'#62746e',r.side*1.4,r.y+1.25,z);
      }
      // Visible corner-fed door jambs and threshold caution strips.
      for(const side of [-1,1])ribs.box(.07,2.4,.08,'#d4af4f',r.side*1.37,r.y+1.2,r.z+side*1.03);
      ribs.mesh(api.world);
      const door=box(.14,2.4,1.9,dark,r.side*1.5,r.y+1.2,r.z,true);doors.push({room:r,mesh:door});
      const sign=api.label(r.id+' / BREACH',r.side*1.38,r.y+2.55,r.z,'#ffd480',1.7);sign.rotation.y=r.side===1?-Math.PI/2:Math.PI/2;
      for(let i=0;i<3;i++){
        const friendly=i===2,z=r.z+(i===0?-1.8:i===1?1.8:0),x=r.side*6.2;
        const material=new THREE.MeshStandardMaterial({color:friendly?'#459bd1':'#d64c39',roughness:.9});ownedMaterials.push(material);
        const board=box(.1,1.35,.68,material,x,r.y+1.23,z);board.userData.target=true;
        const head=box(.12,.32,.32,material,x,r.y+2.05,z);head.userData.target=true;
        box(.12,1,.1,dark,x,r.y+.25,z);
        const marker=api.label(friendly?'NO SHOOT':'THREAT',x-r.side*.08,r.y+2.42,z,friendly?'#98ddff':'#ffc18c',.95);marker.rotation.y=r.side===1?-Math.PI/2:Math.PI/2;
        targets.push({room:r,friendly,down:false,meshes:[board,head],marker});
      }
    }
    // Stacked rear ISO shells support the second-storey breach rooms.
    for(const side of [-1,1]){
      box(5.5,2.8,.16,mats[2],side*4.25,1.4,-30,true);
      box(.16,2.8,8,mats[2],side*7,1.4,-26,true);
      box(5.5,2.8,.16,mats[2],side*4.25,1.4,-22,true);
      api.label('ISO / STACK 02',side*4.25,1.7,-21.89,'#bac5b8',2);
    }
    box(2.8,.12,8,dark,0,2.92,-26);
    // Ramp surface goes from ground to the 3m catwalk; walk height is analytical.
    const ramp=box(2.8,.12,Math.hypot(6,3),dark,0,1.43,-19);ramp.rotation.x=Math.atan(.5);
    const rails=new A.Builder();
    for(const side of [-1,1]){
      for(let z=-16;z>=-22;z-=1){const y=(-16-z)/2;rails.box(.055,1.1,.055,'#aeb5ad',side*1.36,y+.5,z);}
      for(let z=-22;z>=-30;z-=1.5)if(Math.abs(z+26)>1.3)rails.box(.055,1.1,.055,'#aeb5ad',side*1.37,3.5,z);
      for(const z of [-28.65,-23.35])rails.box(.06,.06,2.7,'#aeb5ad',side*1.37,4.02,z);
      const handrail=box(.055,.055,Math.hypot(6,3),dark,side*1.36,2.48,-19);handrail.rotation.x=Math.atan(.5);
    }
    rails.mesh(api.world);
    box(2.8,.06,.3,gold,0,3.02,-28.5);
    const extract=api.label('EXTRACTION / CLEAR ALL 6 ROOMS',0,4.7,-29.8,'#8fffb6',3);extract.name='mout-extraction';
    api.label('MOUT / SHOOT HOUSE',0,4.2,1,'#ffc95b',2.8);
    // Harsh overhead fixtures; one shadow caster plus fill spots for mobile budget.
    for(const [i,z] of [0,-12,-25].entries()){
      for(const side of [-1,1])box(.12,8,.12,dark,side*9,3.8,z);
      box(18,.12,.12,dark,0,7.8,z);box(2,.12,.6,lamp,0,7.6,z);
      const light=new THREE.SpotLight('#fff0d0',105,30,Math.PI/3,.3,1.2);light.position.set(0,7.5,z);light.target.position.set(0,0,z-3);api.world.add(light,light.target);
      if(i===1){light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0005;light.shadow.normalBias=.04;}
    }
    // Room practicals keep target colors readable even inside the covered shells.
    for(const r of MOUT_ROOMS){
      box(1.8,.08,.25,lamp,r.side*4.2,r.y+2.68,r.z);
      const light=new THREE.PointLight('#d9e8ef',16,9,1.2);light.position.set(r.side*4.2,r.y+2.5,r.z);api.world.add(light);
    }
    weapon=A.makeRifle(api.camera,.28,-.27,-.6);
  }
  function start(){
    m.exit();api.stopModes();api.clearWorld();state=createDrill();position.set(0,0,5);look={yaw:0,pitch:.05};heldFire=false;cooldown=0;notice='CLEAR FOUR GROUND ROOMS, THEN TAKE THE RAMP';noticeUntil=5;flash=0;
    saved={hemiColor:api.lights.hemi.color.clone(),groundColor:api.lights.hemi.groundColor.clone(),hemiIntensity:api.lights.hemi.intensity,
      sunColor:api.lights.sun.color.clone(),sunIntensity:api.lights.sun.intensity,castShadow:api.lights.sun.castShadow,
      background:api.scene.background,fog:api.scene.fog,exposure:api.renderer.toneMappingExposure,shadows:api.renderer.shadowMap.enabled,fov:api.camera.fov};
    A.applyEnv('night',api.scene,api.lights,api.renderer);api.scene.background=new THREE.Color('#151f25');api.scene.fog=new THREE.Fog('#18232b',22,65);
    api.lights.hemi.intensity=.85;api.lights.sun.intensity=.5;api.lights.sun.castShadow=false;api.renderer.toneMappingExposure=1.15;api.renderer.shadowMap.enabled=true;
    if(!api.camera.parent)api.scene.add(api.camera);
    lastClock=clock();m.active=true;document.body.classList.add('mout-active');api.setMode('playing');api.show(null);api.clearKeys();controls(true);$('moutHud').classList.remove('hidden');api.startAudio();build();api.applyQuality?.();updateCamera();renderHud();
  }
  function updateCamera(){
    const crouch=api.input().keys.c;api.camera.position.set(position.x,position.y+(crouch?1.05:1.65),position.z);
    const direction=new THREE.Vector3(-Math.sin(look.yaw)*Math.cos(look.pitch),Math.sin(look.pitch),-Math.cos(look.yaw)*Math.cos(look.pitch));
    api.camera.lookAt(api.camera.position.clone().add(direction));api.camera.fov=api.input().keys.k?48:72;api.camera.updateProjectionMatrix();api.camera.updateMatrixWorld();
    if(weapon){weapon.position.z=-.6+(api.settings?.().reducedMotion?0:flash*.5);weapon.position.y=-.27+(state.reload>0?-.15:0);}
  }
  function fire(){
    if(state.reload||!state.ammo){if(!state.ammo)setNotice('EMPTY · RELOAD / R OR SPACE');return;}
    api.world.updateMatrixWorld(true);raycaster.setFromCamera(center,api.camera);
    const live=targets.filter(t=>!t.down),boards=live.flatMap(t=>t.meshes),closed=doors.filter(d=>!state.opened.has(d.room.id)).map(d=>d.mesh);
    const hit=raycaster.intersectObjects([...solids.filter(mesh=>!doors.some(d=>d.mesh===mesh)),...closed,...boards],false)[0];
    const target=hit&&live.find(t=>t.meshes.includes(hit.object));
    recordShot(state,target&&!target.friendly?target.room.id:null,!!target?.friendly);
    if(target){feedback(target.friendly?'penalty':'hit');$('moutReticle').classList.toggle('confirmed',!target.friendly);target.down=true;for(const mesh of target.meshes)mesh.visible=false;target.marker.visible=false;setNotice(target.friendly?'NO-SHOOT HIT · −250 SCORE':'TARGET DOWN');}
    else setNotice('MISS / COVER HIT');
    api.tone(70,.055,'sawtooth',.04);flash=.1;cooldown=.22;
  }
  m.update=dt=>{
    if(!m.active||state.ended||api.mode()!=='playing')return;
    const now=clock(),elapsedDelta=Math.max(0,(now-lastClock)/1000);lastClock=now;
    const input=api.input();tickDrill(state,elapsedDelta);if(state.ended){finish();return;}
    cooldown=Math.max(0,cooldown-elapsedDelta);if(cooldown===0)$('moutReticle').classList.remove('confirmed');flash=Math.max(0,flash-elapsedDelta);
    const gain=input.keys.k ? .8 : 1.6;
    look.yaw+=((input.keys.arrowleft?1:0)-(input.keys.arrowright?1:0))*dt*gain;
    look.pitch=THREE.MathUtils.clamp(look.pitch+((input.keys.arrowup?1:0)-(input.keys.arrowdown?1:0))*dt,-1.05,1.05);
    const pad=api.gamepadLook();if(pad){look.yaw-=pad.x*dt*1.8*(api.settings?.().sensitivity||1);look.pitch=THREE.MathUtils.clamp(look.pitch-pad.y*dt*1.2*(api.settings?.().sensitivity||1),-1.05,1.05);}
    let dx=(input.keys.d?1:0)-(input.keys.a?1:0),dz=(input.keys.s?1:0)-(input.keys.w?1:0);
    if(input.joy.on){dx=input.joy.x;dz=input.joy.y;}
    const length=Math.max(1,Math.hypot(dx,dz));dx/=length;dz/=length;
    const speed=input.keys.c?1.6:input.keys.shift?4.8:3.2;
    const vx=(dx*Math.cos(look.yaw)+dz*Math.sin(look.yaw))*speed*dt,vz=(-dx*Math.sin(look.yaw)+dz*Math.cos(look.yaw))*speed*dt;
    if(canMove(position.x+vx,position.z,position.y,state.opened))position.x+=vx;
    if(canMove(position.x,position.z+vz,position.y,state.opened))position.z+=vz;
    position.y=floorAt(position.x,position.z)??position.y;
    for(const r of MOUT_ROOMS)if(Math.abs(position.y-r.y)<.3&&position.x*r.side>1.9&&Math.abs(position.z-r.z)<3.7)state.entered.add(r.id);
    if(input.edges.e){
      const door=doors.find(d=>!state.opened.has(d.room.id)&&Math.hypot(position.x-d.room.side*1.5,position.z-d.room.z)<2&&Math.abs(position.y-d.room.y)<.4);
      if(door){state.opened.add(door.room.id);door.mesh.visible=false;setNotice(door.room.id+' BREACHED · RED THREATS / BLUE NO-SHOOT');}
      else setNotice('MOVE WITHIN 2M OF A BREACH DOOR');
    }
    if((input.edges.r||input.edges[' '])&&!state.reload&&state.ammo<MOUT_MAGAZINE){state.reload=1.4;setNotice('RELOADING');}
    updateCamera();
    if((heldFire||input.keys.j||input.edges.j)&&cooldown===0)fire();
    if(extractDrill(state,position.x,position.y,position.z)){finish();return;}
    renderHud();
  };
  function renderHud(){
    const cleared=clearedRooms(state),nearest=doors.find(d=>!state.opened.has(d.room.id)&&Math.hypot(position.x-d.room.side*1.5,position.z-d.room.z)<2&&Math.abs(position.y-d.room.y)<.4);
    $('moutClock').textContent=stamp(state.elapsed)+' / '+stamp(MOUT_LIMIT);$('moutClock').classList.toggle('urgent',MOUT_LIMIT-state.elapsed<30);$('moutAccuracy').textContent=accuracyFor(state)+'%';
    $('moutAmmo').textContent=state.reload?'RELOADING':state.ammo+' / '+MOUT_MAGAZINE;
    $('moutClearance').textContent=cleared.length+' / 6 ROOMS · '+state.hits+' / 12 THREATS';
    $('moutObjective').textContent=state.elapsed<noticeUntil?notice:nearest?'E / BREACH · '+nearest.room.id:cleared.length===6?'ALL CLEAR · UPPER CATWALK EXTRACTION':position.y>2.8?'UPPER DECK · CLEAR A3 / B3':position.z< -16?'RAMP TO UPPER BREACH POINTS':'CLEAR A1 / B1 / A2 / B2 · RED ONLY';
    $('moutRoomList').textContent=MOUT_ROOMS.map(r=>r.id+': '+(cleared.some(c=>c.id===r.id)?'CLEAR':state.opened.has(r.id)?'OPEN':'SEALED')).join(' · ');
  }
  function finish(){
    unlock();api.clearKeys();api.setMode('moutResult');api.show('moutResult');$('moutHud').classList.add('hidden');
    $('moutResultTitle').textContent=state.success?'EXTRACTION COMPLETE':'TIME EXPIRED';
    $('moutResultSummary').textContent=clearedRooms(state).length+' / 6 rooms · '+state.hits+' / 12 threats · '+state.penalties+' no-shoot hits';
    const result=saveDrillRecord({success:state.success,score:drillScore(state),time:state.elapsed,accuracy:accuracyFor(state)});
    $('moutRecordStatus').textContent=!result.eligible?'Extraction incomplete · personal best unchanged.':!result.saved?'Storage unavailable · result was not saved.':result.best?'NEW PERSONAL BEST · saved on this device.':'Personal best preserved on this device.';
    $('moutResultStats').textContent='Clearance '+state.elapsed.toFixed(2)+'s · Accuracy '+accuracyFor(state)+'% ('+state.hits+'/'+state.shots+') · Drill score '+drillScore(state);
  }
  m.text=()=>({kind:'mout',name:'MOUT Shoot House',...position,elapsed:+state.elapsed.toFixed(2),limit:MOUT_LIMIT,shots:state.shots,hits:state.hits,accuracy:accuracyFor(state),ammo:state.ammo,reload:state.reload,penalties:state.penalties,cleared:clearedRooms(state).map(r=>r.id),opened:[...state.opened],ended:state.ended,success:state.success,score:drillScore(state)});
  return m;
}
