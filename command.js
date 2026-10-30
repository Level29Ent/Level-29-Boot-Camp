import {cloud} from './cloud.js';
import {ACHIEVEMENTS,COSMETICS,dailyChallenges,dayKey,rankFor} from './rules.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function initCommand(api){
  let selected='orders',loading=false;
  const status=(s)=>{$('commandStatus').textContent=s;};
  function has(source){return cloud.profile?.claims.some(c=>c.source===source);}
  function card(def,stats,source,kind){
    const progress=Math.min(def.goal,stats[def.metric]||0),claimed=has(source),ready=progress>=def.goal&&!claimed;
    return `<article class="order-card ${ready?'order-ready':''} ${claimed?'order-done':''}">
      <div class="order-top"><span>${kind==='achievement'?'ACCOMPLISHMENT':'DAILY ORDER'}</span><strong>+${def.cash} FC</strong></div>
      <h3>${esc(def.name)}</h3><p>${esc(def.desc)}</p>
      <div class="order-progress"><i style="width:${progress/def.goal*100}%"></i></div>
      <div class="order-bottom"><span>${progress} / ${def.goal}</span><button class="btn" data-claim="${kind}:${def.id}" ${ready?'':'disabled'}>${claimed?'Claimed':ready?'Claim cash':'In progress'}</button></div></article>`;
  }
  function render(){
    const p=cloud.profile;if(!p)return;
    const date=dayKey(p.serverNow),daily=p.daily.date===date?p.daily:{};
    $('profileName').textContent=p.name;$('profileRank').textContent=rankFor(p.xp);
    $('cashBalance').textContent=p.cash.toLocaleString();$('profileXp').textContent=p.xp.toLocaleString()+' XP';
    $('titleWallet').textContent=p.cash.toLocaleString()+' FIELD CASH';
    $('titleRank').textContent=rankFor(p.xp);
    $('callsignEdit').value=p.name;
    $('playerCode').value=cloud.token;
    if(document.activeElement!==$('racerName'))$('racerName').value=p.name;
    $('profileMetrics').innerHTML=[['MATCHES',p.stats.games||0],['WINS',p.stats.wins||0],['ELIMINATIONS',p.stats.kills||0],['BADGES',ACHIEVEMENTS.filter(a=>has('achievement:'+a.id)).length]]
      .map(([name,value])=>`<div><strong>${value}</strong><span>${name}</span></div>`).join('');
    const claimed=has('daily:'+date);
    let streak=0;for(let d=1;d<7;d++){if(has('daily:'+dayKey((p.serverNow||Date.now())-d*86400000)))streak++;else break;}
    $('dailyAmount').textContent='+'+(100+streak*25)+' FC';
    $('claimDaily').disabled=claimed||!daily.eligible;
    $('claimDaily').textContent=claimed?'Collected today':daily.eligible?'Collect daily cash':'Play a match first';
    $('dailyDescription').textContent=claimed?'Your daily cash is saved. Come back after the next UTC reset.':
      'Complete one race or war match with at least 20 seconds of active play to collect today’s bonus.';
    $('dailyReset').textContent='UTC reset · '+date+' · consecutive-day bonus up to +250 FC';
    $('dailyOrders').innerHTML=dailyChallenges(date).map(a=>card(a,daily,'challenge:'+date+':'+a.id,'challenge')).join('');
    $('accomplishmentGrid').innerHTML=ACHIEVEMENTS.map(a=>card(a,p.stats,'achievement:'+a.id,'achievement')).join('');
    $('armoryGrid').innerHTML=COSMETICS.map(item=>{
      const owned=p.inventory.includes(item.id),equipped=p.equipped===item.id;
      return `<article class="order-card cosmetic"><div class="dogtag" style="--tag-color:${item.color}"><span>29</span><b>${esc(item.name)}</b></div><h3>${esc(item.name)}</h3><p>${esc(item.desc)}</p><div class="order-bottom"><strong>${owned?'OWNED':item.price+' FC'}</strong><button class="btn" data-buy="${item.id}" ${equipped||!owned&&p.cash<item.price?'disabled':''}>${equipped?'Equipped':owned?'Equip':'Buy cosmetic'}</button></div></article>`;
    }).join('');
    const recent=p.claims.slice(0,8);
    $('cashHistory').innerHTML=recent.length?recent.map(c=>`<div class="ledger-row"><span>${esc(c.source.startsWith('match:')?'Match earnings':c.source.startsWith('daily:')?'Daily play bonus':c.source.startsWith('shop:')?'Cosmetic purchase':c.source.startsWith('challenge:')?'Daily challenge':'Accomplishment')}</span><b>${c.cash>=0?'+':''}${c.cash} FC</b></div>`).join(''):'<p class="race-fine">No transactions yet. Deploy into a match to begin.</p>';
  }
  async function action(button,fn){
    if(loading)return;loading=true;button.disabled=true;status('Saving securely…');
    try{await fn();status('Saved to your player profile.');render();}
    catch(e){status(e.message);render();}
    finally{loading=false;button.disabled=false;render();}
  }
  function selectTab(tab){
    selected=tab;document.querySelectorAll('[data-command-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.commandTab===tab)));
    document.querySelectorAll('[data-command-panel]').forEach(el=>el.classList.toggle('hidden',el.dataset.commandPanel!==tab));
  }
  async function open(){
    if(!cloud.token){login();return;}
    api.stopModes();api.setMode('command');api.show('command');selectTab(selected);status('Connecting to your player dossier…');
    try{await cloud.ensure($('racerName').value);await cloud.refresh();render();status('Cloud save connected. Save your private player code before leaving or reloading.');}
    catch(e){status(e.message);}
  }
  $('btnCommand').onclick=open;
  $('profileShortcut').onclick=open;
  $('commandBack').onclick=api.title;
  document.querySelectorAll('[data-command-tab]').forEach(b=>b.onclick=()=>selectTab(b.dataset.commandTab));
  $('command').addEventListener('click',e=>{
    const claim=e.target.closest('[data-claim]'),buy=e.target.closest('[data-buy]');
    if(claim){const [kind,id]=claim.dataset.claim.split(':');action(claim,()=>cloud.mutate('claim',{kind,id}));}
    if(buy)action(buy,()=>cloud.mutate('purchase',{id:buy.dataset.buy}));
  });
  $('claimDaily').onclick=()=>action($('claimDaily'),()=>cloud.mutate('claim',{kind:'daily'}));
  $('saveCallsign').onclick=()=>action($('saveCallsign'),()=>cloud.mutate('rename',{name:$('callsignEdit').value}));
  $('copyPassport').onclick=async()=>{
    try{await cloud.ensure();await navigator.clipboard.writeText(cloud.token);status('Recovery code copied. Keep it private: anyone with it can access your profile.');}
    catch{$('playerCode').type='text';$('playerCode').select();status('Clipboard unavailable. Select and copy the private code shown. Keep it safe: you will need it to sign in again.');}
  };
  $('revealPassport').onclick=()=>{$('playerCode').type=$('playerCode').type==='password'?'text':'password';$('revealPassport').textContent=$('playerCode').type==='password'?'Reveal code':'Hide code';};
  $('restorePassport').onclick=()=>action($('restorePassport'),async()=>{await cloud.restore($('passportInput').value);$('passportInput').value='';});
  $('refreshProfile').onclick=()=>action($('refreshProfile'),()=>cloud.refresh());
  window.addEventListener('b29:profile',render);
  function login(){
    api.stopModes();api.setMode('playerLogin');api.show('playerLogin');$('loginStatus').textContent='Your progress is cloud-saved. Use your private code to sign in, or enlist a new recruit.';
  }
  window.addEventListener('b29:login',login);
  $('loginBack').onclick=api.title;
  $('loginRestore').onclick=async()=>{
    const button=$('loginRestore');button.disabled=true;$('loginStatus').textContent='Checking your player code…';
    try{await cloud.restore($('loginCode').value);$('loginCode').value='';selected='orders';await open();}
    catch(e){$('loginStatus').textContent=e.message;}finally{button.disabled=false;}
  };
  $('loginCreate').onclick=async()=>{
    const button=$('loginCreate');button.disabled=true;$('loginStatus').textContent='Creating your cloud recruit…';
    try{await cloud.create($('enlistName').value);selected='profile';await open();status('Recruit created. Save your private player code now: it is required to sign in after a reload or on a new device.');}
    catch(e){$('loginStatus').textContent=e.message;}finally{button.disabled=false;}
  };
  return {open,render};
}
