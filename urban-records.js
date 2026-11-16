// Kept separate from six-room MOUT medals and bests because the routes differ.
export function readUrbanRecord(storage){try{const value=JSON.parse((storage??globalThis.localStorage).getItem('b29:urban-best:v1'));return value&&Number.isFinite(value.score)&&value.score>=0&&Number.isFinite(value.time)&&value.time>=0&&value.time<=240?{score:value.score,time:value.time}:null;}catch{return null;}}
export function saveUrbanRecord(state,score,storage){
  if(!state.success||!Number.isFinite(score)||score<0||!Number.isFinite(state.elapsed)||state.elapsed<0||state.elapsed>240)return {eligible:false,saved:false,best:false};
  try{storage??=globalThis.localStorage;const old=readUrbanRecord(storage);
    if(old&&(old.score>score||old.score===score&&old.time<=state.elapsed))return {eligible:true,saved:true,best:false};
    storage.setItem('b29:urban-best:v1',JSON.stringify({score,time:state.elapsed}));return {eligible:true,saved:true,best:true};
  }catch{return {eligible:true,saved:false,best:true};}
}
