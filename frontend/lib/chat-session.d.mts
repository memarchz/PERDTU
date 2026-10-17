import type {ChatMessage} from './types';
import type {RequestOptions} from './api.mjs';
export type ChatState={messages:ChatMessage[];opened:boolean;canSend:boolean;loading:boolean;sending:boolean;error:string;sendError:string;hasOlder:boolean};
export type ChatSession={start():void;stop():void;refresh():Promise<void>;loadOlder():Promise<void>;send(body:string):Promise<boolean>};
export function createChatSession(options:{request:<T>(path:string,options?:RequestOptions)=>Promise<T>;tradeId:string;onChange:(state:ChatState)=>void;schedule?:typeof setTimeout;cancel?:typeof clearTimeout;makeId?:()=>string}):ChatSession;
