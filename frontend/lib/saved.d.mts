import type {SavedEntry} from './types';
import type {RequestOptions} from './api.mjs';
export function createSavedStore():{session(key:unknown):void;entries():SavedEntry[];load(request:()=>Promise<SavedEntry[]>):Promise<void>;set(id:string,saved:boolean,request:()=>Promise<SavedEntry|undefined>):Promise<void>};
export function archiveListing(id:string,request:<T>(path:string,options?:RequestOptions)=>Promise<T>,refresh:()=>Promise<unknown>):Promise<void>;
