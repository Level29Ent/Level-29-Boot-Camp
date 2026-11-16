import {fail,newProfile,profileAction,createRoom,joinRoom,startRoom,tickRoom,acceptInput,publicRoom,settle,finite,refreshPresence} from './domain.js';
import {dropIntel} from '../../../operations.js';
export async function digest(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');}
const randomHex=length=>[...crypto.getRandomValues(new Uint8Array(length))].map(n=>n.toString(16).padStart(2,'0')).join('');
export class Database {
  constructor(url,key,fetcher=fetch){this.url=url;this.key=key;this.fetcher=fetcher;}
  async request(path,options={}){
    const response=await this.fetcher(this.url+'/rest/v1/'+path,{...options,headers:{apikey:this.key,...(this.key.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+this.key}),'Content-Type':'application/json',Prefer:'return=representation',...options.headers}});
    if(!response.ok)throw Object.assign(new Error('Database unavailable. Retry shortly; local play remains available.'),{status:503});
    return response.status===204?null:response.json();
  }
  async rate(bucket,limit,seconds){const ok=await this.request('rpc/bootcamp_rate',{method:'POST',body:JSON.stringify({p_bucket:bucket,p_limit:limit,p_seconds:seconds})});if(!ok)fail('Too many requests. Please wait before retrying.',429);}
  async get(table,key,value){return (await this.request(table+'?'+key+'=eq.'+encodeURIComponent(value)+'&select=*&limit=1'))[0];}
  async insert(table,row){return (await this.request(table,{method:'POST',body:JSON.stringify(row)}))[0];}
  async change(table,key,value,fn){
    for(let attempt=0;attempt<6;attempt++){
      const row=await this.get(table,key,value);if(!row)fail('Profile or room not found.',404);
      const result=await fn(row.data,row);
      const updated=await this.request(table+'?'+key+'=eq.'+encodeURIComponent(value)+'&version=eq.'+row.version,{method:'PATCH',body:JSON.stringify({data:row.data,version:row.version+1,...(table==='bootcamp_profiles'?{updated_at:new Date().toISOString()}: {})})});
      if(updated.length)return result;
    }
    fail('Room is busy. Please retry.',409);
  }
}
export function createService(db,{now=()=>Date.now()}={}){
  async function profileFor(token){
    if(typeof token!=='string'||!/^b29_[a-f0-9]{64}$/.test(token))fail('Create or restore a profile for this new server.',401);
    const row=await db.get('bootcamp_profiles','token_hash',await digest(token));if(!row)fail('Recovery code is not recognized by this new project. Create a new profile; previous-project codes cannot be migrated here.',401);
    return row;
  }
  async function changeProfile(id,fn,time){return db.change('bootcamp_profiles','id',id,p=>{fn(p);return {...p,serverNow:time};});}
  return async function service(action,payload={},token=''){
    const time=now();
    if(action==='health')return {ok:true,version:1,onlineWar:true,onlineObjectives:true,appearance:true,raceRewards:false};
    if(action==='register'){
      // Global anonymous signup ceiling is deliberately conservative for a new project.
      await db.rate('register-global',200,3600);
      const secret='b29_'+randomHex(32),id=crypto.randomUUID(),profile=newProfile(id,payload.name);
      await db.insert('bootcamp_profiles',{id,token_hash:await digest(secret),data:profile});return {token:secret,profile:{...profile,serverNow:time}};
    }
    const record=await profileFor(token),id=record.id;
    await db.rate('player:'+id,480,60);
    if(action==='profile')return {...record.data,serverNow:time};
    if(['rename','appearance','purchase','claim'].includes(action))return changeProfile(id,p=>profileAction(p,action,payload,time),time);
    const profile=record.data;
    if(action==='war_create'||action==='race_create'){
      await db.rate('rooms:'+id,12,3600);
      // Expired rooms are not usable, even if cleanup has not run yet.
      await db.request('bootcamp_rooms?expires_at=lt.'+encodeURIComponent(new Date(time).toISOString()),{method:'DELETE'});
      const code=randomHex(3).toUpperCase(),room=createRoom(code,profile,action==='war_create'?'war':'race',payload,time);
      await db.insert('bootcamp_rooms',{code,data:room,expires_at:new Date(time+3600000).toISOString()});return publicRoom(room,id,time);
    }
    let code=payload.code;
    if(action==='war_find'){
      const candidates=await db.request('bootcamp_rooms?expires_at=gt.'+encodeURIComponent(new Date(time).toISOString())+'&select=code,data&limit=40');
      code=candidates.find(r=>r.data.kind==='war'&&r.data.mode==='pvp'&&r.data.listed===true&&r.data.startsAt===null&&r.data.players.length<10)?.code;
      if(!code)fail('No public War lobby available. Host a PvP room instead.',404);
    }
    if(!['room_join','room_state','room_start','room_leave','war_input','race_move','war_find'].includes(action))fail('Unknown command.');
    if(typeof code!=='string'||! /^[A-F0-9]{6}$/.test(code))fail('Enter a six-character room code.');
    let completed=null;
    const result=await db.change('bootcamp_rooms','code',code,(room,row)=>{
      if(Date.parse(row.expires_at)<=time)fail('Room expired. Create another room.',410);
      refreshPresence(room,time);
      if(action==='room_join'||action==='war_find')joinRoom(room,profile,action==='war_find'?'war':payload.expectedKind,payload.role);
      let own=room.players.find(p=>p.id===id&&!p.bot);if(!own)fail('Join this room first.',403);
      tickRoom(room,time);
      if(action!=='room_leave'){own.lastSeen=Math.max(own.lastSeen||0,time);own.connected=true;refreshPresence(room,time);}
      own.name=profile.name;own.equipped=profile.equipped;own.xp=profile.xp;own.style=profile.style;
      if(action==='room_start')startRoom(room,id,time);
      if(action==='war_input'){
        if(room.kind!=='war')fail('This is not a War room.');acceptInput(room,id,payload,time);
      }
      if(action==='race_move'){
        if(room.kind!=='race')fail('This is not a race room.');
        // Legacy races send client positions. These remain explicitly UNRANKED,
        // never a source of authoritative cash/XP, daily eligibility or achievements.
        if(room.startsAt!==null&&!room.endedAt&&time>=room.startsAt){
          const elapsed=(time-room.startsAt)/1000,dt=Math.max(0,(time-(own.moveAt||room.startsAt))/1000);
          const x=finite(payload.x,-4.5,4.5,own.x),z=finite(payload.z,-10000,12,own.z);
          if(Math.hypot(x-own.x,z-own.z)<=Math.min(dt,.5)*10+1){own.x=x;own.y=finite(payload.y,0,6);own.z=z;own.rotation=finite(payload.rotation,-1000,1000);own.progress=finite(payload.progress,0,.999);if(payload.finished===true&&elapsed>10){own.finish??=elapsed;own.progress=1;}}
          own.moveAt=time;
        }
      }
      if(action==='room_leave'){
        if(!room.startsAt){room.players=room.players.filter(p=>p.id!==id);if(room.host===id)room.host=room.players[0]?.id||null;}
        else{own.connected=false;own.input={};dropIntel(room.objective,own);}
        completed=room.endedAt?room:null;return {ok:true};
      }
      completed=room.endedAt?room:null;return publicRoom(room,id,time);
    });
    if(completed)await changeProfile(id,p=>settle(p,completed,time),time);
    return result;
  };
}
export function createHandler(service,{origins=['https://level29ent.github.io'],bodyLimit=16384}={}){
  return async request=>{
    const origin=request.headers.get('Origin');
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
    if(origin&&!origins.includes(origin))return new Response(JSON.stringify({error:'This game origin is not allowed.'}),{status:403,headers});
    if(origin)headers['Access-Control-Allow-Origin']=origin;
    headers['Access-Control-Allow-Headers']='content-type';headers['Access-Control-Allow-Methods']='POST, OPTIONS';
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return new Response(JSON.stringify({error:'POST required.'}),{status:405,headers});
    try{
      if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))fail('JSON required.',415);
      if(Number(request.headers.get('Content-Length'))>bodyLimit)fail('Request too large.',413);
      const reader=request.body?.getReader();if(!reader)fail('JSON required.');
      let size=0;const chunks=[];while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>bodyLimit){await reader.cancel();fail('Request too large.',413);}chunks.push(value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{fail('Invalid JSON.');}
      if(!body||typeof body.action!=='string'||body.action.length>40||body.payload!==undefined&&(!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload)))fail('Invalid command.');
      const result=await service(body.action,body.payload||{},body.token);return new Response(JSON.stringify(result),{headers});
    }catch(error){const status=Number.isInteger(error.status)?error.status:500;return new Response(JSON.stringify({error:status===500?'Server error. Local play remains available.':error.message}),{status,headers});}
  };
}
