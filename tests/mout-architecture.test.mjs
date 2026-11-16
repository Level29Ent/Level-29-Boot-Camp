import test from 'node:test';
import assert from 'node:assert/strict';
import {facadeSections,MOUT_WINDOW,VILLAGE_BUILDINGS,MOUT_SURVEY_VIEWS} from '../mout-architecture.js';
import {MOUT_ROOMS,wallsFor,canMove,floorAt} from '../mout-rules.js';
const covers=(p,u,y)=>Math.abs(p.u-u)<p.w/2-1e-8&&Math.abs(p.y-y)<p.h/2-1e-8;
test('cut-out facade retains exact wall area without filling its window opening',()=>{
 const pieces=facadeSections(5.5,2.8,[MOUT_WINDOW]);
 const area=pieces.reduce((sum,p)=>sum+p.w*p.h,0);assert.ok(Math.abs(area-(5.5*2.8-MOUT_WINDOW.w*MOUT_WINDOW.h))<1e-8);
 assert.equal(pieces.some(p=>covers(p,0,1.6)),false);assert.equal(pieces.some(p=>covers(p,0,.55)),true);assert.equal(pieces.some(p=>covers(p,0,2.5)),true);
 for(const piece of pieces){assert.ok(piece.w>0&&piece.h>0);assert.ok(Math.abs(piece.u)+piece.w/2<=2.75+1e-8);}
});
test('door and multiple window apertures leave no overlaps or missing solid facade patches',()=>{
 const openings=[{u:-2,y:0,w:1,h:2.25},{u:1.8,y:1.1,w:1.1,h:1.15}],pieces=facadeSections(8,2.92,openings);
 for(let u=-3.937;u<4;u+=.137)for(let y=.031;y<2.92;y+=.113){
  const open=openings.some(o=>u>o.u-o.w/2&&u<o.u+o.w/2&&y>o.y&&y<o.y+o.h);
  const count=pieces.filter(p=>covers(p,u,y)).length;assert.equal(count,open?0:1);
 }
});
test('playable windows match wall boxes but sills still block walking between rooms',()=>{
 for(const room of MOUT_ROOMS){
  const x=room.side*4.25,z=room.z+4,y=room.y+1.6,sections=wallsFor(room).filter(w=>Math.abs(w.z-z)<.001);
  assert.equal(sections.some(w=>Math.abs(x-w.x)<w.w/2&&Math.abs(y-w.y)<w.h/2),false);
  assert.equal(canMove(x,z,room.y,new Set(MOUT_ROOMS.map(r=>r.id))),false);
  assert.equal(canMove(room.side*1.5,room.z,room.y,new Set()),false);
 }
});
test('reference village buildings and exterior stairs remain outside all drill walk areas',()=>{
 assert.ok(VILLAGE_BUILDINGS.length>=10);assert.ok(VILLAGE_BUILDINGS.some(b=>b.floors===3));assert.ok(VILLAGE_BUILDINGS.some(b=>b.stairs));
 for(const b of VILLAGE_BUILDINGS){
  for(let x=b.x-b.w/2-2.5;x<=b.x+b.w/2+2.5;x+=.5)for(let z=b.z-b.d/2-1;z<=b.z+b.d/2+1;z+=.5)assert.equal(floorAt(x,z),null);
 }
});
test('three survey viewpoints have finite elevated cameras and describe non-playable scenery',()=>{
 assert.equal(Object.keys(MOUT_SURVEY_VIEWS).length,3);
 for(const view of Object.values(MOUT_SURVEY_VIEWS)){assert.equal(view.position.length,3);assert.ok(view.position.every(Number.isFinite));assert.ok(view.target.every(Number.isFinite));assert.ok(view.position[1]>=10);}
 assert.match(MOUT_SURVEY_VIEWS.village.label,/scenery/);
});
