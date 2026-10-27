/* New public-profile read boundaries only. Actual TS modules, synthetic transport/hooks.
 * This suite is not a database, browser, Auth or production integration result. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const parserPath = 'src/entities/profile/model/publicProfileOfferingsV1.ts';
const identity = 'a1000000-0000-4000-8000-000000000001';
const otherIdentity = 'a1000000-0000-4000-8000-000000000002';
const serviceId = 'b1000000-0000-4000-8000-000000000001';
const showcaseId = 'c1000000-0000-4000-8000-000000000001';
const imageId = 'd1000000-0000-4000-8000-000000000001';
const stamp = '2026-10-24T12:00:00.000123+00:00';
const request = { identityId: identity, sellerSlug: 'viewed-seller', limit: 80 };
const clone = value => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const drain = () => new Promise(resolve => setImmediate(resolve));

function image(kind = 'service') {
  return { id: imageId, identity_id: identity,
    [kind === 'service' ? 'service_id' : 'showcase_id']: kind === 'service' ? serviceId : showcaseId,
    original_url: 'https://example.invalid/original.png', medium_url: 'https://example.invalid/medium.png',
    thumb_url: null, sort_order: 0, is_primary: true, created_at: stamp };
}
function service() {
  return { id: serviceId, identity_id: identity, title: 'Public service', description: 'Service description',
    category: 'services', subcategory: null, image_url: 'https://example.invalid/fallback.png',
    price_amount: '12.30', currency: 'EUR', price_type: 'fixed', country: 'Eesti', city: 'Tallinn', location: null,
    status: 'published', sort_order: 0, published_at: stamp, created_at: stamp, updated_at: stamp,
    images: [image()] };
}
function showcase() {
  return { id: showcaseId, identity_id: identity, title: 'Public showcase', description: 'Showcase description',
    category: 'craft', status: 'published', sort_order: 0, published_at: stamp,
    active_until: '2026-10-24T12:00:00.000124+00:00', created_at: stamp, updated_at: stamp,
    images: [image('showcase')] };
}
function response(kind = 'service') {
  return { schema_version: 1,
    content_scope: kind === 'service' ? 'public_profile_services' : 'public_profile_product_showcases',
    seller_slug: request.sellerSlug, identity_id: identity, profile_available: true,
    result_limit: request.limit, read_at: stamp, items: [kind === 'service' ? service() : showcase()] };
}

function realm(options = {}) {
  const cache = new Map();
  const calls = [];
  const tables = [];
  const sharedClient = {
    rpc(name, args) {
      assert.equal(this, sharedClient, 'keep the shared session-bearing client');
      calls.push({ name, args: clone(args) });
      return options.rpc ? options.rpc(name, args) : Promise.resolve({ data: response(name.includes('services') ? 'service' : 'showcase'), error: null });
    },
    from(name) {
      tables.push(name);
      assert.equal(options.v2, false, 'a V2 read must never fall back to a table read');
      const query = {};
      for (const method of ['select', 'eq', 'gt', 'order', 'in']) query[method] = () => query;
      query.limit = () => Promise.resolve({ data: [], error: null });
      return query;
    },
  };
  function load(relative) {
    const file = path.resolve(root, relative);
    const name = path.relative(root, file).split(path.sep).join('/');
    assert.ok(file.startsWith(root + path.sep));
    if (options.modules && Object.hasOwn(options.modules, name)) return options.modules[name];
    if (name === 'src/shared/supabase/browserClient.ts') return { supabaseBrowserClient: sharedClient };
    if (name === 'src/shared/config/v2Integration.ts') return { v2IntegrationEnabled: () => options.v2 !== false };
    if (cache.has(file)) return cache.get(file).exports;
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } });
    assert.equal(output.diagnostics.filter(value => value.category === ts.DiagnosticCategory.Error).length, 0);
    const module = { exports: {} }; cache.set(file, module);
    function localRequire(specifier) {
      if (specifier === 'react') { assert.ok(options.hooks); return options.hooks; }
      assert.ok(specifier.startsWith('.'), 'unexpected external import: ' + specifier);
      const source = path.resolve(path.dirname(file), specifier);
      const resolved = [source + '.ts', source + '.tsx', source].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      assert.ok(resolved, specifier);
      return load(resolved);
    }
    vm.runInNewContext(output.outputText, {
      module, exports: module.exports, require: localRequire, URL, Error, Date: options.Date || Date,
    }, { filename: file, timeout: 2000 });
    return module.exports;
  }
  return { load, calls, tables };
}
const parser = realm().load(parserPath);
const cases = [
  { kind: 'service', parse: parser.parsePublicProfileServicesV1, api: 'src/entities/service/api/getPublicServices.ts', method: 'getPublicServices', rpc: 'get_public_profile_services_v1', hook: 'src/features/public-profile/model/usePublicProfileServices.ts', hookMethod: 'usePublicProfileServices', stateKey: 'services' },
  { kind: 'showcase', parse: parser.parsePublicProfileShowcasesV1, api: 'src/entities/product-showcase/api/getPublicProductShowcases.ts', method: 'getPublicProductShowcases', rpc: 'get_public_profile_showcases_v1', hook: 'src/features/public-profile/model/usePublicProfileProductShowcases.ts', hookMethod: 'usePublicProfileProductShowcases', stateKey: 'showcases' },
];

test('populated responses map into the existing public models and use the bound primary gallery', () => {
  const services = parser.parsePublicProfileServicesV1(response(), request);
  assert.equal(services.length, 1);
  assert.equal(services[0].identityId, identity);
  assert.equal(services[0].priceAmount, 12.3);
  assert.equal(services[0].currency, 'EUR');
  assert.equal(services[0].imageUrl, 'https://example.invalid/medium.png');
  assert.equal(services[0].images[0].serviceId, serviceId);
  const showcases = parser.parsePublicProfileShowcasesV1(response('showcase'), request);
  assert.equal(showcases[0].images[0].showcaseId, showcaseId);
  assert.equal(showcases[0].imageUrl, 'https://example.invalid/medium.png');
});

for (const c of cases) {
  test(`${c.kind}: identity, slug, version, scope and private-field failures reject the whole response`, () => {
    for (const change of [
      value => { value.identity_id = otherIdentity; },
      value => { value.seller_slug = 'different-seller'; },
      value => { value.schema_version = 2; },
      value => { value.content_scope = 'private_owner'; },
      value => { value.result_limit = 79; },
      value => { value.private_payload = {}; },
      value => { value.items[0].identity_id = otherIdentity; },
      value => { value.items[0].status = 'draft'; },
      value => { value.items[0].status = 'archived'; },
      value => { value.items[0].storage_path = 'private/path'; },
      value => { delete value.items[0].title; },
      value => { value.items[0].published_at = null; },
      value => { value.items[0].created_at = '2026-02-31T12:00:00+00:00'; },
    ]) {
      const value = response(c.kind); change(value);
      assert.throws(() => c.parse(value, request));
    }
  });

  test(`${c.kind}: gallery parent/identity bindings, duplicates, limits and URL credentials are enforced`, () => {
    for (const change of [
      row => { row.images[0].identity_id = otherIdentity; },
      row => { row.images[0][c.kind === 'service' ? 'service_id' : 'showcase_id'] = otherIdentity; },
      row => { row.images[0].uploaded_by_user_id = otherIdentity; },
      row => { row.images[0].original_url = 'https://user:secret@example.invalid/image.png'; },
      row => { row.images[0].medium_url = 'javascript:alert(1)'; },
      row => { row.images[0].thumb_url = '/unqualified.png'; },
      row => { row.images.push(clone(row.images[0])); },
      row => { row.images = Array.from({ length: 11 }, (_, index) => ({ ...row.images[0], id: `d1000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, is_primary: index === 0 })); },
    ]) {
      const value = response(c.kind); change(value.items[0]);
      assert.throws(() => c.parse(value, request));
    }
  });

  test(`${c.kind}: successful empty and unavailable profiles are distinct from malformed responses`, () => {
    const empty = response(c.kind); empty.items = [];
    assert.deepEqual(clone(c.parse(empty, request)), []);
    const absent = { ...empty, profile_available: false, identity_id: null };
    assert.deepEqual(clone(c.parse(absent, request)), []);
    assert.throws(() => c.parse({ ...absent, identity_id: identity }, request));
    assert.throws(() => c.parse({ ...absent, items: response(c.kind).items }, request));
    assert.throws(() => c.parse({ ...empty, profile_available: true, identity_id: null }, request));
    assert.throws(() => c.parse(null, request));
  });

  test(`${c.kind}: parent count is bounded and repeated parent/image IDs cannot be shown twice`, () => {
    const value = response(c.kind);
    value.items = Array.from({ length: 80 }, (_, index) => ({ ...value.items[0], id: `b1000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, images: [] }));
    assert.equal(c.parse(value, request).length, 80);
    value.items.push(clone(value.items[0]));
    assert.throws(() => c.parse(value, request));
    value.items = [clone(value.items[0]), clone(value.items[0])];
    assert.throws(() => c.parse(value, request));
  });

  test(`${c.kind}: one session-bearing RPC carries only the viewed slug and bounded limit`, async () => {
    const env = realm();
    const rows = await env.load(c.api)[c.method]({ ...request });
    assert.equal(rows.length, 1);
    assert.deepEqual(env.calls, [{ name: c.rpc, args: { p_seller_slug: request.sellerSlug, p_result_limit: 80 } }]);
    assert.deepEqual(env.tables, []);
  });

  test(`${c.kind}: denied, malformed and rejected RPC responses remain generic errors with no fallback`, async () => {
    for (const rpc of [
      () => Promise.resolve({ data: null, error: { message: 'permission denied for private_helper secret SQL' } }),
      () => Promise.resolve({ data: { ...response(c.kind), identity_id: otherIdentity }, error: null }),
      () => Promise.reject(new Error('private transport details')),
    ]) {
      const env = realm({ rpc });
      await assert.rejects(env.load(c.api)[c.method]({ ...request }), error => {
        assert.match(error.message, /ei saanud laadida/);
        assert.doesNotMatch(error.message, /private_helper|secret|transport details/);
        return true;
      });
      assert.equal(env.calls.length, 1);
      assert.deepEqual(env.tables, []);
    }
  });

  test(`${c.kind}: a missing or invalid viewed slug is rejected before dispatch`, async () => {
    for (const sellerSlug of [undefined, null, '', ' seller ', 'x'.repeat(161)]) {
      const env = realm();
      await assert.rejects(env.load(c.api)[c.method]({ identityId: identity, sellerSlug, limit: 80 }));
      assert.equal(env.calls.length, 0);
      assert.deepEqual(env.tables, []);
    }
  });

  test(`${c.kind}: caller mutation during the RPC cannot rebind the expected identity or slug`, async () => {
    const pending = deferred();
    const env = realm({ rpc: () => pending.promise });
    const input = { ...request };
    const result = env.load(c.api)[c.method](input);
    input.identityId = otherIdentity; input.sellerSlug = 'other'; input.limit = 1;
    pending.resolve({ data: response(c.kind), error: null });
    assert.equal((await result)[0].identityId, identity);
  });

  test(`${c.kind}: the non-V2 path retains its existing direct-table read`, async () => {
    const env = realm({ v2: false });
    assert.deepEqual(clone(await env.load(c.api)[c.method]({ identityId: identity })), []);
    assert.equal(env.calls.length, 0);
    assert.deepEqual(env.tables, [c.kind === 'service' ? 'services' : 'product_showcases']);
  });
}

test('service amount and currency must match the explicit wire grammar; no EUR inference', () => {
  for (const change of [
    value => { value.price_amount = 12.3; },
    value => { value.price_amount = '-1.00'; },
    value => { value.price_amount = '10000000000.00'; },
    value => { value.currency = null; },
    value => { value.currency = 'eur'; },
    value => { value.price_type = 'unknown'; },
  ]) {
    const value = response(); change(value.items[0]);
    assert.throws(() => parser.parsePublicProfileServicesV1(value, request));
  }
  const value = response(); value.items[0].price_amount = null; value.items[0].price_type = 'contact';
  assert.equal(parser.parsePublicProfileServicesV1(value, request)[0].priceAmount, null);
});

test('showcase expiry uses the server timestamp with microsecond precision, independent of the browser clock', () => {
  class FutureClock extends Date { static now() { return Date.parse('2099-01-01T00:00:00Z'); } }
  const futureParser = realm({ Date: FutureClock }).load(parserPath);
  const value = response('showcase');
  assert.equal(futureParser.parsePublicProfileShowcasesV1(value, request).length, 1);
  for (const activeUntil of [stamp, '2026-10-24T12:00:00.000122+00:00', '2026-10-24T11:59:59.999999+00:00']) {
    value.items[0].active_until = activeUntil;
    assert.throws(() => futureParser.parsePublicProfileShowcasesV1(value, request));
  }
});

function hookRuntime() {
  const state = [];
  const effects = [];
  let stateIndex = 0, effectIndex = 0;
  let pending = [];
  return {
    hooks: {
      useState(initial) {
        const index = stateIndex++;
        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
        return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
      },
      useEffect(effect, deps) {
        const index = effectIndex++;
        if (!effects[index] || deps.some((value, key) => !Object.is(value, effects[index].deps[key]))) pending.push({ index, effect, deps });
      },
    },
    begin() { stateIndex = 0; effectIndex = 0; pending = []; },
    flush() {
      for (const item of pending) {
        effects[item.index]?.cleanup?.();
        effects[item.index] = { deps: item.deps, cleanup: item.effect() };
      }
      pending = [];
    },
    unmount() { for (const effect of effects) effect?.cleanup?.(); },
  };
}

for (const c of cases) {
  test(`${c.kind} hook: identity and slug changes hide old rows before the effect, and late results cannot replace the new scope`, async () => {
    const hooks = hookRuntime();
    const pending = [];
    const inputs = [];
    const env = realm({ hooks: hooks.hooks, modules: { [c.api]: { [c.method](input) { inputs.push(clone(input)); const value = deferred(); pending.push(value); return value.promise; } } } });
    const useHook = env.load(c.hook)[c.hookMethod];
    const render = profile => { hooks.begin(); return useHook(profile); };
    const a = { identityId: identity, slug: 'seller-a' };
    const b = { identityId: otherIdentity, slug: 'seller-b' };
    const renamed = { identityId: otherIdentity, slug: 'seller-b-renamed' };
    assert.equal(render(a).loading, true); hooks.flush();
    pending[0].resolve([{ id: 'visible-a' }]); await drain();
    assert.equal(render(a)[c.stateKey][0].id, 'visible-a');
    const switching = render(b);
    assert.deepEqual(clone(switching[c.stateKey]), []); assert.equal(switching.loading, true);
    hooks.flush();
    assert.equal(render(renamed).loading, true); hooks.flush();
    pending[2].resolve([{ id: 'visible-renamed' }]); await drain();
    assert.equal(render(renamed)[c.stateKey][0].id, 'visible-renamed');
    pending[1].resolve([{ id: 'late-old-scope' }]); await drain();
    assert.equal(render(renamed)[c.stateKey][0].id, 'visible-renamed');
    assert.deepEqual(inputs, [
      { identityId: identity, sellerSlug: 'seller-a', limit: 80 },
      { identityId: otherIdentity, sellerSlug: 'seller-b', limit: 80 },
      { identityId: otherIdentity, sellerSlug: 'seller-b-renamed', limit: 80 },
    ]);
    hooks.unmount();
  });

  test(`${c.kind} hook: a read failure stays an error; a later genuine empty scope clears it`, async () => {
    const hooks = hookRuntime();
    let call = 0;
    const env = realm({ hooks: hooks.hooks, modules: { [c.api]: { [c.method]() { return ++call === 1 ? Promise.reject(new Error('Read unavailable')) : Promise.resolve([]); } } } });
    const useHook = env.load(c.hook)[c.hookMethod];
    const render = profile => { hooks.begin(); return useHook(profile); };
    const a = { identityId: identity, slug: 'seller-a' };
    const b = { identityId: identity, slug: 'empty-seller' };
    render(a); hooks.flush(); await drain();
    assert.equal(render(a).error, 'Read unavailable'); assert.equal(render(a).loading, false);
    assert.equal(render(b).error, null); assert.equal(render(b).loading, true);
    hooks.flush(); await drain();
    assert.equal(render(b).error, null); assert.equal(render(b).loading, false);
    assert.deepEqual(clone(render(b)[c.stateKey]), []);
    hooks.unmount();
  });
}
