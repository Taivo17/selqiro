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
  const doc = { activeElement: null, body: { style: { overflow: 'auto' } } };
  class Element {
    isConnected = true;
    focus() { doc.activeElement = this; }
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
  const modules = createModules(hooks, { document: doc, HTMLElement: Element });
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
  render();
  return {
    get tree() { return tree; },
    doc, opener,
    act(callback) { callback(); for (let i = 0; dirty && i < 10; i++) render(); assert.equal(dirty, false); },
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
