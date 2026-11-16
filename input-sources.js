// Releasing one device must never release another device's held action.
export function createInputSources(){
  const sources=new Map();
  return {
    press(key,source){if(!sources.has(key))sources.set(key,new Set());const set=sources.get(key),edge=set.size===0;set.add(source);return edge;},
    release(key,source){const set=sources.get(key);if(!set)return false;set.delete(source);if(!set.size)sources.delete(key);return set.size>0;},
    held:key=>(sources.get(key)?.size||0)>0,
    releaseSource(source){const changed=[];for(const [key,set] of sources){if(set.delete(source)){if(!set.size)sources.delete(key);changed.push(key);}}return changed;},
    clear(){sources.clear();}
  };
}
