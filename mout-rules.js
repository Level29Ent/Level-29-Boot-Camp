import {facadeSections,MOUT_WINDOW} from './mout-architecture.js';
// Local target drill only: no network opponents, cloud rewards or ranked claims.
export const MOUT_LIMIT=180;
export const MOUT_MAGAZINE=12;
export const MOUT_ROOMS=[
  {id:'A1',side:-1,z:-4,y:0},{id:'B1',side:1,z:-4,y:0},
  {id:'A2',side:-1,z:-12,y:0},{id:'B2',side:1,z:-12,y:0},
  {id:'A3',side:-1,z:-26,y:3},{id:'B3',side:1,z:-26,y:3}
];
export function wallsFor(room){
  const x=room.side*4.25,y=room.y+1.4;
  return [
    {x:room.side*7,z:room.z,y,w:.16,h:2.8,d:8},
    ...[-1,1].flatMap(side=>facadeSections(5.5,2.8,[MOUT_WINDOW]).map(p=>({x:x+p.u,z:room.z+side*4,y:room.y+p.y,w:p.w,h:p.h,d:.16}))),
    ...[-1,1].map(side=>({x:room.side*1.5,z:room.z+side*2.5,y,w:.16,h:2.8,d:3})),
    {x:room.side*1.5,z:room.z,y:room.y+2.65,w:.16,h:.3,d:2}
  ];
}
export const MOUT_WALLS=MOUT_ROOMS.flatMap(wallsFor);
export function floorAt(x,z){
  if(Math.abs(x)<=1.4&&z>=-22&&z<=8)return z<=-16?(-16-z)/2:0;
  if(Math.abs(x)<=7&&z>=-30&&z<=-22)return 3;
  if(Math.abs(x)>=1.4&&Math.abs(x)<=7&&z>=-16&&z<=0)return 0;
  return null;
}
export function canMove(x,z,currentY,opened){
  const floor=floorAt(x,z);
  if(floor===null||Math.abs(floor-currentY)>.45)return false;
  const radius=.24;
  if(MOUT_WALLS.some(w=>Math.abs(x-w.x)<w.w/2+radius&&Math.abs(z-w.z)<w.d/2+radius&&floor+.2<w.y+w.h/2&&floor+1.7>w.y-w.h/2))return false;
  return !MOUT_ROOMS.some(r=>!opened.has(r.id)&&Math.abs(floor-r.y)<.4&&Math.abs(x-r.side*1.5)<.15+radius&&Math.abs(z-r.z)<1+radius);
}
export function createDrill(){
  return {elapsed:0,shots:0,hits:0,penalties:0,ammo:MOUT_MAGAZINE,reload:0,
    opened:new Set(),entered:new Set(),hitsByRoom:new Map(),ended:false,success:false};
}
export const accuracyFor=state=>state.shots?Math.round(state.hits/state.shots*100):0;
export const clearedRooms=state=>MOUT_ROOMS.filter(r=>state.entered.has(r.id)&&(state.hitsByRoom.get(r.id)||0)>=2);
export function tickDrill(state,dt){
  if(state.ended)return;
  state.elapsed=Math.min(MOUT_LIMIT,state.elapsed+dt);
  if(state.reload>0){state.reload=Math.max(0,state.reload-dt);if(state.reload===0)state.ammo=MOUT_MAGAZINE;}
  if(state.elapsed>=MOUT_LIMIT){state.ended=true;state.success=false;}
}
export function recordShot(state,roomId=null,friendly=false){
  if(state.ended||state.reload>0||state.ammo<=0)return false;
  state.ammo--;state.shots++;
  if(friendly)state.penalties++;
  else if(roomId){state.hits++;state.hitsByRoom.set(roomId,(state.hitsByRoom.get(roomId)||0)+1);}
  return true;
}
export function extractDrill(state,x,y,z){
  if(state.ended||clearedRooms(state).length!==MOUT_ROOMS.length||Math.abs(x)>.95||Math.abs(y-3)>.3||z> -28.3)return false;
  state.ended=true;state.success=true;return true;
}
export function drillScore(state){return Math.max(0,state.hits*100+accuracyFor(state)*10+Math.floor(MOUT_LIMIT-state.elapsed)*5-state.penalties*250);}
