'use strict';
// Exercise the actual editor/session with synthetic local media; no live requests.
const test = require('node:test'), assert = require('node:assert/strict');
const React = require('react');
const {loader, language, deferred, U, I, J, project} = require('./helpers/jobs-public-loader.cjs');
process.env.NEXT_PUBLIC_SUPABASE_URL = project;
const load = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: {rpc() {throw new Error('unexpected live client');}}},
  'src/shared/i18n/V2LanguageProvider.tsx': language('et')});
const {ProfileMediaSession} = load('src/features/profile-media/model/profileMediaSession.ts');
const Editor = load('src/features/profile-media/components/ProfileMediaEditor.tsx').default;
let JSDOM;
try {({JSDOM} = require(process.env.SELQIRO_DOM_JSDOM || 'jsdom'));}
catch { /* Optional isolated test runtime, never an application dependency. */ }
const R = '55555555-5555-4555-8555-555555555555', NEXT = '66666666-6666-4666-8666-666666666666';
const original = (label = 'selected') => ({imageBase64: 'YWJj', sourceSha256: label.padEnd(64, 'a').slice(0, 64),
  sourceBytes: 3, sourceMime: 'image/webp', preview: new Blob([label], {type: 'image/webp'}), width: 800, height: 400});
const mediaUrl = (identity, id) => `${project}/storage/v1/object/public/identity-media/managed-profile-v1/${identity}/${id}.webp`;
function fixture(extra = {}) {
  const identity = extra.identity ?? I, actor = {expectedUserId: U, expectedIdentityId: identity};
  let current = {...actor, accessToken: 'synthetic.token', generation: 1, signal: new AbortController().signal};
  let saved = {user_id: U, identity_id: identity, revision: R, avatar: null, cover: null, focus_x: 500, focus_y: 500, zoom: 1000};
  let uploads = 0, updates = 0, sequence = 0;
  const fits = [], source = extra.source ?? original();
  const prepareAvatar = extra.prepareAvatar ?? (async (image, fit) => {
    fits.push({image, fit});
    if (fit.mode === 'contain') return image;
    return {...image, width: 400, height: 400, sourceSha256: `${fit.zoom}:${fit.focus_x}:${fit.focus_y}`.padEnd(64, 'b'),
      preview: new Blob([`crop:${fit.zoom}:${fit.focus_x}:${fit.focus_y}`], {type: 'image/webp'})};
  });
  const session = new ProfileMediaSession({actor, initial: saved, context: () => current, confirmed() {},
    prepare: extra.prepare ?? (async () => source), prepareAvatar,
    uuid: () => `77777777-7777-4777-8777-${String(++sequence).padStart(12, '0')}`,
    client: {
      async snapshot() {return saved;},
      async upload(_actor, body) {uploads++; const image = session.getSnapshot().draft.prepared;
        return {user_id: U, identity_id: identity, asset_id: body.assetId, slot: body.slot, status: 'ready',
          url: mediaUrl(identity, body.assetId), width: image.width, height: image.height};},
      async update(_actor, command) {updates++; const image = session.getSnapshot().draft.prepared;
        saved = {...saved, revision: NEXT, [command.slot]: {asset_id: command.assetId,
          url: mediaUrl(identity, command.assetId), width: image.width, height: image.height}}; return saved;},
    }});
  return {session, source, fits, counts: () => ({uploads, updates}),
    suspend() {current = null; session.suspend();},
    resume() {current = {...actor, accessToken: 'synthetic.new.token', generation: 2, signal: new AbortController().signal}; session.revalidate(saved);}};
}

function domRuntime() {
  const dom = new JSDOM('<!doctype html><main id="test"></main>', {url: 'https://portal.invalid/v2/my-area/profile'});
  const before = new Map();
  for (const [key, value] of Object.entries({window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true})) {
    before.set(key, Object.getOwnPropertyDescriptor(global, key));
    Object.defineProperty(global, key, {value, configurable: true, writable: true});
  }
  const container = dom.window.document.querySelector('#test'), root = require('react-dom/client').createRoot(container);
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const act = async fn => {await React.act(async () => {await fn(); await flush();});};
  return {container, window: dom.window, act,
    render: (Component, props = {}) => act(() => root.render(React.createElement(Component, props))),
    button: text => [...container.querySelectorAll('button')].find(button => button.textContent.trim() === text),
    click: button => act(() => {assert.ok(button, 'button exists'); button.dispatchEvent(new dom.window.MouseEvent('click', {bubbles: true, button: 0}));}),
    select: (input, file = {}) => act(() => {Object.defineProperty(input, 'files', {value: [file], configurable: true});
      input.dispatchEvent(new dom.window.Event('change', {bubbles: true}));}),
    change: (input, value) => act(() => {Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new dom.window.Event('input', {bubbles: true})); input.dispatchEvent(new dom.window.Event('change', {bubbles: true}));}),
    async close() {await act(() => root.unmount()); dom.window.close();
      for (const [key, descriptor] of before) {if (descriptor) Object.defineProperty(global, key, descriptor); else delete global[key];}}
  };
}
function appFor(state, extra = {}) {
  return function App() {
    const view = React.useSyncExternalStore(state.session.subscribe, state.session.getSnapshot, state.session.getSnapshot);
    return React.createElement(Editor, {state: {session: state.session, view, ready: true, loading: false, error: null, refresh() {}},
      name: 'Minu profiil', business: false, ...extra});
  };
}

test('avatar selection opens a local circular fit; keyboard, drag and sliders apply before an explicit save', {skip: !JSDOM}, async () => {
  const h = domRuntime(), f = fixture(), editing = [];
  try {
    await h.render(appFor(f, {onEditingChange: value => editing.push(value)}));
    const input = h.container.querySelector('input[type="file"]'); await h.select(input);
    assert.equal(h.container.querySelector('input[type="file"]'), input);
    assert.equal(h.container.querySelector('input[type="radio"][value="cover"]').checked, true);
    assert.equal(h.button('Salvesta pilt'), undefined);
    assert.equal(h.container.querySelector('[aria-label="Profiilipildi eelvaade"] img').style.objectFit, 'cover');
    assert.equal(editing.at(-1), true);
    assert.equal([...h.container.querySelectorAll('button')].find(button => button.textContent === 'Vali pilt').disabled, true);
    const preventLeave = new h.window.Event('beforeunload', {cancelable: true}); h.window.dispatchEvent(preventLeave);
    assert.equal(preventLeave.defaultPrevented, true);
    let ranges = h.container.querySelectorAll('input[type="range"]');
    await h.change(ranges[0], '1500'); await h.change(ranges[1], '250'); await h.change(ranges[2], '750');
    const frame = h.container.querySelector('[aria-label="Profiilipildi eelvaade"]');
    assert.equal(frame.querySelector('img').style.transform, 'scale(1.5)');
    await h.act(() => frame.dispatchEvent(new h.window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true})));
    assert.equal(h.container.querySelectorAll('input[type="range"]')[1].value, '260');
    frame.getBoundingClientRect = () => ({width: 240, height: 240, top: 0, left: 0, right: 240, bottom: 240});
    frame.setPointerCapture = () => {}; frame.hasPointerCapture = () => false;
    await h.act(() => {
      for (const [type, x, y] of [['pointerdown', 100, 100], ['pointermove', 120, 110], ['pointerup', 120, 110]]) {
        const event = new h.window.MouseEvent(type, {bubbles: true, button: 0, clientX: x, clientY: y});
        Object.defineProperty(event, 'pointerId', {value: 1}); frame.dispatchEvent(event);
      }
    });
    const values = [...h.container.querySelectorAll('input[type="range"]')].map(range => Number(range.value));
    assert.ok(values[1] < 260); assert.ok(values[2] < 750);
    await h.click(h.button('Kasuta seda asendit'));
    assert.equal(h.container.querySelector('[aria-label="Profiilipildi eelvaade"]'), null);
    assert.deepEqual(f.session.getSnapshot().draft.avatarFit, {mode: 'cover', zoom: values[0], focus_x: values[1], focus_y: values[2]});
    assert.equal(f.session.getSnapshot().draft.avatarSource, f.source);
    assert.deepEqual(f.counts(), {uploads: 0, updates: 0});
    assert.equal(editing.at(-1), false);
    await h.click(h.button('Salvesta pilt'));
    assert.deepEqual(f.counts(), {uploads: 1, updates: 1});
    assert.match(h.container.textContent, /Pilt salvestatud/);
    assert.match(h.container.textContent, /Salvestatud pildi sobitamiseks vali sama pilt uuesti/);
  } finally {await h.close();}
});

test('company logos start whole; changing fit is reversible and subsequent fits always use the original local source', {skip: !JSDOM}, async () => {
  const h = domRuntime(), f = fixture();
  try {
    await h.render(appFor(f, {business: true})); await h.select(h.container.querySelector('input[type="file"]'));
    assert.equal(h.container.querySelector('input[type="radio"][value="contain"]').checked, true);
    assert.equal(h.container.querySelectorAll('input[type="range"]').length, 0);
    assert.equal(h.container.querySelector('[aria-label="Profiilipildi eelvaade"] img').style.objectFit, 'contain');
    await h.click(h.container.querySelector('input[type="radio"][value="cover"]'));
    assert.equal(h.container.querySelectorAll('input[type="range"]').length, 3);
    await h.change(h.container.querySelector('input[type="range"]'), '1800');
    await h.click(h.button('Loobu sobitamisest'));
    assert.equal(f.session.getSnapshot().draft.avatarFit.mode, 'contain');
    assert.equal(f.session.getSnapshot().draft.avatarFit.zoom, 1000);
    await h.click(h.button('Sobita pilti'));
    assert.equal(h.container.querySelector('input[type="radio"][value="contain"]').checked, true);
    await h.click(h.container.querySelector('input[type="radio"][value="cover"]'));
    await h.change(h.container.querySelector('input[type="range"]'), '1800');
    await h.click(h.button('Kasuta seda asendit'));
    assert.equal(f.session.getSnapshot().draft.prepared.width, f.session.getSnapshot().draft.prepared.height);
    await h.click(h.button('Sobita pilti'));
    await h.click(h.container.querySelector('input[type="radio"][value="contain"]'));
    await h.click(h.button('Kasuta seda asendit'));
    assert.equal(f.session.getSnapshot().draft.prepared, f.source);
    assert.ok(f.fits.every(call => call.image === f.source));
    assert.deepEqual(f.counts(), {uploads: 0, updates: 0});
    await h.click(h.button('Loobu'));
    assert.equal(f.session.getSnapshot().draft, null);
    assert.equal(h.container.querySelector('input[type="radio"]'), null);
  } finally {await h.close();}
});

test('file-picker focus refresh retains selection and native inputs; cancelled or retired selections cannot open a stale fit', {skip: !JSDOM}, async () => {
  const h = domRuntime(), pending = deferred(), a = fixture({prepare: () => pending.promise}), b = fixture({identity: J});
  let current = a, ready = true;
  function App() {
    const view = React.useSyncExternalStore(current.session.subscribe, current.session.getSnapshot, current.session.getSnapshot);
    return React.createElement(Editor, {state: {session: current.session, view, ready, loading: !ready, error: null, refresh() {}},
      name: current === a ? 'Esimene profiil' : 'Teine profiil', business: false});
  }
  try {
    await h.render(App); const input = h.container.querySelector('input[type="file"]'); await h.select(input);
    await h.act(() => {a.suspend(); ready = false;}); await h.render(App);
    assert.equal(h.container.querySelector('input[type="file"]'), input); assert.equal(input.disabled, false);
    await h.act(() => pending.resolve(a.source));
    assert.ok(h.container.querySelector('[aria-label="Profiilipildi eelvaade"]'));
    assert.equal(h.button('Kasuta seda asendit').disabled, true);
    await h.act(() => {a.resume(); ready = true;}); await h.render(App);
    assert.equal(h.button('Kasuta seda asendit').disabled, false);
    await h.click(h.button('Loobu sobitamisest')); await h.click(h.button('Loobu'));

    const cancelled = deferred(), c = fixture({prepare: () => cancelled.promise});
    current = c; await h.render(App); await h.select(h.container.querySelector('input[type="file"]'));
    await h.click(h.button('Loobu')); await h.act(() => cancelled.resolve(c.source));
    assert.equal(c.session.getSnapshot().draft, null); assert.equal(h.container.querySelector('input[type="radio"]'), null);

    const retired = deferred(), d = fixture({prepare: () => retired.promise});
    current = d; await h.render(App); await h.select(h.container.querySelector('input[type="file"]'));
    await h.act(() => {d.session.retire(); current = b;}); await h.render(App);
    await h.act(() => retired.resolve(d.source));
    assert.equal(b.session.getSnapshot().draft, null);
    assert.equal(h.container.querySelector('[aria-label="Profiilipildi eelvaade"]'), null);
    assert.deepEqual(b.counts(), {uploads: 0, updates: 0});
  } finally {await h.close();}
});
