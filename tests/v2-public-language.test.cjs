/* Public display and feedback contracts. Source modules run without a browser,
 * network, database, storage mutation, or application build. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function modules() {
  const cache = new Map();
  let language = 'en';
  const jsx = (type, props, key) => ({type, props, key});
  function load(name) {
    const file = path.resolve(root, name);
    assert.ok(file.startsWith(root + path.sep));
    if (cache.has(file)) return cache.get(file).exports;
    const module = {exports: {}};
    cache.set(file, module);
    const source = fs.readFileSync(file, 'utf8');
    const out = ts.transpileModule(source, {fileName: file, reportDiagnostics: true,
      compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}});
    assert.deepEqual(out.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error), []);
    const requireLocal = spec => {
      if (spec === 'react/jsx-runtime') return {jsx, jsxs: jsx, Fragment: 'fragment'};
      if (spec === '@/src/shared/i18n/V2LanguageProvider') return {useV2Language: () => ({language})};
      assert.ok(spec.startsWith('.') || spec.startsWith('@/'), 'Unmocked external import: ' + spec);
      const base = spec.startsWith('@/') ? path.join(root, spec.slice(2)) : path.resolve(path.dirname(file), spec);
      const target = [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      assert.ok(target, 'Missing source import: ' + spec);
      return load(target);
    };
    vm.runInNewContext(out.outputText, {module, exports: module.exports, require: requireLocal,
      Intl, Number, String, Object, Array, Set, Map, JSON, Promise, Error, Date, BigInt, URL, URLSearchParams,
      encodeURIComponent, decodeURIComponent}, {filename: file, timeout: 1500});
    return module.exports;
  }
  return {load, language(value) {language = value;}};
}
const realm = modules();
const price = realm.load('src/entities/listing/model/priceDisplay.ts');
const presentation = realm.load('src/entities/listing/model/publicRead/presentation.ts');
const feedback = realm.load('lib/i18n/interfaceMessage.ts');
const search = realm.load('src/entities/listing/model/publicSearch.ts');
const activity = realm.load('src/entities/listing/model/listingActivity.ts');
const formatting = realm.load('src/entities/listing/model/format.ts');
const navigation = realm.load('src/features/listing-navigation/model/listingReturnContext.ts');
const plain = value => JSON.parse(JSON.stringify(value));
const visibleText = tree => tree == null || tree === false ? '' :
  Array.isArray(tree) ? tree.map(visibleText).join('|') :
  typeof tree === 'object' ? visibleText(tree.props?.children) : String(tree);

test('English defaults and Estonian semantic price labels do not alter seller-written prices', () => {
  const missing = price.getListingPriceDisplay({});
  assert.equal(price.localizeListingPrice(missing).priceLabel, 'Ask for price');
  assert.equal(price.localizeListingPrice(missing, 'et').priceLabel, 'Küsi hinda');
  for (const original of ['Tasuta', 'Küsi hinda', 'Hind kokkuleppel', '1.234,56 EUR', '00012.3400', '9007199254740993.123456']) {
    const retained = price.getListingPriceDisplay({price: original});
    assert.equal(price.localizeListingPrice(retained, 'en').priceLabel, original);
    assert.equal(price.localizeListingPrice(retained, 'et').priceLabel, original);
  }
  const free = presentation.priceReadDisplay({kind: 'free'});
  assert.equal(price.localizeListingPrice(free, 'en').priceLabel, 'Free');
  assert.equal(price.localizeListingPrice(free, 'et').priceLabel, 'Tasuta');
});

test('actual price component re-renders clarification in the selected language without rewriting amount', () => {
  const ListingPrice = realm.load('src/entities/listing/ui/ListingPrice.tsx').default;
  const retained = price.getListingPriceDisplay({priceAmount: '9007199254740993.123456'});
  const original = plain(retained);
  realm.language('en');
  const en = visibleText(ListingPrice({price: retained}));
  realm.language('et');
  const et = visibleText(ListingPrice({price: retained}));
  assert.match(en, /9007199254740993\.123456/);
  assert.match(en, /Currency unspecified/);
  assert.match(et, /9007199254740993\.123456/);
  assert.match(et, /Valuuta täpsustamata/);
  assert.deepEqual(plain(retained), original);
});

test('retained diagnostic feedback re-translates while diagnostic identifier stays exact', () => {
  const code = 'CONTACT_DENIED-201';
  const held = feedback.uiMessage('contact_failure', {code});
  assert.match(feedback.renderUiMessage('en', held), /Could not open the conversation/);
  assert.match(feedback.renderUiMessage('et', held), /Vestlust ei saanud/);
  assert.ok(feedback.renderUiMessage('en', held).includes(code));
  assert.ok(feedback.renderUiMessage('et', held).includes(code));
  assert.equal(feedback.safeUiError(new Error(held)), held);
  const unknown = feedback.safeUiError(new Error('internal request data and untranslated backend text'));
  assert.equal(feedback.renderUiMessage('en', unknown), 'The action could not be completed. Please try again.');
  assert.equal(feedback.renderUiMessage('en', 'Küsi hinda'), 'Küsi hinda');
});

test('public filter translation leaves canonical URL and request key intact', () => {
  const input = {...search.EMPTY_PUBLIC_SEARCH, query: 'Müüa auto', category: 'vehicles', subcategory: 'cars', condition: 'used', location: 'Tartu'};
  const key = search.publicSearchKey(input), url = search.publicSearchUrl(input), copy = plain(input);
  assert.equal(search.publicCategoryPath(input, 'en'), 'Vehicles › Cars');
  assert.equal(search.publicCategoryPath(input, 'et'), 'Sõidukid › Autod');
  assert.equal(search.searchConditionLabel('used', 'en'), 'Used');
  assert.equal(search.searchConditionLabel('used', 'et'), 'Kasutatud');
  assert.equal(search.publicSearchKey(input), key);
  assert.equal(search.publicSearchUrl(input), url);
  assert.deepEqual(plain(input), copy);
  assert.equal(search.searchConditionLabel('Custom user condition', 'et'), 'Custom user condition');
});

test('result counts keep integer precision and use viewer locale', () => {
  const exact = '900719925474099312345';
  const en = search.formatSearchCount(exact, 'en'), et = search.formatSearchCount(exact, 'et');
  assert.equal(en.replace(/\D/g, ''), exact);
  assert.equal(et.replace(/\D/g, ''), exact);
  assert.notEqual(en, et);
  assert.equal(search.formatSearchCount('not a number', 'en'), 'not a number');
});

test('activity translation does not change renewal decisions, state, or deadline precision', () => {
  const now = Date.parse('2026-11-07T12:00:00Z');
  const deadline = '2026-11-08T12:00:00.123456Z';
  const en = activity.getListingActivity('active', deadline, now, 'en');
  const et = activity.getListingActivity('active', deadline, now, 'et');
  assert.equal(en.state, et.state);
  assert.equal(en.canRenew, et.canRenew);
  assert.notEqual(en.label, et.label);
  assert.match(en.deadlineLabel, /Valid until/);
  assert.match(et.deadlineLabel, /Kehtib kuni/);
  assert.equal(String(activity.listingDeadlineMicros(deadline)), '1794139200123456');
  for (const status of ['paused', 'sold', 'unknown']) {
    assert.equal(activity.getListingActivity(status, deadline, now, 'en').canRenew, false);
    assert.equal(activity.getListingActivity(status, deadline, now, 'et').canRenew, false);
  }
});

test('location and navigation fallback labels translate without changing entered text or route context', () => {
  assert.equal(formatting.formatLocationLabel({}), 'Location unspecified');
  assert.equal(formatting.formatLocationLabel({}, 'et'), 'Asukoht täpsustamata');
  assert.equal(formatting.formatLocationLabel({city: 'Küsi hinda'}, 'en'), 'Küsi hinda');
  assert.equal(formatting.formatDistanceLabel(2.5, 'en'), '~2.5 km');
  assert.equal(formatting.formatDistanceLabel(2.5, 'et'), '~2,5 km');
  const context = {source: 'public-profile', token: 'held-navigation', sourceUrl: '/v2/profile/taivo?store=garage'};
  const retained = plain(context);
  assert.equal(navigation.getListingReturnBackLabel(context, 'en'), '← Back to profile');
  assert.equal(navigation.getListingReturnBackLabel(context, 'et'), '← Tagasi profiilile');
  assert.deepEqual(plain(context), retained);
});
