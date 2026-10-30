import * as THREE from 'three';
import * as A from './art.js';
import {cloud} from './cloud.js';
import {thirdPersonView} from './war-view.js';
import {WAR_COVER,WAR_DURATION,WAR_TARGET,COSMETICS} from './rules.js';
import {FieldAudio} from './race-audio.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const collides=(x,z)=>Math.abs(x)>22||Math.abs(z)>32||WAR_COVER.some(c=>Math.abs(x-c.x)<c.w/2+.48&&Math.abs(z-c.z)<c.d/2+.48);
export function initWar(api){
  const w={active:false,room:null};let timer=null,busy=false,ended=false,clockOffset=0,bestRtt=Infinity;
  let seq=0,models=new Map(),visual=new THREE.Vector3(),lastEvents=new Set(),tracers=[],fireMouse=false;
  let lastInput={},lastUi=0,lastNetwork=0,refreshing=false;
  let pendingJump=false,pendingReload=false,pendingFire=false,lastRtt=0;
  const audio=new FieldAudio();audio.volume=.22;
  const message=s=>{$('warStatus').textContent=s;};
  const me=()=>w.room?.players.find(p=>p.id===w.room.me);
  const now=()=>Date.now()+clockOffset;
  const elapsed=()=>w.room?.startsAt?(Math.min(now(),w.room.endedAt||Infinity)-w.room.startsAt)/1000:-4;
  async function request(action,payload={}){
    const sent=Date.now(),state=await cloud.rpc(action,payload),rtt=Date.now()-sent;
    if(state.serverNow&&rtt<bestRtt){bestRtt=rtt;clockOffset=state.serverNow-(sent+Date.now())/2;}
    lastNetwork=performance.now();lastRtt=rtt;return state;
  }
  function stop(){clearInterval(timer);timer=null;busy=false;}
  w.exit=()=>{
    const code=w.room?.code;stop();
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
    message('Choose your deployment. PvBot: your squad vs five bots. PvP: two human-led teams, with bots filling vacancies.');
    $('warJoinCode').value='';
  };
  $('btnWar').onclick=w.open;
  $('warBack').onclick=()=>{w.exit();api.title();};
  $('warMenuCommand').onclick=()=>{w.exit();api.openCommand();};
  async function prepare(button,fn){
    button.disabled=true;message('Connecting to command…');api.startAudio();
    try{await cloud.ensure($('racerName').value);await fn();}
    catch(e){message(e.message);}
    finally{button.disabled=false;}
  }
  $('warBots').onclick=()=>prepare($('warBots'),async()=>{
    w.room=await request('war_create',{mode:'pve'});
    apply(await request('room_start',{code:w.room.code}));poll();
  });
  $('warCreatePvp').onclick=()=>prepare($('warCreatePvp'),async()=>{
    w.room=await request('war_create',{mode:'pvp'});lobby();poll();
  });
  $('warCreatePve').onclick=()=>prepare($('warCreatePve'),async()=>{
    w.room=await request('war_create',{mode:'pve'});lobby();poll();
  });
  $('warFind').onclick=()=>prepare($('warFind'),async()=>{
    w.room=await request('war_find');lobby();poll();
  });
  $('warJoin').onclick=()=>prepare($('warJoin'),async()=>{
    const code=$('warJoinCode').value.trim().toUpperCase();
    if(!/^[A-F0-9]{6}$/.test(code))throw new Error('Enter the six-character war room code.');
    const state=await request('room_join',{code,expectedKind:'war'});
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
    catch(e){$('warLobbyNote').textContent=e.message;renderLobby();}
  };
  function poll(){stop();timer=setInterval(pollOnce,200);}
  async function pollOnce(){
    if(busy||!w.room||ended)return;busy=true;const code=w.room.code;
    try{
      const payload={...lastInput,seq:++seq,code};pendingJump=pendingReload=pendingFire=false;
      const state=await request(w.active?'war_input':'room_state',payload);
      if(w.room?.code!==code)return;
      apply(state);
      $('warNetwork').textContent='CLOUD LIVE · '+Math.round(lastRtt)+' ms';
    }catch(e){
    if(w.active)$('warNetwork').textContent='RECONNECTING · '+e.message;
      else $('warLobbyNote').textContent=e.message;
    }finally{busy=false;}
  }
  function apply(state){
    w.room=state;
    if(state.startsAt!==null){
      if(!w.active)build();
      const own=me();
      if(own){
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
          if(e.from===state.me){api.tone(68,.06,'sawtooth',.05);if(e.hit)$('warReticle').classList.add('hit');setTimeout(()=>$('warReticle').classList.remove('hit'),100);}
        }
      }
      if(state.endedAt&&!ended)end();
    }else renderLobby();
  }
  function build(){
    ended=false;w.active=true;seq=0;lastEvents=new Set();models=new Map();tracers=[];
    api.graphics(true);api.clearWorld();api.show(null);api.setMode('playing');document.body.classList.add('war-active');
    $('warHud').classList.remove('hidden');api.setLook(me()?.team==='red'?Math.PI:0,.18);api.clearKeys();
    const useButton=$('touchControls')?.querySelector('[data-key="e"]');if(useButton)useButton.innerHTML='E<br><small>RELOAD</small>';
    const crouchButton=$('touchControls')?.querySelector('[data-key="c"]');if(crouchButton)crouchButton.innerHTML='C<br><small>CROUCH</small>';
    A.applyEnv('combat',api.scene,api.lights,api.renderer);api.scene.fog=new THREE.Fog('#b8ae8e',65,160);
    api.box(58,.3,80,'#a99b70',0,-.18,0);
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
    b.mesh(api.world);
    api.label('ALPHA',0,4,32,'#8bd9ff',5);
    const red=api.label('BRAVO',0,4,-32,'#ff9576',5);red.rotation.y=Math.PI;
    for(const p of w.room.players){
      const model=A.makePerson(api.world,p.x,p.z,'recruit',{skin:p.slot%4,pose:'aim',cover:false});
      A.makeHelmet(model.userData.body,p.team==='blue'?'#3a7194':'#934b3f');A.makeRifle(model.userData.body);
      const cosmetic=COSMETICS.find(c=>c.id===p.equipped),color=cosmetic?.id!=='recruit'?cosmetic?.color:p.team==='blue'?'#8bd9ff':'#ff9576';
      const tag=api.label(p.name+(p.bot?' · AI':''),0,2.9,0,color||'#fff',2);
      api.world.remove(tag);model.add(tag);models.set(p.id,model);
      if(p.id===w.room.me)tag.visible=false;
    }
    if(!api.camera.parent)api.scene.add(api.camera);
    const own=me();visual.set(own.x,own.y,own.z);
    $('warModeBadge').textContent=(w.room.mode==='pvp'?'PVP':'PVBOT')+' / '+(own.team==='blue'?'ALPHA':'BRAVO');
    audio.mode=$('warAudio').value;audio.start(api.audioContext());
    renderUi();
  }
  $('warAudio').onchange=()=>{audio.mode=$('warAudio').value;};
  $('warLeave').onclick=()=>{
    api.show('warExit');api.setMode('warExit');api.clearKeys();fireMouse=false;
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
    api.setLook(yaw-e.movementX*.003,Math.max(-.65,Math.min(.9,pitch+e.movementY*.002)));
    return true;
  };
  window.addEventListener('blur',()=>{fireMouse=false;});
  w.pause=()=>{
    if(!w.active)return;
    if(api.mode()==='playing')$('warLeave').click();else if(api.mode()==='warExit')$('warStay').click();
  };
  w.update=dt=>{
    if(!w.active||ended)return;
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
    if(active){
      const speed=input.keys.c?2.5:input.keys.shift?6.7:4.5;
      const x=visual.x+worldX*speed*dt,z=visual.z+worldZ*speed*dt;
      if(!collides(x,visual.z))visual.x=x;
      if(!collides(visual.x,z))visual.z=z;
      visual.y=THREE.MathUtils.lerp(visual.y,own.y,Math.min(1,dt*12));
    }
    for(const p of w.room.players){
      const model=models.get(p.id);if(!model)continue;
      if(p.id===w.room.me){
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
      crouch:active&&!!input.keys.c,sprint:active&&!!input.keys.shift,reload:active&&!!(input.keys.r||pendingReload)};
    if(input.edges[' ']||input.edges.r||input.edges.e)pollOnce();
    for(const t of tracers)t.age+=dt;
    tracers=tracers.filter(t=>{if(t.age>.14){api.world.remove(t.line);t.line.geometry.dispose();t.line.material.dispose();return false;}return true;});
    audio.tick(dt,api.muted());
    lastUi+=dt;if(lastUi>.08){renderUi();lastUi=0;}
    if(elapsed()>WAR_DURATION+2&&!refreshing){refreshing=true;pollOnce().finally(()=>refreshing=false);}
  };
  function renderUi(){
    const room=w.room,own=me();if(!own)return;
    const t=elapsed(),remaining=Math.ceil(Math.max(0,WAR_DURATION-Math.max(0,t)));
    $('warTimer').textContent=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
    $('blueScore').textContent=room.scores.blue;$('redScore').textContent=room.scores.red;
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
    for(const p of room.players){if(p.hp<=0)continue;const [x,y]=pos(p);
      ctx.fillStyle=p.id===room.me?'#ffc72c':p.team===own.team?'#83dbff':'#ff8566';ctx.beginPath();ctx.arc(x,y,p.id===room.me?4:2.8,0,Math.PI*2);ctx.fill();}
  }
  async function end(){
    ended=true;stop();audio.stop();fireMouse=false;
    if(document.pointerLockElement===api.canvas)document.exitPointerLock();
    api.clearKeys();api.setMode('warResult');api.show('warResult');
    $('warHud').classList.add('hidden');$('warScores').classList.add('hidden');
    const own=me(),ownScore=w.room.scores[own.team],other=w.room.scores[own.team==='blue'?'red':'blue'];
    $('warResultHeading').textContent=ownScore===other?'STALEMATE':ownScore>other?'SQUAD VICTORY':'REGROUP. REDEPLOY.';
    $('warResultSummary').textContent='ALPHA '+w.room.scores.blue+' : '+w.room.scores.red+' BRAVO · '+own.kills+' eliminations · '+own.deaths+' deaths';
    $('warResultRoster').innerHTML=w.room.players.slice().sort((a,b)=>b.kills-a.kills).map(p=>
      `<div class="war-result-player ${p.id===w.room.me?'is-you':''}"><span class="${p.team}">${esc(p.name)}${p.bot?' · AI':''}</span><b>${p.kills} / ${p.deaths}</b></div>`).join('');
    $('warRewardText').textContent='Syncing match earnings…';
    try{
      const p=await cloud.refresh(),reward=p.claims.find(c=>c.source==='match:'+w.room.code);
      $('warRewardText').textContent=reward?'+'+reward.cash+' Field Cash · +'+reward.xp+' XP saved. Visit Command for additional rewards.':
        'No reward: complete a match with at least 20 seconds of active movement or firing.';
    }catch(e){$('warRewardText').textContent='Rewards are stored by the server. Refresh your dossier to check earnings.';}
  }
  w.text=()=>({active:w.active,room:w.room?.code,kind:w.room?.mode,elapsed:+elapsed().toFixed(2),
    scores:w.room?.scores,me:me(),players:w.room?.players.map(({id,name,team,bot,hp,x,y,z,kills,deaths})=>({id,name,team,bot,hp,x,y,z,kills,deaths})),
    input:lastInput,view:'third-person',ended,cloud:true});
  return w;
}
