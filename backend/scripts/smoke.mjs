import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

// Intentionally creates labeled test accounts and one listing; no records are deleted.
const base = new URL(process.env.PERDTU_SMOKE_API_URL || 'http://localhost:4000');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname),
  'Smoke checks write test data and are restricted to a local development API.');

let checks = 0;
async function request(path, { method = 'GET', body, token, status = 200 } = {}) {
  let response;
  try {
    response = await fetch(new URL(path, base), {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
  } catch {
    throw new Error(`Cannot reach the local API: ${method} ${path}. Start the API and check its port.`);
  }
  assert.equal(response.status, status, `${method} ${path}: unexpected HTTP status`);
  const data = await response.json();
  checks += 1;
  console.log(`PASS ${method} ${path} (${status})`);
  return data;
}

async function main() {
  const health = await request('/health');
  assert.equal(health.status, 'ok');

  const credentials = {
    email: `perdtu-smoke-${randomUUID()}@example.test`,
    password: randomBytes(24).toString('hex'),
    displayName: 'PERDTU smoke owner',
  };
  const owner = await request('/api/v1/auth/register', { method: 'POST', body: credentials, status: 201 });
  assert.ok(owner.id, 'Registration must return the new user id');
  await request('/api/v1/auth/register', { method: 'POST', body: credentials, status: 409 });
  await request('/api/v1/auth/login', {
    method: 'POST', body: { email: credentials.email, password: 'incorrect-smoke-password' }, status: 401,
  });
  const login = await request('/api/v1/auth/login', { method: 'POST', body: credentials });
  assert.ok(login.accessToken, 'Login must return an access token');
  const token = login.accessToken;
  const me = await request('/api/v1/users/me', { token });
  assert.equal(me.id, owner.id);
  assert.equal(me.passwordHash, undefined, 'Profile must not expose password hashes');

  const listing = {
    title: 'PERDTU smoke item', description: 'Local integration smoke listing', category: 'Books', exchangeCategory:'Books', condition: 'GOOD',
  };
  await request('/api/v1/items', { method: 'POST', body: listing, status: 401 });
  const item = await request('/api/v1/items', { method: 'POST', body: listing, token, status: 201 });
  assert.ok(item.id, 'Listing creation must return an id');
  assert.equal(item.ownerId, owner.id);
  assert.equal(item.status, 'AVAILABLE');
  const detail = await request(`/api/v1/items/${item.id}`);
  assert.equal(detail.title, listing.title);
  assert.equal(detail.owner.id, owner.id);
  const found = await request('/api/v1/items?q=PERDTU');
  assert.ok(found.some(value => value.id === item.id), 'Public search must return the created listing');
  const mine = await request('/api/v1/me/items', { token });
  assert.ok(mine.some(value => value.id === item.id), 'Owner must see their listing');
  assert.ok(mine.every(value => value.ownerId === owner.id), 'Owner query must not return another user\'s listings');
  await request(`/api/v1/items/${randomUUID()}`, { status: 404 });

  const otherCredentials = {
    email: `perdtu-smoke-${randomUUID()}@example.test`,
    password: randomBytes(24).toString('hex'), displayName: 'PERDTU smoke other',
  };
  await request('/api/v1/auth/register', { method: 'POST', body: otherCredentials, status: 201 });
  const other = await request('/api/v1/auth/login', { method: 'POST', body: otherCredentials });
  const othersItems = await request('/api/v1/me/items', { token: other.accessToken });
  assert.deepEqual(othersItems, [], 'A different new account must not see the owner\'s private listing collection');

  console.log(`PASS ${checks} API requests and ownership assertions. Test records retained.`);
  console.log(`Listing: ${item.id}`);
}

main().catch(error => {
  // Avoid printing full response objects, request bodies, tokens or passwords.
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
});
