import {verificationPath} from './verification-output.mjs';
﻿import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {request as httpRequest} from 'node:http';
import {PrismaClient} from '@prisma/client';
import 'dotenv/config';
const base=process.env.PERDTU_SMOKE_API_URL||'http://localhost:4000';assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname));let checks=0;
async function req(path,{token,body,form,status=200,method='GET',headers={}}={}){const r=await fetch(base+'/api/v1'+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:form|| (body?JSON.stringify(body):undefined)});assert.equal(r.status,status,`${method} ${path}: ${await r.clone().text()}`);checks++;return r.status===204?null:r.headers.get('content-type')?.includes('json')?r.json():r;}
async function account(){const body={email:`media-${randomUUID()}@example.test`,password:randomUUID(),displayName:'Media verification'};await req('/auth/register',{method:'POST',body,status:201});return req('/auth/login',{method:'POST',body});}
const a=await account(),b=await account(),token=a.accessToken;
const png=await sharp({create:{width:12,height:8,channels:3,background:'#009955'}}).png().toBuffer();
async function upload(bytes=png,t=token,status=201,type='image/png'){const form=new FormData();form.set('file',new Blob([bytes],{type}),'../../outside.png');return req('/uploads/images',{method:'POST',token:t,form,status});}
const p=await upload();assert.equal(p.mime,'image/webp');assert.equal(p.width,12);assert.equal(p.filename,undefined);await req('/media/'+p.id,{status:404});
await upload(png,null,401);await upload(Buffer.from('<svg/>'),token,400);await upload(Buffer.alloc(5*1024*1024+1),token,413);
await req('/uploads/images',{method:'POST',token,form:'broken',headers:{'Content-Type':'multipart/form-data; boundary=bad'},status:400});
await req('/uploads/images/'+p.id,{method:'DELETE',token:b.accessToken,status:404});await req('/uploads/images/'+p.id,{method:'DELETE',token,status:204});await req('/uploads/images/'+p.id,{method:'DELETE',token,status:404});

const photos=await Promise.all([upload(),upload(),upload(),upload(),upload()]);
const fields={title:'Media verification listing',description:'Persistent photo integration listing',category:'Books',exchangeCategory:'Books',condition:'GOOD'};
const make=(body,t=token,status=201)=>req('/items',{method:'POST',token:t,body:{...fields,...body},status});
await make({photoIds:photos.map(p=>p.id)},token,400);await make({photoIds:[photos[0].id,photos[0].id]},token,400);
await make({photoIds:[photos[0].id]},b.accessToken,400);
const item=await make({photoIds:photos.slice(0,4).map(p=>p.id)});assert.deepEqual(item.images.map(p=>p.id),photos.slice(0,4).map(p=>p.id));assert.equal(item.imageUrl,item.images[0].url);
assert.equal(item.photos,undefined);await make({photoIds:[photos[0].id]},token,400);
const publicPhoto=await req('/media/'+photos[0].id);assert.match(publicPhoto.headers.get('content-type'),/image\/webp/);assert.equal(publicPhoto.headers.get('x-content-type-options'),'nosniff');assert.match(publicPhoto.headers.get('cache-control'),/no-store/);
await req('/uploads/images/'+photos[0].id,{method:'DELETE',token,status:404});
await req('/items/'+item.id,{method:'PATCH',token:b.accessToken,body:{title:'Foreign edit'},status:404});
const edited=await req('/items/'+item.id,{method:'PATCH',token,body:{title:'Updated media listing',photoIds:[photos[1].id,photos[0].id]}});assert.equal(edited.images.length,2);assert.equal(edited.images[0].id,photos[1].id);await req('/media/'+photos[2].id);
const legacy=await make({imageUrl:'https://example.test/legacy.png'});const same=await req('/items/'+legacy.id,{method:'PATCH',token,body:{title:'Legacy preserved'}});assert.equal(same.imageUrl,legacy.imageUrl);
await req('/saved-items',{status:401});await req('/saved-items/'+item.id,{method:'PUT',token:b.accessToken});await req('/saved-items/'+item.id,{method:'PUT',token:b.accessToken});assert.equal((await req('/saved-items',{token:b.accessToken})).length,1);assert.equal((await req('/saved-items',{token})).length,0);
await req('/items/'+item.id,{method:'DELETE',token,status:204});await req('/items/'+item.id,{status:404});await req('/media/'+photos[0].id,{status:404});const tomb=(await req('/saved-items',{token:b.accessToken}))[0];assert.equal(tomb.available,false);assert.deepEqual(Object.keys(tomb.item).sort(),['id','status','title']);await req('/saved-items/'+item.id,{method:'PUT',token,status:404});
await req('/saved-items/'+item.id,{method:'DELETE',token:b.accessToken,status:204});await req('/saved-items/'+item.id,{method:'DELETE',token:b.accessToken,status:204});

// Proposal cancellation and acceptance races use fresh, uniquely matching fixtures.
async function pair(){const users=await Promise.all([account(),account()]),markers=[randomUUID().replaceAll('-',''),randomUUID().replaceAll('-','')],items=[];
for(let i=0;i<2;i++)items.push(await make({title:'Media '+markers[i],description:'Race fixture '+markers[i]},users[i].accessToken));
const edges=items.map((item,i)=>({itemId:item.id,from:users[i].user.id,to:users[(i+1)%2].user.id}));const trade=await req('/trades',{token:users[0].accessToken,method:'POST',status:201,body:{edges}});return {users,items,trade};}
for(const method of ['PATCH','DELETE']){
const g=await pair(),before=JSON.stringify(g.trade.items.map(i=>i.snapshot));await req('/items/'+g.items[0].id,{method,token:g.users[0].accessToken,body:method==='PATCH'?{title:'Edited pending listing'}:undefined,status:method==='PATCH'?200:204});const after=await req('/trades/'+g.trade.id,{token:g.users[1].accessToken});assert.equal(after.status,'CANCELLED');assert.equal(after.events.filter(e=>e.eventType===(method==='PATCH'?'ITEM_UPDATED':'ITEM_ARCHIVED')).length,1);assert.equal(JSON.stringify(after.items.map(i=>i.snapshot)),before);
await req('/trades/'+g.trade.id+'/respond',{method:'POST',token:g.users[1].accessToken,body:{accept:true},status:409});
const race=await pair();await req('/trades/'+race.trade.id+'/respond',{method:'POST',token:race.users[1].accessToken,body:{accept:true}});
const options=[{url:'/items/'+race.items[0].id,method,token:race.users[0].accessToken,body:method==='PATCH'?{title:'Race changed listing'}:undefined},{url:'/trades/'+race.trade.id+'/respond',method:'POST',token:race.users[0].accessToken,body:{accept:true}}];
const results=await Promise.all(options.map(async o=>{const r=await fetch(base+'/api/v1'+o.url,{method:o.method,headers:{Authorization:'Bearer '+o.token,...(o.body?{'Content-Type':'application/json'}:{})},body:o.body?JSON.stringify(o.body):undefined});checks++;assert.ok([200,204,409].includes(r.status));return r.status;}));assert.equal(results.filter(s=>s===409).length,1);
const state=await req('/trades/'+race.trade.id,{token:race.users[0].accessToken});assert.ok(['CONFIRMED','CANCELLED'].includes(state.status));
const inventory=await req('/me/items',{token:race.users[0].accessToken}),own=inventory.find(i=>i.id===race.items[0].id);if(state.status==='CONFIRMED'){assert.equal(own.status,'RESERVED');assert.equal(own.title,race.items[0].title);for(const verb of ['PATCH','DELETE'])await req('/items/'+own.id,{method:verb,token:race.users[0].accessToken,body:verb==='PATCH'?{title:'Reserved cannot edit'}:undefined,status:409});for(const u of race.users)await req('/trades/'+race.trade.id+'/receipt',{method:'POST',token:u.accessToken,body:{}});await req('/items/'+own.id,{method:'DELETE',token:race.users[0].accessToken,status:409});}else{assert.equal(own.status,method==='PATCH'?'AVAILABLE':'ARCHIVED');assert.equal(state.events.filter(e=>e.eventType.startsWith('ITEM_')).length,1);assert.equal((await req('/items/'+race.items[1].id)).status,'AVAILABLE');}
}

const verifyDb=new PrismaClient();try{const before=await verifyDb.photo.count({where:{ownerId:a.user.id}});await new Promise(resolve=>{const r=httpRequest(base+'/api/v1/uploads/images',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'multipart/form-data; boundary=abort-test'}},()=>{});r.on('error',()=>resolve());r.flushHeaders();r.write('--abort-test\r\nContent-Disposition: form-data; name="file"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n');r.write(png);setTimeout(()=>{r.destroy();resolve();},40);});await new Promise(r=>setTimeout(r,150));assert.equal(await verifyDb.photo.count({where:{ownerId:a.user.id}}),before,'Aborted multipart must not create a usable Photo');checks++;}finally{await verifyDb.$disconnect();}
await req('/media/..%2foutside.webp',{status:404});
const persistencePhoto=await upload(),persistenceItem=await make({title:'Media restart persistence fixture',photoIds:[persistencePhoto.id]});const persisted=await req('/media/'+persistencePhoto.id);const sha256=createHash('sha256').update(Buffer.from(await persisted.arrayBuffer())).digest('hex');await writeFile(verificationPath('media-persistence.json'),JSON.stringify({itemId:persistenceItem.id,photoId:persistencePhoto.id,sha256}));
console.log(`Media smoke passed ${checks} HTTP assertions`);

