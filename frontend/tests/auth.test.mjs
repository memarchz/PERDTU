import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import ts from 'typescript';
import { ApiError } from '../lib/api.mjs';

// Execute the actual provider with controllable hook scheduling and API timing.
// This isolates session races; it does not claim React/browser hydration coverage.
function harness() {
  const states = [], refs = [], effects = [], calls = [];
  let stateIndex = 0, refIndex = 0, rendered = false;
  const store = new Map([['perdtu_token', 'old-A']]);
  const hooks = {
    createContext: () => ({ Provider: 'Provider' }),
    useState(initial) { const slot = stateIndex++; if (!(slot in states)) states[slot] = initial; return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }]; },
    useRef(initial) { const slot = refIndex++; return refs[slot] ||= { current: initial }; },
    useCallback: fn => fn,
    useEffect: fn => { if (!rendered) effects.push(fn); },
    useContext: () => null,
  };
  const module = { exports: {} };
  const source = readFileSync(new URL('../components/auth-provider.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(compiled, {
    module, exports: module.exports, process: { env: {} },
    sessionStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) },
    require: name => {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return { jsx: (_type, props) => props };
      if (name === '../lib/api.mjs') return { ApiError, apiRequest: (_url, { token }) => new Promise((resolve, reject) => calls.push({ token, resolve, reject })) };
      throw Error(`Unexpected dependency: ${name}`);
    },
  });
  const view = () => { stateIndex = 0; refIndex = 0; const output = module.exports.AuthProvider({ children: null }).value; rendered = true; return output; };
  view(); effects.forEach(effect => effect());
  return { view, calls, store };
}
const userA = { id: 'A', displayName: 'Alice', email: 'a@example.test', role: 'USER' };
const userB = { id: 'B', displayName: 'Bob', email: 'b@example.test', role: 'USER' };

test('a late old profile 401 cannot erase a newer successful login', async () => {
  const h = harness(), login = h.view().signIn('fresh-B');
  h.calls[1].resolve(userB); await login;
  h.calls[0].reject(new ApiError('Expired', 401)); await setImmediate();
  assert.equal(h.store.get('perdtu_token'), 'fresh-B'); assert.equal(h.view().user.id, 'B');
});
test('a late old profile success cannot overwrite a newer identity', async () => {
  const h = harness(), login = h.view().signIn('fresh-B');
  h.calls[1].resolve(userB); await login; h.calls[0].resolve(userA); await setImmediate();
  assert.equal(h.view().user.id, 'B'); assert.equal(h.store.get('perdtu_token'), 'fresh-B');
});
test('a late profile response cannot restore a signed-out user', async () => {
  const h = harness(); h.view().signOut(); h.calls[0].resolve(userA); await setImmediate();
  assert.equal(h.view().user, null); assert.equal(h.view().loading, false); assert.equal(h.store.has('perdtu_token'), false);
});
test('a request made under the previous token cannot sign out a newer session', async () => {
  const h = harness(); h.calls[0].resolve(userA); await setImmediate();
  const oldRequest = h.view().request('/wishlist').catch(error => error);
  const login = h.view().signIn('fresh-B'); h.calls[2].resolve(userB); await login;
  h.calls[1].reject(new ApiError('Expired', 401)); await oldRequest;
  assert.equal(h.store.get('perdtu_token'), 'fresh-B'); assert.equal(h.view().user.id, 'B');
});
test('an old workflow cannot start a new write under a subsequently signed-in account', async () => {
  const h=harness();h.calls[0].resolve(userA);await setImmediate();
  const oldRequest=h.view().request;
  const login=h.view().signIn('fresh-B');h.calls[1].resolve(userB);await login;
  const attempted=oldRequest('/wishlist',{method:'POST',body:{description:'Alice wish'}});attempted.catch(()=>{});
  assert.equal(h.calls.length,2,'No old workflow request should be sent using the new account token');
  await assert.rejects(attempted,{status:401});assert.equal(h.store.get('perdtu_token'),'fresh-B');
});
