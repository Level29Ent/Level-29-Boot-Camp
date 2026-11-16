export function moutNavigation({course,position,lookYaw,rooms,state,cleared}){
  const pending=rooms.filter(r=>!cleared.some(c=>c.id===r.id));let target,text;
  if(!pending.length){target=course==='urban'?{x:0,y:3,z:-2}:{x:0,y:3,z:-29};text='EXTRACT';}
  else{
    const sameFloor=pending.filter(r=>Math.abs(r.y-position.y)<.5),room=(sameFloor.length?sameFloor:pending).slice().sort((a,b)=>Math.hypot((a.x??a.side*4.25)-position.x,a.z-position.z)-Math.hypot((b.x??b.side*4.25)-position.x,b.z-position.z))[0];
    if(course==='urban'&&room.y>position.y+.5){target=position.x>=7&&position.z<.3?{x:8,y:3,z:-6.7}:{x:8,y:0,z:1};text='STAIRS TO ROOF';}
    else if(course!=='urban'&&room.y>position.y+.5){target=position.y>.2?{x:0,y:3,z:-22}:{x:0,y:0,z:-16};text='RAMP TO UPPER DECK';}
    else{const entered=state.opened.has(room.id)||!room.door&&!room.side;target={x:entered?(room.x??room.side*4.25):(room.door?.x??room.side*1.5),y:room.y,z:entered?room.z:(room.door?.z??room.z)};text=room.id+' · '+(room.door||room.side?state.opened.has(room.id)?'CLEAR / ENTER':'BREACH':'CLEAR ROOF');}
  }
  const dx=target.x-position.x,dz=target.z-position.z,angle=Math.atan2(-dx,-dz)-lookYaw,relative=Math.atan2(Math.sin(angle),Math.cos(angle)),arrow=Math.abs(relative)<.4?'↑':Math.abs(relative)>2.6?'↓':relative>0?'←':'→';
  return {target,text:arrow+' '+text+' · '+Math.round(Math.hypot(dx,dz))+'m'+(target.y>position.y+.5?' · ABOVE':'')};
}
export function drawMoutMap(canvas,{course,position,yaw,rooms,cleared,opened,target}){
  const ctx=canvas.getContext('2d'),urban=course==='urban',bounds=urban?{x0:-10,x1:11,z0:-15,z1:10}:{x0:-9,x1:9,z0:-33,z1:10},s=canvas.width;
  const xy=(x,z)=>[(x-bounds.x0)/(bounds.x1-bounds.x0)*s,(z-bounds.z0)/(bounds.z1-bounds.z0)*s];
  ctx.fillStyle='#14241fe8';ctx.fillRect(0,0,s,s);ctx.strokeStyle='#b9bb9c';ctx.lineWidth=1;ctx.strokeRect(1,1,s-2,s-2);
  for(const r of rooms){const x=r.x??r.side*4.25,[cx,cz]=xy(x,r.z),w=urban?6:5.5,d=urban?12:8;
    ctx.strokeStyle=cleared.includes(r.id)?'#9deaab':opened.includes(r.id)?'#dfc476':'#b2beb4';ctx.strokeRect(cx-w/(bounds.x1-bounds.x0)*s/2,cz-d/(bounds.z1-bounds.z0)*s/2,w/(bounds.x1-bounds.x0)*s,d/(bounds.z1-bounds.z0)*s);ctx.fillStyle=ctx.strokeStyle;ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText(r.id,cx,cz+(urban&&r.y?15:0));}
  let [tx,tz]=xy(target.x,target.z);ctx.strokeStyle='#ffc95b';ctx.strokeRect(tx-4,tz-4,8,8);
  const [px,pz]=xy(position.x,position.z);ctx.save();ctx.translate(px,pz);ctx.rotate(-yaw);ctx.fillStyle='#96dfee';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4,4);ctx.lineTo(-4,4);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle='#dce7cf';ctx.font='9px sans-serif';ctx.textAlign='left';ctx.fillText(position.y>2.6?'UPPER / ROOF':'GROUND',5,s-6);
}
