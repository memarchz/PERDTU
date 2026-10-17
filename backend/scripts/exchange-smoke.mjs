import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

const base = new URL(process.env.PERDTU_SMOKE_API_URL || 'http://localhost:4000');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Exchange checks require a local development API.');
let requests = 0;
async function send(path, { token, method = 'GET', body, status = 200 } = {}) {
  let response = await fetch(new URL(`/api/v1${path}`, base), {
    method, redirect: 'error', signal: AbortSignal.timeout(20000),
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if(path.startsWith('/matches')){for(let n=0;response.status===202&&n<40;n++){await new Promise(r=>setTimeout(r,100));response=await fetch(new URL('/api/v1'+path,base),{headers:{Authorization:'Bearer '+token}});}}
  const expected = Array.isArray(status) ? status : [status];
  assert.ok(expected.includes(response.status), `${method} ${path}: expected ${expected}, received ${response.status}`);
  requests++;
  return { status: response.status, data: response.status === 204 ? undefined : await response.json() };
}
const api = async(path,options)=>{const data=(await send(path,options)).data;return path.startsWith('/matches')?data.matches:data;};
function privateFieldsAbsent(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!['email', 'passwordHash', 'accessToken'].includes(key), `Private field exposed: ${key}`);
    privateFieldsAbsent(child);
  }
}
async function user(label) {
  const credentials = { email: `perdtu-exchange-${randomUUID()}@example.test`, password: randomBytes(24).toString('hex'), displayName: `PERDTU exchange ${label}` };
  const registered = await api('/auth/register', { method: 'POST', body: credentials, status: 201 });
  const login = await api('/auth/login', { method: 'POST', body: credentials });
  return { id: registered.id, token: login.accessToken, displayName: credentials.displayName };
}
async function group(count, shared = false) {
  const users = [], items = [], markers = [];
  const sharedMarker = `exchange${randomUUID().replaceAll('-', '')}`;
  for (let i = 0; i < count; i++) {
    const owner = await user(String(i + 1)); users.push(owner);
    const marker = shared ? sharedMarker : `exchange${randomUUID().replaceAll('-', '')}`; markers.push(marker);
    items.push(await api('/items', { token: owner.token, method: 'POST', status: 201, body: { title: `PERDTU exchange ${marker}`, description: `Local exchange fixture ${marker}`, category: shared?'Electronics':count===3?'Clothing':count===4?'Sports':'Books', exchangeCategory:shared?'Electronics':count===3?'Clothing':count===4?'Sports':'Books', condition: 'GOOD', area: 'Local test' } }));
  }
  const edges = users.map((u, i) => ({ from: u.id, to: users[(i + 1) % count].id, itemId: items[i].id }));
  return { users, items, edges, markers };
}
async function propose(g) {
  return api('/trades', { token: g.users[0].token, method: 'POST', body: { edges: g.edges }, status: 201 });
}
const detail = (trade, u) => api(`/trades/${trade.id}`, { token: u.token });
const respond = (trade, u, accept, status = 200) => api(`/trades/${trade.id}/respond`, { token: u.token, method: 'POST', body: { accept }, status });
const receipt = (trade, u, status = 200) => api(`/trades/${trade.id}/receipt`, { token: u.token, method: 'POST', body: {}, status });

async function main() {
  const g = await group(2), outsider = await user('outsider');
  const matches = await api(`/matches?itemId=${g.items[0].id}&targetItemId=${g.items[1].id}`, { token: g.users[0].token });
  const match = matches.find(m => m.edges.length === 2 && g.edges.every(e => m.edges.some(x => x.from === e.from && x.to === e.to && x.itemId === e.itemId)));
  assert.ok(match, 'Complementary items and wishes must produce their two-person cycle');
  assert.ok(Array.isArray(match.items), 'Matches must include item summaries');
  assert.equal(match.items.find(i => i.id === g.items[0].id)?.title, g.items[0].title);
  assert.equal(match.participants.find(p => p.id === g.users[0].id)?.displayName, g.users[0].displayName);
  privateFieldsAbsent(match);
  const trade = await propose(g);
  for (const u of g.users) {
    const t = await detail(trade, u); assert.equal(t.id, trade.id); assert.equal(t.events[0].eventType, 'PROPOSED');
    assert.equal(t.participants.find(p => p.userId === u.id).user.displayName, u.displayName); privateFieldsAbsent(t);
  }
  await api(`/trades/${trade.id}`, { token: outsider.token, status: 404 });
  await api(`/trades/${randomUUID()}`, { token: outsider.token, status: 404 });
  await api(`/trades/${trade.id}`, { status: 401 });
  await api('/wishlist',{token:g.users[0].token,status:410});
  await api('/wishlist',{status:401});
  console.log('PASS public match/trade summaries, participant-only detail and Wishlist retirement');
  if (process.argv.includes('--reads')) { console.log(`PASS ${requests} requests (read API checks); labeled test records retained.`); return; }

  assert.ok((await detail(trade, g.users[0])).participants.every(p => p.decision === 'PENDING'), 'Proposal is not acceptance');
  await respond(trade, outsider, true, 409); await receipt(trade, outsider, 409);
  await respond(trade, g.users[0], true); await respond(trade, g.users[0], true, 409);
  assert.equal((await detail(trade, g.users[0])).status, 'PROPOSED');
  await respond(trade, g.users[1], true);
  assert.equal((await detail(trade, g.users[0])).status, 'CONFIRMED');
  for (const item of g.items) assert.equal((await api(`/items/${item.id}`)).status, 'RESERVED');
  await receipt(trade, g.users[0]); await receipt(trade, g.users[0], 409);
  assert.equal((await detail(trade, g.users[0])).status, 'EXCHANGING');
  await receipt(trade, g.users[1]);
  assert.equal((await detail(trade, g.users[0])).status, 'COMPLETED');
  for (const item of g.items) {
    assert.equal((await api(`/items/${item.id}`)).status, 'EXCHANGED');
    assert.ok(!(await api(`/items?q=${encodeURIComponent(item.title)}`)).some(i => i.id === item.id));
  }
  console.log('PASS unanimous acceptance, reservation, duplicate protection and all-receiver completion');

  const declined = await group(2), dt = await propose(declined);
  await respond(dt, declined.users[0], false); await respond(dt, declined.users[1], true, 409); await receipt(dt, declined.users[0], 409);
  assert.equal((await detail(dt, declined.users[0])).status, 'DECLINED');
  for (const item of declined.items) assert.equal((await api(`/items/${item.id}`)).status, 'AVAILABLE');
  console.log('PASS decline is terminal and does not reserve items');

  const race = await group(2), third = await user('competing');
  const thirdMarker = `exchange${randomUUID().replaceAll('-', '')}`;
  const thirdItem = await api('/items', { token: third.token, method: 'POST', status: 201, body: { title: `PERDTU exchange ${thirdMarker}`, description: `Local competing fixture ${thirdMarker}`, category: 'Books', exchangeCategory:'Books', condition: 'GOOD' } });
  const r1 = await propose(race), r2 = await propose({ users: [race.users[0], third], edges: [{ from: race.users[0].id, to: third.id, itemId: race.items[0].id }, { from: third.id, to: race.users[0].id, itemId: thirdItem.id }] });
  await respond(r1, race.users[1], true); await respond(r2, third, true);
  const outcomes = await Promise.all([r1, r2].map(t => send(`/trades/${t.id}/respond`, { token: race.users[0].token, method: 'POST', body: { accept: true }, status: [200, 409] })));
  for(const outcome of outcomes) if(outcome.status === 409) assert.ok(!/prisma|\$transaction|invocation/i.test(outcome.data.error), 'Conflict must not expose database implementation details');
  assert.equal(outcomes.filter(o => o.status === 200).length, 1, 'Exactly one competing trade must reserve the shared item');
  const states = await Promise.all([r1, r2].map(t => detail(t, race.users[0])));
  assert.equal(states.filter(t => t.status === 'CONFIRMED').length, 1);
  const loserIndex = states.findIndex(t => t.status !== 'CONFIRMED');
  const freeItem = loserIndex === 0 ? race.items[1] : thirdItem;
  assert.equal((await api(`/items/${freeItem.id}`)).status, 'AVAILABLE', 'Losing transaction must not partially reserve another item');
  const winning = loserIndex === 0 ? r2 : r1, other = loserIndex === 0 ? third : race.users[1];
  const receipts = await Promise.all([race.users[0], other].map(u => send(`/trades/${winning.id}/receipt`, { token: u.token, method: 'POST', body: {}, status: [200, 409] })));
  for(const outcome of receipts) if(outcome.status === 409) assert.ok(!/prisma|\$transaction|invocation/i.test(outcome.data.error), 'Receipt conflict must have a safe message');
  for (let i = 0; i < receipts.length; i++) if (receipts[i].status === 409) await receipt(winning, [race.users[0], other][i]);
  const completed = await detail(winning, race.users[0]); assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.events.filter(e => e.eventType === 'RECEIPT_CONFIRMED').length, 2);
  console.log('PASS competing proposals, atomic rollback and concurrent receipt recovery');

  for (const count of [3, 4]) {
    const multi = await group(count), cycles = await api(`/matches?itemId=${multi.items[0].id}&targetItemId=${multi.items[1].id}&mode=circles`, { token: multi.users[0].token });
    const found = cycles.find(c => c.edges.length === count && multi.edges.every(e => c.edges.some(x => x.from === e.from && x.to === e.to && x.itemId === e.itemId)));
    assert.ok(found, `Must expose the ${count}-person cycle`); assert.equal(new Set(found.edges.map(e => e.from)).size, count);
    const t = await propose(multi); for (const u of multi.users) await respond(t, u, true);
    for (let i = 0; i < count; i++) {
      await receipt(t, multi.users[i]);
      assert.equal((await detail(t, multi.users[0])).status, i === count - 1 ? 'COMPLETED' : 'EXCHANGING');
    }
    console.log(`PASS ${count}-person cycle and every participant receipt`);
  }
  const shared = await group(3, true);
  const alternatives = (await api(`/matches?itemId=${shared.items[1].id}&targetItemId=${shared.items[0].id}&mode=circles`, {token:shared.users[1].token})).filter(c=>c.edges.length===3&&c.edges.every(e=>shared.items.some(i=>i.id===e.itemId)));
  assert.equal(alternatives.length,2,'Same three items must retain both valid directed exchanges');
  for(const candidate of alternatives)await propose({users:[shared.users[1]],edges:candidate.edges.map(({from,to,itemId})=>({from,to,itemId}))});
  console.log('PASS both displayed directions with the same three items are proposable through the actual API');
  console.log(`PASS ${requests} exchange requests; labeled local test records retained.`);
}
main().catch(error => { console.error(`FAIL ${error.message}`); process.exitCode = 1; });
