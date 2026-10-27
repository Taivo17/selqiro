// Mocked service boundaries; no hosted project, image processor or database I/O.
// Run with node --conditions=react-server --test --test-isolation=none.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename);
};
const { hostedPreviewConfig } = require('../src/server/listing-publication/journey/hostedPreviewConfig.ts');
const { assertHostedPreviewReadContract } = require('../src/server/listing-publication/journey/hostedPreviewReadiness.ts');
const { assertPublicationEnvironment } = require('../src/server/listing-publication/journey/integrationRuntime.ts');
const { GET } = require('../app/api/v2/listing-media/[attemptId]/[ordinal]/route.ts');
const REF = 'vyjletlmwoiwxsnsunlm';
const API = `https://${REF}.supabase.co`;
const APP = 'https://selqiro.vercel.app';
const INSTANCE = '76000000-0000-0000-0000-000000000006';
const ATTEMPT = '77000000-0000-0000-0000-000000000007';
const SLOT = '78000000-0000-0000-0000-000000000008';
const READINESS = '/rest/v1/rpc/get_selqiro_hosted_preview_readiness_v1';
const BINDING = '/rest/v1/rpc/get_public_listing_media_binding_v1';
const bytes = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64');
const marker = (patch = {}) => ({ schema_version: 1, scope: 'hosted-preview-v1',
  storage_contract: 'supabase-s3-session-v1', cleanup_mode: 'held', project_ref: REF,
  release_id: 'listing-publication-hosted-preview-v1', instance_id: INSTANCE,
  enabled: false, actor_user_id: null, actor_allowed: false, ...patch });
const binding = { schema_version: 1, attempt_id: ATTEMPT, ordinal: 0,
  bucket_id: 'listing-publication-private', object_path: `v1/${ATTEMPT}/${SLOT}/web-v1.webp`,
  sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };

test('hosted portal: paused writes preserve only currently bound and verified public images', async () => {
  const jwt = role => [JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    JSON.stringify({ ref: REF, role, exp: Math.floor(Date.now() / 1000) + 3600 }), 'synthetic-signature']
    .map(part => Buffer.from(part).toString('base64url')).join('.');
  const env = { NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'production',
    VERCEL_URL: 'selqiro-synthetic-deployment.vercel.app', SELQIRO_V2_APP_ORIGIN: APP,
    SELQIRO_V2_HOSTED_PORTAL: 'v1', NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL: 'v1',
    SELQIRO_V2_HOSTED_PREVIEW: undefined, NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW: undefined,
    SELQIRO_V2_LOCAL_INTEGRATION: undefined, NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION: undefined,
    SELQIRO_V2_HOSTED_PROJECT_REF: REF, SELQIRO_V2_HOSTED_INSTANCE_ID: INSTANCE,
    SELQIRO_V2_HOSTED_REGION: 'eu-central-1', NEXT_PUBLIC_SUPABASE_URL: API,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('anon'), SUPABASE_SERVICE_ROLE_KEY: jwt('service_role'),
    SELQIRO_V2_S3_ACCESS_KEY_ID: 'synthetic-server-access', SELQIRO_V2_S3_SECRET_ACCESS_KEY: 'synthetic-server-secret' };
  const c = hostedPreviewConfig(env);
  assert.ok(c);
  assert.equal(c.deploymentTarget, 'portal');
  await assertHostedPreviewReadContract(c, undefined, async () => Response.json(marker()));
  await assert.rejects(assertPublicationEnvironment(c, undefined, async () => Response.json(marker())), /integration_unverified/);
  for (const patch of [{ project_ref: 'abcdefghijklmnopqrst' }, { instance_id: SLOT },
    { release_id: 'different-release' }, { storage_contract: 'different-contract' },
    { enabled: null }, { actor_user_id: SLOT }, { actor_allowed: true }, { unexpected: true }]) {
    await assert.rejects(assertHostedPreviewReadContract(c, undefined,
      async () => Response.json(marker(patch))), /integration_unverified/);
  }

  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  try {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    for (const mode of ['valid', 'changed-bytes', 'revoked-after-read']) {
      const calls = [];
      let bindingReads = 0;
      globalThis.fetch = async (url, init) => {
        assert.equal(init.headers.get('authorization'), 'Bearer ' + c.serviceKey);
        assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
        if (url === API + READINESS) {
          calls.push('contract');
          assert.equal(JSON.parse(init.body).p_expected_user_id, null);
          return Response.json(marker());
        }
        if (url === API + BINDING) {
          calls.push('binding'); bindingReads++;
          return Response.json(mode === 'revoked-after-read' && bindingReads === 2 ? null : binding);
        }
        assert.equal(url, API + '/storage/v1/object/authenticated/' + binding.bucket_id + '/' + binding.object_path);
        calls.push('object');
        const body = Buffer.from(bytes);
        if (mode === 'changed-bytes') body[body.length - 1] ^= 1;
        return new Response(body, { headers: { 'content-type': 'image/webp', 'content-length': String(body.length) } });
      };
      const reply = await GET(new Request(`${APP}/api/v2/listing-media/${ATTEMPT}/0`, {
        headers: { host: new URL(APP).host },
      }), { params: Promise.resolve({ attemptId: ATTEMPT, ordinal: '0' }) });
      assert.equal(reply.status, mode === 'valid' ? 200 : mode === 'changed-bytes' ? 503 : 404, mode);
      const output = Buffer.from(await reply.arrayBuffer());
      if (mode === 'valid') assert.deepEqual(output, bytes);
      else assert.equal(output.length, 0, 'unverified or revoked images must not expose bytes');
      assert.deepEqual(calls, mode === 'changed-bytes'
        ? ['contract', 'binding', 'object'] : ['contract', 'binding', 'object', 'binding']);
    }
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
