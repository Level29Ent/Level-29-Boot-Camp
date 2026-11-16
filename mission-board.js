import {readUrbanRecord} from './urban-records.js';
import {missionLog,missionExport,practiceSummary,bestMission} from './practice-lab.js';
import {readRecords,bestDrill,bestRace} from './field-records.js';
import {loadTraining} from './player-save.js';
import {readCareer,MEDALS} from './career.js';
import {OPERATIONS,ROLES} from './operations.js';
const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const element=document.createElement(tag);element.textContent=text;if(cls)element.className=cls;return element;};
export function initMissionBoard(api){
  const filter=$('missionLogFilter');for(const [id,operation] of Object.entries(OPERATIONS)){const option=node('option',operation.name);option.value=id;filter.appendChild(option);}
  function render(){
    const log=missionLog(),training=[...loadTraining()].sort((a,b)=>b[1].score-a[1].score),drill=bestDrill(),career=readCareer();
    const raceIds=Object.keys(readRecords().races||{}).filter(id=>/^\d+$/.test(id)&&+id<100),races=raceIds.map(id=>({id:+id,record:bestRace(id)})).filter(r=>r.record);
    const stats=$('missionBoardStats');stats.replaceChildren();
    for(const [label,value] of [['Campaign stages',training.length+' / 100'],['Race ghosts',races.length+' / 100'],['Device medals',career.medals.length+' / '+MEDALS.length],['Recent War missions',log.length+' / 20']]){
      const card=node('div','', 'mission-stat');card.append(node('strong',value),node('span',label));stats.appendChild(card);
    }
    $('missionBoardMout').textContent=drill?'SHOOT HOUSE BEST · '+drill.score+' points · '+drill.time.toFixed(2)+'s · '+drill.accuracy+'% accuracy':'SHOOT HOUSE · Complete an extraction to save a personal best.';
    const urban=readUrbanRecord();$('missionBoardUrban').textContent=urban?'URBAN BLOCK BEST · '+urban.score+' points · '+urban.time.toFixed(2)+'s · separate from container MOUT':'URBAN BLOCK · Complete courtyard, rooms and roof extraction to save a separate best.';
    const campaign=$('missionBoardCampaign');campaign.replaceChildren();
    for(const [id,record] of training.slice(0,5)){
      const row=node('li','Level '+(id+1)+' · '+record.score+' points · '+record.time.toFixed(1)+'s ');const play=node('button','Train this level','btn');play.onclick=()=>api.playTraining(id);row.appendChild(play);campaign.appendChild(row);
    }
    if(!training.length)campaign.appendChild(node('li','No campaign records yet. Guided and Daily Training runs do not count as campaign clears.'));
    $('missionBoardRaces').textContent=races.length?races.slice().sort((a,b)=>a.id-b.id).slice(0,10).map(r=>'Course '+(r.id+1)+': '+r.record.time.toFixed(2)+'s').join(' · ')+(races.length>10?' · +'+(races.length-10)+' more courses':''):'No race ghosts yet. Finish a local race to record one.';
    const records=$('missionHistory');records.replaceChildren();const shown=filter.value?log.filter(r=>r.operation===filter.value):log;
    for(const record of shown){
      const card=node('article','', 'order-card');card.append(node('h3',OPERATIONS[record.operation].name+' · '+(record.success?'COMPLETE':'INCOMPLETE')));
      card.append(node('p',practiceSummary(record.config,record.operation)),node('p',new Date(record.timestamp).toLocaleString()+' · '+ROLES[record.role].name));
      const accuracy=record.shots?Math.round(record.hits/record.shots*100):0,best=bestMission(log,record.config,record.operation);
      card.append(node('p',record.elapsed.toFixed(1)+'s · '+record.kills+' eliminations / '+record.deaths+' deaths · '+accuracy+'% accuracy · '+Math.floor(record.objectiveSeconds)+'s on objective · '+record.support+' assists'));
      if(best)card.append(node('small','Fastest retained win with these exact rules: '+best.elapsed.toFixed(1)+'s.'));
      records.appendChild(card);
    }
    if(!shown.length)records.appendChild(node('p','No finished local missions for this filter. Aborted and online matches are not added to this log.','race-fine'));
  }
  $('btnMissionBoard').onclick=()=>{api.stopModes();api.setMode('missionBoard');api.show('missionBoard');$('missionExportStatus').textContent='';render();};
  $('missionBoardBack').onclick=api.title;filter.onchange=render;
  $('missionExport').onclick=()=>{
    let url;
    try{const blob=new Blob([missionExport()],{type:'application/json'});url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='level29-local-missions.json';document.body.appendChild(link);link.click();link.remove();$('missionExportStatus').textContent='Download requested. Only local gameplay statistics are included—no callsigns, profile IDs, room codes or recovery codes.';}
    catch{$('missionExportStatus').textContent='Your browser could not start the download. Records are unchanged.';}
    finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),1000);}
  };
}
