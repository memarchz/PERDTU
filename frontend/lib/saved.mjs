export function createSavedStore(){let session,version=0,entries=[];return {
 session(key){if(session!==key){session=key;version++;entries=[];}},entries:()=>entries,
 async load(request){const stamp=version;const result=await request();if(stamp===version)entries=result;},
 async set(id,saved,request){const stamp=version;const result=await request();if(stamp===version)entries=saved?[...entries.filter(e=>e.itemId!==id),result]:entries.filter(e=>e.itemId!==id);}
};}
export async function archiveListing(id,request,refresh){await request('/items/'+id,{method:'DELETE'});await refresh();}
