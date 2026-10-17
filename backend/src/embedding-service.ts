import {Worker} from 'node:worker_threads';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {MODEL_KEY} from './ai-model';
export type EmbeddingInput={role:'offer'|'wanted';text:string};
export function vectorKey(input:EmbeddingInput){return createHash('sha256').update(MODEL_KEY+'|'+input.role+'|'+input.text).digest('hex');}
type Options={run?:(texts:string[])=>Promise<number[][]>;timeoutMs?:number;reset?:()=>void;download?:boolean};
export class EmbeddingService {
 private worker?:Worker;private serial=0;private pending=new Map<number,{resolve:(v:number[][])=>void;reject:(e:Error)=>void}>();private jobs=new Map<string,Promise<Map<string,number[]>>>();private tail=Promise.resolve();private state:'loading'|'ready'|'unavailable'='loading';
 constructor(private db:any,private options:Options={}){}
 status(){return {state:this.state};}
 private reset(){const worker=this.worker;this.worker=undefined;if(worker)void worker.terminate();for(const p of this.pending.values())p.reject(Error('Local AI worker stopped. Please retry.'));this.pending.clear();this.options.reset?.();}
 async close(){this.reset();}
 private run(texts:string[]):Promise<number[][]>{if(this.options.run)return this.options.run(texts);if(!this.worker){this.worker=new Worker(path.join(__dirname,'embedding-worker.js'),{workerData:{download:!!this.options.download}});this.worker.on('message',message=>{const p=this.pending.get(message.id);if(!p)return;this.pending.delete(message.id);message.error?p.reject(Error(message.error)):p.resolve(message.vectors);});this.worker.on('error',()=>this.reset());}
 const id=++this.serial;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.worker!.postMessage({id,texts});});}
 prepare(inputs:EmbeddingInput[]):Promise<Map<string,number[]>>{
  if(inputs.length>1100)return Promise.reject(Error('Too many AI inputs.'));
  const unique=[...new Map(inputs.map(i=>[vectorKey(i),i])).entries()],jobKey=unique.map(([k])=>k).sort().join(',');const existing=this.jobs.get(jobKey);if(existing)return existing;
  if(this.jobs.size>=2)return Promise.reject(Error('Local AI is busy. Please retry shortly.'));
  const task=this.tail.then(async()=>{const result=new Map<string,number[]>(),missing:{key:string;input:EmbeddingInput}[]=[];
   for(const [key,input]of unique){const row=await this.db.embeddingCache.findUnique({where:{key}});if(row&&Array.isArray(row.vector)&&row.vector.length>0&&(this.options.run||row.vector.length===384)&&row.vector.every((n:any)=>typeof n==='number'&&Number.isFinite(n))&&row.modelKey===MODEL_KEY)result.set(key,row.vector);else missing.push({key,input});}
   for(let n=0;n<missing.length;n+=8){const batch=missing.slice(n,n+8);let timer:ReturnType<typeof setTimeout>|undefined;try{const vectors=await Promise.race([this.run(batch.map(m=>m.input.text)),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{this.reset();reject(Error('Local AI timed out. Please retry.'));},this.options.timeoutMs??(this.state==='ready'?30000:120000));})]);if(vectors.length!==batch.length)throw Error('Invalid AI response.');
    for(let i=0;i<batch.length;i++){const raw=vectors[i];if(!Array.isArray(raw)||!raw.length||(!this.options.run&&raw.length!==384)||raw.some(v=>!Number.isFinite(v)))throw Error('Invalid AI vector.');const norm=Math.sqrt(raw.reduce((s,v)=>s+v*v,0));if(!norm)throw Error('Invalid AI vector.');const vector=raw.map(v=>v/norm),{key,input}=batch[i];await this.db.embeddingCache.upsert({where:{key},create:{key,modelKey:MODEL_KEY,role:input.role,contentHash:createHash('sha256').update(input.text).digest('hex'),vector},update:{vector}});result.set(key,vector);}
   }finally{if(timer)clearTimeout(timer);}}
   this.state='ready';return result;
  }).catch(e=>{this.state='unavailable';throw e;}).finally(()=>this.jobs.delete(jobKey));this.jobs.set(jobKey,task);this.tail=task.then(()=>{},()=>{});return task;
 }
}
