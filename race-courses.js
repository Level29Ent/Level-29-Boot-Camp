import {OBSTACLES} from './campaign.js';
import {RACE_DURATION,RACE_DISQUALIFIED} from './race-rules.js';

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
      for(let k=0;k<10+i%3;k++)types.push(bag.splice(Math.floor(rand()*bag.length),1)[0]);
      // Unique obstacle sets, not merely reordered copies of another course.
      signature=types.slice().sort().join(',');
    }while(used.has(signature));
    used.add(signature);
    // Keep every obstacle in a course different, without a mirrored second leg.
    signature=types.join(',');
    const env=environments[i%8],name=names[Math.floor(i/10)]+' '+suffixes[i%10];
    return {num:i+1,name,phase:'60-SECOND RACE',week:env.toUpperCase(),kind:'gauntlet',
      env,diff:.15+(i/99)*.65,limit:RACE_DURATION,segs:types.map(t=>({t})),signature,
      desc:`A ${RACE_DURATION}-second race against your squad. Clear every checkpoint in order. Fastest finish wins; unfinished racers are ranked by course progress. The bottom ${RACE_DISQUALIFIED} racers are disqualified at the buzzer.`,
      tasks:['Joystick or WASD to move. Shift to sprint, Space to jump or climb, C to crawl.',
        'Clear the gold checkpoints in order. Hold Space on monkey bars.',
        `The round lasts exactly ${RACE_DURATION} seconds. Finish early to watch the squad.`,
        `The bottom ${RACE_DISQUALIFIED} racers are disqualified, even if they reach the finish.`,
        'Racers do not block each other. Falls return you to the obstacle entrance.']};
  });
}
