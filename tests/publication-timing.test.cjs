'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), {fileName: filename, compilerOptions: {
    target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  }}).outputText, filename);
const {createPublicationTiming, timePublicationStage} = require('../src/server/listing-publication/journey/publicationTiming.ts');
const {hostedPreviewConfig} = require('../src/server/listing-publication/journey/hostedPreviewConfig.ts');
const {createJourneyRequestHandler} = require('../src/server/listing-publication/journey/createJourneyHandler.ts');

test('timing header uses fixed names, bounded durations and no request data', () => {
  let clock = 10;
  const timing = createPublicationTiming(() => clock);
  timing.record('source_read', 12.25); timing.record('source_read', 7.75);
  timing.record('sanitize', 5); timing.record('web_write', 1e30);
  for (const stage of ['https://private.invalid/secret', 'filename.jpg', 'user-token', 'total']) timing.record(stage, 999);
  for (const value of [-1, NaN, Infinity, 'private-string']) timing.record('gate', value);
  clock = 100;
  assert.equal(timing.header(), 'source_read;dur=20.0, sanitize;dur=5.0, web_write;dur=600000.0, total;dur=90.0');
  for (const stage of ['gate', 'image_auth', 'source_session', 'source_finalize', 'source_read', 'sanitize',
    'web_session', 'web_write', 'web_finalize', 'web_read', 'owner_rpc']) timing.record(stage, 1e30);
  clock = 1e30;
  assert.ok(timing.header().length < 512);
  assert.equal(timing.header().split(', ').length, 12);
  assert.match(timing.header(), /^(?:[a-z_]+;dur=600000\.0)(?:, [a-z_]+;dur=600000\.0){11}$/);
});

test('optional timings do not run clocks without a sink or change the returned object', async () => {
  const value = Object.freeze({ready: true}); let calls = 0;
  const result = await timePublicationStage(undefined, 'sanitize', async () => {calls++; return value;}, () => {throw Error('must not run');});
  assert.equal(result, value); assert.equal(calls, 1);
});

test('throwing clocks and sinks cannot replace successful or failed operations', async () => {
  const value = Object.freeze({ready: true}), failure = Error('actual operation failure');
  for (const clock of [() => {throw Error('clock failure');}, () => NaN, (() => {let n = 0; return () => ++n;})()]) {
    let calls = 0;
    const sink = () => {throw Error('observer failure');};
    assert.equal(await timePublicationStage(sink, 'sanitize', async () => {calls++; return value;}, clock), value);
    await assert.rejects(timePublicationStage(sink, 'sanitize', async () => {calls++; throw failure;}, clock), error => error === failure);
    assert.equal(calls, 2);
  }
  const failed = createPublicationTiming(() => {throw Error('clock failure');});
  failed.record('sanitize', 1);
  assert.equal(failed.header(), 'sanitize;dur=1.0');
});

const REF = 'abcdefghijklmnopqrst', API = `https://${REF}.supabase.co`;
const APP = 'https://selqiro-timing-synthetic.vercel.app';
const USER = '71000000-0000-0000-0000-000000000001';
const IDENTITY = '72000000-0000-0000-0000-000000000002';
const ATTEMPT = '73000000-0000-0000-0000-000000000003';
const INSTANCE = '76000000-0000-0000-0000-000000000006';
const TOKEN = 'synthetic.private.token';
function harness({authFailure = false, rpcFailure = false} = {}) {
  const now = Date.now(), exp = Math.floor(now / 1000) + 3600;
  const jwt = role => [{alg: 'HS256', typ: 'JWT'}, {ref: REF, role, exp}, 'synthetic-signature']
    .map(value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url')).join('.');
  const config = hostedPreviewConfig({NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'preview',
    VERCEL_URL: new URL(APP).host, SELQIRO_V2_HOSTED_PREVIEW: 'v1', NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW: 'v1',
    SELQIRO_V2_HOSTED_PROJECT_REF: REF, SELQIRO_V2_HOSTED_REGION: 'eu-central-1',
    SELQIRO_V2_HOSTED_INSTANCE_ID: INSTANCE, NEXT_PUBLIC_SUPABASE_URL: API,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('anon'), SUPABASE_SERVICE_ROLE_KEY: jwt('service_role'),
    SELQIRO_V2_S3_ACCESS_KEY_ID: 'synthetic-access', SELQIRO_V2_S3_SECRET_ACCESS_KEY: 'synthetic-secret'}, now);
  assert.ok(config);
  const paths = [], output = {receipt: 'synthetic-owner-payload-preserved'};
  const fetcher = async (url, init) => {
    assert.equal(new URL(url).origin, API);
    const path = new URL(url).pathname; paths.push(path);
    if (path === '/auth/v1/user') return Response.json({id: authFailure ? IDENTITY : USER});
    if (path.endsWith('/get_selqiro_hosted_preview_readiness_v1')) return Response.json({schema_version: 1,
      scope: 'hosted-preview-v1', storage_contract: 'supabase-s3-session-v1', cleanup_mode: 'held',
      project_ref: REF, release_id: 'listing-publication-hosted-preview-v1', instance_id: INSTANCE,
      enabled: true, actor_user_id: USER, actor_allowed: true});
    assert.equal(path, '/rest/v1/rpc/get_my_managed_listing_images_v1');
    assert.equal(init.headers.get('authorization'), 'Bearer ' + TOKEN);
    return rpcFailure ? Response.json({code: '42501', message: 'private SQL error'}, {status: 403}) : Response.json(output);
  };
  const images = {prepare: async (_token, input, _signal, sink) => {
    await timePublicationStage(sink, 'sanitize', async () => undefined);
    return {kind: 'pending', attemptId: input.attemptId, slotId: input.slotId};
  }, verify: async () => {throw Error('unexpected verify');}, settle: async () => {throw Error('unexpected cleanup');}};
  const handler = createJourneyRequestHandler(config, images, fetcher);
  const request = (action = 'owner-images-read') => new Request(APP + '/api/v2/publication/' + action, {
    method: 'POST', headers: {host: new URL(APP).host, origin: APP, authorization: 'Bearer ' + TOKEN,
      'content-type': 'application/json'}, body: JSON.stringify(action === 'image-prepare'
      ? {expectedUserId: USER, expectedIdentityId: IDENTITY, attemptId: ATTEMPT, slotId: INSTANCE, requestKey: INSTANCE}
      : {p_expected_user_id: USER, p_expected_identity_id: IDENTITY, p_listing_id: '201', p_attempt_id: ATTEMPT}),
  });
  return {paths, output, invoke: action => handler(request(action), action ?? 'owner-images-read')};
}

function checkHeader(response, names) {
  const header = response.headers.get('server-timing');
  assert.ok(header && header.length < 512);
  assert.deepEqual(header.split(', ').map(metric => metric.split(';')[0]), names);
  assert.match(header, /^[a-z_]+;dur=\d+\.\d(?:, [a-z_]+;dur=\d+\.\d)*$/);
  for (const secret of [USER, IDENTITY, ATTEMPT, INSTANCE, TOKEN, API, 'private SQL error']) assert.ok(!header.includes(secret));
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
}

test('photo owner response keeps payload and gated RPC order while returning safe timings', async () => {
  const h = harness(), response = await h.invoke();
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), h.output);
  checkHeader(response, ['gate', 'owner_rpc', 'total']);
  assert.deepEqual(h.paths, ['/auth/v1/user', '/rest/v1/rpc/get_selqiro_hosted_preview_readiness_v1',
    '/rest/v1/rpc/get_my_managed_listing_images_v1']);
});

test('image response carries the optional sink without modifying its payload', async () => {
  const h = harness(), response = await h.invoke('image-prepare');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {kind: 'pending', attemptId: ATTEMPT, slotId: INSTANCE});
  checkHeader(response, ['gate', 'sanitize', 'total']);
  assert.equal(h.paths.length, 2);
});

test('authorization and owner failures retain their existing statuses and safe error payloads', async () => {
  const denied = harness({authFailure: true}), response = await denied.invoke();
  assert.equal(response.status, 403); assert.deepEqual(await response.json(), {error: 'context_changed'});
  assert.deepEqual(denied.paths, ['/auth/v1/user']); checkHeader(response, ['gate', 'total']);
  const failed = harness({rpcFailure: true}), rpcResponse = await failed.invoke();
  assert.equal(rpcResponse.status, 403);
  assert.deepEqual(await rpcResponse.json(), {error: 'owner_contract', code: '42501', message: 'listing_activity_identity_required'});
  checkHeader(rpcResponse, ['gate', 'owner_rpc', 'total']);
});
