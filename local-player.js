const KEY='b29:local-player:v1';
export const cleanCallsign=value=>String(value||'').trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,18)||'Recruit';
let callsign='Recruit';
try{callsign=cleanCallsign(JSON.parse(localStorage.getItem(KEY)||'null')?.name);}catch{}
export const localCallsign=()=>callsign;
export function saveLocalPlayer(name,{remember=true}={}){
  callsign=cleanCallsign(name);
  if(!remember)return {name:callsign,saved:false};
  try{localStorage.setItem(KEY,JSON.stringify({name:callsign}));return {name:callsign,saved:true};}
  catch{return {name:callsign,saved:false};}
}
