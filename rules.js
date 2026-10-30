export const ACHIEVEMENTS=[
  {id:'first_deployment',name:'First Deployment',desc:'Complete your first eligible match.',metric:'games',goal:1,cash:100},
  {id:'finish_line',name:'Finish Line',desc:'Finish one obstacle race.',metric:'raceFinishes',goal:1,cash:150},
  {id:'victory',name:'Victory Is Earned',desc:'Win a race or war match.',metric:'wins',goal:1,cash:200},
  {id:'regular',name:'Boots on the Ground',desc:'Complete five matches.',metric:'games',goal:5,cash:250},
  {id:'racer',name:'Course Veteran',desc:'Complete ten obstacle races.',metric:'races',goal:10,cash:350},
  {id:'first_war',name:'Squad Ready',desc:'Complete one 5v5 war match.',metric:'warMatches',goal:1,cash:150},
  {id:'marksman',name:'Marksman',desc:'Earn ten war eliminations.',metric:'kills',goal:10,cash:300},
  {id:'squad_leader',name:'Squad Leader',desc:'Win five war matches.',metric:'warWins',goal:5,cash:500},
  {id:'veteran',name:'Field Veteran',desc:'Complete twenty-five matches.',metric:'games',goal:25,cash:750},
  {id:'centurion',name:'Centurion',desc:'Earn one hundred war eliminations.',metric:'kills',goal:100,cash:1000},
  {id:'daily_duty',name:'Daily Duty',desc:'Claim seven daily play bonuses.',metric:'dailyClaims',goal:7,cash:500},
  {id:'champion',name:'Race Champion',desc:'Win ten obstacle races.',metric:'raceWins',goal:10,cash:750}
];
const CHALLENGES=[
  {id:'deploy',name:'Double Deployment',desc:'Complete two matches today.',metric:'games',goal:2,cash:150},
  {id:'finish',name:'Bring It Home',desc:'Finish an obstacle race today.',metric:'raceFinishes',goal:1,cash:150},
  {id:'eliminate',name:'On Target',desc:'Earn five war eliminations today.',metric:'kills',goal:5,cash:200},
  {id:'winner',name:'Victory Orders',desc:'Win any match today.',metric:'wins',goal:1,cash:200},
  {id:'war_duty',name:'War Duty',desc:'Complete two war matches today.',metric:'warMatches',goal:2,cash:200},
  {id:'race_duty',name:'On the Double',desc:'Complete three races today.',metric:'races',goal:3,cash:200}
];
export const dayKey=(now=Date.now())=>new Date(now).toISOString().slice(0,10);
export function dailyChallenges(date=dayKey()){
  const d=Math.floor(Date.parse(date+'T00:00:00Z')/86400000)%2;
  return CHALLENGES.filter((_,i)=>i%2===d);
}
export const COSMETICS=[
  {id:'recruit',name:'Recruit',desc:'Standard issue identification.',price:0,color:'#f0ddaa'},
  {id:'bronze',name:'Bronze Operator',desc:'Bronze field title and nameplate.',price:250,color:'#edb67d'},
  {id:'arctic',name:'Arctic Ghost',desc:'Ice-blue title and nameplate.',price:600,color:'#8bdbff'},
  {id:'elite',name:'Gold Battalion',desc:'Gold title and nameplate.',price:1500,color:'#ffc72c'}
];
// Cover and collision layout is shared by renderer and authoritative simulation.
export const WAR_COVER=[
  {x:-10,z:17,w:7,d:2,h:2.6},{x:10,z:17,w:7,d:2,h:2.6},
  {x:-10,z:-17,w:7,d:2,h:2.6},{x:10,z:-17,w:7,d:2,h:2.6},
  {x:0,z:0,w:6,d:8,h:3.4},{x:-15,z:0,w:3,d:8,h:2.4},{x:15,z:0,w:3,d:8,h:2.4},
  {x:-6,z:8,w:2,d:3,h:1.3},{x:6,z:-8,w:2,d:3,h:1.3},
  {x:7,z:5,w:3,d:2,h:1.3},{x:-7,z:-5,w:3,d:2,h:1.3}
];
export const WAR_DURATION=180;
export const WAR_TARGET=30;
export const RANKS=['Recruit','Private','Lance Corporal','Corporal','Sergeant','Staff Sergeant','Gunnery Sergeant','Master Sergeant','Sergeant Major','Command'];
export function rankFor(xp){return RANKS[Math.min(RANKS.length-1,Math.floor(xp/1000))];}
