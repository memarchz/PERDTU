import type {MatchEnvelope} from './types';
import type {RequestOptions} from './api.mjs';
export function loadMatches(path:string,request:<T>(path:string,options?:RequestOptions)=>Promise<T>,options?:{signal?:AbortSignal;attempts?:number;wait?:()=>Promise<void>}):Promise<MatchEnvelope>;
import type {Match,ItemSummary} from './types';
export function swapSummary(match:Match,userId:string):{outgoing:ItemSummary;incoming:ItemSummary;outgoingRecipient:ItemSummary};
