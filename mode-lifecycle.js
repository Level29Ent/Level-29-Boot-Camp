// A response belongs to the exact mode session which issued it, even when the
// next session reuses a room code or the local practice code is always LOCAL.
export function createModeLifecycle(){
  let revision=0;
  return {current:()=>revision,invalidate:()=>++revision,valid:ticket=>ticket===revision,
    assert(ticket){if(ticket!==revision)throw Object.assign(new Error('This game session was closed.'),{staleSession:true});}};
}
