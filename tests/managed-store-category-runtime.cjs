'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {createHash} = require('node:crypto'), ts = require('typescript'), React = require('react'), {act} = React;
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..'), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = new Map(), tick = () => new Promise(resolve => setImmediate(resolve));
function recordInput(file) {
  const bytes = fs.readFileSync(file), relative = path.relative(root, file).split(path.sep).join('/'), digest = sha(bytes);
  if (inputs.has(relative)) assert.equal(digest, inputs.get(relative), 'No source change during the test run: ' + relative);
  inputs.set(relative, digest);return bytes.toString();
}
function runtime(fixture, {language = 'en', modules = {}} = {}) {
  const dom = new JSDOM('<!doctype html><div id="test"></div>', {url: 'https://fixture.invalid/v2/my-area/listings/1001/edit', pretendToBeVisual: true});
  const previous = new Map(), cache = new Map();
  for (const [name, value] of Object.entries({window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, StorageEvent: dom.window.StorageEvent, IS_REACT_ACT_ENVIRONMENT: true})) {
    previous.set(name, Object.getOwnPropertyDescriptor(global, name));Object.defineProperty(global, name, {value, configurable: true, writable: true});
  }
  function load(name) {
    const file = path.resolve(root, name), relative = path.relative(root, file).split(path.sep).join('/');
    assert.ok(file.startsWith(root + path.sep));
    if (Object.hasOwn(modules, relative)) return modules[relative];
    if (relative === 'src/shared/supabase/browserClient.ts') return {supabaseBrowserClient: fixture.client};
    if (relative === 'src/shared/i18n/V2LanguageProvider.tsx') return {useV2Language: () => ({language}),
      useV2Translation: catalog => ({language, t: (key, params) => load('lib/i18n/useTranslation.ts').getCatalogTranslation(language, catalog, key, params)})};
    if (cache.has(file)) return cache.get(file).exports;
    const module = {exports: {}};cache.set(file, module);
    const output = ts.transpileModule(recordInput(file), {fileName: file, compilerOptions: {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    }});
    const localRequire = spec => {
      if (spec === 'react') return React;if (spec === 'react/jsx-runtime') return require(spec);
      if (spec === 'next/link') return function Link({prefetch, scroll, ...props}) {return React.createElement('a', props);};
      assert.ok(spec.startsWith('.') || spec.startsWith('@/'), 'Unexpected dependency: ' + spec);
      const stem = spec.startsWith('@/') ? path.join(root, spec.slice(2)) : path.resolve(path.dirname(file), spec);
      return load(fs.existsSync(stem) ? stem : fs.existsSync(stem + '.ts') ? stem + '.ts' : stem + '.tsx');
    };
    vm.runInThisContext('(function(module,exports,require){' + output.outputText + '\n})', {filename: file, timeout: 2000})(module, module.exports, localRequire);
    return module.exports;
  }
  const container = dom.window.document.getElementById('test'), reactRoot = require('react-dom/client').createRoot(container);
  const hook = load('src/features/listing-edit/model/useManagedListingStoreCategories.ts').useManagedListingStoreCategories;
  let current;
  function Observer(props) {current = hook(props);return React.createElement('p', {role: 'status'}, current.error || current.message || 'ready');}
  const render = async (props, Component = Observer) => {await act(async () => {reactRoot.render(React.createElement(Component, props));await tick();});await act(tick);};
  return {fixture, load, container, window: dom.window, render, get state() {return current;},
    api: load('src/entities/listing/api/managedListingStoreCategoriesClient.ts').managedListingStoreCategoryApi,
    identity: load('src/features/v2-shell/model/identityEvents.ts'),
    async action(callback) {let returned;await act(async () => {returned = callback();await returned;await tick();});await act(tick);return returned;},
    async flush() {await act(async () => {await tick();await tick();});},
    async close() {await act(() => reactRoot.unmount());fixture.close();await act(tick);dom.window.close();
      for (const [name, descriptor] of previous) {if (descriptor) Object.defineProperty(global, name, descriptor);else delete global[name];}},
  };
}
module.exports = {runtime, inputs, root, sha, recordInput, act};
