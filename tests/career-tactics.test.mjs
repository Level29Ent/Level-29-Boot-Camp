import test from 'node:test';
import assert from 'node:assert/strict';
import {setSquadOrder,botPlan,clearSight,objectiveActivity} from '../squad-tactics.js';
import {dailyTraining,recordCareer,readCareer,cosmeticUnlocked,afterAction} from '../career.js';
import {GUIDED_LESSON} from '../training-briefs.js';
import {createRoom,startRoom,acceptInput,tickRoom,publicRoom,appearance} from '../supabase/functions/bootcamp-command/domain.js';
const player=(id,slot=0,team='blue')=>({id,slot,team,name:id,hp:100,ammo:30,x:-10,z:25,bot:false,connected:true});
const room=()=>({players:[player('captain'),{...player('bot',1),bot:true}],orders:{},objective:{id:'zones',x:0,z:12},events:[]});
test('only first connected human per team can issue allowlisted orders, hold captures position',()=>{
 const r=room(),leader=r.players[0];r.players.push(player('friend',2));
 assert.equal(setSquadOrder(r,r.players[2],'hold',100),false);assert.equal(setSquadOrder(r,leader,'teleport',100),false);
 assert.equal(setSquadOrder(r,leader,'hold',100),true);leader.x=5;assert.equal(r.orders.blue.x,-10);
 assert.equal(botPlan(r,r.players[1],200).behavior,'Holding position');
 setSquadOrder(r,leader,'follow',200);assert.equal(botPlan(r,r.players[1],200).goal.x,3.8);
 leader.connected=false;assert.equal(setSquadOrder(r,r.players[2],'push',300),true);
});
test('bots retreat to open cover while reloading, investigate audible shots and respect line of sight',()=>{
 const r=room(),bot=r.players[1];bot.ammo=2;assert.equal(botPlan(r,bot,100).fire,false);assert.equal(botPlan(r,bot,100).reload,true);
 bot.ammo=30;r.objective.id='elimination';r.events.push({type:'shot',team:'red',x:-10,z:15,at:100});
 assert.equal(botPlan(r,bot,200).behavior,'Investigating shots');assert.equal(bot.memory.z,15);
 assert.equal(clearSight({x:0,z:10},{x:0,z:-10}),false);assert.equal(clearSight({x:10,z:10},{x:10,z:-10}),true);
});
test('objective contribution accrues only for living nearby players',()=>{
 const r=room();r.players[0].x=0;r.players[0].z=12;r.players[1].hp=0;
 objectiveActivity(r,2);assert.equal(r.players[0].objectiveSeconds,2);assert.equal(r.players[1].objectiveSeconds,undefined);
});
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
test('medals unlock three local cosmetics only for defined achievements, repeated awards are idempotent',()=>{
 const s=storage();assert.equal(cosmeticUnlocked('earned-veteran',s),false);
 recordCareer({mode:'campaign',success:true,completed:9},s);assert.equal(cosmeticUnlocked('earned-veteran',s),false);
 recordCareer({mode:'campaign',success:true,completed:10},s);assert.equal(cosmeticUnlocked('earned-veteran',s),true);
 recordCareer({mode:'mout',success:true,accuracy:95,penalties:1},s);assert.equal(cosmeticUnlocked('earned-breach',s),false);
 recordCareer({mode:'mout',success:true,accuracy:80,penalties:0},s);
 recordCareer({mode:'war',local:false,support:5,objectiveSeconds:20},s);assert.equal(cosmeticUnlocked('earned-support',s),false);
 recordCareer({mode:'war',local:true,support:2,objectiveSeconds:10},s);recordCareer({mode:'war',local:true,support:2,objectiveSeconds:10},s);
 assert.equal(readCareer(s).medals.length,3);assert.throws(()=>appearance('earned-support'));
});
test('daily rotation deterministic, three distinct existing levels, date-specific and failure-safe progress',()=>{
 const date='2026-11-16',orders=dailyTraining(date),s=storage();assert.deepEqual(orders,dailyTraining(date));assert.equal(new Set(orders.map(o=>o.level)).size,3);
 assert.ok(orders.every(o=>o.level>0&&o.level<99));assert.notDeepEqual(orders,dailyTraining('2026-11-17'));
 recordCareer({success:false,daily:orders[0]},s);assert.equal(readCareer(s).daily[date],undefined);
 recordCareer({success:true,daily:orders[0]},s);recordCareer({success:true,daily:orders[0]},s);assert.deepEqual(readCareer(s).daily[date],['order-0']);
 assert.equal(recordCareer({success:true,daily:orders[0]},{getItem(){throw Error()},setItem(){throw Error()}}).saved,false);
});
test('reports produce concrete advice and tutorial covers movement, jump/climb, crawl, shooting and squad rally',()=>{
 assert.match(afterAction({mode:'war',objectiveSeconds:0}),/Spend more time/);assert.match(afterAction({mode:'mout',penalties:1}),/Identify blue/);
 assert.match(afterAction({mode:'race',falls:2}),/Approach obstacles/);
 assert.deepEqual(GUIDED_LESSON.segs.map(s=>s.t),['low_wall','high_wall','wire','shoot']);assert.ok(GUIDED_LESSON.tasks.some(t=>t.includes('rally')));
});
test('server accepts captain order through authenticated input and exposes safe orders to teammates',()=>{
 const r=createRoom('ABCDEF',{id:'captain',name:'Captain'},'war',{mode:'pve',operation:'zones'},0);startRoom(r,'captain',0);tickRoom(r,3100);
 acceptInput(r,'captain',{seq:1,order:'hold'},3100);tickRoom(r,3200);
 assert.equal(publicRoom(r,'captain',3200).orders.blue.kind,'hold');assert.ok(r.players.some(p=>p.bot&&p.team==='blue'&&p.behavior==='Holding position'));
});
test('enemy hearing does not reveal distant unseen players and does not persist indefinitely',()=>{
 const r=room(),bot=r.players[1];r.objective.id='elimination';
 r.players.push({...player('enemy',7,'red'),x:0,z:-28});const initial=botPlan(r,bot,100);
 assert.equal(initial.enemy,null);assert.equal(initial.behavior,'Patrolling');
 r.events.push({type:'shot',team:'red',x:-10,z:15,at:100});assert.equal(botPlan(r,bot,200).behavior,'Investigating shots');
 assert.equal(botPlan(r,bot,5000).behavior,'Patrolling');
});
test('client refuses locked cosmetic IDs; earned selection stays distinct from server allowlist',async()=>{
 const previous=globalThis.localStorage,s=storage();globalThis.localStorage={...s,removeItem(){}};
 try{const {selectStyle}=await import('../avatar-styles.js');assert.equal(selectStyle('earned-veteran').ok,false);
 recordCareer({mode:'campaign',success:true,completed:10},globalThis.localStorage);assert.equal(selectStyle('earned-veteran').ok,true);assert.throws(()=>appearance('earned-veteran'));selectStyle(null);
 }finally{globalThis.localStorage=previous;}
});
