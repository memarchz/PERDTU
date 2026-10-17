import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import jwt from 'jsonwebtoken';
import {PrismaClient} from '@prisma/client';
const db=new PrismaClient(), base=new URL(process.env.PERDTU_SMOKE_API_URL||'http://localhost:4000');
assert.ok(['localhost','127.0.0.1','[::1]'].includes(base.hostname));
let checks=0;
async function call(path,user,body,status=200){
 const response=await fetch(new URL('/api/v1'+path,base),{method:body?'POST':'GET',headers:{...(user?{Authorization:'Bearer '+jwt.sign({sub:user.id},process.env.JWT_SECRET,{expiresIn:'10m'})}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 assert.ok((Array.isArray(status)?status:[status]).includes(response.status),`${path}: expected ${status}, got ${response.status}: ${await response.clone().text()}`);checks++;
 const data=await response.json();assert.ok(!JSON.stringify(data).includes('passwordHash'));assert.ok(!JSON.stringify(data).includes('@example.test'));return data;
}
async function fixture(n){
 const users=await Promise.all(Array.from({length:n},(_,i)=>db.user.create({data:{email:`chat-${randomUUID()}@example.test`,displayName:`Chat member ${i+1}`,passwordHash:'not-a-login-fixture'}})));
 const trade=await db.trade.create({data:{participants:{create:users.map(u=>({userId:u.id}))}}});return {users,trade,path:`/trades/${trade.id}/messages`};
}
const body=(text='Hello')=>({body:text,clientMessageId:randomUUID()});
try {
 const outsider=await db.user.create({data:{email:`chat-outsider-${randomUUID()}@example.test`,displayName:'Outside',passwordHash:'not-a-login-fixture'}});
 for(const n of [2,3,4]){
  const {users,trade,path}=await fixture(n);
  await call(path,null,undefined,401);await call(path,outsider,undefined,404);await call(path,outsider,body(),404);
  assert.equal((await call(path,users[0])).opened,false);await call(path,users[0],body(),409);
  for(let i=0;i<n;i++){
   await call(`/trades/${trade.id}/respond`,users[i],{accept:true});
   assert.equal((await call(path,users[0])).canSend,i===n-1);
  }
  for(const u of users)assert.equal((await call(path,u)).canSend,true);
  const text=body('  <script>plain text only</script>  '),sent=await call(path,users[0],text,201);
  assert.equal(sent.message.body,'<script>plain text only</script>');
  assert.equal((await call(path,users[0],text)).message.id,sent.message.id);
  await call(path,users[0],{...text,body:'different'},409);
  for(const invalid of [body(' '),body('a'.repeat(2001)),{body:'hi',clientMessageId:'bad'}])await call(path,users[0],invalid,400);
  if(n===2){
   const stamp=new Date(Date.now()+1000);
   await db.tradeMessage.createMany({data:Array.from({length:52},(_,i)=>({id:randomUUID(),tradeId:trade.id,senderId:users[0].id,body:`page ${i}`,clientMessageId:randomUUID(),createdAt:stamp}))});
   const latest=await call(path,users[0]);assert.equal(latest.messages.length,50);assert.equal(latest.hasMore,true);
   const older=await call(path+'?before='+latest.olderCursor,users[0]);assert.equal(older.messages.length,3);assert.equal(older.hasMore,false);
   const all=[...older.messages,...latest.messages];assert.equal(new Set(all.map(m=>m.id)).size,53);
   const next=await call(path+'?after='+older.nextCursor,users[0]);assert.deepEqual(next.messages.map(m=>m.id),latest.messages.map(m=>m.id));
   await call(path+'?before='+latest.olderCursor+'&after='+latest.nextCursor,users[0],undefined,400);
   await call(path+'?after=invalid',users[0],undefined,400);
   const other=await fixture(2);await db.tradeParticipant.create({data:{tradeId:other.trade.id,userId:users[0].id}});await db.trade.update({where:{id:other.trade.id},data:{status:'CONFIRMED'}});
   await call(other.path+'?after='+latest.nextCursor,users[0],undefined,400);
   const retry=body('concurrent identical');
   const concurrent=await Promise.all([call(path,users[0],retry,[200,201]),call(path,users[0],retry,[200,201])]);
   assert.equal(concurrent[0].message.id,concurrent[1].message.id);
   assert.equal(await db.tradeMessage.count({where:{tradeId:trade.id,clientMessageId:retry.clientMessageId}}),1);
  }
  for(const u of users.slice(0,-1))await call(`/trades/${trade.id}/receipt`,u,{});
  // Send and final receipt race on the real API. Either the message wins or is rejected.
  const raced=body('last moment');
  const token=jwt.sign({sub:users[0].id},process.env.JWT_SECRET,{expiresIn:'10m'});
  const [sendResult]=await Promise.all([
   fetch(new URL('/api/v1'+path,base),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(raced)}),
   call(`/trades/${trade.id}/receipt`,users.at(-1),{})]);
  assert.ok([201,409].includes(sendResult.status));checks++;
  assert.equal(await db.tradeMessage.count({where:{tradeId:trade.id,clientMessageId:raced.clientMessageId}}),sendResult.status===201?1:0);
  const completed=await call(path,users[0]);assert.equal(completed.canSend,false);assert.ok(completed.messages.length);
  await call(path,users[0],body(),409);await call(path,users[0],text); // acknowledged retry remains safe
  await db.trade.update({where:{id:trade.id},data:{status:'CANCELLED'}});
  assert.ok((await call(path,users[0])).messages.length);await call(path,users[0],body(),409);
 }
 console.log(`Chat integration: ${checks} HTTP checks passed (2/3/4 members, cursors, retries, receipt races).`);
} finally {await db.$disconnect();}
