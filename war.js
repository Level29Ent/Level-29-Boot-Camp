import * as THREE from 'three';
import {damageBearing,allyStatus,reloadPose} from './combat-feedback.js';
import {practiceConfig,practiceSummary,standardPractice,saveMission,missionLog,bestMission} from './practice-lab.js';
import {createModeLifecycle} from './mode-lifecycle.js';
import {afterAction,recordCareer} from './career.js';
import {dressField,feedback,dressAtmosphere} from './presentation.js';
import {OPERATIONS,ROLES,drillChallenges,CRUCIBLE_HURDLES} from './operations.js';
import {saveBadges,readRecords} from './field-records.js';
import * as A from './art.js';
import {cloud} from './cloud.js';
import {createWarPractice} from './war-practice.js';
import {cleanCallsign} from './local-player.js';
import {selectedStyle,styleFor} from './avatar-styles.js';
import {thirdPersonView} from './war-view.js';
import {WAR_COVER,WAR_DURATION,COSMETICS,rankFor} from './rules.js';
import {FieldAudio} from './race-audio.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const collides=(x,z)=>Math.abs(x)>22||Math.abs(z)>32||WAR_COVER.some(c=>Math.abs(x-c.x)<c.w/2+.48&&Math.abs(z-c.z)<c.d/2+.48);
export function initWar(api){
  const lifecycle=createModeLifecycle();
  const w={active:false,room:null};let practice=null,practiceClock=0;let timer=null,busy=false,ended=false,clockOffset=0,bestRtt=Infinity;
  let seq=0,models=new Map(),visual=new THREE.Vector3(),lastEvents=new Set(),tracers=[],fireMouse=false;
  let lastInput={},lastUi=0,lastNetwork=0,refreshing=false;
  let damageUntil=0;
  let lastPractice=null;
  const selectedPractice=()=>practiceConfig({difficulty:$('practiceDifficulty').value,duration:+$('practiceDuration').value,target:+$('practiceTarget').value,infiniteAmmo:$('practiceInfiniteAmmo').checked});
  const duration=()=>practice?w.room.duration:WAR_DURATION;
  let objectiveMarker=null,pendingAbility=false,pendingOrder=null;
  let pendingJump=false,pendingReload=false,pendingFire=false,lastRtt=0;
  const audio=new FieldAudio();audio.volume=.22;
  const message=s=>{$('warStatus').textContent=s;};
  const me=()=>w.room?.players.find(p=>p.id===w.room.me);
  const now=()=>practice?practiceClock:Date.now()+clockOffset;
  const elapsed=()=>w.room?.startsAt?(Math.min(now(),w.room.endedAt||Infinity)-w.room.startsAt)/1000:-4;
  async function request(action,payload={}){
    const ticket=lifecycle.current(),sent=Date.now(),state=practice?practice.update(payload):await cloud.rpc(action,payload),rtt=Date.now()-sent;
    lifecycle.assert(ticket);
    if(!practice&&state.serverNow&&rtt<bestRtt){bestRtt=rtt;clockOffset=state.serverNow-(sent+Date.now())/2;}
    lastNetwork=performance.now();lastRtt=rtt;return state;
  }
  function stop(){clearInterval(timer);timer=null;busy=false;}
  w.exit=()=>{
    lifecycle.invalidate();
    const code=practice?null:w.room?.code;stop();practice=null;
    if(code)cloud.rpc('room_leave',{code}).catch(()=>{});
    w.active=false;w.room=null;audio.stop();fireMouse=false;pendingJump=pendingReload=pendingFire=false;document.body.classList.remove('war-active');
    const useButton=$('touchControls')?.querySelector('[data-key="e"]');if(useButton)useButton.innerHTML='E<br><small>USE</small>';
    const crouchButton=$('touchControls')?.querySelector('[data-key="c"]');if(crouchButton)crouchButton.innerHTML='C<br><small>CRAWL</small>';
    $('warHud').classList.add('hidden');$('warScores').classList.add('hidden');
    if(document.pointerLockElement===api.canvas)document.exitPointerLock();
    api.clearKeys();api.graphics(false);models.clear();tracers=[];
  };
  w.open=()=>{
    w.exit();ended=false;api.stopRace();api.setMode('warMenu');api.show('warMenu');
    message('Local play starts instantly. Online missions require the new Supabase backend to be deployed and a new cloud profile.');
    $('warJoinCode').value='';
    const badges=readRecords().badges||[];$('localBadges').textContent='Local Drill Instructor badges: '+badges.length+' / 3 earned in this browser.';
  };
  $('btnWar').onclick=w.open;
  $('warBack').onclick=()=>{w.exit();api.title();};
  $('warMenuCommand').onclick=()=>{w.exit();api.openCommand();};
  async function prepare(button,fn){
    const ticket=lifecycle.current();button.disabled=true;message('Connecting to command…');api.startAudio();
    try{await cloud.ensure($('racerName').value);lifecycle.assert(ticket);await fn();}
    catch(e){if(lifecycle.valid(ticket)&&!e.staleSession)message(e.message);}
    finally{button.disabled=false;}
  }
  function launchPractice(setup){
    const name=cleanCallsign($('racerName').value);w.exit();api.stopRace();ended=false;practiceClock=Date.now();pendingAbility=false;pendingOrder=null;lastInput={};
    lastPractice={operation:setup.operation,role:setup.role,config:practiceConfig(setup.config)};
    practice=createWarPractice(name,{now:()=>practiceClock,equipped:cloud.profile?.equipped,xp:cloud.profile?.xp,...lastPractice});
    apply(practice.state);poll();
  }
  const previewPractice=()=>{
    const operation=$('localOperation').value;$('practiceTarget').disabled=operation!=='elimination';
    $('practiceSummary').textContent=practiceSummary(selectedPractice(),operation)+' · '+(standardPractice(selectedPractice())?'Standard practice: local medals/badges eligible.':'Custom practice: records only; medals and badges disabled.')+' Online rooms ignore these local settings.';
  };
  for(const id of ['practiceDifficulty','practiceDuration','practiceTarget','practiceInfiniteAmmo','localOperation'])$(id).addEventListener('change',previewPractice);
  $('practiceReset').onclick=()=>{$('practiceDifficulty').value='standard';$('practiceDuration').value='180';$('practiceTarget').value='30';$('practiceInfiniteAmmo').checked=false;previewPractice();};
  $('warBots').onclick=()=>launchPractice({operation:$('localOperation').value,role:$('localRole').value,config:selectedPractice()});
  $('warRetryPractice').onclick=()=>{if(lastPractice)launchPractice(lastPractice);};
  previewPractice();
  $('warCloudBots').onclick=()=>prepare($('warCloudBots'),async()=>{
    w.room=await request('war_create',{mode:'pve',operation:$('localOperation').value,role:$('localRole').value});
    apply(await request('room_start',{code:w.room.code}));poll();
  });
  $('warCreatePvp').onclick=()=>prepare($('warCreatePvp'),async()=>{
    w.room=await request('war_create',{mode:'pvp',operation:$('localOperation').value,role:$('localRole').value});lobby();poll();
  });
  $('warCreatePublic').onclick=()=>prepare($('warCreatePublic'),async()=>{
    w.room=await request('war_create',{mode:'pvp',public:true,operation:$('localOperation').value,role:$('localRole').value});lobby();poll();
  });
  $('warCreatePve').onclick=()=>prepare($('warCreatePve'),async()=>{
    w.room=await request('war_create',{mode:'pve',operation:$('localOperation').value,role:$('localRole').value});lobby();poll();
  });
  $('warFind').onclick=()=>prepare($('warFind'),async()=>{
    w.room=await request('war_find',{role:$('localRole').value});lobby();poll();
  });
  $('warJoin').onclick=()=>prepare($('warJoin'),async()=>{
    const code=$('warJoinCode').value.trim().toUpperCase();
    if(!/^[A-F0-9]{6}$/.test(code))throw new Error('Enter the six-character war room code.');
    const state=await request('room_join',{code,expectedKind:'war',role:$('localRole').value});
    w.room=state;if(state.startsAt)apply(state);else lobby();poll();
  });
  function lobby(){
    api.setMode('warLobby');api.show('warLobby');
    $('warLobbyCode').textContent=w.room.code;renderLobby();
  }
  function renderLobby(){
    $('warLobbyMode').textContent=w.room.mode==='pvp'?'PVP / HUMAN-LED TEAMS':'PVBOT / CO-OP VS AI';
    for(const team of ['blue','red']){
      const members=w.room.players.filter(p=>p.team===team),target=$('lobbyTeam'+(team==='blue'?'Blue':'Red'));
      target.innerHTML=Array.from({length:5},(_,i)=>{
        const p=members[i];return `<div class="war-slot"><span>${p?esc(p.name)+(p.id===w.room.me?' (you)':''):'AI reinforcement'}</span><small>${p?p.id===w.room.host?'HOST':p.connected?'READY':'OFFLINE':'BOT'}</small></div>`;
      }).join('');
    }
    const host=w.room.me===w.room.host,valid=w.room.mode!=='pvp'||w.room.players.some(p=>p.team==='red');
    $('warStart').disabled=!host||!valid;
    $('warStart').textContent=!host?'Waiting for host':!valid?'Invite an opposing player':'Deploy 5v5';
  }
  $('warLobbyLeave').onclick=w.open;
  $('warCopy').onclick=async()=>{
    try{await navigator.clipboard.writeText(w.room.code);$('warLobbyNote').textContent='Room code copied. Send your friend the game link too.';}
    catch{$('warLobbyNote').textContent='Your room code is '+w.room.code+'. Share it with a friend.';}
  };
  $('warStart').onclick=async()=>{
    $('warStart').disabled=true;
    try{apply(await request('room_start',{code:w.room.code}));}
    catch(e){if(!e.staleSession){$('warLobbyNote').textContent=e.message;renderLobby();}}
  };
  function poll(){stop();timer=setInterval(pollOnce,200);}
  async function pollOnce(){
    if(busy||!w.room||ended)return;busy=true;const code=w.room.code,ticket=lifecycle.current();
    try{
      const payload={...lastInput,seq:++seq,code};pendingJump=pendingReload=pendingFire=pendingAbility=false;pendingOrder=null;
      const state=await request(w.active?'war_input':'room_state',payload);
      if(w.room?.code!==code)return;
      apply(state);
      $('warNetwork').textContent=practice?'LOCAL PRACTICE · NO CLOUD REWARDS':'CLOUD LIVE · '+Math.round(lastRtt)+' ms';
    }catch(e){
    if(!lifecycle.valid(ticket)||e.staleSession)return;
    if(w.active)$('warNetwork').textContent='RECONNECTING · '+e.message;
      else $('warLobbyNote').textContent=e.message;
    }finally{if(lifecycle.valid(ticket))busy=false;}
  }
  function apply(state){
    w.room=state;
    if(state.startsAt!==null){
      if(!w.active)build();
      const own=me();
      if(own){
        if(own.reloadAt&&own.reloadAt!==w.lastReload)api.tone(280,.045,'triangle',.025);w.lastReload=own.reloadAt;
        if(own.hp<(w.lastHealth??100)){feedback('damage');const direction=damageBearing(own,state.events||[],now(),api.look().yaw);$('warDamageDirection').textContent=direction?direction.arrow+' FIRE FROM '+direction.label:'HIT · SEEK COVER';damageUntil=now()+900;$('warDamageDirection').classList.remove('hidden');}w.lastHealth=own.hp;
        const distance=visual.distanceTo(new THREE.Vector3(own.x,own.y,own.z));
        if(distance>4||own.hp<=0)visual.set(own.x,own.y,own.z);
        else visual.lerp(new THREE.Vector3(own.x,own.y,own.z),.45);
      }
      for(const e of state.events||[]){
        if(lastEvents.has(e.id))continue;lastEvents.add(e.id);
        if(e.type==='shot'&&now()-e.at<1400){
          const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(e.x,e.y,e.z),new THREE.Vector3(e.tx,e.ty,e.tz)]);
          const mat=new THREE.LineBasicMaterial({color:e.team==='blue'?'#8addff':'#ff8a64',transparent:true,opacity:.8});
          const line=new THREE.Line(geo,mat);api.world.add(line);tracers.push({line,age:0});
          if(e.from===state.me){api.tone(68,.06,'sawtooth',.05);if(e.hit){$('warReticle').classList.add('hit');feedback('hit');api.tone(860,.035,'triangle',.035);}setTimeout(()=>$('warReticle').classList.remove('hit'),100);}
        }
      }
      if(state.endedAt&&!ended)end();
    }else renderLobby();
  }
  function build(){
    ended=false;w.active=true;damageUntil=0;w.lastReload=0;w.lastHealth=100;seq=w.room.nextSeq||0;lastEvents=new Set();models=new Map();tracers=[];
    api.graphics(true);api.clearWorld();api.show(null);api.setMode('playing');document.body.classList.add('war-active');
    $('warHud').classList.remove('hidden');$('roleAbility').classList.toggle('hidden',!w.room.objective);api.setLook(me()?.team==='red'?Math.PI:0,.18);api.clearKeys();
    const useButton=$('touchControls')?.querySelector('[data-key="e"]');if(useButton)useButton.innerHTML='E<br><small>RELOAD</small>';
    const crouchButton=$('touchControls')?.querySelector('[data-key="c"]');if(crouchButton)crouchButton.innerHTML='C<br><small>CROUCH</small>';
    A.applyEnv('combat',api.scene,api.lights,api.renderer);api.scene.fog=new THREE.Fog('#b8ae8e',65,160);
    api.box(58,.3,80,'#a99b70',0,-.18,0);dressField(api.world,'war');dressAtmosphere(api,api.settings?.().environment,65);
    objectiveMarker=null;
    if(w.room.objective&&w.room.objective.id!=='elimination'){
      const o=w.room.objective;
      objectiveMarker=new THREE.Group();
      const ring=new THREE.Mesh(new THREE.TorusGeometry(2,.12,8,32),new THREE.MeshBasicMaterial({color:'#ffc72c'}));
      ring.rotation.x=-Math.PI/2;objectiveMarker.add(ring);
      const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,2.5,8),new THREE.MeshBasicMaterial({color:'#ffe3a0'}));beacon.position.y=1.25;objectiveMarker.add(beacon);
      if(o.id==='escort'){const truck=new A.Builder();truck.box(1.8,1.3,3.2,'#596940',0,.9,0).box(1.8,1.6,1.2,'#728354',0,1.1,-1.7);for(const x of [-.95,.95])for(const z of [-1.1,1.1])truck.cyl(.35,.35,.18,'#272a25',x,.38,z,10,0,0,Math.PI/2);truck.mesh(objectiveMarker);}
      api.world.add(objectiveMarker);
    }
    const b=new A.Builder();
    for(const c of WAR_COVER){
      const color=c.h>3?'#5b6655':c.h<2?'#9b8b61':'#656b4b';
      b.box(c.w,c.h,c.d,color,c.x,c.h/2,c.z);
      b.box(c.w+.12,.12,c.d+.12,'#424a36',c.x,c.h+.03,c.z);
      if(c.h>2)b.box(c.w,.11,.05,'#c4ba91',c.x,c.h*.55,c.z+c.d/2+.03);
    }
    for(const side of [-1,1]){
      for(let z=-32;z<=32;z+=4)b.box(.16,3.5,.16,'#5a6449',side*23,1.75,z);
      b.box(.07,.1,66,'#b6b699',side*23,2.7,0).box(.07,.1,66,'#b6b699',side*23,1.3,0);
      for(let x=-22;x<=22;x+=4)b.box(.16,3.5,.16,'#5a6449',x,1.75,side*33);
      b.box(46,.1,.07,'#b6b699',0,2.7,side*33).box(46,.1,.07,'#b6b699',0,1.3,side*33);
      b.box(16,.04,7,side===1?'#465e70':'#784b40',0,.01,side*28);
      b.box(14,.04,.12,'#d7cc9d',0,.04,side*24);
      A.tower(b,side*29,side*20,6);
      A.sandbags(b,side*18,side*24,6,0,2);
    }
    if(w.room.objective&&w.room.objective.id==='crucible'){for(const h of CRUCIBLE_HURDLES)b.box(h.w,h.h,h.d,'#c3a853',h.x,h.h/2,h.z);}
    b.mesh(api.world);
    api.label('ALPHA',0,4,32,'#8bd9ff',5);
    const red=api.label('BRAVO',0,4,-32,'#ff9576',5);red.rotation.y=Math.PI;
    for(const p of w.room.players){
      const model=A.makePerson(api.world,p.x,p.z,'recruit',{skin:p.slot%4,pose:'aim',cover:false});
      const localStyle=styleFor(p.id===w.room.me?(selectedStyle()??cloud.profile?.style):p.style);
      if(!localStyle||localStyle.pattern.kind==='shirt')A.makeHelmet(model.userData.body,p.team==='blue'?'#3a7194':'#934b3f');
      // Team identifiers stay visible even when a hat or mascot replaces the helmet.
      for(const i of [0,2])new A.Builder().box(.235,.065,.245,p.team==='blue'?'#3a9fdf':'#e75e4e',0,-.25,0).mesh(model.userData.limbs[i]);
      model.userData.rifle=A.makeRifle(model.userData.body);
      if(w.room.objective&&p.id===w.room.me&&w.room.objective.id==='crucible'){
        const crate=new A.Builder().box(.8,.6,.6,'#69804b',0,1,-.7).box(.84,.08,.64,'#c2ab64',0,1.3,-.7).mesh(model.userData.body);
        crate.visible=false;model.userData.supplyCrate=crate;
      }
      const identity=p.id===w.room.me?cloud.profile:p;
      A.applyLoadout(model,identity?.equipped,identity?.xp,p.id===w.room.me?(selectedStyle()??cloud.profile?.style):styleFor(p.style)?.id);
      const cosmetic=COSMETICS.find(c=>c.id===identity?.equipped),color=cosmetic?.id!=='recruit'?cosmetic?.color:p.team==='blue'?'#8bd9ff':'#ff9576';
      const tag=api.label(p.name+(p.bot?' · AI':Number.isFinite(identity?.xp)?' / '+rankFor(identity.xp):''),0,2.9,0,color||'#fff',2);
      api.world.remove(tag);model.add(tag);models.set(p.id,model);
      if(p.id===w.room.me)tag.visible=false;
    }
    if(!api.camera.parent)api.scene.add(api.camera);
    const own=me();visual.set(own.x,own.y,own.z);
    $('warModeBadge').textContent=(practice?'LOCAL PRACTICE':w.room.mode==='pvp'?'PVP':'PVBOT')+' / '+(own.team==='blue'?'ALPHA':'BRAVO');
    audio.mode=$('warAudio').value;audio.start(api.audioContext());
    renderUi();
  }
  for(const [id,order] of [['squadFollow','follow'],['squadHold','hold'],['squadPush','push']])$(id).onclick=()=>{if(w.active&&api.mode()==='playing')pendingOrder=order;};
  $('roleAbility').onclick=()=>{if(w.room?.objective&&api.mode()==='playing')pendingAbility=true;};
  $('warAudio').onchange=()=>{audio.mode=$('warAudio').value;};
  $('warLeave').onclick=()=>{
    lastInput={};pendingOrder=null;pendingJump=pendingReload=pendingFire=pendingAbility=false;
    $('warExitHeading').textContent=practice?'LOCAL PRACTICE PAUSED':'YOUR SQUAD IS STILL FIGHTING';$('warExitNote').textContent=practice?'The local clock and bots are stopped. Resume when ready.':'Online matches do not pause. Return to the fight or leave this operation.';api.show('warExit');api.setMode('warExit');api.clearKeys();fireMouse=false;
    if(document.pointerLockElement===api.canvas)document.exitPointerLock();
  };
  $('warStay').onclick=()=>{api.show(null);api.setMode('playing');api.clearKeys();};
  $('warLeaveConfirm').onclick=w.open;
  $('warShowScores').onclick=()=>$('warScores').classList.toggle('hidden');
  $('warScoresClose').onclick=()=>$('warScores').classList.add('hidden');
  $('warAgain').onclick=w.open;
  $('warResultCommand').onclick=()=>{w.exit();api.openCommand();};
  $('warResultTitleBack').onclick=()=>{w.exit();api.title();};
  api.canvas.addEventListener('pointerdown',e=>{if(w.active&&api.mode()==='playing'&&e.pointerType==='mouse'&&e.button===0){fireMouse=true;pendingFire=true;
    if(document.pointerLockElement!==api.canvas){
      try{api.canvas.requestPointerLock?.()?.catch?.(()=>{});}catch{/* Drag-to-look remains available. */}
    }}});
  window.addEventListener('pointerup',()=>{fireMouse=false;});
  document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==api.canvas){fireMouse=false;api.clearKeys();}});
  w.pointerMove=e=>{
    if(document.pointerLockElement!==api.canvas)return false;
    const {yaw,pitch}=api.look();
    api.setLook(yaw-e.movementX*.003*(api.settings?.().sensitivity||1),Math.max(-.65,Math.min(.9,pitch+e.movementY*.002*(api.settings?.().sensitivity||1))));
    return true;
  };
  window.addEventListener('blur',()=>{fireMouse=false;});
  w.pause=()=>{
    if(!w.active)return;
    if(api.mode()==='playing')$('warLeave').click();else if(api.mode()==='warExit')$('warStay').click();
  };
  w.update=dt=>{
    if(!w.active||ended)return;
    if(practice&&api.mode()==='playing')practiceClock+=dt*1000;
    const input=api.input(),playing=api.mode()==='playing';
    let {yaw,pitch}=api.look();
    if(playing){
      yaw+=((input.keys.arrowleft?1:0)-(input.keys.arrowright?1:0))*dt*1.8;
      pitch+=((input.keys.arrowdown?1:0)-(input.keys.arrowup?1:0))*dt*.7;
      pitch=Math.max(-.65,Math.min(.9,pitch));api.setLook(yaw,pitch);
    }
    let dx=(input.keys.d?1:0)-(input.keys.a?1:0),dz=(input.keys.s?1:0)-(input.keys.w?1:0);
    if(input.joy.on){dx=input.joy.x;dz=input.joy.y;}
    const mag=Math.max(1,Math.hypot(dx,dz));dx/=mag;dz/=mag;
    const worldX=dx*Math.cos(yaw)+dz*Math.sin(yaw),worldZ=-dx*Math.sin(yaw)+dz*Math.cos(yaw);
    const own=me(),active=playing&&elapsed()>=0&&own.hp>0;
    if(input.edges[' '])pendingJump=true;
    if(input.edges.r||input.edges.e)pendingReload=true;
    if(input.edges.j)pendingFire=true;
    if(input.edges.f)pendingAbility=true;
    if(input.edges['1'])pendingOrder='follow';if(input.edges['2'])pendingOrder='hold';if(input.edges['3'])pendingOrder='push';
    if(active){
      const speed=(input.keys.c?2.5:input.keys.shift?6.7:4.5)*(w.room.objective?.id==='crucible'&&w.room.objective.stage===1?.72:1);
      const x=visual.x+worldX*speed*dt,z=visual.z+worldZ*speed*dt;
      const blocked=(x,z)=>collides(x,z)||(w.room.objective?.id==='crucible'&&CRUCIBLE_HURDLES.some(h=>own.y<h.h&&Math.abs(x-h.x)<h.w/2+.35&&Math.abs(z-h.z)<h.d/2+.35));
      if(!blocked(x,visual.z))visual.x=x;
      if(!blocked(visual.x,z))visual.z=z;
      visual.y=THREE.MathUtils.lerp(visual.y,own.y,Math.min(1,dt*12));
    }
    for(const p of w.room.players){
      const model=models.get(p.id);if(!model)continue;
      const rifle=model.userData.rifle;if(rifle){const tilt=api.settings?.().reducedMotion?0:reloadPose((p.reloadAt||0)-now());rifle.rotation.z=-.55*tilt;rifle.position.y=1.5-.2*tilt;}
      if(p.id===w.room.me){
        if(model.userData.supplyCrate)model.userData.supplyCrate.visible=w.room.objective.stage===1;
        model.visible=own.hp>0;model.position.copy(visual);model.rotation.y=yaw;
        model.userData.pose=input.keys.c?'kneelaim':'aim';
        A.animatePerson(model,active&&Math.hypot(dx,dz)>.1,performance.now()*.008);
        continue;
      }
      model.visible=p.hp>0;model.position.lerp(new THREE.Vector3(p.x,p.y,p.z),Math.min(1,dt*11));
      model.rotation.y=p.yaw;model.userData.pose=p.crouch?'kneelaim':'aim';A.animatePerson(model,!!p.moving,performance.now()*.008);
      model.children.at(-1)?.lookAt(api.camera.position);
    }
    const view=thirdPersonView(visual,yaw,pitch,!!input.keys.k,!!input.keys.c,w.room.players,w.room.me);
    api.camera.position.copy(view.camera);api.camera.fov=view.fov;api.camera.updateProjectionMatrix();
    api.camera.lookAt(view.camera.clone().add(view.direction));
    const ownModel=models.get(w.room.me);if(ownModel)ownModel.visible=own.hp>0&&!view.hidePlayer;
    lastInput={dx:active?worldX:0,dz:active?worldZ:0,yaw:view.yaw,pitch:view.pitch,
      fire:active&&!!(input.keys.j||pendingFire||fireMouse),jump:active&&pendingJump,
      ...(w.room.objective?{ability:active&&pendingAbility,...(active&&pendingOrder?{order:pendingOrder}:{})}:{}),crouch:active&&!!input.keys.c,sprint:active&&!!input.keys.shift,reload:active&&!!(input.keys.r||pendingReload)};
    if(input.edges[' ']||input.edges.r||input.edges.e)pollOnce();
    for(const t of tracers)t.age+=dt;
    tracers=tracers.filter(t=>{if(t.age>.14){api.world.remove(t.line);t.line.geometry.dispose();t.line.material.dispose();return false;}return true;});
    audio.tick(dt,api.muted());
    lastUi+=dt;if(lastUi>.08){renderUi();lastUi=0;}
    if(elapsed()>duration()+2&&!refreshing){refreshing=true;pollOnce().finally(()=>refreshing=false);}
  };
  function renderUi(){
    const room=w.room,own=me();if(!own)return;
    const objective=room.objective||null;
    const captain=room.players.filter(p=>p.team===own.team&&!p.bot&&p.connected!==false).sort((a,b)=>a.slot-b.slot)[0];
    $('squadOrderStatus').textContent=(captain?.id===own.id?'SQUAD LEADER':'LEADER: '+(captain?.name||'None'))+' · '+(room.orders?.[own.team]?.kind||'push').toUpperCase();
    for(const id of ['squadFollow','squadHold','squadPush'])$(id).disabled=captain?.id!==own.id||own.hp<=0;
    $('warWinRule').textContent=practice&&objective?.id==='elimination'?'FIRST TO '+w.room.practiceConfig.target:objective?OPERATIONS[objective.id].name.toUpperCase():'FIRST TO 30';
    $('practiceHudLabel').textContent=practice?practiceSummary(w.room.practiceConfig,objective?.id):'';
    $('operationStatus').textContent=objective?objective.text+(objective.hold?' · '+objective.hold.toFixed(1)+'/5s':''):'';
    if(objectiveMarker){objectiveMarker.position.set(objective.x,.15,objective.z);}
    if(objective){const wait=Math.max(0,Math.ceil(((own.abilityAt||0)-now())/1000));$('roleAbility').textContent=ROLES[own.role].name+' · '+(wait?wait+'s':'F / ABILITY');$('roleAbility').disabled=wait>0||own.hp<=0;$('roleAbility').title=ROLES[own.role].ability;}
    const t=elapsed(),remaining=Math.ceil(Math.max(0,duration()-Math.max(0,t)));
    $('warTimer').textContent=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
    $('blueScore').textContent=Math.floor(room.scores.blue);$('redScore').textContent=Math.floor(room.scores.red);
    $('warDamageDirection').classList.toggle('hidden',now()>=damageUntil);
    $('warAllyStatus').replaceChildren(...room.players.filter(p=>p.team===own.team&&p.bot).map(p=>{const row=document.createElement('div');row.textContent=p.name+' · '+allyStatus(p,now());return row;}));
    $('warHealth').textContent=own.hp;$('warAmmo').textContent=own.reloadAt?'RELOADING':own.ammo+' / 30';
    $('warHealthBar').style.width=own.hp+'%';
    $('warPersonalScore').textContent=own.kills+' ELIMS / '+own.deaths+' DEATHS';
    $('warCountdown').classList.toggle('hidden',t>=0||!!room.endedAt);$('warCountdown').textContent=Math.ceil(-t);
    $('warRespawn').classList.toggle('hidden',own.hp>0||!!room.endedAt);
    $('warRespawnTime').textContent=Math.max(0,Math.ceil((own.respawnAt-now())/1000));
    $('warKillfeed').innerHTML=room.events.filter(e=>e.type==='kill').slice(-4).reverse().map(e=>`<div class="${e.team}">${esc(e.killer)} <span>›</span> ${esc(e.victim)}</div>`).join('');
    const roster=team=>room.players.filter(p=>p.team===team).sort((a,b)=>b.kills-a.kills).map(p=>
      `<div class="war-score-row ${p.id===room.me?'is-you':''}"><span>${esc(p.name)}<small>${p.bot?'BOT':p.connected?'PLAYER':'OFFLINE'}</small></span><b>${p.kills}</b><b>${p.deaths}</b></div>`).join('');
    $('warScoreBlue').innerHTML=roster('blue');$('warScoreRed').innerHTML=roster('red');
    const canvas=$('warRadar'),ctx=canvas.getContext('2d'),s=canvas.width;
    ctx.fillStyle='#11190de8';ctx.fillRect(0,0,s,s);ctx.strokeStyle='#778063';ctx.strokeRect(1,1,s-2,s-2);
    const pos=p=>[(p.x+24)/48*s,(p.z+35)/70*s];
    ctx.fillStyle='#768063';
    for(const c of WAR_COVER){const [x,z]=pos(c);ctx.fillRect(x-c.w/48*s/2,z-c.d/70*s/2,c.w/48*s,c.d/70*s);}
    if(objective){const [x,y]=pos(objective);ctx.strokeStyle='#ffc72c';ctx.strokeRect(x-5,y-5,10,10);}
    for(const p of room.players){if(p.hp<=0)continue;
      if(objective&&p.team!==own.team&&!(own.revealUntil>now())&&Math.hypot(p.x-own.x,p.z-own.z)>12)continue;const [x,y]=pos(p);
      ctx.fillStyle=p.id===room.me?'#ffc72c':p.team===own.team?'#83dbff':'#ff8566';ctx.beginPath();ctx.arc(x,y,p.id===room.me?4:2.8,0,Math.PI*2);ctx.fill();}
  }
  async function end(){
    ended=true;stop();audio.stop();fireMouse=false;
    if(document.pointerLockElement===api.canvas)document.exitPointerLock();
    api.clearKeys();api.setMode('warResult');api.show('warResult');
    $('warHud').classList.add('hidden');$('warScores').classList.add('hidden');
    const own=me(),ownScore=w.room.scores[own.team],other=w.room.scores[own.team==='blue'?'red':'blue'];
    $('warResultHeading').textContent=w.room.objective&&['escort','crucible'].includes(w.room.objective.id)?(w.room.objective.won?'MISSION COMPLETE':'MISSION INCOMPLETE'):ownScore===other?'STALEMATE':ownScore>other?'SQUAD VICTORY':'REGROUP. REDEPLOY.';
    $('warResultSummary').textContent='ALPHA '+w.room.scores.blue+' : '+w.room.scores.red+' BRAVO · '+own.kills+' eliminations · '+own.deaths+' deaths';
    $('warResultRoster').innerHTML=w.room.players.slice().sort((a,b)=>b.kills-a.kills).map(p=>
      `<div class="war-result-player ${p.id===w.room.me?'is-you':''}"><span class="${p.team}">${esc(p.name)}${p.bot?' · AI':''}</span><b>${p.kills} / ${p.deaths}</b></div>`).join('');
    $('warAnalysis').textContent=afterAction({mode:'war',...own,objectiveSeconds:own.objectiveSeconds||0,success:['escort','crucible'].includes(w.room.objective?.id)?!!w.room.objective.won:ownScore>other});
    $('warDrillReport').textContent='';$('warPracticeRecord').textContent='';$('warRetryPractice').classList.toggle('hidden',!practice);
    if(practice){
      const o=w.room.objective,success=o.id==='elimination'||o.id==='zones'||o.id==='intel'?ownScore>other:o.won;
      $('warResultHeading').textContent=success?'MISSION COMPLETE':'MISSION INCOMPLETE';
      $('warResultSummary').textContent=OPERATIONS[o.id].name+' · Alpha '+Math.floor(ownScore)+' / Bravo '+Math.floor(other)+' · '+own.kills+' eliminations · '+own.deaths+' deaths';
      const config=w.room.practiceConfig,record={operation:o.id,role:own.role,config,success:!!success,elapsed:Math.min(duration(),Math.max(0,elapsed())),timestamp:Date.now(),shots:own.shots,hits:own.hits,kills:own.kills,deaths:own.deaths,support:own.support||0,objectiveSeconds:Math.min(duration(),own.objectiveSeconds||0)};
      const old=bestMission(missionLog(),config,o.id),saved=saveMission(record);
      $('warPracticeRecord').textContent=practiceSummary(config,o.id)+' · '+(saved.saved?'Mission saved on this device.':'Storage unavailable: mission not saved.')+(success&&(!old||record.elapsed<old.elapsed)?' New fastest win for these exact rules.':'');
      if(standardPractice(config)){
        const medals=recordCareer({mode:'war',local:true,support:own.support||0,objectiveSeconds:own.objectiveSeconds||0});
        $('warAnalysis').textContent+=' · '+(medals.saved?'Medals saved locally.':'Medals not saved: storage unavailable.');
        const challenges=drillChallenges(own,true),savedBadges=saveBadges(challenges.filter(c=>c.done).map(c=>c.id));
        $('warDrillReport').textContent='DRILL INSTRUCTOR: '+challenges.map(c=>(c.done?'✓ ':'— ')+c.name).join(' · ')+(savedBadges?' · Badges saved in this browser.':' · Storage unavailable; badges not saved.');
      }else $('warDrillReport').textContent='Custom practice: no local medals or Drill Instructor badges. Restore standard settings to earn them.';
      $('warRewardText').textContent='Local AI-squad practice complete. No cloud cash, XP or leaderboard scores awarded.';return;}
    const ticket=lifecycle.current();
    $('warRewardText').textContent='Syncing match earnings…';
    try{
      const p=await cloud.refresh();if(!lifecycle.valid(ticket))return;const reward=p.claims.find(c=>c.source==='match:'+w.room.code);
      $('warRewardText').textContent=reward?'+'+reward.cash+' Field Cash · +'+reward.xp+' XP saved. Visit Command for additional rewards.':
        'No reward: complete a match with at least 20 seconds of active movement or firing.';
    }catch(e){if(lifecycle.valid(ticket))$('warRewardText').textContent='Rewards are stored by the server. Refresh your dossier to check earnings.';}
  }
  w.text=()=>({active:w.active,room:w.room?.code,kind:w.room?.mode,elapsed:+elapsed().toFixed(2),
    scores:w.room?.scores,me:me(),players:w.room?.players.map(({id,name,team,bot,hp,x,y,z,kills,deaths})=>({id,name,team,bot,hp,x,y,z,kills,deaths})),
    config:practice?w.room?.practiceConfig:null,duration:duration(),input:lastInput,view:'third-person',ended,cloud:!practice,practice:!!practice});
  return w;
}
