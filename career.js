const KEY='b29:career:v1';
export const MEDALS=[
  {id:'graduate',name:'Boot Camp Veteran',desc:'Complete 10 different campaign levels.',cosmetic:'earned-veteran'},
  {id:'clean',name:'Clean Breach',desc:'Extract from MOUT with no blue hits and at least 80% accuracy.',cosmetic:'earned-breach'},
  {id:'team',name:'Squad Backbone',desc:'Complete a local War match with two teammate assists and 10 objective seconds.',cosmetic:'earned-support'}
];
export function readCareer(storage){try{const data=JSON.parse((storage??globalThis.localStorage).getItem(KEY));return {medals:Array.isArray(data?.medals)?data.medals.filter(x=>MEDALS.some(m=>m.id===x)):[],daily:data?.daily&&typeof data.daily==='object'?data.daily:{},tutorial:data?.tutorial===true};}catch{return {medals:[],daily:{},tutorial:false};}}
export function cosmeticUnlocked(id,storage){const medal=MEDALS.find(m=>m.cosmetic===id);return !medal||readCareer(storage).medals.includes(medal.id);}
export function recordCareer(result,storage){
  const data=readCareer(storage),earned=[];
  if(result.mode==='campaign'&&result.success&&result.completed>=10)earned.push('graduate');
  if(result.mode==='mout'&&result.success&&result.penalties===0&&result.accuracy>=80)earned.push('clean');
  if(result.mode==='war'&&result.local&&result.support>=2&&result.objectiveSeconds>=10)earned.push('team');
  const fresh=earned.filter(id=>!data.medals.includes(id));data.medals=[...new Set([...data.medals,...earned])];
  if(result.tutorial&&result.success)data.tutorial=true;
  if(result.daily&&result.success){data.daily[result.daily.date]??=[];data.daily[result.daily.date]=[...new Set([...data.daily[result.daily.date],result.daily.id])];const dates=Object.keys(data.daily).sort();for(const date of dates.slice(0,-14))delete data.daily[date];}
  try{(storage??globalThis.localStorage).setItem(KEY,JSON.stringify(data));return {fresh,saved:true};}catch{return {fresh,saved:false};}
}
export function dailyTraining(date=new Date().toISOString().slice(0,10)){
  const day=Math.floor(Date.parse(date+'T00:00:00Z')/86400000),seed=Number.isFinite(day)?day:0;
  return [0,1,2].map((i)=>({id:'order-'+i,date,level:(seed*7+i*31+1000000)%98+1,modifier:i===0?'standard':i===1?'endurance':'precision',name:['Field Circuit','Endurance Run','Precision Route'][i]}));
}
export function afterAction({mode,shots=0,hits=0,penalties=0,falls=0,objectiveSeconds=0,support=0,success=false}){
  const accuracy=shots?Math.round(hits/shots*100):0;
  const shooting=`${hits}/${shots} hits · ${Math.max(0,shots-hits)} misses · ${accuracy}% accuracy`;
  const metrics=mode==='war'?`${shooting} · ${support} teammate assists · ${Math.floor(objectiveSeconds)}s on objective`:mode==='mout'?`${shooting} · ${penalties} no-shoot hits`:`${falls} obstacle resets · ${shots?shooting:'no shots fired'}`;
  const advice=penalties?'Identify blue targets before firing.':mode==='war'&&objectiveSeconds<10?'Spend more time at the objective; eliminations alone do not complete the mission.':mode==='war'&&support<2?'Use Medic or Engineer near injured or low-ammo allies.':shots&&accuracy<70?'Slow down and steady your aim before the next shot.':falls?'Approach obstacles deliberately; buffer jump just before landing.':success?'Clean run. Try a daily modifier or a different role.':'Retry the objective and follow its next-step prompt.';
  return metrics+' · NEXT RUN: '+advice;
}
