// Run: node --conditions=react-server --test tests/retired-listing-image-cleanup-handler.test.cjs
// Actual handler/auth/readiness boundary with synthetic HTTP. No cloud requests.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'),
  {fileName: filename, compilerOptions: {target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS,
    esModuleInterop: true}}).outputText, filename);
const {hostedPreviewConfig} = require('../src/server/listing-publication/journey/hostedPreviewConfig.ts');
const {createJourneyRequestHandler} = require('../src/server/listing-publication/journey/createJourneyHandler.ts');
const REF = 'abcdefghijklmnopqrst', API = `https://${REF}.supabase.co`, APP = 'https://selqiro-cleanup-boundary.vercel.app';
const USER = '71000000-0000-0000-0000-000000000001', IDENTITY = '72000000-0000-0000-0000-000000000002';
const ATTEMPT = '73000000-0000-0000-0000-000000000003', REQUEST = '75000000-0000-0000-0000-000000000005';
const INSTANCE = '76000000-0000-0000-0000-000000000006', OTHER = '79000000-0000-0000-0000-000000000009';
const RELEASE = 'listing-publication-hosted-preview-v1', TOKEN = 'synthetic.user.session';
const NOW = Date.parse('2026-11-06T12:00:00Z'), ACTION = 'owner-retired-images-status';
const RPC = '/rest/v1/rpc/get_my_listing_retired_web_cleanup_v1';
const READY = '/rest/v1/rpc/get_selqiro_hosted_preview_readiness_v1';
const json = (value, status = 200) => Response.json(value, {status});
const input = () => ({p_expected_user_id: USER, p_expected_identity_id: IDENTITY, p_attempt_id: ATTEMPT, p_request_key: REQUEST});
const diagnostic = {schema_version: 1, attempt_id: ATTEMPT, request_key: REQUEST,
  files_remaining: 1, needs_attention: 0, reserved_bytes: 4194304};
function config() {
  const jwt = role => [{alg: 'HS256', typ: 'JWT'}, {ref: REF, role, exp: NOW / 1000 + 3600}, 'synthetic-signature']
    .map(part => Buffer.from(typeof part === 'string' ? part : JSON.stringify(part)).toString('base64url')).join('.');
  const c = hostedPreviewConfig({NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_URL: new URL(APP).host,
    SELQIRO_V2_HOSTED_PREVIEW: 'v1', NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW: 'v1', SELQIRO_V2_HOSTED_PROJECT_REF: REF,
    SELQIRO_V2_HOSTED_INSTANCE_ID: INSTANCE, SELQIRO_V2_HOSTED_REGION: 'eu-central-1', NEXT_PUBLIC_SUPABASE_URL: API,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('anon'), SUPABASE_SERVICE_ROLE_KEY: jwt('service_role'),
    SELQIRO_V2_S3_ACCESS_KEY_ID: 'synthetic-access', SELQIRO_V2_S3_SECRET_ACCESS_KEY: 'synthetic-secret'}, NOW);
  assert.ok(c); return c;
}
function fixture(options = {}) {
  const c = config(), calls = [], unexpected = [], mutations = [];
  const images = Object.fromEntries(['prepare', 'verify', 'settle'].map(name => [name, async () => {
    mutations.push(name); throw Error('Read invoked image mutation');
  }]));
  const fetcher = async (url, init) => {
    const path = new URL(url).pathname, headers = new Headers(init.headers);
    const call = {path, method: init.method, headers, body: init.body ? JSON.parse(init.body) : null}; calls.push(call);
    assert.equal(new URL(url).origin, API); assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
    if (path === '/auth/v1/user') return json({id: options.user ?? USER});
    if (path === READY) return json({schema_version: 1, scope: 'hosted-preview-v1', storage_contract: 'supabase-s3-session-v1',
      cleanup_mode: 'held', project_ref: REF, release_id: RELEASE, instance_id: INSTANCE,
      enabled: true, actor_user_id: USER, actor_allowed: options.allowed !== false});
    if (path === RPC) return options.rpc ? options.rpc(call) : json(diagnostic);
    unexpected.push(path); throw Error('Unexpected operation');
  };
  const handler = createJourneyRequestHandler(c, images, fetcher);
  return {c, calls, async invoke(body = input(), patch = {}) {
    const headers = {host: new URL(APP).host, origin: APP, authorization: 'Bearer ' + TOKEN, 'content-type': 'application/json', ...patch.headers};
    const method = patch.method ?? 'POST';
    const request = new Request(APP + '/api/v2/publication/' + ACTION, {method, headers,
      ...(method === 'GET' ? {} : {body: JSON.stringify(body)})});
    const response = await handler(request, ACTION), data = await response.json();
    assert.deepEqual(unexpected, []); assert.deepEqual(mutations, []);
    return {status: response.status, headers: response.headers, data};
  }};
}
test('scoped retired read forwards only four UUIDs under user token after existing gates', async () => {
  const f = fixture(), response = await f.invoke();
  assert.equal(response.status, 200); assert.deepEqual(response.data, diagnostic);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(f.calls.map(c => c.path), ['/auth/v1/user', READY, RPC]);
  assert.equal(f.calls[1].headers.get('authorization'), 'Bearer ' + f.c.serviceKey);
  assert.equal(f.calls[2].headers.get('authorization'), 'Bearer ' + TOKEN);
  assert.equal(f.calls[2].headers.get('apikey'), f.c.publicKey);
  assert.deepEqual(f.calls[2].body, input());
});
for (const patch of [{p_attempt_id: ATTEMPT + '\n'}, {p_request_key: null}, {p_request_key: REQUEST + '\n'},
  {p_listing_id: '201'}, {p_scope: 'all'}, {p_expected_identity_id: '00000000-0000-0000-0000-000000000000'}]) {
  test(`invalid or expanded status scope ${JSON.stringify(patch)} never reaches RPC`, async () => {
    const f = fixture(), response = await f.invoke({...input(), ...patch});
    assert.equal(response.status, 409); assert.deepEqual(response.data, {error: 'refused'});
    assert.ok(!f.calls.some(c => c.path === RPC));
  });
}
for (const options of [{user: OTHER}, {allowed: false}]) {
  test(`existing actor/readiness gate ${JSON.stringify(options)} blocks status RPC`, async () => {
    const f = fixture(options), response = await f.invoke();
    assert.notEqual(response.status, 200); assert.ok(!f.calls.some(c => c.path === RPC));
  });
}
for (const patch of [{method: 'GET'}, {headers: {origin: 'https://other.example'}}, {headers: {host: 'other.example'}},
  {headers: {authorization: 'invalid'}}]) {
  test(`application boundary ${JSON.stringify(patch)} rejects before any network`, async () => {
    const f = fixture(), response = await f.invoke(input(), patch);
    assert.notEqual(response.status, 200); assert.equal(f.calls.length, 0);
  });
}
test('missing status RPC remains unavailable and cannot be projected as zero', async () => {
  const f = fixture({rpc: () => json({code: 'PGRST202', message: 'private SQL details'}, 404)});
  const response = await f.invoke(); assert.equal(response.status, 409);
  assert.deepEqual(response.data, {error: 'owner_contract', code: 'PGRST202', message: 'owner_contract_unavailable'});
  assert.equal(f.calls.length, 3);
});
test('unexpected status failure stays unknown, sanitizes details and never starts cleanup', async () => {
  const f = fixture({rpc: () => json({code: 'XX000', message: 'private SQL details'}, 500)});
  const response = await f.invoke(); assert.equal(response.status, 503);
  assert.deepEqual(response.data, {error: 'outcome_unknown'}); assert.equal(f.calls.length, 3);
});
