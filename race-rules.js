// Shared competitive race rules. Campaign missions and 5v5 war are separate modes.
export const RACE_DURATION=60;
export const RACE_DISQUALIFIED=3;

// Finishers lead by elapsed finish time; unfinished racers follow by progress.
// Stable ID ordering breaks exact ties so every client identifies the same bottom three.
export function rankRaceEntries(entries){
  const sorted=entries.slice().sort((a,b)=>(
    a.finish!==null&&b.finish!==null?a.finish-b.finish:
    a.finish!==null?-1:b.finish!==null?1:b.progress-a.progress
  )||a.id.localeCompare(b.id));
  const cutoff=Math.max(0,sorted.length-RACE_DISQUALIFIED);
  return sorted.map((entry,i)=>({...entry,place:i+1,disqualified:i>=cutoff}));
}
