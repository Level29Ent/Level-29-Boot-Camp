const KEY='b29-field-records-v1';
export function readRecords(storage){
  try{storage??=globalThis.localStorage;const value=JSON.parse(storage.getItem(KEY));return value&&value.version===1?value:{version:1,races:{},badges:[]};}
  catch{return {version:1,races:{},badges:[]};}
}
export function saveBadges(ids,storage){
  try{storage??=globalThis.localStorage;const data=readRecords(storage);data.badges=[...new Set([...(data.badges||[]),...ids])];storage.setItem(KEY,JSON.stringify(data));return true;}catch{return false;}
}
export function bestRace(course,storage){
  const r=readRecords(storage).races?.[course];
  return r&&Number.isFinite(r.time)&&r.time>0&&r.time<=60&&Array.isArray(r.samples)&&r.samples.length>0&&r.samples.length<=605&&r.samples.every(s=>Array.isArray(s)&&s.length===6&&s.every(Number.isFinite))?r:null;
}
export function saveRace(course,time,samples,storage){
  if(!Number.isFinite(time)||time<=0||time>60||!samples.length)return {saved:false,best:false};
  const old=bestRace(course,storage);if(old&&old.time<=time)return {saved:true,best:false,delta:time-old.time};
  try{storage??=globalThis.localStorage;const data=readRecords(storage);data.races||={};data.races[course]={time,samples:samples.slice(0,605)};storage.setItem(KEY,JSON.stringify(data));return {saved:true,best:true,delta:old?time-old.time:null};}
  catch{return {saved:false,best:true};}
}
export function ghostAt(samples,t){
  if(!samples?.length)return null;
  let i=0;while(i<samples.length-1&&samples[i+1][0]<t)i++;
  const a=samples[i],b=samples[Math.min(i+1,samples.length-1)],f=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0]||1)));
  return {x:a[1]+(b[1]-a[1])*f,y:a[2]+(b[2]-a[2])*f,z:a[3]+(b[3]-a[3])*f,rotation:a[4],progress:a[5]+(b[5]-a[5])*f};
}
