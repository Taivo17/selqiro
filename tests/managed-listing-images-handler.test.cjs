'use strict';
// Actual HTTP handler, authentication/readiness gates and HTTP wrapper. Only the
// external fetch transport is controlled; this suite performs no external I/O.
// Run: node --conditions=react-server tests/managed-listing-images-handler.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const built = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2017,
      module: ts.ModuleKind.CommonJS, esModuleInterop: true } });
  assert.deepEqual(built.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error), []);
  module._compile(built.outputText, filename);
};
const { hostedPreviewConfig } = require('../src/server/listing-publication/journey/hostedPreviewConfig.ts');
const { createJourneyRequestHandler } = require('../src/server/listing-publication/journey/createJourneyHandler.ts');

const REF = 'abcdefghijklmnopqrst', API = `https://${REF}.supabase.co`;
const APP = 'https://selqiro-images-boundary.vercel.app';
const USER = '71000000-0000-0000-0000-000000000001';
const IDENTITY = '72000000-0000-0000-0000-000000000002';
const ATTEMPT = '73aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
const INSTANCE = '76000000-0000-0000-0000-000000000006';
const OTHER = '79000000-0000-0000-0000-000000000009';
const RELEASE = 'listing-publication-hosted-preview-v1';
const TOKEN = 'synthetic.user.session';
const NOW = Date.parse('2026-11-01T12:00:00Z');
const LISTING = '9007199254740993';
const READ = 'owner-images-read', PRIMARY = 'owner-images-primary', REMOVE = 'owner-images-remove';
const RPC = {
  [READ]: 'get_my_managed_listing_images_v1',
  [PRIMARY]: 'set_my_managed_listing_primary_image_v1',
  [REMOVE]: 'remove_my_managed_listing_image_v1',
  'owner-images-add-prepare': 'prepare_my_managed_listing_image_addition_v1',
  'owner-images-add-status': 'get_my_managed_listing_image_addition_v1',
  'owner-images-add-append': 'append_my_managed_listing_image_v1',
  'owner-images-add-cancel': 'cancel_my_managed_listing_image_addition_v1',
};
const READINESS = '/rest/v1/rpc/get_selqiro_hosted_preview_readiness_v1';
const secret = 'synthetic-private-database-details-never-return';
const json = (value, status = 200) => Response.json(value, { status });
const defer = () => {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
};
function config() {
  const jwt = role => [{ alg: 'HS256', typ: 'JWT' }, { ref: REF, role, exp: NOW / 1000 + 3600 },
    'synthetic-signature'].map(part => Buffer.from(typeof part === 'string' ? part : JSON.stringify(part)).toString('base64url')).join('.');
  const c = hostedPreviewConfig({ NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'preview',
    VERCEL_URL: new URL(APP).host, SELQIRO_V2_HOSTED_PREVIEW: 'v1', NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW: 'v1',
    SELQIRO_V2_HOSTED_PROJECT_REF: REF, SELQIRO_V2_HOSTED_INSTANCE_ID: INSTANCE,
    SELQIRO_V2_HOSTED_REGION: 'eu-central-1', NEXT_PUBLIC_SUPABASE_URL: API,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('anon'), SUPABASE_SERVICE_ROLE_KEY: jwt('service_role'),
    SELQIRO_V2_S3_ACCESS_KEY_ID: 'synthetic-access', SELQIRO_V2_S3_SECRET_ACCESS_KEY: 'synthetic-secret',
  }, NOW);
  assert.ok(c);
  return c;
}
function args(action = PRIMARY) {
  return { p_expected_user_id: USER, p_expected_identity_id: IDENTITY, p_listing_id: LISTING,
    p_attempt_id: ATTEMPT, ...(action !== READ ? { p_expected_revision: '9007199254740993', p_ordinal: 2 } : {}) };
}
function readiness(patch = {}) {
  return { schema_version: 1, scope: 'hosted-preview-v1', storage_contract: 'supabase-s3-session-v1',
    cleanup_mode: 'held', project_ref: REF, release_id: RELEASE, instance_id: INSTANCE,
    enabled: true, actor_user_id: USER, actor_allowed: true, ...patch };
}
function snapshot(action = READ) {
  return { schema_version: 1, actor_user_id: USER, identity_id: IDENTITY, listing_id: LISTING,
    attempt_id: ATTEMPT, revision: action !== READ ? '9007199254740994' : '9007199254740993',
    images: Array.from({ length: 3 }, (_, ordinal) => ({ ordinal,
      url: `/api/v2/listing-media/${ATTEMPT}/${ordinal}`, is_primary: ordinal === (action === PRIMARY ? 2 : 0) })).filter(image => action !== REMOVE || image.ordinal !== 2),
    ...(action !== READ ? { changed: true } : {}) };
}
function harness(options = {}) {
  const c = config(), calls = [], imageCalls = [];
  const images = Object.fromEntries(['prepare', 'verify', 'settle'].map(name => [name, async () => {
    imageCalls.push(name); throw Error('Unexpected image processing operation');
  }]));
  const fetcher = async (url, init) => {
    assert.equal(new URL(url).origin, API);
    assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
    assert.equal(init.credentials, 'omit'); assert.equal(init.referrerPolicy, 'no-referrer');
    const pathname = new URL(url).pathname;
    const body = init.body ? JSON.parse(init.body) : null;
    const call = { pathname, method: init.method, body, headers: init.headers, signal: init.signal };
    calls.push(call);
    if (pathname === '/auth/v1/user') {
      assert.equal(init.method, 'GET'); assert.equal(body, null);
      assert.equal(init.headers.get('authorization'), 'Bearer ' + TOKEN);
      assert.equal(init.headers.get('apikey'), c.publicKey);
      return options.auth ? options.auth(call) : json({ id: USER });
    }
    if (pathname === READINESS) {
      assert.equal(init.method, 'POST');
      assert.equal(init.headers.get('authorization'), 'Bearer ' + c.serviceKey);
      assert.equal(init.headers.get('apikey'), c.serviceKey);
      assert.deepEqual(body, { p_expected_project_ref: REF, p_expected_release_id: RELEASE,
        p_expected_instance_id: INSTANCE, p_expected_user_id: USER });
      return options.readiness ? options.readiness(call) : json(readiness());
    }
    const action = Object.keys(RPC).find(name => pathname === '/rest/v1/rpc/' + RPC[name]);
    assert.ok(action, 'Unexpected HTTP operation: ' + pathname);
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.get('authorization'), 'Bearer ' + TOKEN);
    assert.equal(init.headers.get('apikey'), c.publicKey);
    assert.equal(init.headers.get('content-type'), 'application/json');
    assert.equal(init.headers.has('host'), false); assert.equal(init.headers.has('origin'), false);
    return options.rpc ? options.rpc(call, action) : json(snapshot(action));
  };
  const handle = createJourneyRequestHandler(c, images, fetcher);
  const request = (action, input, patch = {}) => {
    const headers = new Headers({ host: new URL(APP).host, origin: APP,
      authorization: 'Bearer ' + TOKEN, 'content-type': 'application/json' });
    for (const [name, value] of Object.entries(patch.headers ?? {})) {
      if (value === null) headers.delete(name); else headers.set(name, value);
    }
    const method = patch.method ?? 'POST';
    return new Request(patch.url ?? APP + '/api/v2/publication/' + action, {
      method, headers, ...(method === 'GET' || method === 'HEAD' ? {} : { body: JSON.stringify(input) }),
      ...(patch.signal ? { signal: patch.signal } : {}),
    });
  };
  return { calls, imageCalls,
    rpcCalls: () => calls.filter(call => Object.values(RPC).some(name => call.pathname.endsWith('/' + name))),
    async invoke(action = PRIMARY, input = args(action), patch = {}) {
      const response = await handle(request(action, input, patch), action);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.deepEqual(imageCalls, []);
      return { status: response.status, value: await response.json() };
    },
  };
}

for (const action of [READ, PRIMARY, REMOVE]) test(`${action}: Auth and readiness precede the exact user-authorized RPC`, async () => {
  const h = harness(), input = args(action), result = await h.invoke(action, input);
  assert.equal(result.status, 200); assert.deepEqual(result.value, snapshot(action));
  assert.deepEqual(h.calls.map(call => call.pathname), ['/auth/v1/user', READINESS, '/rest/v1/rpc/' + RPC[action]]);
  assert.deepEqual(h.rpcCalls()[0].body, input);
  assert.equal(typeof h.rpcCalls()[0].body.p_listing_id, 'string');
  if (action !== READ) assert.equal(h.rpcCalls()[0].body.p_expected_revision, '9007199254740993');
});

test('neither pending authentication nor pending readiness permits an early primary write', async () => {
  const auth = defer(), authEntered = defer(), ready = defer(), readyEntered = defer();
  const h = harness({ auth: async () => { authEntered.resolve(); return auth.promise; },
    readiness: async () => { readyEntered.resolve(); return ready.promise; } });
  const pending = h.invoke(); await authEntered.promise;
  assert.deepEqual(h.calls.map(call => call.pathname), ['/auth/v1/user']); assert.equal(h.rpcCalls().length, 0);
  auth.resolve(json({ id: USER })); await readyEntered.promise;
  assert.deepEqual(h.calls.map(call => call.pathname), ['/auth/v1/user', READINESS]); assert.equal(h.rpcCalls().length, 0);
  ready.resolve(json(readiness())); assert.equal((await pending).status, 200); assert.equal(h.rpcCalls().length, 1);
});

for (const action of [READ, PRIMARY, REMOVE]) {
  test(`${action}: a different authenticated account cannot use the caller's expected user`, async () => {
    const h = harness({ auth: () => json({ id: OTHER }) });
    assert.deepEqual(await h.invoke(action), { status: 403, value: { error: 'context_changed' } });
    assert.deepEqual(h.calls.map(call => call.pathname), ['/auth/v1/user']);
  });
  test(`${action}: preview actor denial prevents RPC dispatch`, async () => {
    const h = harness({ readiness: () => json(readiness({ actor_allowed: false })) });
    assert.deepEqual(await h.invoke(action), { status: 403, value: { error: 'unauthorized' } });
    assert.equal(h.rpcCalls().length, 0);
  });
}

test('invalid Auth response and disabled readiness cannot reach a primary write', async () => {
  for (const [options, expected] of [
    [{ auth: () => json({ message: secret }, 401) }, { status: 403, value: { error: 'unauthorized' } }],
    [{ readiness: () => json(readiness({ enabled: false })) }, { status: 503, value: { error: 'integration_unverified' } }],
  ]) {
    const h = harness(options); assert.deepEqual(await h.invoke(), expected); assert.equal(h.rpcCalls().length, 0);
  }
});

for (const action of [READ, PRIMARY, REMOVE]) {
  for (const key of Object.keys(args(action)).filter(key => key !== 'p_expected_user_id'))
    test(`${action}: missing ${key} is refused before RPC dispatch`, async () => {
      const h = harness(), input = args(action); delete input[key];
      assert.deepEqual(await h.invoke(action, input), { status: 409, value: { error: 'refused' } });
      assert.equal(h.rpcCalls().length, 0);
    });
  for (const extra of ['p_source_url', 'p_is_primary', 'p_service_key'])
    test(`${action}: extra ${extra} is refused before RPC dispatch`, async () => {
      const h = harness();
      assert.deepEqual(await h.invoke(action, { ...args(action), [extra]: secret }),
        { status: 409, value: { error: 'refused' } });
      assert.equal(h.rpcCalls().length, 0);
    });
}

test('missing expected user is unauthorized before Auth or RPC', async () => {
  const h = harness(), input = args(); delete input.p_expected_user_id;
  assert.deepEqual(await h.invoke(PRIMARY, input), { status: 403, value: { error: 'unauthorized' } });
  assert.equal(h.calls.length, 0);
});

for (const [name, value] of [
  ['negative', '-1'], ['leading zero', '01'], ['numeric', 1], ['null', null], ['empty', ''],
  ['decimal', '1.0'], ['exponent', '1e0'], ['space', '1 '], ['newline', '1\n'],
  ['CRLF', '1\r\n'], ['bigint overflow', '9223372036854775808'], ['too long', '10000000000000000000'],
]) test('primary revision is canonical before RPC: reject ' + name, async () => {
  const h = harness();
  assert.deepEqual(await h.invoke(PRIMARY, { ...args(), p_expected_revision: value }),
    { status: 409, value: { error: 'refused' } });
  assert.equal(h.rpcCalls().length, 0);
});

for (const revision of ['0', '9007199254740993', '9223372036854775807'])
  test('canonical revision reaches SQL unchanged: ' + revision, async () => {
    const h = harness({ rpc: () => json({ code: '40001', message: 'listing_images_conflict' }, 409) });
    const result = await h.invoke(PRIMARY, { ...args(), p_expected_revision: revision });
    assert.equal(result.status, 409); assert.equal(result.value.message, 'listing_images_conflict');
    assert.equal(h.rpcCalls().length, 1); assert.equal(h.rpcCalls()[0].body.p_expected_revision, revision);
  });

for (const ordinal of [-1, 2147483648, 1.5, '1', null, true]) test('primary ordinal is a gallery integer: reject ' + String(ordinal), async () => {
  const h = harness();
  assert.deepEqual(await h.invoke(PRIMARY, { ...args(), p_ordinal: ordinal }), { status: 409, value: { error: 'refused' } });
  assert.equal(h.rpcCalls().length, 0);
});
test('both first and last supported original ordinals reach SQL unchanged', async () => {
  for (const ordinal of [0, 9]) {
    const h = harness({ rpc: () => json({ code: '55000', message: 'listing_images_unavailable' }, 409) });
    await h.invoke(PRIMARY, { ...args(), p_ordinal: ordinal });
    assert.equal(h.rpcCalls().length, 1); assert.equal(h.rpcCalls()[0].body.p_ordinal, ordinal);
  }
});

for (const [field, value, name] of [
  ['p_attempt_id', '00000000-0000-0000-0000-000000000000', 'nil attempt'],
  ['p_attempt_id', ATTEMPT.toUpperCase(), 'uppercase attempt'],
  ['p_attempt_id', ATTEMPT + '\n', 'attempt newline'],
  ['p_expected_identity_id', IDENTITY + '\n', 'identity newline'],
  ['p_listing_id', Number(LISTING), 'numeric listing'],
  ['p_listing_id', '0', 'zero listing'], ['p_listing_id', '01', 'leading zero listing'],
  ['p_listing_id', LISTING + '\n', 'listing newline'], ['p_listing_id', '9223372036854775808', 'listing overflow'],
]) test('image binding rejects noncanonical ' + name, async () => {
  const h = harness();
  assert.deepEqual(await h.invoke(PRIMARY, { ...args(), [field]: value }), { status: 409, value: { error: 'refused' } });
  assert.equal(h.rpcCalls().length, 0);
});

for (const [code, message, normalizedCode, normalizedMessage, status] of [
  ['40001', 'listing_images_conflict', '40001', 'listing_images_conflict', 409],
  ['55000', 'listing_images_unavailable', '55000', 'listing_images_unavailable', 409],
  ['42501', secret, '42501', 'listing_activity_identity_required', 403],
  ['22023', secret, '22023', 'listing_activity_deadline_invalid', 409],
  ['PGRST202', secret, 'PGRST202', 'owner_contract_unavailable', 409],
  ['42883', secret, 'PGRST202', 'owner_contract_unavailable', 409],
]) test('recognized database rejection is safely normalized once: ' + code + '/' + normalizedMessage, async () => {
  const h = harness({ rpc: () => json({ code, message, detail: secret, hint: secret, query: secret }, 409) });
  assert.deepEqual(await h.invoke(), { status, value: { error: 'owner_contract', code: normalizedCode, message: normalizedMessage } });
  assert.equal(h.rpcCalls().length, 1);
});

for (const [code, message] of [
  ['40001', 'private_conflict_' + secret], ['55000', 'private_state_' + secret], ['XX000', secret],
]) test('unknown database details are masked without a write retry: ' + code, async () => {
  const h = harness({ rpc: () => json({ code, message, detail: secret, hint: secret }, 500) });
  assert.deepEqual(await h.invoke(), { status: 503, value: { error: 'outcome_unknown' } });
  assert.equal(h.rpcCalls().length, 1);
});

for (const [name, rpc] of [
  ['transport exception', () => { throw Error(secret); }],
  ['malformed response', () => new Response('{"private":"' + secret, { status: 200 })],
  ['oversized response', () => json({ code: '40001', message: 'listing_images_conflict', detail: secret.repeat(3000) }, 409)],
]) test('ambiguous primary response remains unknown and is not retried: ' + name, async () => {
  const h = harness({ rpc });
  assert.deepEqual(await h.invoke(), { status: 503, value: { error: 'outcome_unknown' } });
  assert.equal(h.rpcCalls().length, 1);
});

test('abort after primary RPC dispatch never retries or reports success from a late reply', async () => {
  const entered = defer(), reply = defer(), control = new AbortController();
  const h = harness({ rpc: async () => { entered.resolve(); return reply.promise; } });
  const pending = h.invoke(PRIMARY, args(), { signal: control.signal });
  await entered.promise; control.abort();
  assert.deepEqual(await pending, { status: 503, value: { error: 'outcome_unknown' } });
  reply.resolve(json(snapshot(PRIMARY))); await Promise.resolve();
  assert.equal(h.rpcCalls().length, 1);
});

for (const [name, headers] of [
  ['missing Origin', { origin: null }], ['different Origin', { origin: 'https://another.example' }],
  ['trailing slash Origin', { origin: APP + '/' }], ['missing Host', { host: null }],
  ['different Host', { host: 'another.example' }],
  ['forwarded headers cannot replace Host', { host: 'localhost:3000', 'x-forwarded-host': new URL(APP).host, 'x-forwarded-proto': 'https' }],
]) test('existing origin and host gate rejects before Auth: ' + name, async () => {
  const h = harness();
  assert.deepEqual(await h.invoke(PRIMARY, args(), { headers }), { status: 403, value: { error: 'origin' } });
  assert.equal(h.calls.length, 0);
});

test('Next localhost URL normalization retains the trusted exact Host and Origin gate', async () => {
  const h = harness();
  assert.equal((await h.invoke(PRIMARY, args(), { url: 'http://localhost:3000/api/v2/publication/' + PRIMARY })).status, 200);
  assert.equal(h.rpcCalls().length, 1);
});

for (const authorization of [null, 'Basic synthetic', 'Bearer has spaces'])
  test('missing or invalid bearer syntax is rejected before external authentication: ' + authorization, async () => {
    const h = harness();
    assert.deepEqual(await h.invoke(PRIMARY, args(), { headers: { authorization } }),
      { status: 401, value: { error: 'unauthorized' } });
    assert.equal(h.calls.length, 0);
  });
test('non-POST and unknown owner image action do not authenticate or dispatch', async () => {
  const h = harness();
  assert.deepEqual(await h.invoke(PRIMARY, args(), { method: 'GET' }), { status: 405, value: { error: 'method' } });
  assert.deepEqual(await h.invoke('owner-images-delete', args()), { status: 404, value: { error: 'not_found' } });
  assert.equal(h.calls.length, 0);
});

for (const [name, patch] of [
  ['numeric revision', {p_expected_revision: 5}], ['newline revision', {p_expected_revision: '5\n'}],
  ['overflow revision', {p_expected_revision: '9223372036854775808'}],
  ['string ordinal', {p_ordinal: '1'}], ['out of range ordinal', {p_ordinal: 2147483648}],
  ['foreign path', {p_ordinal: '/source.upload'}],
]) test('removal rejects invalid CAS input before RPC: ' + name, async () => {
  const h = harness();
  assert.deepEqual(await h.invoke(REMOVE, {...args(REMOVE), ...patch}), {status: 409, value: {error: 'refused'}});
  assert.equal(h.rpcCalls().length, 0);
});

for (const [code, message, status] of [
  ['40001', 'listing_images_conflict', 409], ['55000', 'listing_images_unavailable', 409],
  ['42501', secret, 403], ['22023', secret, 409], ['PGRST202', secret, 409],
]) test('removal rejection is normalized once without cleanup: ' + code, async () => {
  const h = harness({rpc: () => json({code, message, detail: secret}, 409)});
  const result = await h.invoke(REMOVE);
  assert.equal(result.status, status); assert.equal(result.value.error, 'owner_contract');
  assert.equal(result.value.code, code); assert.equal(JSON.stringify(result).includes(secret), false);
  assert.equal(h.rpcCalls().length, 1); assert.deepEqual(h.imageCalls, []);
});

test('lost removal acknowledgement stays unknown without resend or cleanup', async () => {
  const h = harness({rpc: () => {throw Error('connection lost after commit');}});
  assert.deepEqual(await h.invoke(REMOVE), {status: 503, value: {error: 'outcome_unknown'}});
  assert.equal(h.rpcCalls().length, 1); assert.deepEqual(h.imageCalls, []);
});

test('removal abort after RPC dispatch ignores late success without cleanup', async () => {
  const entered = defer(), reply = defer(), control = new AbortController();
  const h = harness({rpc: async () => {entered.resolve(); return reply.promise;}});
  const pending = h.invoke(REMOVE, args(REMOVE), {signal: control.signal});
  await entered.promise; control.abort();
  assert.deepEqual(await pending, {status: 503, value: {error: 'outcome_unknown'}});
  reply.resolve(json(snapshot(REMOVE))); await Promise.resolve();
  assert.equal(h.rpcCalls().length, 1); assert.deepEqual(h.imageCalls, []);
});

for (const action of [PRIMARY, REMOVE]) test(`${action}: a durable gallery ordinal above nine reaches SQL unchanged`, async () => {
  const h = harness(); assert.equal((await h.invoke(action, {...args(action), p_ordinal: 2147483647})).status, 200);
  assert.equal(h.rpcCalls()[0].body.p_ordinal, 2147483647);
});

const ADD_PREPARE = 'owner-images-add-prepare', ADD_STATUS = 'owner-images-add-status';
const ADD_APPEND = 'owner-images-add-append', ADD_CANCEL = 'owner-images-add-cancel';
function additionArgs(action) {
  return {...args(READ), p_request_key: OTHER,
    ...(action === ADD_PREPARE || action === ADD_APPEND ? {p_expected_revision: '9007199254740993'} : {}),
    ...(action === ADD_PREPARE ? {p_image: {client_file_id: OTHER, byte_length: 1234, sha256: 'a'.repeat(64)}} : {}),
    ...(action === ADD_APPEND ? {p_addition_attempt_id: OTHER, p_ready_id: INSTANCE} : {})};
}
for (const action of [ADD_PREPARE, ADD_STATUS, ADD_APPEND, ADD_CANCEL]) {
  test(`${action}: one user-token RPC follows Auth and readiness; recovery reads need no revision`, async () => {
    const h = harness(), input = additionArgs(action); assert.equal((await h.invoke(action, input)).status, 200);
    assert.deepEqual(h.calls.map(c => c.pathname), ['/auth/v1/user', READINESS, '/rest/v1/rpc/' + RPC[action]]);
    assert.deepEqual(h.rpcCalls()[0].body, input); assert.deepEqual(h.imageCalls, []);
  });
  test(`${action}: other actor or extra target path cannot reach RPC`, async () => {
    const h = harness({auth: () => json({id: OTHER})});
    assert.equal((await h.invoke(action, additionArgs(action))).status, 403); assert.equal(h.rpcCalls().length, 0);
    const validActor = harness();
    assert.equal((await validActor.invoke(action, {...additionArgs(action), p_object_path: 'other/source.upload'})).status, 409);
    assert.equal(validActor.rpcCalls().length, 0);
  });
}
for (const [label, patch] of [
  ['missing request', {p_request_key: null}], ['numeric revision', {p_expected_revision: 3}],
  ['unbounded file', {p_image: {client_file_id: OTHER, byte_length: 26214401, sha256: 'a'.repeat(64)}}],
  ['empty file', {p_image: {client_file_id: OTHER, byte_length: 0, sha256: 'a'.repeat(64)}}],
  ['unverified digest', {p_image: {client_file_id: OTHER, byte_length: 1234, sha256: 'A'.repeat(64)}}],
  ['caller filename', {p_image: {client_file_id: OTHER, byte_length: 1234, sha256: 'a'.repeat(64), filename: 'private.jpg'}}],
]) test('addition prepare refuses ' + label + ' before SQL', async () => {
  const h = harness(); assert.equal((await h.invoke(ADD_PREPARE, {...additionArgs(ADD_PREPARE), ...patch})).status, 409);
  assert.equal(h.rpcCalls().length, 0);
});
for (const field of ['p_addition_attempt_id', 'p_ready_id', 'p_expected_revision'])
  test('append requires exact ' + field, async () => {
    const h = harness(), input = additionArgs(ADD_APPEND); delete input[field];
    assert.equal((await h.invoke(ADD_APPEND, input)).status, 409); assert.equal(h.rpcCalls().length, 0);
  });
for (const [label, action, patch] of [
  ['request key', ADD_PREPARE, {p_request_key: OTHER + '\n'}],
  ['client file id', ADD_PREPARE, {p_image: {client_file_id: OTHER + '\n', byte_length: 1234, sha256: 'a'.repeat(64)}}],
  ['ready id', ADD_APPEND, {p_ready_id: INSTANCE + '\n'}],
]) test('addition rejects a trailing newline in ' + label + ' before SQL', async () => {
  const h = harness();
  assert.equal((await h.invoke(action, {...additionArgs(action), ...patch})).status, 409);
  assert.equal(h.rpcCalls().length, 0); assert.deepEqual(h.imageCalls, []);
});
test('lost append acknowledgement stays unknown and never triggers upload, cleanup or resend', async () => {
  const h = harness({rpc: () => {throw Error('lost response after attach');}});
  assert.deepEqual(await h.invoke(ADD_APPEND, additionArgs(ADD_APPEND)), {status: 503, value: {error: 'outcome_unknown'}});
  assert.equal(h.rpcCalls().length, 1); assert.deepEqual(h.imageCalls, []);
});
for (const message of ['publication_open_attempt_limit', 'publication_daily_attempt_limit', 'publication_retained_bytes_limit'])
  test('addition exposes only the known capacity refusal ' + message, async () => {
    const h = harness({rpc: () => json({code: '54000', message, details: secret, hint: secret}, 500)});
    assert.deepEqual(await h.invoke(ADD_PREPARE, additionArgs(ADD_PREPARE)),
      {status: 409, value: {error: 'owner_contract', code: '54000', message}});
    assert.equal(h.rpcCalls().length, 1); assert.deepEqual(h.imageCalls, []);
  });
test('an unknown 54000 remains an unknown outcome without raw details or a retry', async () => {
  const h = harness({rpc: () => json({code: '54000', message: 'publication_message_cleanup_limit', details: secret}, 500)});
  assert.deepEqual(await h.invoke(ADD_PREPARE, additionArgs(ADD_PREPARE)),
    {status: 503, value: {error: 'outcome_unknown'}});
  assert.equal(h.rpcCalls().length, 1); assert.deepEqual(h.imageCalls, []);
});
