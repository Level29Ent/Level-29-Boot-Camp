import test from 'node:test';
import assert from 'node:assert/strict';
import {readRecords,saveBadges,saveRace,bestRace} from '../field-records.js';
import {readCareer,recordCareer} from '../career.js';
import {createObjective,stepObjective} from '../operations.js';
import {createRoom,startRoom,acceptInput,tickRoom} from '../supabase/functions/bootcamp-command/domain.js';
const store=value=>{let saved=JSON.stringify(value);return {getItem:()=>saved,setItem:(k,v)=>{saved=v;}};};
test('valid JSON with invalid field shapes does not poison field-record writes',()=>{
 const storage=store({version:1,races:'broken',badges:42,mout:{score:'oops'}});
 assert.deepEqual(readRecords(storage).badges,[]);assert.equal(saveBadges(['support'],storage),true);
 assert.equal(saveRace(0,10,[[0,0,0,7,0,0],[10,0,0,-20,0,1]],storage).saved,true);
 assert.equal(bestRace(0,storage).time,10);
});
test('corrupted daily completion values cannot break saving career progress',()=>{
 const storage=store({daily:{'2026-11-16':42},medals:['clean','clean'],tutorial:false});
 assert.deepEqual(readCareer(storage).daily,{});assert.deepEqual(readCareer(storage).medals,['clean']);
 assert.equal(recordCareer({success:true,daily:{date:'2026-11-16',id:'order-0'}},storage).saved,true);
});
test('ghost records reject reversed times, invalid progress and empty paths',()=>{
 for(const samples of [[],[[2,0,0,0,0,0],[1,0,0,0,0,1]],[[0,0,0,0,0,2]]]){
  assert.equal(bestRace(0,store({version:1,races:{0:{time:10,samples}},badges:[]})),null);
 }
});
test('Crucible supports all-human co-op, not only AI squadmates',()=>{
 const o=createObjective('crucible');o.stage=1;o.x=0;o.z=11;
 const players=Array.from({length:5},(_,i)=>({id:'human-'+i,slot:i,team:'blue',bot:false,connected:true,x:0,z:11,y:0,hp:100,kills:0})),scores={blue:0,red:0};
 stepObjective(o,players,scores,5);assert.equal(o.stage,2);
 o.stage=3;o.x=0;o.z=-26;o.hold=0;for(const p of players)p.z=-26;
 stepObjective(o,players,scores,5);assert.equal(o.won,true);
});
test('disconnected or eliminated co-op members cannot count toward Crucible holds',()=>{
 const o=createObjective('crucible');Object.assign(o,{stage:1,x:0,z:11});
 const players=[{id:'you',team:'blue',bot:false,connected:true,x:0,z:11,y:0,hp:100,kills:0},{id:'friend',team:'blue',bot:false,connected:false,x:0,z:11,y:0,hp:100,kills:0}];
 stepObjective(o,players,{blue:0,red:0},5);assert.equal(o.stage,1);
 players[1].connected=true;players[1].hp=0;stepObjective(o,players,{blue:0,red:0},5);assert.equal(o.stage,1);
});
test('fresh input cannot be applied to simulation time preceding its arrival',()=>{
 const room=createRoom('ABCDEF',{id:'you',name:'Recruit'},'war',{},0);startRoom(room,'you',0);
 // A slower concurrent request can have received input after the next tick's timestamp.
 acceptInput(room,'you',{seq:1,dx:1,fire:true},3400);const x=room.players[0].x;
 tickRoom(room,3300);assert.equal(room.players[0].x,x);assert.equal(room.players[0].active,0);
});
test('mode lifecycle rejects late responses even if next session reuses a room code',async()=>{
 const {createModeLifecycle}=await import('../mode-lifecycle.js');const life=createModeLifecycle(),old=life.current();
 assert.equal(life.valid(old),true);life.invalidate();assert.equal(life.valid(old),false);assert.throws(()=>life.assert(old),e=>e.staleSession===true);
 const next=life.current();assert.doesNotThrow(()=>life.assert(next));life.invalidate();assert.equal(life.valid(next),false);
});
test('server bots cache world waypoints rather than stale direction vectors',()=>{
 const room=createRoom('ABCDEF',{id:'you',name:'Recruit'},'war',{operation:'zones'},0);startRoom(room,'you',0);tickRoom(room,3100);
 const bot=room.players.find(p=>p.bot);assert.equal(Number.isFinite(bot.route.x),true);assert.equal(bot.route.dx,undefined);
 const x=bot.x,z=bot.z;tickRoom(room,3200);assert.ok(Math.hypot(bot.x-x,bot.z-z)<=.301);
});

test('repairing one malformed save field preserves valid records in other fields',()=>{
 const samples=[[0,0,0,7,0,0],[10,0,0,-20,0,1]],storage=store({version:1,races:{0:{time:10,samples}},badges:42,mout:{score:2000,time:90,accuracy:80}});
 assert.equal(saveBadges(['support'],storage),true);assert.equal(bestRace(0,storage).time,10);assert.equal(readRecords(storage).mout.score,2000);
 assert.deepEqual(readRecords(storage).badges,['support']);
});
