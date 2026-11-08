'use strict';
// Exercise the actual shared component and callbacks with a minimal hook/DOM
// boundary. Native browser layout, focus trapping and gestures are not inferred.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const galleryModule = 'src/shared/media/PublicPhotoGallery.tsx';
const photos = Object.freeze([
  Object.freeze({ id: 'first', src: '/api/v2/horse-media/first/0', thumbnailSrc: '/api/v2/horse-media/first/0', fullSrc: '/api/v2/horse-media/first/0' }),
  Object.freeze({ id: 'second', src: '/api/v2/horse-media/first/1', thumbnailSrc: '/api/v2/horse-media/first/1', fullSrc: '/api/v2/horse-media/first/1' }),
  Object.freeze({ id: 'third', src: '/api/v2/horse-media/second/0', fullSrc: '/api/v2/horse-media/second/0' }),
]);

function createModules(react, globals = {}) {
  const cache = new Map();
  let language = 'en';
  function load(relative) {
    const file = path.resolve(root, relative);
    assert.ok(file.startsWith(root + path.sep));
    if (file.endsWith('/src/shared/i18n/V2LanguageProvider.tsx')) return {
      useV2Translation: catalog => ({ language, t: (key, params) =>
        load('lib/i18n/useTranslation.ts').getCatalogTranslation(language, catalog, key, params) }),
    };
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const localRequire = name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return require(name);
      assert.ok(name.startsWith('.'), 'Unmocked external import: ' + name);
      const candidate = path.resolve(path.dirname(file), name);
      const resolved = [candidate, candidate + '.ts', candidate + '.tsx'].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      assert.ok(resolved, name);
      return load(resolved);
    };
    vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, ...globals }, { filename: file });
    return module.exports;
  }
  return { load, language(value) { language = value; } };
}

function descendants(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(descendants);
  return [tree, ...descendants(tree.props?.children)];
}
const nodes = (tree, type) => descendants(tree).filter(node => node.type === type);

function mountedGallery(initialProps = { title: 'Horse test', photos }) {
  const state = [], effects = [], refs = [];
  let cursor = 0, dirty = false, tree, props = initialProps;
  let now = 0, nextTimer = 0;
  const timers = new Map();
  const clock = {
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, due: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const doc = { activeElement: null, body: { style: { overflow: 'auto' } } };
  class Element {
    isConnected = true;
    focusVisible = false;
    children = new Set();
    focus() { doc.activeElement = this; }
    contains(other) { return this === other || this.children.has(other); }
    matches(selector) { return selector === ':focus-visible' && this.focusVisible; }
  }
  class Dialog extends Element {
    open = false;
    shown = 0;
    closed = 0;
    showModal() { this.open = true; this.shown++; }
    close() { this.open = false; this.closed++; }
  }
  const opener = new Element();
  opener.focus();
  const hooks = {
    useState(initial) {
      const at = cursor++;
      if (!(at in state)) state[at] = typeof initial === 'function' ? initial() : initial;
      return [state[at], next => {
        const value = typeof next === 'function' ? next(state[at]) : next;
        if (!Object.is(value, state[at])) { state[at] = value; dirty = true; }
      }];
    },
    useRef(initial) {
      const at = cursor++;
      return refs[at] || (refs[at] = { current: initial });
    },
    useEffect(run, deps) {
      const at = cursor++;
      const previous = effects[at];
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) {
        effects[at] = { run, deps, previousCleanup: previous?.cleanup, changed: true };
      }
    },
  };
  const modules = createModules(hooks, { document: doc, HTMLElement: Element, window: clock });
  const Gallery = modules.load(galleryModule).default;
  const domRefs = new Map();
  function render() {
    cursor = 0;
    dirty = false;
    tree = Gallery(props);
    const present = new Set();
    for (const node of descendants(tree)) {
      const ref = node.props?.ref;
      if (!ref || typeof ref !== 'object') continue;
      present.add(ref);
      if (!domRefs.has(ref)) domRefs.set(ref, node.type === 'dialog' ? new Dialog() : new Element());
      ref.current = domRefs.get(ref);
    }
    for (const ref of domRefs.keys()) if (!present.has(ref)) ref.current = null;
    for (const effect of effects) if (effect?.changed) {
      effect.changed = false;
      effect.previousCleanup?.();
      effect.cleanup = effect.run();
    }
    return tree;
  }
  function act(callback) {
    callback();
    for (let i = 0; dirty && i < 10; i++) render();
    assert.equal(dirty, false);
  }
  render();
  return {
    get tree() { return tree; },
    doc, opener,
    act,
    get pendingTimers() { return [...timers.values()]; },
    advance(milliseconds) {
      const end = now + milliseconds;
      for (;;) {
        const next = [...timers].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
        if (!next) break;
        const [id, timer] = next;
        now = timer.due;
        timers.delete(id);
        act(timer.callback);
      }
      now = end;
    },
    focusNavigation(container, keyboard = true) {
      const element = new Element();
      element.focusVisible = keyboard;
      container.props.ref.current.children.add(element);
      element.focus();
      act(container.props.onFocus);
    },
    blurNavigation(container) { opener.focus(); act(container.props.onBlur); },
    update(next) { props = next; render(); },
    language(value) { modules.language(value); render(); },
    unmount() { for (const effect of effects) effect?.cleanup?.(); },
  };
}
function button(gallery, name) {
  const found = nodes(gallery.tree, 'button').find(node => node.props['aria-label'] === name);
  assert.ok(found, 'Missing button: ' + name);
  return found;
}
function click(gallery, name) {
  gallery.act(() => button(gallery, name).props.onClick({ detail: 1, stopPropagation() {}, preventDefault() {} }));
}
const mainPhoto = gallery => nodes(gallery.tree, 'img')[0].props.src;
const event = patch => ({ pointerId: 5, pointerType: 'touch', isPrimary: true,
  clientX: 150, clientY: 100, detail: 1, stopPropagation() {}, preventDefault() {}, ...patch });
const surface = (gallery, large = false) => nodes(large ? nodes(gallery.tree, 'dialog')[0] : gallery.tree, 'div')
  .find(node => typeof node.props.onPointerMove === 'function');
const navigation = (gallery, large = false) => nodes(large ? nodes(gallery.tree, 'dialog')[0] : gallery.tree, 'div')
  .find(node => node.props.ref && typeof node.props.onFocus === 'function');
function arrowsHidden(gallery, large = false) {
  const arrows = nodes(navigation(gallery, large), 'button');
  assert.equal(arrows.length, 2);
  return arrows.every(node => node.props.className.split(' ').includes('opacity-0')
    && node.props.className.split(' ').includes('pointer-events-none'));
}

test('navigation alone hides after three seconds; enlargement, thumbnails and keyboard entry remain available', () => {
  const gallery = mountedGallery();
  assert.equal(arrowsHidden(gallery), false);
  assert.equal(gallery.pendingTimers.length, 1);
  gallery.advance(2999);
  assert.equal(arrowsHidden(gallery), false);
  gallery.advance(1);
  assert.equal(arrowsHidden(gallery), true);
  assert.equal(gallery.pendingTimers.length, 0);
  for (const label of ['Previous image', 'Next image']) {
    const arrow = button(gallery, label);
    assert.equal(arrow.props['aria-hidden'], undefined);
    assert.equal(arrow.props.tabIndex, undefined, 'A visually hidden arrow remains keyboard reachable');
    assert.match(arrow.props.className, /focus-visible:opacity-100/);
  }
  assert.doesNotMatch(button(gallery, 'Enlarge image 1 of 3').props.className, /opacity-0/);
  assert.doesNotMatch(button(gallery, 'Show image 2 of 3').props.className, /opacity-0/);
  click(gallery, 'Enlarge image 1 of 3');
  gallery.advance(3000);
  assert.equal(arrowsHidden(gallery, true), true);
  assert.doesNotMatch(button(gallery, 'Close image').props.className, /opacity-0/);
  assert.equal(nodes(nodes(gallery.tree, 'dialog')[0], 'img')[0].props.src, photos[0].fullSrc);
});

test('pointer movement or entry reveals arrows and each interaction starts a fresh three seconds', () => {
  const gallery = mountedGallery();
  gallery.advance(3000);
  gallery.act(surface(gallery).props.onPointerMove);
  assert.equal(arrowsHidden(gallery), false);
  gallery.advance(2000);
  gallery.act(surface(gallery).props.onPointerMove);
  assert.equal(gallery.pendingTimers.length, 1, 'Repeated motion replaces the previous timer');
  gallery.advance(2999);
  assert.equal(arrowsHidden(gallery), false);
  gallery.advance(1);
  assert.equal(arrowsHidden(gallery), true);
  gallery.act(surface(gallery).props.onPointerEnter);
  assert.equal(arrowsHidden(gallery), false);
  gallery.advance(3000);
  assert.equal(arrowsHidden(gallery), true);
});

test('photo and thumbnail selection reveal navigation, including selecting the current thumbnail', () => {
  const gallery = mountedGallery();
  gallery.advance(3000);
  click(gallery, 'Show image 2 of 3');
  assert.equal(mainPhoto(gallery), photos[1].src);
  assert.equal(arrowsHidden(gallery), false);
  gallery.advance(2500);
  click(gallery, 'Show image 2 of 3');
  gallery.advance(2999);
  assert.equal(arrowsHidden(gallery), false);
  gallery.advance(1);
  assert.equal(arrowsHidden(gallery), true);
  gallery.act(() => gallery.tree.props.onKeyDown({ key: 'Home', preventDefault() {}, stopPropagation() {} }));
  assert.equal(mainPhoto(gallery), photos[0].src);
  assert.equal(arrowsHidden(gallery), false);
  gallery.advance(3000);
  gallery.update({ title: 'Changed', photos: [{ id: 'replacement', src: '/exact/replacement.webp' }, photos[1]] });
  assert.equal(arrowsHidden(gallery), false, 'A different displayed photo has a new idle period');
  gallery.advance(3000);
  assert.equal(arrowsHidden(gallery), true);
});

test('keyboard focus keeps navigation visible, then blur starts another idle period; mouse focus does not pin arrows', () => {
  const gallery = mountedGallery();
  gallery.advance(3000);
  gallery.focusNavigation(navigation(gallery));
  assert.equal(arrowsHidden(gallery), false);
  gallery.advance(9000);
  assert.equal(arrowsHidden(gallery), false);
  gallery.blurNavigation(navigation(gallery));
  gallery.advance(2999);
  assert.equal(arrowsHidden(gallery), false);
  gallery.advance(1);
  assert.equal(arrowsHidden(gallery), true);
  gallery.focusNavigation(navigation(gallery), false);
  assert.equal(arrowsHidden(gallery), false);
  gallery.advance(3000);
  assert.equal(arrowsHidden(gallery), true);
});

test('enlarged-view navigation has a fresh idle period on opening, movement and reopening', () => {
  const gallery = mountedGallery();
  gallery.advance(3000);
  click(gallery, 'Enlarge image 1 of 3');
  assert.equal(arrowsHidden(gallery, true), false);
  assert.equal(gallery.pendingTimers.length, 1, 'Inline idle work stops while the modal is open');
  gallery.advance(3000);
  assert.equal(arrowsHidden(gallery, true), true);
  gallery.act(surface(gallery, true).props.onPointerMove);
  assert.equal(arrowsHidden(gallery, true), false);
  gallery.advance(3000);
  assert.equal(arrowsHidden(gallery, true), true);
  gallery.focusNavigation(navigation(gallery, true));
  gallery.advance(6000);
  assert.equal(arrowsHidden(gallery, true), false);
  click(gallery, 'Close image');
  assert.equal(arrowsHidden(gallery), false);
  gallery.advance(3000);
  click(gallery, 'Enlarge image 1 of 3');
  assert.equal(arrowsHidden(gallery, true), false);
  gallery.advance(3000);
  assert.equal(arrowsHidden(gallery, true), true, 'Closed modal keyboard focus cannot keep a new viewer visible forever');
});

test('touch gestures reveal the arrows after inactivity and preserve swipe navigation', () => {
  const gallery = mountedGallery();
  gallery.advance(3000);
  const opener = button(gallery, 'Enlarge image 1 of 3');
  gallery.act(() => opener.props.onPointerDown(event()));
  assert.equal(arrowsHidden(gallery), false);
  gallery.act(() => opener.props.onPointerUp(event({ clientX: 50, clientY: 110 })));
  assert.equal(mainPhoto(gallery), photos[1].src);
  assert.equal(arrowsHidden(gallery), false);
  click(gallery, 'Enlarge image 2 of 3');
  assert.equal(nodes(gallery.tree, 'dialog').length, 0, 'A swipe does not also enlarge the image');
  click(gallery, 'Enlarge image 2 of 3');
  gallery.advance(3000);
  gallery.act(() => surface(gallery, true).props.onPointerDown(event()));
  assert.equal(arrowsHidden(gallery, true), false);
  gallery.act(() => surface(gallery, true).props.onPointerUp(event({ clientX: 50, clientY: 110 })));
  assert.equal(mainPhoto(gallery), photos[2].src);
});

test('the first non-mouse tap in a hidden-arrow viewer gutter reveals controls without closing; visible background taps still close', () => {
  for (const pointerType of ['touch', 'pen']) {
    const gallery = mountedGallery();
    click(gallery, 'Enlarge image 1 of 3');
    gallery.advance(3000);
    const target = {};
    // Touch pointer entry precedes pointer down. It must not erase the fact
    // that this first tap is revealing previously hidden controls.
    gallery.act(() => surface(gallery, true).props.onPointerEnter(event({ pointerType })));
    assert.equal(arrowsHidden(gallery, true), true);
    gallery.act(() => surface(gallery, true).props.onPointerDown(event({ pointerType })));
    gallery.act(() => surface(gallery, true).props.onPointerUp(event({ pointerType })));
    gallery.act(() => surface(gallery, true).props.onClick({ target, currentTarget: target }));
    assert.equal(nodes(gallery.tree, 'dialog').length, 1);
    assert.equal(arrowsHidden(gallery, true), false);
    gallery.act(() => surface(gallery, true).props.onPointerDown(event({ pointerType })));
    gallery.act(() => surface(gallery, true).props.onPointerUp(event({ pointerType })));
    gallery.act(() => surface(gallery, true).props.onClick({ target, currentTarget: target }));
    assert.equal(nodes(gallery.tree, 'dialog').length, 0);
    // The independent explicit close action is never swallowed by that tap.
    click(gallery, 'Enlarge image 1 of 3');
    gallery.advance(3000);
    gallery.act(() => surface(gallery, true).props.onPointerDown(event({ pointerType })));
    gallery.act(() => surface(gallery, true).props.onPointerUp(event({ pointerType })));
    click(gallery, 'Close image');
    assert.equal(nodes(gallery.tree, 'dialog').length, 0);
  }
});

test('cancelled idle callbacks cannot hide new activity and all timer work stops on unmount or losing multiple photos', () => {
  const gallery = mountedGallery();
  const oldCallback = gallery.pendingTimers[0].callback;
  gallery.advance(2000);
  gallery.act(surface(gallery).props.onPointerMove);
  gallery.act(oldCallback);
  assert.equal(arrowsHidden(gallery), false);
  const currentCallback = gallery.pendingTimers[0].callback;
  const beforeUnmount = gallery.tree;
  gallery.unmount();
  assert.equal(gallery.pendingTimers.length, 0);
  gallery.act(currentCallback);
  assert.equal(gallery.tree, beforeUnmount, 'A cleaned-up callback cannot update an unmounted gallery');
  const replacement = mountedGallery();
  const pending = replacement.pendingTimers[0].callback;
  replacement.update({ title: 'Single', photos: [photos[0]] });
  assert.equal(replacement.pendingTimers.length, 0);
  replacement.act(pending);
  assert.equal(nodes(replacement.tree, 'button').length, 1);
  replacement.update({ title: 'Empty', photos: [] });
  assert.equal(replacement.pendingTimers.length, 0);
  assert.equal(nodes(replacement.tree, 'button').length, 0);
});

test('shared gallery arrows, thumbnails and keyboard select exact sources and wrap in order', () => {
  const gallery = mountedGallery();
  assert.equal(mainPhoto(gallery), photos[0].src);
  click(gallery, 'Previous image');
  assert.equal(mainPhoto(gallery), photos[2].src);
  click(gallery, 'Next image');
  assert.equal(mainPhoto(gallery), photos[0].src);
  click(gallery, 'Show image 2 of 3');
  assert.equal(mainPhoto(gallery), photos[1].src);
  assert.equal(button(gallery, 'Show image 2 of 3').props['aria-pressed'], true);
  let prevented = 0, stopped = 0;
  gallery.act(() => gallery.tree.props.onKeyDown({ key: 'ArrowRight', preventDefault() { prevented++; }, stopPropagation() { stopped++; } }));
  assert.equal(mainPhoto(gallery), photos[2].src);
  assert.equal(prevented, 1); assert.equal(stopped, 1);
  gallery.act(() => gallery.tree.props.onKeyDown({ key: 'Home', preventDefault() {}, stopPropagation() {} }));
  assert.equal(mainPhoto(gallery), photos[0].src);
  gallery.act(() => gallery.tree.props.onKeyDown({ key: 'End', preventDefault() {}, stopPropagation() {} }));
  assert.equal(mainPhoto(gallery), photos[2].src);
  gallery.act(() => gallery.tree.props.onKeyDown({ key: 'ArrowLeft', altKey: true }));
  assert.equal(mainPhoto(gallery), photos[2].src, 'Browser back shortcut must be left alone');
});

test('enlarging uses a modal dialog, exact full source and restores focus/scroll on Escape or close', () => {
  const source = [{ id: 'sized', src: '/public/medium.webp', thumbnailSrc: '/public/thumb.webp', fullSrc: '/public/full.webp' }];
  const gallery = mountedGallery({ title: 'Original title', photos: source });
  click(gallery, 'Enlarge image 1 of 1');
  const viewer = nodes(gallery.tree, 'dialog')[0];
  assert.ok(viewer);
  const dialog = viewer.props.ref.current;
  assert.equal(dialog.shown, 1);
  assert.equal(dialog.open, true);
  assert.equal(gallery.doc.body.style.overflow, 'hidden');
  assert.notEqual(gallery.doc.activeElement, gallery.opener);
  assert.equal(nodes(viewer, 'img')[0].props.src, '/public/full.webp');
  assert.equal(viewer.props['aria-modal'], 'true');
  let prevented = false;
  gallery.act(() => viewer.props.onCancel({ preventDefault() { prevented = true; } }));
  assert.equal(prevented, true);
  assert.equal(nodes(gallery.tree, 'dialog').length, 0);
  assert.equal(dialog.closed, 1);
  assert.equal(gallery.doc.body.style.overflow, 'auto');
  assert.equal(gallery.doc.activeElement, gallery.opener);
  click(gallery, 'Enlarge image 1 of 1');
  click(gallery, 'Close image');
  assert.equal(nodes(gallery.tree, 'dialog').length, 0);
  assert.equal(gallery.doc.body.style.overflow, 'auto');
});

test('viewer navigation and language changes keep selection and the exact authorized URL', () => {
  const gallery = mountedGallery();
  click(gallery, 'Enlarge image 1 of 3');
  let viewer = nodes(gallery.tree, 'dialog')[0];
  const next = nodes(viewer, 'button').find(node => node.props['aria-label'] === 'Next image');
  gallery.act(() => next.props.onClick(event()));
  assert.equal(mainPhoto(gallery), photos[1].src);
  gallery.language('et');
  viewer = nodes(gallery.tree, 'dialog')[0];
  assert.ok(viewer);
  assert.equal(nodes(viewer, 'img')[0].props.src, photos[1].src);
  assert.ok(button(gallery, 'Sulge pilt'));
  assert.ok(button(gallery, 'Näita pilti 2 3-st'));
  assert.equal(viewer.props.ref.current.shown, 1, 'Changing language must not reopen the dialog');
  gallery.unmount();
  assert.equal(gallery.doc.body.style.overflow, 'auto');
});

test('a horizontal touch swipe changes the photo without opening the viewer; vertical scrolling and cancel do not navigate', () => {
  const gallery = mountedGallery();
  let opener = button(gallery, 'Enlarge image 1 of 3');
  gallery.act(() => opener.props.onPointerDown(event()));
  gallery.act(() => opener.props.onPointerUp(event({ clientX: 50, clientY: 110 })));
  assert.equal(mainPhoto(gallery), photos[1].src);
  click(gallery, 'Enlarge image 2 of 3');
  assert.equal(nodes(gallery.tree, 'dialog').length, 0);
  opener = button(gallery, 'Enlarge image 2 of 3');
  gallery.act(() => opener.props.onPointerDown(event()));
  gallery.act(() => opener.props.onPointerUp(event({ clientX: 80, clientY: 260 })));
  assert.equal(mainPhoto(gallery), photos[1].src);
  click(gallery, 'Enlarge image 2 of 3');
  assert.equal(nodes(gallery.tree, 'dialog').length, 0);
  gallery.act(() => opener.props.onPointerDown(event()));
  gallery.act(() => opener.props.onPointerCancel());
  gallery.act(() => opener.props.onPointerUp(event({ clientX: 10 })));
  assert.equal(mainPhoto(gallery), photos[1].src);
  // Keyboard activation is independent of a cancelled touch gesture.
  gallery.act(() => button(gallery, 'Enlarge image 2 of 3').props.onClick(event({ detail: 0 })));
  assert.equal(nodes(gallery.tree, 'dialog').length, 1);
});

test('empty/single galleries and a replaced selection never create invalid image requests', () => {
  const empty = mountedGallery({ title: 'Empty', photos: [] });
  assert.equal(nodes(empty.tree, 'img').length, 0);
  assert.equal(nodes(empty.tree, 'button').length, 0);
  const single = mountedGallery({ title: 'One', photos: [photos[0]] });
  assert.equal(nodes(single.tree, 'button').length, 1);
  click(single, 'Enlarge image 1 of 1');
  assert.equal(nodes(single.tree, 'dialog').length, 1);
  single.update({ title: 'One', photos: [] });
  assert.equal(nodes(single.tree, 'dialog').length, 0);
  assert.equal(single.doc.body.style.overflow, 'auto');
  const gallery = mountedGallery();
  click(gallery, 'Show image 3 of 3');
  gallery.update({ title: 'Changed', photos: photos.slice(0, 2) });
  assert.equal(mainPhoto(gallery), photos[0].src);
  click(gallery, 'Next image');
  assert.equal(mainPhoto(gallery), photos[1].src);
});

test('ordinary listings retain medium/thumb/full choices, image order and cover fallback', () => {
  const modules = createModules(React);
  const { listingGalleryPhotos } = modules.load('src/features/listing-detail/model/listingGalleryPhotos.ts');
  const input = Object.freeze([
    Object.freeze({ id: 'second', medium_url: '/exact/medium', thumb_url: '/exact/thumb', original_url: '/exact/full' }),
    Object.freeze({ id: 'first', original_url: '/exact/one' }),
    Object.freeze({ id: 'empty' }),
  ]);
  const result = JSON.parse(JSON.stringify(listingGalleryPhotos(input, '/fallback/cover')));
  assert.deepEqual(result, [
    { id: 'second', src: '/exact/medium', thumbnailSrc: '/exact/thumb', fullSrc: '/exact/full' },
    { id: 'first', src: '/exact/one', thumbnailSrc: '/exact/one', fullSrc: '/exact/one' },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(listingGalleryPhotos([], '/fallback/cover'))), [{ id: 'cover', src: '/fallback/cover' }]);
  assert.equal(listingGalleryPhotos([], null).length, 0);
});

for (const language of ['en', 'et']) test(language + ': actual SSR output has a keyboard image button, labelled navigation and selected thumbnail', () => {
  const modules = createModules(React);
  modules.language(language);
  const Gallery = modules.load(galleryModule).default;
  const markup = renderToStaticMarkup(React.createElement(Gallery, { title: 'Test photo', photos }));
  assert.match(markup, /aria-haspopup="dialog"/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /aria-live="polite"/);
  assert.ok(markup.includes(language === 'et' ? 'Suurenda pilti 1 / 3' : 'Enlarge image 1 of 3'));
  assert.ok(markup.includes(language === 'et' ? 'Järgmine pilt' : 'Next image'));
  assert.equal(markup.includes('<dialog'), false, 'The enlarged viewer starts closed');
});
