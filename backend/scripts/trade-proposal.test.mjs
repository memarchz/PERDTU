import assert from 'node:assert/strict';import {test} from 'node:test';import {createProposal} from '../dist/trade-proposal.js';import {itemFingerprint} from '../dist/exchange-intent.js';
const items=['a','b'].map((ownerId,i)=>({id:String(i),ownerId,title:'Book',description:'Book',category:'Books',status:'AVAILABLE',exchangeCategory:'Books'})),edges=items.map((i,n)=>({itemId:i.id,from:i.ownerId,to:items[1-n].ownerId}));
const prepared={fingerprints:Object.fromEntries(items.map(i=>[i.id,itemFingerprint(i)])),vectors:new Map(),policy:{strong:.85,alternative:.7,version:'test'}};
function db(records){return {$transaction:async(fn,o)=>{assert.equal(o.isolationLevel,'Serializable');return fn({item:{findMany:async()=>records},trade:{create:async({data})=>({id:'proposal',...data})}});}};}
test('current item terms are checked inside serializable transaction without model or Wish reads',async()=>{assert.equal((await createProposal(db(items),'a',edges,prepared)).id,'proposal');});
test('stale AI result cannot create a proposal after an offer or intent edit',async()=>{await assert.rejects(createProposal(db([{...items[0],exchangeCategory:'Clothing'},items[1]]),'a',edges,prepared),{status:409});});
test('client cannot create a proposal without trusted server preparation',async()=>{await assert.rejects(createProposal(db(items),'a',edges),{status:409});});
