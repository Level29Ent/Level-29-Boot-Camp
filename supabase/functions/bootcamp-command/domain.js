import {COSMETICS,ACHIEVEMENTS,dailyChallenges,dayKey,WAR_COVER} from '../../../rules.js';
import {AVATAR_STYLES} from '../../../avatar-styles.js';
import {createObjective,stepObjective,useRole,objectiveDestination,OPERATIONS,ROLES,CRUCIBLE_HURDLES} from '../../../operations.js';
export const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export const finite=(value,min,max,fallback=0)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
export function callsign(value){if(typeof value!=='string'||!value.trim()||value.trim().length>18)fail('Enter a callsign between 1 and 18 characters.');return value.trim();}
export function appearance(value){if(value===null)return null;if(!AVATAR_STYLES.some(s=>s.id===value))fail('Unknown appearance.');return value;}
export function newProfile(id,name){return {id,name:callsign(name),cash:0,xp:0,equipped:'recruit',style:null,inventory:['recruit'],stats:{},daily:{},claims:[]};}
export function profileAction(p,action,payload,time){
  if(action==='profile')return;
  if(action==='rename'){p.name=callsign(payload.name);return;}
  if(action==='appearance'){p.style=appearance(payload.style);return;}
  if(action==='purchase'){
    const item=COSMETICS.find(c=>c.id===payload.id);if(!item)fail('Unknown cosmetic.');
    if(!p.inventory.includes(item.id)){
      if(p.cash<item.price)fail('Not enough Field Cash.');p.cash-=item.price;p.inventory.push(item.id);
      p.claims.unshift({source:'shop:'+item.id,cash:-item.price,xp:0});
    }
    p.equipped=item.id;return;
  }
  if(action==='claim'){
    const date=dayKey(time);let source,amount;
    if(payload.kind==='daily'){
      if(p.daily.date!==date||!p.daily.eligible)fail('Complete an eligible authoritative War match first.');
      let streak=0;for(let d=1;d<7;d++){if(p.claims.some(c=>c.source==='daily:'+dayKey(time-d*86400000)))streak++;else break;}
      source='daily:'+date;amount=100+streak*25;
    }else{
      const achievement=payload.kind==='achievement',def=(achievement?ACHIEVEMENTS:payload.kind==='challenge'?dailyChallenges(date):[]).find(c=>c.id===payload.id);
      if(!def)fail('Unknown claim.');
      const stats=achievement?p.stats:p.daily.date===date?p.daily:{};
      if((stats[def.metric]||0)<def.goal)fail('Challenge is not complete.');
      source=achievement?'achievement:'+def.id:'challenge:'+date+':'+def.id;amount=def.cash;
    }
    if(p.claims.some(c=>c.source===source))return;
    p.cash+=amount;p.claims.unshift({source,cash:amount,xp:0});if(payload.kind==='daily')p.stats.dailyClaims=(p.stats.dailyClaims||0)+1;return;
  }
  fail('Unsupported profile action.');
}
export function participant(profile,slot,bot=false){
  const team=slot<5?'blue':'red';return {id:profile.id,name:profile.name,equipped:profile.equipped||'recruit',xp:profile.xp||0,style:profile.style||null,
    slot,team,bot,connected:true,x:(slot%5-2)*3,y:0,z:team==='blue'?27:-27,yaw:team==='blue'?0:Math.PI,hp:100,ammo:30,kills:0,deaths:0,
    shots:0,hits:0,support:0,role:profile.role||'rifleman',abilityAt:0,reloadAt:0,respawnAt:0,active:0,input:{},inputAt:0,shotAt:0,velocity:0,seq:-1,
    progress:0,finish:null,rotation:0};
}
export function createRoom(code,profile,kind,payload,time){
  if(!['war','race'].includes(kind))fail('Unknown room kind.');
  const operation=Object.hasOwn(OPERATIONS,payload.operation)?payload.operation:'elimination';
  if(kind==='war'&&payload.mode==='pvp'&&['crucible','escort'].includes(operation))fail('Squad Crucible and supply escort are co-op missions. Choose elimination, capture zone or intel for PvP.');
  const role=Object.hasOwn(ROLES,payload.role)?payload.role:'rifleman';
  return {code,kind,listed:payload.public===true,mode:kind==='war'?(payload.mode==='pvp'?'pvp':'pve'):'race',host:profile.id,
    course:Math.floor(finite(payload.course,0,99)),objective:createObjective(operation),players:[participant({...profile,role},0)],
    startsAt:null,endedAt:null,scores:{blue:0,red:0},events:[],eventId:0,lastTick:time,createdAt:time};
}
export function joinRoom(room,profile,kind,role='rifleman'){
  if(room.kind!==kind)fail('That room belongs to another game mode.');
  const old=room.players.find(p=>p.id===profile.id);if(old){old.connected=true;return;}
  if(room.startsAt!==null)fail('This match has already started.');
  const max=room.kind==='race'?6:room.mode==='pve'?5:10;if(room.players.length>=max)fail('Room is full.');
  let slot=0;
  if(room.kind==='war'&&room.mode==='pvp'){
    const blue=room.players.filter(p=>p.team==='blue').length,red=room.players.length-blue;
    slot=blue<=red?0:5;
  }
  while(room.players.some(p=>p.slot===slot))slot++;
  room.players.push(participant({...profile,role:Object.hasOwn(ROLES,role)?role:'rifleman'},slot));
}
export function startRoom(room,id,time){
  if(id!==room.host)fail('Only the host may deploy.',403);if(room.startsAt!==null)return;
  room.startsAt=time+3000;room.lastTick=time;
  if(room.kind==='race')for(const p of room.players){p.x=0;p.y=0;p.z=7;}
  if(room.kind==='war')for(let i=0;i<10;i++)if(!room.players.some(p=>p.slot===i))room.players.push(participant({id:'bot-'+i,name:'AI '+(i<5?'Alpha ':'Bravo ')+(i%5+1)},i,true));
}
const blocked=(x,z,r=.5)=>Math.abs(x)>22||Math.abs(z)>32||WAR_COVER.some(c=>Math.abs(x-c.x)<c.w/2+r&&Math.abs(z-c.z)<c.d/2+r);
function move(room,p,dx,dz,speed,dt){
  const length=Math.max(1,Math.hypot(dx,dz)),x=p.x+dx/length*speed*dt,z=p.z+dz/length*speed*dt;
  const hurdle=(x,z)=>room.objective.id==='crucible'&&!p.bot&&CRUCIBLE_HURDLES.some(h=>p.y<h.h&&Math.abs(x-h.x)<h.w/2+.35&&Math.abs(z-h.z)<h.d/2+.35);
  if(!blocked(x,p.z)&&!hurdle(x,p.z))p.x=x;if(!blocked(p.x,z)&&!hurdle(p.x,z))p.z=z;
  p.moving=Math.hypot(dx,dz)>.1;
}
// Ray vs axis-aligned box (world metres), shared for cover and player hitboxes.
export function rayBox(origin,direction,min,max){
  let near=0,far=90;
  for(const k of ['x','y','z']){
    if(Math.abs(direction[k])<1e-8){if(origin[k]<min[k]||origin[k]>max[k])return Infinity;continue;}
    let a=(min[k]-origin[k])/direction[k],b=(max[k]-origin[k])/direction[k];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return Infinity;
  }
  return near;
}
function shoot(room,p,yaw,pitch,time){
  if(p.hp<=0||p.reloadAt||time<p.shotAt)return;
  if(!p.ammo){p.reloadAt=time+1400;return;}
  p.ammo--;p.shots++;p.shotAt=time+(p.bot?650:180);
  const origin={x:p.x,y:p.y+(p.crouch?1.15:1.65),z:p.z},direction={x:-Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)};
  let distance=60,target=null;
  for(const c of WAR_COVER)distance=Math.min(distance,rayBox(origin,direction,{x:c.x-c.w/2,y:0,z:c.z-c.d/2},{x:c.x+c.w/2,y:c.h,z:c.z+c.d/2}));
  for(const q of room.players){if(q.id===p.id||q.hp<=0)continue;
    const d=rayBox(origin,direction,{x:q.x-.4,y:q.y,z:q.z-.4},{x:q.x+.4,y:q.y+(q.crouch?1.3:2),z:q.z+.4});
    if(d<distance){distance=d;target=q;}
  }
  const hit=target&&target.team!==p.team;
  room.events.push({id:++room.eventId,type:'shot',at:time,from:p.id,team:p.team,...origin,tx:origin.x+direction.x*distance,ty:origin.y+direction.y*distance,tz:origin.z+direction.z*distance,hit:!!hit});
  if(hit){p.hits++;target.hp=Math.max(0,target.hp-25);if(!target.hp){p.kills++;target.deaths++;target.respawnAt=time+3000;if(room.objective.id==='elimination')room.scores[p.team]++;
    room.events.push({id:++room.eventId,type:'kill',at:time,team:p.team,killer:p.name,victim:target.name});}}
}
// Bounded BFS routes around cover; no mesh/assets or client positions are trusted.
function botDirection(p,goal){
  if(Math.hypot(goal.x-p.x,goal.z-p.z)<1.7)return {dx:0,dz:0};
  const start=[Math.round(p.x),Math.round(p.z)],queue=[start],parents=new Map([[start.join(','),null]]);let found;
  for(let i=0;i<queue.length&&i<3200;i++){
    const a=queue[i];if(Math.hypot(a[0]-goal.x,a[1]-goal.z)<1.5){found=a;break;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[a[0]+dx,a[1]+dz],key=n.join(',');if(blocked(...n)||parents.has(key))continue;parents.set(key,a);queue.push(n);}
  }
  if(!found)return {dx:0,dz:0};
  while(parents.get(found.join(','))&&parents.get(found.join(',')).join(',')!==start.join(','))found=parents.get(found.join(','));
  return {dx:found[0]-p.x,dz:found[1]-p.z};
}
export function acceptInput(room,id,input,time){
  const p=room.players.find(q=>q.id===id&&!q.bot);if(!p)fail('Join this room first.',403);
  p.connected=true;
  if(room.kind!=='war'||room.endedAt||!room.startsAt||!Number.isSafeInteger(input.seq)||input.seq<=p.seq)return;
  p.seq=input.seq;p.inputAt=time;
  p.input={dx:finite(input.dx,-1,1),dz:finite(input.dz,-1,1),yaw:finite(input.yaw,-1000,1000),pitch:finite(input.pitch,-1.4,1.4),
    fire:input.fire===true,jump:input.jump===true,reload:input.reload===true,crouch:input.crouch===true,sprint:input.sprint===true,ability:input.ability===true};
}
export function tickRoom(room,time){
  if(room.startsAt===null||room.endedAt||time<=room.lastTick)return;
  const end=room.startsAt+(room.kind==='war'?180:60)*1000;
  if(room.kind==='race'){if(time>=end)room.endedAt=end;return;}
  // Never simulate stale held input during long disconnects or apply fresh input retroactively.
  let cursor=Math.max(room.lastTick,room.startsAt,time-500);
  while(cursor<Math.min(time,end)){
    const dt=Math.min(.1,(Math.min(time,end)-cursor)/1000);cursor+=dt*1000;
    for(const p of room.players){
      if(p.hp<=0){if(cursor<p.respawnAt)continue;p.hp=100;p.ammo=30;p.reloadAt=0;p.x=(p.slot%5-2)*3;p.z=p.team==='blue'?27:-27;p.y=0;p.velocity=0;}
      if(p.reloadAt&&cursor>=p.reloadAt){p.reloadAt=0;p.ammo=30;}
      if(p.bot){
        const enemy=room.players.filter(q=>q.team!==p.team&&q.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
        if(!enemy)continue;
        const dist=Math.hypot(enemy.x-p.x,enemy.z-p.z);p.yaw=Math.atan2(p.x-enemy.x,p.z-enemy.z);
        shoot(room,p,p.yaw,Math.atan2(enemy.y+.9-(p.y+1.65),dist),cursor);
        const objective=room.objective.id!=='elimination'&&(room.objective.id!=='crucible'||p.team==='blue'&&room.objective.stage!==2);
        const goal=objective?objectiveDestination(room.objective,p,room.players):enemy;
        if(!p.route||cursor>p.routeAt){p.route=botDirection(p,goal);p.routeAt=cursor+700;}
        move(room,p,p.route.dx,p.route.dz,3,dt);
      }else{
        const input=cursor-p.inputAt<500?p.input:{};
        p.yaw=input.yaw??p.yaw;p.crouch=!!input.crouch;
        if(input.jump&&p.y===0){p.velocity=5.5;p.input.jump=false;}
        p.velocity-=17*dt;p.y=Math.max(0,p.y+p.velocity*dt);if(p.y===0)p.velocity=0;
        move(room,p,input.dx||0,input.dz||0,(p.crouch?2.5:input.sprint?6.7:4.5)*(room.objective.id==='crucible'&&room.objective.stage===1?.72:1),dt);
        if(p.hp>0&&(Math.hypot(input.dx||0,input.dz||0)>.1||input.fire))p.active+=dt;
        if(input.reload&&!p.reloadAt&&p.ammo<30)p.reloadAt=cursor+1400;
        if(input.ability){useRole(p,room.players,cursor);p.input.ability=false;}
        if(input.fire)shoot(room,p,p.yaw,input.pitch||0,cursor);
      }
    }
    stepObjective(room.objective,room.players,room.scores,dt);
    if(room.objective.won||room.objective.id==='elimination'&&Math.max(room.scores.blue,room.scores.red)>=30){room.endedAt=cursor;break;}
  }
  room.lastTick=time;room.events=room.events.slice(-50);
  if(time>=end&&!room.endedAt)room.endedAt=end;
}
export function publicRoom(room,id,time){
  const player=room.players.find(p=>p.id===id&&!p.bot);if(!player)fail('Join this room first.',403);
  return {nextSeq:player.seq+1,code:room.code,kind:room.kind,mode:room.mode,host:room.host,me:id,course:room.course,startsAt:room.startsAt,endedAt:room.endedAt,
    elapsed:room.startsAt===null?null:(Math.min(time,room.endedAt||time)-room.startsAt)/1000,serverNow:time,objective:room.objective,scores:room.scores,events:room.events,
    players:room.players.map(p=>{const {input,inputAt,shotAt,active,route,routeAt,velocity,seq,...safe}=p;return {...safe,...(p.id!==id?{revealUntil:undefined}:{})};})};
}
export function settle(p,room,time){
  if(!room.endedAt||room.kind!=='war')return;
  const self=room.players.find(q=>q.id===p.id&&!q.bot),source='match:'+room.code;
  if(!self||self.active<20||p.claims.some(c=>c.source===source))return;
  const cooperative=['escort','crucible'].includes(room.objective.id),won=cooperative?room.objective.won:room.scores[self.team]>room.scores[self.team==='blue'?'red':'blue'];
  const cash=50+(won?50:0),xp=50+(won?50:0);p.cash+=cash;p.xp+=xp;p.claims.unshift({source,cash,xp});
  const date=dayKey(room.endedAt);if(p.daily.date!==date)p.daily={date};
  for(const stats of [p.stats,p.daily]){for(const key of ['games','warMatches'])stats[key]=(stats[key]||0)+1;stats.kills=(stats.kills||0)+self.kills;if(won){stats.wins=(stats.wins||0)+1;stats.warWins=(stats.warWins||0)+1;}}
  p.daily.eligible=true;
}
