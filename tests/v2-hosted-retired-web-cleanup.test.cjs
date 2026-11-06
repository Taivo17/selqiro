// Run: node --conditions=react-server --test tests/v2-hosted-retired-web-cleanup.test.cjs
// Actual scoped worker/parser; synthetic HTTP only, no provider operations.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'),
  {fileName: filename, compilerOptions: {target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS,
    esModuleInterop: true}}).outputText, filename);
const {createSettleHostedCleanupOne} = require('../src/server/listing-publication/final/settleHostedSourceOne.ts');
const {bindRetiredImageCleanupKey, retiredImageCleanupStatus} = require('../src/entities/listing/model/retiredListingImageCleanup.ts');
const API = 'https://abcdefghijklmnopqrst.supabase.co';
const USER = '71000000-0000-0000-0000-000000000001', IDENTITY = '72000000-0000-0000-0000-000000000002';
const ATTEMPT = '73000000-0000-0000-0000-000000000003', SLOT = '74000000-0000-0000-0000-000000000004';
const REQUEST = '75000000-0000-0000-0000-000000000005', OBJECT = '76000000-0000-0000-0000-000000000006';
const WORK = '77000000-0000-0000-0000-000000000007', OTHER = '78000000-0000-0000-0000-000000000008';
const BUCKET = 'listing-publication-private', WEB = `v1/${ATTEMPT}/${SLOT}/web-v1.webp`, SOURCE = `v1/${ATTEMPT}/${SLOT}/source.upload`;
const SOURCE_CLAIM = '/rest/v1/rpc/claim_listing_published_source_cleanup_v1';
const SOURCE_RECORD = '/rest/v1/rpc/record_listing_published_source_cleanup_v1';
const WEB_CLAIM = '/rest/v1/rpc/claim_listing_retired_web_cleanup_v1';
const WEB_RECORD = '/rest/v1/rpc/record_listing_retired_web_cleanup_v1';
const TOKEN = 'synthetic-user-token';
const CONFIG = Object.freeze({projectOrigin: API, publicKey: 'synthetic-public', serviceKey: 'synthetic-service'});
const command = () => ({expectedUserId: USER, expectedIdentityId: IDENTITY, attemptId: ATTEMPT, requestKey: REQUEST});
const args = () => ({p_expected_user_id: USER, p_expected_identity_id: IDENTITY, p_attempt_id: ATTEMPT, p_request_key: REQUEST});
const pending = {kind: 'pending', attemptId: ATTEMPT, filesRemaining: null};
const json = (value, status = 200) => Response.json(value, {status});
const freshCleanupQuery = parsed => [...parsed.searchParams.keys()].join(',') === 'cacheNonce'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(parsed.searchParams.get('cacheNonce'));
const claim = (objectPath = WEB) => ({schema_version: 1, object_id: OBJECT, work_key: WORK, bucket_id: BUCKET,
  object_path: objectPath, try_count: 1, lease_until_epoch: Math.floor(Date.now() / 1000) + 60});
function fixture(overrides = {}, storagePath = WEB) {
  const calls = [], unexpected = [];
  const handlers = {auth: () => json({id: USER}), source: () => json(null), web: () => json(claim()),
    remove: () => json([{name: storagePath}]), readback: () => json({error: 'not found'}, 404),
    record: call => json({object_id: OBJECT, work_key: WORK, state: call.body.p_result === 'deleted' ? 'deleted' : 'retry_wait'}), ...overrides};
  const fetcher = async (url, init) => {
    const parsed = new URL(url);
    const call = {path: parsed.pathname, method: init.method, headers: new Headers(init.headers),
      body: init.body ? JSON.parse(init.body) : null, init}; calls.push(call);
    const readback = call.method === 'GET' && call.path === `/storage/v1/object/authenticated/${BUCKET}/${storagePath}`;
    const queryAllowed = readback ? freshCleanupQuery(parsed) : parsed.search === '';
    const op = parsed.origin !== API || parsed.hash || !queryAllowed ? null
      : call.method === 'GET' && call.path === '/auth/v1/user' ? 'auth'
      : call.method === 'POST' && call.path === SOURCE_CLAIM ? 'source'
      : call.method === 'POST' && call.path === WEB_CLAIM ? 'web'
      : call.method === 'POST' && [SOURCE_RECORD, WEB_RECORD].includes(call.path) ? 'record'
      : call.method === 'DELETE' && call.path === `/storage/v1/object/${BUCKET}` ? 'remove'
      : call.method === 'GET' && call.path === `/storage/v1/object/authenticated/${BUCKET}/${storagePath}` ? 'readback' : null;
    if (!op) {unexpected.push(call); throw Error('Unexpected transport target');}
    return handlers[op](call);
  };
  return {calls, async run(input = command(), signal) {
    try {return await createSettleHostedCleanupOne(CONFIG, fetcher)(TOKEN, input, signal);}
    finally {assert.deepEqual(unexpected, [], 'No generic RPC, foreign target, or secondary cleanup transport');}
  }};
}
const deletes = f => f.calls.filter(c => c.method === 'DELETE');
const records = f => f.calls.filter(c => [SOURCE_RECORD, WEB_RECORD].includes(c.path));
const paths = f => f.calls.map(c => c.path);

test('SOURCE null selects one retired WEB, verifies absence, records only the scoped WEB receipt', async () => {
  const f = fixture(); assert.deepEqual(await f.run(), pending);
  assert.deepEqual(paths(f), ['/auth/v1/user', SOURCE_CLAIM, WEB_CLAIM,
    `/storage/v1/object/${BUCKET}`, `/storage/v1/object/authenticated/${BUCKET}/${WEB}`, WEB_RECORD]);
  assert.deepEqual(f.calls[1].body, args()); assert.deepEqual(f.calls[2].body, args());
  assert.deepEqual(deletes(f)[0].body, {prefixes: [WEB]});
  assert.deepEqual(records(f)[0].body, {...args(), p_object_id: OBJECT, p_work_key: WORK, p_result: 'deleted'});
  assert.equal(deletes(f).length, 1);
  f.calls.forEach((c, i) => {
    assert.equal(c.headers.get('apikey'), i === 0 ? CONFIG.publicKey : CONFIG.serviceKey);
    assert.equal(c.headers.get('authorization'), 'Bearer ' + (i === 0 ? TOKEN : CONFIG.serviceKey));
    assert.equal(c.init.cache, 'no-store'); assert.equal(c.init.redirect, 'error'); assert.equal(c.init.credentials, 'omit');
  });
});
test('a valid SOURCE claim preserves priority and never requests or records WEB work', async () => {
  const f = fixture({source: () => json(claim(SOURCE))}, SOURCE);
  assert.deepEqual(await f.run(), pending); assert.equal(deletes(f).length, 1);
  assert.deepEqual(deletes(f)[0].body, {prefixes: [SOURCE]});
  assert.equal(records(f)[0].path, SOURCE_RECORD); assert.ok(!paths(f).includes(WEB_CLAIM));
});
test('two null claims do not delete and cannot assert zero or settled', async () => {
  const f = fixture({web: () => json(null)});
  assert.deepEqual(await f.run(), pending); assert.equal(deletes(f).length, 0);
  assert.deepEqual(paths(f), ['/auth/v1/user', SOURCE_CLAIM, WEB_CLAIM]);
});
for (const [name, source] of [
  ['SQL refusal', () => json({code: '42501'}, 403)],
  ['missing SOURCE RPC', () => json({code: 'PGRST202'}, 404)],
  ['lost SOURCE reply', () => {throw Error('synthetic loss');}],
  ['non-null false', () => json(false)], ['non-null array', () => json([])],
  ['non-null object', () => json({})], ['wrong suffix', () => json(claim(WEB))],
  ['invalid lease', () => json({...claim(SOURCE), lease_until_epoch: 1})],
]) test(`SOURCE ${name} prevents WEB fallback and any Storage mutation`, async () => {
  const f = fixture({source}); assert.deepEqual(await f.run(), pending);
  assert.deepEqual(paths(f), ['/auth/v1/user', SOURCE_CLAIM]); assert.equal(deletes(f).length, 0);
});
for (const [name, web] of [
  ['scope refusal', () => json({code: '42501'}, 403)],
  ['RPC unavailable', () => json({code: 'PGRST202'}, 404)],
  ['missing reply', () => {throw Error('synthetic loss');}],
  ['SOURCE object', () => json(claim(SOURCE))],
  ['foreign attempt', () => json(claim(`v1/${OTHER}/${SLOT}/web-v1.webp`))],
  ['foreign bucket', () => json({...claim(), bucket_id: 'listing-images'})],
  ['expired lease', () => json({...claim(), lease_until_epoch: 1})],
  ['extra field', () => json({...claim(), broadly_authorized: true})],
]) test(`retired WEB ${name} stays pending without deleting`, async () => {
  const f = fixture({web}); assert.deepEqual(await f.run(), pending);
  assert.equal(f.calls.length, 3); assert.equal(deletes(f).length, 0); assert.equal(records(f).length, 0);
});
test('the combined worker binds the command before authentication resolves', async () => {
  const input = command(), f = fixture({auth: () => {
    Object.keys(input).forEach(k => {input[k] = OTHER;}); return json({id: USER});
  }});
  assert.deepEqual(await f.run(input), pending);
  assert.deepEqual(f.calls[1].body, args()); assert.deepEqual(f.calls[2].body, args());
});
test('account mismatch cannot use service-role claims', async () => {
  const f = fixture({auth: () => json({id: OTHER})});
  await assert.rejects(f.run(), error => error.code === 'context_changed'); assert.equal(f.calls.length, 1);
});
for (const [name, overrides] of [
  ['lost DELETE response', {remove: () => {throw Error('synthetic loss');}}],
  ['Storage refusal', {remove: () => json({error: 'not authorized'}, 403)}],
  ['wrong object response', {remove: () => json([{name: SOURCE}])}],
  ['object still present', {readback: () => new Response('WEB bytes', {status: 200})}],
  ['unverified absence', {readback: () => json({error: 'permission'}, 403)}],
]) test(`${name} records uncertainty once without quota success or retry`, async () => {
  const f = fixture(overrides); assert.deepEqual(await f.run(), pending);
  assert.equal(deletes(f).length, 1); assert.equal(records(f).length, 1);
  assert.equal(records(f)[0].path, WEB_RECORD); assert.notEqual(records(f)[0].body.p_result, 'deleted');
});
for (const [name, record] of [
  ['lost receipt', () => {throw Error('synthetic loss');}],
  ['wrong object', () => json({object_id: OTHER, work_key: WORK, state: 'deleted'})],
  ['wrong work key', () => json({object_id: OBJECT, work_key: OTHER, state: 'deleted'})],
]) test(`${name} does not claim a released reservation or re-delete`, async () => {
  const f = fixture({record}); assert.deepEqual(await f.run(), pending);
  assert.equal(deletes(f).length, 1); assert.equal(records(f).length, 1);
});
test('needs_attention has no invented count; authoritative read must resolve the status', async () => {
  const f = fixture({remove: () => json({}, 500),
    record: () => json({object_id: OBJECT, work_key: WORK, state: 'needs_attention'})});
  assert.deepEqual(await f.run(), {kind: 'needs_attention', attemptId: ATTEMPT, filesRemaining: null});
});
test('abort after DELETE leaves the durable lease unknown and does not record completion', async () => {
  const controller = new AbortController(), f = fixture({remove: () => {
    controller.abort(); return json([{name: WEB}]);
  }});
  assert.deepEqual(await f.run(command(), controller.signal), pending);
  assert.equal(deletes(f).length, 1); assert.equal(records(f).length, 0);
});
const key = () => ({userId: USER, identityId: IDENTITY, attemptId: ATTEMPT, requestKey: REQUEST});
const diagnostic = (files = 1, attention = 0) => ({schema_version: 1, attempt_id: ATTEMPT, request_key: REQUEST,
  files_remaining: files, needs_attention: attention, reserved_bytes: files * 4194304});
test('diagnostic validates known zero, pending and needs_attention without changing the SOURCE receipt', () => {
  for (const [files, attention] of [[0, 0], [1, 0], [2, 1], [10, 10]]) {
    const out = retiredImageCleanupStatus(diagnostic(files, attention), key());
    assert.deepEqual(out, {attemptId: ATTEMPT, requestKey: REQUEST,
      filesRemaining: files, needsAttention: attention, reservedBytes: files * 4194304}); assert.ok(Object.isFrozen(out));
  }
});
for (const patch of [{schema_version: 2}, {attempt_id: OTHER}, {request_key: OTHER}, {files_remaining: -1},
  {files_remaining: 2147483648, reserved_bytes: 2147483648 * 4194304}, {files_remaining: 0}, {needs_attention: 2},
  {needs_attention: true}, {reserved_bytes: 0}, {reserved_bytes: 1}, {reserved_bytes: 9e15}, {settled: true}]) {
  test(`malformed diagnostic ${JSON.stringify(patch)} cannot become settled`, () => {
    assert.throws(() => retiredImageCleanupStatus({...diagnostic(), ...patch}, key()));
  });
}
test('status binding rejects invalid scopes and getters without invoking them', () => {
  const value = key(); let reads = 0;
  Object.defineProperty(value, 'attemptId', {enumerable: true, get() {reads++; return ATTEMPT;}});
  for (const bad of [value, {...key(), userId: USER + '\n'}, {...key(), requestKey: null}, {...key(), extra: true}])
    assert.throws(() => bindRetiredImageCleanupKey(bad));
  assert.equal(reads, 0); assert.ok(Object.isFrozen(bindRetiredImageCleanupKey(key())));
});

const childClaim = (suffix = 'web-v1.webp') => ({...claim(`v1/${OTHER}/${SLOT}/${suffix}`),
  schema_version: 2, attempt_id: ATTEMPT, request_key: REQUEST, origin_attempt_id: OTHER, origin_request_key: WORK});
for (const suffix of ['source.upload', 'web-v1.webp'])
  test(`an exact child ${suffix} claim reuses the same one-object transport and root-scoped recorder`, async () => {
    const task = childClaim(suffix), source = suffix === 'source.upload';
    const f = fixture({[source ? 'source' : 'web']: () => json(task)}, task.object_path);
    assert.deepEqual(await f.run(), pending); assert.equal(deletes(f).length, 1); assert.equal(records(f).length, 1);
    assert.deepEqual(deletes(f)[0].body, {prefixes: [task.object_path]});
    assert.deepEqual(records(f)[0].body, {...args(), p_object_id: OBJECT, p_work_key: WORK, p_result: 'deleted'});
    assert.equal(records(f)[0].path, source ? SOURCE_RECORD : WEB_RECORD);
  });
for (const patch of [{attempt_id: OTHER}, {request_key: OTHER}, {origin_attempt_id: ATTEMPT},
  {origin_request_key: null}, {object_path: WEB}, {broadly_authorized: true}])
  test('malformed child binding cannot select a Storage object: ' + JSON.stringify(patch), async () => {
    const f = fixture({web: () => json({...childClaim(), ...patch})});
    assert.deepEqual(await f.run(), pending); assert.equal(deletes(f).length, 0); assert.equal(records(f).length, 0);
  });
