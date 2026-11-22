'use strict';
// Mount the real job detail component. Only data/auth boundaries and unrelated
// contact/share controls are fixtures; no hosted requests or owner reads run.
const test = require('node:test'), assert = require('node:assert/strict');
const React = require('react');
const {JSDOM} = require(process.env.SELQIRO_DOM_JSDOM || 'jsdom');
const {loader, deferred, job, J} = require('./helpers/jobs-public-loader.cjs');
const {getCatalogTranslation} = loader()('lib/i18n/useTranslation.ts');
const tick = () => new Promise(resolve => setImmediate(resolve));

function runtime({language = 'et', read} = {}) {
  const dom = new JSDOM('<!doctype html><main id="test"></main>', {url: 'https://portal.invalid/v2/job/' + J});
  const before = new Map();
  for (const [name, value] of Object.entries({window: dom.window, document: dom.window.document,
    navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true})) {
    before.set(name, Object.getOwnPropertyDescriptor(global, name));
    Object.defineProperty(global, name, {value, configurable: true, writable: true});
  }
  const reads = [], container = dom.window.document.querySelector('#test');
  const root = require('react-dom/client').createRoot(container);
  const load = loader({
    'src/entities/job/api/jobClient.ts': {getPublicJob: (id, signal) => {
      assert.equal(id, J); assert.equal(signal.aborted, false);
      reads.push({id, signal}); return read(id, signal);
    }},
    'src/shared/provider-controls/useViewerReadScope.ts': {useViewerReadScope: scope => {
      assert.equal(scope, 'visibility');
      return {key: 'synthetic-viewer:1', ready: true, error: null, refresh() {throw new Error('unexpected viewer refresh');}};
    }},
    'src/shared/i18n/V2LanguageProvider.tsx': {useV2Translation: catalog => ({language,
      t: (key, params) => getCatalogTranslation(language, catalog, key, params)})},
    'src/features/jobs/model/useJobCategories.ts': {useJobCategories: () => ({items: []})},
    'src/features/jobs/components/JobContactButton.tsx': {__esModule: true,
      default: ({jobId}) => React.createElement('button', {'data-contact-job': jobId}, 'Contact')},
    'src/shared/sharing/ShareOfferButton.tsx': {__esModule: true, default: () => null},
    'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: new Proxy({}, {
      get() {throw new Error('unexpected live client or owner lookup');},
    })},
  });
  const Page = load('src/features/jobs/components/JobDetailPage.tsx').default;
  const act = async callback => React.act(async () => {await callback(); await tick();});
  return {container, reads,
    render: () => act(() => root.render(React.createElement(Page, {jobId: J}))),
    act,
    click: element => act(() => {
      assert.ok(element, 'Expected control is rendered');
      element.dispatchEvent(new dom.window.MouseEvent('click', {bubbles: true, button: 0}));
    }),
    async close() {
      await act(() => root.unmount()); dom.window.close();
      for (const [name, descriptor] of before) {
        if (descriptor) Object.defineProperty(global, name, descriptor); else delete global[name];
      }
    },
  };
}

for (const language of ['et', 'en']) {
  test(language + ': a successful null read explains availability without asserting a lifecycle state', async () => {
    const pending = deferred(), h = runtime({language, read: () => pending.promise});
    try {
      await h.render();
      assert.ok(h.container.querySelector('[role="status"]'), 'Loading stays distinct until the read succeeds');
      assert.equal(h.container.querySelector('h1'), null);
      await h.act(() => pending.resolve(null));
      const heading = h.container.querySelector('h1').textContent;
      assert.equal(heading, language === 'et'
        ? 'See tööpakkumine ei ole praegu avalikult nähtav.' : 'This job is not currently available to view.');
      assert.match(h.container.textContent, language === 'et'
        ? /Pakkumine võib olla lõpetatud, peatatud või aegunud\./ : /It may be closed, paused or expired\./);
      assert.doesNotMatch(heading, /Suletud|Lõpetatud|Aegunud|Closed|Expired/);
      assert.equal(h.container.querySelector('[role="alert"]'), null);
      assert.equal(h.container.querySelector('button'), null, 'Null is not presented as a loading error or owner action');
      const links = [...h.container.querySelectorAll('a')].map(link => [link.getAttribute('href'), link.textContent]);
      assert.deepEqual(links, language === 'et'
        ? [['/v2/messages', 'Tagasi vestlustesse'], ['/v2/jobs', 'Vaata kõiki tööpakkumisi']]
        : [['/v2/messages', 'Back to conversations'], ['/v2/jobs', 'View all jobs']]);
      assert.equal(h.reads.length, 1, 'The explanation does not trigger an owner or status fallback');
    } finally {await h.close();}
  });
}

test('a rejected read remains an error, and the existing retry can load an active job', async () => {
  let attempt = 0;
  const h = runtime({read: async () => {
    if (++attempt === 1) throw new Error('synthetic unavailable transport');
    return job();
  }});
  try {
    await h.render();
    assert.match(h.container.querySelector('[role="alert"]').textContent,
      /Tööpakkumisi ei õnnestunud laadida\. Proovi uuesti\./);
    assert.doesNotMatch(h.container.textContent, /Pakkumine võib olla|avalikult nähtav/);
    assert.equal(h.container.querySelector('a[href="/v2/messages"]'), null);
    const retry = h.container.querySelector('button'); assert.equal(retry.textContent, 'Proovi uuesti');
    await h.click(retry);
    assert.equal(h.reads.length, 2);
    assert.equal(h.container.querySelector('[role="alert"]'), null);
    assert.equal(h.container.querySelector('h1').textContent, 'Test engineer');
    assert.match(h.container.textContent, /Work with a local team\./);
    assert.ok(h.container.querySelector('button[data-contact-job="' + J + '"]'));
    assert.doesNotMatch(h.container.textContent, /Pakkumine võib olla|avalikult nähtav/);
  } finally {await h.close();}
});

test('an active job retains its content, publisher and existing navigation', async () => {
  const h = runtime({read: async () => job()});
  try {
    await h.render();
    assert.equal(h.container.querySelector('h1').textContent, 'Test engineer');
    assert.match(h.container.textContent, /Work with a local team\./);
    assert.equal(h.container.querySelector('a[href="/v2/profile/public-employer"]').textContent, 'Public employer');
    assert.ok(h.container.querySelector('a[href="/v2/jobs"]'));
    assert.equal(h.container.querySelector('a[href="/v2/messages"]'), null);
    assert.ok(h.container.querySelector('button[data-contact-job="' + J + '"]'));
    assert.equal(h.reads.length, 1);
  } finally {await h.close();}
});
