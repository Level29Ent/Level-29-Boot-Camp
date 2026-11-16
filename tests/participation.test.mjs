import test from 'node:test';
import assert from 'node:assert/strict';
import {createObjective,stepObjective,useRole} from '../operations.js';
import {botPlan,objectiveActivity,setSquadOrder} from '../squad-tactics.js';
import {createRoom,startRoom,tickRoom,joinRoom} from '../supabase/functions/bootcamp-command/domain.js';
const player=(id,team='blue',extra={})=>({id,name:id,team,slot:0,bot:false,connected:true,x:10,z:0,y:0,hp:100,ammo:30,kills:0,...extra});
test('departed players cannot capture, contest, escort or earn objective presence',()=>{
 for(const id of ['zones','escort']){
  const o=createObjective(id),a=player('active','blue',{x:o.x,z:o.z}),b=player('gone','red',{x:o.x,z:o.z,connected:false}),scores={blue:0,red:0};
  stepObjective(o,[a,b],scores,1);assert.ok(scores.blue>0,id+' cannot be blocked by offline body');
  const room={objective:o,players:[b]};objectiveActivity(room,1);assert.equal(b.objectiveSeconds,undefined);
 }
});
test('intel carrier who leaves drops at last position and cannot score from base',()=>{
 const o=createObjective('intel'),p=player('you'),scores={blue:0,red:0};stepObjective(o,[p],scores,.1);assert.equal(o.carrier,p.id);
 p.connected=false;p.x=0;p.z=27;stepObjective(o,[p],scores,.1);assert.equal(o.carrier,null);assert.equal(scores.blue,0);
});
test('role utilities neither consume dead/disconnected users nor heal/resupply offline allies',()=>{
 const medic=player('medic','blue',{role:'medic'}),offline=player('offline','blue',{connected:false,hp:10});
 assert.equal(useRole(medic,[medic,offline],1000),false);assert.equal(offline.hp,10);
 medic.connected=false;medic.hp=20;assert.equal(useRole(medic,[medic],1000),false);
});
test('AI does not chase departed players and disconnected humans cannot issue orders',()=>{
 const gone=player('gone','red',{x:10,z:5,connected:false}),bot=player('bot','blue',{bot:true}),room={players:[bot,gone],objective:createObjective(),events:[]};
 assert.equal(botPlan(room,bot,1000).enemy,null);
 const captain=player('captain','blue',{connected:false});room.players.push(captain);assert.equal(setSquadOrder(room,captain,'hold',1000),false);
});
test('idle clients become disconnected and intel drops before a late respawn can carry it home',()=>{
 const room=createRoom('ABCDEF',{id:'you',name:'You'},'war',{operation:'intel'},0);startRoom(room,'you',0);
 const self=room.players[0];Object.assign(self,{x:10,z:0,hp:0,respawnAt:4000});room.objective.carrier=self.id;room.objective.x=10;room.objective.z=0;
 tickRoom(room,4500);assert.equal(room.objective.carrier,null);assert.equal(room.scores.blue,0);assert.equal(room.objective.x,10);
 tickRoom(room,10000);assert.equal(self.connected,false);
});
test('idle lobby host does not permanently block a connected co-op guest from starting',()=>{
 const room=createRoom('ABCDEF',{id:'host',name:'Host'},'war',{},0);joinRoom(room,{id:'guest',name:'Guest'},'war');
 room.players[0].connected=false;
 assert.doesNotThrow(()=>startRoom(room,'guest',1000));assert.equal(room.host,'guest');
});
test('stale lobby slots can be replaced, but a connected host cannot be usurped',()=>{
 const room=createRoom('ABCDEF',{id:'host',name:'Host'},'war',{},0);
 for(let i=0;i<4;i++)joinRoom(room,{id:'old-'+i,name:'Old'},'war');
 room.players.find(p=>p.id==='old-0').connected=false;assert.doesNotThrow(()=>joinRoom(room,{id:'new',name:'New'},'war'));
 assert.equal(room.players.length,5);assert.ok(!room.players.some(p=>p.id==='old-0'));assert.throws(()=>startRoom(room,'new',1000),e=>e.status===403);
});
test('Crucible timed hold resets when its entire human rally squad disconnects',()=>{
 const objective=createObjective('crucible');Object.assign(objective,{stage:3,hold:4,x:0,z:-26});
 stepObjective(objective,[player('gone','blue',{x:0,z:-26,connected:false})],{blue:0,red:0},1);assert.equal(objective.hold,0);assert.equal(objective.won,false);
});
test('PvP cannot start with a disconnected opposing player',()=>{
 const room=createRoom('ABCDEF',{id:'host',name:'Host'},'war',{mode:'pvp'},0);joinRoom(room,{id:'red',name:'Red'},'war');room.players[1].connected=false;
 assert.throws(()=>startRoom(room,'host',1000),/connected opposing/);
});
test('authenticated polling expires a silent host, migrates lobby ownership, reconnects and drops carried intel on leave',async()=>{
 const {createService}=await import('../supabase/functions/bootcamp-command/service.js');let time=10000;const tables=new Map();
 const db={async rate(){},async request(){return [];},async get(t,k,v){return structuredClone((tables.get(t)||[]).find(r=>r[k]===v));},async insert(t,row){if(!tables.has(t))tables.set(t,[]);tables.get(t).push(structuredClone(row));return row;},async change(t,k,v,fn){const row=tables.get(t).find(r=>r[k]===v);return fn(row.data,row);}};
 const service=createService(db,{now:()=>time}),host=await service('register',{name:'Host'}),guest=await service('register',{name:'Guest'});
 const lobby=await service('war_create',{mode:'pve',operation:'intel'},host.token);await service('room_join',{code:lobby.code,expectedKind:'war'},guest.token);
 time+=3000;await service('room_state',{code:lobby.code},guest.token);time+=3000;
 const migrated=await service('room_state',{code:lobby.code},guest.token);assert.equal(migrated.host,guest.profile.id);assert.equal(migrated.players.find(p=>p.id===host.profile.id).connected,false);
 // Original host may reconnect before deployment without taking ownership back.
 const back=await service('room_join',{code:lobby.code,expectedKind:'war'},host.token);assert.equal(back.host,guest.profile.id);assert.equal(back.players.find(p=>p.id===host.profile.id).connected,true);
 await service('room_start',{code:lobby.code},guest.token);const room=tables.get('bootcamp_rooms')[0].data,carrier=room.players.find(p=>p.id===guest.profile.id);
 Object.assign(carrier,{x:10,z:0});room.objective.carrier=carrier.id;time+=100;
 await service('room_leave',{code:lobby.code},guest.token);assert.equal(room.objective.carrier,null);assert.equal(room.objective.x,10);assert.equal(carrier.connected,false);
 const state=await service('room_state',{code:lobby.code},host.token);assert.equal(state.players.find(p=>p.id===guest.profile.id).connected,false);assert.ok(!JSON.stringify(state).includes('lastSeen'));
});
