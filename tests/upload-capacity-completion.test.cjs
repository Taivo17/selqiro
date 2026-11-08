// Run: node --conditions=react-server --test tests/upload-capacity-completion.test.cjs
// Synthetic account SOURCE completion boundaries; no live Auth, database or Storage I/O.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {
    target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  }, fileName: filename}).outputText, filename);
};
const {createAccountSourceCompletion} = require('../src/server/listing-publication/journey/completeAccountSource.ts');

const API = 'https://abcdefghijklmnopqrst.supabase.co';
const USER = '71000000-0000-0000-0000-000000000001';
const IDENTITY = '72000000-0000-0000-0000-000000000002';
const OTHER = '78000000-0000-0000-0000-000000000008';
const BUCKET = 'listing-publication-private';
const TOKEN = 'synthetic-user-token';
const CONFIG = Object.freeze({projectOrigin: API, publicKey: 'synthetic-public-key', serviceKey: 'synthetic-service-key'});
const CLAIM = '/rest/v1/rpc/claim_listing_account_source_cleanup_v1';
const RECORD = '/rest/v1/rpc/record_listing_account_source_cleanup_v1';
const command = () => ({expectedUserId: USER, expectedIdentityId: IDENTITY});
const args = () => ({p_expected_user_id: USER, p_expected_identity_id: IDENTITY});
const json = (value, status = 200) => Response.json(value, {status});
const id = (prefix, number) => `${prefix}000000-0000-0000-0000-${String(number).padStart(12, '0')}`;
function task(number = 1) {
  return {schema_version: 1, object_id: id('76', number), work_key: id('77', number), bucket_id: BUCKET,
    object_path: `v1/${id('73', number)}/${id('74', number)}/source.upload`, try_count: 1,
    lease_until_epoch: Math.floor(Date.now() / 1000) + 60};
}

function fixture(options = {}) {
  const calls = [], errors = [], recorded = [];
  let current = null, claimed = 0;
  const handlers = {
    auth: () => json({id: USER}),
    claim: () => {
      if (claimed >= (options.available ?? 1)) return json(null);
      current = task(++claimed);
      return json(current);
    },
    remove: () => json([{name: current.object_path}]),
    readback: () => json({error: 'not found'}, 404),
    record: call => {
      recorded.push(call.body);
      return json({object_id: current.object_id, work_key: current.work_key,
        state: call.body.p_result === 'deleted' ? 'deleted' : 'retry_wait'});
    },
    ...options.handlers,
  };
  const fetcher = async (url, init) => {
    const parsed = new URL(url);
    const call = {url, path: parsed.pathname, method: init.method, headers: new Headers(init.headers),
      body: init.body ? JSON.parse(init.body) : null, init};
    calls.push(call);
    let operation;
    try {
      assert.equal(parsed.origin, API);
      assert.equal(parsed.hash, '');
      assert.equal(init.redirect, 'error');
      assert.equal(init.credentials, 'omit');
      assert.equal(init.cache, 'no-store');
      const auth = call.path === '/auth/v1/user' && call.method === 'GET';
      assert.equal(call.headers.get('apikey'), auth ? CONFIG.publicKey : CONFIG.serviceKey);
      assert.equal(call.headers.get('authorization'), 'Bearer ' + (auth ? TOKEN : CONFIG.serviceKey));
      if (auth) operation = 'auth';
      else if (call.path === CLAIM && call.method === 'POST') {
        operation = 'claim';
        assert.deepEqual(call.body, args(), 'Only the bound account and current identity choose work');
      } else if (call.path === RECORD && call.method === 'POST') {
        operation = 'record';
        assert.deepEqual(call.body, {...args(), p_object_id: current.object_id,
          p_work_key: current.work_key, p_result: call.body.p_result});
        assert.ok(['deleted', 'network', 'timeout', 'storage', 'response'].includes(call.body.p_result));
      } else if (call.path === `/storage/v1/object/${BUCKET}` && call.method === 'DELETE') {
        operation = 'remove';
        assert.deepEqual(call.body, {prefixes: [current.object_path]});
        assert.ok(current.object_path.endsWith('/source.upload'), 'No WEB can reach physical deletion');
      } else if (call.path === `/storage/v1/object/authenticated/${BUCKET}/${current?.object_path}` && call.method === 'GET') {
        operation = 'readback';
        assert.equal(calls.at(-2).method, 'DELETE');
        assert.deepEqual([...parsed.searchParams.keys()], ['cacheNonce']);
        assert.match(parsed.searchParams.get('cacheNonce'), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        assert.equal(call.headers.get('cache-control'), 'no-store');
      } else assert.fail(`Unexpected endpoint: ${call.method} ${call.path}`);
      if (operation !== 'readback') assert.equal(parsed.search, '');
    } catch (error) {errors.push(error.message); throw error;}
    return handlers[operation](call, {current, claimed, calls, recorded});
  };
  const complete = createAccountSourceCompletion(CONFIG, fetcher);
  return {calls, recorded, async run(input = command(), signal, token = TOKEN) {
    try {
      const result = await complete(token, input, signal);
      assert.ok(Number.isInteger(result) && result >= 0 && result <= 20);
      assert.ok(!JSON.stringify(result).includes(CONFIG.serviceKey));
      return result;
    } finally {assert.deepEqual(errors, [], 'No swallowed fixture assertions');}
  }};
}
const records = f => f.calls.filter(call => call.path === RECORD);
const claims = f => f.calls.filter(call => call.path === CLAIM);
const deletes = f => f.calls.filter(call => call.method === 'DELETE');

test('one SOURCE counts only after Auth, scoped claim, exact deletion, fresh absence, and bound record', async () => {
  const f = fixture();
  assert.equal(await f.run(), 1);
  assert.deepEqual(f.calls.map(call => call.path), ['/auth/v1/user', CLAIM,
    `/storage/v1/object/${BUCKET}`, `/storage/v1/object/authenticated/${BUCKET}/${task().object_path}`, RECORD, CLAIM]);
  assert.deepEqual(records(f)[0].body, {...args(), p_object_id: task().object_id,
    p_work_key: task().work_key, p_result: 'deleted'});
});

test('account pass ends after twenty confirmed objects even when more are available', async () => {
  const f = fixture({available: 25});
  assert.equal(await f.run(), 20);
  assert.equal(claims(f).length, 20);
  assert.equal(deletes(f).length, 20);
  assert.equal(records(f).length, 20);
  assert.equal(new Set(records(f).map(call => call.body.p_object_id)).size, 20);
});

test('empty queue returns zero without any physical deletion', async () => {
  const f = fixture({available: 0});
  assert.equal(await f.run(), 0);
  assert.equal(f.calls.length, 2);
  assert.equal(deletes(f).length, 0);
});

for (const [name, auth] of [
  ['different authenticated user', () => json({id: OTHER})],
  ['Auth refusal', () => json({error: 'unauthorized'}, 401)],
  ['missing Auth user', () => json({})],
  ['lost Auth response', () => {throw Error('synthetic lost auth');}],
]) test(`${name} prevents all service claims`, async () => {
  const f = fixture({handlers: {auth}});
  assert.equal(await f.run(), 0);
  assert.equal(f.calls.length, 1);
  assert.equal(claims(f).length, 0);
});

test('invalid scope, accessors and invalid token do not execute remote work', async () => {
  let getterCalls = 0;
  const accessor = command();
  Object.defineProperty(accessor, 'expectedIdentityId', {enumerable: true, get() {getterCalls++; return IDENTITY;}});
  for (const input of [{...command(), expectedIdentityId: `${IDENTITY}\n`}, {...command(), expectedUserId: null},
    {...command(), extra: true}, {}, accessor]) {
    const f = fixture();
    assert.equal(await f.run(input), 0);
    assert.equal(f.calls.length, 0);
  }
  for (const token of ['', TOKEN + '\n', 'Bearer ' + TOKEN]) {
    const f = fixture();
    assert.equal(await f.run(command(), undefined, token), 0);
    assert.equal(f.calls.length, 0);
  }
  assert.equal(getterCalls, 0);
});

test('scope is copied before Auth awaits; caller mutation cannot change claim or record authority', async () => {
  const input = command();
  const f = fixture({handlers: {auth: () => {
    input.expectedUserId = OTHER;
    input.expectedIdentityId = OTHER;
    return json({id: USER});
  }}});
  assert.equal(await f.run(input), 1);
  assert.deepEqual(claims(f)[0].body, args());
  assert.equal(records(f)[0].body.p_expected_identity_id, IDENTITY);
});

for (const [name, claim] of [
  ['changed current identity', () => json({code: '42501'}, 403)],
  ['missing service capability', () => json({code: 'PGRST202'}, 404)],
  ['lost claim', () => {throw Error('synthetic lost claim');}],
]) test(`${name} returns zero without fallback or Storage work`, async () => {
  const f = fixture({handlers: {claim}});
  assert.equal(await f.run(), 0);
  assert.equal(f.calls.length, 2);
  assert.equal(deletes(f).length, 0);
});

for (const [name, patch] of [
  ['WEB object', {object_path: task().object_path.replace('source.upload', 'web-v1.webp')}],
  ['SOURCE suffix only on a foreign prefix', {object_path: `foreign/${task().object_path}`}],
  ['traversal path', {object_path: `v1/../${id('74', 1)}/source.upload`}],
  ['foreign bucket', {bucket_id: 'listing-images'}],
  ['unknown task field', {unexpected: true}],
  ['expired lease', {lease_until_epoch: 1}],
  ['unbound work key', {work_key: null}],
]) test(`${name} claim cannot cause deletion or recording`, async () => {
  const f = fixture({handlers: {claim: () => json({...task(), ...patch})}});
  assert.equal(await f.run(), 0);
  assert.equal(f.calls.length, 2);
  assert.equal(deletes(f).length, 0);
  assert.equal(records(f).length, 0);
});

for (const [name, readback] of [
  ['still present SOURCE', () => new Response('source exists')],
  ['readback refusal', () => json({error: 'denied'}, 403)],
  ['lost absence readback', () => {throw Error('synthetic lost readback');}],
]) test(`${name} records no successful cleanup and stops the pass`, async () => {
  const f = fixture({available: 10, handlers: {readback}});
  assert.equal(await f.run(), 0);
  assert.equal(claims(f).length, 1);
  assert.equal(deletes(f).length, 1);
  assert.equal(records(f).length, 1);
  assert.notEqual(records(f)[0].body.p_result, 'deleted');
});

for (const [name, record] of [
  ['lost record response', () => {throw Error('synthetic lost durable acknowledgement');}],
  ['record authorization refusal', () => json({code: '42501'}, 403)],
  ['wrong object acknowledgement', (_call, state) => json({object_id: OTHER, work_key: state.current.work_key, state: 'deleted'})],
  ['wrong work key acknowledgement', (_call, state) => json({object_id: state.current.object_id, work_key: OTHER, state: 'deleted'})],
  ['uncertain acknowledgement', (_call, state) => json({object_id: state.current.object_id, work_key: state.current.work_key, state: 'retry_wait'})],
]) test(`${name} cannot count physical deletion as confirmed completion`, async () => {
  const f = fixture({available: 10, handlers: {record}});
  assert.equal(await f.run(), 0);
  assert.equal(claims(f).length, 1);
  assert.equal(deletes(f).length, 1);
  assert.equal(records(f)[0].body.p_result, 'deleted');
});

test('only earlier durable completions survive a later uncertain record', async () => {
  const f = fixture({available: 10, handlers: {record: (call, state) => {
    if (state.claimed === 3) throw Error('synthetic third record lost');
    return json({object_id: state.current.object_id, work_key: state.current.work_key, state: 'deleted'});
  }}});
  assert.equal(await f.run(), 2);
  assert.equal(claims(f).length, 3);
  assert.equal(deletes(f).length, 3);
});

test('already aborted request performs no Auth, claim, or Storage operation', async () => {
  const controller = new AbortController();
  controller.abort();
  const f = fixture();
  assert.equal(await f.run(command(), controller.signal), 0);
  assert.equal(f.calls.length, 0);
});

test('abort after DELETE cannot record absence or start another claim', async () => {
  const controller = new AbortController();
  const f = fixture({available: 10, handlers: {remove: (_call, state) => {
    controller.abort();
    return json([{name: state.current.object_path}]);
  }}});
  assert.equal(await f.run(command(), controller.signal), 0);
  assert.equal(claims(f).length, 1);
  assert.equal(deletes(f).length, 1);
  assert.equal(records(f).length, 0);
});

test('25-second pass deadline aborts unresolved I/O without claiming completion', async () => {
  const originalSetTimeout = global.setTimeout;
  let expirePass;
  global.setTimeout = (callback, delay, ...rest) => {
    if (delay === 25_000) expirePass = callback;
    return originalSetTimeout(callback, delay, ...rest);
  };
  try {
    const f = fixture({handlers: {auth: () => {
      if (typeof expirePass !== 'function') throw Error('Missing pass deadline');
      queueMicrotask(expirePass);
      return new Promise(() => {});
    }}});
    assert.equal(await f.run(), 0);
    assert.equal(typeof expirePass, 'function', 'A 25-second pass deadline was scheduled');
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].init.signal.aborted, true);
  } finally {global.setTimeout = originalSetTimeout;}
});
