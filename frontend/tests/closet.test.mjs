import {test} from 'node:test';
import assert from 'node:assert/strict';
import {visibleClosetItems} from '../lib/closet.mjs';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
test('completed exchanges disappear without hiding reserved or archived inventory',()=>{
 const items=['AVAILABLE','RESERVED','EXCHANGED','ARCHIVED'].map((status,id)=>({status,id}));const before=structuredClone(items);
 assert.deepEqual(visibleClosetItems(items).map(i=>i.status),['AVAILABLE','RESERVED','ARCHIVED']);assert.deepEqual(items,before);
 assert.equal(visibleClosetItems([{status:'EXCHANGED'}]).length,0);
});
test('inventory refresh on tab return cancels old requests and cleanup removes listener',async()=>{
 const calls=[],states=[],listeners=new Map(),effects=[];let index=0;const module={exports:{}};
 const document={hidden:false,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);}};
 const hooks={useState(value){const i=index++;states[i]=value;return [value,next=>states[i]=next];},useCallback:fn=>fn,useEffect:fn=>effects.push(fn)};
 runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/use-resource.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,AbortController,document,Error,require:n=>n==='react'?hooks:{useAuth:()=>({request:(_path,options)=>new Promise(resolve=>calls.push({options,resolve}))})}});
 module.exports.useResource('/me/items',{refreshOnVisible:true});const cleanup=effects[0]();
 assert.equal(calls.length,1);assert.equal(listeners.size,1);document.hidden=true;listeners.get('visibilitychange')();assert.equal(calls.length,1);
 document.hidden=false;listeners.get('visibilitychange')();assert.equal(calls.length,2);assert.equal(calls[0].options.signal.aborted,true);
 cleanup();assert.equal(calls[1].options.signal.aborted,true);assert.equal(listeners.size,0);
 calls.forEach(c=>c.resolve(['stale']));await new Promise(r=>setImmediate(r));assert.equal(states[0],null);
});
