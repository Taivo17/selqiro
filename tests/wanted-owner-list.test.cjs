/* Real source modules, synthetic RPC and JSX/hooks. No DB, network or React DOM.
 * Run with the project's installed TypeScript: node --test --test-reporter=tap ... */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const E = 'src/entities/marketplace-item/';
const F = 'src/features/my-area/';
const ID = '11111111-1111-4111-8111-111111111111';
const identity = '22222222-2222-4222-8222-222222222222';
const clone = value => JSON.parse(JSON.stringify(value));
const normal = value => value.replace(/\s+/g, ' ');
function summary() {
  return { version: 1, budget: { mode: 'maximum', amount: 5000, currency: 'EUR' },
    search_area: { country_code: 'EE', city_or_municipality: 'Rapla maakond', region: 'Rapla maakond' } };
}
function row(kind = 'wanted') {
  return { content_type: 'horse_offer', content_id: ID, identity_id: identity, owner_user_id: null,
    source_status: 'draft', lifecycle_status: 'draft', content_variant: kind, title: 'Otsin hobust',
    description: 'Soov', price_text: null, price_amount: null, price_type: 'contact', currency: 'EUR',
    city: null, region: null, location_label: null, active_until: null,
    created_at: '2026-09-23T00:00:00Z', sort_at: '2026-09-23T00:00:00Z', search_text: 'otsin hobust',
    wanted_summary: kind === 'wanted' ? summary() : null };
}
function realm({ rpc = async () => ({ data: [], error: null }), react } = {}) {
  const cache = new Map();
  function load(rel) {
    const file = path.resolve(root, rel);
    assert.ok(file.startsWith(root + path.sep));
    if (file === path.join(root, 'src/shared/supabase/browserClient.ts')) {
      return { supabaseBrowserClient: { rpc } }; // Nothing else can read/write remotely.
    }
    if (cache.has(file)) return cache.get(file).exports;
    const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
    assert.deepEqual(out.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error), []);
    const module = { exports: {} }; cache.set(file, module);
    const localRequire = name => {
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === 'next/link') return { __esModule: true, default: props => ({ type: 'a', props }) };
      if (name === 'react') { assert.ok(react, 'Explicit hook fixture required'); return react; }
      assert.ok(name.startsWith('.'), 'Unexpected external dependency: ' + name);
      const base = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
    };
    vm.runInNewContext(out.outputText, { module, exports: module.exports, require: localRequire,
      Date, Intl, Number, String, Object, Array, Set, Map, JSON, Promise, Error }, { filename: file, timeout: 1500 });
    return module.exports;
  }
  return load;
}
const load = realm();
const parse = load(E + 'model/ownerWantedSummary.ts').parseOwnerWantedSummary;
const map = load(E + 'api/mappers.ts').mapOwnerMarketplaceItemRow;
const mapRows = load(E + 'api/mappers.ts').mapOwnerMarketplaceItemRows;
const card = load(F + 'model/mapMyAreaMarketplaceItemRow.ts').mapMyAreaMarketplaceItemRow;
const labels = value => card(map({ ...row(), wanted_summary: value }));
function render(el) {
  if (el == null || typeof el === 'boolean') return [];
  if (Array.isArray(el)) return el.flatMap(render);
  if (typeof el !== 'object') return [String(el)];
  if (typeof el.type === 'function') return render(el.type(el.props));
  return [{ type: el.type, props: el.props || {}, children: render(el.props?.children) }];
}
const all = nodes => nodes.flatMap(n => typeof n === 'string' ? [] : [n, ...all(n.children)]);
const text = nodes => nodes.map(n => typeof n === 'string' ? n : text(n.children)).join(' ');

test('valid maximum and coarse area arrive in the list without re-saving or details reads', () => {
  const input = row(), before = clone(input), result = card(map(input));
  assert.equal(normal(result.priceLabel), 'Eelarve kuni 5 000 €');
  assert.equal(result.locationLabel, 'Rapla maakond');
  assert.equal(result.priceAmount, null); // Budget is NOT a generic seller price.
  assert.equal(result.city, null); assert.equal(result.region, null);
  assert.equal(result.key, 'horse_offer:' + ID); assert.deepEqual(input, before);
});
for (const amount of [0, 0.01, 1.2, 1234.56, 9999999999.99]) test('valid budget amount ' + amount, () => {
  const s = summary(); s.budget.amount = amount;
  assert.equal(parse(s).budget.amount, amount);
  const expected = 'Eelarve kuni ' + new Intl.NumberFormat('et-EE', { useGrouping: true, maximumFractionDigits: 2 }).format(amount) + ' €';
  assert.equal(normal(labels(s).priceLabel), normal(expected)); assert.notEqual(labels(s).priceLabel, 'Tasuta');
});
test('explicit contact/null budget remains flexible, not a seller price agreement', () => {
  const s = summary(); s.budget = { mode: 'contact', amount: null, currency: 'EUR' };
  assert.equal(labels(s).priceLabel, 'Eelarve on paindlik');
});
for (const value of [null, undefined, [], true, '5000', -1, NaN, Infinity, 1.001, 1e-7, 10000000000]) {
  test('invalid amount is unavailable, not rounded/coerced: ' + String(value), () => {
    const s = summary(); s.budget.amount = value;
    assert.equal(parse(s).budget, null); assert.equal(labels(s).priceLabel, 'Eelarve detailvaates');
    assert.equal(labels(s).locationLabel, 'Rapla maakond');
  });
}
for (const budget of [null, undefined, [], false, {}, { mode: 'contact', currency: 'EUR' },
  { mode: 'contact', amount: 0, currency: 'EUR' }, { mode: 'maximum', amount: 5, currency: 'USD' },
  { mode: 'anything', amount: 5, currency: 'EUR' }]) test('invalid budget shape/mode/currency', () => {
  const s = summary(); s.budget = budget;
  assert.equal(parse(s).budget, null); assert.equal(labels(s).priceLabel, 'Eelarve detailvaates');
});
for (const invalid of [null, undefined, [], '', 'json', 1, false, {}, { version: '1' }, { version: 2 }]) {
  test('unknown/missing envelope is unavailable: ' + JSON.stringify(invalid), () => {
    assert.equal(parse(invalid), null);
    assert.equal(labels(invalid).priceLabel, 'Eelarve detailvaates');
    assert.equal(labels(invalid).locationLabel, 'Otsingupiirkond detailvaates');
  });
}
for (const [city, region, expected] of [
  [' Rapla ', ' Rapla maakond ', 'Rapla · Rapla maakond'],
  [null, 'Rapla maakond', 'Rapla maakond'], ['Rapla', null, 'Rapla'],
  [null, null, 'Otsingupiirkond lisamata'], [' ', '', 'Otsingupiirkond lisamata'],
  ['Rapla maakond', 'Rapla maakond', 'Rapla maakond'],
  ['ü'.repeat(160), null, 'ü'.repeat(160)], ['🐎'.repeat(160), null, '🐎'.repeat(160)],
]) test('supported search area: ' + String(city).slice(0, 25), () => {
  const s = summary(); Object.assign(s.search_area, { city_or_municipality: city, region });
  const before = clone(s); assert.equal(labels(s).locationLabel, expected); assert.deepEqual(s, before);
});
for (const area of [null, undefined, [], {}, { country_code: 'EE' },
  { country_code: 'FI', city_or_municipality: 'Helsinki', region: null },
  { country_code: 'EE', city_or_municipality: {}, region: null },
  { country_code: 'EE', city_or_municipality: null, region: false },
  { country_code: 'EE', city_or_municipality: null, region: 'x'.repeat(161) },
]) test('invalid area is unavailable but valid budget survives', () => {
  const s = summary(); s.search_area = area;
  assert.equal(parse(s).searchArea, null); assert.equal(labels(s).locationLabel, 'Otsingupiirkond detailvaates');
  assert.equal(normal(labels(s).priceLabel), 'Eelarve kuni 5 000 €');
});
test('only whitelisted values are retained, even with unexpected private nested keys', () => {
  const s = summary(); s.details = 'SECRET'; s.budget.other = 'SECRET'; s.search_area.lat = 'SECRET';
  const raw = { ...row(), wanted_summary: s, details: { health: 'SECRET' }, horse_lat: 'SECRET' };
  const mapped = map(raw);
  assert.doesNotMatch(JSON.stringify(mapped), /SECRET|horse_lat|details/);
  assert.deepEqual(Object.keys(mapped.wantedSummary).sort(), ['budget', 'searchArea', 'version']);
  assert.deepEqual(Object.keys(mapped.wantedSummary.searchArea).sort(), ['cityOrMunicipality', 'countryCode', 'region']);
});
test('unsupported summary does not use seller price or actual horse location', () => {
  const raw = { ...row(), wanted_summary: null, price_amount: 7777, price_text: 'MÜÜGIHIND',
    price_type: 'free', city: 'HOBOSE ASUKOHT', region: 'MÜÜJA PIIRKOND', location_label: 'TÄPNE KOHT' };
  const result = card(map(raw));
  assert.equal(result.priceLabel, 'Eelarve detailvaates');
  assert.equal(result.locationLabel, 'Otsingupiirkond detailvaates');
});
for (const kind of ['sale', 'free_transfer', 'lease', 'co_rider']) test('non-wanted horse retains presentation and controls: ' + kind, () => {
  const raw = { ...row(kind), title: 'Pakkumine', price_type: kind === 'free_transfer' ? 'free' : 'fixed',
    price_amount: kind === 'free_transfer' ? null : 1234, location_label: 'Tartu', wanted_summary: summary() };
  const mapped = map(raw); assert.equal(mapped.wantedSummary, null);
  const result = card(mapped); assert.equal(result.locationLabel, 'Tartu');
  assert.equal(normal(result.priceLabel), kind === 'free_transfer' ? 'Tasuta' : normal(new Intl.NumberFormat('et-EE', { maximumFractionDigits: 2 }).format(1234) + ' €'));
  assert.equal(result.canChangeStatus, false); assert.deepEqual(clone(result.allowedStatusActions), []);
});
test('ordinary listing ignores unwanted summary, keeps numeric-text ID and controls/routes', () => {
  const result = card(map({ ...row(), content_type: 'listing', content_id: '9007199254740993', content_variant: null,
    price_amount: '1234.50', price_text: '1234.50', location_label: 'Paide', source_status: 'sold' }));
  assert.equal(result.key, 'listing:9007199254740993'); assert.equal(result.locationLabel, 'Paide');
  assert.equal(normal(result.priceLabel), normal(new Intl.NumberFormat('et-EE', { maximumFractionDigits: 2 }).format(1234.5) + ' €')); assert.equal(result.status, 'sold');
  assert.equal(result.editHref, '/v2/my-area/listings/9007199254740993/edit');
  assert.equal(result.detailHref, '/v2/listing/9007199254740993');
  assert.equal(result.canChangeStatus, true); assert.deepEqual(clone(result.allowedStatusActions), ['active', 'paused', 'sold']);
  assert.ok(!('wantedSummary' in result));
});
for (const bad of [null, false, 'text', [], 2]) test('malformed row gives controlled error', () => {
  assert.throws(() => mapRows([bad]), /vigane rida/);
});
test('list shape validation and empty data behavior stay explicit', () => {
  for (const data of [null, undefined, []]) assert.deepEqual(clone(mapRows(data)), []);
  assert.throws(() => mapRows({}), /massiiv/); assert.throws(() => mapRows([{ ...row(), content_type: 'unknown' }]), /content_type/);
});
test('one bounded v2 RPC, parameters/order/empty sections preserved, no detail calls', async () => {
  const calls = [], inputs = [row(), { ...row('sale'), content_id: 'other', wanted_summary: null },
    { ...row(), content_id: 'third', wanted_summary: { version: 1, budget: null, search_area: null } }];
  const l = realm({ rpc: async (name, args) => { calls.push([name, clone(args)]); return { data: inputs, error: null }; } });
  const api = l(E + 'api/getMyMarketplaceItems.ts').getMyMarketplaceItems;
  const result = await api({ limit: 900, offset: 4.9, status: ' draft ', search: ' hobune ', storeCategoryId: ' cat ' });
  assert.deepEqual(calls, [['get_my_marketplace_items_v2', { p_result_limit: 500, p_result_offset: 4,
    p_status_filter: 'draft', p_search_query: 'hobune', p_store_category_filter: 'cat' }]]);
  assert.deepEqual(clone(result.map(r => r.contentId)), [ID, 'other', 'third']);
  assert.equal(result[2].wantedSummary.budget, null);
});
for (const [input, limit, offset] of [[{}, 80, 0], [{ limit: NaN, offset: Infinity }, 80, 0],
  [{ limit: -1, offset: -5 }, 1, 0], [{ limit: 10.9, offset: 3.9 }, 10, 3]]) test('limit/offset normalization retained', async () => {
  const l = realm({ rpc: async (name, args) => { assert.equal(args.p_result_limit, limit); assert.equal(args.p_result_offset, offset);
    return { data: [], error: null }; } });
  assert.deepEqual(clone(await l(E + 'api/getMyMarketplaceItems.ts').getMyMarketplaceItems(input)), []);
});
test('API failure surfaces error without silent v1 fallback or automatic repeat', async () => {
  let calls = 0;
  const l = realm({ rpc: async () => { calls++; return { data: null, error: { message: 'Cannot read owner items' } }; } });
  await assert.rejects(l(E + 'api/getMyMarketplaceItems.ts').getMyMarketplaceItems(), /Cannot read owner items/);
  assert.equal(calls, 1);
});
test('existing My Area input adapter forwards its actual object contract to v2', async () => {
  const l = realm({ rpc: async (name, args) => {
    assert.equal(name, 'get_my_marketplace_items_v2'); assert.equal(args.p_search_query, 'sisu');
    assert.equal(args.p_status_filter, 'all'); assert.equal(args.p_store_category_filter, 'cat');
    return { data: [row()], error: null };
  } });
  const result = await l(F + 'model/getMyAreaMarketplaceItemRows.ts').getMyAreaMarketplaceItemRows({
    limit: 500, offset: 0, searchQuery: 'sisu', statusFilter: 'all', storeCategoryFilter: 'cat' });
  assert.equal(normal(result[0].priceLabel), 'Eelarve kuni 5 000 €');
});
test('wanted row renders budget and untruncated search area, keeps existing detail link', () => {
  const result = card(map(row()));
  const nodes = render(load(F + 'components/MyAreaHorseOfferRow.tsx').default({ item: result }));
  assert.match(normal(text(nodes)), /Eelarve kuni 5 000 €/); assert.match(text(nodes), /Rapla maakond/);
  const meta = all(nodes).find(n => n.props.title === 'Otsin hobust · Rapla maakond');
  assert.ok(meta); assert.match(meta.props.className, /break-words/); assert.doesNotMatch(meta.props.className, /truncate/);
  assert.equal(all(nodes).filter(n => n.type === 'a')[0].props.href, '/v2/my-area/horse-offers/' + ID);
  assert.equal(all(nodes).filter(n => ['input', 'button', 'select'].includes(n.type)).length, 0);
  assert.match(all(nodes)[0].props.className, /grid-cols-\[minmax\(0,1fr\)\]/);
});
test('wanted list price/area agrees with existing detail formatter for supported values', () => {
  const present = load('src/entities/horse-offer/model/ownerPresentation.ts').getOwnerHorsePresentation;
  for (const amount of [0, 5.25, 5000, 9999999999.99, null]) {
    const s = summary(); if (amount === null) s.budget = { mode: 'contact', amount: null, currency: 'EUR' }; else s.budget.amount = amount;
    const p = present({ offerType: 'wanted', details: { schema_version: 1, branch: 'wanted', wanted: { budget: s.budget, search_area: s.search_area } } });
    assert.equal(normal(labels(s).priceLabel), normal(p.priceLabel)); assert.equal(labels(s).locationLabel, p.locationLabel);
  }
});
test('late response after list hook cleanup cannot replace the newer filter result', async () => {
  const effects = [], states = [], pending = [];
  const l = realm({ rpc: () => new Promise(resolve => pending.push(resolve)), react: {
    useState: init => [init, next => states.push(next)], useEffect: fn => effects.push(fn),
  } });
  const hook = l(F + 'model/useMyAreaListings.ts').useMyAreaListings;
  hook({ searchQuery: 'old' }); const cleanup = effects.shift()(); cleanup();
  hook({ searchQuery: 'new' }); effects.shift()();
  pending[1]({ data: [{ ...row(), title: 'NEW' }], error: null });
  await new Promise(resolve => setImmediate(resolve));
  pending[0]({ data: [{ ...row(), title: 'OLD' }], error: null });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(states.at(-1).listings[0].title, 'NEW'); assert.equal(states.at(-1).loading, false);
});
test('strict typecheck of actual new parser/API/row mapping with only fake transport declaration', () => {
  const options = { strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2017,
    module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, types: [], lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'] };
  const host = ts.createCompilerHost(options), read = host.readFile;
  host.readFile = f => path.resolve(f) === path.join(root, 'src/shared/supabase/browserClient.ts')
    ? 'export declare const supabaseBrowserClient: {rpc(name:string,args:object):Promise<{data:unknown;error:{message?:string}|null}>};'
    : read(f);
  const names = [E + 'api/getMyMarketplaceItems.ts', F + 'model/mapMyAreaMarketplaceItemRow.ts'];
  const errors = ts.getPreEmitDiagnostics(ts.createProgram(names.map(n => path.join(root, n)), options, host))
    .filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, ts.formatDiagnosticsWithColorAndContext(errors,
    { getCurrentDirectory: () => root, getCanonicalFileName: x => x, getNewLine: () => '\n' }));
});

test('desktop column names both price and budget; ordinary-row mobile label stays price', () => {
  const file = path.join(root, F + 'components/MyAreaListingsSection.tsx');
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /<span className="text-right">Hind \/ eelarve<\/span>/);
  const out = ts.transpileModule(source, {fileName:file,reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX}});
  assert.deepEqual(out.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
});
