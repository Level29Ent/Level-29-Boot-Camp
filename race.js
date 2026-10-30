import {createRaceCourses} from './race-courses.js';
import {RACE_DURATION,RACE_DISQUALIFIED,rankRaceEntries} from './race-rules.js';
import {FieldAudio} from './race-audio.js';
import {cloud} from './cloud.js';

const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors=['#79d7ff','#ff9c65','#b6e77b','#d5a5ff','#ffdc72','#8ae0c1','#f8a9c3'];
const botNames=['Sgt. Steel','Viper','Ghost','Echo','Raider','Falcon','Bulldog'];
export function initRace(api){
  const campaign=api.levels.slice(),courses=createRaceCourses(),audio=new FieldAudio();
  const r={active:false,online:false,finished:false,elapsed:0,finishTime:null,entries:[],bots:[],course:0};
  let room=null,token='',pollTimer=null,busy=false,pollFailures=0,anchor=0,syncedElapsed=-5;
  let countdown=-3,roundStarted=false,ended=false,models=new Map(),lastDraw=0;
  let soloEpoch=0,pausedAt=0,manual=false;
  let serverOffset=0,bestRtt=Infinity;
  const status=(message)=>{$('roomStatus').textContent=message;};
  const name=()=>$('racerName').value.trim().slice(0,18)||'Recruit';
  function useCourses(){api.levels.splice(0,api.levels.length,...courses);}
  function useCampaign(){api.levels.splice(0,api.levels.length,...campaign);}
  async function request(path,data,method){
    const sent=Date.now(),parts=path.split('/').filter(Boolean),code=parts[0];
    await cloud.ensure(data?.name||name());
    if(data?.name&&data.name!==cloud.profile.name)await cloud.mutate('rename',{name:data.name});
    const actions={join:'room_join',start:'room_start',move:'race_move',leave:'room_leave'};
    const action=!code?'race_create':actions[parts[1]]||'room_state';
    const body=await cloud.rpc(action,{...data,code,expectedKind:'race'});
    const received=Date.now(),rtt=received-sent;
    if(body.serverNow&&rtt<bestRtt){serverOffset=body.serverNow-(sent+received)/2;bestRtt=rtt;}
    if(body.kind!=='race'&&action==='room_join')throw new Error('That is a war room. Join it from 5v5 War instead.');
    return body;
  }
  function stopPolling(){clearInterval(pollTimer);pollTimer=null;busy=false;}
  function leave(){
    stopPolling();
    if(room&&token)request('/'+room.code+'/leave',{}).catch(()=>{});
    room=null;token='';r.online=false;
  }
  r.exit=()=>{
    leave();audio.stop();r.active=false;r.finished=false;useCampaign();
    api.raceGraphics(false);
    $('hudTimerLabel').textContent='TIME REMAINING';$('hudScoreLabel').textContent='SCORE';
    $('raceBoard').classList.add('hidden');$('raceCountdown').classList.add('hidden');
    document.body.classList.remove('race-active');models.clear();
  };
  r.open=()=>{
    r.exit();api.setMode('raceMenu');api.show('raceMenu');
    $('raceCourse').innerHTML=courses.map((c,i)=>`<option value="${i}">${String(i+1).padStart(3,'0')} / ${c.name} / ${c.env}</option>`).join('');
    $('raceCourse').value=r.course;updateCourse();status('Create a private room, then send its code to friends.');
  };
  function updateCourse(){
    r.course=+$('raceCourse').value;
    const c=courses[r.course];
    $('raceCourseInfo').textContent=c.segs.map(s=>s.t.replaceAll('_',' ')).join(' · ');
    $('courseNumber').textContent=String(r.course+1).padStart(3,'0');
  }
  $('raceCourse').onchange=updateCourse;
  $('racePrev').onclick=()=>{$('raceCourse').value=(r.course+99)%100;updateCourse();};
  $('raceNext').onclick=()=>{$('raceCourse').value=(r.course+1)%100;updateCourse();};
  $('btnRace').onclick=r.open;
  $('raceBack').onclick=()=>{r.exit();api.title();};
  $('raceSolo').onclick=async()=>{
    const button=$('raceSolo');button.disabled=true;status('Preparing persistent race…');
    try{
      leave();room=await request('',{name:name(),course:r.course});r.online=true;
      const state=await request('/'+room.code+'/start',{});applyState(state);poll();
    }catch(e){status(e.message);}finally{button.disabled=false;}
  };
  $('raceMusic').onchange=()=>{audio.mode=$('raceMusic').value;api.startAudio();};
  $('raceVolume').oninput=()=>{audio.volume=+$('raceVolume').value/100;$('volumeValue').textContent=$('raceVolume').value+'%';};
  $('createRoom').onclick=async()=>{
    const b=$('createRoom');b.disabled=true;status('Creating room…');
    try{leave();const state=await request('',{name:name(),course:r.course});token=state.token;room=state;r.online=true;showRoom();poll();}
    catch(e){status(e.message);}finally{b.disabled=false;}
  };
  $('joinRoom').onclick=async()=>{
    const code=$('roomCode').value.trim().toUpperCase();
    if(!/^[A-F0-9]{6}$/.test(code)){status('Enter the six-character room code from your friend.');return;}
    const b=$('joinRoom');b.disabled=true;status('Joining room…');
    try{leave();const state=await request('/'+code+'/join',{name:name()});token=state.token;room=state;r.online=true;r.course=state.course;showRoom();poll();}
    catch(e){status(e.message);}finally{b.disabled=false;}
  };
  function showRoom(){
    api.setMode('raceLobby');api.show('raceLobby');
    $('lobbyCode').textContent=room.code;
    $('lobbyCourse').textContent='COURSE '+(room.course+1)+' / '+courses[room.course].name;
    $('roomNotice').textContent='Send friends this app link and room code. Up to six human racers; bots fill eight starting slots. Rooms and rewards are stored in the cloud.';
    refreshLobby();
  }
  function refreshLobby(){
    const host=room.me===room.host;
    $('lobbyPlayers').innerHTML=room.players.map(p=>`<div class="roster-row"><span>${escape(p.name)}${p.id===room.me?' (you)':''}</span><b>${p.id===room.host?'HOST':p.connected?'READY':'OFFLINE'}</b></div>`).join('')
      +`<div class="roster-row bot-row"><span>${8-room.players.length} bot opponents</span><b>AI SQUAD</b></div>`;
    $('startRoom').disabled=!host||room.elapsed!==null;
    $('startRoom').textContent=host?'Start 60-second race':'Waiting for host';
  }
  $('leaveRoom').onclick=()=>{leave();r.open();};
  $('copyRoom').onclick=async()=>{
    try{await navigator.clipboard.writeText(room.code);$('copyRoom').textContent='Code copied';}
    catch{$('roomNotice').textContent='Copy this code: '+room.code+'. Share the app with your friend, then have them select Play with friends and enter it.';}
  };
  $('startRoom').onclick=async()=>{
    $('startRoom').disabled=true;
    try{applyState(await request('/'+room.code+'/start',{}));}
    catch(e){$('roomNotice').textContent=e.message;$('startRoom').disabled=false;}
  };
  function applyState(state){
    room=state;pollFailures=0;
    if(state.elapsed!==null){
      syncedElapsed=state.elapsed;anchor=performance.now();
      if(!r.active)start(state.course);
    }else refreshLobby();
  }
  function movement(){
    const s=api.state(),p=s.player.position;
    return {x:p.x,y:Math.min(6,Math.max(0,p.y)),z:p.z,rotation:s.player.rotation.y,progress:progress(),finished:r.finished};
  }
  async function pollOnce(){
    if(busy||!room)return;busy=true;
    const code=room.code;
    try{
      const state=await request('/'+code+(r.active&&!ended?'/move':''),r.active&&!ended?movement():undefined);
      if(room?.code!==code)return;
      applyState(state);
      if(r.active)$('raceConnection').textContent='LIVE ROOM '+room.code;
    }catch(e){
      pollFailures++;
      if(r.active)$('raceConnection').textContent='RECONNECTING · '+pollFailures;
      else $('roomNotice').textContent=e.message;
    }finally{busy=false;}
  }
  function poll(){stopPolling();pollTimer=setInterval(pollOnce,250);}
  function start(course){
    r.active=true;r.finished=false;r.finishTime=null;r.course=course;r.elapsed=0;r.entries=[];ended=false;
    countdown=-3;soloEpoch=performance.now();roundStarted=false;models=new Map();useCourses();
    api.raceGraphics(true);api.brief(course);api.begin();document.body.classList.add('race-active');
    const humans=r.online?room.players.length:1;
    r.bots=Array.from({length:8-humans},(_,i)=>({
      id:'bot-'+i,name:botNames[i],type:'BOT',speed:3.6+((i*7+course*3)%15)/10,
      lane:(i%2?1:-1)*(.65+Math.floor(i/2)*.55),color:colors[i],progress:0,finish:null
    }));
    $('raceBoard').classList.remove('hidden');$('raceCountdown').classList.remove('hidden');
    $('raceConnection').textContent=r.online?'LIVE ROOM '+room.code:'SOLO + 7 BOTS';
    api.state().player.position.set(0,0,7);
    audio.start(api.audioContext());
    $('hudTimerLabel').textContent='RACE CLOCK';$('hudScoreLabel').textContent='PROGRESS';
    $('hudTimer').textContent='1:00';$('hudScore').textContent='0%';
    $('hudObjective').textContent='GET READY · clear gold checkpoints in order';
    $('shout').classList.remove('on');drawBoard();
    $('hudKeys').innerHTML='<kbd>Space</kbd> Jump / climb · <kbd>C</kbd> Crawl<br><kbd>Shift</kbd> Sprint · gold rings in order';
    for(const bot of r.bots)modelFor(bot);
    if(r.online)for(const human of room.players)if(human.id!==room.me)modelFor({...human,type:'FRIEND',color:'#79d7ff'});
    soloEpoch=performance.now();
  }
  function modelFor(entry){
    if(models.has(entry.id))return models.get(entry.id);
    const model=api.person(entry.id.startsWith('bot')?r.bots.find(b=>b.id===entry.id).lane:1,7,'recruit',{cover:true,skin:models.size%4});
    const tag=api.label(entry.type==='BOT'?'AI '+(Number(entry.id.slice(4))+1):entry.name,0,2.8,0,entry.color||'#79d7ff',entry.type==='BOT'?.8:1.6);
    api.world.remove(tag);model.add(tag);
    const item={model,tag};models.set(entry.id,item);return item;
  }
  function progress(){
    if(r.finished)return 1;
    const s=api.state(),cps=s.checkpoints;
    if(!cps.length)return 0;
    const i=s.stage,from=i===0?7:cps[i-1]?.z??7,to=cps[i]?.z??from;
    const part=Math.max(0,Math.min(.99,(from-s.player.position.z)/(from-to||1)));
    return Math.min(.999,(i+part)/cps.length);
  }
  function botAt(bot,t){
    const cps=api.state().checkpoints;
    let from=7,spent=0;
    for(let i=0;i<cps.length;i++){
      const to=cps[i].z,type=courses[r.course].segs[i]?.t||'finish';
      const factor={mud:.64,water:.7,high_wall:.72,cargo_net:.7,rope:.75,bars:.72,wire:.65,tunnel:.65,mines:.82,beam:.8}[type]||1;
      const travel=(from-to)/(bot.speed*factor)+.25+((i+Number(bot.id.slice(4)))%3)*.17;
      if(t<spent+travel){
        const q=Math.max(0,(t-spent)/travel),z=from+(to-from)*q;
        let x=bot.lane,y=0,pose='stand';
        const s=api.state();
        for(const o of s.obstacles){
          if(Math.abs(z-o.z)<3&&o.type==='crawl')pose='crouch';
          if(o.type==='wall'&&Math.abs(z-o.z)<2)y=Math.sin((z-o.z+2)/4*Math.PI)*(o.h+1);
          if(o.type==='climb'&&Math.abs(z-o.z)<2.5)y=Math.sin((z-o.z+2.5)/5*Math.PI)*(o.h+.3);
          if(o.type==='block'&&Math.abs(z-o.z)<2)x=o.x>0?-3.9:3.9;
        }
        for(const zone of s.zones){
          if(z>zone.z0||z<zone.z1)continue;
          if(zone.type==='beam')x=0;
          if(zone.type==='bars'){x=0;y=.55;pose='hang';}
          if(zone.type==='pit')y=1.5;
          if(zone.type==='mines')x=api.laneAt(zone,zone.z0-z);
        }
        return {x,y,z,pose,progress:(i+q)/cps.length,finish:null};
      }
      spent+=travel;from=to;
    }
    return {x:bot.lane,y:0,z:from-1,pose:'stand',progress:1,finish:spent};
  }
  function entries(){
    const serverOwn=r.online&&ended?room.players.find(p=>p.id===room.me):null;
    const own={id:r.online?room.me:'you',name:r.online?(room.players.find(p=>p.id===room.me)?.name||name()):name(),
      type:'YOU',progress:serverOwn?.progress??progress(),finish:serverOwn?serverOwn.finish:r.finishTime};
    const humans=r.online?room.players.filter(p=>p.id!==room.me).map(p=>({...p,type:'FRIEND',finish:p.finish,
      name:p.name+(p.connected?'':' (offline)')})):[];
    const list=rankRaceEntries([own,...humans,...r.bots]);
    r.entries=list;return list;
  }
  function drawBoard(){
    const list=entries();
    $('raceStandings').innerHTML=list.map((e,i)=>`<div class="race-standing ${e.type==='YOU'?'is-you':''}"><b>${i+1}</b><span>${escape(e.name)}<small>${e.type}${e.disqualified?' · AT RISK':''}</small></span><strong>${e.finish!==null?e.finish.toFixed(1)+'s':Math.floor(e.progress*100)+'%'}</strong></div>`).join('');
    $('hudScore').textContent=Math.floor(progress()*100)+'%';
  }
  r.onBegin=()=>{};
  r.complete=()=>{
    if(r.finished)return;
    r.finished=true;r.finishTime=Math.min(RACE_DURATION,r.elapsed);
    const player=api.state().player;player.position.y=0;player.userData.pose='stand';api.animate(player,false,0,false);
    api.clearKeys();$('hudObjective').textContent='FINISHED · watching the squad until 60 seconds';
    api.say('FINISH! '+r.finishTime.toFixed(2)+'s','good',2.5);
    if(r.online)pollOnce();
  };
  r.beforeUpdate=dt=>{
    if(!r.active||ended)return true;
    if(r.online)r.elapsed=room.startsAt?(Date.now()+serverOffset-room.startsAt)/1000:syncedElapsed+(performance.now()-anchor)/1000;
    else{if(manual)countdown+=dt;else countdown=(performance.now()-soloEpoch)/1000-3;r.elapsed=countdown;}
    if(r.elapsed<0){
      $('raceCountdown').textContent=Math.ceil(-r.elapsed);
      api.clearKeys();return false;
    }
    if(!roundStarted){
      roundStarted=true;api.clearKeys();api.say('GO!','good',.8);
      $('raceCountdown').classList.add('hidden');api.vo('start1');
    }
    r.elapsed=Math.min(RACE_DURATION,r.elapsed);
    if(r.elapsed>=RACE_DURATION){
      r.afterUpdate(0);end();return false;
    }
    if(r.finished)api.clearKeys();
    return true;
  };
  r.afterUpdate=dt=>{
    if(!r.active||ended)return;
    for(const bot of r.bots){
      const state=botAt(bot,Math.max(0,r.elapsed));Object.assign(bot,state);
      const m=modelFor(bot).model;m.position.set(state.x,state.y,state.z);
      m.userData.pose=state.pose==='crouch'?'stand':state.pose;
      api.animate(m,state.finish===null,r.elapsed*8,state.pose==='crouch');
    }
    if(r.online)for(const p of room.players){
      if(p.id===room.me)continue;
      const m=modelFor({...p,type:'FRIEND'}).model;
      m.position.lerp(api.vector(p.x,p.y,p.z),Math.min(1,dt*12));m.rotation.y=p.rotation;
      api.animate(m,!p.finish,r.elapsed*8);
    }
    drawBoard();
    audio.tick(dt,api.muted());
  };
  r.advance=(ms,update)=>{
    manual=true;
    for(let i=0;i<Math.ceil(ms/(1000/60));i++)update(1/60);
    manual=false;soloEpoch=performance.now()-(r.elapsed+3)*1000;
  };
  r.setPaused=paused=>{
    if(paused)pausedAt=performance.now();
    else if(pausedAt){soloEpoch+=performance.now()-pausedAt;pausedAt=0;}
  };
  r.retry=()=>r.online?r.open():start(r.course);
  function end(){
    ended=true;r.elapsed=RACE_DURATION;api.clearKeys();audio.stop();
    $('raceBoard').classList.add('hidden');$('raceCountdown').classList.add('hidden');
    api.setMode('result');api.show('raceResult');drawResults();
    $('raceRewardText').textContent='Saving match earnings…';
    if(r.online){
      stopPolling();const code=room.code;
      setTimeout(async()=>{
        try{
          const state=await request('/'+code);
          if(room?.code===code){room=state;drawResults();}
          const p=await cloud.refresh(),reward=p.claims.find(c=>c.source==='match:'+code);
          $('raceRewardText').textContent=reward?'+'+reward.cash+' Field Cash · +'+reward.xp+' XP saved. Check Command for daily cash and accomplishments.':
            'No cash awarded: matches need at least 20 seconds of active movement. Finishing and wins earn extra.';
        }catch(e){$('raceRewardText').textContent='Reward sync pending: '+e.message;}
      },1000);
    }
    api.vo('complete1');
  }
  function drawResults(){
    const list=entries(),own=list.find(e=>e.type==='YOU'),rank=own.place;
    $('raceResultTitle').textContent=own.disqualified?'DISQUALIFIED':rank===1?'MISSION: FIRST PLACE':'QUALIFIED';
    $('raceResultText').textContent=courses[r.course].name+' · '+RACE_DURATION.toFixed(2)+'-second round · You placed '+rank+' of '+list.length+'. Bottom '+RACE_DISQUALIFIED+' disqualified.';
    $('raceResults').innerHTML=list.map((e,i)=>`<div class="result-racer ${e.disqualified?'is-disqualified':''} ${e.type==='YOU'?'is-you':''}"><b>${String(i+1).padStart(2,'0')}</b><span>${escape(e.name)}<small>${e.type} · ${e.disqualified?'DISQUALIFIED':'QUALIFIED'}</small></span><strong>${e.finish!==null?e.finish.toFixed(2)+'s':Math.floor(e.progress*100)+'% / DNF'}</strong></div>`).join('');
    $('raceAgain').textContent=r.online?'New room / race':'Race again';
  }
  $('raceAgain').onclick=()=>{if(r.online)r.open();else start(r.course);};
  $('raceChoose').onclick=r.open;
  $('raceQuit').onclick=()=>{r.exit();api.title();};
  r.isOnline=()=>r.active&&r.online;
  r.audio=audio;r.courses=courses;r.progress=progress;
  r.text=()=>({active:r.active,online:r.online,course:r.course+1,courseCount:courses.length,
    countdown:Math.max(0,-r.elapsed),elapsed:+r.elapsed.toFixed(2),duration:RACE_DURATION,finished:r.finished,
    finishTime:r.finishTime,progress:progress(),room:room?.code,standings:r.entries.map(({name,type,progress,finish,place,disqualified})=>({name,type,progress,finish,place,status:ended?(disqualified?'disqualified':'qualified'):(disqualified?'at risk':'racing')})),
    audio:{mode:audio.mode,volume:audio.volume}});
  return r;
}
