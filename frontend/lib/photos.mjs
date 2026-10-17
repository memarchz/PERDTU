export function addPhoto(list,photo){if(list.length>=4)throw Error('Choose up to four photos.');return [...list,photo];}
export function movePhoto(list,id,direction){const index=list.findIndex(p=>p.id===id),next=index+direction;if(index<0||next<0||next>=list.length)return list;const copy=[...list];[copy[index],copy[next]]=[copy[next],copy[index]];return copy;}
export function removePhoto(list,id){return list.filter(p=>p.id!==id);}
export function releasePreviews(urls,revoke=URL.revokeObjectURL){for(const url of urls)revoke(url);urls.clear();}
