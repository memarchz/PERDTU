export async function loadMatches(path,request,{signal,attempts=40,wait}={}){
 const pause=wait||(()=>new Promise((resolve,reject)=>{const done=()=>{signal?.removeEventListener('abort',cancel);resolve();},timer=setTimeout(done,3000),cancel=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);reject(new DOMException('Aborted','AbortError'));};signal?.addEventListener('abort',cancel,{once:true});}));
 for(let i=0;i<attempts;i++){signal?.throwIfAborted();const result=await request(path,{signal});signal?.throwIfAborted();if(result.status==='ready')return result;if(result.status!=='preparing')throw Error(result.message||'Local AI is unavailable. Please retry.');await pause();}
 throw Error('Local AI is taking longer than expected. Please retry.');
}
export function swapSummary(match,userId){return {outgoing:match.items.find(i=>i.ownerId===userId),incoming:match.items.find(i=>i.id===match.edges.find(e=>e.to===userId)?.itemId),outgoingRecipient:match.items.find(i=>i.ownerId===match.edges.find(e=>e.from===userId)?.to)};}
