// Actual scoped worker and actual immutable baseline; synthetic HTTP, no live service.
// Baseline: SELQIRO_CLEANUP_BASELINE_ROOT=/absolute/issued/source node --conditions=react-server --test this-file
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'),
  {fileName: filename, compilerOptions: {target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS,
    esModuleInterop: true}}).outputText, filename);
const {createSettleHostedCleanupOne} = require('../src/server/listing-publication/final/settleHostedSourceOne.ts');
const BASELINE = process.env.SELQIRO_CLEANUP_BASELINE_ROOT;
const BASELINE_SHA256 = 'bc4986f27e48bc515da97a8041902429e5ac0a760948e282a6d0c30f4b655ef5';
const API = 'https://abcdefghijklmnopqrst.supabase.co';
const USER = '81000000-0000-0000-0000-000000000001', IDENTITY = '82000000-0000-0000-0000-000000000002';
const ATTEMPT = '83000000-0000-0000-0000-000000000003', SLOT = '84000000-0000-0000-0000-000000000004';
const REQUEST = '85000000-0000-0000-0000-000000000005', OBJECT = '86000000-0000-0000-0000-000000000006';
const BUCKET = 'listing-publication-private', WEB = `v1/${ATTEMPT}/${SLOT}/web-v1.webp`;
const SOURCE_CLAIM = '/rest/v1/rpc/claim_listing_published_source_cleanup_v1';
const WEB_CLAIM = '/rest/v1/rpc/claim_listing_retired_web_cleanup_v1';
const WEB_RECORD = '/rest/v1/rpc/record_listing_retired_web_cleanup_v1';
const READBACK = `/storage/v1/object/authenticated/${BUCKET}/${WEB}`;
const TOKEN = 'synthetic-user-token';
const CONFIG = {projectOrigin: API, publicKey: 'synthetic-public', serviceKey: 'synthetic-service'};
const command = {expectedUserId: USER, expectedIdentityId: IDENTITY, attemptId: ATTEMPT, requestKey: REQUEST};
const scope = {p_expected_user_id: USER, p_expected_identity_id: IDENTITY, p_attempt_id: ATTEMPT, p_request_key: REQUEST};
const pending = {kind: 'pending', attemptId: ATTEMPT, filesRemaining: null};
const json = (value, status = 200) => Response.json(value, {status});
const cachedBody = () => new Response('bounded stale cached object bytes', {status: 200});
const noSuchKey = () => json({statusCode: '404', code: 'NoSuchKey', error: 'not_found', message: 'Object not found'}, 400);
const hasNonce = parsed => parsed.searchParams.has('cacheNonce');
const cachedOrAbsent = parsed => hasNonce(parsed) ? json({error: 'not found'}, 404) : cachedBody();

function fixture(factory = createSettleHostedCleanupOne, options = {}) {
  const state = {calls: [], errors: [], records: [], round: 0, savedDeleted: false};
  const work = () => `87000000-0000-0000-0000-${String(state.round).padStart(12, '0')}`;
  const fetcher = async (url, init) => {
    const parsed = new URL(url), headers = new Headers(init.headers);
    const call = {path: parsed.pathname, search: parsed.search, method: init.method,
      body: init.body ? JSON.parse(init.body) : null}; state.calls.push(call);
    let op;
    try {
      assert.equal(parsed.origin, API); assert.equal(parsed.hash, '');
      assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error'); assert.equal(init.credentials, 'omit');
      const auth = call.path === '/auth/v1/user' && call.method === 'GET';
      assert.equal(headers.get('apikey'), auth ? CONFIG.publicKey : CONFIG.serviceKey);
      assert.equal(headers.get('authorization'), 'Bearer ' + (auth ? TOKEN : CONFIG.serviceKey));
      if (call.path === READBACK && call.method === 'GET') {
        op = 'read';
        assert.equal(headers.get('accept-encoding'), 'identity');
        assert.equal(headers.get('cache-control'), 'no-store');
        assert.equal(state.calls.at(-2).method, 'DELETE', 'Readback immediately follows the accepted exact deletion');
        if (options.baseline) assert.equal(parsed.search, '');
        else {
          assert.deepEqual([...parsed.searchParams.keys()], ['cacheNonce']);
          assert.match(parsed.searchParams.get('cacheNonce'), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
          assert.notEqual(parsed.searchParams.get('cacheNonce'), work());
        }
      } else {
        assert.equal(parsed.search, '', 'No query added to Auth, claims, exact DELETE, or recorder');
        if (auth) op = 'auth';
        else if (call.method === 'POST' && call.path === SOURCE_CLAIM) {op = 'source'; assert.deepEqual(call.body, scope);}
        else if (call.method === 'POST' && call.path === WEB_CLAIM) {op = 'web'; assert.deepEqual(call.body, scope);}
        else if (call.method === 'DELETE' && call.path === `/storage/v1/object/${BUCKET}`) {
          op = 'delete'; assert.deepEqual(call.body, {prefixes: [WEB]});
        } else if (call.method === 'POST' && call.path === WEB_RECORD) {
          op = 'record';
          assert.deepEqual(call.body, {...scope, p_object_id: OBJECT, p_work_key: work(), p_result: call.body.p_result});
          assert.ok(['deleted', 'response', 'network', 'timeout', 'storage'].includes(call.body.p_result));
        } else assert.fail('Unexpected cleanup endpoint');
      }
    } catch (error) {state.errors.push(error.message); throw error;}
    if (op === 'auth') return json({id: USER});
    if (op === 'source') return json(null);
    if (op === 'web') {
      state.round++;
      return json({schema_version: 1, object_id: OBJECT, work_key: work(), bucket_id: BUCKET,
        object_path: WEB, try_count: 2 + state.round, lease_until_epoch: Math.floor(Date.now() / 1000) + 60});
    }
    if (op === 'delete') return options.remove ? options.remove() : json([]);
    if (op === 'read') return (options.read || cachedOrAbsent)(parsed, state.round);
    state.records.push(call.body);
    if (options.recordStatus) return json({code: '55000'}, options.recordStatus);
    state.savedDeleted = call.body.p_result === 'deleted';
    return json({object_id: OBJECT, work_key: work(), state: state.savedDeleted ? 'deleted' : 'retry_wait'});
  };
  return {state, async run() {
    const before = state.calls.length;
    try {return await factory(CONFIG, fetcher)(TOKEN, command);}
    finally {
      assert.deepEqual(state.errors, [], 'No swallowed test fixture assertion');
      assert.ok(state.calls.slice(before).filter(c => c.method === 'DELETE').length <= 1);
    }
  }};
}
function expectRecord(f, outcome) {
  assert.equal(f.state.records.length, 1);
  assert.equal(f.state.records[0].p_result, outcome);
  assert.equal(f.state.savedDeleted, outcome === 'deleted');
  assert.equal(f.state.calls.filter(c => c.method === 'DELETE').length, 1);
  assert.equal(f.state.calls.filter(c => c.path === READBACK).length, 1);
}

test('immutable issued worker reproduces retry_wait response from stale bare HTTP 200', {skip: !BASELINE}, async () => {
  assert.ok(path.isAbsolute(BASELINE));
  const file = path.join(BASELINE, 'src/server/listing-publication/final/cleanupOne.ts');
  assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), BASELINE_SHA256);
  const old = require(path.join(BASELINE, 'src/server/listing-publication/final/settleHostedSourceOne.ts'));
  const f = fixture(old.createSettleHostedCleanupOne, {baseline: true});
  assert.deepEqual(await f.run(), pending); expectRecord(f, 'response');
  assert.equal(f.state.calls.find(c => c.path === READBACK).search, '');
});
test('same synthetic cache serves stale bare body but fixed worker requests fresh 404 and records absence', async () => {
  assert.equal((await cachedOrAbsent(new URL(API + READBACK))).status, 200);
  const f = fixture(); assert.deepEqual(await f.run(), pending); expectRecord(f, 'deleted');
  assert.deepEqual(f.state.calls.map(c => c.path), ['/auth/v1/user', SOURCE_CLAIM, WEB_CLAIM,
    `/storage/v1/object/${BUCKET}`, READBACK, WEB_RECORD]);
});
test('fresh strict provider 400 NoSuchKey response also records absence', async () => {
  const f = fixture(undefined, {read: noSuchKey}); assert.deepEqual(await f.run(), pending); expectRecord(f, 'deleted');
});
for (const [name, read, outcome] of [
  ['nonempty 200 bytes still present', cachedBody, 'response'],
  ['nonempty 200 JSON is not absence', () => json({error: 'not found'}), 'response'],
  ['empty 200 body', () => new Response('', {status: 200}), 'network'],
  ['partial 206 body', () => new Response('partial', {status: 206}), 'network'],
  ['encoded 200 body', () => new Response('encoded', {headers: {'content-encoding': 'gzip'}}), 'network'],
  ['oversized announced 200 body', () => new Response('bounded', {headers: {'content-length': '4194305'}}), 'network'],
  ['401', () => json({error: 'auth'}, 401), 'network'],
  ['403', () => json({error: 'permission'}, 403), 'network'],
  ['500', () => json({error: 'provider'}, 500), 'network'],
  ['503', () => json({error: 'provider'}, 503), 'network'],
  ['204 without absence contract', () => new Response(null, {status: 204}), 'network'],
  ['malformed 400 JSON', () => new Response('{', {status: 400, headers: {'content-type': 'application/json'}}), 'network'],
  ['400 permission body', () => json({statusCode: '403', code: 'AccessDenied', error: 'forbidden', message: 'Not allowed'}, 400), 'network'],
  ['400 NoSuchKey with extra field', () => json({statusCode: '404', code: 'NoSuchKey', error: 'not_found', message: 'Object not found', extra: true}, 400), 'network'],
]) test(`fresh readback ${name} never becomes successful cleanup`, async () => {
  const f = fixture(undefined, {read}); assert.deepEqual(await f.run(), pending); expectRecord(f, outcome);
});
test('scoped recorder refusal retains unknown pending state after fresh absence; no second deletion', async () => {
  const f = fixture(undefined, {recordStatus: 400}); assert.deepEqual(await f.run(), pending);
  assert.equal(f.state.records[0].p_result, 'deleted'); assert.equal(f.state.savedDeleted, false);
  assert.equal(f.state.calls.filter(c => c.method === 'DELETE').length, 1); assert.equal(f.state.calls.length, 6);
});
test('each new authorized retry uses a new independent nonce, never an automatic loop', async () => {
  const f = fixture(undefined, {read: (_parsed, round) => round === 1 ? cachedBody() : noSuchKey()});
  assert.deepEqual(await f.run(), pending); assert.equal(f.state.records[0].p_result, 'response');
  assert.equal(f.state.calls.filter(c => c.method === 'DELETE').length, 1);
  assert.deepEqual(await f.run(), pending); assert.equal(f.state.records[1].p_result, 'deleted');
  const reads = f.state.calls.filter(c => c.path === READBACK);
  assert.equal(reads.length, 2); assert.notEqual(reads[0].search, reads[1].search);
  assert.notEqual(f.state.records[0].p_work_key, f.state.records[1].p_work_key);
  assert.equal(f.state.calls.filter(c => c.method === 'DELETE').length, 2);
});
test('unaccepted DELETE never sends a nonce readback or records absent', async () => {
  const f = fixture(undefined, {remove: () => json([{name: WEB + '.wrong'}])});
  assert.deepEqual(await f.run(), pending); assert.equal(f.state.records[0].p_result, 'storage');
  assert.equal(f.state.calls.filter(c => c.path === READBACK).length, 0);
  assert.equal(f.state.calls.filter(c => c.method === 'DELETE').length, 1);
});
