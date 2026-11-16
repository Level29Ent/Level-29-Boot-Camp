import {WAR_COVER} from './rules.js';
import {objectiveDestination,activeParticipant} from './operations.js';
export const SQUAD_ORDERS=['follow','hold','push'];
export const validOrder=order=>SQUAD_ORDERS.includes(order);
export function clearSight(a,b){
  const distance=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(distance*3);
  for(let i=1;i<steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
    if(WAR_COVER.some(c=>c.h>1.1&&Math.abs(x-c.x)<c.w/2&&Math.abs(z-c.z)<c.d/2))return false;}
  return true;
}
const open=p=>Math.abs(p.x)<21&&Math.abs(p.z)<31&&!WAR_COVER.some(c=>Math.abs(p.x-c.x)<c.w/2+.65&&Math.abs(p.z-c.z)<c.d/2+.65);
export function setSquadOrder(room,leader,order,time){
  if(!validOrder(order)||leader.bot||!activeParticipant(leader)||room.endedAt)return false;
  const captain=room.players.filter(p=>p.team===leader.team&&!p.bot&&p.connected!==false).sort((a,b)=>a.slot-b.slot)[0];
  if(captain?.id!==leader.id)return false;
  room.orders??={};room.orders[leader.team]={kind:order,leader:leader.id,x:leader.x,z:leader.z,at:time};return true;
}
export function botPlan(room,p,time){
  const enemies=room.players.filter(q=>q.team!==p.team&&activeParticipant(q)),visible=enemies.filter(q=>Math.hypot(q.x-p.x,q.z-p.z)<38&&clearSight(p,q)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
  const enemy=visible[0];
  if(enemy){p.memory={x:enemy.x,z:enemy.z,until:time+3000};}
  else{
    const heard=(room.events||[]).filter(e=>e.type==='shot'&&e.team!==p.team&&time-e.at<1600&&Math.hypot(e.x-p.x,e.z-p.z)<20).at(-1);
    if(heard)p.memory={x:heard.x,z:heard.z,until:time+2200};
  }
  // Reload and low-health retreats win over commands; choose cover away from threat.
  if(p.reloadAt||p.ammo<=3||p.hp<=25){
    const threat=enemy||p.memory||{x:0,z:0};
    const candidates=WAR_COVER.flatMap(c=>[{x:c.x-c.w/2-1.3,z:c.z},{x:c.x+c.w/2+1.3,z:c.z},{x:c.x,z:c.z-c.d/2-1.3},{x:c.x,z:c.z+c.d/2+1.3}]).filter(open);
    candidates.sort((a,b)=>(clearSight(a,threat)?30:0)+Math.hypot(a.x-p.x,a.z-p.z)-(clearSight(b,threat)?30:0)-Math.hypot(b.x-p.x,b.z-p.z));
    return {goal:candidates[0]||{x:p.x,z:p.team==='blue'?27:-27},enemy,fire:false,reload:p.ammo<30,behavior:'Taking cover'};
  }
  const order=room.orders?.[p.team],leader=room.players.find(q=>q.id===order?.leader&&q.hp>0&&q.connected!==false);
  if(order&&leader&&order.kind!=='push'){
    const base=order.kind==='follow'?leader:order,offset=(p.slot%5-2)*1.2;
    const goal={x:Math.max(-20,Math.min(20,base.x+offset)),z:Math.max(-30,Math.min(30,base.z+1.5))};
    return {goal:open(goal)?goal:base,enemy,fire:!!enemy,reload:false,behavior:order.kind==='follow'?'Following leader':'Holding position'};
  }
  const objective=room.objective.id!=='elimination'&&(room.objective.id!=='crucible'||p.team==='blue'&&room.objective.stage!==2);
  if(objective)return {goal:objectiveDestination(room.objective,p,room.players),enemy,fire:!!enemy,behavior:'Pushing objective'};
  if(enemy){
    const flank={x:(p.slot%2?1:-1)*10,z:Math.max(-29,Math.min(29,enemy.z+(p.team==='blue'?5:-5)))};
    return {goal:Math.hypot(enemy.x-p.x,enemy.z-p.z)>10&&open(flank)?flank:p,enemy,fire:true,behavior:'Flanking / engaging'};
  }
  return {goal:p.memory?.until>time?p.memory:{x:p.slot%2?10:-10,z:p.team==='blue'?-12:12},enemy:null,fire:false,behavior:p.memory?.until>time?'Investigating shots':'Patrolling'};
}
export function objectiveActivity(room,dt){
  if(room.objective.id==='elimination')return;
  for(const p of room.players)if(activeParticipant(p)&&Math.hypot(p.x-room.objective.x,p.z-room.objective.z)<5)p.objectiveSeconds=(p.objectiveSeconds||0)+dt;
}
