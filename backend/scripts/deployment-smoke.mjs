import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {writeFile,readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const origin=new URL(process.env.PERDTU_DEPLOY_SMOKE_ORIGIN||'http://localhost:18080');
assert.ok(['localhost','127.0.0.1','[::1]'].includes(origin.hostname),'Only run deployment fixtures against a local Docker test stack.');
const statePath=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../.superpowers/deploy-smoke-state.json');
let checks=0;
// Container recreation and Docker DNS refresh can briefly precede API readiness.
for(let i=0;i<60;i++){
 try {const r=await fetch(new URL('/healthz',origin),{signal:AbortSignal.timeout(3000)});if(r.ok)break;if(i===59)throw Error('Deployment health did not recover.');}
 catch(error){if(i===59)throw error;}
 await new Promise(resolve=>setTimeout(resolve,500));
}
async function request(url,{token,body,form,status=200}={}){
 const response=await fetch(new URL(url,origin),{method:body||form?'POST':'GET',headers:{Origin:origin.origin,...(token?{Authorization:`Bearer ${token}`} :{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:form?{body:form}:{}),signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,status,`${url}: ${await response.clone().text()}`);checks++;
 if(url.startsWith('/api/v1/'))assert.equal(response.headers.get('access-control-allow-origin'),origin.origin);
 return response;
}
async function api(route,options){return (await request('/api/v1'+route,options)).json();}
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
if(process.argv.includes('--verify-persistence')){
 const state=JSON.parse(await readFile(statePath,'utf8'));
 assert.equal(state.origin,origin.origin);
 const photo=await request(state.photoUrl);assert.equal(digest(Buffer.from(await photo.arrayBuffer())),state.photoHash);
 assert.equal((await api(`/trades/${state.tradeId}`,{token:state.token})).status,'COMPLETED');
 const chat=await api(`/trades/${state.tradeId}/messages`,{token:state.token});assert.equal(chat.canSend,false);assert.ok(chat.messages.some(m=>m.id===state.messageId));
 console.log(`Deployment persistence: ${checks} checks passed after container recreation.`);
}else{
 for(const route of ['/','/explore','/matches','/healthz'])await request(route);
 const users=[];
 for(let i=0;i<2;i++){
  const credentials={email:`docker-${randomUUID()}@example.test`,password:randomUUID(),displayName:`Docker member ${i+1}`};
  await api('/auth/register',{body:credentials,status:201});const login=await api('/auth/login',{body:credentials});users.push({...login.user,token:login.accessToken});
 }
 const bytes=await sharp({create:{width:16,height:12,channels:3,background:'#14795f'}}).png().toBuffer();
 const form=new FormData();form.set('file',new Blob([bytes],{type:'image/png'}),'fixture.png');
 const photo=await api('/uploads/images',{token:users[0].token,form,status:201});
 const items=[];
 for(let i=0;i<2;i++)items.push(await api('/items',{token:users[i].token,status:201,body:{title:`Docker books ${i}`,description:'Deployment integration books fixture',category:'Books',exchangeCategory:'Books',condition:'GOOD',...(i===0?{photoIds:[photo.id]}:{})}}));
 assert.equal(new URL(items[0].imageUrl).origin,origin.origin);
 const photoResponse=await request(items[0].imageUrl);assert.match(photoResponse.headers.get('content-type'),/image\/webp/);const photoHash=digest(Buffer.from(await photoResponse.arrayBuffer()));
 const matchPath=`/matches?itemId=${items[0].id}&targetItemId=${items[1].id}&mode=direct&alternatives=false`;
 let matches;
 for(let i=0;i<120;i++){
  const response=await fetch(new URL('/api/v1'+matchPath,origin),{headers:{Authorization:'Bearer '+users[0].token},signal:AbortSignal.timeout(30000)});checks++;
  assert.ok([200,202].includes(response.status),`AI must be ready/preparing, got ${response.status}`);const result=await response.json();
  if(response.status===200){matches=result.matches;break;}await new Promise(resolve=>setTimeout(resolve,1000));
 }
 const match=matches?.find(m=>m.edges.length===2&&m.items.some(item=>item.id===items[1].id));assert.ok(match,'Local model should produce the reciprocal two-book exchange.');
 const trade=await api('/trades',{token:users[0].token,status:201,body:{edges:match.edges.map(({from,to,itemId})=>({from,to,itemId})),expectedFingerprints:match.fingerprints}});
 const chatPath=`/trades/${trade.id}/messages`,text={body:'Meet at the library',clientMessageId:randomUUID()};
 assert.equal((await api(chatPath,{token:users[0].token})).canSend,false);
 await api(chatPath,{token:users[0].token,body:text,status:409});
 for(const u of users)await api(`/trades/${trade.id}/respond`,{token:u.token,body:{accept:true}});
 assert.equal((await api(chatPath,{token:users[1].token})).canSend,true);
 const sent=await api(chatPath,{token:users[0].token,body:text,status:201});assert.equal((await api(chatPath,{token:users[0].token,body:text})).message.id,sent.message.id);
 for(const u of users)await api(`/trades/${trade.id}/receipt`,{token:u.token,body:{}});
 assert.equal((await api(chatPath,{token:users[0].token})).canSend,false);
 for(let i=0;i<2;i++)assert.equal((await api('/me/items',{token:users[i].token})).find(item=>item.id===items[i].id).status,'EXCHANGED');
 await mkdir(path.dirname(statePath),{recursive:true});
 await writeFile(statePath,JSON.stringify({origin:origin.origin,token:users[0].token,tradeId:trade.id,messageId:sent.message.id,photoUrl:items[0].imageUrl,photoHash}),{mode:0o600});
 console.log(`Deployment end-to-end: ${checks} checks passed through Nginx (auth, upload, local AI, exchange, chat, completion).`);
}
