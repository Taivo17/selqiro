// Targeted synthetic boundaries only: no remote Auth, database or message I/O.
// node --conditions=react-server --test --test-isolation=none tests/listing-contact-diagnostics.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);
const { contactHttp } = require('../src/entities/conversation/api/contactHttp.ts');
const model = require('../src/entities/conversation/model/listingContact.ts');
const diagnostics = require('../src/entities/conversation/model/contactDiagnostic.ts');
const browser = require('../src/entities/conversation/api/managedConversationClient.ts');
const { createListingContactService } = require('../src/server/listing-publication/contact/contactListing.ts');
const { createListingContactHandler } = require('../src/server/listing-publication/contact/contactHandler.ts');
const { hostedPreviewConfig } = require('../src/server/listing-publication/journey/hostedPreviewConfig.ts');
const REF = 'abcdefghijklmnopqrst', API = `https://${REF}.supabase.co`;
const APP = 'https://contact-diagnostics-example.vercel.app';
const USER = '71000000-0000-0000-0000-000000000001', OTHER = '71000000-0000-0000-0000-000000000009';
const IDENTITY = '72000000-0000-0000-0000-000000000002', KEY = '74000000-0000-0000-0000-000000000004';
const INSTANCE = '76000000-0000-0000-0000-000000000006', TOKEN = 'synthetic.user.token';
const SECRET_TEXT = 'private-message-or-token-must-not-appear';
const RELEASE = 'listing-publication-hosted-preview-v1';
const encoder = new TextEncoder();
const command = () => ({ expectedUserId: USER, expectedIdentityId: IDENTITY, requestKey: KEY, listingId: '197' });
const receipt = () => ({ schema_version: 1, request_key: KEY, actor_user_id: USER, identity_id: IDENTITY,
  conversation_id: '9007199254740993', listing_id: '197', replayed: false });
function config() {
  const now = Date.parse('2026-10-29T00:00:00Z');
  const jwt = role => [{ alg: 'HS256', typ: 'JWT' }, { ref: REF, role, exp: now / 1000 + 3600 }, 'synthetic-signature']
    .map(v => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url')).join('.');
  const value = hostedPreviewConfig({ NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'preview',
    VERCEL_URL: new URL(APP).host, SELQIRO_V2_HOSTED_PREVIEW: 'v1', NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW: 'v1',
    SELQIRO_V2_HOSTED_PROJECT_REF: REF, SELQIRO_V2_HOSTED_INSTANCE_ID: INSTANCE, SELQIRO_V2_HOSTED_REGION: 'eu-central-1',
    NEXT_PUBLIC_SUPABASE_URL: API, NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('anon'), SUPABASE_SERVICE_ROLE_KEY: jwt('service_role'),
    SELQIRO_V2_S3_ACCESS_KEY_ID: 'synthetic-server-access', SELQIRO_V2_S3_SECRET_ACCESS_KEY: 'synthetic-server-secret' }, now);
  assert.ok(value); return value;
}
function readiness(patch = {}) {
  return { schema_version: 1, scope: 'hosted-preview-v1', storage_contract: 'supabase-s3-session-v1', cleanup_mode: 'held',
    project_ref: REF, release_id: RELEASE, instance_id: INSTANCE, enabled: true, actor_user_id: USER, actor_allowed: true, ...patch };
}
function request(origin = APP) {
  return new Request(APP + '/api/v2/listing-contact/contact', { method: 'POST',
    headers: { host: new URL(APP).host, origin, authorization: 'Bearer ' + TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify(command()) });
}
function backend(rpc, options = {}) {
  const calls = []; let authCount = 0;
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/auth/v1/user')) {
      authCount++;
      return options.auth ? options.auth(authCount) : Response.json({ id: USER });
    }
    if (url.endsWith('/get_selqiro_hosted_preview_readiness_v1'))
      return Response.json(readiness(options.readiness));
    return rpc(url, init);
  };
  return { fetcher, calls };
}
function assertNoPrivateData(value) {
  const text = JSON.stringify(value);
  for (const marker of [SECRET_TEXT, TOKEN, USER, OTHER, IDENTITY, KEY, REF, 'private_title']) assert.equal(text.includes(marker), false);
}
async function inBrowser(operation) {
  const keys = ['NODE_ENV', 'NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION', 'NEXT_PUBLIC_SUPABASE_URL'];
  const saved = keys.map(key => [key, process.env[key]]), oldFetch = global.fetch;
  process.env.NODE_ENV = 'development'; process.env.NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION = 'v1';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  try { return await operation(); }
  finally { global.fetch = oldFetch; for (const [key, value] of saved) value === undefined ? delete process.env[key] : process.env[key] = value; }
}

test('non-2xx JSON is fully consumed before the request controller is aborted', async () => {
  let sent = 0, closed = false, cancelled = false, closedWhenAborted = false;
  const chunks = ['{"error":', '"outcome_unknown"}'];
  const stream = new ReadableStream({
    pull(controller) { if (sent < chunks.length) controller.enqueue(encoder.encode(chunks[sent++]));
      else { closed = true; controller.close(); } },
    cancel() { cancelled = true; },
  });
  const result = await contactHttp(async (_url, init) => {
    init.signal.addEventListener('abort', () => { closedWhenAborted = closed; });
    return new Response(stream, { status: 503, headers: { 'content-type': 'application/json' } });
  }, APP, {});
  assert.deepEqual(result, { status: 503, json: { error: 'outcome_unknown' } });
  assert.equal(closedWhenAborted, true); assert.equal(cancelled, false);
});

test('unusable error bodies preserve their HTTP status and discard their contents', async () => {
  const cases = [
    () => new Response('<html>' + SECRET_TEXT + '</html>', { status: 503 }),
    () => new Response('{broken', { status: 503 }),
    () => new Response(null, { status: 503 }),
    () => new Response(Uint8Array.from([0xc3, 0x28]), { status: 503 }),
    () => new Response('{"error":"refused"}', { status: 503, headers: { 'content-length': '1' } }),
    () => new Response('{}', { status: 503, headers: { 'content-length': '4097' } }),
    () => new Response('{}', { status: 503, headers: { 'content-length': 'not-a-length' } }),
    () => new Response('"' + 'x'.repeat(4095) + '"', { status: 503 }),
  ];
  for (const makeResponse of cases) assert.deepEqual(await contactHttp(async () => makeResponse(), APP, {}), { status: 503, json: null });
  const exact = '"' + 'x'.repeat(4094) + '"';
  assert.equal(encoder.encode(exact).length, 4096);
  assert.equal((await contactHttp(async () => new Response(exact, { status: 503 }), APP, {})).json.length, 4094);
});

test('streamed errors are cancelled at 4 KiB even without Content-Length', async () => {
  let cancelled = false, count = 0;
  const stream = new ReadableStream({ pull(controller) { count++; controller.enqueue(encoder.encode('x'.repeat(1024))); },
    cancel() { cancelled = true; } });
  const result = await contactHttp(async () => new Response(stream, { status: 500 }), APP, {});
  assert.deepEqual(result, { status: 500, json: null }); assert.equal(cancelled, true); assert.ok(count <= 6);
});

test('the success response budget and strict contact receipt remain unchanged', async () => {
  const large = { text: 'x'.repeat(8192) };
  assert.deepEqual(await contactHttp(async () => Response.json(large), APP, {}), { status: 200, json: large });
  await assert.rejects(contactHttp(async () => new Response('x'.repeat(2000001)), APP, {}),
    e => e instanceof model.ListingContactError && e.code === 'response');
  const b = backend(async (_url, init) => {
    assert.deepEqual(JSON.parse(init.body), { p_expected_user_id: USER, p_expected_identity_id: IDENTITY,
      p_request_key: KEY, p_listing_id: '197' });
    assert.equal(init.headers.get('authorization'), 'Bearer ' + TOKEN);
    return Response.json(receipt());
  });
  const result = await createListingContactService({ projectOrigin: API, publicKey: 'synthetic-public-key' }, b.fetcher).contact(TOKEN, command());
  assert.deepEqual(result, receipt()); assert.equal(Object.isFrozen(result), true);
  assert.equal(b.calls.filter(c => c.url.endsWith('/contact_my_listing_seller_v1')).length, 1);
});

test('abort before dispatch and during error-body reading causes no retry', async () => {
  const already = new AbortController(); already.abort(); let calls = 0;
  await assert.rejects(contactHttp(async () => { calls++; return Response.json({}); }, APP, {}, already.signal),
    e => e instanceof model.ListingContactError && e.code === 'aborted');
  assert.equal(calls, 0);
  const controller = new AbortController(); let entered;
  const reading = new Promise(resolve => { entered = resolve; });
  const pending = contactHttp(async (_url, init) => {
    calls++;
    return new Response(new ReadableStream({ start(stream) {
      stream.enqueue(encoder.encode('{')); init.signal.addEventListener('abort', () => stream.error(new Error(SECRET_TEXT)));
    }, pull() { entered(); } }), { status: 503 });
  }, APP, {}, controller.signal);
  await reading; controller.abort();
  await assert.rejects(pending, e => e instanceof model.ListingContactError && e.code === 'aborted');
  assert.equal(calls, 1);
});

test('an error-body deadline preserves the known HTTP status and aborts further reading', async t => {
  const timer = global.setTimeout; let calls = 0, wasAborted = false;
  t.mock.method(global, 'setTimeout', (callback, delay, ...args) => timer(callback, delay === 20000 ? 10 : delay, ...args));
  const result = await contactHttp(async (_url, init) => {
    calls++;
    return new Response(new ReadableStream({ start(stream) {
      init.signal.addEventListener('abort', () => { wasAborted = true; stream.error(new Error(SECRET_TEXT)); });
    } }), { status: 404 });
  }, APP, {});
  assert.deepEqual(result, { status: 404, json: null });
  assert.equal(calls, 1); assert.equal(wasAborted, true);
});

test('a deadline before response headers retains the unknown outcome', async t => {
  const timer = global.setTimeout; let calls = 0, wasAborted = false;
  t.mock.method(global, 'setTimeout', (callback, delay, ...args) => timer(callback, delay === 20000 ? 10 : delay, ...args));
  await assert.rejects(contactHttp(async (_url, init) => {
    calls++;
    return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => {
      wasAborted = true; reject(new Error(SECRET_TEXT));
    }));
  }, APP, {}), e => e instanceof model.ListingContactError && e.code === 'outcome_unknown');
  assert.equal(calls, 1); assert.equal(wasAborted, true);
});

test('diagnostics only accept allowlisted labels, HTTP status and known upstream codes', () => {
  const safe = diagnostics.contactDiagnostic('rpc', 'outcome_unknown', 500,
    { code: '42702', message: SECRET_TEXT, details: USER, hint: TOKEN });
  assert.deepEqual(safe, { stage: 'rpc', code: 'outcome_unknown', status: 500, upstreamCode: '42702' });
  assert.equal(diagnostics.formatContactDiagnostic(safe), 'LC-RPC-UNKNOWN-HTTP500-42702'); assertNoPrivateData(safe);
  assert.equal(diagnostics.contactDiagnostic('rpc', 'refused', 404, { code: 'PGRST202' }).upstreamCode, 'PGRST202');
  assert.equal(diagnostics.contactDiagnostic('rpc', 'outcome_unknown', 500, { code: SECRET_TEXT }).upstreamCode, undefined);
  for (const patch of [{ stage: SECRET_TEXT }, { code: SECRET_TEXT }, { status: 600 }, { status: '500' },
    { upstreamCode: 'PGRST999' }, { message: SECRET_TEXT }]) assert.equal(diagnostics.parseContactDiagnostic({ ...safe, ...patch }), null);
  let getterCalls = 0; const getter = { stage: 'rpc', code: 'response' };
  Object.defineProperty(getter, 'status', { enumerable: true, get() { getterCalls++; return 500; } });
  assert.equal(diagnostics.parseContactDiagnostic(getter), null); assert.equal(getterCalls, 0);
  assert.equal(diagnostics.readContactErrorDiagnostic({ error: 'refused', diagnostic: safe }, 409), null);
  assert.equal(diagnostics.readContactErrorDiagnostic({ error: 'outcome_unknown', diagnostic: safe, details: SECRET_TEXT }, 503), null);
});

test('handler preserves RPC failure status classification and exposes no upstream text or identifiers', async () => {
  for (const [upstreamStatus, upstreamCode, status, error] of [[500, '42702', 503, 'outcome_unknown'], [404, 'PGRST202', 409, 'refused'],
    [403, '42501', 409, 'refused'], [409, '23505', 409, 'refused']]) {
    const b = backend(async () => Response.json({ code: upstreamCode, message: SECRET_TEXT, details: USER, hint: TOKEN }, { status: upstreamStatus }));
    const response = await createListingContactHandler(config(), b.fetcher)(request(), 'contact');
    assert.equal(response.status, status); assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const body = await response.json();
    assert.deepEqual(body, { error, diagnostic: { stage: 'rpc', code: error, status: upstreamStatus, upstreamCode } });
    assertNoPrivateData(body); assert.equal(b.calls.length, 4);
    assert.equal(b.calls.filter(c => c.url.endsWith('/contact_my_listing_seller_v1')).length, 1);
  }
});

test('readiness, actor, service Auth, RPC transport and receipt failures have separate safe stages', async () => {
  const cases = [
    { options: { readiness: { enabled: false } }, stage: 'readiness', code: 'integration_unverified', status: 503, calls: 2 },
    { options: { auth: () => Response.json({ id: OTHER }) }, stage: 'actor_check', code: 'context_changed', status: 403, calls: 1 },
    { options: { auth: n => n === 1 ? Response.json({ id: USER }) : new Response(null, { status: 401 }) },
      stage: 'service_auth', code: 'unauthorized', status: 403, calls: 3 },
    { rpc: async () => { throw Error(SECRET_TEXT); }, stage: 'rpc', code: 'outcome_unknown', status: 503, calls: 4 },
    { rpc: async () => Response.json({ ...receipt(), identity_id: OTHER }), stage: 'receipt', code: 'response', status: 503, calls: 4 },
  ];
  for (const item of cases) {
    const b = backend(item.rpc ?? (async () => Response.json(receipt())), item.options);
    const response = await createListingContactHandler(config(), b.fetcher)(request(), 'contact');
    const body = await response.json();
    assert.equal(response.status, item.status); assert.equal(body.error, item.code); assert.equal(body.diagnostic.stage, item.stage);
    assert.equal(body.diagnostic.code, item.code); assert.equal(b.calls.length, item.calls); assertNoPrivateData(body);
  }
});

test('origin, allowlist and success contracts keep their existing protections', async () => {
  const b = backend(async () => Response.json(receipt()));
  const handler = createListingContactHandler(config(), b.fetcher);
  assert.equal((await handler(request('https://different.invalid'), 'contact')).status, 403); assert.equal(b.calls.length, 0);
  const denied = backend(async () => { throw Error('must not reach RPC'); }, { readiness: { actor_allowed: false } });
  assert.equal((await createListingContactHandler(config(), denied.fetcher)(request(), 'contact')).status, 403);
  assert.equal(denied.calls.length, 2);
  const success = await handler(request(), 'contact'); assert.equal(success.status, 200); assert.deepEqual(await success.json(), receipt());
});

test('browser preserves failure classification, sanitizes envelopes and keeps the same request key', async () => inBrowser(async () => {
  const safe = diagnostics.contactDiagnostic('rpc', 'outcome_unknown', 500, { code: '42702' });
  let calls = 0;
  global.fetch = async (_url, init) => { calls++; assert.equal(JSON.parse(init.body).requestKey, KEY);
    return Response.json({ error: 'outcome_unknown', diagnostic: safe }, { status: 503 }); };
  await assert.rejects(browser.contactListingSeller(TOKEN, command()), e => {
    assert.equal(e.code, 'outcome_unknown'); assert.deepEqual(e.diagnostic, safe); assertNoPrivateData(e); return true;
  });
  assert.equal(calls, 1);
  for (const [status, code] of [[401, 'context_changed'], [403, 'context_changed'], [400, 'refused'], [404, 'refused'], [409, 'refused'], [422, 'refused'], [503, 'outcome_unknown']]) {
    global.fetch = async () => Response.json({ error: SECRET_TEXT, diagnostic: { ...safe, stage: SECRET_TEXT } }, { status });
    await assert.rejects(browser.contactListingSeller(TOKEN, command()), e => {
      assert.equal(e.code, code); assert.equal(e.diagnostic.stage, 'browser_response'); assertNoPrivateData(e); return true;
    });
  }
  global.fetch = async () => Response.json({ error: 'integration_unverified' }, { status: 503 });
  await assert.rejects(browser.contactListingSeller(TOKEN, command()), e => e.code === 'outcome_unknown'
    && e.diagnostic.code === 'integration_unverified');
  global.fetch = async () => Response.json(receipt());
  assert.deepEqual(await browser.contactListingSeller(TOKEN, command()), receipt());
  global.fetch = async () => Response.json({ ...receipt(), actor_user_id: OTHER });
  await assert.rejects(browser.contactListingSeller(TOKEN, command()), e => e.code === 'response');
}));
