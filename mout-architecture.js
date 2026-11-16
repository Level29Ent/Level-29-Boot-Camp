// Reference-inspired scenery stays outside the six-room drill's walkable bounds.
export const VILLAGE_BUILDINGS=[
  {x:-17,z:-4,w:9,d:9,floors:2,color:'#c9c4a4',roof:'#a4a79c',stairs:true},
  {x:17,z:-8,w:10,d:8,floors:3,color:'#dfd5b6',roof:'#9ba5a2'},
  {x:-18,z:-23,w:10,d:9,floors:3,color:'#ded8ba',roof:'#a5aaa1'},
  {x:18,z:-27,w:9,d:10,floors:2,color:'#c3b18d',roof:'#a3a6a0',stairs:true},
  {x:-30,z:-9,w:9,d:12,floors:1,color:'#d6cfad',roof:'#979f99'},
  {x:31,z:-15,w:11,d:11,floors:2,color:'#b18a71',roof:'#aaa594'},
  {x:-31,z:-32,w:12,d:10,floors:2,color:'#c5bf9f',roof:'#a0a79c'},
  {x:31,z:-35,w:10,d:11,floors:3,color:'#ded5bd',roof:'#a1a69b'},
  {x:-15,z:-44,w:10,d:9,floors:2,color:'#d4c8a6',roof:'#a4aca7'},
  {x:2,z:-46,w:11,d:10,floors:3,color:'#c7c0a0',roof:'#a1a9a5'},
  {x:18,z:-46,w:10,d:8,floors:1,color:'#be8c63',roof:'#9da39d'}
];
export const MOUT_SURVEY_VIEWS={
  village:{position:[33,25,30],target:[0,1,-17],label:'Training village · six marked drill rooms are playable; perimeter buildings are scenery.'},
  containers:{position:[12,10,12],target:[0,2,-11],label:'Container lane · ground rooms A1/B1/A2/B2, central ramp, upper rooms A3/B3.'},
  upper:{position:[13,13,-12],target:[0,3,-25],label:'Upper deck · use the central ramp and clear both upper rooms before extraction.'}
};
// Subtract rectangular openings from a facade. Same pieces can render walls and
// drive collision/ray occlusion, rather than black windows painted over solids.
export function facadeSections(width,height,openings=[]){
  const xs=[-width/2,width/2],ys=[0,height];
  for(const o of openings){xs.push(Math.max(-width/2,o.u-o.w/2),Math.min(width/2,o.u+o.w/2));ys.push(Math.max(0,o.y),Math.min(height,o.y+o.h));}
  const sort=values=>[...new Set(values)].sort((a,b)=>a-b),x=sort(xs),y=sort(ys),pieces=[];
  for(let i=0;i<x.length-1;i++)for(let j=0;j<y.length-1;j++){
    const u=(x[i]+x[i+1])/2,v=(y[j]+y[j+1])/2,w=x[i+1]-x[i],h=y[j+1]-y[j];
    if(w<=0||h<=0||openings.some(o=>u>o.u-o.w/2&&u<o.u+o.w/2&&v>o.y&&v<o.y+o.h))continue;
    pieces.push({u,y:v,w,h});
  }
  return pieces;
}
export const MOUT_WINDOW={u:0,y:1.1,w:1.1,h:1.05};
