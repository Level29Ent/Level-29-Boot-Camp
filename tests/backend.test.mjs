import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,profileAction,createRoom,startRoom,joinRoom,acceptInput,tickRoom,publicRoom,settle,rayBox} from '../supabase/functions/bootcamp-command/domain.js';
import {createService,createHandler,digest,Database} from '../supabase/functions/bootcamp-command/service.js';
const p=(id='you')=>newProfile(id,'Recruit');
class MemoryDB{
  tables=new Map();rates=new Map();
  async get(table,key,value){return structuredClone([...(this.tables.get(table)||[])].find(r=>r[key]===value));}
  async insert(table,row){if(!this.tables.has(table))this.tables.set(table,[]);this.tables.get(table).push(structuredClone(row));return row;}
  async change(table,key,value,fn){const row=this.tables.get(table)?.find(r=>r[key]===value);if(!row)throw Object.assign(Error('Not found'),{status:404});return fn(row.data,row);}
  async rate(bucket,limit){const n=(this.rates.get(bucket)||0)+1;this.rates.set(bucket,n);if(n>limit)throw Object.assign(Error('Too many'),{status:429});}
  async request(path,options){if(options?.method==='DELETE')return [];return this.tables.get('bootcamp_rooms')||[];}
}
test('registration returns private code once, stores only hash and restores identical profile',async()=>{
  const db=new MemoryDB(),service=createService(db,{now:()=>10000}),r=await service('register',{name:'Alpha'});
  assert.match(r.token,/^b29_[a-f0-9]{64}$/);const row=db.tables.get('bootcamp_profiles')[0];assert.equal(row.token_hash,await digest(r.token));
  assert.equal(JSON.stringify(row).includes(r.token),false);
  assert.equal((await service('profile',{},r.token)).id,r.profile.id);
  await assert.rejects(service('profile',{},'old-server-code'),e=>e.status===401);
  await assert.rejects(service('profile',{},'b29_'+'0'.repeat(64)),e=>e.status===401);
});
test('rename, purchases and claims reject injected balances and invalid IDs',()=>{
  const profile=p();profileAction(profile,'rename',{name:'Ace',cash:100000,xp:99999},0);assert.equal(profile.cash,0);assert.equal(profile.xp,0);
  assert.throws(()=>profileAction(profile,'purchase',{id:'elite'},0));
  assert.throws(()=>profileAction(profile,'claim',{kind:'daily'},0));
  assert.throws(()=>profileAction(profile,'appearance',{style:'<script>'},0));
  profileAction(profile,'appearance',{style:'level29-jester'},0);assert.equal(profile.style,'level29-jester');
  profile.cash=250;profileAction(profile,'purchase',{id:'bronze'},0);profileAction(profile,'purchase',{id:'bronze'},0);assert.equal(profile.cash,0);assert.equal(profile.inventory.filter(i=>i==='bronze').length,1);
});
test('two profiles create/join/deploy room; only host can deploy and snapshots never leak authentication',async()=>{
  const db=new MemoryDB();let time=10000;const service=createService(db,{now:()=>time});
  const a=await service('register',{name:'Alpha'}),b=await service('register',{name:'Bravo'});
  await service('appearance',{style:'level29-jester'},a.token);
  const room=await service('war_create',{mode:'pvp'},a.token);
  await assert.rejects(service('room_state',{code:room.code},b.token),e=>e.status===403);
  const joined=await service('room_join',{code:room.code,expectedKind:'war'},b.token);assert.equal(joined.players.length,2);assert.equal(joined.players[0].style,'level29-jester');
  await assert.rejects(service('room_start',{code:room.code},b.token),e=>e.status===403);
  const live=await service('room_start',{code:room.code},a.token);assert.equal(live.players.length,10);assert.equal(live.startsAt,13000);
  const serialized=JSON.stringify(live);for(const secret of [a.token,b.token,'token_hash','inputAt','shotAt'])assert.equal(serialized.includes(secret),false);
  const c=await service('register',{name:'Charlie'});await assert.rejects(service('room_join',{code:room.code,expectedKind:'war'},c.token));
});
test('server clamps movement, ignores client hp/kills/cash and stale sequence numbers',()=>{
  const room=createRoom('ABCDEF',p(),'war',{},0);startRoom(room,'you',0);
  tickRoom(room,3100);const own=room.players[0],x=own.x;
  acceptInput(room,'you',{seq:1,dx:999999,x:99999,hp:99999,kills:50,cash:10000},3100);tickRoom(room,3300);
  assert.ok(own.x-x<=4.5*.2+.001);assert.equal(own.hp<=100,true);assert.equal(own.kills,0);
  acceptInput(room,'you',{seq:0,dx:-1},3300);assert.equal(own.input.dx,1);
  const before=own.x;tickRoom(room,50000);assert.equal(own.x,before);
});
test('cover occludes shooting ray and ray slab math handles parallel rays',()=>{
  const min={x:-1,y:0,z:-1},max={x:1,y:3,z:1};
  assert.equal(rayBox({x:0,y:1,z:5},{x:0,y:0,z:-1},min,max),4);
  assert.equal(rayBox({x:3,y:1,z:5},{x:0,y:0,z:-1},min,max),Infinity);
  const room=createRoom('ABCDEF',p(),'war',{},0);startRoom(room,'you',0);
  room.players=room.players.slice(0,2);room.players[1].team='red';room.players[0].x=room.players[1].x=0;room.players[0].z=10;room.players[1].z=-10;room.players[1].bot=false;
  tickRoom(room,3100);acceptInput(room,'you',{seq:1,fire:true,yaw:0,pitch:0},3100);tickRoom(room,3200);assert.equal(room.players[1].hp,100);
});
test('settlement requires server-ended War and 20 active seconds; rewards/claims idempotent',()=>{
  const profile=p(),room=createRoom('ABCDEF',profile,'war',{},0);startRoom(room,'you',0);room.players[0].active=19;room.endedAt=183000;room.scores.blue=1;
  settle(profile,room,183000);assert.equal(profile.cash,0);room.players[0].active=20;
  settle(profile,room,183000);settle(profile,room,183000);assert.equal(profile.cash,100);assert.equal(profile.xp,100);assert.equal(profile.stats.games,1);assert.equal(profile.daily.eligible,true);
  profileAction(profile,'claim',{kind:'daily'},183000);profileAction(profile,'claim',{kind:'daily'},183000);assert.equal(profile.cash,200);
  const race=createRoom('123456',profile,'race',{},0);race.endedAt=63000;race.players[0].active=60;settle(profile,race,63000);assert.equal(profile.cash,200);
});
test('new objective modes and roles work in server snapshots, not just local practice',()=>{
  for(const operation of ['elimination','zones','intel','escort','crucible']){
    const room=createRoom('ABCDEF',p(),'war',{operation,role:'scout'},0);startRoom(room,'you',0);tickRoom(room,3100);
    acceptInput(room,'you',{seq:1,ability:true},3100);tickRoom(room,3200);
    const snapshot=publicRoom(room,'you',3200);assert.equal(snapshot.objective.id,operation);assert.equal(snapshot.players[0].role,'scout');assert.ok(snapshot.players[0].revealUntil>3200);
  }
});
test('private lobbies are not returned by public matchmaking',async()=>{
  const db=new MemoryDB(),service=createService(db,{now:()=>10000}),a=await service('register',{name:'Alpha'}),b=await service('register',{name:'Bravo'});
  await service('war_create',{mode:'pvp'},a.token);await assert.rejects(service('war_find',{},b.token),e=>e.status===404);
  const visible=await service('war_create',{mode:'pvp',public:true},a.token);const joined=await service('war_find',{},b.token);assert.equal(joined.code,visible.code);
});
test('HTTP boundary validates origin, methods, JSON, payload size and hides unexpected errors',async()=>{
  const handler=createHandler(async()=>{throw Error('private database credential must not leak');});
  const request=(body,headers={})=>new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
  assert.equal((await handler(request('{}',{Origin:'https://attacker.test'}))).status,403);
  assert.equal((await handler(new Request('https://example.test',{method:'GET'}))).status,405);
  assert.equal((await handler(request('{bad'))).status,400);
  assert.equal((await handler(request(JSON.stringify({action:'register',payload:[]})))).status,400);
  assert.equal((await handler(request('x'.repeat(17000)))).status,413);
  const response=await handler(request('{"action":"health"}',{Origin:'https://level29ent.github.io'}));assert.equal(response.status,500);assert.equal((await response.text()).includes('credential'),false);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://level29ent.github.io');
});
test('database CAS retries on conflicts rather than overwriting concurrent updates',async()=>{
  let version=0,cash=0,patches=0;
  const db=new Database('https://example.test','not-a-real-test-key',async(url,options)=>{
    if(options.method==='PATCH'){
      patches++;if(patches===1){version++;cash=50;return Response.json([]);}
      const next=JSON.parse(options.body);cash=next.data.cash;version=next.version;return Response.json([next]);
    }
    return Response.json([{id:'you',version,data:{cash}}]);
  });
  const result=await db.change('bootcamp_profiles','id','you',data=>{data.cash+=10;return data.cash;});assert.equal(result,60);assert.equal(patches,2);assert.equal(cash,60);
});

test('stale concurrent ticks cannot rewind a room or double-simulate active time',()=>{
  const room=createRoom('ABCDEF',p(),'war',{},0);startRoom(room,'you',0);tickRoom(room,3100);
  acceptInput(room,'you',{seq:1,dx:1},3100);tickRoom(room,3300);const {active,x}=room.players[0];
  tickRoom(room,3200);assert.equal(room.lastTick,3300);tickRoom(room,3300);assert.equal(room.players[0].active,active);assert.equal(room.players[0].x,x);
});
test('race starts at the client starting line, supports movement but never mints rewards',async()=>{
  let time=10000;const db=new MemoryDB(),service=createService(db,{now:()=>time}),a=await service('register',{name:'Runner'});
  const lobby=await service('race_create',{course:4},a.token);await service('room_start',{code:lobby.code},a.token);time=13200;
  const live=await service('race_move',{code:lobby.code,x:0,z:6,y:0,progress:.01},a.token);assert.equal(live.players[0].z,6);
  time=74000;await service('room_state',{code:lobby.code},a.token);const profile=await service('profile',{},a.token);assert.equal(profile.cash,0);assert.equal(profile.xp,0);assert.equal(profile.daily.eligible,undefined);
});
test('co-op-only objective modes cannot be started as PvP and joiners choose validated roles',()=>{
  assert.throws(()=>createRoom('ABCDEF',p(),'war',{mode:'pvp',operation:'crucible'},0));
  const room=createRoom('ABCDEF',p(),'war',{mode:'pve',operation:'escort'},0);joinRoom(room,p('friend'),'war','medic');assert.equal(room.players[1].role,'medic');
});
test('recovery codes fit UI inputs and project switch preserves old stored identity',async()=>{
  const {readFile}=await import('node:fs/promises');const html=await readFile('index.html','utf8');
  for(const id of ['loginCode','passportInput'])assert.ok(Number(html.match(new RegExp('id="'+id+'"[^>]*maxlength="(\\d+)"'))[1])>=68);
  const previous=globalThis.localStorage,values=new Map([['b29:remembered-passport:v1','old-private-code']]);
  globalThis.localStorage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  try{const save=await import('../player-save.js');assert.equal(save.rememberedPassport(),'');save.rememberPassport('new-code');assert.equal(values.get('b29:remembered-passport:v1'),'old-private-code');assert.equal(save.rememberedPassport(),'new-code');}finally{globalThis.localStorage=previous;}
});
test('reconnecting player resumes input sequence without 20-second control lockout',()=>{
  const room=createRoom('ABCDEF',p(),'war',{},0);startRoom(room,'you',0);tickRoom(room,3100);
  acceptInput(room,'you',{seq:500,dx:1},3100);const snapshot=publicRoom(room,'you',3100);assert.equal(snapshot.nextSeq,501);
  acceptInput(room,'you',{seq:snapshot.nextSeq+1,dx:-1},3200);assert.equal(room.players[0].input.dx,-1);
});
