const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');const root=process.cwd();const threeRoot=require('node:path').resolve(require('node:path').dirname(require.resolve('three')),'..');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>{const url=r.request().url();if(url.includes('cdn.jsdelivr.net/npm/three@0.160.0/'))return r.fulfill({path:threeRoot+'/' +url.split('three@0.160.0/')[1],headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/javascript'});
if(url.endsWith('/game.js'))return r.fulfill({body:fs.readFileSync(root+'/game.js','utf8').replaceAll('renderer.render(scene,camera)','void 0').replace("new THREE.WebGLRenderer({canvas:$('c'),antialias:true})","({setPixelRatio(){},setSize(){},shadowMap:{},info:{render:{calls:0,triangles:0}}})").replace('window.appReady=true;',"window.__traverse={get obstacles(){return obstacles},get mantle(){return mantle},get grounded(){return grounded},aimRange(){const t=targets.find(t=>!t.done);if(!t)return;const d=t.bull.getWorldPosition(new THREE.Vector3()).sub(camera.position).normalize();rangeX=Math.atan2(d.x,-d.z);rangeY=Math.asin(d.y);}};window.appReady=true;"),contentType:'application/javascript'});
if(!url.startsWith('http://127.0.0.1:8080'))return r.abort();return r.continue();});
await page.goto('http://127.0.0.1:8080',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.appReady,null,{polling:100});
const result=await page.evaluate(()=>{
 const outcomes=[],key=(k,value)=>window.simulateInput(k,!!value),frame=()=>window.advanceTime(1000/60,false),state=()=>JSON.parse(window.render_game_to_text());
 const clear=()=>{for(const k of ['w','a','s','d',' ','c','j','k','e','shift'])key(k,false);};
 for(const level of Array.from({length:100},(_,i)=>i)){
  window.__qa.brief(level);window.__qa.begin();clear();let iteration=0,lastCommand='',fire=false;
  while(window.__qa.mode==='playing'&&iteration++<18000){
   const q=window.__qa,p=q.player.position,s=state(),kind=s.kind;let tx=s.objective?.x||0,tz=s.objective?.z??p.z,jump=false,crouch=false;
   if(kind==='drill'){
    clear();if(s.command&&s.command!==lastCommand){const commands={'LEFT FACE':'a','RIGHT FACE':'d','ABOUT FACE':'s','ATTENTION':'e'};key(commands[s.command],true);lastCommand=s.command;}else if(!s.command)lastCommand='';frame();continue;
   }
   if(kind==='range'){
    clear();key('shift',true);frame();window.__traverse.aimRange();key('j',true);frame();key('j',false);continue;
   }
   if(kind==='combat'){
    key('k',true);key('w',p.z>1);key('s',false);fire=iteration%45===0;key('j',fire);frame();continue;
   }
   if(q.station){
    clear();key('shift',true);frame();const target=q.station.c.targets.find(t=>!t.done&&!t.friendly&&!(t.kind==='popup'&&t.g.rotation.x<-.35));
    if(target){q.aimAt(target);key('j',true);frame();key('j',false);}continue;
   }
   if(kind==='swim')jump=true;
   for(const zone of q.zones){
    if(p.z>zone.z0+3||p.z<zone.z1)continue;
    if(zone.type==='pit'&&p.z<=zone.z0+1.5)jump=true;
    if(zone.type==='bars'){jump=true;tx=0;}
    if(zone.type==='beam')tx=zone.bx;
    if(zone.type==='mines'){
     const dz=Math.max(0,zone.z0-p.z+.7),i=Math.min(zone.lanes.length-1,Math.floor(dz/zone.band)),f=Math.max(0,Math.min(1,(dz-i*zone.band)/2.2));tx=i===0?zone.lanes[0]:zone.lanes[i-1]+(zone.lanes[i]-zone.lanes[i-1])*f;
    }
    if(['bars','beam','mines'].includes(zone.type))break;
   }
   const nearBlocks=window.__traverse.obstacles.filter(o=>o.type==='block'&&!q.zones.some(z=>p.z<=z.z0&&p.z>=z.z1&&['bars','beam','mines'].includes(z.type))&&/Weave/.test(s.objective?.text||'')&&p.z-o.z>-.8&&p.z-o.z<7).sort((a,b)=>Math.abs(p.z-a.z)-Math.abs(p.z-b.z));if(nearBlocks.length)tx=nearBlocks[0].x>0?-3.8:3.8;
   for(const obstacle of window.__traverse.obstacles){
    const d=p.z-obstacle.z;
    
    if(Math.abs(p.x-obstacle.x)>obstacle.w/2+.3)continue;
    if(obstacle.type==='crawl'&&Math.abs(d)<4)crouch=true;
    if((obstacle.type==='wall'||obstacle.type==='climb')&&d>.2&&d<3)jump=true;
   }
   if(window.__traverse.mantle)jump=true;
   const dist=Math.hypot(tx-p.x,tz-p.z),use=dist<1.6;
   const block=nearBlocks[0],needStrafe=(block&&p.z-block.z>.8&&p.z-block.z<4&&Math.abs(p.x-tx)>.3)||q.zones.some(z=>['beam','bars'].includes(z.type)&&p.z>z.z0&&p.z<z.z0+3&&Math.abs(p.x)>.2&&!q.zones.some(a=>a!==z&&p.z<=a.z0&&p.z>=a.z1));
   if(jump&&!window.__traverse.mantle&&window.__traverse.grounded&&!q.zones.some(z=>z.type==='bars'&&p.z<z.z0+2&&p.z>z.z1))key(' ',false);
   key('e',use);key('shift',kind!=='swim');key('c',crouch);key(' ',jump);
   key('a',p.x>tx+.12);key('d',p.x<tx-.12);key('w',p.z>tz+.12&&!needStrafe);key('s',p.z<tz-.12);frame();
  }
  clear();const s=state();outcomes.push({level:level+1,mode:window.__qa.mode,success:s.completed.includes(level+1),time:s.time,stage:s.stage,objective:s.objective,player:s.player,iterations:iteration});
 }
 return outcomes;
});
console.log(JSON.stringify({passed:result.filter(r=>r.success).length,total:result.length,failed:result.filter(r=>!r.success)},null,2));assert.deepEqual(errors,[]);const failed=result.filter(r=>!r.success);assert.equal(failed.length,0,JSON.stringify(failed));console.log('Passed',result.length-failed.length,'/',result.length,'full routes via movement/shooting inputs; no position teleport. Renderer stub, heading/aim/time controlled by harness.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
