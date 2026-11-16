// Different Supabase projects have different identities. Never send the old
// project's remembered code to a new backend or delete the original saved code.
const PASSPORT_KEY='b29:remembered-passport:txrecpwlkdsyizulqnmn:v1';
const TRAINING_KEY='b29:training:v1';
// Only store the recovery code on a device the player trusts. Cloud profiles,
// cash and XP still come from the server, never from editable local storage.
export function rememberedPassport(){
  try{return localStorage.getItem(PASSPORT_KEY)||'';}catch{return '';}
}
export function rememberPassport(token){
  try{
    if(token)localStorage.setItem(PASSPORT_KEY,token);
    else localStorage.removeItem(PASSPORT_KEY);
    return true;
  }catch{return false;}
}
export function loadTraining(){
  try{
    const saved=JSON.parse(localStorage.getItem(TRAINING_KEY)||'[]');
    if(!Array.isArray(saved))return new Map();
    return new Map(saved.filter(entry=>Array.isArray(entry)&&entry.length===2&&Number.isInteger(entry[0])&&entry[0]>=0&&entry[0]<100&&
      entry[1]&&Number.isFinite(entry[1].score)&&entry[1].score>=0&&Number.isFinite(entry[1].time)&&entry[1].time>=0));
  }catch{return new Map();}
}
export function saveTraining(records){
  try{localStorage.setItem(TRAINING_KEY,JSON.stringify([...records]));return true;}catch{return false;}
}
