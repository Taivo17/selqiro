'use strict';
// Actual handler/service/HTTP limits and browser client with closed synthetic
// Auth/RPC responses. No deployed requests, account writes or new dependency.
const test = require('node:test'), assert = require('node:assert/strict');
const React = require('react');
const {loader, language, project, origin, jwt} = require('./helpers/jobs-public-loader.cjs');
const U = '10000000-0000-0000-0000-000000000001', I = '20000000-0000-0000-0000-000000000001';
const actor = {expectedUserId: U, expectedIdentityId: I}, TOKEN = 'synthetic.user.token';
process.env.NEXT_PUBLIC_SUPABASE_URL = project;
const load = loader();
const {hostedPreviewConfig} = load('src/server/listing-publication/journey/hostedPreviewConfig.ts');
const {createProfileMediaHandler} = load('src/server/profile-media/handler.ts');
const {createProfileMediaClient, ProfileMediaClientError} = load('src/features/profile-media/api/profileMediaClient.ts');
const {parseProfileMediaSnapshot} = load('src/entities/profile/model/profileMedia.ts');
const config = hostedPreviewConfig({NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'production',
  VERCEL_URL: 'selqiro-synthetic-fixture.vercel.app', SELQIRO_V2_HOSTED_PORTAL: 'v1', NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL: 'v1',
  SELQIRO_V2_HOSTED_PROJECT_REF: 'vyjletlmwoiwxsnsunlm', SELQIRO_V2_HOSTED_INSTANCE_ID: U,
  SELQIRO_V2_HOSTED_REGION: 'eu-central-1', SELQIRO_V2_APP_ORIGIN: origin,
  NEXT_PUBLIC_SUPABASE_URL: project, NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('anon'), SUPABASE_SERVICE_ROLE_KEY: jwt('service_role'),
  SELQIRO_V2_S3_ACCESS_KEY_ID: 'synthetic-access', SELQIRO_V2_S3_SECRET_ACCESS_KEY: 'synthetic-secret'}, Date.UTC(2026, 10, 20));
assert.ok(config);
const snapshot = extra => ({user_id: U, identity_id: I, revision: null, avatar: null, cover: null,
  focus_x: 500, focus_y: 500, zoom: 1000, ...extra});
const legacy = url => ({asset_id: null, url, width: null, height: null});
const coverPrefix = project + '/storage/v1/object/public/identity-media/';
const coverUrl = coverPrefix + 'c'.repeat(180 - coverPrefix.length - 5) + '.webp';
const inlinePrefix = 'data:image/png;base64,';
const inlineAvatar = inlinePrefix + 'A'.repeat(117423 - inlinePrefix.length);
const before = snapshot({avatar: legacy(inlineAvatar), cover: legacy(coverUrl)});
const after = snapshot({cover: legacy(coverUrl)});
const context = generation => ({...actor, accessToken: TOKEN, generation: generation ?? 1, signal: new AbortController().signal});
const request = () => new Request(origin + '/api/v2/profile-media/snapshot', {method: 'POST',
  headers: {origin, host: new URL(origin).host, authorization: 'Bearer ' + TOKEN, 'content-type': 'application/json'},
  body: JSON.stringify(actor)});
const hookNotice = error => error instanceof ProfileMediaClientError && error.kind === 'forbidden' ? 'forbidden' : 'readError';
function fixture(initial, declared = true) {
  let current = initial;
  const calls = [];
  const handler = createProfileMediaHandler(config, {fetcher: async (url, init) => {
    assert.ok(url === project + '/auth/v1/user' || url === project + '/rest/v1/rpc/get_my_profile_media_v1');
    const headers = new Headers(init.headers);
    assert.equal(headers.get('authorization'), 'Bearer ' + TOKEN); assert.equal(headers.get('apikey'), config.publicKey);
    calls.push(url.endsWith('/auth/v1/user') ? 'auth' : 'snapshot');
    if (url.endsWith('/auth/v1/user')) return Response.json({id: U});
    assert.deepEqual(JSON.parse(init.body), {p_expected_user_id: U, p_expected_identity_id: I});
    const body = JSON.stringify(current);
    return new Response(body, {status: 200, headers: {'content-type': 'application/json',
      ...(declared ? {'content-length': String(Buffer.byteLength(body))} : {})}});
  }});
  const client = createProfileMediaClient(async (url, init) => {
    assert.equal(url, '/api/v2/profile-media/snapshot');
    const headers = new Headers(init.headers); headers.set('origin', origin); headers.set('host', new URL(origin).host);
    return handler(new Request(origin + url, {...init, headers}), 'snapshot');
  });
  return {handler, client, calls, setSnapshot: value => {current = value;}};
}

test('large legacy inline image is refused by HTTP bounds before the existing URL parser can suppress it', async () => {
  assert.equal(inlineAvatar.length, 117423); assert.equal(coverUrl.length, 180);
  assert.ok(Buffer.byteLength(JSON.stringify(before)) > 65536);
  // This was the earlier coverage gap: a parser-only test passes even though
  // production refuses the oversized response before this parser is reached.
  assert.equal(parseProfileMediaSnapshot(before, actor, project).avatar, null);
  for (const declared of [true, false]) {
    const f = fixture(before, declared);
    const response = await f.handler(request(), 'snapshot');
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), {error: 'response'});
    assert.deepEqual(f.calls, ['auth', 'snapshot']);
    await assert.rejects(f.client.snapshot(context()), error => error.kind === 'unknown' && hookNotice(error) === 'readError');
    assert.deepEqual(f.calls, ['auth', 'snapshot', 'auth', 'snapshot']);
  }
});

test('a SQL-filtered legacy avatar permits loading and preserves the independently valid cover', async () => {
  const f = fixture(after), response = await f.handler(request(), 'snapshot');
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), after);
  const value = await f.client.snapshot(context());
  assert.equal(value.avatar, null); assert.equal(value.cover.url, coverUrl); assert.equal(value.revision, null);
  assert.ok(Buffer.byteLength(JSON.stringify(value)) < 16384);
  assert.deepEqual(f.calls, ['auth', 'snapshot', 'auth', 'snapshot']);
});

test('two maximum2048-byte legacy URL values fit both unchanged HTTP response bounds', async () => {
  const longUrl = coverPrefix + 'p'.repeat(2048 - coverPrefix.length - 5) + '.webp';
  assert.equal(Buffer.byteLength(longUrl), 2048);
  const value = snapshot({avatar: legacy(longUrl), cover: legacy(longUrl)});
  assert.ok(Buffer.byteLength(JSON.stringify(value)) < 16384);
  const loaded = await fixture(value).client.snapshot(context());
  assert.equal(loaded.avatar.url, longUrl); assert.equal(loaded.cover.url, longUrl);
});

let JSDOM;
try {({JSDOM} = require(process.env.SELQIRO_DOM_JSDOM || 'jsdom'));}
catch { /* Optional isolated test runtime, never a production dependency. */ }
test('actual failed-load retry reaches separate avatar and cover pickers after the bounded SQL result', {skip: !JSDOM}, async () => {
  const {createRoot} = require('react-dom/client'), {act} = React;
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {url: origin + '/v2/me/profile'});
  const old = Object.fromEntries(['window', 'document', 'HTMLElement', 'HTMLInputElement', 'IS_REACT_ACT_ENVIRONMENT']
    .map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement'])
    Object.defineProperty(globalThis, key, {value: dom.window[key] ?? dom.window, configurable: true, writable: true});
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const f = fixture(before), clicked = [];
  const domLoad = loader({
    'src/features/profile-media/api/profileMediaClient.ts': {ProfileMediaClientError, createProfileMediaClient, profileMediaClient: f.client},
    'src/shared/i18n/V2LanguageProvider.tsx': language('et'),
  });
  const {useProfileMediaEditor} = domLoad('src/features/profile-media/model/useProfileMediaEditor.ts');
  const Editor = domLoad('src/features/profile-media/components/ProfileMediaEditor.tsx').default;
  let current = null;
  function Harness() {
    const [generation, setGeneration] = React.useState(1);
    const controller = React.useMemo(() => new AbortController(), [generation]);
    const active = React.useMemo(() => ({...actor, accessToken: TOKEN, generation, signal: controller.signal}), [generation]);
    current = active;
    const refresh = React.useCallback(() => {controller.abort(); setGeneration(value => value + 1);}, [controller]);
    const state = useProfileMediaEditor({actor: active, anonymous: false, loading: false, error: null,
      isCurrent: value => current === value && !value.signal.aborted, refresh});
    return React.createElement(Editor, {state, name: 'Synthetic profile', business: false});
  }
  const originalClick = dom.window.HTMLInputElement.prototype.click;
  dom.window.HTMLInputElement.prototype.click = function () {assert.equal(this.type, 'file'); clicked.push(this);};
  const root = createRoot(dom.window.document.getElementById('root'));
  const tick = () => new Promise(resolve => setImmediate(resolve));
  try {
    await act(async () => {root.render(React.createElement(Harness)); await tick();});
    assert.equal(document.querySelector('[role="alert"]').textContent, 'Salvestatud pilte ei õnnestunud laadida. Proovi uuesti kontrollida.');
    assert.equal(document.querySelectorAll('h3').length, 0);
    assert.equal(document.querySelector('button').textContent, 'Proovi uuesti');
    f.setSnapshot(after);
    await act(async () => {document.querySelector('button').click(); await tick();});
    assert.equal(clicked.length, 0); // Retry reads the snapshot, not the gallery.
    assert.deepEqual([...document.querySelectorAll('h3')].map(element => element.textContent), ['Profiilipilt', 'Taustapilt']);
    const choose = [...document.querySelectorAll('button')].filter(button => ['Vali pilt', 'Muuda pilti'].includes(button.textContent));
    assert.equal(choose.length, 2); assert.ok(choose.every(button => !button.disabled));
    assert.ok([...document.querySelectorAll('img')].some(img => img.src === coverUrl));
    await act(async () => {choose[0].click(); choose[1].click();});
    assert.equal(clicked.length, 2); assert.notEqual(clicked[0], clicked[1]);
  } finally {
    await act(async () => root.unmount());
    dom.window.HTMLInputElement.prototype.click = originalClick;
    dom.window.close();
    for (const [key, descriptor] of Object.entries(old)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});
