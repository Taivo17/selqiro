// Run with node --conditions=react-server --test. Synthetic JWTs below exercise
// configuration consistency only; they do not establish signatures or real auth.
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
const { hostedPreviewConfig, isHostedPreviewConfig } = require('../src/server/listing-publication/journey/hostedPreviewConfig.ts');
const { hostedSourceS3Credentials, hostedServerS3Credentials } = require('../src/server/listing-publication/multipart/hostedS3Credentials.ts');
const REF = 'abcdefghijklmnopqrst';
const OTHER = 'zyxwvutsrqponmlkjihg';
const API = `https://${REF}.supabase.co`;
const APP = 'https://selqiro-preview-example.vercel.app';
const NOW = Date.parse('2026-10-26T19:00:00Z');
const EXP = NOW / 1000 + 3600;
const USER = '71000000-0000-0000-0000-000000000001';
const INSTANCE = '76000000-0000-0000-0000-000000000006';
function jwt(claims, alg = 'HS256') {
  return [JSON.stringify({ alg, typ: 'JWT' }), JSON.stringify(claims), 'synthetic-unverified-signature']
    .map(part => Buffer.from(part).toString('base64url')).join('.');
}
function environment() {
  return {
    NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'preview',
    VERCEL_URL: 'selqiro-preview-example.vercel.app', SELQIRO_V2_APP_ORIGIN: APP,
    SELQIRO_V2_HOSTED_PREVIEW: 'v1', NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW: 'v1',
    SELQIRO_V2_HOSTED_PROJECT_REF: REF, SELQIRO_V2_HOSTED_INSTANCE_ID: INSTANCE,
    SELQIRO_V2_HOSTED_REGION: 'eu-central-1',
    NEXT_PUBLIC_SUPABASE_URL: API,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt({ iss: 'supabase', ref: REF, role: 'anon', exp: EXP }),
    SUPABASE_SERVICE_ROLE_KEY: jwt({ iss: 'supabase', ref: REF, role: 'service_role', exp: EXP }),
    SELQIRO_V2_S3_ACCESS_KEY_ID: 'synthetic-server-access',
    SELQIRO_V2_S3_SECRET_ACCESS_KEY: 'synthetic-server-secret',
  };
}
const userToken = (patch = {}, alg = 'ES256') => jwt({
  iss: `${API}/auth/v1`, sub: USER, role: 'authenticated', exp: EXP, ...patch,
}, alg);

test('hosted configuration: explicit preview derives one exact project and separate server credentials', () => {
  const env = environment();
  delete env.SELQIRO_V2_APP_ORIGIN;
  const config = hostedPreviewConfig(env, NOW);
  assert.ok(config);
  assert.equal(isHostedPreviewConfig(config), true);
  assert.equal(Object.isFrozen(config), true);
  assert.equal(config.integrationScope, 'hosted-preview-v1');
  assert.equal(config.appOrigin, APP);
  assert.equal(config.projectOrigin, API);
  assert.equal(config.projectRef, REF);
  assert.equal(config.instanceId, INSTANCE);
  assert.equal(config.storageOrigin, `https://${REF}.storage.supabase.co`);
  assert.equal(config.s3Endpoint, `https://${REF}.storage.supabase.co/storage/v1/s3`);
  assert.equal(config.s3Region, 'eu-central-1');
  assert.deepEqual(hostedServerS3Credentials(config), {
    accessKeyId: env.SELQIRO_V2_S3_ACCESS_KEY_ID, secretAccessKey: env.SELQIRO_V2_S3_SECRET_ACCESS_KEY,
  });
  const publicOnly = environment();
  publicOnly.NEXT_PUBLIC_SELQIRO_V2_S3_SECRET_ACCESS_KEY = publicOnly.SELQIRO_V2_S3_SECRET_ACCESS_KEY;
  delete publicOnly.SELQIRO_V2_S3_SECRET_ACCESS_KEY;
  assert.equal(hostedPreviewConfig(publicOnly, NOW), null);
});

test('hosted configuration: production deployments and mixed local or incomplete modes stay closed', () => {
  for (const patch of [
    { VERCEL_ENV: 'production' }, { VERCEL_ENV: 'development' }, { NODE_ENV: 'development' },
    { VERCEL: undefined }, { SELQIRO_V2_HOSTED_PREVIEW: undefined },
    { NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW: undefined },
    { SELQIRO_V2_LOCAL_INTEGRATION: 'v1' }, { NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION: 'v1' },
  ]) assert.equal(hostedPreviewConfig({ ...environment(), ...patch }, NOW), null);
});

test('hosted configuration: mismatched targets, key roles and legacy-key replacements are rejected', () => {
  for (const patch of [
    { SELQIRO_V2_HOSTED_PROJECT_REF: OTHER },
    { NEXT_PUBLIC_SUPABASE_URL: `https://${OTHER}.supabase.co` },
    { NEXT_PUBLIC_SUPABASE_URL: API + '/' },
    { SELQIRO_V2_APP_ORIGIN: 'https://different-preview.vercel.app' },
    { VERCEL_URL: 'example.invalid', SELQIRO_V2_APP_ORIGIN: 'https://example.invalid' },
    { SELQIRO_V2_HOSTED_REGION: undefined },
    { SELQIRO_V2_HOSTED_INSTANCE_ID: undefined },
    { SELQIRO_V2_HOSTED_INSTANCE_ID: 'not-an-installation-uuid' },
    { SELQIRO_V2_HOSTED_INSTANCE_ID: '00000000-0000-0000-0000-000000000000' },
    { NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_synthetic' },
    { NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt({ ref: REF, role: 'service_role', exp: EXP }) },
    { NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt({ ref: OTHER, role: 'anon', exp: EXP }) },
    { SUPABASE_SERVICE_ROLE_KEY: jwt({ ref: REF, role: 'anon', exp: EXP }) },
    { SUPABASE_SERVICE_ROLE_KEY: jwt({ ref: OTHER, role: 'service_role', exp: EXP }) },
    { SUPABASE_SERVICE_ROLE_KEY: jwt({ ref: REF, role: 'service_role', exp: NOW / 1000 }) },
  ]) assert.equal(hostedPreviewConfig({ ...environment(), ...patch }, NOW), null);
});

test('hosted configuration: SOURCE credentials preserve exact user authority and require immutable validated config', () => {
  const env = environment(), config = hostedPreviewConfig(env, NOW), accessToken = userToken();
  assert.ok(config);
  const credentials = hostedSourceS3Credentials(config, accessToken, NOW);
  assert.deepEqual(credentials, { accessKeyId: REF, secretAccessKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, sessionToken: accessToken });
  assert.equal(Object.isFrozen(credentials), true);
  assert.notEqual(credentials.secretAccessKey, env.SELQIRO_V2_S3_SECRET_ACCESS_KEY);
  assert.equal(Reflect.set(config, 'projectRef', OTHER), false);
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'changed-after-validation';
  assert.equal(hostedSourceS3Credentials(config, accessToken, NOW).secretAccessKey, credentials.secretAccessKey);
  for (const copied of [{ ...config }, Object.freeze({ ...config }), Object.create(config)]) {
    assert.equal(isHostedPreviewConfig(copied), false);
    assert.equal(hostedSourceS3Credentials(copied, accessToken, NOW), null);
    assert.equal(hostedServerS3Credentials(copied), null);
  }
});

test('hosted configuration: expired, privileged and wrong-project user sessions cannot produce SOURCE credentials', () => {
  const config = hostedPreviewConfig(environment(), NOW);
  assert.ok(config);
  for (const token of [
    userToken({ exp: NOW / 1000 }), userToken({ role: 'service_role' }),
    userToken({ iss: `https://${OTHER}.supabase.co/auth/v1` }),
    userToken({ sub: 'not-a-user-uuid' }), userToken({ nbf: NOW / 1000 + 60 }),
    userToken({}, 'none'), 'not-a-jwt',
  ]) assert.equal(hostedSourceS3Credentials(config, token, NOW), null);
});

function portalEnvironment() {
  const ref = 'vyjletlmwoiwxsnsunlm';
  return { ...environment(), VERCEL_ENV: 'production',
    SELQIRO_V2_HOSTED_PREVIEW: undefined, NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW: undefined,
    SELQIRO_V2_HOSTED_PORTAL: 'v1', NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL: 'v1',
    SELQIRO_V2_APP_ORIGIN: 'https://selqiro.vercel.app', SELQIRO_V2_HOSTED_PROJECT_REF: ref,
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt({ ref, role: 'anon', exp: EXP }),
    SUPABASE_SERVICE_ROLE_KEY: jwt({ ref, role: 'service_role', exp: EXP }) };
}

test('hosted portal: production requires its explicit pair and the approved stable portal target', () => {
  const env = portalEnvironment(), config = hostedPreviewConfig(env, NOW);
  assert.ok(config);
  assert.equal(config.deploymentTarget, 'portal');
  assert.equal(config.appOrigin, 'https://selqiro.vercel.app');
  assert.notEqual(config.appOrigin, `https://${env.VERCEL_URL}`);
  for (const patch of [
    { SELQIRO_V2_HOSTED_PORTAL: undefined }, { NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL: undefined },
    { VERCEL_ENV: 'preview' }, { SELQIRO_V2_HOSTED_PREVIEW: 'v1' },
    { NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW: '' }, { SELQIRO_V2_LOCAL_INTEGRATION: '' },
    { SELQIRO_V2_APP_ORIGIN: undefined }, { SELQIRO_V2_APP_ORIGIN: APP },
    { SELQIRO_V2_HOSTED_REGION: 'us-east-1' },
    { SELQIRO_V2_HOSTED_PROJECT_REF: REF, NEXT_PUBLIC_SUPABASE_URL: API,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: environment().NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: environment().SUPABASE_SERVICE_ROLE_KEY },
  ]) assert.equal(hostedPreviewConfig({ ...env, ...patch }, NOW), null);
  assert.equal(hostedPreviewConfig({ ...environment(), SELQIRO_V2_HOSTED_PORTAL: 'v1' }, NOW), null);
});

test('hosted portal: browser navigation cannot select publication RPCs without a same-portal capability', () => {
  const ui = require('../src/shared/config/v2Integration.ts');
  const env = portalEnvironment();
  const selected = { NODE_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW: undefined, NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL: 'v1',
    NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION: undefined };
  const saved = Object.fromEntries(Object.keys(selected).map(key => [key, process.env[key]]));
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const capability = { schemaVersion: 1, mode: 'hosted-preview-v1',
    releaseId: 'listing-publication-hosted-preview-v1', instanceId: INSTANCE,
    appOrigin: 'https://selqiro.vercel.app', projectOrigin: env.NEXT_PUBLIC_SUPABASE_URL,
    storageOrigin: 'https://vyjletlmwoiwxsnsunlm.storage.supabase.co' };
  try {
    for (const [key, value] of Object.entries(selected)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    delete globalThis.window;
    assert.equal(ui.hostedPortalRequested(), true);
    assert.equal(ui.v2NavigationContextEnabled(), true);
    assert.equal(ui.v2IntegrationEnabled(), false);
    assert.equal(ui.installHostedPreviewCapability(capability), false);
    globalThis.window = { location: { origin: capability.appOrigin } };
    assert.equal(ui.v2IntegrationEnabled(), false);
    assert.equal(ui.installHostedPreviewCapability(capability), true);
    assert.equal(ui.v2IntegrationEnabled(), true);
    assert.equal(ui.publicationUploadOrigin(), capability.storageOrigin);
    globalThis.window = { location: { origin: APP } };
    assert.equal(ui.v2IntegrationEnabled(), false);
    assert.equal(ui.installHostedPreviewCapability({ ...capability, appOrigin: APP }), false);
    globalThis.window = { location: { origin: capability.appOrigin } };
    process.env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW = 'v1';
    assert.equal(ui.installHostedPreviewCapability(capability), false);
    assert.equal(ui.v2IntegrationEnabled(), false);
  } finally {
    if (typeof window !== 'undefined') ui.installHostedPreviewCapability(null);
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else delete globalThis.window;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
