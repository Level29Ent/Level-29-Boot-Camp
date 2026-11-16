import test from 'node:test';
import assert from 'node:assert/strict';
import {URBAN_ROOMS,urbanFloorAt,urbanCanMove,urbanExtract,sweepMove} from '../urban-block.js';
import {moutNavigation} from '../mout-navigation.js';
import {beginMantle,stepMantle} from '../traversal.js';
import {damageBearing,reloadPose,allyStatus} from '../combat-feedback.js';
import {createDrill} from '../mout-rules.js';
import {saveUrbanRecord} from '../urban-records.js';
test('urban courtyard, connected ground rooms, real stairs and roof are reachable without teleporting',()=>{
 const opened=new Set(['U1','U2']),queue=[{x:0,z:5,y:0}],visited=new Set();
 for(let i=0;i<queue.length;i++){
  const p=queue[i],key=[Math.round(p.x*4),Math.round(p.z*4),Math.round(p.y*20)].join(',');if(visited.has(key))continue;visited.add(key);
  for(const [dx,dz] of [[.25,0],[-.25,0],[0,.25],[0,-.25]]){const x=p.x+dx,z=p.z+dz;if(urbanCanMove(x,z,p.y,opened))queue.push({x,z,y:urbanFloorAt(x,z,p.y)});}
 }
 const near=(x,y,z)=>queue.some(p=>Math.hypot(p.x-x,p.z-z)<.5&&Math.abs(p.y-y)<.2);
 assert.ok(near(-3,0,-7));assert.ok(near(3,0,-7));assert.ok(near(8,1.5,-3));assert.ok(near(3,3,-7));assert.ok(near(0,3,-2));
 assert.ok(visited.size<30000);
});
test('swept movement cannot tunnel through a closed door or interior wall even at large dt',()=>{
 const p={x:-3,y:0,z:1};sweepMove(p,0,-6,urbanCanMove,urbanFloorAt,new Set());assert.ok(p.z>0);
 const q={x:-2,y:0,z:-8};sweepMove(q,4,0,urbanCanMove,urbanFloorAt,new Set(['U1','U2']));assert.ok(q.x<0);
 const r={x:-2,y:0,z:-4};sweepMove(r,4,0,urbanCanMove,urbanFloorAt,new Set(['U1','U2']));assert.ok(r.x>1);
 assert.equal(urbanCanMove(0,7.5,0,new Set()),false);assert.equal(urbanCanMove(5.4,-10,0,new Set()),true);assert.equal(urbanCanMove(6,-10,0,new Set()),false);
});
test('roof extraction needs courtyard visit, all three cleared zones and correct floor',()=>{
 const state=createDrill();for(const r of URBAN_ROOMS){state.entered.add(r.id);state.hitsByRoom.set(r.id,2);}
 assert.equal(urbanExtract(state,{x:0,y:3,z:-2}),false);state.entered.add('COURTYARD');
 assert.equal(urbanExtract(state,{x:0,y:0,z:-2}),false);assert.equal(urbanExtract(state,{x:0,y:3,z:-2}),true);
});
test('navigation routes upward via stairs and identifies roof extraction rather than pointing through walls',()=>{
 const state=createDrill(),rooms=URBAN_ROOMS,position={x:0,y:0,z:2};
 const nav=moutNavigation({course:'urban',position,lookYaw:0,rooms,state,cleared:rooms.slice(0,2)});assert.match(nav.text,/STAIRS/);assert.equal(nav.target.x,8);
 const extract=moutNavigation({course:'urban',position:{x:0,y:3,z:-6},lookYaw:0,rooms,state,cleared:rooms});assert.match(extract.text,/EXTRACT/);assert.equal(extract.target.z,-2);
});
test('mantle rises before crossing wall, progresses continuously and completes deterministically',()=>{
 const m=beginMantle({x:0,y:0,z:-36.2},{h:3,z:-37});let old={y:0,z:-36.2};
 for(let i=0;i<100&&!old.done;i++){const next=stepMantle(m,.025);assert.ok(Math.abs(next.z-old.z)<.2);if(next.z< -37)assert.ok(next.y>2.8);old=next;}
 assert.equal(old.done,true);assert.equal(old.z,-38.05);assert.ok(old.y>3);
});
test('damage direction uses only recent enemy hit events terminating near the player',()=>{
 const p={x:0,z:0,team:'blue'},shot={type:'shot',at:100,hit:true,team:'red',x:-5,z:0,tx:0,tz:0};
 assert.equal(damageBearing(p,[shot],200,0).label,'LEFT');assert.equal(damageBearing(p,[{...shot,tx:20}],200,0),null);assert.equal(damageBearing(p,[shot],2000,0),null);
 assert.equal(allyStatus({hp:100,reloadAt:500,behavior:'Following leader'},200),'Reloading');assert.equal(reloadPose(700),1);assert.equal(reloadPose(0),0);
});
test('urban records are separate, never save failed attempts or claim success on denied storage',()=>{
 const values=new Map(),store={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 assert.equal(saveUrbanRecord({success:false},100,store).eligible,false);assert.equal(values.size,0);
 assert.equal(saveUrbanRecord({success:true,elapsed:200},100,store).best,true);assert.equal(values.has('b29-field-records-v1'),false);
 assert.equal(saveUrbanRecord({success:true,elapsed:210},99,store).best,false);assert.equal(saveUrbanRecord({success:true,elapsed:180},200,{setItem(){throw Error()},getItem(){throw Error()}}).saved,false);
});

test('upper-route navigation points toward the top of a stair/ramp while already ascending',()=>{
 const state=createDrill();const nav=moutNavigation({course:'urban',position:{x:8,y:1.5,z:-3},lookYaw:0,rooms:URBAN_ROOMS,state,cleared:URBAN_ROOMS.slice(0,2)});
 assert.equal(nav.target.z,-6.7);assert.equal(nav.target.y,3);
});
