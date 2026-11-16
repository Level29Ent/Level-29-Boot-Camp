// Local-only rules. Cloud matches remain authoritative in the external service.
export const OPERATIONS={
  elimination:{name:'Team elimination',goal:30},
  zones:{name:'Capture zone',goal:60},
  intel:{name:'Retrieve intel',goal:3},
  escort:{name:'Supply escort',goal:100},
  crucible:{name:'Squad Crucible',goal:4}
};
export const CRUCIBLE_HURDLES=[{x:0,z:18,w:8,d:.5,h:.55},{x:0,z:15,w:8,d:.5,h:.55}];
export const ROLES={
  medic:{name:'Medic',ability:'Heal living allies within 6m by 35 HP'},
  engineer:{name:'Engineer',ability:'Refill nearby allies’ magazines'},
  scout:{name:'Scout',ability:'Reveal enemies on radar for 8 seconds'},
  rifleman:{name:'Rifleman',ability:'Instant combat reload'}
};
const near=(p,q,r=4)=>p.hp>0&&Math.hypot(p.x-q.x,p.z-q.z)<r;
export function createObjective(mode='elimination'){
  const id=OPERATIONS[mode]?mode:'elimination';
  return {id,x:id==='intel'?10:0,z:id==='intel'?0:id==='escort'?24:id==='crucible'?20:12,stage:0,hold:0,carrier:null,progress:0,won:false,
    text: id==='crucible'?'Jump through the gold rally marker':id==='intel'?'Collect midfield intel, return it to your base':id==='escort'?'Escort supply truck to the north gate; enemies contest within 5m':id==='zones'?'Hold the gold zone uncontested to earn 60 points':'First squad to 30 eliminations'};
}
export function objectiveDestination(o,p,players){
  if(o.id==='intel'){
    const carrier=players.find(q=>q.id===o.carrier);
    return carrier?(carrier.id===p.id?{x:0,z:p.team==='blue'?27:-27}:carrier):o;
  }
  return o;
}
export function stepObjective(o,players,scores,dt){
  if(o.id==='elimination'||o.won)return;
  const blue=players.filter(p=>p.team==='blue'),red=players.filter(p=>p.team==='red');
  const allies=blue.filter(p=>near(p,o,5)),enemies=red.filter(p=>near(p,o,5));
  if(o.id==='zones'){
    if(allies.length&&!enemies.length)scores.blue+=dt;
    if(enemies.length&&!allies.length)scores.red+=dt;
    o.won=scores.blue>=60||scores.red>=60;
  }
  if(o.id==='intel'){
    let carrier=players.find(p=>p.id===o.carrier);
    if(carrier&&carrier.hp<=0){o.x=carrier.x;o.z=carrier.z;o.carrier=null;carrier=null;}
    if(!carrier){carrier=players.find(p=>near(p,o,2));if(carrier)o.carrier=carrier.id;}
    if(carrier){o.x=carrier.x;o.z=carrier.z;
      if(near(carrier,{x:0,z:carrier.team==='blue'?27:-27},3)){
        scores[carrier.team]++;o.x=10;o.z=0;o.carrier=null;
      }
    }
    o.text=carrier?'Intel carrier: '+carrier.name+' · return to your base':'Collect gold intel; return it to your base';
    o.won=scores.blue>=3||scores.red>=3;
  }
  if(o.id==='escort'){
    if(allies.length&&!enemies.length)o.progress=Math.min(100,o.progress+dt*2.5);
    // Clear centre lane detours east of the central bunker.
    const points=[[0,24],[0,12],[10,12],[10,-12],[0,-12],[0,-26]],lengths=[12,10,24,10,14];
    let distance=o.progress/100*70;
    for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const t=distance/lengths[i];o.x=points[i][0]+(points[i+1][0]-points[i][0])*t;o.z=points[i][1]+(points[i+1][1]-points[i][1])*t;break;}distance-=lengths[i];}
    scores.blue=o.progress;o.won=o.progress>=100;
  }
  if(o.id==='crucible'){
    const own=blue.find(p=>!p.bot);if(!own)return;
    if(o.stage===0&&near(own,o,3)&&own.y>.5){o.stage=1;o.x=0;o.z=11;o.text='Cross two low hurdles, then deliver supplies with an AI teammate (hold 5s)';}
    else if(o.stage===1){
      o.hold=near(own,o,4)&&allies.some(p=>p.bot)?o.hold+dt:0;
      if(o.hold>=5){o.stage=2;o.x=10;o.z=-12;o.startKills=blue.reduce((n,p)=>n+p.kills,0);o.text='Clear the route: squad must earn 3 eliminations';}
    }else if(o.stage===2&&blue.reduce((n,p)=>n+p.kills,0)-o.startKills>=3){o.stage=3;o.x=0;o.z=-26;o.hold=0;o.text='Extract: rally here with at least two AI teammates for 5s';}
    else if(o.stage===3){
      o.hold=near(own,o,5)&&allies.filter(p=>p.bot).length>=2?o.hold+dt:0;
      if(o.hold>=5){o.stage=4;o.won=true;o.text='Squad extracted';}
    }
    scores.blue=o.stage;
  }
}
export function useRole(p,players,time){
  if(p.hp<=0||time<(p.abilityAt||0))return false;
  const role=ROLES[p.role]?p.role:'rifleman';
  const allies=players.filter(q=>q.team===p.team&&near(q,p,6));
  if(role==='medic'){
    const injured=allies.filter(q=>q.hp<100);if(!injured.length)return false;
    for(const q of injured){q.hp=Math.min(100,q.hp+35);if(q.id!==p.id)p.support=(p.support||0)+1;}
  }else if(role==='engineer'){
    const empty=allies.filter(q=>q.ammo<30);if(!empty.length)return false;
    for(const q of empty){q.ammo=30;q.reloadAt=0;if(q.id!==p.id)p.support=(p.support||0)+1;}
  }else if(role==='scout')p.revealUntil=time+8000;
  else{if(p.ammo===30)return false;p.ammo=30;p.reloadAt=0;}
  p.abilityAt=time+25000;return true;
}
export function drillChallenges(p,completed){
  return [
    {id:'survivor',name:'Stand Your Ground',done:completed&&p.deaths===0},
    {id:'precision',name:'No Wasted Rounds',done:completed&&p.shots>=8&&p.hits===p.shots},
    {id:'support',name:'Back Your Squad',done:completed&&(p.support||0)>=2}
  ];
}
