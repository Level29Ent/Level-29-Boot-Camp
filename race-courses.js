import {OBSTACLES} from './campaign.js';

const environments = ['course','forest','coast','combat','mountain','night','range','crucible'];
const names = ['Iron','Thunder','Raider','Viper','Spartan','Bulldog','Storm','Saber','Frost','Ghost'];
const suffixes = ['Breach','Rush','Crossing','Gauntlet','Trail','Assault','Run','Ridge','Circuit','Dash'];
export function createRaceCourses(){
  const used=new Set(),pool=Object.keys(OBSTACLES).filter(t=>t!=='carry');
  return Array.from({length:100},(_,i)=>{
    let seed=29001+i*7919;
    const rand=()=>((seed=(seed*16807)%2147483647)/2147483647);
    let types,signature;
    do{
      const bag=pool.slice();types=[];
      for(let k=0;k<5+i%2;k++)types.push(bag.splice(Math.floor(rand()*bag.length),1)[0]);
      signature=types.join(',');
    }while(used.has(signature));
    used.add(signature);
    // A second, reversed obstacle leg makes each deployment a full-length route,
    // rather than a short sprint followed by a long wait at the finish.
    types=[...types,...types.slice().reverse()];
    signature=types.join(',');
    const env=environments[i%8],name=names[Math.floor(i/10)]+' '+suffixes[i%10];
    return {num:i+1,name,phase:'60-SECOND RACE',week:env.toUpperCase(),kind:'gauntlet',
      env,diff:.15+(i/99)*.65,limit:60,segs:types.map(t=>({t})),signature,
      desc:'A 60-second race against your squad. Clear every checkpoint in order. Fastest finish wins; unfinished racers are ranked by course progress.',
      tasks:['Joystick or WASD to move. Shift to sprint, Space to jump or climb, C to crawl.',
        'Clear the gold checkpoints in order. Hold Space on monkey bars.',
        'The round lasts exactly 60 seconds. Finish early to watch the squad.',
        'Racers do not block each other. Falls return you to the obstacle entrance.']};
  });
}
