// Mocked boundaries only; no remote Auth, database, Storage or native worker I/O.
// Run with node --conditions=react-server --test --test-isolation=none.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename);
};
const { hostedPreviewConfig } = require('../src/server/listing-publication/journey/hostedPreviewConfig.ts');
const { assertHostedPreviewReady, assertHostedPreviewActor, hostedPreviewCapability } = require('../src/server/listing-publication/journey/hostedPreviewReadiness.ts');
const { assertPublicationActor } = require('../src/server/listing-publication/journey/integrationRuntime.ts');
const { localIntegrationConfig } = require('../src/server/listing-publication/journey/localIntegration.ts');
const { createJourneyRequestHandler } = require('../src/server/listing-publication/journey/createJourneyHandler.ts');
const ui = require('../src/shared/config/v2Integration.ts');
const REF = 'abcdefghijklmnopqrst';
const API = `https://${REF}.supabase.co`;
const APP = 'https://selqiro-preview-example.vercel.app';
const STORAGE = `https://${REF}.storage.supabase.co`;
const USER = '71000000-0000-0000-0000-000000000001';
const OTHER_USER = '71000000-0000-0000-0000-000000000009';
const IDENTITY = '72000000-0000-0000-0000-000000000002';
const REQUEST = '74000000-0000-0000-0000-000000000004';
const INSTANCE = '76000000-0000-0000-0000-000000000006';
const RELEASE = 'listing-publication-hosted-preview-v1';
const NOW = Date.parse('2026-10-26T19:00:00Z');
const TOKEN = 'synthetic.user.session';
const READINESS = '/rest/v1/rpc/get_selqiro_hosted_preview_readiness_v1';
const jwt = role => [
  { alg: 'HS256', typ: 'JWT' }, { ref: REF, role, exp: NOW / 1000 + 3600 }, 'synthetic-signature',
].map(part => Buffer.from(typeof part === 'string' ? part : JSON.stringify(part)).toString('base64url')).join('.');
function environment() {
  return {
    NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'preview',
    VERCEL_URL: new URL(APP).host, SELQIRO_V2_HOSTED_PREVIEW: 'v1',
    NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW: 'v1', SELQIRO_V2_HOSTED_PROJECT_REF: REF,
    SELQIRO_V2_HOSTED_INSTANCE_ID: INSTANCE, SELQIRO_V2_HOSTED_REGION: 'eu-central-1',
    NEXT_PUBLIC_SUPABASE_URL: API, NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('anon'),
    SUPABASE_SERVICE_ROLE_KEY: jwt('service_role'),
    SELQIRO_V2_S3_ACCESS_KEY_ID: 'synthetic-server-access', SELQIRO_V2_S3_SECRET_ACCESS_KEY: 'synthetic-server-secret',
  };
}
function config() {
  const value = hostedPreviewConfig(environment(), NOW);
  assert.ok(value);
  return value;
}
function readiness(actor = null, patch = {}) {
  return { schema_version: 1, scope: 'hosted-preview-v1', storage_contract: 'supabase-s3-session-v1',
    cleanup_mode: 'held', project_ref: REF, release_id: RELEASE, instance_id: INSTANCE,
    enabled: true, actor_user_id: actor, actor_allowed: actor !== null, ...patch };
}
const capability = () => ({ schemaVersion: 1, mode: 'hosted-preview-v1', releaseId: RELEASE,
  instanceId: INSTANCE, appOrigin: APP, projectOrigin: API, storageOrigin: STORAGE });

test('hosted runtime: capability is bound to the installed release and contains only public target data', async () => {
  const c = config(), calls = [];
  const result = await hostedPreviewCapability(c, undefined, async (url, init) => {
    calls.push(url);
    assert.equal(url, API + READINESS);
    assert.equal(init.headers.get('authorization'), 'Bearer ' + c.serviceKey);
    assert.equal(init.headers.get('apikey'), c.serviceKey);
    assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
    assert.deepEqual(JSON.parse(init.body), { p_expected_project_ref: REF, p_expected_release_id: RELEASE,
      p_expected_instance_id: INSTANCE, p_expected_user_id: null });
    return Response.json(readiness());
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(result, capability());
  assert.equal(Object.isFrozen(result), true);
  assert.equal(JSON.stringify(result).includes('synthetic-server'), false);
});

test('hosted runtime: wrong release, instance, authority or actor cannot become readiness', async () => {
  const c = config();
  for (const patch of [
    { enabled: false }, { project_ref: 'zyxwvutsrqponmlkjihg' }, { release_id: 'another-release' },
    { instance_id: OTHER_USER }, { storage_contract: 'local-oracle' }, { cleanup_mode: 'complete' },
    { actor_user_id: OTHER_USER }, { unexpected: true },
  ]) await assert.rejects(assertHostedPreviewReady(c, USER, undefined,
    async () => Response.json(readiness(USER, patch))), /integration_unverified/);
  await assert.rejects(assertHostedPreviewReady(c, USER, undefined,
    async () => Response.json(readiness(USER, { actor_allowed: false }))), /unauthorized/);
  await assert.rejects(assertHostedPreviewReady(c, null, undefined,
    async () => Response.json(readiness(null, { actor_allowed: true }))), /integration_unverified/);
  await assert.rejects(assertHostedPreviewReady(c, null, undefined,
    async () => new Response(null, { status: 404 })), /integration_unverified/);
});

test('hosted runtime: real Auth precedes the allowlist and an unvalidated configuration cannot call a backend', async () => {
  const c = config(), calls = [];
  await assert.rejects(assertHostedPreviewActor(c, TOKEN, USER, undefined, async (url, init) => {
    calls.push(url);
    assert.equal(url, API + '/auth/v1/user');
    assert.equal(init.headers.get('authorization'), 'Bearer ' + TOKEN);
    assert.equal(init.headers.get('apikey'), c.publicKey);
    return Response.json({ id: OTHER_USER });
  }), /context_changed/);
  assert.deepEqual(calls, [API + '/auth/v1/user']);
  let copiedCalls = 0;
  await assert.rejects(assertHostedPreviewActor(Object.freeze({ ...c }), TOKEN, USER, undefined,
    async () => { copiedCalls++; throw Error('must not fetch'); }), /unauthorized/);
  assert.equal(copiedCalls, 0);
});

test('hosted runtime: publication, image and owner commands each require the same allowlisted Auth actor', async () => {
  const listing = { basics: { title: 'Preview item', description: 'Preview description', condition: 'used' },
    price: { kind: 'fixed', amount: '12.30', currency: 'EUR' }, category_path: ['vehicles', 'cars'],
    location: { country: 'Estonia', city: 'Paide', latitude: null, longitude: null },
    attributes: {}, details: {}, language: 'et' };
  const commands = [
    ['prepare', { expectedUserId: USER, expectedIdentityId: IDENTITY, requestKey: REQUEST, listing, images: [] }, 'prepare_my_listing_publication_v1'],
    ['image-prepare', { expectedUserId: USER, expectedIdentityId: IDENTITY }, 'image-prepare'],
    ['owner-edit-save', { p_expected_actor_id: USER, p_expected_identity_id: IDENTITY, p_listing_id: '123',
      p_expected_basics: {}, p_basics: {} }, 'save_my_listing_edit_v1'],
  ];
  for (const [action, input, expectedWrite] of commands) for (const allowed of [false, true]) {
    const c = config(), calls = [], writes = [];
    const fetcher = async (url, init) => {
      if (url === API + '/auth/v1/user') { calls.push('auth'); return Response.json({ id: USER }); }
      const args = JSON.parse(init.body);
      if (url === API + READINESS) {
        calls.push('readiness'); assert.equal(args.p_expected_user_id, USER);
        return Response.json(readiness(USER, { actor_allowed: allowed }));
      }
      calls.push('write'); writes.push(url.slice((API + '/rest/v1/rpc/').length));
      assert.equal(args[action === 'owner-edit-save' ? 'p_expected_actor_id' : 'p_expected_user_id'], USER);
      assert.equal(init.headers.get('authorization'), 'Bearer ' + TOKEN);
      return Response.json({ accepted: true });
    };
    const images = {
      prepare: async (token, value) => { calls.push('write'); writes.push('image-prepare');
        assert.equal(token, TOKEN); assert.equal(value.expectedUserId, USER); return { accepted: true }; },
      verify: async () => { throw Error('unexpected verify'); }, settle: async () => { throw Error('unexpected cleanup'); },
    };
    const handle = createJourneyRequestHandler(c, images, fetcher);
    const reply = await handle(new Request(APP + '/api/v2/publication/' + action, {
      method: 'POST', headers: { host: new URL(APP).host, origin: APP, authorization: 'Bearer ' + TOKEN,
        'content-type': 'application/json' }, body: JSON.stringify(input),
    }), action);
    assert.equal(reply.status, allowed ? 200 : 403, `${action} allowed=${allowed}`);
    assert.deepEqual(calls, allowed ? ['auth', 'readiness', 'write'] : ['auth', 'readiness']);
    assert.deepEqual(writes, allowed ? [expectedWrite] : []);
  }
});

test('hosted runtime: local requests retain the exact disposable database assertion', async () => {
  const c = localIntegrationConfig({ NODE_ENV: 'development', SELQIRO_V2_LOCAL_INTEGRATION: 'v1',
    NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION: 'v1', SELQIRO_V2_RUN_ID: INSTANCE,
    SELQIRO_V2_APP_ORIGIN: 'http://localhost:3000', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:63111',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-public', SUPABASE_SERVICE_ROLE_KEY: 'local-service',
    SELQIRO_V2_S3_ENDPOINT: 'http://127.0.0.1:63111/storage/v1/s3', SELQIRO_V2_S3_REGION: 'local',
    SELQIRO_V2_S3_ACCESS_KEY_ID: 'local-access', SELQIRO_V2_S3_SECRET_ACCESS_KEY: 'local-secret', SELQIRO_V2_S3_TENANT_ID: 'local-tenant' });
  assert.ok(c);
  let calls = 0;
  await assertPublicationActor(c, TOKEN, USER, undefined, async (url, init) => {
    calls++;
    assert.equal(url, c.projectOrigin + '/rest/v1/rpc/assert_selqiro_disposable_v2');
    assert.deepEqual(JSON.parse(init.body), { p_run_id: INSTANCE });
    return Response.json({ run_id: INSTANCE, scope: 'disposable-v2' });
  });
  assert.equal(calls, 1);
});

test('hosted runtime: browser mode waits for a same-target capability and server state stays unchanged', () => {
  const selected = { NODE_ENV: 'production', NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW: 'v1',
    NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION: undefined, NEXT_PUBLIC_SUPABASE_URL: API };
  const saved = Object.fromEntries(Object.keys(selected).map(key => [key, process.env[key]]));
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    for (const [key, value] of Object.entries(selected)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    delete globalThis.window;
    assert.equal(ui.installHostedPreviewCapability(capability()), false);
    assert.equal(ui.v2IntegrationEnabled(), false);
    globalThis.window = { location: { origin: APP } };
    assert.equal(ui.v2IntegrationEnabled(), false);
    assert.equal(ui.installHostedPreviewCapability(null), false);
    for (const patch of [{ appOrigin: 'https://another-preview.vercel.app' },
      { projectOrigin: 'https://zyxwvutsrqponmlkjihg.supabase.co' }, { storageOrigin: API }, { releaseId: 'other' }]) {
      assert.equal(ui.installHostedPreviewCapability({ ...capability(), ...patch }), false);
      assert.equal(ui.v2IntegrationEnabled(), false);
    }
    assert.equal(ui.installHostedPreviewCapability(capability()), true);
    assert.equal(ui.v2IntegrationEnabled(), true);
    assert.equal(ui.publicationUploadOrigin(), STORAGE);
    delete globalThis.window;
    assert.equal(ui.v2IntegrationEnabled(), false);
    assert.equal(ui.installHostedPreviewCapability(capability()), false);
    globalThis.window = { location: { origin: APP } };
    ui.installHostedPreviewCapability(null);
    assert.equal(ui.v2IntegrationEnabled(), false);
  } finally {
    if (typeof window !== 'undefined') ui.installHostedPreviewCapability(null);
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else delete globalThis.window;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
