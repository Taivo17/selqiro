// New managed transport/held-cleanup boundaries only. No provider is contacted.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  }, fileName: filename }).outputText, filename);
};
const { hostedPreviewConfig } = require('../src/server/listing-publication/journey/hostedPreviewConfig.ts');
const { createHostedMultipartS3Transport, createMultipartS3Transport } = require('../src/server/listing-publication/multipart/s3Transport.ts');
const { createHostedMultipartPublicationImages } = require('../src/server/listing-publication/multipart/multipartPublicationImages.ts');
const REF = 'abcdefghijklmnopqrst';
const API = `https://${REF}.supabase.co`;
const STORAGE = `https://${REF}.storage.supabase.co`;
const USER = '71000000-0000-0000-0000-000000000001';
const IDENTITY = '72000000-0000-0000-0000-000000000002';
const ATTEMPT = '73000000-0000-0000-0000-000000000003';
const SLOT = '74000000-0000-0000-0000-000000000004';
const REQUEST = '75000000-0000-0000-0000-000000000005';
const jwt = claims => [JSON.stringify({alg: 'HS256', typ: 'JWT'}), JSON.stringify(claims), 'synthetic-signature']
  .map(value => Buffer.from(value).toString('base64url')).join('.');
function configured() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const env = {NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'preview',
    VERCEL_URL: 'selqiro-synthetic-preview.vercel.app',
    SELQIRO_V2_HOSTED_PREVIEW: 'v1', NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW: 'v1',
    SELQIRO_V2_HOSTED_PROJECT_REF: REF, SELQIRO_V2_HOSTED_REGION: 'eu-central-1',
    SELQIRO_V2_HOSTED_INSTANCE_ID: '76000000-0000-0000-0000-000000000006',
    NEXT_PUBLIC_SUPABASE_URL: API,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt({role: 'anon', ref: REF, exp}),
    SUPABASE_SERVICE_ROLE_KEY: jwt({role: 'service_role', ref: REF, exp}),
    SELQIRO_V2_S3_ACCESS_KEY_ID: 'synthetic-server-access-id',
    SELQIRO_V2_S3_SECRET_ACCESS_KEY: 'synthetic-server-secret'};
  const config = hostedPreviewConfig(env);
  assert.ok(config);
  return {config, token: jwt({role: 'authenticated', sub: USER, iss: `${API}/auth/v1`, exp})};
}
function sourceSession() {
  return {schema_version: 2, session_id: '77000000-0000-0000-0000-000000000007',
    object_id: '78000000-0000-0000-0000-000000000008', kind: 'source',
    attempt_id: ATTEMPT, slot_id: SLOT, request_key: REQUEST,
    bucket_id: 'listing-publication-private', object_path: `v1/${ATTEMPT}/${SLOT}/source.upload`,
    expected_bytes: 123, expected_sha256: 'a'.repeat(64), state: 'open',
    upload_id: 'provider-id+/= café&question?',
    storage_version: '79000000-0000-0000-0000-000000000009',
    part_key: '81000000-0000-0000-0000-000000000001', part_sign_epoch: Math.floor(Date.now() / 1000),
    complete_key: null, part_etag: null, storage_object_id: null,
    completed: false, verified: false, problem: null};
}

test('hosted multipart: real SDK presigning binds opaque IDs to the same project and user credentials', async () => {
  const {config, token} = configured(), session = sourceSession();
  const transport = createHostedMultipartS3Transport(config);
  const grant = await transport.presignSourcePart(session, token);
  const url = new URL(grant.url);
  assert.equal(url.origin, STORAGE);
  assert.equal(url.pathname, `/storage/v1/s3/${session.bucket_id}/${session.object_path}`);
  assert.equal(url.searchParams.get('uploadId'), session.upload_id);
  assert.ok(url.search.slice(1).split('&').includes('uploadId=' + encodeURIComponent(session.upload_id)));
  assert.deepEqual(url.searchParams.getAll('partNumber'), ['1']);
  assert.equal(url.searchParams.get('X-Amz-Security-Token'), token);
  assert.ok(url.searchParams.get('X-Amz-Credential').startsWith(REF + '/'));
  assert.ok(url.searchParams.get('X-Amz-SignedHeaders').split(';').includes('content-length'));
  assert.match(url.searchParams.get('X-Amz-Signature'), /^[0-9a-f]{64}$/);
  assert.equal(grant.expiresAt, (session.part_sign_epoch + 600) * 1000);
  assert.ok(!grant.url.includes(config.s3AccessKeyId));
  assert.ok(!grant.url.includes(config.s3SecretAccessKey));
  assert.deepEqual(grant.headers, {'content-type': 'application/octet-stream'});
  assert.throws(() => createHostedMultipartS3Transport({...config}), error => error.code === 'configuration');
  const foreign = jwt({role: 'authenticated', sub: USER, iss: 'https://other.supabase.co/auth/v1',
    exp: Math.floor(Date.now() / 1000) + 3600});
  await assert.rejects(transport.presignSourcePart(session, foreign), error => error.code === 'unauthorized');
});

test('hosted multipart: local signing and its strict disposable-only destination gate remain separate', async () => {
  const {config: hosted} = configured();
  const local = {projectOrigin: 'http://127.0.0.1:63111', publicKey: 'local-public', serviceKey: 'local-service',
    s3Endpoint: 'http://127.0.0.1:63111/storage/v1/s3', s3Region: 'local',
    s3TenantId: 'local-tenant', s3AccessKeyId: 'local-server-id', s3SecretAccessKey: 'local-server-secret',
    integrationScope: 'disposable-v2'};
  const grant = await createMultipartS3Transport(local).presignSourcePart(sourceSession(), 'existing-local-user-token');
  const url = new URL(grant.url);
  assert.equal(url.origin, local.projectOrigin);
  assert.ok(url.searchParams.get('X-Amz-Credential').startsWith(local.s3TenantId + '/'));
  assert.equal(url.searchParams.get('X-Amz-Security-Token'), 'existing-local-user-token');
  assert.throws(() => createMultipartS3Transport(hosted), error => error.code === 'configuration');
  assert.throws(() => createMultipartS3Transport({...local, projectOrigin: API, s3Endpoint: `${STORAGE}/storage/v1/s3`}),
    error => error.code === 'configuration');
});

test('hosted multipart: cleanup authenticates and reads retained state without external writes or terminal claims', async () => {
  const {config, token} = configured();
  const command = {expectedUserId: USER, expectedIdentityId: IDENTITY, attemptId: ATTEMPT, requestKey: REQUEST};
  for (const reserved of [0, 29 * 1024 * 1024]) {
    const calls = [];
    const fetcher = async (url, init) => {
      calls.push({url, method: init.method});
      const headers = new Headers(init.headers);
      assert.equal(headers.get('apikey'), config.publicKey);
      assert.equal(headers.get('authorization'), 'Bearer ' + token);
      if (url === `${API}/auth/v1/user`) return Response.json({id: USER});
      assert.equal(url, `${API}/rest/v1/rpc/get_my_listing_cleanup_summary_v1`);
      assert.deepEqual(JSON.parse(init.body), {p_expected_user_id: USER, p_expected_identity_id: IDENTITY});
      return Response.json({schema_version: 1, pending: reserved ? 2 : 0, blocked: 0,
        needs_attention: 0, oldest_pending_seconds: 0, reserved_bytes: reserved});
    };
    const images = createHostedMultipartPublicationImages(config, async () => { throw Error('sanitizer must not run during held cleanup'); }, fetcher);
    assert.deepEqual(await images.settle(token, command), {kind: 'pending', attemptId: ATTEMPT, filesRemaining: null});
    assert.equal(calls.length, 2);
    assert.deepEqual(calls.map(call => call.method), ['GET', 'POST']);
  }
  let calls = 0;
  const refused = createHostedMultipartPublicationImages(config, async () => { throw Error('no sanitizer'); }, async () => {
    calls += 1; return Response.json({id: '82000000-0000-0000-0000-000000000002'});
  });
  await assert.rejects(refused.settle(token, command), error => error.code === 'context_changed');
  assert.equal(calls, 1);
});
