import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Shared cloth textures/materials survive character swaps like the base atlas.
const textures=new Map(),materials=new Map();
function fabric(kind){
  if(textures.has(kind))return textures.get(kind);
  const size=64,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;
    const grain=((x*17+y*31+x*y*7)%19)/19;
    const value=kind==='Knit'?(x%8<3?190:90)+(y%4)*8:kind==='Hair'?100+(x%5)*23:kind==='Plush'?110+grain*110:135+((x+y)%2)*35+grain*25;
    data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(kind==='Knit'?3:5,5);texture.needsUpdate=true;textures.set(kind,texture);return texture;
}
function material(color,kind){
  const key=color+kind;if(materials.has(key))return materials.get(key);
  const m=new THREE.MeshStandardMaterial({color,roughness:kind==='Hair'?.65:.94,metalness:0,
    bumpMap:fabric(kind),bumpScale:kind==='Plush'?.025:kind==='Knit'?.018:.008});
  m.userData.keep=true;materials.set(key,m);return m;
}

// Batch each attachment by material: rounded clothing, smooth crowns and soft
// mascot features, without adding a draw call per stitch/ear/pocket.
export function addWearables(model,style){
  const {base,accent}=style.palette,{kind,material:finish}=style.pattern;
  const body=model.userData.body,parts=[];
  const batches=new Map();
  function shape(parent,geometry,color,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,type=finish){
    geometry.scale(sx,sy,sz);geometry.rotateX(rx);geometry.rotateY(ry);geometry.rotateZ(rz);geometry.translate(x,y,z);
    const key=parent.uuid+color+type;
    if(!batches.has(key))batches.set(key,{parent,color,type,geometries:[]});
    batches.get(key).geometries.push(geometry.index?geometry.toNonIndexed():geometry);
    if(geometry.index)geometry.dispose();
  }
  const ball=(p,c,x,y,z,sx,sy,sz,type=finish)=>shape(p,new THREE.SphereGeometry(1,16,12),c,x,y,z,sx,sy,sz,0,0,0,type);
  function rounded(p,c,x,y,z,w,h,d,r=.04,type=finish){
    const s=new THREE.Shape(),a=-w/2,b=-h/2;
    s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);
    s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);
    s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);
    const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,steps:1,curveSegments:4});
    g.translate(0,0,-d/2);shape(p,g,c,x,y,z,1,1,1,0,0,0,type);
  }
  function crown(color,height=.18){
    shape(body,new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI/2),color,0,2.04,0,.205,height,.205);
  }
  function torso(plush=false){
    rounded(body,base,0,1.4,0,.57,.57,.36,.08);
    // Upper sleeves are attached to upper arms; long sleeves to forearms too.
    for(const i of [0,2]){
      const arm=model.userData.limbs[i];rounded(arm,base,0,-.1,0,.2,.32,.215,.045);
      if(kind!=='shirt')rounded(model.userData.fore[i===0?0:1],base,0,-.12,0,.155,.29,.16,.035);
      rounded(arm,accent,0,-.24,-.005,.17,.045,.18,.015);
    }
    if(plush){
      ball(body,accent,0,1.4,-.21,.21,.25,.04);
      rounded(body,base,0,1.02,0,.5,.23,.33,.045);
      for(const i of [1,3]){
        rounded(model.userData.limbs[i],base,0,-.21,0,.24,.49,.27,.045);
        const shin=model.userData.shin[i===1?0:1];
        rounded(shin,base,0,-.15,0,.23,.38,.26,.04);
        rounded(shin,base,0,-.4,-.06,.26,.23,.42,.06);
      }
      for(const fore of model.userData.fore)ball(fore,base,0,-.29,-.02,.115,.12,.12);
    }
  }
  if(kind==='cap'){
    crown(base,.19);ball(body,accent,0,2.06,-.235,.23,.018,.17);
    rounded(body,accent,0,2.12,-.19,.085,.055,.015,.015);
    for(let i=0;i<6;i++)shape(body,new THREE.TorusGeometry(.203,.003,4,24,Math.PI/2),accent,0,2.04,0,1,1,1,0,i*Math.PI/3,Math.PI/2);
    ball(body,accent,0,2.235,0,.025,.015,.025);
  }else if(kind==='boonie'){
    shape(body,new THREE.CylinderGeometry(.18,.21,.18,24),base,0,2.12,0);
    shape(body,new THREE.CylinderGeometry(.32,.32,.025,32),base,0,2.035,0,1,1,.9);
    shape(body,new THREE.TorusGeometry(.205,.022,8,24),accent,0,2.07,0,1,1,1,Math.PI/2);
    for(const side of [-1,1])shape(body,new THREE.CylinderGeometry(.004,.004,.32,5),accent,side*.17,1.88,.02);
  }else if(kind==='beanie'){
    crown(base,.28);
    shape(body,new THREE.CylinderGeometry(.213,.213,.09,24),accent,0,2.055,0);
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12;shape(body,new THREE.CylinderGeometry(.004,.004,.09,4),base,Math.sin(a)*.215,2.055,Math.cos(a)*.215);
    }
    ball(body,accent,0,2.335,0,.065,.055,.065);
  }else if(kind==='curls'){
    crown(base,.15);
    for(let row=0;row<3;row++)for(let i=0;i<10;i++){
      const a=i*Math.PI/5+row*.2;ball(body,base,Math.sin(a)*(.15-row*.025),2.04+row*.065,Math.cos(a)*(.15-row*.025),.068,.063,.063);
    }
  }else if(kind==='ponytail'){
    crown(base,.14);ball(body,base,0,1.99,.14,.17,.17,.07);
    ball(body,accent,0,2.06,.23,.07,.06,.06);
    ball(body,base,0,1.93,.3,.095,.19,.09);ball(body,base,.025,1.72,.33,.08,.13,.075);
  }else if(kind==='mohawk'){
    for(let i=0;i<7;i++){
      const z=-.16+i*.05,h=.14+Math.sin(i/6*Math.PI)*.12;
      shape(body,new THREE.ConeGeometry(.065,h,8),accent,0,2.08+h/2,z,1,1,.7);
    }
  }else if(kind==='shirt'){
    torso();shape(body,new THREE.TorusGeometry(.09,.018,8,24),accent,0,1.7,-.015,1,.55,1,Math.PI/2);
    rounded(body,accent,-.14,1.53,-.205,.12,.12,.012,.02);
    rounded(body,accent,0,1.15,-.19,.49,.025,.012,.008);
  }else if(kind==='hoodie'){
    torso();ball(body,base,0,1.65,.16,.245,.14,.18);
    // Resting hood drapes behind the collar, leaving the face unobstructed.
    shape(body,new THREE.TorusGeometry(.2,.045,10,24,Math.PI),accent,0,1.72,.015,1,1,1,Math.PI/2);
    rounded(body,accent,0,1.27,-.217,.33,.14,.025,.045);
    for(const side of [-1,1])shape(body,new THREE.CylinderGeometry(.006,.006,.24,6),accent,side*.075,1.58,-.22);
    shape(body,new THREE.CylinderGeometry(.08,.08,.05,20),accent,0,1.14,0,3,1,2.3);
  }else if(kind==='bear'||kind==='fox'){
    torso(true);ball(body,base,0,2.02,0,.29,.29,.27);
    ball(body,accent,0,1.94,-.245,.19,.12,.085);
    for(const side of [-1,1]){
      if(kind==='bear'){
        ball(body,base,side*.22,2.25,.01,.105,.11,.07);
        ball(body,accent,side*.22,2.25,-.055,.062,.065,.018);
      }else{
        shape(body,new THREE.ConeGeometry(.115,.28,12),base,side*.2,2.3,0,1,1,.65,0,0,-side*.2);
        shape(body,new THREE.ConeGeometry(.062,.17,10),accent,side*.2,2.31,-.065,1,1,.2);
      }
      ball(body,'#141c17',side*.105,2.06,-.25,.027,.035,.016,'Hair');
      ball(body,'#ffffff',side*.11,2.07,-.268,.007,.008,.004,'Hair');
    }
    ball(body,'#171d19',0,1.98,-.326,.045,.027,.025,'Hair');
    if(kind==='fox'){
      ball(body,base,0,1.15,.35,.13,.31,.13);ball(body,accent,0,1.36,.4,.105,.14,.09);
    }else ball(body,base,0,1.1,.25,.09,.09,.08);
  }
  for(const {parent,color,type,geometries} of batches.values()){
    const geometry=mergeGeometries(geometries);for(const g of geometries)g.dispose();
    const mesh=new THREE.Mesh(geometry,material(color,type));mesh.castShadow=mesh.receiveShadow=true;
    parent.add(mesh);parts.push(mesh);
  }
  return parts;
}
