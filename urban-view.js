import * as THREE from 'three';
import * as A from './art.js';
import {URBAN_WALLS,URBAN_ROOMS} from './urban-block.js';
export function buildUrbanBlock(api,{materials,solids,doors,targets}){
  const wall=new THREE.MeshStandardMaterial({color:'#c7bea3',roughness:.94}),floor=new THREE.MeshStandardMaterial({color:'#ada994',roughness:1}),metal=new THREE.MeshStandardMaterial({color:'#64726b',metalness:.3,roughness:.8});
  materials.push(wall,floor,metal);
  const box=(w,h,d,mat,x,y,z,blocking=false)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;api.world.add(mesh);if(blocking)solids.push(mesh);return mesh;};
  box(16,.1,8,floor,1,-.1,4);box(12,.1,12,floor,0,-.06,-6);
  for(const w of URBAN_WALLS)box(w.w,w.h,w.d,wall,w.x,w.y,w.z,true);
  // Stair treads share the analytical 0.3m run / 0.15m rise of collision rules.
  const trim=new A.Builder();
  for(let i=0;i<20;i++){const y=i*.15;trim.box(2,.12,.3,'#8d958a',8,y-.06,-i*.3-.15);}
  trim.box(3.5,.16,1.7,'#8d958a',7.25,2.92,-6.85);
  for(const x of [7.05,8.95]){for(let i=0;i<=20;i+=2)trim.box(.05,1,.05,'#62766b',x,i*.15+.5,-i*.3);trim.box(.05,.05,Math.hypot(6,3),'#62766b',x,2,-3,Math.atan(.5));}
  for(const z of [-6.05,-7.65])trim.box(3,.05,.05,'#62766b',7.5,4,z);
  // Courtyard barriers and planters sit at the floor boundary, never in doorways.
  for(const x of [-4,0,4]){trim.ico(.5,'#58724e',x,.65,7.6,0,1.2,.6,.7);}
  for(const x of [-6,6])trim.box(.14,.2,12,'#9d9e8c',x,3.02,-6);
  trim.mesh(api.world);
  for(const room of URBAN_ROOMS){
    if(room.door){const d=room.door,mesh=box(d.w,2.4,.12,metal,d.x,1.2,d.z,true);doors.push({room,mesh,point:{x:d.x,y:0,z:d.z}});api.label(room.id+' / BREACH',d.x,2.6,.16,'#e8dcb3',1.7);}
    for(let i=0;i<3;i++){
      const friendly=i===2,point=friendly?{x:room.x,z:-6}:room.targets[i],mat=new THREE.MeshStandardMaterial({color:friendly?'#459bd1':'#d64c39',roughness:.9});materials.push(mat);
      const board=box(.68,1.35,.1,mat,point.x,room.y+1.23,point.z),head=box(.32,.32,.12,mat,point.x,room.y+2.05,point.z);
      box(.1,1,.12,metal,point.x,room.y+.25,point.z);
      const marker=api.label(friendly?'NO SHOOT':'THREAT',point.x,room.y+2.42,point.z+.09,friendly?'#98ddff':'#ffc18c',.95);
      targets.push({room,friendly,down:false,meshes:[board,head],marker});
    }
  }
  const extractMaterial=new THREE.MeshBasicMaterial({color:'#a0d8b0'});materials.push(extractMaterial);box(2,.035,2,extractMaterial,0,3.02,-2);
  api.label('ROOF / EXTRACTION',0,4.6,-1.2,'#bff0c5',3);
  api.label('URBAN BLOCK / TWO ROOMS + ROOFTOP',0,3.8,1,'#efdfb0',4.8);
  api.label('STAIRS →',7.8,1.5,1,'#f0d58e',1.8);api.label('COURTYARD',-4.5,.5,5,'#efdfb0',1.8);
}
