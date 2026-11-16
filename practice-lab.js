import {OPERATIONS} from './operations.js';
export const BOT_DIFFICULTIES=Object.freeze({
  recruit:Object.freeze({name:'Recruit',cooldown:.9,spread:.16,speed:2.3,reaction:900}),
  standard:Object.freeze({name:'Regular',cooldown:.52,spread:.08,speed:3,reaction:450}),
  veteran:Object.freeze({name:'Veteran',cooldown:.35,spread:.025,speed:3.4,reaction:200})
});
export const DEFAULT_PRACTICE=Object.freeze({difficulty:'standard',duration:180,target:30,infiniteAmmo:false});
export function practiceConfig(value){
  const config=value&&typeof value==='object'?value:{};
  return {difficulty:Object.hasOwn(BOT_DIFFICULTIES,config.difficulty)?config.difficulty:'standard',
    duration:[60,180,300].includes(config.duration)?config.duration:180,
    target:[15,30,50].includes(config.target)?config.target:30,infiniteAmmo:config.infiniteAmmo===true};
}
export function standardPractice(value){const c=practiceConfig(value);return Object.keys(DEFAULT_PRACTICE).every(key=>c[key]===DEFAULT_PRACTICE[key]);}
export function practiceSummary(value,operation='elimination'){
  const c=practiceConfig(value);return BOT_DIFFICULTIES[c.difficulty].name+' enemies · '+c.duration/60+' min'+(operation==='elimination'?' · first to '+c.target:'')+(c.infiniteAmmo?' · infinite player ammo':' · normal magazines');
}
export function practiceKey(value,operation){const c=practiceConfig(value);return [operation,c.difficulty,c.duration,operation==='elimination'?c.target:'objective',c.infiniteAmmo?'assisted':'normal'].join(':');}
const KEY='b29:mission-log:v1';
// Only these explicitly copied gameplay fields are ever persisted/exported.
// No callsign, profile ID, recovery code, room code, cloud response or input.
export function missionRecord(value){
  if(!value||!Object.hasOwn(OPERATIONS,value.operation)||!['rifleman','medic','engineer','scout'].includes(value.role)||typeof value.success!=='boolean')return null;
  const number=(n,max)=>Number.isFinite(n)&&n>=0&&n<=max;
  if(!number(value.elapsed,300)||!number(value.timestamp,8640000000000000)||!number(value.shots,100000)||!number(value.hits,value.shots)||!number(value.kills,10000)||!number(value.deaths,10000)||!number(value.support,10000)||!number(value.objectiveSeconds,300))return null;
  return {operation:value.operation,role:value.role,config:practiceConfig(value.config),success:value.success,elapsed:value.elapsed,timestamp:value.timestamp,
    shots:Math.floor(value.shots),hits:Math.floor(value.hits),kills:Math.floor(value.kills),deaths:Math.floor(value.deaths),support:Math.floor(value.support),objectiveSeconds:value.objectiveSeconds};
}
export function missionLog(storage){
  try{const data=JSON.parse((storage??globalThis.localStorage).getItem(KEY));return Array.isArray(data)?data.slice(0,20).map(missionRecord).filter(Boolean):[];}catch{return [];}
}
export function saveMission(value,storage){
  const record=missionRecord(value);if(!record)return {saved:false};
  try{(storage??globalThis.localStorage).setItem(KEY,JSON.stringify([record,...missionLog(storage)].slice(0,20)));return {saved:true,record};}catch{return {saved:false,record};}
}
export function bestMission(log,value,operation){
  const key=practiceKey(value,operation);return log.filter(r=>r.success&&practiceKey(r.config,r.operation)===key).sort((a,b)=>a.elapsed-b.elapsed)[0]||null;
}
export function missionExport(storage){return JSON.stringify({format:'level29-local-missions',version:1,scope:'This browser only. Unranked practice; no credentials or cloud rewards.',missions:missionLog(storage)},null,2);}
