import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeSettings,loadSettings,saveSettings,qualityProfile,trainingBest,createJumpAssist} from '../game-feel.js';
import {createDrill,tickDrill,recordShot,extractDrill,MOUT_ROOMS,canMove,floorAt} from '../mout-rules.js';
test('graphics settings bound sensitivity and recover from corrupt or denied storage',()=>{
  assert.deepEqual(sanitizeSettings({quality:'ultra',sensitivity:99}),{quality:'balanced',sensitivity:2,reducedMotion:false});
  assert.deepEqual(loadSettings({getItem:()=>'{bad'}),sanitizeSettings());assert.deepEqual(loadSettings({getItem:()=>null}),sanitizeSettings());
  assert.equal(saveSettings({}, {setItem(){throw Error('denied')}}),false);
  assert.deepEqual(qualityProfile('performance',3),{ratio:1,shadows:false,mapSize:512});assert.equal(qualityProfile('high',3).ratio,2);
});
test('campaign personal best preserves highest score, then fastest tied finish',()=>{
  const best={score:1000,time:80};assert.equal(trainingBest(best,{score:900,time:10}),best);assert.equal(trainingBest(best,{score:1000,time:90}),best);
  assert.equal(trainingBest(best,{score:1000,time:70}).time,70);assert.equal(trainingBest(best,{score:1100,time:100}).score,1100);
});
test('jump buffer accepts a press just before landing, not an indefinitely held jump',()=>{
  const jump=createJumpAssist();assert.equal(jump.step(.016,{grounded:false,pressed:true}),false);
  assert.equal(jump.step(.05,{grounded:true,pressed:false}),true);assert.equal(jump.step(.016,{grounded:false,pressed:false}),false);
  jump.reset();jump.step(.016,{grounded:false,pressed:true});jump.step(.2,{grounded:false,pressed:false});assert.equal(jump.step(.016,{grounded:true,pressed:false}),false);
});
test('shoot house supports all six breached rooms via ramp and prevents sealed-door movement',()=>{
  const opened=new Set(MOUT_ROOMS.map(r=>r.id)),visited=new Set(),queue=[[0,5]],scale=4;
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i],key=x+','+z;if(visited.has(key))continue;visited.add(key);const y=floorAt(x/scale,z/scale);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz;if(canMove(nx/scale,nz/scale,y,opened)&&!visited.has(nx+','+nz))queue.push([nx,nz]);}
  }
  for(const r of MOUT_ROOMS)assert.ok([...visited].some(key=>{const [x,z]=key.split(',').map(Number);return Math.abs(x/scale-r.side*4.25)<1&&Math.abs(z/scale-r.z)<1&&Math.abs(floorAt(x/scale,z/scale)-r.y)<.1;}),'reachable '+r.id);
  assert.equal(canMove(1.5,-4,0,new Set()),false);
});
test('shoot house reload and no-shoot penalties cannot fake clearance or extraction',()=>{
  const drill=createDrill();recordShot(drill,null,true);assert.equal(drill.penalties,1);assert.equal(drill.hits,0);assert.equal(extractDrill(drill,0,3,-29),false);
  drill.reload=1.4;assert.equal(recordShot(drill,'A1'),false);tickDrill(drill,1.4);assert.equal(drill.ammo,12);
  for(const room of MOUT_ROOMS){drill.entered.add(room.id);recordShot(drill,room.id);recordShot(drill,room.id);}
  assert.equal(extractDrill(drill,0,3,-29),true);assert.equal(recordShot(drill,'A1'),false);
});
test('only successful MOUT extractions save a best; slower lower scores do not replace it',async()=>{
  const {saveDrillRecord,bestDrill}=await import('../field-records.js');const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
  assert.equal(saveDrillRecord({success:false,score:9000,time:12,accuracy:100},storage).eligible,false);assert.equal(bestDrill(storage),null);
  assert.equal(saveDrillRecord({success:true,score:2000,time:90,accuracy:85},storage).best,true);
  assert.equal(saveDrillRecord({success:true,score:1990,time:50,accuracy:100},storage).best,false);assert.equal(bestDrill(storage).score,2000);
  assert.equal(saveDrillRecord({success:true,score:2100,time:80,accuracy:90},{getItem(){throw Error()},setItem(){throw Error()}}).saved,false);
});
