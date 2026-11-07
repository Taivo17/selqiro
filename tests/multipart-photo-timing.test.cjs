'use strict';
// Actual multipart state flow with synthetic RPC/Storage boundaries. No live I/O.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), {fileName: filename, compilerOptions: {
    target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  }}).outputText, filename);
const transports = require('../src/server/listing-publication/multipart/s3Transport.ts');
const {createMultipartPublicationImages} = require('../src/server/listing-publication/multipart/multipartPublicationImages.ts');
const {createPublicationTiming} = require('../src/server/listing-publication/journey/publicationTiming.ts');
const {webHash} = require('../src/server/listing-publication/web/webImageContract.ts');
const id = n => `71000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const command = {expectedUserId: id(1), expectedIdentityId: id(2), attemptId: id(3), slotId: id(4), requestKey: id(5)};
const ORIGIN = 'http://127.0.0.1:63111', TOKEN = 'synthetic-private-access-token';
const config = {projectOrigin: ORIGIN, publicKey: 'synthetic-public-key', serviceKey: 'synthetic-service-key',
  s3Endpoint: ORIGIN + '/storage/v1/s3', s3Region: 'local', s3TenantId: 'local-tenant',
  s3AccessKeyId: 'synthetic-access', s3SecretAccessKey: 'synthetic-secret', integrationScope: 'disposable-v2'};

function harness({partMissing = false, sanitizerFailure = false, actorMismatch = false} = {}) {
  const sourceBytes = Buffer.from('synthetic-private-image-bytes-not-a-real-photo');
  // Only native output validation is exercised here; native decoding has its own suite.
  const webBytes = Buffer.alloc(24); webBytes.write('RIFF'); webBytes.writeUInt32LE(16, 4); webBytes.write('WEBP', 8);
  const basePath = `v1/${command.attemptId}/${command.slotId}/`;
  const sessions = Object.fromEntries(['source', 'web'].map((kind, index) => [kind, {
    schema_version: 2, session_id: id(10 + index), object_id: id(20 + index), kind,
    attempt_id: command.attemptId, slot_id: command.slotId, request_key: command.requestKey,
    bucket_id: 'listing-publication-private', object_path: basePath + (kind === 'source' ? 'source.upload' : 'web-v1.webp'),
    expected_bytes: kind === 'source' ? sourceBytes.length : webBytes.length,
    expected_sha256: webHash(kind === 'source' ? sourceBytes : webBytes), state: 'open', upload_id: 'synthetic-upload-' + kind,
    storage_version: id(30 + index), part_key: id(40 + index), part_sign_epoch: Math.floor(Date.now() / 1000),
    complete_key: null, part_etag: null, storage_object_id: null, completed: false, verified: false, problem: null,
  }]));
  const binding = {schema_version: 1, actor_user_id: command.expectedUserId, identity_id: command.expectedIdentityId,
    attempt_id: command.attemptId, slot_id: command.slotId, job_id: id(50), request_key: command.requestKey,
    source_object_id: sessions.source.object_id, web_object_id: sessions.web.object_id,
    bucket_id: 'listing-publication-private', source_path: sessions.source.object_path, web_path: sessions.web.object_path,
    source_bytes: sourceBytes.length, source_sha256: webHash(sourceBytes)};
  const receipt = {schema_version: 1, receipt_id: id(60), job_id: binding.job_id, attempt_id: command.attemptId,
    slot_id: command.slotId, web_sha256: webHash(webBytes), web_bytes: webBytes.length, width: 2, height: 2,
    pipeline_version: 'listing-web-v1'};
  const calls = [];
  const s3 = {
    create: async () => {throw Error('Unexpected new multipart session');},
    listOnePart: async session => {calls.push('storage:list:' + session.kind); return partMissing ? null : 'synthetic-etag';},
    complete: async session => {calls.push('storage:complete:' + session.kind); return 'synthetic-etag';},
    putWebPart: async (session, bytes) => {calls.push('storage:write:web'); assert.equal(session.kind, 'web'); assert.deepEqual(bytes, webBytes);},
    presignSourcePart: async session => {calls.push('storage:sign:source'); return {url: ORIGIN + '/synthetic-signed-source',
      headers: {'content-type': 'application/octet-stream'}, expiresAt: 9999999999999,
      expectedBytes: session.expected_bytes, sha256: session.expected_sha256};},
    abort: async () => {throw Error('Unexpected cleanup');},
  };
  const fetcher = async (url, init) => {
    assert.equal(new URL(url).origin, ORIGIN);
    const pathname = new URL(url).pathname;
    if (pathname === '/auth/v1/user') {
      calls.push('auth'); assert.equal(init.headers.get('authorization'), 'Bearer ' + TOKEN);
      return Response.json({id: actorMismatch ? id(99) : command.expectedUserId});
    }
    assert.equal(init.headers.get('authorization'), 'Bearer ' + config.serviceKey);
    if (pathname.startsWith('/storage/v1/object/authenticated/')) {
      const kind = pathname.endsWith('/source.upload') ? 'source' : 'web'; calls.push('storage:read:' + kind);
      const bytes = kind === 'source' ? sourceBytes : webBytes;
      return new Response(bytes, {headers: {'content-length': String(bytes.length),
        'content-type': kind === 'source' ? 'application/octet-stream' : 'image/webp'}});
    }
    const name = pathname.split('/').at(-1), body = JSON.parse(init.body);
    calls.push('rpc:' + name + (body.p_kind ? ':' + body.p_kind : ''));
    const kind = body.p_kind;
    if (name === 'get_listing_multipart_v2') return Response.json(sessions[kind]);
    if (name === 'reserve_listing_multipart_v2') return Response.json({session: sessions[kind], create_allowed: false, create_key: null});
    if (name === 'claim_listing_multipart_part_v2') return Response.json({session: sessions[kind], part_allowed: true});
    if (name === 'claim_listing_multipart_complete_v2') {
      sessions[kind] = {...sessions[kind], state: 'completing', complete_key: id(kind === 'source' ? 70 : 71), part_etag: body.p_part_etag};
      return Response.json({session: sessions[kind], complete_allowed: true});
    }
    if (name === 'record_listing_multipart_completed_v2') {
      const k = body.p_object_id === sessions.source.object_id ? 'source' : 'web';
      assert.equal(body.p_complete_key, sessions[k].complete_key);
      sessions[k] = {...sessions[k], state: 'completed', completed: true, storage_object_id: id(k === 'source' ? 80 : 81)};
      return Response.json(sessions[k]);
    }
    if (name === 'record_listing_multipart_verified_v2') {
      assert.equal(body.p_observed_sha256, sessions[kind].expected_sha256);
      assert.equal(body.p_observed_bytes, sessions[kind].expected_bytes);
      sessions[kind] = {...sessions[kind], verified: true}; return Response.json(sessions[kind]);
    }
    if (name === 'claim_listing_web_image_v1') return Response.json({binding, state: 'processing', process_allowed: true,
      claim_id: id(90), process_before_epoch: Math.floor(Date.now() / 1000) + 120, intent: null, receipt: null});
    if (name === 'prepare_listing_web_write_v1') return Response.json({binding, intent: body.p_intent,
      write_allowed: true, write_before_epoch: Math.floor(Date.now() / 1000) + 30});
    if (name === 'record_listing_web_ready_v1') return Response.json({receipt});
    if (name === 'record_listing_multipart_problem_v2') {
      const k = body.p_object_id === sessions.source.object_id ? 'source' : 'web';
      sessions[k] = {...sessions[k], problem: body.p_problem}; return Response.json(sessions[k]);
    }
    throw Error('Unexpected synthetic RPC ' + name);
  };
  const sanitizer = async bytes => {
    calls.push('sanitize'); assert.deepEqual(bytes, sourceBytes);
    if (sanitizerFailure) throw Object.assign(Error('private native details'), {name: 'PublicationImageError', code: 'image_decode_failed'});
    return {buffer: webBytes, contentType: 'image/webp', byteLength: webBytes.length, width: 2, height: 2,
      sha256: webHash(webBytes), sourceSha256: webHash(sourceBytes), sourceByteLength: sourceBytes.length,
      sourceFormat: 'jpeg', pipelineVersion: 'listing-web-v1', engine: {sharp: '0.34.5', libvips: '8.17.3'}};
  };
  const original = transports.createMultipartS3Transport; let flow;
  try {transports.createMultipartS3Transport = () => s3; flow = createMultipartPublicationImages(config, sanitizer, fetcher);}
  finally {transports.createMultipartS3Transport = original;}
  return {flow, calls, receipt};
}

test('multipart timing preserves every state call, byte readback and successful receipt', async () => {
  const baseline = harness(), plain = await baseline.flow.verify(TOKEN, command);
  assert.deepEqual(plain, {kind: 'ready', receipt: baseline.receipt});
  const instrumented = harness(), timing = createPublicationTiming();
  assert.deepEqual(await instrumented.flow.verify(TOKEN, command, undefined, timing.record), plain);
  assert.deepEqual(instrumented.calls, baseline.calls);
  assert.deepEqual(timing.header().split(', ').map(metric => metric.split(';')[0]),
    ['image_auth', 'source_session', 'source_finalize', 'source_read', 'sanitize', 'web_session', 'web_write', 'web_finalize', 'web_read', 'total']);
  assert.equal(instrumented.calls.filter(call => call === 'sanitize').length, 1);
  assert.equal(instrumented.calls.filter(call => call.startsWith('storage:read:')).length, 2);
  for (const value of [...Object.values(command), TOKEN, ORIGIN, 'synthetic-private-image-bytes-not-a-real-photo']) assert.ok(!timing.header().includes(value));
});

test('throwing timing observer cannot turn a completed image into a retry or repeat a write', async () => {
  const baseline = harness(), plain = await baseline.flow.verify(TOKEN, command);
  const observed = harness(); let spans = 0;
  assert.deepEqual(await observed.flow.verify(TOKEN, command, undefined, () => {spans++; throw Error('observer failure');}), plain);
  assert.ok(spans > 8); assert.deepEqual(observed.calls, baseline.calls);
  assert.equal(observed.calls.filter(call => call === 'storage:write:web').length, 1);
});

test('prepare still returns one SOURCE grant without sanitizer work and keeps its timing bounded', async () => {
  const h = harness({partMissing: true}), timing = createPublicationTiming();
  const value = await h.flow.prepare(TOKEN, command, undefined, timing.record);
  assert.equal(value.kind, 'part'); assert.equal(value.attemptId, command.attemptId);
  assert.equal(h.calls.includes('sanitize'), false);
  assert.deepEqual(timing.header().split(', ').map(metric => metric.split(';')[0]), ['image_auth', 'source_session', 'total']);
});

test('auth mismatch and image rejection keep their existing meanings with a failing observer', async () => {
  const denied = harness({actorMismatch: true});
  await assert.rejects(denied.flow.verify(TOKEN, command, undefined, () => {throw Error('observer failure');}), error => error.code === 'context_changed');
  assert.deepEqual(denied.calls, ['auth']);
  const rejected = harness({sanitizerFailure: true});
  assert.deepEqual(await rejected.flow.verify(TOKEN, command, undefined, () => {throw Error('observer failure');}),
    {kind: 'needs_attention', attemptId: command.attemptId, slotId: command.slotId, reason: 'image_rejected'});
  assert.equal(rejected.calls.includes('storage:write:web'), false);
});
