// Run: node --conditions=react-server --test tests/v2-hosted-completed-source-cleanup.test.cjs
// Focused hosted completed-SOURCE boundary tests. Synthetic responses only; no provider I/O.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {
    target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  }, fileName: filename}).outputText, filename);
};
const {createSettleHostedSourceOne} = require('../src/server/listing-publication/final/settleHostedSourceOne.ts');
const {createCleanupOne} = require('../src/server/listing-publication/final/cleanupOne.ts');

const API = 'https://abcdefghijklmnopqrst.supabase.co';
const USER = '71000000-0000-0000-0000-000000000001';
const IDENTITY = '72000000-0000-0000-0000-000000000002';
const ATTEMPT = '73000000-0000-0000-0000-000000000003';
const SLOT = '74000000-0000-0000-0000-000000000004';
const REQUEST = '75000000-0000-0000-0000-000000000005';
const OBJECT = '76000000-0000-0000-0000-000000000006';
const WORK = '77000000-0000-0000-0000-000000000007';
const OTHER = '78000000-0000-0000-0000-000000000008';
const BUCKET = 'listing-publication-private';
const SOURCE = `v1/${ATTEMPT}/${SLOT}/source.upload`;
const WEB = `v1/${ATTEMPT}/${SLOT}/web-v1.webp`;
const TOKEN = 'synthetic-user-token';
const CONFIG = Object.freeze({projectOrigin: API, publicKey: 'synthetic-public-key', serviceKey: 'synthetic-service-key'});
const CLAIM = '/rest/v1/rpc/claim_listing_published_source_cleanup_v1';
const RECORD = '/rest/v1/rpc/record_listing_published_source_cleanup_v1';
const command = () => ({expectedUserId: USER, expectedIdentityId: IDENTITY, attemptId: ATTEMPT, requestKey: REQUEST});
const args = () => ({p_expected_user_id: USER, p_expected_identity_id: IDENTITY, p_attempt_id: ATTEMPT, p_request_key: REQUEST});
const claim = () => ({schema_version: 1, object_id: OBJECT, work_key: WORK, bucket_id: BUCKET,
  object_path: SOURCE, try_count: 1, lease_until_epoch: Math.floor(Date.now() / 1000) + 60});
const pending = {kind: 'pending', attemptId: ATTEMPT, filesRemaining: null};
const json = (value, status = 200) => Response.json(value, {status});
const freshCleanupQuery = parsed => [...parsed.searchParams.keys()].join(',') === 'cacheNonce'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(parsed.searchParams.get('cacheNonce'));

function fixture(overrides = {}) {
  const calls = [], unexpected = [];
  const handlers = {
    auth: () => json({id: USER}),
    claim: () => json(claim()),
    remove: () => json([{name: SOURCE}]),
    readback: () => json({error: 'not found'}, 404),
    record: call => json({object_id: OBJECT, work_key: WORK,
      state: call.body.p_result === 'deleted' ? 'deleted' : 'retry_wait'}),
    ...overrides,
  };
  const fetcher = async (url, init) => {
    const parsed = new URL(url);
    const call = {url, path: parsed.pathname, method: init.method, headers: new Headers(init.headers),
      body: init.body ? JSON.parse(init.body) : null, init};
    calls.push(call);
    const readback = call.path === `/storage/v1/object/authenticated/${BUCKET}/${SOURCE}` && call.method === 'GET';
    const queryAllowed = readback ? freshCleanupQuery(parsed) : parsed.search === '';
    const operation = parsed.origin !== API || parsed.hash || !queryAllowed ? null
      : call.path === '/auth/v1/user' && call.method === 'GET' ? 'auth'
      : call.path === CLAIM && call.method === 'POST' ? 'claim'
      : call.path === RECORD && call.method === 'POST' ? 'record'
      : call.path === `/storage/v1/object/${BUCKET}` && call.method === 'DELETE' ? 'remove'
      : call.path === `/storage/v1/object/authenticated/${BUCKET}/${SOURCE}` && call.method === 'GET' ? 'readback' : null;
    if (!operation) { unexpected.push(`${call.method} ${url}`); throw Error('Unexpected request'); }
    return handlers[operation](call);
  };
  const settle = createSettleHostedSourceOne(CONFIG, fetcher);
  return {calls, settle, async run(input = command(), signal) {
    try { return await settle(TOKEN, input, signal); }
    finally { assert.deepEqual(unexpected, [], 'No global worker, foreign target, status API, or fallback call'); }
  }};
}
const onlyPaths = fixture => fixture.calls.map(call => `${call.method} ${call.path}`);
const records = fixture => fixture.calls.filter(call => call.path === RECORD);
const deletes = fixture => fixture.calls.filter(call => call.method === 'DELETE');

test('one authenticated completed SOURCE: scoped claim, exact API deletion, absence readback, scoped receipt', async () => {
  const f = fixture();
  const result = await f.run();
  assert.deepEqual(result, pending, 'The cleanup ACK does not replace the authoritative owner refresh');
  assert.ok(Object.isFrozen(result));
  assert.deepEqual(onlyPaths(f), ['GET /auth/v1/user', `POST ${CLAIM}`,
    `DELETE /storage/v1/object/${BUCKET}`, `GET /storage/v1/object/authenticated/${BUCKET}/${SOURCE}`, `POST ${RECORD}`]);
  assert.deepEqual(f.calls[1].body, args());
  assert.deepEqual(f.calls[2].body, {prefixes: [SOURCE]});
  assert.deepEqual(f.calls[4].body, {...args(), p_object_id: OBJECT, p_work_key: WORK, p_result: 'deleted'});
  for (const [index, call] of f.calls.entries()) {
    assert.equal(call.headers.get('apikey'), index === 0 ? CONFIG.publicKey : CONFIG.serviceKey);
    assert.equal(call.headers.get('authorization'), `Bearer ${index === 0 ? TOKEN : CONFIG.serviceKey}`);
    assert.equal(call.init.redirect, 'error');
    assert.equal(call.init.credentials, 'omit');
    assert.equal(call.init.cache, 'no-store');
    assert.ok(!call.url.includes(WEB));
  }
  assert.ok(!JSON.stringify(result).includes(CONFIG.serviceKey));
});

test('null claim performs no Storage call and cannot claim all files are settled', async () => {
  const f = fixture({claim: () => json(null)});
  assert.deepEqual(await f.run(), pending);
  assert.deepEqual(onlyPaths(f), ['GET /auth/v1/user', `POST ${CLAIM}`]);
});

for (const [name, response] of [
  ['missing database capability', () => json({code: 'PGRST202'}, 404)],
  ['database rejects changed identity', () => json({code: '42501'}, 403)],
  ['lost claim response', () => { throw Error('synthetic lost claim response'); }],
]) test(`${name}: stay pending without fallback or deletion`, async () => {
  const f = fixture({claim: response});
  assert.deepEqual(await f.run(), pending);
  assert.equal(f.calls.length, 2);
  assert.equal(deletes(f).length, 0);
});

test('authenticated account mismatch prevents the service-role claim', async () => {
  const f = fixture({auth: () => json({id: OTHER})});
  await assert.rejects(f.run(), error => error.code === 'context_changed');
  assert.deepEqual(onlyPaths(f), ['GET /auth/v1/user']);
});

test('Auth refusal prevents the service-role claim', async () => {
  const f = fixture({auth: () => json({error: 'unauthorized'}, 401)});
  await assert.rejects(f.run(), error => error.code === 'unauthorized');
  assert.equal(f.calls.length, 1);
});

test('command is copied before the first asynchronous request', async () => {
  const input = command();
  const f = fixture({auth: () => {
    input.expectedUserId = OTHER;
    input.expectedIdentityId = OTHER;
    input.attemptId = OTHER;
    input.requestKey = OTHER;
    return json({id: USER});
  }});
  assert.deepEqual(await f.run(input), pending);
  assert.deepEqual(f.calls[1].body, args());
  assert.deepEqual(records(f)[0].body, {...args(), p_object_id: OBJECT, p_work_key: WORK, p_result: 'deleted'});
});

test('invalid command and accessors are rejected without network or getter execution', async () => {
  let getterCalls = 0;
  const getter = command();
  Object.defineProperty(getter, 'attemptId', {enumerable: true, get() { getterCalls += 1; return ATTEMPT; }});
  for (const input of [{...command(), attemptId: `${ATTEMPT}\n`}, {...command(), requestKey: null},
    {...command(), extra: true}, getter]) {
    const f = fixture();
    await assert.rejects(f.run(input));
    assert.equal(f.calls.length, 0);
  }
  assert.equal(getterCalls, 0);
});

test('already-aborted request has no authentication, claim, or Storage side effects', async () => {
  const controller = new AbortController();
  controller.abort();
  const f = fixture();
  assert.deepEqual(await f.run(command(), controller.signal), pending);
  assert.equal(f.calls.length, 0);
});

test('abort after DELETE leaves the durable lease unresolved, without asserting completion or retrying', async () => {
  const controller = new AbortController();
  const f = fixture({remove: () => {
    controller.abort();
    return json([{name: SOURCE}]);
  }});
  assert.deepEqual(await f.run(command(), controller.signal), pending);
  assert.equal(deletes(f).length, 1);
  assert.equal(records(f).length, 0, 'An aborted RPC cannot be treated as a durable completion');
  assert.equal(f.calls.length, 3);
});

for (const [name, change] of [
  ['active WEB path', {object_path: WEB}],
  ['another attempt', {object_path: `v1/${OTHER}/${SLOT}/source.upload`}],
  ['path suffix', {object_path: `${SOURCE}/extra`}],
  ['foreign bucket', {bucket_id: 'listing-images'}],
  ['invalid work key', {work_key: null}],
  ['exhausted lease attempts', {try_count: 9}],
  ['expired claim', {lease_until_epoch: 1}],
  ['unrecognized claim fields', {completed: true}],
]) test(`unsafe claim (${name}) cannot issue a DELETE`, async () => {
  const f = fixture({claim: () => json({...claim(), ...change})});
  assert.deepEqual(await f.run(), pending);
  assert.equal(f.calls.length, 2);
  assert.equal(deletes(f).length, 0);
  assert.equal(records(f).length, 0);
});

for (const [name, remove, expected] of [
  ['lost DELETE response', () => { throw Error('synthetic transport loss'); }, 'network'],
  ['Storage refusal', () => json({error: 'synthetic private detail'}, 500), 'storage'],
  ['wrong deleted name', () => json([{name: WEB}]), 'storage'],
]) test(`${name} records uncertainty once without a success readback or retry`, async () => {
  const f = fixture({remove});
  assert.deepEqual(await f.run(), pending);
  assert.equal(deletes(f).length, 1);
  assert.deepEqual(onlyPaths(f), ['GET /auth/v1/user', `POST ${CLAIM}`, `DELETE /storage/v1/object/${BUCKET}`, `POST ${RECORD}`]);
  assert.deepEqual(records(f)[0].body, {...args(), p_object_id: OBJECT, p_work_key: WORK, p_result: expected});
});

for (const [name, readback] of [
  ['object still visible', () => new Response('source still exists', {status: 200})],
  ['readback permission refusal', () => json({error: 'permission denied'}, 403)],
  ['ambiguous legacy missing response', () => json({statusCode: '404', message: 'Not found'}, 400)],
]) test(`${name} cannot produce a deleted receipt`, async () => {
  const f = fixture({readback});
  assert.deepEqual(await f.run(), pending);
  assert.equal(deletes(f).length, 1);
  assert.equal(records(f).length, 1);
  assert.notEqual(records(f)[0].body.p_result, 'deleted');
});

test('empty API delete result still requires absence readback and a matching durable record', async () => {
  const f = fixture({remove: () => json([])});
  assert.deepEqual(await f.run(), pending);
  assert.equal(f.calls.length, 5);
  assert.equal(records(f)[0].body.p_result, 'deleted');
});

for (const [name, record] of [
  ['lost record reply', () => { throw Error('synthetic lost record reply'); }],
  ['wrong object acknowledgement', () => json({object_id: OTHER, work_key: WORK, state: 'deleted'})],
  ['wrong lease acknowledgement', () => json({object_id: OBJECT, work_key: OTHER, state: 'deleted'})],
]) test(`${name} remains pending without repeating deletion`, async () => {
  const f = fixture({record});
  assert.deepEqual(await f.run(), pending);
  assert.equal(f.calls.length, 5);
  assert.equal(deletes(f).length, 1);
  assert.equal(records(f).length, 1);
});

test('durable needs_attention remains visible without an invented remaining count', async () => {
  const f = fixture({remove: () => json({error: 'storage failure'}, 500),
    record: () => json({object_id: OBJECT, work_key: WORK, state: 'needs_attention'})});
  assert.deepEqual(await f.run(), {kind: 'needs_attention', attemptId: ATTEMPT, filesRemaining: null});
  assert.equal(deletes(f).length, 1);
});

test('default cleanup worker preserves its existing RPC contract without explicit scoped operations', async () => {
  const calls = [], unexpected = [];
  const fetcher = async (url, init) => {
    const parsed = new URL(url), path = parsed.pathname;
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({path, method: init.method, body});
    const readback = path === `/storage/v1/object/authenticated/${BUCKET}/${SOURCE}` && init.method === 'GET';
    if (parsed.origin !== API || parsed.hash || !(readback ? freshCleanupQuery(parsed) : parsed.search === '')) {
      unexpected.push(url); throw Error('Unexpected default worker query');
    }
    if (path === '/rest/v1/rpc/claim_listing_cleanup_v1') return json(claim());
    if (path === `/storage/v1/object/${BUCKET}` && init.method === 'DELETE') return json([{name: SOURCE}]);
    if (path === `/storage/v1/object/authenticated/${BUCKET}/${SOURCE}`) return json({}, 404);
    if (path === '/rest/v1/rpc/record_listing_cleanup_v1') return json({object_id: OBJECT, work_key: WORK, state: 'deleted'});
    unexpected.push(path); throw Error('Unexpected default worker request');
  };
  assert.deepEqual(await createCleanupOne(CONFIG, fetcher)(), {kind: 'deleted'});
  assert.deepEqual(unexpected, []);
  assert.equal(calls.length, 4);
  assert.deepEqual(calls[0].body, {});
  assert.deepEqual(calls[3].body, {p_object_id: OBJECT, p_work_key: WORK, p_result: 'deleted'});
});
