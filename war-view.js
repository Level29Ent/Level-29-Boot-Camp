import * as THREE from 'three';
import {WAR_COVER} from './rules.js';
const boxFor=(c,pad=0)=>new THREE.Box3(
  new THREE.Vector3(c.x-c.w/2-pad,-pad,c.z-c.d/2-pad),
  new THREE.Vector3(c.x+c.w/2+pad,c.h+pad,c.z+c.d/2+pad));
const cover=WAR_COVER.map(c=>boxFor(c)),cameraCover=WAR_COVER.map(c=>boxFor(c,.18));

export function thirdPersonView(position,yaw,pitch,aiming,crouch,players=[],ownId){
  const eye=position.clone().add(new THREE.Vector3(0,crouch?1.15:1.65,0));
  const direction=new THREE.Vector3(-Math.sin(yaw),Math.tan(.18-pitch),-Math.cos(yaw)).normalize();
  const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const desired=eye.clone().addScaledVector(direction,aiming?-2.2:-4.4).addScaledVector(right,aiming?.65:.95);
  desired.y=Math.max(.25,desired.y+(aiming?.15:.4));
  desired.x=THREE.MathUtils.clamp(desired.x,-22.8,22.8);
  desired.z=THREE.MathUtils.clamp(desired.z,-32.8,32.8);
  const offset=desired.clone().sub(eye),distance=offset.length(),ray=new THREE.Ray(eye,offset.normalize());
  let allowed=distance;
  for(const box of cameraCover){
    if(box.containsPoint(eye)){allowed=0;break;}
    const hit=ray.intersectBox(box,new THREE.Vector3());
    if(hit)allowed=Math.min(allowed,Math.max(0,eye.distanceTo(hit)-.08));
  }
  const camera=eye.clone().addScaledVector(ray.direction,allowed);
  camera.x=THREE.MathUtils.clamp(camera.x,-22.8,22.8);
  camera.z=THREE.MathUtils.clamp(camera.z,-32.8,32.8);
  camera.y=Math.max(.25,camera.y);
  // Aim along the centre reticle, then converge the server's eye-origin shot
  // onto that point. Cover is still authoritative: a shoulder camera can't
  // make the player's shot travel through the wall in front of their rifle.
  const aimRay=new THREE.Ray(camera,direction),target=camera.clone().addScaledVector(direction,90);
  let nearest=90;
  const targets=[...cover,...players.filter(p=>p.id!==ownId&&p.hp>0&&p.connected!==false).map(p=>new THREE.Box3(
    new THREE.Vector3(p.x-.4,p.y,p.z-.4),new THREE.Vector3(p.x+.4,p.y+(p.crouch?1.3:2),p.z+.4)))];
  for(const box of targets){
    const hit=aimRay.intersectBox(box,new THREE.Vector3());
    if(hit&&camera.distanceTo(hit)<nearest){nearest=camera.distanceTo(hit);target.copy(hit);}
  }
  const shot=target.clone().sub(eye);
  return {camera,target,direction,eye,hidePlayer:allowed<1,
    yaw:Math.atan2(-shot.x,-shot.z),pitch:Math.atan2(shot.y,Math.hypot(shot.x,shot.z)),fov:aiming?48:68};
}
