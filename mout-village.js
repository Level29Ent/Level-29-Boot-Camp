import * as THREE from 'three';
import * as A from './art.js';
import {VILLAGE_BUILDINGS,facadeSections} from './mout-architecture.js';

export function villageTexture(kind){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const g=canvas.getContext('2d');
  const gravel=kind==='gravel';g.fillStyle=gravel?'#aaa58f':'#b6ac8d';g.fillRect(0,0,128,128);
  for(let i=0;i<(gravel?3500:1500);i++){
    const x=(i*73+Math.floor(i/128)*11)%128,y=(i*37+Math.floor(i/53)*19)%128;
    g.fillStyle=gravel?(i%3?'#bfb9a7':'#79796d'):(i%3?'#c8bea2':'#9b937d');g.fillRect(x,y,gravel?2:1,gravel?1:2);
  }
  if(!gravel){g.fillStyle='#8f8b7a';for(let i=0;i<7;i++)g.fillRect((i*23)%125,(i*47)%122,2,3);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(gravel?28:2,gravel?28:1);return texture;
}
export function buildMoutVillage(api,{materials,textures}){
  A.reseed(2916);
  const gravel=villageTexture('gravel');textures.push(gravel);
  const groundMaterial=new THREE.MeshStandardMaterial({color:'#d4cdb6',map:gravel,bumpMap:gravel,bumpScale:.06,roughness:1});materials.push(groundMaterial);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(125,145),groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.set(0,-.12,-25);ground.receiveShadow=true;api.world.add(ground);
  const b=new A.Builder();
  // Paved urban approaches, narrow gravel verges and worn centre lines.
  for(const x of [-9.5,9.5]){b.box(3.3,.04,67,'#777c77',x,-.075,-17);for(let z=10;z>-48;z-=5)b.box(.08,.015,2,'#d3cdb1',x,-.047,z);}
  for(const z of [8,-36]){b.box(79,.04,4.2,'#737b79',0,-.07,z);for(let x=-35;x<=35;x+=6)b.box(2,.015,.08,'#d3cdb1',x,-.04,z);}
  for(const side of [-1,1]){
    b.box(24,.04,4,'#7e8a57',side*26,-.065,15);
    for(const z of [4,-15,-34]){b.box(1,.5,.55,'#a7a692',side*10.9,.2,z);b.box(.12,1,.12,'#d5c382',side*10.9,.5,z+.8);}
  }
  // Recessed openings, coping, flat grey roofs and separate building silhouettes.
  for(const [index,house] of VILLAGE_BUILDINGS.entries()){
    const {x,z,w,d,floors,color,roof}=house,height=floors*3;
    b.box(w,.18,d,'#817c6b',x,-.02,z);
    for(let floor=0;floor<floors;floor++){
      const y=floor*3;
      b.box(w,.12,d,'#b5b0a0',x,y-.02,z);
      for(const face of ['front','back','left','right']){
        const span=face==='front'||face==='back'?w:d,openings=[];
        const count=Math.max(2,Math.floor(span/3));
        for(let i=0;i<count;i++){const u=-span/2+span*(i+1)/(count+1);openings.push({u,y:floor===0&&face==='front'&&i===0?0:1.1,w:1.1,h:floor===0&&face==='front'&&i===0?2.25:1.15});}
        for(const piece of facadeSections(span,2.92,openings)){
          if(face==='front'||face==='back')b.box(piece.w,piece.h,.25,color,x+piece.u,y+piece.y,z+(face==='front'?1:-1)*d/2);
          else b.box(.25,piece.h,piece.w,color,x+(face==='right'?1:-1)*w/2,y+piece.y,z+piece.u);
        }
        for(const opening of openings){
          const u=opening.u;
          if(face==='front'||face==='back'){
            b.box(1.35,.1,.42,'#a39d89',x+u,y+opening.y,z+(face==='front'?1:-1)*(d/2+.04));
            b.box(1.1,opening.h,.025,'#353a35',x+u,y+opening.y+opening.h/2,z+(face==='front'?1:-1)*(d/2-.42));
          }else{
            b.box(.42,.1,1.35,'#a39d89',x+(face==='right'?1:-1)*(w/2+.04),y+opening.y,z+u);
            b.box(.025,opening.h,1.1,'#353a35',x+(face==='right'?1:-1)*(w/2-.42),y+opening.y+opening.h/2,z+u);
          }
        }
      }
      // Vertical drain pipes and utility conduits on the visible facade.
      b.cyl(.045,.045,2.8,'#858b83',x+w/2-.6,y+1.4,z+d/2+.18,6);
      if(floor===0)b.box(.6,.65,.23,'#909a91',x+w/2-1.2,1.2,z+d/2+.25);
    }
    b.box(w+.35,.18,d+.35,roof,x,height,z);
    for(const side of [-1,1]){b.box(w+.35,.25,.15,'#cbc4ac',x,height+.15,z+side*(d/2+.1));b.box(.15,.25,d+.35,'#cbc4ac',x+side*(w/2+.1),height+.15,z);}
    b.box(1.3,.6,.9,'#9da7a0',x-w*.22,height+.36,z);b.cyl(.1,.1,.8,'#727e7b',x+w*.2,height+.45,z-.8,8);
    // Exterior staircase is scenery, outside the bounded drill route.
    if(house.stairs){const stairX=x+(x<0?1:-1)*(w/2+1.2),n=14;
      for(let i=0;i<n;i++)b.box(1.8,.12,.38,'#8d9792',stairX,.12+i*.21,z+d/2-i*.38);
      for(const side of [-1,1])for(let i=0;i<n;i+=3)b.box(.06,1.1,.06,'#697770',stairX+side*.85,.7+i*.21,z+d/2-i*.38);
      for(const side of [-1,1])b.box(.06,.06,6.1,'#697770',stairX+side*.85,2.05,z+d/2-2.5,Math.atan(.21/.38));
      b.box(2.2,.16,2,'#858f88',stairX,3,z-d/2+1);
    }
    if(index%3===0){for(let u=-w/2+.5;u<w/2;u+=1.4)b.box(.035,1,.035,'#697b75',x+u,height+.6,z+d/2+.15);b.box(w,.045,.045,'#697b75',x,height+1.08,z+d/2+.15);}
  }
  // A training-facility treeline rather than an empty backdrop.
  for(const side of [-1,1])for(let i=0;i<23;i++){
    const x=side*(45+(i%4)*3),z=18-i*3.8,h=8+i%5;
    b.cyl(.3,.5,h*.7,'#605e48',x,h*.35,z,7);
    b.ico(3.8,i%2?'#314e39':'#456044',x,h,z,1,1,1.25,1);b.ico(2.8,'#3e5c40',x+1.8,h+2,z-.7,1);
  }
  for(let i=0;i<23;i++){const x=-43+i*4,z=-61-i%3*2,h=9+i%4;b.cyl(.3,.45,7,'#625d46',x,3.5,z,7);b.ico(4,'#35533c',x,h,z,1,1,1.25,1);}
  // Storage barriers / traffic blocks remain well outside the live room entrances.
  for(const side of [-1,1])for(let z=0;z>-30;z-=8){b.box(1.4,.6,.6,'#b8ad8d',side*11.4,.3,z);for(let i=0;i<5;i++)b.box(.12,.25,.03,'#585d4b',side*11.4-.5+i*.24,.53,z+.32);}
  b.mesh(api.world);
}
