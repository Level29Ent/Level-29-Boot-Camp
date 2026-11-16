export function damageBearing(own,events,time,yaw){
  const shot=events.filter(e=>e.type==='shot'&&e.team!==own.team&&e.hit&&time-e.at>=0&&time-e.at<1000&&Math.hypot(e.tx-own.x,e.tz-own.z)<1.4).at(-1);
  if(!shot)return null;
  const angle=Math.atan2(-(shot.x-own.x),-(shot.z-own.z))-yaw,relative=Math.atan2(Math.sin(angle),Math.cos(angle));
  return {arrow:Math.abs(relative)<.65?'↑':Math.abs(relative)>2.5?'↓':relative>0?'←':'→',label:Math.abs(relative)<.65?'FRONT':Math.abs(relative)>2.5?'BEHIND':relative>0?'LEFT':'RIGHT'};
}
export function allyStatus(p,time){return p.hp<=0?'Regrouping':p.reloadAt>time?'Reloading':p.behavior|| (p.moving?'Moving':'Ready');}
export const reloadPose=(remaining,total=1400)=>{const t=Math.max(0,Math.min(1,1-remaining/total));return remaining>0?Math.sin(t*Math.PI):0;};
