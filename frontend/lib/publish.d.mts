import type {RequestOptions} from './api.mjs';
export function publishListing(input:{item:unknown;createdItemId?:string;onItemCreated?:(id:string)=>void},request:<T>(path:string,options?:RequestOptions)=>Promise<T>):Promise<{itemId:string}>;
export function recoverPublishDraft(storage:Pick<Storage,'getItem'|'removeItem'>,key:string):any;
