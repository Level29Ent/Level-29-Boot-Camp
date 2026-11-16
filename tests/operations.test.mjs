import test from 'node:test';
import assert from 'node:assert/strict';
import {createObjective,stepObjective,useRole,drillChallenges} from '../operations.js';
import {bestRace,saveRace,saveBadges,readRecords,ghostAt} from '../field-records.js';
const player=(id,team='blue',x=0,z=12)=>({id,name:id,team,x,z,y:0,hp:100,kills:0,deaths:0,ammo:30,bot:id!=='you'});
test('capture is contested and wins at 60 seconds, not by kills',()=>{
  const o=createObjective('zones'),b=player('you'),r=player('enemy','red'),scores={blue:0,red:0};
  stepObjective(o,[b,r],scores,20);assert.equal(scores.blue,0);
  r.z=-20;stepObjective(o,[b,r],scores,60);assert.equal(scores.blue,60);assert.equal(o.won,true);
});
test('intel drops on death and must return to own base',()=>{
  const o=createObjective('intel'),b=player('you','blue',0,-25),scores={blue:0,red:0};
  stepObjective(o,[b],scores,.1);assert.equal(o.carrier,'you');assert.equal(scores.blue,0);
  b.hp=0;stepObjective(o,[b],scores,.1);assert.equal(o.carrier,null);
  b.hp=100;stepObjective(o,[b],scores,.1);b.z=27;stepObjective(o,[b],scores,.1);assert.equal(scores.blue,1);assert.equal(o.carrier,null);
});
test('escort needs friendly presence and stops under contest',()=>{
  const o=createObjective('escort'),b=player('you','blue',o.x,o.z),r=player('enemy','red',o.x,o.z),scores={blue:0,red:0};
  stepObjective(o,[b,r],scores,1);assert.equal(o.progress,0);
  r.z=-30;stepObjective(o,[b,r],scores,1);assert.equal(o.progress,2.5);
  b.z=-30;stepObjective(o,[b,r],scores,1);assert.equal(o.progress,2.5);
});
test('crucible requires jump, supply teamwork, eliminations and squad extraction',()=>{
  const o=createObjective('crucible'),b=player('you','blue',0,20),a=player('ally'),c=player('ally2'),scores={blue:0,red:0};
  stepObjective(o,[b,a,c],scores,1);assert.equal(o.stage,0);
  b.y=1;stepObjective(o,[b,a,c],scores,1);assert.equal(o.stage,1);
  Object.assign(b,{x:0,z:11,y:0});a.x=0;a.z=11;stepObjective(o,[b,a,c],scores,5);assert.equal(o.stage,2);
  b.kills=3;stepObjective(o,[b,a,c],scores,.1);assert.equal(o.stage,3);
  Object.assign(b,{x:0,z:-26});Object.assign(a,{x:0,z:-26});stepObjective(o,[b,a,c],scores,5);assert.equal(o.won,false);
  Object.assign(c,{x:0,z:-26});stepObjective(o,[b,a,c],scores,5);assert.equal(o.won,true);
});
test('medic heals only nearby living allies, cooldown survives repeat activation',()=>{
  const b={...player('you'),role:'medic'},a={...player('a'),hp:50},r={...player('r','red'),hp:50},dead={...player('dead'),hp:0};
  assert.equal(useRole(b,[b,a,r,dead],1000),true);assert.equal(a.hp,85);assert.equal(r.hp,50);assert.equal(dead.hp,0);assert.equal(b.support,1);
  assert.equal(useRole(b,[b,a],1001),false);assert.equal(useRole(b,[b,a],26000),true);assert.equal(a.hp,100);
});
test('engineer, scout and rifleman utilities are distinct and do not add damage',()=>{
  for(const role of ['engineer','scout','rifleman']){
    const b={...player('you'),role,ammo:2};assert.equal(useRole(b,[b],1000),true);
    assert.equal(b.hp,100);assert.equal(b.abilityAt,26000);
    assert.equal(role==='scout'?b.revealUntil:b.ammo,role==='scout'?9000:30);
  }
});
test('challenges require a completed drill and precision minimum',()=>{
  const b={deaths:0,shots:7,hits:7,support:2};assert.equal(drillChallenges(b,false).some(c=>c.done),false);
  assert.deepEqual(drillChallenges(b,true).map(c=>c.done),[true,false,true]);
});
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
test('records replace only faster runs and interpolate a noncompetitive ghost',()=>{
  const s=storage(),samples=[[0,0,0,7,0,0],[10,0,2,-30,0,1]];
  assert.equal(saveRace(3,10,samples,s).best,true);assert.equal(saveRace(3,11,samples,s).best,false);
  assert.equal(bestRace(3,s).time,10);assert.equal(bestRace(4,s),null);
  assert.equal(ghostAt(samples,5).z,-11.5);assert.equal(ghostAt(samples,20).progress,1);
  assert.equal(saveBadges(['support','support'],s),true);assert.deepEqual(readRecords(s).badges,['support']);
});
test('corrupt or denied storage does not block play or claim persistence',()=>{
  const denied={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
  assert.equal(bestRace(0,denied),null);assert.equal(saveRace(0,10,[[0,0,0,0,0,0]],denied).saved,false);assert.equal(saveBadges(['x'],denied),false);
  const corrupt={getItem:()=>'{bad json'};assert.equal(bestRace(0,corrupt),null);
});
