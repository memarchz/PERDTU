import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { getJson } from '../lib/api.mjs';
import * as client from '../lib/api.mjs';

let server;
let base;
before(async () => {
  server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/empty') {
      res.writeHead(204).end();
    } else if (req.url === '/unauthorized') {
      res.writeHead(401).end(JSON.stringify({ error: 'Invalid token' }));
    } else if (req.url === '/conflict') {
      res.writeHead(409).end(JSON.stringify({ error: 'Item already reserved; trade cannot be confirmed' }));
    } else if (req.url === '/plain') {
      res.writeHead(502, {'Content-Type':'text/plain'}).end('private server diagnostics');
    } else if (req.url === '/multipart') {
let body=''; req.on('data',part=>body+=part);req.on('end',()=>res.end(JSON.stringify({type:req.headers['content-type'],authorization:req.headers.authorization,body})));
    } else if (req.url === '/echo') {
      let body='';req.on('data', part=>{body+=part;});req.on('end',()=>res.end(JSON.stringify({method:req.method,authorization:req.headers.authorization,body:JSON.parse(body)})));
    } else if (req.url === '/items/existing') {
      res.end(JSON.stringify({ title: 'Test book', condition: 'GOOD' }));
    } else if (req.url === '/items/missing') {
      res.writeHead(404).end(JSON.stringify({ error: 'Not found' }));
    } else {
      res.writeHead(500).end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('returns an existing item from a successful API response', async () => {
  assert.deepEqual(await getJson(`${base}/items/existing`), { title: 'Test book', condition: 'GOOD' });
});

test('rejects a missing item instead of treating an HTTP error as item data', async () => {
  await assert.rejects(getJson(`${base}/items/missing`), { message: 'Not found.' });
});

test('rejects server errors instead of passing error objects to list rendering', async () => {
  await assert.rejects(getJson(`${base}/items/error`), { message: 'Could not load data. Please try again.' });
});

test('reports a disconnected API with an actionable message', async () => {
  const disconnected = createServer();
  disconnected.listen(0, '127.0.0.1');
  await once(disconnected, 'listening');
  const port = disconnected.address().port;
  await new Promise(resolve => disconnected.close(resolve));
  await assert.rejects(getJson(`http://127.0.0.1:${port}/items`), {
    message: 'Cannot connect to the API. Please try again.',
  });
});

test('preserves cancellation so superseded requests can be ignored', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(getJson(`${base}/items/existing`, { signal: controller.signal }), { name: 'AbortError' });
});

test('sends authenticated JSON mutations with an explicit bearer token', async () => {
  const result=await client.apiRequest(`${base}/echo`,{method:'POST',body:{title:'Book'},token:'test-token'});
  assert.deepEqual(result,{method:'POST',authorization:'Bearer test-token',body:{title:'Book'}});
});
test('accepts no-content deletion responses',async()=>{
  assert.equal(await client.apiRequest(`${base}/empty`,{method:'DELETE'}),undefined);
});
test('exposes 401 status for session expiry handling',async()=>{
  await assert.rejects(client.apiRequest(`${base}/unauthorized`),error=>error instanceof client.ApiError&&error.status===401);
});
test('retains safe conflict messages and status for a refresh action',async()=>{
  await assert.rejects(client.apiRequest(`${base}/conflict`),{status:409,message:'Item already reserved; trade cannot be confirmed'});
});
test('does not reveal raw non-JSON server diagnostics',async()=>{
  await assert.rejects(client.apiRequest(`${base}/plain`),{status:502,message:'Could not load data. Please try again.'});
});

test('sends FormData with browser-generated boundary and real file payload',async()=>{const formData=new FormData();formData.set('file',new Blob(['photo bytes'],{type:'image/png'}),'photo.png');const r=await client.apiRequest(base+'/multipart',{method:'POST',formData,token:'test-token'});assert.match(r.type,/multipart\/form-data; boundary=/);assert.match(r.body,/photo bytes/);assert.match(r.body,/filename="photo.png"/);assert.equal(r.authorization,'Bearer test-token');});
