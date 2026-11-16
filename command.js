import {cloud} from './cloud.js';
import {localCallsign,saveLocalPlayer} from './local-player.js';
import {AVATAR_STYLES,STYLE_PALETTES,STYLE_CATEGORIES,selectedStyle,selectStyle,styleFor,stylePreview} from './avatar-styles.js';
import {ACHIEVEMENTS,COSMETICS,dailyChallenges,dayKey,rankFor,rankProgress,RANKS} from './rules.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function initCommand(api){
  let selected='orders',loading=false,stylePage=0,authBusy=false,styleSaving=false;
  const loginVisible=()=>$('playerLogin').classList.contains('hidden')===false;
  const pageSize=10;
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
  // A preview of wearable placement, not an assertion that a guest owns it.
  function avatarPreview(item){
    const kit=item.id==='recruit'?'#596b4b':item.color;
    return `<svg class="avatar-preview" viewBox="0 0 180 210" role="img" aria-label="${esc(item.name)} uniform preview">
      <ellipse cx="90" cy="199" rx="54" ry="7" fill="#0b100a"/>
      <path d="M62 118h24v70H60zM94 118h24l2 70H94z" fill="#647354"/>
      <path d="M58 180h29v17H53v-9zM93 180h29l5 8v9H93z" fill="#403c2e"/>
      <path d="M53 64h74v61H53zM35 66h19v66H35zM126 66h19v66h-19z" fill="#647354"/>
      ${item.id==='recruit'?'':`<rect x="59" y="71" width="62" height="47" rx="4" fill="#28332d"/>
      <path d="M64 77h13v32H64zM103 77h13v32h-13zM61 64h10v13H61zM109 64h10v13h-10zM34 83h21v8H34zM125 83h21v8h-21z" fill="${kit}"/>`}
      <rect x="73" y="22" width="34" height="39" rx="9" fill="#b88a70"/>
      <path d="M68 36q0-25 22-25t22 25z" fill="#53684b"/>
      <path d="M83 39h4M96 39h4" stroke="#1b241b" stroke-width="3"/>
    </svg>`;
  }
  function renderStyles(){
    const palette=$('avatarPalette').value,category=$('avatarCategory').value;
    const styles=AVATAR_STYLES.filter(style=>(!palette||style.palette.id===palette)&&(!category||style.pattern.category===category));
    const pages=Math.max(1,Math.ceil(styles.length/pageSize));stylePage=Math.max(0,Math.min(stylePage,pages-1));
    const current=selectedStyle()??cloud.profile?.style;
    $('avatarSelected').textContent=current?'Selected: '+styleFor(current).name+' · '+(cloud.profile?.style===current?'Saved online for next deployment.':'Local appearance (sign in and select to sync).'):'Using your cloud Armory kit. Select a free style below to override its appearance on this device.';
    $('avatarPage').textContent='Page '+(stylePage+1)+' of '+pages+' · '+styles.length+' styles';
    $('avatarPrev').disabled=stylePage===0;$('avatarNext').disabled=stylePage===pages-1;
    $('avatarStyles').innerHTML=styles.slice(stylePage*pageSize,(stylePage+1)*pageSize).map(style=>`<article class="order-card ${style.id===current?'order-ready':''}">${stylePreview(style)}<h3>${style.name}</h3><p>${style.pattern.material} · ${style.pattern.category}</p><button class="btn" data-preview="${style.id}">View in 3D</button><button class="btn" data-style="${style.id}" ${styleSaving||style.id===current&&(!cloud.profile||cloud.profile.style===current)?'disabled':''}>${style.id===current?cloud.profile&&cloud.profile.style!==current?'Sync this style':'Selected':'Use this style'}</button></article>`).join('')||'<p class="race-fine">No styles match these filters. Try Mascots for the Signature collection.</p>';
  }
  $('avatarPalette').innerHTML='<option value="">All palettes / '+AVATAR_STYLES.length+' styles</option><option value="signature">Signature / Jester Mascot</option>'+STYLE_PALETTES.map(p=>`<option value="${p.id}">${p.name} / 10 designs</option>`).join('');
  $('avatarCategory').innerHTML='<option value="">All clothing types</option>'+STYLE_CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join('');
  $('avatarCategory').onchange=()=>{stylePage=0;renderStyles();};
  $('avatarPalette').onchange=()=>{stylePage=0;renderStyles();};
  $('avatarPrev').onclick=()=>{stylePage--;renderStyles();};
  $('avatarNext').onclick=()=>{stylePage++;renderStyles();};
  function previewStyle(id){window.dispatchEvent(new CustomEvent('b29:avatar-preview',{detail:{id}}));}
  async function chooseStyle(id){
    if(styleSaving)return;
    const result=selectStyle(id);if(!result.ok)return;
    renderStyles();previewStyle(id);
    if(cloud.profile){
      styleSaving=true;renderStyles();
      $('avatarSaveStatus').textContent='Saving online appearance…';
      try{await cloud.mutate('appearance',{style:id});$('avatarSaveStatus').textContent='Online appearance saved. Other players see it on your next deployment.';}
      catch(e){$('avatarSaveStatus').textContent='Local appearance selected; online sync failed: '+e.message;}
      finally{styleSaving=false;renderStyles();}
      return;
    }
    $('avatarSaveStatus').textContent=result.saved?'Appearance saved on this device. Your next deployment uses this style.':'Appearance selected for this session only: browser storage is unavailable.';
  }
  $('avatarStyles').addEventListener('click',e=>{const button=e.target.closest('[data-style]'),preview=e.target.closest('[data-preview]');if(button)chooseStyle(button.dataset.style);if(preview)previewStyle(preview.dataset.preview);});
  $('avatarReset').onclick=()=>chooseStyle(null);
  function renderService(){
    renderStyles();
    const p=cloud.profile,rank=rankProgress(p?.xp);
    $('serviceProgress').textContent=p?rank.name+' · '+rank.xp.toLocaleString()+' XP · '+(rank.next?rank.remaining.toLocaleString()+' XP to '+rank.next:'Maximum rank'):'Sign in to see your earned rank and owned uniforms. Previewing does not equip a uniform.';
    $('rankLadder').innerHTML=RANKS.map((name,i)=>`<div class="rank-step ${p&&i===rank.index?'current-rank':''}"><b>${String(i+1).padStart(2,'0')}</b><span>${name}<small>${(i*1000).toLocaleString()} XP${p&&i===rank.index?' · YOUR RANK':''}</small></span></div>`).join('');
    $('serviceLoadouts').innerHTML=COSMETICS.map(item=>`<article class="order-card">${avatarPreview(item)}<h3>${item.name}</h3><p>${item.desc}</p><strong>${p?.equipped===item.id?'EQUIPPED':p?.inventory.includes(item.id)?'OWNED':item.price?item.price+' FIELD CASH':'STANDARD ISSUE'}</strong></article>`).join('');
  }
  $('btnService').onclick=()=>{api.stopModes();api.setMode('service');api.show('service');renderService();previewStyle(selectedStyle()??cloud.profile?.style??AVATAR_STYLES[0].id);};
  $('serviceBack').onclick=api.title;
  $('serviceManage').onclick=()=>{selected='armory';open();};
  function render(){
    const p=cloud.profile;if(!p)return;
    const date=dayKey(p.serverNow),daily=p.daily.date===date?p.daily:{};
    $('profileName').textContent=p.name;$('profileRank').textContent=rankFor(p.xp);
    $('cashBalance').textContent=p.cash.toLocaleString();$('profileXp').textContent=p.xp.toLocaleString()+' XP';
    $('titleWallet').textContent=p.cash.toLocaleString()+' FIELD CASH';
    $('titleRank').textContent=rankFor(p.xp);
    const rank=rankProgress(p.xp);
    $('rankProgressText').textContent=rank.next?rank.remaining.toLocaleString()+' XP to '+rank.next:'Command rank achieved';
    $('rankProgressBar').style.width=rank.percent+'%';
    renderService();
    $('callsignEdit').value=p.name;
    $('playerCode').value=cloud.token;
    $('profileSaveStatus').textContent=cloud.saveStatus;
    $('rememberProfile').checked=cloud.remember;
    if(document.activeElement!==$('racerName'))$('racerName').value=p.name;
    $('profileMetrics').innerHTML=[['MATCHES',p.stats.games||0],['WINS',p.stats.wins||0],['ELIMINATIONS',p.stats.kills||0],['BADGES',ACHIEVEMENTS.filter(a=>has('achievement:'+a.id)).length]]
      .map(([name,value])=>`<div><strong>${value}</strong><span>${name}</span></div>`).join('');
    const claimed=has('daily:'+date);
    let streak=0;for(let d=1;d<7;d++){if(has('daily:'+dayKey((p.serverNow||Date.now())-d*86400000)))streak++;else break;}
    $('dailyAmount').textContent='+'+(100+streak*25)+' FC';
    $('claimDaily').disabled=claimed||!daily.eligible;
    $('claimDaily').textContent=claimed?'Collected today':daily.eligible?'Collect daily cash':'Play a match first';
    $('dailyDescription').textContent=claimed?'Your daily cash is saved. Come back after the next UTC reset.':
      'Complete one War match with at least 20 seconds of active play to collect today’s bonus.';
    $('dailyReset').textContent='UTC reset · '+date+' · consecutive-day bonus up to +250 FC';
    $('dailyOrders').innerHTML=dailyChallenges(date).map(a=>card(a,daily,'challenge:'+date+':'+a.id,'challenge')).join('');
    $('accomplishmentGrid').innerHTML=ACHIEVEMENTS.map(a=>card(a,p.stats,'achievement:'+a.id,'achievement')).join('');
    $('armoryGrid').innerHTML=COSMETICS.map(item=>{
      const owned=p.inventory.includes(item.id),equipped=p.equipped===item.id;
      return `<article class="order-card cosmetic">${avatarPreview(item)}<div class="dogtag" style="--tag-color:${item.color}"><span>29</span><b>${esc(item.name)}</b></div><h3>${esc(item.name)}</h3><p>${esc(item.desc)}</p><div class="order-bottom"><strong>${owned?'OWNED':item.price+' FC'}</strong><button class="btn" data-buy="${item.id}" ${equipped||!owned&&p.cash<item.price?'disabled':''}>${equipped?'Equipped':owned?'Equip':'Buy cosmetic'}</button></div></article>`;
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
    try{await cloud.ensure($('racerName').value);await cloud.refresh();render();status('Cloud progress synced. '+cloud.saveStatus);}
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
  $('rememberProfile').onchange=()=>{cloud.setRemember($('rememberProfile').checked);render();status(cloud.saveStatus);};
  $('forgetDevice').onclick=()=>{const cleared=cloud.setRemember(false);render();status(cleared?'Profile forgotten on this device. Your current session and cloud progress are unchanged. Copy the recovery code to sign in later.':cloud.saveStatus);};
  $('refreshProfile').onclick=()=>action($('refreshProfile'),()=>cloud.refresh());
  window.addEventListener('b29:profile',render);
  function login(){
    api.stopModes();api.setMode('playerLogin');api.show('playerLogin');$('enlistName').value=localCallsign();$('loginStatus').textContent='Cloud saving is optional. Save a callsign here and play immediately, or continue as Recruit.';
  }
  window.addEventListener('b29:login',login);
  $('loginBack').onclick=api.title;
  function localPlay(useName){
    const player=saveLocalPlayer(useName?$('enlistName').value:'Recruit',{remember:useName});
    $('racerName').value=player.name;$('localPlayerName').textContent=player.name;
    $('localSaveStatus').textContent=!useName?'Playing as a guest. No name was saved or replaced; training progress and appearance can still save in this browser.':player.saved?'Callsign saved on this device. Solo results do not award cloud cash or XP.':'Browser storage unavailable. You can still play; your name is kept for this session only.';
    api.stopModes();api.setMode('localPlay');api.show('localPlay');
    if(!cloud.profile){$('titleWallet').textContent='LOCAL PLAYER · '+player.name;$('profileShortcut').textContent='Player / optional cloud save';}
  }
  $('loginLocal').onclick=()=>localPlay(true);
  $('loginGuest').onclick=()=>localPlay(false);
  $('localRace').onclick=()=>api.playRace();
  $('localWar').onclick=()=>api.playWar();
  $('localTraining').onclick=()=>api.playTraining();
  $('localBack').onclick=api.title;
  $('enlistName').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();localPlay(true);}};
  function authButtons(busy){authBusy=busy;$('loginRestore').disabled=busy;$('loginCreate').disabled=busy;}
  $('loginRestore').onclick=async()=>{
    if(authBusy)return;authButtons(true);$('loginStatus').textContent='Connecting to cloud profile… Local play remains available below.';
    try{
      cloud.setRemember($('rememberLogin').checked);await cloud.restore($('loginCode').value);$('loginCode').value='';
      if(loginVisible()){selected='orders';await open();}
    }catch(e){$('loginStatus').textContent=e.message+' Use Save name & play or Play without saving to continue.';}
    finally{authButtons(false);}
  };
  $('loginCreate').onclick=async()=>{
    if(authBusy)return;authButtons(true);$('loginStatus').textContent='Creating optional cloud profile… You can play locally without waiting.';
    try{
      cloud.setRemember($('rememberLogin').checked);await cloud.create($('enlistName').value);
      if(loginVisible()){selected='profile';await open();status('Cloud profile created. '+cloud.saveStatus);}
    }catch(e){$('loginStatus').textContent=e.message+' Your local play buttons remain available.';}
    finally{authButtons(false);}
  };
  if(!cloud.profile)$('racerName').value=localCallsign();
  if(cloud.token)cloud.ensure('Recruit',{prompt:false}).then(()=>{$('profileShortcut').textContent='Profile saved / manage';}).catch(()=>{
    $('profileShortcut').textContent='Player / reconnect cloud';
  });
  return {open,render};
}
