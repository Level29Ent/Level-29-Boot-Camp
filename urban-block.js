import {facadeSections} from './mout-architecture.js';
export const URBAN_ROOMS=[
  {id:'U1',x:-3,z:-6,y:0,door:{x:-3,z:0,w:1.6},targets:[{x:-4.8,z:-9},{x:-1.4,z:-9}]},
  {id:'U2',x:3,z:-6,y:0,door:{x:3,z:0,w:1.6},targets:[{x:1.4,z:-9},{x:4.8,z:-9}]},
  {id:'ROOF',x:0,z:-6,y:3,targets:[{x:-3,z:-10},{x:3,z:-10}]}
];
const wall=(x,y,z,w,h,d)=>({x,y,z,w,h,d});
export const URBAN_WALLS=[
  ...facadeSections(12,2.8,[{u:-3,y:0,w:1.6,h:2.4},{u:3,y:0,w:1.6,h:2.4},{u:0,y:1.2,w:1.1,h:1}]).map(p=>wall(p.u,p.y,0,p.w,p.h,.2)),
  wall(0,1.4,-12,12,2.8,.2),wall(-6,1.4,-6,.2,2.8,12),wall(6,1.4,-6,.2,2.8,12),
  // Interior communicating doorway at z=-4; never a solid wall behind the opening.
  wall(0,1.4,-8.5,.18,2.8,7),wall(0,1.4,-1.5,.18,2.8,3),wall(0,2.65,-4,.18,.3,2),
  wall(0,2.92,-6,12,.16,12),
  wall(-6,3.5,-6,.18,1,12),wall(0,3.5,-12,12,1,.18),wall(0,3.5,0,12,1,.18),
  wall(6,3.5,-2.8,.18,1,5.6),wall(6,3.5,-9.8,.18,1,4.4),
  wall(-7,.35,4.2,.18,.7,7.5),wall(9,.35,4.2,.18,.7,7.5),
  ...[-4,0,4].map(x=>wall(x,.25,7.6,1.2,.5,.6))
];
export function urbanFloorAt(x,z,currentY=0){
  if(x>=7&&x<=9&&z<=0&&z>=-6)return Math.min(3,Math.floor((-z+1e-6)/.3)*.15);
  if(x>=5.5&&x<=9&&z>=-7.7&&z<=-6)return 3;
  if(x>=-5.9&&x<=5.9&&z>=-11.9&&z<=-.1&&currentY>2.6)return 3;
  if(x>=-7&&x<=9&&z>=0&&z<=8)return 0;
  if(x>=-5.9&&x<=5.9&&z>=-11.9&&z<=.1&&currentY<.5)return 0;
  return null;
}
export function urbanCanMove(x,z,currentY,opened){
  const y=urbanFloorAt(x,z,currentY);if(y===null||Math.abs(y-currentY)>.22)return false;
  const r=.23;
  if(URBAN_WALLS.some(w=>Math.abs(x-w.x)<w.w/2+r&&Math.abs(z-w.z)<w.d/2+r&&y+.2<w.y+w.h/2&&y+1.7>w.y-w.h/2))return false;
  return !URBAN_ROOMS.some(room=>room.door&&!opened.has(room.id)&&y<.3&&Math.abs(z-room.door.z)<.16+r&&Math.abs(x-room.door.x)<room.door.w/2+r);
}
export function urbanEntered(room,p){return Math.abs(p.y-room.y)<.2&&Math.abs(p.z+6)<5.4&&(room.id==='U1'?p.x<-.5:room.id==='U2'?p.x>.5:Math.abs(p.x)<5.5);}
export function urbanExtract(state,p){
  if(state.ended||!state.entered.has('COURTYARD')||URBAN_ROOMS.some(r=>!state.entered.has(r.id)||(state.hitsByRoom.get(r.id)||0)<2)||Math.abs(p.y-3)>.2||Math.hypot(p.x,p.z+2)>1)return false;
  state.ended=true;state.success=true;return true;
}
// Swept axis-separated movement: small steps prevent thin-wall tunneling on
// touch, keyboard, controller and slow frames, while allowing wall sliding.
export function sweepMove(p,dx,dz,canMove,floorAt,opened){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
  for(let i=0;i<steps;i++){
    if(canMove(p.x+dx/steps,p.z,p.y,opened))p.x+=dx/steps;
    p.y=floorAt(p.x,p.z,p.y)??p.y;
    if(canMove(p.x,p.z+dz/steps,p.y,opened))p.z+=dz/steps;
    p.y=floorAt(p.x,p.z,p.y)??p.y;
  }
  return p;
}
export const URBAN_VIEW={position:[23,18,25],target:[0,1,-4],label:'Playable urban block · two connected ground-floor rooms, courtyard, exterior stairs and accessible rooftop. Other village buildings remain scenery.'};
