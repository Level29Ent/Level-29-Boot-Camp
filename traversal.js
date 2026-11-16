export function beginMantle(p,obstacle){
  return {x:p.x,y:p.y,z:p.z,top:obstacle.h+.12,endZ:obstacle.z-1.05,elapsed:0,duration:Math.max(.55,(obstacle.h-p.y)/3.8)+.4};
}
export function stepMantle(m,dt){
  m.elapsed=Math.min(m.duration,m.elapsed+Math.max(0,dt));const t=m.elapsed/m.duration;
  const ease=x=>x*x*(3-2*x),rise=ease(Math.min(1,t/.72)),over=ease(Math.max(0,(t-.65)/.35));
  return {x:m.x,y:m.y+(m.top-m.y)*rise,z:m.z+(m.endZ-m.z)*over,done:t>=1};
}
