import assert from 'node:assert/strict';
import { test } from 'node:test';
import { availableTradeActions, cycleKey } from '../lib/trade-actions.mjs';
const none={canAccept:false,canDecline:false,canConfirmReceipt:false};
const trade=(status,decision='PENDING',received=false)=>({status,participants:[{userId:'me',decision,received}]});
test('outsiders have no trade actions',()=>assert.deepEqual(availableTradeActions(trade('PROPOSED'),'outsider'),none));
test('pending proposal needs an explicit response even from the proposer',()=>assert.deepEqual(availableTradeActions(trade('PROPOSED'),'me'),{...none,canAccept:true,canDecline:true}));
test('a participant who already responded cannot respond twice',()=>assert.deepEqual(availableTradeActions(trade('PROPOSED','ACCEPTED'),'me'),none));
for(const state of ['CONFIRMED','EXCHANGING'])test(`${state} lets an accepted participant confirm receipt once`,()=>{
  assert.deepEqual(availableTradeActions(trade(state,'ACCEPTED'),'me'),{...none,canConfirmReceipt:true});
  assert.deepEqual(availableTradeActions(trade(state,'ACCEPTED',true),'me'),none);
});
for(const state of ['COMPLETED','DECLINED','CANCELLED','UNRECOGNIZED'])test(`${state} has no mutation actions`,()=>assert.deepEqual(availableTradeActions(trade(state,'ACCEPTED'),'me'),none));
test('cycle identity preserves direction and ignores rotation',()=>{
  const clockwise=[{from:'A',to:'B',itemId:'a'},{from:'B',to:'C',itemId:'b'},{from:'C',to:'A',itemId:'c'}];
  const reverse=[{from:'A',to:'C',itemId:'a'},{from:'C',to:'B',itemId:'c'},{from:'B',to:'A',itemId:'b'}];
  assert.notEqual(cycleKey(clockwise),cycleKey(reverse));
  assert.equal(cycleKey(clockwise),cycleKey([...clockwise.slice(1),clockwise[0]]));
});
