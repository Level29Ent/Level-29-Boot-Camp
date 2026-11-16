import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceConfig,standardPractice,practiceSummary,BOT_DIFFICULTIES,DEFAULT_PRACTICE,practiceKey,missionRecord,saveMission,missionLog,bestMission,missionExport} from '../practice-lab.js';
const store=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
const record=extra=>({operation:'elimination',role:'rifleman',config:{},success:true,elapsed:60,timestamp:1794800000000,shots:20,hits:10,kills:2,deaths:1,support:0,objectiveSeconds:0,...extra});
test('practice accepts only bounded explicit options; invalid/prototype values fall back safely',()=>{
 assert.deepEqual(practiceConfig(null),DEFAULT_PRACTICE);assert.deepEqual(practiceConfig({difficulty:'__proto__',duration:Infinity,target:-1,infiniteAmmo:'true'}),DEFAULT_PRACTICE);
 assert.deepEqual(practiceConfig({difficulty:'veteran',duration:300,target:50,infiniteAmmo:true}),{difficulty:'veteran',duration:300,target:50,infiniteAmmo:true});
 assert.equal(standardPractice({}),true);for(const option of [{difficulty:'recruit'},{duration:60},{target:15},{infiniteAmmo:true}])assert.equal(standardPractice(option),false);
});
test('difficulty changes reaction, speed, spread and cadence but has no health/damage bonuses',()=>{
 const {recruit,standard,veteran}=BOT_DIFFICULTIES;
 for(const property of ['cooldown','spread','reaction'])assert.ok(recruit[property]>standard[property]&&standard[property]>veteran[property]);
 assert.ok(recruit.speed<standard.speed&&standard.speed<veteran.speed);
 for(const difficulty of Object.values(BOT_DIFFICULTIES)){assert.equal(difficulty.damage,undefined);assert.equal(difficulty.hp,undefined);}
});
test('labels and comparison keys separate assists, difficulty, length and mission goals',()=>{
 assert.match(practiceSummary({duration:60,target:15,infiniteAmmo:true}),/1 min/);assert.match(practiceSummary({infiniteAmmo:true}),/infinite player/);
 assert.notEqual(practiceKey({},'intel'),practiceKey({},'zones'));assert.notEqual(practiceKey({},'intel'),practiceKey({duration:60},'intel'));
 assert.equal(practiceKey({target:15},'intel'),practiceKey({target:50},'intel'));assert.notEqual(practiceKey({target:15},'elimination'),practiceKey({target:50},'elimination'));
});
test('mission data is allowlisted, validates numeric bounds, rejects fabricated shape',()=>{
 const safe=missionRecord(record({token:'must-not-leak',name:'private-name',profile:{recovery:'private'},code:'123456',input:{fire:true}}));
 assert.equal(safe.token,undefined);assert.equal(safe.profile,undefined);assert.equal(safe.name,undefined);assert.equal(safe.code,undefined);
 for(const bad of [{elapsed:301},{hits:21},{shots:-1},{timestamp:Infinity},{role:'admin'},{operation:'__proto__'},{success:'yes'}])assert.equal(missionRecord(record(bad)),null);
});
test('history retains latest twenty completed records; export revalidates and contains only gameplay',()=>{
 const storage=store();for(let i=0;i<25;i++)assert.equal(saveMission(record({timestamp:100+i,token:'private'}),storage).saved,true);
 const log=missionLog(storage);assert.equal(log.length,20);assert.equal(log[0].timestamp,124);assert.equal(log.at(-1).timestamp,105);
 const data=JSON.parse(missionExport(storage));assert.equal(data.missions.length,20);assert.equal(data.format,'level29-local-missions');assert.equal(JSON.stringify(data).includes('private'),false);
 assert.equal(saveMission(record({elapsed:-1}),storage).saved,false);assert.equal(missionLog(storage).length,20);
});
test('fastest retained win compares only equivalent practice rules and ignores failures',()=>{
 const log=[missionRecord(record({elapsed:40})),missionRecord(record({elapsed:30,success:false})),missionRecord(record({elapsed:20,config:{infiniteAmmo:true}})),missionRecord(record({elapsed:10,config:{difficulty:'recruit'}}))];
 assert.equal(bestMission(log,{},'elimination').elapsed,40);assert.equal(bestMission(log,{infiniteAmmo:true},'elimination').elapsed,20);assert.equal(bestMission(log,{},'zones'),null);
});
test('blocked and malformed storage cannot break practice or export sensitive data',()=>{
 const denied={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};assert.deepEqual(missionLog(denied),[]);assert.equal(saveMission(record(),denied).saved,false);assert.deepEqual(JSON.parse(missionExport(denied)).missions,[]);
 for(const value of ['null','{}','[null,{},"secret"]','{broken'])assert.deepEqual(missionLog({getItem:()=>value}),[]);
 const s=store();s.setItem('b29:mission-log:v1',JSON.stringify([record({token:'old-secret'})]));assert.equal(missionExport(s).includes('old-secret'),false);
});
