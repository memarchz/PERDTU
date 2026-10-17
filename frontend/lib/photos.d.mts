export type PhotoDraft={id:string;previewUrl:string;width:number;height:number};
export function addPhoto<T extends {id:string}>(list:T[],photo:T):T[];
export function movePhoto<T extends {id:string}>(list:T[],id:string,direction:number):T[];
export function removePhoto<T extends {id:string}>(list:T[],id:string):T[];
export function releasePreviews(urls:Set<string>,revoke?:(url:string)=>void):void;
