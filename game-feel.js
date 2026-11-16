export const DEFAULT_SETTINGS={quality:'balanced',sensitivity:1,reducedMotion:false,environment:'auto'};
export function sanitizeSettings(value={}){
  return {quality:['performance','balanced','high'].includes(value?.quality)?value.quality:'balanced',
    sensitivity:Number.isFinite(value?.sensitivity)?Math.max(.4,Math.min(2,value.sensitivity)):1,reducedMotion:value?.reducedMotion===true,environment:['auto','woodland','coastal','night'].includes(value?.environment)?value.environment:'auto'};
}
export function loadSettings(storage){try{return sanitizeSettings(JSON.parse((storage??globalThis.localStorage).getItem('b29:settings:v1')));}catch{return {...DEFAULT_SETTINGS};}}
export function saveSettings(value,storage){try{(storage??globalThis.localStorage).setItem('b29:settings:v1',JSON.stringify(sanitizeSettings(value)));return true;}catch{return false;}}
export function qualityProfile(quality,pixelRatio=1){
  const ratio=Number.isFinite(pixelRatio)?Math.max(1,pixelRatio):1;
  return quality==='performance'?{ratio:1,shadows:false,mapSize:512}:quality==='high'?{ratio:Math.min(2,ratio),shadows:true,mapSize:2048}:{ratio:Math.min(1.5,ratio),shadows:true,mapSize:1024};
}
// A worse replay must not erase an existing personal-best training record.
export function trainingBest(previous,next){return !previous||next.score>previous.score||next.score===previous.score&&next.time<previous.time?next:previous;}
export function createJumpAssist(){
  let grace=0,buffer=0;
  return {reset(){grace=buffer=0;},step(dt,{grounded,pressed,enabled=true}){
    if(!enabled){grace=buffer=0;return false;}
    grace=grounded ? .1 :Math.max(0,grace-dt);buffer=pressed ? .12 :Math.max(0,buffer-dt);
    if(grace>0&&buffer>0){grace=buffer=0;return true;}return false;
  }};
}
