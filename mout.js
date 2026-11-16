import * as THREE from 'three';
import {URBAN_ROOMS,urbanFloorAt,urbanCanMove,urbanEntered,urbanExtract,sweepMove,URBAN_VIEW} from './urban-block.js';
import {buildUrbanBlock} from './urban-view.js';
import {moutNavigation,drawMoutMap} from './mout-navigation.js';
import {buildMoutVillage,villageTexture} from './mout-village.js';
import {MOUT_SURVEY_VIEWS,MOUT_WINDOW} from './mout-architecture.js';
import {afterAction,recordCareer} from './career.js';
import {bestDrill,saveDrillRecord} from './field-records.js';
import {feedback} from './presentation.js';
import * as A from './art.js';
import {MOUT_LIMIT,MOUT_MAGAZINE,MOUT_ROOMS,wallsFor,floorAt as classicFloor,canMove as classicMove,createDrill,tickDrill as classicTick,recordShot,clearedRooms as classicCleared,accuracyFor,extractDrill as classicExtract,drillScore as classicScore} from './mout-rules.js';
import {saveUrbanRecord,readUrbanRecord} from './urban-records.js';
const $=id=>document.getElementById(id);
const stamp=seconds=>Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');

export function initMout(api){
  let course='classic',ROOMS=MOUT_ROOMS;
  const limit=()=>course==='urban'?240:MOUT_LIMIT;
  const floorAt=(x,z,y)=>course==='urban'?urbanFloorAt(x,z,y):classicFloor(x,z);
  const canMove=(x,z,y,opened)=>course==='urban'?urbanCanMove(x,z,y,opened):classicMove(x,z,y,opened);
  const clearedRooms=state=>course==='urban'?ROOMS.filter(r=>state.entered.has(r.id)&&(state.hitsByRoom.get(r.id)||0)>=2):classicCleared(state);
  const extractDrill=(state,x,y,z)=>course==='urban'?urbanExtract(state,{x,y,z}):classicExtract(state,x,y,z);
  const drillScore=state=>course==='urban'?Math.max(0,state.hits*100+accuracyFor(state)*10+Math.floor(240-state.elapsed)*5-state.penalties*250):classicScore(state);
  const tickDrill=(state,dt)=>{if(course==='classic')return classicTick(state,dt);if(state.ended)return;state.elapsed=Math.min(240,state.elapsed+dt);if(state.reload>0){state.reload=Math.max(0,state.reload-dt);if(!state.reload)state.ammo=MOUT_MAGAZINE;}if(state.elapsed>=240){state.ended=true;state.success=false;}};
  const m={active:false};let state=createDrill(),position=new THREE.Vector3(0,0,5),doors=[],targets=[],solids=[],ownedMaterials=[],ownedTextures=[],weapon=null;
  let heldFire=false,cooldown=0,notice='',noticeUntil=0,look={yaw:0,pitch:.05},saved=null,flash=0,survey=false,surveyView='village';
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
    m.active=false;survey=false;touch=null;unlock();api.clearKeys();document.body.classList.remove('mout-active');$('moutHud').classList.add('hidden');controls(false);
    if(weapon){weapon.parent?.remove(weapon);weapon.geometry.dispose();weapon=null;}
    api.world.traverse(object=>{if(object.isLight)object.dispose?.();});
    api.clearWorld();
    for(const material of ownedMaterials)material.dispose();for(const texture of ownedTextures)texture.dispose();
    ownedMaterials=[];ownedTextures=[];doors=[];targets=[];solids=[];
    if(saved){
      api.lights.hemi.color.copy(saved.hemiColor);api.lights.hemi.groundColor.copy(saved.groundColor);api.lights.hemi.intensity=saved.hemiIntensity;
      api.lights.sun.position.copy(saved.sunPosition);api.lights.sun.target.position.copy(saved.sunTarget);api.lights.sun.color.copy(saved.sunColor);api.lights.sun.intensity=saved.sunIntensity;api.lights.sun.castShadow=saved.castShadow;
      api.scene.background=saved.background;api.scene.fog=saved.fog;api.renderer.toneMappingExposure=saved.exposure;
      api.renderer.shadowMap.enabled=saved.shadows;api.camera.fov=saved.fov;api.camera.updateProjectionMatrix();saved=null;
    }
  };
  m.open=()=>{api.stopModes();api.setMode('moutBrief');api.show('moutBrief');updateBrief();};
  const updateBrief=()=>{const urban=$('moutCourse').value==='urban',best=urban?readUrbanRecord():bestDrill();$('moutBest').textContent=best?(urban?'URBAN BLOCK BEST · ':'CONTAINER COURSE BEST · ')+best.score+' points · '+(best.time??0).toFixed(2)+'s':'Complete this route to save a separate personal best on this device.';$('moutBriefDescription').textContent=urban?'Enter the playable urban block: visit the courtyard, breach the connected U1/U2 ground rooms, clear six red targets across both rooms and the rooftop, climb the exterior east stairs, and extract at the green roof marker. Other village buildings are scenery.':'Six-room container drill in the daylight training village. Breach A1/B1/A2/B2, climb the central ramp, clear A3/B3 and extract on the upper catwalk. Other village buildings and stairs are scenery.';$('moutRouteGoal').textContent=urban?'240 seconds. Enter the courtyard and all three zones (U1, U2, ROOF), clear all six red targets, then extract.':'180 seconds. Enter all six rooms and clear all 12 red targets, then extract.';};
  $('moutCourse').onchange=updateBrief;updateBrief();
  $('btnMout').onclick=m.open;$('moutBack').onclick=api.title;
  $('moutSurvey').onclick=()=>start(true);
  $('moutSurveyDeploy').onclick=()=>start();$('moutSurveyBack').onclick=()=>{m.exit();m.open();};
  for(const id of ['village','containers','upper'])$('moutView'+id).onclick=()=>setSurveyView(id);
  function setSurveyView(id){const view=course==='urban'?URBAN_VIEW:MOUT_SURVEY_VIEWS[id];if(!survey||!view)return;surveyView=id;api.camera.position.set(...view.position);api.camera.fov=52;api.camera.lookAt(new THREE.Vector3(...view.target));api.camera.updateProjectionMatrix();api.camera.updateMatrixWorld(true);A.updateArt(0,api.camera,new THREE.Vector3(0,0,-12),api.lights);$('moutSurveyDescription').textContent=view.label;for(const name of ['village','containers','upper'])$('moutView'+name).setAttribute('aria-pressed',String(id===name));api.show('moutSurveyScreen');}
  $('moutDeploy').onclick=()=>start();$('moutRetry').onclick=()=>start();$('moutResultBack').onclick=api.title;
  $('moutPauseButton').onclick=()=>m.pause();$('moutResume').onclick=()=>m.pause();$('moutAbort').onclick=api.title;
  m.pause=()=>{
    if(!m.active||state.ended||survey)return;
    if(api.mode()==='playing'){unlock();api.clearKeys();api.setMode('moutPause');api.show('moutPause');}
    else if(api.mode()==='moutPause'){lastClock=clock();api.clearKeys();api.setMode('playing');api.show(null);}
  };
  api.canvas.addEventListener('mousedown',e=>{
    if(!m.active||state.ended||api.mode()!=='playing'||e.button!==0)return;
    heldFire=true;
    if(document.pointerLockElement!==api.canvas)try{api.canvas.requestPointerLock?.()?.catch?.(()=>{});}catch{/* Drag look is available in embedded webviews. */}
  });
  window.addEventListener('mouseup',e=>{if(e.button===0)heldFire=false;});window.addEventListener('pointercancel',()=>{heldFire=false;});window.addEventListener('blur',()=>{heldFire=false;});
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
    const texture=metalTexture(),plaster=villageTexture('plaster'),palette=['#c9bea0','#d4c9ab','#b6b398'];ownedTextures.push(plaster);
    buildMoutVillage(api,{materials:ownedMaterials,textures:ownedTextures});
    const mats=palette.map(color=>new THREE.MeshStandardMaterial({color,metalness:.25,roughness:.91,bumpMap:texture,bumpScale:.035}));
    const dark=new THREE.MeshStandardMaterial({color:'#626b62',metalness:.6,roughness:.65});
    const floor=new THREE.MeshStandardMaterial({color:'#b5af9b',metalness:0,roughness:1,bumpMap:plaster,bumpScale:.018});
    const gold=new THREE.MeshStandardMaterial({color:'#ffc95b',roughness:.75});
    const lamp=new THREE.MeshBasicMaterial({color:'#fff5cd'});ownedMaterials.push(...mats,dark,floor,gold,lamp);
    function box(w,h,d,material,x,y,z,blocking=false){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;api.world.add(mesh);if(blocking)solids.push(mesh);return mesh;
    }
    if(course==='urban'){buildUrbanBlock(api,{materials:ownedMaterials,textures:ownedTextures,solids,doors,targets});weapon=A.makeRifle(api.camera,.28,-.27,-.6);return;}
    // Gravel route; outer village is non-playable scenery beyond the room walls.
    const detail=new A.Builder();
    // Live drill walls are ray occluders; collision uses these same solid sections.
    for(const r of MOUT_ROOMS){
      const mat=mats[r.side===-1?0:1];
      box(5.5,.12,8,dark,r.side*4.25,r.y-.08,r.z);
      box(5.7,.14,8.15,floor,r.side*4.25,r.y+2.86,r.z,true);
      for(const w of wallsFor(r))box(w.w,w.h,w.d,mat,w.x,w.y,w.z,true);
      // Corner posts and container corrugation are batched to keep draw calls bounded.
      const ribs=new A.Builder();
      for(const x of [r.side*1.5,r.side*7])for(const z of [r.z-4,r.z+4])ribs.box(.2,2.92,.2,'#b6ae93',x,r.y+1.4,z);
      for(let z=r.z-3.8;z<r.z+4;z+=.36)ribs.box(.065,2.65,.055,'#c5b99a',r.side*7.1,r.y+1.35,z);
      for(let z=r.z-3.8;z<r.z+4;z+=.28){
        if(Math.abs(z-r.z)>1.1)ribs.box(.045,2.35,.05,'#bfb292',r.side*1.4,r.y+1.25,z);
      }
      // Dark recessed windows are real openings in shared wall/collision sections.
      for(const side of [-1,1]){
        const z=r.z+side*4.1,x=r.side*4.25;
        ribs.box(1.32,.1,.24,'#a69e86',x,r.y+MOUT_WINDOW.y,z);
        for(const edge of [-1,1])ribs.box(.07,1.17,.16,'#beb69d',x+edge*.59,r.y+1.64,z);
        ribs.box(1.32,.08,.16,'#c5bea7',x,r.y+2.2,z);
      }
      // Visible corner-fed door jambs and threshold caution strips.
      for(const side of [-1,1])ribs.box(.07,2.4,.08,'#d4af4f',r.side*1.37,r.y+1.2,r.z+side*1.03);
      ribs.mesh(api.world);
      const door=box(.14,2.4,1.9,mats[2],r.side*1.5,r.y+1.2,r.z,true);
      // Locking bars and hardware are attached to the breach door and disappear with it.
      const hardware=new A.Builder();for(let z=-.8;z<.9;z+=.26)hardware.box(.06,2.2,.05,'#a59e87',-r.side*.1,0,z);
      for(const z of [-.66,.66])hardware.box(.055,2.2,.055,'#797e70',-r.side*.15,0,z);hardware.box(.11,.1,.3,'#525f57',-r.side*.19,-.2,.3);hardware.mesh(door);
      doors.push({room:r,mesh:door});
      api.label(r.id,r.side*4.25,r.y+2.45,r.z+4.15,'#e7dab5',2.1);
      const sign=api.label(r.id+' / BREACH',r.side*1.34,r.y+2.56,r.z,'#e5d8b3',1.45);sign.rotation.y=r.side===1?-Math.PI/2:Math.PI/2;
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
      api.label('STACK 02 / TRAINING',side*4.25,1.7,-21.89,'#ded2af',1.8);
      for(let x=side*4.25-2.5;x<side*4.25+2.6;x+=.28)detail.box(.05,2.5,.05,'#b1a78d',x,1.4,-21.88);
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
    // Rooftop parapet lips, service ducts and vents echo the reference village.
    for(const r of MOUT_ROOMS){
      const x=r.side*4.25,y=r.y+3.03;
      for(const side of [-1,1])detail.box(5.72,.22,.12,'#c5bda3',x,y,r.z+side*4.02);
      detail.box(.12,.22,8.1,'#c5bda3',r.side*7.08,y,r.z);
      detail.box(.65,.35,.5,'#a0a99f',r.side*6.1,y+.16,r.z+2.6);
      detail.cyl(.075,.075,.55,'#7b8880',r.side*6.4,y+.25,r.z-2.5,7);
      for(let i=0;i<5;i++){const z=r.z-3.3+i*1.4;detail.box(.025,.16+(i%3)*.06,.14,'#9d947b',r.side*1.38,r.y+.18,z);}
    }
    for(const side of [-1,1]){
      for(let z=-22;z>=-30;z-=1.2)detail.box(.045,1,.045,'#7d8980',side*7.08,6.42,z);
      detail.box(.05,.05,8.1,'#7d8980',side*7.08,6.92,-26);
    }
    rails.mesh(api.world);detail.mesh(api.world);
    box(2.8,.06,.3,gold,0,3.02,-28.5);
    const extract=api.label('EXTRACTION / CLEAR ALL 6 ROOMS',0,4.7,-29.8,'#8fffb6',3);extract.name='mout-extraction';
    api.label('MOUT / TRAINING VILLAGE',0,3.7,1,'#e1d5b2',3.2);
    // Daylight setting: slender off-route training floodlight masts, not overhead cages.
    const masts=new A.Builder();for(const side of [-1,1])for(const z of [5,-20]){masts.cyl(.08,.16,8,'#7b8981',side*10,4,z,7).box(1.3,.22,.5,'#cbd4c6',side*10,8,z);}
    // Side access is a scenery road, not an invisible playable extension.
    for(const side of [-1,1]){
      for(const z of [1.2,3.2,5.2,7.2])masts.box(.055,.65,.055,'#c4af75',side*1.38,.32,z);
      masts.box(.04,.04,6,'#c4af75',side*1.38,.55,4.2);
      masts.box(.14,4.25,.14,'#7b8981',side*8.3,2.05,1);
    }
    masts.box(16.7,.12,.14,'#7b8981',0,4.15,1);
    masts.mesh(api.world);
    // Room practicals keep target colors readable even inside the covered shells.
    for(const r of MOUT_ROOMS){
      box(1.8,.08,.25,lamp,r.side*4.2,r.y+2.68,r.z);
      const light=new THREE.PointLight('#fff2d1',9,8,1.4);light.position.set(r.side*4.2,r.y+2.5,r.z);api.world.add(light);
    }
    weapon=A.makeRifle(api.camera,.28,-.27,-.6);
  }
  function start(asSurvey=false){
    m.exit();api.stopModes();api.clearWorld();survey=asSurvey;course=$('moutCourse').value==='urban'?'urban':'classic';ROOMS=course==='urban'?URBAN_ROOMS:MOUT_ROOMS;state=createDrill();position.set(0,0,5);look={yaw:0,pitch:.05};heldFire=false;cooldown=0;notice=course==='urban'?'ENTER BOTH ROOMS, THEN USE EXTERIOR STAIRS TO CLEAR THE ROOF':'CLEAR FOUR GROUND ROOMS, THEN TAKE THE RAMP';noticeUntil=5;flash=0;
    saved={hemiColor:api.lights.hemi.color.clone(),groundColor:api.lights.hemi.groundColor.clone(),hemiIntensity:api.lights.hemi.intensity,
      sunPosition:api.lights.sun.position.clone(),sunTarget:api.lights.sun.target.position.clone(),sunColor:api.lights.sun.color.clone(),sunIntensity:api.lights.sun.intensity,castShadow:api.lights.sun.castShadow,
      background:api.scene.background,fog:api.scene.fog,exposure:api.renderer.toneMappingExposure,shadows:api.renderer.shadowMap.enabled,fov:api.camera.fov};
    A.applyEnv('coast',api.scene,api.lights,api.renderer);api.scene.fog=new THREE.Fog('#d8d6bf',55,145);
    api.lights.hemi.color.set('#d9e5df');api.lights.hemi.groundColor.set('#a19774');api.lights.hemi.intensity=1.65;
    api.lights.sun.color.set('#fff1d6');api.lights.sun.intensity=2.45;api.lights.sun.position.set(32,48,15);api.lights.sun.target.position.set(0,0,-12);api.lights.sun.castShadow=true;api.renderer.toneMappingExposure=.98;
    if(!api.camera.parent)api.scene.add(api.camera);
    lastClock=clock();m.active=true;document.body.classList.add('mout-active');api.setMode('playing');api.show(null);api.clearKeys();controls(true);$('moutHud').classList.remove('hidden');api.startAudio();build();api.applyQuality?.();updateCamera();renderHud();A.updateArt(0,api.camera,new THREE.Vector3(0,0,-12),api.lights);if(survey){for(const name of ['containers','upper'])$('moutView'+name).classList.toggle('hidden',course==='urban');weapon.visible=false;$('moutHud').classList.add('hidden');api.clearKeys();api.setMode('moutSurvey');setSurveyView('village');}
  }
  function updateCamera(){
    const crouch=api.input().keys.c;api.camera.position.set(position.x,position.y+(crouch?1.05:1.65),position.z);
    const direction=new THREE.Vector3(-Math.sin(look.yaw)*Math.cos(look.pitch),Math.sin(look.pitch),-Math.cos(look.yaw)*Math.cos(look.pitch));
    api.camera.lookAt(api.camera.position.clone().add(direction));api.camera.fov=api.input().keys.k?48:72;api.camera.updateProjectionMatrix();api.camera.updateMatrixWorld();
    if(weapon){const reload=state.reload?Math.sin((1-state.reload/1.4)*Math.PI):0;weapon.rotation.z=api.settings?.().reducedMotion?0:-.55*reload;weapon.position.x=.28+.12*reload;weapon.position.z=-.6+(api.settings?.().reducedMotion?0:flash*.5);weapon.position.y=-.27+(state.reload>0?-.15:0);}
  }
  function fire(){
    if(state.reload||!state.ammo){if(!state.ammo)setNotice('EMPTY · RELOAD / R OR SPACE');return;}
    api.world.updateMatrixWorld(true);raycaster.setFromCamera(center,api.camera);
    const live=targets.filter(t=>!t.down),boards=live.flatMap(t=>t.meshes),closed=doors.filter(d=>!state.opened.has(d.room.id)).map(d=>d.mesh);
    const hit=raycaster.intersectObjects([...solids.filter(mesh=>!doors.some(d=>d.mesh===mesh)),...closed,...boards],false)[0];
    const target=hit&&live.find(t=>t.meshes.includes(hit.object));
    recordShot(state,target&&!target.friendly?target.room.id:null,!!target?.friendly);
    if(target){api.tone(target.friendly?180:900,.04,'triangle',.03);feedback(target.friendly?'penalty':'hit');$('moutReticle').classList.toggle('confirmed',!target.friendly);target.down=true;for(const mesh of target.meshes)mesh.visible=false;target.marker.visible=false;setNotice(target.friendly?'NO-SHOOT HIT · −250 SCORE':'TARGET DOWN');}
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
    sweepMove(position,vx,vz,canMove,floorAt,state.opened);
    if(course==='urban'){if(position.z>1&&position.y<.3)state.entered.add('COURTYARD');for(const r of ROOMS)if(urbanEntered(r,position))state.entered.add(r.id);}
    else for(const r of ROOMS)if(Math.abs(position.y-r.y)<.3&&position.x*r.side>1.9&&Math.abs(position.z-r.z)<3.7)state.entered.add(r.id);
    if(input.edges.e){
      const door=doors.find(d=>!state.opened.has(d.room.id)&&Math.hypot(position.x-(d.point?.x??d.room.side*1.5),position.z-(d.point?.z??d.room.z))<2&&Math.abs(position.y-d.room.y)<.4);
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
    const cleared=clearedRooms(state),nearest=doors.find(d=>!state.opened.has(d.room.id)&&Math.hypot(position.x-(d.point?.x??d.room.side*1.5),position.z-(d.point?.z??d.room.z))<2&&Math.abs(position.y-d.room.y)<.4);
    $('moutClock').textContent=stamp(state.elapsed)+' / '+stamp(limit());$('moutClock').classList.toggle('urgent',limit()-state.elapsed<30);$('moutAccuracy').textContent=accuracyFor(state)+'%';
    $('moutAmmo').textContent=state.reload?'RELOADING':state.ammo+' / '+MOUT_MAGAZINE;
    $('moutClearance').textContent=cleared.length+' / '+ROOMS.length+' ZONES · '+state.hits+' / '+ROOMS.length*2+' THREATS';
    $('moutObjective').textContent=state.elapsed<noticeUntil?notice:nearest?'E / BREACH · '+nearest.room.id:cleared.length===6?'ALL CLEAR · UPPER CATWALK EXTRACTION':position.y>2.8?'UPPER DECK · CLEAR A3 / B3':position.z< -16?'RAMP TO UPPER BREACH POINTS':'CLEAR A1 / B1 / A2 / B2 · RED ONLY';
    const nav=moutNavigation({course,position,lookYaw:look.yaw,rooms:ROOMS,state,cleared});
    $('moutDirection').textContent=nav.text;drawMoutMap($('moutMap'),{course,position,yaw:look.yaw,rooms:ROOMS,cleared:cleared.map(r=>r.id),opened:[...state.opened],target:nav.target});
    if(course==='urban')$('moutObjective').textContent=state.elapsed<noticeUntil?notice:nav.text;
    $('moutRoomList').textContent=ROOMS.map(r=>r.id+': '+(cleared.some(c=>c.id===r.id)?'CLEAR':state.opened.has(r.id)?'OPEN':'SEALED')).join(' · ');
  }
  function finish(){
    unlock();api.clearKeys();api.setMode('moutResult');api.show('moutResult');$('moutHud').classList.add('hidden');
    const medal=course==='urban'?{fresh:[],saved:true}:recordCareer({mode:'mout',success:state.success,accuracy:accuracyFor(state),penalties:state.penalties});
    $('moutAnalysis').textContent=afterAction({mode:'mout',...state})+(medal.fresh.length?' · Clean Breach cosmetic earned'+(medal.saved?' locally.':' (not saved; storage unavailable).'):'');
    $('moutResultTitle').textContent=state.success?'EXTRACTION COMPLETE':'TIME EXPIRED';
    $('moutResultSummary').textContent=(course==='urban'?'URBAN BLOCK · ':'CONTAINER LANE · ')+clearedRooms(state).length+' / '+ROOMS.length+' zones · '+state.hits+' / '+ROOMS.length*2+' threats · '+state.penalties+' no-shoot hits';
    const result=course==='urban'?saveUrbanRecord(state,drillScore(state)):saveDrillRecord({success:state.success,score:drillScore(state),time:state.elapsed,accuracy:accuracyFor(state)});
    $('moutRecordStatus').textContent=!result.eligible?'Extraction incomplete · personal best unchanged.':!result.saved?'Storage unavailable · result was not saved.':result.best?'NEW PERSONAL BEST · saved on this device.':'Personal best preserved on this device.';
    $('moutResultStats').textContent='Clearance '+state.elapsed.toFixed(2)+'s · Accuracy '+accuracyFor(state)+'% ('+state.hits+'/'+state.shots+') · Drill score '+drillScore(state);
  }
  m.text=()=>({course,survey,surveyView:survey?surveyView:null,kind:'mout',name:course==='urban'?'MOUT Urban Block':'MOUT Shoot House',...position,elapsed:+state.elapsed.toFixed(2),limit:limit(),shots:state.shots,hits:state.hits,accuracy:accuracyFor(state),ammo:state.ammo,reload:state.reload,penalties:state.penalties,cleared:clearedRooms(state).map(r=>r.id),opened:[...state.opened],ended:state.ended,success:state.success,score:drillScore(state)});
  return m;
}
