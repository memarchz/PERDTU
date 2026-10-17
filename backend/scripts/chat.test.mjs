import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chatAccess, messageInput, decodeCursor, encodeCursor, pageInput} from '../dist/trade-chat.js';
test('only confirmed and exchanging conversations allow sending',()=>{
  assert.deepEqual(chatAccess('PROPOSED'),{opened:false,canSend:false});
  for(const s of ['CONFIRMED','EXCHANGING']) assert.deepEqual(chatAccess(s),{opened:true,canSend:true});
  for(const s of ['COMPLETED','DECLINED','EXPIRED','CANCELLED','DISPUTED']) assert.equal(chatAccess(s).canSend,false);
});
test('text is trimmed, bounded and uses UUID retry identifiers',()=>{
  const clientMessageId='87cfe008-0cc2-4d05-88bf-d90255322828';
  assert.equal(messageInput.parse({body:'  hello  ',clientMessageId}).body,'hello');
  for(const body of ['', '   ', 'a'.repeat(2001)])assert.throws(()=>messageInput.parse({body,clientMessageId}));
  assert.equal(messageInput.parse({body:'a'.repeat(2000),clientMessageId}).body.length,2000);
  assert.throws(()=>messageInput.parse({body:'hello',clientMessageId:'invalid'}));
});
test('cursor round trip and invalid cursor combinations',()=>{
 const point={createdAt:new Date('2026-10-18T00:00:00.000Z'),id:'87cfe008-0cc2-4d05-88bf-d90255322828'};
 assert.deepEqual(decodeCursor(encodeCursor(point)),point);
 for(const c of ['!', 'e30', 'a'.repeat(1000)])assert.throws(()=>decodeCursor(c));
 assert.throws(()=>pageInput.parse({before:'x',after:'y'}));
});
