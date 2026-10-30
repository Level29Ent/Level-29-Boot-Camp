import * as THREE from 'three';
import {WAR_COVER,WAR_DURATION,WAR_TARGET} from './rules.js';

const blocked=(x,z)=>Math.abs(x)>22||Math.abs(z)>32||WAR_COVER.some(c=>Math.abs(x-c.x)<c.w/2+.5&&Math.abs(z-c.z)<c.d/2+.5);
const boxes=WAR_COVER.map(c=>new THREE.Box3(new THREE.Vector3(c.x-c.w/2,0,c.z-c.d/2),new THREE.Vector3(c.x+c.w/2,c.h,c.z+c.d/2)));
// Offline simulation is deliberately separate from cloud state and rewards.
// A bounded one-metre grid gives bots routes around cover rather than through it.
function pathTo(a,b){
  const key=(x,z)=>x+','+z,start=[Math.round(a.x),Math.round(a.z)],goal=[Math.round(b.x),Math.round(b.z)];
  const queue=[start],parents=new Map([[key(...start),null]]);let found=null;
  for(let i=0;i<queue.length&&i<3000;i++){
    const [x,z]=queue[i];if(Math.hypot(x-goal[0],z-goal[1])<1.5){found=[x,z];break;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz,k=key(nx,nz);if(blocked(nx,nz)||parents.has(k))continue;
      parents.set(k,[x,z]);queue.push([nx,nz]);
    }
  }
  if(!found)return [];
  const route=[];let step=found;
  while(step){route.push({x:step[0],z:step[1]});step=parents.get(key(...step));}
  route.reverse();return route.slice(1);
}
export function createWarPractice(name,{now=()=>Date.now(),random=Math.random,equipped='recruit',xp}={}){
  let last=now(),eventId=0,ended=false,botClock=0;
  const state={code:'LOCAL',kind:'war',mode:'practice',me:'local-you',host:'local-you',startsAt:now()+3000,endedAt:null,
    serverNow:now(),scores:{blue:0,red:0},events:[],players:[]};
  const extra=new Map();
  function spawn(p){p.x=(p.slot%5-2)*3;p.y=0;p.z=p.team==='blue'?27:-27;p.yaw=p.team==='blue'?0:Math.PI;p.hp=100;p.ammo=30;p.reloadAt=0;p.respawnAt=0;p.crouch=false;p.moving=false;extra.set(p.id,{cooldown:0,route:[],velocity:0});}
  for(let i=0;i<10;i++){
    const p={id:i?'practice-bot-'+i:'local-you',name:i?'AI '+(i<5?'Alpha '+i:'Bravo '+(i-4)):name,
      slot:i,team:i<5?'blue':'red',bot:i!==0,connected:true,kills:0,deaths:0,equipped:i?'recruit':equipped,...(!i&&Number.isFinite(xp)?{xp}:{} )};
    spawn(p);state.players.push(p);
  }
  const self=()=>state.players[0];
  function advance(p,dx,dz,speed,dt){
    const mag=Math.max(1,Math.hypot(dx,dz)),x=p.x+dx/mag*speed*dt,z=p.z+dz/mag*speed*dt;
    if(!blocked(x,p.z))p.x=x;if(!blocked(p.x,z))p.z=z;p.moving=Math.hypot(dx,dz)>.1;
  }
  function targetFor(ray,shooter){
    let distance=90,result=null;const point=new THREE.Vector3();
    for(const box of boxes){const hit=ray.intersectBox(box,point);if(hit)distance=Math.min(distance,ray.origin.distanceTo(hit));}
    for(const p of state.players){
      if(p.hp<=0||p.id===shooter.id)continue;
      const box=new THREE.Box3(new THREE.Vector3(p.x-.4,p.y,p.z-.4),new THREE.Vector3(p.x+.4,p.y+(p.crouch?1.3:2),p.z+.4));
      const hit=ray.intersectBox(box,point);if(hit&&ray.origin.distanceTo(hit)<distance){distance=ray.origin.distanceTo(hit);result=p;}
    }
    return {target:result,distance};
  }
  function fire(p,yaw,pitch,time){
    const info=extra.get(p.id);if(p.hp<=0||p.reloadAt||info.cooldown>0)return;
    if(!p.ammo){p.reloadAt=time+1400;return;}
    p.ammo--;info.cooldown=p.bot ? .52 : .18;
    const origin=new THREE.Vector3(p.x,p.y+(p.crouch?1.15:1.65),p.z),direction=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
    const hit=targetFor(new THREE.Ray(origin,direction),p),end=origin.clone().addScaledVector(direction,Math.min(hit.distance,60));
    const enemy=hit.target&&hit.target.team!==p.team?hit.target:null;
    state.events.push({id:++eventId,type:'shot',at:time,from:p.id,team:p.team,x:origin.x,y:origin.y,z:origin.z,tx:end.x,ty:end.y,tz:end.z,hit:!!enemy});
    if(enemy){
      enemy.hp=Math.max(0,enemy.hp-25);
      if(!enemy.hp){p.kills++;enemy.deaths++;enemy.respawnAt=time+3000;enemy.moving=false;state.scores[p.team]++;
        state.events.push({id:++eventId,type:'kill',at:time,team:p.team,killer:p.name,victim:enemy.name});}
    }
  }
  function step(input,dt,time){
    if(ended||time<state.startsAt)return;
    for(const p of state.players){
      const info=extra.get(p.id);info.cooldown=Math.max(0,info.cooldown-dt);
      if(p.hp<=0){if(time>=p.respawnAt)spawn(p);else continue;}
      if(p.reloadAt&&time>=p.reloadAt){p.reloadAt=0;p.ammo=30;}
      if(!p.bot){
        p.yaw=Number.isFinite(input.yaw)?input.yaw:p.yaw;p.crouch=!!input.crouch;
        advance(p,input.dx||0,input.dz||0,p.crouch?2.5:input.sprint?6.7:4.5,dt);
        if(input.jump&&p.y===0)info.velocity=5.5;
        info.velocity-=17*dt;p.y=Math.max(0,p.y+info.velocity*dt);if(p.y===0)info.velocity=0;
        if(input.reload&&!p.reloadAt&&p.ammo<30)p.reloadAt=time+1400;
        if(input.fire)fire(p,p.yaw,input.pitch||0,time);
      }else{
        const enemies=state.players.filter(q=>q.team!==p.team&&q.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
        const enemy=enemies[0];if(!enemy)continue;
        const dx=enemy.x-p.x,dz=enemy.z-p.z,dist=Math.hypot(dx,dz);p.yaw=Math.atan2(-dx,-dz);
        const origin=new THREE.Vector3(p.x,1.65,p.z),direction=new THREE.Vector3(dx,-.3,dz).normalize(),sight=targetFor(new THREE.Ray(origin,direction),p);
        if(sight.target?.team!==p.team&&sight.target){
          p.moving=false;
          const spread=(random()-.5)*.08;
          fire(p,p.yaw+spread,Math.atan2(-.3,dist)+spread*.25,time);
        }else{
          if(!info.route.length||botClock<=0)info.route=pathTo(p,enemy);
          const waypoint=info.route[0];if(waypoint){const x=waypoint.x-p.x,z=waypoint.z-p.z;if(Math.hypot(x,z)<.25)info.route.shift();else advance(p,x,z,3,dt);}
        }
      }
    }
    botClock-=dt;if(botClock< -dt)botClock=1;
    if(time-state.startsAt>=WAR_DURATION*1000||state.scores.blue>=WAR_TARGET||state.scores.red>=WAR_TARGET){state.endedAt=time;ended=true;}
    state.events=state.events.slice(-50);
  }
  return {
    state,
    update(input={}){
      const time=now(),elapsed=Math.min(.5,Math.max(0,(time-last)/1000));
      const steps=Math.max(1,Math.ceil(elapsed/.025));for(let i=0;i<steps;i++)step({...input,jump:input.jump&&i===0},elapsed/steps,last+(i+1)*(time-last)/steps);
      last=time;state.serverNow=time;if(time-state.startsAt>=WAR_DURATION*1000&&!ended){state.endedAt=time;ended=true;}
      return state;
    },
    self
  };
}
