'use strict';
// Actual UI/domain/session modules; synthetic identity/media only, no live calls.
const test = require('node:test'), assert = require('node:assert/strict');
const React = require('react'), {renderToStaticMarkup} = require('react-dom/server');
const {loader, language, deferred, U, I, J, P, project} = require('./helpers/jobs-public-loader.cjs');
process.env.NEXT_PUBLIC_SUPABASE_URL = project;
const R = '55555555-5555-4555-8555-555555555555', NEXT = '66666666-6666-4666-8666-666666666666';
const OTHER = '77777777-7777-4777-8777-777777777777';
const load = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: {rpc() {throw new Error('unexpected live client');}}},
  'src/shared/i18n/V2LanguageProvider.tsx': language('et')});
const fit = load('src/shared/profile-media/coverFit.ts');
const publicMedia = load('src/entities/profile/api/getPublicProfileMedia.ts');
const model = load('src/entities/profile/model/profileMedia.ts');
const {ProfileMediaSession, mediaUpdateMatches} = load('src/features/profile-media/model/profileMediaSession.ts');
const {ProfileMediaClientError, createProfileMediaClient} = load('src/features/profile-media/api/profileMediaClient.ts');
let JSDOM;
try {({JSDOM} = require(process.env.SELQIRO_DOM_JSDOM || 'jsdom'));}
catch { /* Optional isolated test runtime, never an application dependency. */ }
const actor = {expectedUserId: U, expectedIdentityId: I};
const url = (id = P, identity = I) => `${project}/storage/v1/object/public/identity-media/managed-profile-v1/${identity}/${id}.webp`;
const image = (id = P, extra = {}) => ({asset_id: id, url: url(id), width: 400, height: 300, ...extra});
const snapshot = (extra = {}) => ({user_id: U, identity_id: I, revision: R, avatar: null, cover: null,
  focus_x: 500, focus_y: 500, zoom: 1000, ...extra});
const prepared = () => ({imageBase64: 'YWJj', sourceSha256: 'a'.repeat(64), sourceBytes: 3, sourceMime: 'image/webp',
  preview: new Blob(['abc'], {type: 'image/webp'}), width: 400, height: 300});
const context = (extra = {}) => ({...actor, accessToken: 'synthetic.profile.token', generation: 1,
  signal: new AbortController().signal, ...extra});
function sessionFixture(extra = {}) {
  let current = context(), saved = snapshot(), updates = 0, uploads = 0, confirmations = 0;
  const client = {
    async snapshot() {return saved;},
    async upload(_context, body) {uploads++; return {user_id: U, identity_id: I, asset_id: body.assetId, slot: body.slot,
      status: 'ready', url: url(body.assetId), width: 400, height: 300};},
    async update(_context, command) {updates++; saved = snapshot({revision: NEXT,
      [command.slot]: command.action === 'remove' ? null : image(command.assetId),
      ...(command.slot === 'cover' ? {focus_x: command.focusX, focus_y: command.focusY, zoom: command.zoom} : {})}); return saved;},
    ...extra.client,
  };
  const session = new ProfileMediaSession({actor, initial: extra.initial ?? saved, client, context: () => current,
    confirmed: () => {confirmations++;}, prepare: extra.prepare ?? (async () => prepared()),
    prepareAvatar: async source => source, uuid: () => P});
  return {session, client, setContext: value => {current = value;}, setSaved: value => {saved = value;},
    counts: () => ({updates, uploads, confirmations})};
}

test('cover crop always fills portrait/landscape phone and desktop frames at allowed limits', () => {
  for (const [iw, ih] of [[1000, 2000], [2500, 700], [500, 500]]) for (const [vw, vh] of [[320, 224], [1280, 224]]) {
    for (const x of [0, 500, 1000]) for (const y of [0, 500, 1000]) for (const zoom of [1000, 1500, 2000]) {
      const g = fit.coverGeometry(iw, ih, vw, vh, {focus_x: x, focus_y: y, zoom});
      assert.ok(g.left <= 0 && g.top <= 0);
      assert.ok(g.left + g.width >= vw - 1e-8 && g.top + g.height >= vh - 1e-8);
    }
  }
  const g = fit.coverGeometry(1000, 2000, 320, 224, {focus_x: 1000, focus_y: 500, zoom: 1500});
  assert.deepEqual(g, {width: 480, height: 960, overflowX: 160, overflowY: 736, left: -160, top: -368});
  assert.equal(fit.coverGeometry(0, 200, 300, 200, fit.DEFAULT_COVER_FIT), null);
});

test('drag uses rendered image overflow, clamps edges and leaves a non-overflowing axis unchanged', () => {
  const start = {focus_x: 500, focus_y: 500, zoom: 1000};
  assert.deepEqual(fit.dragCoverFit(start, 200, 112, 1000, 2000, 320, 224), {focus_x: 500, focus_y: 231, zoom: 1000});
  assert.deepEqual(fit.dragCoverFit(start, 99999, -99999, 2000, 1000, 320, 224), {focus_x: 0, focus_y: 500, zoom: 1000});
  assert.deepEqual(fit.clampCoverFit({focus_x: NaN, focus_y: Infinity, zoom: -3}), {focus_x: 500, focus_y: 500, zoom: 1000});
});

test('public media binds the requested identity and rejects malformed positions and profile routes', () => {
  const value = {identity_id: I, slug: 'milline-vedu-6694b9', avatar_url: url(), banner_url: null,
    banner_width: null, banner_height: null, focus_x: 500, focus_y: 500, zoom: 1000};
  assert.equal(publicMedia.parsePublicProfileMedia(value, I).avatar_url, url());
  assert.equal(publicMedia.parsePublicProfileMedia(null, I), null);
  for (const changed of [{identity_id: J}, {focus_x: 0.5}, {zoom: 2001}, {banner_width: 800, banner_height: null},
    {slug: '../account'}, {private_email: 'private@example.test'}]) assert.throws(() => publicMedia.parsePublicProfileMedia({...value, ...changed}, I));
  for (const slug of ['//evil.test', 'https://evil.test', 'user?next=evil', 'a/b', '', '..', '<script>']) assert.equal(publicMedia.publicProfileHref(slug), null);
  assert.equal(publicMedia.publicProfileHref('minu-pood'), '/v2/profile/minu-pood');
  assert.equal(publicMedia.parsePublicProfileMedia({...value, avatar_url: 'https://tracking.test/photo.png'}, I).avatar_url, null);
});

test('staged upload does not replace the saved picture before confirmed update', async () => {
  const upload = deferred(), update = deferred(); let updates = 0;
  const f = sessionFixture({initial: snapshot({avatar: image(OTHER)}), client: {
    upload: () => upload.promise, update: () => {updates++; return update.promise;},
  }});
  await f.session.choose({}, 'avatar');
  const saving = f.session.save();
  assert.equal(f.session.getSnapshot().phase, 'uploading');
  assert.equal(f.session.getSnapshot().saved.avatar.asset_id, OTHER);
  upload.resolve({user_id: U, identity_id: I, asset_id: P, slot: 'avatar', status: 'ready', url: url(), width: 400, height: 300});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(updates, 1); assert.equal(f.session.getSnapshot().phase, 'saving');
  assert.equal(f.session.getSnapshot().saved.avatar.asset_id, OTHER);
  update.resolve(snapshot({revision: NEXT, avatar: image()})); await saving;
  assert.equal(f.session.getSnapshot().saved.avatar.asset_id, P);
  assert.equal(f.session.getSnapshot().draft, null);
});

test('unknown update checks saved binding instead of issuing a second write', async () => {
  let writes = 0;
  const f = sessionFixture({client: {async update() {writes++; throw new ProfileMediaClientError('unknown');}}});
  await f.session.choose({}, 'cover'); f.session.position({focus_x: 200, focus_y: 700, zoom: 1350}); await f.session.save();
  assert.equal(f.session.getSnapshot().phase, 'uncertain'); assert.ok(f.session.getSnapshot().draft);
  f.setSaved(snapshot({revision: NEXT, cover: image(), focus_x: 200, focus_y: 700, zoom: 1350}));
  await f.session.check();
  assert.equal(writes, 1); assert.equal(f.session.getSnapshot().phase, 'ready');
  assert.equal(f.session.getSnapshot().saved.cover.asset_id, P); assert.equal(f.session.getSnapshot().notice, 'saved');
});

test('unchanged read after uncertainty retains draft, while another asset becomes a conflict', async () => {
  const f = sessionFixture({client: {async update() {throw new ProfileMediaClientError('unknown');}}});
  await f.session.choose({}, 'avatar'); await f.session.save(); await f.session.check();
  assert.equal(f.session.getSnapshot().notice, 'notConfirmed'); assert.ok(f.session.getSnapshot().draft);
  await f.session.save(); f.setSaved(snapshot({revision: NEXT, avatar: image(OTHER)})); await f.session.check();
  assert.equal(f.session.getSnapshot().phase, 'conflict'); assert.ok(f.session.getSnapshot().draft);
  const command = {...actor, expectedRevision: R, slot: 'avatar', action: 'set', assetId: P, focusX: 500, focusY: 500, zoom: 1000};
  assert.equal(mediaUpdateMatches(snapshot({revision: NEXT, avatar: image(OTHER)}), command), false);
  assert.equal(mediaUpdateMatches(snapshot({revision: R, avatar: image()}), command), false);
});

test('late save completion after actor retirement cannot adopt or confirm another profile', async () => {
  const update = deferred(); const f = sessionFixture({client: {update: () => update.promise}});
  await f.session.choose({}, 'avatar'); const writing = f.session.save();
  await new Promise(resolve => setImmediate(resolve));
  f.session.suspend(); f.setContext(null); f.session.retire();
  update.resolve(snapshot({revision: NEXT, avatar: image()})); await writing;
  assert.equal(f.session.getSnapshot().phase, 'retired'); assert.equal(f.session.getSnapshot().saved.avatar, null);
  assert.equal(f.counts().confirmations, 0);
});

test('local file selection survives same-owner focus revalidation and cancellation keeps saved media', async () => {
  const selected = deferred(); const initial = snapshot({cover: image(OTHER)});
  const f = sessionFixture({initial, prepare: () => selected.promise});
  const choosing = f.session.choose({}, 'cover'); f.session.suspend(); f.setContext(null);
  selected.resolve(prepared()); await choosing;
  assert.ok(f.session.getSnapshot().draft); assert.equal(f.session.getSnapshot().available, false);
  f.setContext(context({generation: 2})); f.session.revalidate(initial);
  assert.equal(f.session.getSnapshot().available, true);
  f.session.cancel(); assert.equal(f.session.getSnapshot().draft, null);
  assert.equal(f.session.getSnapshot().saved.cover.asset_id, OTHER);
});

test('cover can be positioned with no avatar and a legacy cover is not silently assigned managed coordinates', () => {
  const f = sessionFixture({initial: snapshot({cover: image()})});
  f.session.position({focus_x: 0, focus_y: 1000, zoom: 1500});
  assert.equal(f.session.getSnapshot().draft.action, 'position'); assert.equal(f.session.getSnapshot().saved.avatar, null);
  const legacy = sessionFixture({initial: snapshot({cover: {asset_id: null, url: `${project}/storage/v1/object/public/identity-media/old.webp`, width: null, height: null}})});
  legacy.session.position({focus_x: 0, focus_y: 1000, zoom: 1500}); assert.equal(legacy.session.getSnapshot().draft, null);
});

test('actual media transport pins actor/bearer and rejects malformed receipts', async () => {
  const calls = [], client = createProfileMediaClient(async (path, init) => {
    calls.push({path, headers: init.headers, body: JSON.parse(init.body)});
    return new Response(JSON.stringify(snapshot()), {status: 200, headers: {'content-type': 'application/json'}});
  });
  const result = await client.snapshot(context()); assert.equal(result.identity_id, I);
  assert.equal(calls[0].path, '/api/v2/profile-media/snapshot'); assert.equal(calls[0].headers.authorization, 'Bearer synthetic.profile.token');
  assert.deepEqual(calls[0].body, actor);
  const invalid = createProfileMediaClient(async () => new Response(JSON.stringify(snapshot({identity_id: J})), {status: 200}));
  await assert.rejects(invalid.snapshot(context()));
  assert.throws(() => model.parseProfileMediaSnapshot(snapshot({avatar: {...image(), url: url(P, J)}}), actor, project));
});

test('upload limit retains the selected file and never starts a final save or an automatic retry', async () => {
  let uploads = 0, updates = 0;
  const f = sessionFixture({client: {
    async upload() {uploads++; throw new ProfileMediaClientError('rateLimited');},
    async update() {updates++; throw new Error('unexpected update');},
  }});
  await f.session.choose({}, 'avatar'); const selected = f.session.getSnapshot().draft;
  await f.session.save();
  assert.equal(f.session.getSnapshot().phase, 'ready'); assert.equal(f.session.getSnapshot().notice, 'rateLimited');
  assert.equal(f.session.getSnapshot().draft, selected); assert.equal(f.session.getSnapshot().saved.avatar, null);
  assert.equal(uploads, 1); assert.equal(updates, 0);
  const client = createProfileMediaClient(async () => new Response('', {status: 429}));
  const body = {...actor, expectedRevision: R, assetId: P, slot: 'avatar', imageBase64: 'YWJj',
    sourceSha256: 'a'.repeat(64), sourceBytes: 3, sourceMime: 'image/webp'};
  await assert.rejects(client.upload(context(), body), error => error.kind === 'rateLimited');
  await assert.rejects(client.update(context(), {...actor, expectedRevision: R, slot: 'avatar', action: 'remove',
    assetId: null, focusX: 500, focusY: 500, zoom: 1000}), error => error.kind === 'unknown');
});

test('shared avatar contains logos, has inert initial fallback, and editor exposes an independent cover', () => {
  const Avatar = load('src/shared/profile-media/ProfileAvatar.tsx').default;
  const safe = renderToStaticMarkup(React.createElement(Avatar, {url: url(), name: 'Milline Vedu'}));
  assert.match(safe, /object-fit:contain/); assert.match(safe, /referrerPolicy="no-referrer"/i);
  const denied = renderToStaticMarkup(React.createElement(Avatar, {url: 'https://evil.test/track', name: 'Milline Vedu'}));
  assert.doesNotMatch(denied, /<img/); assert.match(denied, />M<\/span>/);
  const f = sessionFixture({initial: snapshot({cover: image()})});
  const Editor = load('src/features/profile-media/components/ProfileMediaEditor.tsx').default;
  const markup = renderToStaticMarkup(React.createElement(Editor, {state: {session: f.session, view: f.session.getSnapshot(),
    ready: true, loading: false, error: null, refresh() {}}, name: 'Milline Vedu', business: true}));
  assert.match(markup, /Profiilipilt või logo/); assert.match(markup, /Taustapilt/); assert.match(markup, /Sobita pilti/);
  assert.match(markup, /ka ilma profiilipildi või logota/); assert.doesNotMatch(markup, /<form/);
  assert.equal((markup.match(/type="file"/g) ?? []).length, 2);
});

test('public header uses the shared fitted cover and places the overlapping avatar above it', () => {
  const profile = {identityId: I, identityType: 'private', displayName: 'Minu profiil', slug: 'minu-profiil',
    avatarUrl: url(), bannerUrl: url(OTHER), bannerFit: {focus_x: 200, focus_y: 700, zoom: 1500},
    bio: null, websiteUrl: null, businessAddress: null, locationLabel: 'Tallinn', country: 'Eesti', city: 'Tallinn'};
  const overrides = {'src/shared/i18n/V2LanguageProvider.tsx': language('et'),
    'src/features/public-profile/model/usePublicProfile.ts': {usePublicProfile: () => ({profile, loading: false, error: null})},
    'src/features/viewer-provider-controls/components/ProviderControlsBoundary.tsx': {__esModule: true, default: ({children}) => children}};
  for (const name of ['PublicProfileListingsSection', 'PublicProfileProductShowcasesSection', 'PublicProfileServicesSection', 'PublicProfileProviderMenu']) {
    overrides[`src/features/public-profile/components/${name}.tsx`] = {__esModule: true, default: () => null};
  }
  overrides['src/features/jobs/components/PublicProfileJobsSection.tsx'] = {__esModule: true, default: () => null};
  const Page = loader(overrides)('src/features/public-profile/components/PublicProfilePage.tsx').default;
  const markup = renderToStaticMarkup(React.createElement(Page, {slug: profile.slug}));
  assert.match(markup, /object-position:20% 70%;transform-origin:20% 70%;transform:scale\(1\.5\)/);
  assert.match(markup, /class="relative z-10 -mt-16[^\"]*"/);
  assert.match(markup, /object-fit:contain/);
});

function domRuntime() {
  const dom = new JSDOM('<!doctype html><main id="test"></main>', {url: 'https://portal.invalid/v2/my-area/profile'});
  const before = new Map();
  for (const [key, value] of Object.entries({window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true})) {
    before.set(key, Object.getOwnPropertyDescriptor(global, key));
    Object.defineProperty(global, key, {value, configurable: true, writable: true});
  }
  dom.window.confirm = () => true;
  const container = dom.window.document.querySelector('#test'), root = require('react-dom/client').createRoot(container);
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const act = async fn => {await React.act(async () => {await fn(); await flush();});};
  return {container, window: dom.window, act,
    render: (Component, props = {}) => act(() => root.render(React.createElement(Component, props))),
    button: text => [...container.querySelectorAll('button')].find(button => button.textContent.trim() === text),
    click: button => act(() => {assert.ok(button, 'button exists'); button.dispatchEvent(new dom.window.MouseEvent('click', {bubbles: true, button: 0}));}),
    change: (input, value) => act(() => {
      const prototype = input.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
      input.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
      input.dispatchEvent(new dom.window.Event('change', {bubbles: true}));
    }),
    async close() {await act(() => root.unmount()); dom.window.close();
      for (const [key, descriptor] of before) {if (descriptor) Object.defineProperty(global, key, descriptor); else delete global[key];}}
  };
}

test('DOM cover adjustment resets and cancels locally, then explicitly saves a chosen crop without an avatar', {skip: !JSDOM}, async () => {
  const h = domRuntime(), f = sessionFixture({initial: snapshot({cover: image()})});
  const Editor = load('src/features/profile-media/components/ProfileMediaEditor.tsx').default;
  function App() {const view = React.useSyncExternalStore(f.session.subscribe, f.session.getSnapshot, f.session.getSnapshot);
    return React.createElement(Editor, {state: {session: f.session, view, ready: true, loading: false, error: null, refresh() {}},
      name: 'Milline Vedu', business: true});}
  try {
    await h.render(App); await h.click(h.button('Sobita pilti'));
    let ranges = h.container.querySelectorAll('input[type="range"]');
    await h.change(ranges[0], '1500');
    assert.equal(h.container.querySelector('[aria-label="Taustapildi eelvaade"] img').style.transform, 'scale(1.5)');
    await h.click(h.button('Paiguta keskele'));
    assert.equal(h.container.querySelector('input[type="range"]').value, '1000');
    await h.change(h.container.querySelector('input[type="range"]'), '1500');
    await h.click(h.button('Loobu sobitamisest'));
    assert.equal(f.session.getSnapshot().draft, null); assert.equal(f.counts().updates, 0);
    assert.equal(h.container.querySelector('[aria-label="Taustapildi eelvaade"] img').style.transform, 'scale(1)');

    await h.click(h.button('Sobita pilti')); ranges = h.container.querySelectorAll('input[type="range"]');
    await h.change(ranges[0], '1500'); await h.change(ranges[1], '250'); await h.change(ranges[2], '750');
    const frame = h.container.querySelector('[aria-label="Taustapildi eelvaade"]');
    await h.act(() => frame.dispatchEvent(new h.window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true})));
    assert.equal(h.container.querySelectorAll('input[type="range"]')[1].value, '260');
    frame.getBoundingClientRect = () => ({width: 320, height: 224, top: 0, left: 0, right: 320, bottom: 224});
    frame.setPointerCapture = () => {}; frame.hasPointerCapture = () => false;
    await h.act(() => {
      for (const [type, x, y] of [['pointerdown', 100, 100], ['pointermove', 120, 110], ['pointerup', 120, 110]]) {
        const event = new h.window.MouseEvent(type, {bubbles: true, button: 0, clientX: x, clientY: y});
        Object.defineProperty(event, 'pointerId', {value: 1}); frame.dispatchEvent(event);
      }
    });
    const beforeSave = [...h.container.querySelectorAll('input[type="range"]')].map(input => Number(input.value));
    assert.ok(beforeSave[1] < 260); assert.ok(beforeSave[2] < 750);
    await h.click(h.button('Kasuta seda asendit'));
    assert.equal(f.session.getSnapshot().draft.action, 'position'); assert.equal(f.counts().updates, 0);
    await h.click(h.button('Salvesta taustapilt'));
    assert.equal(f.counts().updates, 1); assert.equal(f.counts().uploads, 0);
    assert.equal(f.session.getSnapshot().saved.avatar, null);
    assert.deepEqual([f.session.getSnapshot().saved.zoom, f.session.getSnapshot().saved.focus_x, f.session.getSnapshot().saved.focus_y], beforeSave);
    assert.match(h.container.textContent, /Pilt salvestatud/);
  } finally {await h.close();}
});

test('DOM broken avatar becomes initials and partner profile links ignore stale peer results', {skip: !JSDOM}, async () => {
  const h = domRuntime(), requests = [];
  const headerLoad = loader({'src/shared/i18n/V2LanguageProvider.tsx': language('et'),
    'src/features/listing-conversation/components/ThreadActions.tsx': {__esModule: true, default: () => null},
    'src/entities/profile/api/getPublicProfileMedia.ts': {publicProfileHref: publicMedia.publicProfileHref,
      getPublicProfileMedia(id, signal) {const pending = deferred(); requests.push({id, signal, pending}); return pending.promise;}}});
  const Header = headerLoad('src/features/listing-conversation/components/ConversationHeader.tsx').default;
  const props = {peer: {identity_id: I, name: 'Milline Vedu', avatar_url: url()}, listing: null, ready: true,
    blocked: false, busy: false, onHide: async () => false, onBlock: async () => false};
  try {
    await h.render(Header, props); assert.equal(requests.length, 1);
    const picture = h.container.querySelector('img'); assert.ok(picture);
    await h.act(() => picture.dispatchEvent(new h.window.Event('error')));
    assert.equal(h.container.querySelector('img'), null); assert.match(h.container.textContent, /M/);
    await h.render(Header, {...props, peer: {identity_id: J, name: 'Järgmine pood', avatar_url: null}});
    assert.equal(requests.length, 2); assert.equal(requests[0].signal.aborted, true);
    await h.act(() => requests[0].pending.resolve({identity_id: I, slug: 'vana-pood'}));
    assert.equal(h.container.querySelector('a[href="/v2/profile/vana-pood"]'), null);
    await h.act(() => requests[1].pending.resolve({identity_id: J, slug: 'jargmine-pood'}));
    assert.equal(h.container.querySelectorAll('a[href="/v2/profile/jargmine-pood"]').length, 2);
    await h.render(Header, {...props, peer: {identity_id: J, name: 'Järgmine pood', avatar_url: null}, blocked: true});
    assert.equal(h.container.querySelector('a[href="/v2/profile/jargmine-pood"]'), null);
  } finally {await h.close();}
});

test('DOM text draft and native file inputs survive media edits and temporary text-context loading', {skip: !JSDOM}, async () => {
  const h = domRuntime(), media = sessionFixture(); let textWrites = 0, textLoading = false;
  const {ProfileEditorSession} = load('src/features/profile-editor/model/profileEditorSession.ts');
  const textActor = {userId: U, identityId: I}, textContext = {...textActor, accessToken: 'synthetic.profile.token', signal: new AbortController().signal};
  const textSnapshot = {...textActor, user_id: U, identity_id: I, identity_type: 'private', revision: R, slug: 'minu-profiil',
    display_name: 'Minu profiil', bio: '', website_url: '', country: 'Eesti', city: 'Tallinn', address_text: '', location_visibility: 'city'};
  const text = new ProfileEditorSession({actor: textActor, initial: textSnapshot, context: () => textContext,
    confirmed() {}, client: {async read() {return textSnapshot;}, async save() {textWrites++; return textSnapshot;}}});
  const pageLoad = loader({'src/shared/i18n/V2LanguageProvider.tsx': language('et'),
    'src/features/profile-editor/model/useProfileEditor.ts': {useProfileEditor() {
      const view = React.useSyncExternalStore(text.subscribe, text.getSnapshot, text.getSnapshot);
      return {context: {anonymous: false}, view: textLoading ? null : view, session: text, ready: !textLoading, error: null, refresh() {}};
    }},
    'src/features/profile-media/model/useProfileMediaEditor.ts': {useProfileMediaEditor() {
      const view = React.useSyncExternalStore(media.session.subscribe, media.session.getSnapshot, media.session.getSnapshot);
      return {session: media.session, view, ready: true, loading: false, error: null, refresh() {}};
    }}});
  const Page = pageLoad('src/features/profile-editor/components/ProfileEditorPage.tsx').default;
  try {
    await h.render(Page); await h.change(h.container.querySelector('textarea[name="bio"]'), 'Minu salvestamata kirjeldus');
    assert.equal(text.getSnapshot().draft.bio, 'Minu salvestamata kirjeldus'); assert.equal(text.getSnapshot().dirty, true);
    const input = h.container.querySelector('input[type="file"]'); assert.ok(input); assert.equal(input.closest('form'), null);
    textLoading = true; await h.render(Page); assert.equal(h.container.querySelector('input[type="file"]'), input);
    await h.act(() => {Object.defineProperty(input, 'files', {value: [{}], configurable: true});
      input.dispatchEvent(new h.window.Event('change', {bubbles: true}));});
    assert.ok(media.session.getSnapshot().draft);
    textLoading = false; await h.render(Page); assert.equal(h.container.querySelector('input[type="file"]'), input);
    await h.click(h.button('Kasuta seda asendit'));
    await h.click(h.button('Salvesta pilt'));
    assert.equal(media.counts().updates, 1); assert.equal(textWrites, 0);
    assert.equal(text.getSnapshot().draft.bio, 'Minu salvestamata kirjeldus'); assert.equal(text.getSnapshot().dirty, true);
    assert.equal(h.container.querySelector('textarea[name="bio"]').value, 'Minu salvestamata kirjeldus');
  } finally {await h.close();}
});
