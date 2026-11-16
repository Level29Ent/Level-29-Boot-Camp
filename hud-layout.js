const $=id=>document.getElementById(id);
function group(parent,className,ids){const wrapper=document.createElement('div');wrapper.className=className;for(const id of ids){const node=typeof id==='string'?$(id):id;if(node)wrapper.appendChild(node);}parent.appendChild(wrapper);return wrapper;}
export function initHudLayout(){
  const dock=group($('app'),'utility-dock',['audioBtn','joyBtn','fieldSettingsButton','touchPause']);dock.setAttribute('aria-label','Sound, touch controls, options and pause');$('touchPause').classList.add('global-button');
  const war=$('warHud');group(war,'war-header-row',['warModeBadge','warNetwork',war.querySelector('.war-hud-buttons')]);
  group(war,'war-mission-row',['practiceHudLabel','operationStatus']);
  group(war,'war-tactical-column',['warRadar','warAllyStatus']);
  const bottom=group(war,'war-bottom-band',[war.querySelector('.war-vitals')]);group(bottom,'war-command-row',['squadCommands','roleAbility']);
  const tactical=document.createElement('section');tactical.className='score-tactical';tactical.innerHTML='<h4>TACTICAL OVERVIEW</h4><p id="scorePractice"></p><p id="scoreConnection"></p><p id="scoreAllies"></p>';$('warScores').appendChild(tactical);
}
