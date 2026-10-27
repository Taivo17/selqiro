'use strict';
// New settlement reporting and post-action readback cases only. Real production
// modules use deterministic injected HTTP responses; this is not a Storage proof.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), {fileName: filename, compilerOptions: {
    target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  }}).outputText, filename);
const {createMultipartPublicationImages} = require('../src/server/listing-publication/multipart/multipartPublicationImages.ts');
const {createJourneyRequestHandler} = require('../src/server/listing-publication/journey/createJourneyHandler.ts');

const U = '71000000-0000-0000-0000-000000000001', I = '72000000-0000-0000-0000-000000000002';
const A = '73000000-0000-0000-0000-000000000003', K = '74000000-0000-0000-0000-000000000004';
const S = '75000000-0000-0000-0000-000000000005', O = '76000000-0000-0000-0000-000000000006';
const M = '77000000-0000-0000-0000-000000000007', V = '78000000-0000-0000-0000-000000000008';
const P = '79000000-0000-0000-0000-000000000009', C = '81000000-0000-0000-0000-000000000010';
const B = '82000000-0000-0000-0000-000000000011', RUN = '83000000-0000-0000-0000-000000000012';
const OTHER = '84000000-0000-0000-0000-000000000013';
const ORIGIN = 'http://127.0.0.1:54121', APP = 'http://127.0.0.1:54122';
const STAMP = '2026-10-25T18:00:00.000000Z';
assert.notEqual(process.env.NODE_ENV, 'production');
assert.equal(process.env.VERCEL, undefined);
// Only this test process opts in to the exact synthetic loopback configuration.
process.env.NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION = 'v1';
process.env.SELQIRO_V2_LOCAL_INTEGRATION = 'v1';
process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGIN;
const config = {projectOrigin: ORIGIN, appOrigin: APP, publicKey: 'synthetic-public', serviceKey: 'synthetic-service',
  runId: RUN, s3Endpoint: ORIGIN + '/storage/v1/s3', s3Region: 'local', s3TenantId: 'synthetic-tenant',
  s3AccessKeyId: 'synthetic-access', s3SecretAccessKey: 'synthetic-secret', integrationScope: 'disposable-v2'};
const command = {expectedUserId: U, expectedIdentityId: I, attemptId: A, requestKey: K};
const json = (value, status = 200) => Response.json(value, {status});
const copy = value => structuredClone(value);
const item = () => ({object_id: O, session: {
  schema_version: 2, session_id: M, object_id: O, kind: 'source', attempt_id: A, slot_id: S, request_key: K,
  bucket_id: 'listing-publication-private', object_path: `v1/${A}/${S}/source.upload`,
  expected_bytes: 20, expected_sha256: 'a'.repeat(64), state: 'completed', upload_id: M,
  storage_version: V, part_key: P, part_sign_epoch: Math.floor(Date.now() / 1000), complete_key: C,
  part_etag: 'synthetic-etag', storage_object_id: B, completed: true, verified: true, problem: null,
}, abort_key: null, abort_allowed: false, abort_observed: false, auxiliary_observed: false});
function snapshot(patch = {}) {
  return {schema_version: 3, attempt_id: A, request_key: K, files_remaining: 1, unresolved: 0,
    needs_attention: 0, blocked: 0, auxiliary_pending: 1, items: [item()], ...patch};
}
async function settlement(before, after = before) {
  const calls = []; let reads = 0;
  const fetcher = async (url, init) => {
    assert.equal(new URL(url).origin, ORIGIN);
    const pathname = new URL(url).pathname, body = init.body ? JSON.parse(init.body) : null;
    calls.push({pathname, method: init.method, body});
    if (pathname === '/auth/v1/user') return json({id: U});
    if (pathname.endsWith('/prepare_listing_multipart_cleanup_v2')) {
      assert.deepEqual(body, {p_expected_user_id: U, p_expected_identity_id: I, p_attempt_id: A, p_request_key: K});
      return json(copy(reads++ === 0 ? before : after));
    }
    if (pathname.endsWith('/claim_listing_cleanup_for_attempt_v2')) {
      assert.deepEqual(body, {p_expected_user_id: U, p_expected_identity_id: I, p_attempt_id: A, p_request_key: K});
      return json(null);
    }
    throw Error('unexpected transport operation: ' + pathname);
  };
  const images = createMultipartPublicationImages(config, async () => { throw Error('sanitizer must not run'); }, fetcher);
  const result = await images.settle('synthetic-user-token', command);
  assert.equal(calls.some(c => c.pathname.startsWith('/storage/')), false);
  return {result, calls};
}

test('an idle claim retains persisted cleanup needs_attention on repeated settlement', async () => {
  const state = snapshot({needs_attention: 1});
  for (let n = 0; n < 2; n++) {
    const {result, calls} = await settlement(state);
    assert.deepEqual(result, {kind: 'needs_attention', attemptId: A, filesRemaining: 1});
    assert.equal(calls.filter(c => c.pathname.endsWith('/prepare_listing_multipart_cleanup_v2')).length, 2);
  }
});
test('auxiliary-only waiting stays pending and cannot release the remaining file count', async () => {
  assert.deepEqual((await settlement(snapshot())).result, {kind: 'pending', attemptId: A, filesRemaining: 1});
});
test('blocked writer and incomplete writer counts retain attention independently of this invocation', async () => {
  for (const field of ['blocked', 'unresolved']) {
    assert.equal((await settlement(snapshot({[field]: 1}))).result.kind, 'needs_attention');
  }
});
test('fresh after-snapshot determines completion while preserving the unchanged public response shape', async () => {
  const after = snapshot({files_remaining: 0, needs_attention: 0, auxiliary_pending: 0,
    items: [{...item(), auxiliary_observed: true}]});
  assert.deepEqual((await settlement(snapshot({needs_attention: 1}), after)).result,
    {kind: 'settled', attemptId: A, filesRemaining: 0});
});
test('overlapping durable problem and auxiliary counts are not added into a false file total', async () => {
  assert.deepEqual((await settlement(snapshot({needs_attention: 1, blocked: 1, unresolved: 1}))).result,
    {kind: 'needs_attention', attemptId: A, filesRemaining: 1});
});
test('old snapshot schema and malformed new counts fail closed before claiming cleanup', async () => {
  const invalid = [snapshot({schema_version: 2}), snapshot({files_remaining: 0, needs_attention: 1, auxiliary_pending: 0}),
    snapshot({files_remaining: 2}), snapshot({items: []})];
  for (const field of ['needs_attention', 'blocked', 'auxiliary_pending']) {
    for (const value of [-1, 1.5, 2, '1', null]) invalid.push(snapshot({[field]: value}));
    const missing = snapshot(); delete missing[field]; invalid.push(missing);
  }
  for (const state of invalid) {
    const {result, calls} = await settlement(state);
    assert.deepEqual(result, {kind: 'needs_attention', attemptId: A, filesRemaining: null});
    assert.equal(calls.filter(c => c.pathname.endsWith('/claim_listing_cleanup_for_attempt_v2')).length, 0);
  }
});

const rec = (state = 'published', count = state === 'deleted' ? 0 : 1) => ({schema_version: 1,
  attempt_id: A, request_key: K, actor_user_id: U, identity_id: I, listing_id: '700001', state,
  published_at: STAMP, content_deleted: state !== 'published', files_remaining: count});
async function action(options = {}) {
  const actionName = options.action ?? 'publish';
  const base = options.known ?? rec(actionName === 'remove' ? 'deleting' : 'published');
  const original = {...copy(base), ...(actionName === 'publish' && !options.recovery ? {replayed: options.replayed ?? false} : {})};
  const calls = [], settleCalls = [], control = new AbortController();
  const fresh = options.fresh ?? rec(base.state, 0);
  const fetcher = async (url, init) => {
    assert.equal(new URL(url).origin, ORIGIN);
    const pathname = new URL(url).pathname, body = init.body ? JSON.parse(init.body) : null;
    calls.push({pathname, method: init.method, body, authorization: new Headers(init.headers).get('authorization')});
    if (pathname.endsWith('/assert_selqiro_disposable_v2')) return json({scope: 'disposable-v2', run_id: RUN});
    if (pathname === '/auth/v1/user') return json({id: U});
    if (pathname.endsWith('/get_my_listing_publication_confirmation_v1')) {
      return json(options.recovery ? {receipt: original} : {confirmation: {schema_version: 1,
        attempt_id: A, request_key: K, actor_user_id: U, identity_id: I, price: {kind: 'unspecified', amount: null, currency: null},
        image_count: 1, confirmation_sha256: 'a'.repeat(64)}});
    }
    if (pathname.endsWith('/publish_my_listing_v1') || pathname.endsWith('/delete_my_published_listing_v1')) return json(original);
    if (pathname.endsWith('/get_my_managed_listing_v2')) {
      assert.equal(settleCalls.length, 1);
      assert.deepEqual(body, {p_expected_user_id: U, p_expected_identity_id: I, p_listing_id: base.listing_id});
      assert.equal(new Headers(init.headers).get('authorization'), 'Bearer synthetic-user-token');
      if (options.ownerThrow) throw Error('private synthetic transport detail');
      if (options.ownerStatus) return json({private: 'synthetic'}, options.ownerStatus);
      if (options.ownerRaw !== undefined) return new Response(options.ownerRaw, {headers: {'content-type': 'application/json'}});
      return json(options.ownerEnvelope ?? {receipt: fresh, activity: null, images: []});
    }
    throw Error('unexpected transport operation: ' + pathname);
  };
  const images = {
    prepare: async () => { throw Error('no image prepare'); }, verify: async () => { throw Error('no image verify'); },
    settle: async (token, command, signal) => {
      assert.equal(token, 'synthetic-user-token'); assert.equal(signal.aborted, false);
      assert.deepEqual(command, {expectedUserId: U, expectedIdentityId: I, attemptId: A, requestKey: K});
      settleCalls.push(copy(command));
      if (options.abortAfterCommit) control.abort();
      if (options.settleThrow) throw Error('private synthetic settlement detail');
      return {kind: options.settleKind ?? 'settled', attemptId: A, filesRemaining: 0};
    },
  };
  const handler = createJourneyRequestHandler(config, images, fetcher);
  const body = actionName === 'remove' ? {expectedUserId: U, expectedIdentityId: I, listingId: base.listing_id}
    : {...command, expectedPrice: {kind: 'unspecified', amount: null, currency: null}};
  const response = await handler(new Request(APP + '/api/v2/publication/' + actionName, {
    method: 'POST', headers: {origin: APP, host: new URL(APP).host, authorization: 'Bearer synthetic-user-token',
      'content-type': 'application/json'}, body: JSON.stringify(body), signal: control.signal,
  }), actionName);
  assert.equal(response.status, 200);
  assert.equal(calls.filter(c => /\/(publish_my_listing_v1|delete_my_published_listing_v1)$/.test(c.pathname)).length, options.recovery ? 0 : 1);
  assert.equal(calls.some(c => c.pathname.startsWith('/storage/')), false);
  const result = await response.json();
  assert.equal(JSON.stringify(result).includes('private synthetic'), false);
  return {result, original, calls, settleCalls};
}

test('publish returns the authoritative post-settlement SOURCE count and keeps replayed=false', async () => {
  const r = await action({fresh: rec('published', 0)});
  assert.deepEqual(r.result, {...rec('published', 0), replayed: false});
});
test('content removal advances to deleted only through the owner receipt', async () => {
  const r = await action({action: 'remove', known: rec('deleting', 2), fresh: rec('deleted')});
  assert.deepEqual(r.result, rec('deleted'));
});
test('settlement ACK alone cannot invent zero files or override a pending owner receipt', async () => {
  const r = await action({fresh: rec('published', 1), settleKind: 'settled'});
  assert.deepEqual(r.result, r.original);
});
test('a successful owner read remains useful when settlement reports pending or needs_attention', async () => {
  for (const settleKind of ['pending', 'needs_attention']) {
    const r = await action({fresh: rec('published', 0), settleKind});
    assert.equal(r.result.files_remaining, 0);
  }
});
test('readback binds original publication actor while another authorized member performs removal', async () => {
  const known = {...rec('deleting', 2), actor_user_id: OTHER};
  const r = await action({action: 'remove', known, fresh: {...rec('deleted'), actor_user_id: OTHER}});
  assert.equal(r.result.state, 'deleted'); assert.equal(r.result.actor_user_id, OTHER);
});
test('readback preserves the true original replay marker and does not write on receipt recovery', async () => {
  assert.equal((await action({replayed: true, fresh: rec('published', 0)})).result.replayed, true);
  const recovered = await action({recovery: true, fresh: rec('published', 0)});
  assert.equal(Object.hasOwn(recovered.result, 'replayed'), false);
  assert.equal(recovered.result.files_remaining, 0);
});
test('a concurrent terminal transition may change the count scope from SOURCE to all managed files', async () => {
  const r = await action({known: rec('published', 1), fresh: rec('deleting', 2)});
  assert.deepEqual(r.result, {...rec('deleting', 2), replayed: false});
});
test('readback refuses changed binding, timestamp, extra receipt keys, and same-state count increases', async () => {
  const mutations = [
    ['attempt_id', OTHER], ['request_key', OTHER], ['actor_user_id', OTHER], ['identity_id', OTHER],
    ['listing_id', '700002'], ['published_at', '2026-10-25T18:00:00.000001Z'], ['files_remaining', 2], ['extra', true],
  ];
  for (const [field, value] of mutations) {
    const r = await action({fresh: {...rec('published', 1), [field]: value}});
    assert.deepEqual(r.result, r.original);
  }
});
test('readback refuses lifecycle regressions and contradictory deleted receipt', async () => {
  for (const [known, fresh] of [
    [rec('deleting', 1), rec('published', 0)], [rec('deleted'), rec('deleting', 1)],
    [rec('deleting', 1), {...rec('deleted'), files_remaining: 1}],
  ]) {
    const r = await action({action: 'remove', known, fresh}); assert.deepEqual(r.result, r.original);
  }
});
test('failed, malformed, or unauthorized readback preserves the known content commit without another write', async () => {
  for (const options of [
    {ownerThrow: true}, {ownerRaw: '{broken'}, {ownerEnvelope: {receipt: rec('deleted')}},
    ...[401, 403, 404, 409, 500].map(ownerStatus => ({ownerStatus})),
  ]) {
    const r = await action(options); assert.deepEqual(r.result, r.original);
  }
});
test('cleanup failure or cancellation after commit keeps the receipt and starts no owner read', async () => {
  for (const options of [{settleThrow: true}, {abortAfterCommit: true}]) {
    const r = await action(options); assert.deepEqual(r.result, r.original);
    assert.equal(r.calls.filter(c => c.pathname.endsWith('/get_my_managed_listing_v2')).length, 0);
  }
});
