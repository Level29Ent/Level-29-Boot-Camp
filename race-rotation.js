// Keep canonical course IDs intact: the host sends one ID to the room service,
// and every racer loads that same course. Only the selection order is shuffled.
function randomIndex(size){
  const value=new Uint32Array(1),range=2**32,limit=range-range%size;
  do{crypto.getRandomValues(value);}while(value[0]>=limit);
  return value[0]%size;
}

// One shuffled deck per game session. Finish the deck before reshuffling, and
// prevent an immediate repeat at the boundary between two decks.
export function createCourseRotation(count,pick=randomIndex){
  let deck=[],last=null;
  return ()=>{
    if(!deck.length){
      deck=Array.from({length:count},(_,i)=>i);
      for(let i=deck.length-1;i>0;i--){
        const j=pick(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];
      }
      if(count>1&&deck[deck.length-1]===last){
        const j=pick(count-1);
        [deck[j],deck[deck.length-1]]=[deck[deck.length-1],deck[j]];
      }
    }
    last=deck.pop();return last;
  };
}
