import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createChatSession} from '../lib/chat-session.mjs';
const message=(id)=>({id,body:id,createdAt:'2026-10-18T00:00:00.000Z',sender:{id:'u',displayName:'Member'},clientMessageId:id});
const page=(ids=[],extra={})=>({opened:true,canSend:true,messages:ids.map(message),olderCursor:ids[0]??null,nextCursor:ids.at(-1)??null,hasMore:false,...extra});
const flush=()=>new Promise(r=>setImmediate(r));
function harness(request){let state;const scheduled=new Map();let n=0;const session=createChatSession({request,tradeId:'trade',onChange:s=>{state=s;},schedule:f=>{scheduled.set(++n,f);return n;},cancel:id=>scheduled.delete(id),makeId:()=>`retry-${++n}`});return {session,scheduled,get state(){return state;}};}
test('stop ignores stale account response and cancels scheduled polling',async()=>{
 let resolve;const h=harness(()=>new Promise(r=>resolve=r));h.session.start();h.session.stop();resolve(page(['old']));await flush();assert.equal(h.state.messages.length,0);assert.equal(h.scheduled.size,0);
});
test('polls do not overlap; refresh preserves history and catches up every page',async()=>{
 const replies=[page(['b'],{hasMore:true}),page(['c'],{hasMore:true}),page(['d'])];let calls=0;
 const h=harness(async()=>{calls++;return replies.shift()??page(['d']);});h.session.start();await flush();assert.equal(calls,1);
 await Promise.all([h.session.refresh(),h.session.refresh()]);assert.equal(calls,3);assert.deepEqual(h.state.messages.map(m=>m.id),['b','c','d']);
 h.session.stop();assert.equal(h.scheduled.size,0);
});
test('uncertain send retains retry identifier; changed body uses a new one',async()=>{
 const sent=[];let failed=true;
 const h=harness(async(path,options)=>{if(options?.method==='POST'){sent.push(options.body);if(failed){failed=false;throw Error('offline');}return {message:message('saved')};}return page();});
 h.session.start();await flush();assert.equal(await h.session.send('draft'),false);assert.equal(await h.session.send('draft'),true);
 assert.equal(sent[0].clientMessageId,sent[1].clientMessageId);assert.equal(await h.session.send('new'),true);assert.notEqual(sent[1].clientMessageId,sent[2].clientMessageId);h.session.stop();
});
test('older pages merge, deduplicate and keep chronological history on status changes',async()=>{
 let calls=0;const h=harness(async path=>{calls++;if(path.includes('before='))return page(['a','b']);if(calls===1)return page(['b','c'],{hasMore:true});return page(['c'],{canSend:false});});
 h.session.start();await flush();await h.session.loadOlder();await h.session.refresh();assert.deepEqual(h.state.messages.map(m=>m.id),['a','b','c']);assert.equal(h.state.canSend,false);h.session.stop();
});
test('pause/resume preserves history and does not let an old request schedule work',async()=>{
 let resolve;let calls=0;const h=harness(()=>{calls++;return calls===1?Promise.resolve(page(['a'])):new Promise(r=>resolve=r);});
 h.session.start();await flush();const pending=h.session.refresh();h.session.stop();resolve(page(['stale']));await pending;assert.deepEqual(h.state.messages.map(m=>m.id),['a']);assert.equal(h.scheduled.size,0);
});
