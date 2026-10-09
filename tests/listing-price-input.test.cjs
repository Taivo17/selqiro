'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
// The guarded runner uses actual tsc output. Standalone repo use transpiles only
// these pure modules with the existing project TypeScript, without file writes.
let compiledRoot = process.env.SELQIRO_PRICE_INPUT_BUILD;
if (!compiledRoot) {
  const ts = require(path.join(root, 'node_modules/typescript'));
  const allowed = new Set([
    'src/entities/listing/model/listingPriceInput.ts',
    'src/features/listing-edit/model/listingPriceDraft.ts',
    'src/shared/currency/listingCurrencies.generated.ts',
  ].map(p => path.join(root, p)));
  require.extensions['.ts'] = (module, filename) => {
    assert(allowed.has(filename), 'Unexpected TS dependency');
    module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, strict: true },
      fileName: filename,
    }).outputText, filename);
  };
  compiledRoot = root;
}
const extension = process.env.SELQIRO_PRICE_INPUT_BUILD ? '.js' : '.ts';
const load = n => require(path.join(compiledRoot, n + extension));
const input = load('src/entities/listing/model/listingPriceInput');
const draft = load('src/features/listing-edit/model/listingPriceDraft');
const registry = load('src/shared/currency/listingCurrencies.generated');
const matrix = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/listing-price-input-cases.json'), 'utf8'));
const result = value => {
  try { return { ok: true, value: input.normalizeListingPriceWire(value) }; }
  catch (e) { assert(e instanceof input.ListingPriceInputError); return { ok: false, value: null }; }
};
for (const c of matrix.cases) test('wire: ' + c.label, () => assert.deepEqual(result(c.input), c.expected));
for (const [code, scale] of Object.entries(matrix.scales)) {
  test('currency: ' + code, () => assert.equal(registry.getListingCurrency(code)?.minorUnits ?? null, scale));
}
test('registry is bounded and immutable; numeric codes retain initial zero', () => {
  assert.equal(registry.LISTING_CURRENCIES.length, 154);
  assert(Object.isFrozen(registry.LISTING_CURRENCIES));
  assert(registry.LISTING_CURRENCIES.every(Object.isFrozen));
  assert.equal(registry.getListingCurrency('ALL').numericCode, '008');
  for (const value of [null, {}, [], 978, 'toString']) assert.equal(registry.getListingCurrency(value), null);
});
const formGood = [
  ['1234,56', 'EUR', '1234.56'], ['1234.56', 'EUR', '1234.56'], [' 1234,50\t', 'EUR', '1234.5'],
  ['0', 'JPY', '0'], ['0.000', 'KWD', '0'], ['999999999999999999,999', 'KWD', '999999999999999999.999'],
  ['1,234', 'KWD', '1.234'], ['1.234', 'KWD', '1.234'],
];
for (const [amount, currency, expected] of formGood) test('form decimal: '+amount+' '+currency, () => {
  assert.deepEqual(input.normalizeListingPriceForm('fixed', amount, currency), {kind:'fixed',amount:expected,currency});
});
for (const amount of ['1,234.56','1.234,56','1,234,567','1.234.567','1 234','1\u00a0234','1_234','01','1e2','+2','-0','1,','1.','€5','NaN','\u00a012','1\n2','9'.repeat(65)]) {
  test('form rejects: '+JSON.stringify(amount), () => assert.throws(() => input.normalizeListingPriceForm('fixed',amount,'EUR')));
}
test('changing currency never converts or rounds input', () => {
  assert.deepEqual(input.normalizeListingPriceForm('fixed','1234','USD'), {kind:'fixed',amount:'1234',currency:'USD'});
  assert.throws(() => input.normalizeListingPriceForm('fixed','1234,5','JPY'));
  assert.throws(() => input.normalizeListingPriceForm('fixed','0.000','EUR'));
});
test('nonfixed requires intentionally cleared fields; fixed zero is not free', () => {
  for (const kind of ['free','negotiable','unspecified']) {
    assert.deepEqual(input.normalizeListingPriceForm(kind,'',''), {kind,amount:null,currency:null});
    assert.throws(() => input.normalizeListingPriceForm(kind,'0',''));
    assert.throws(() => input.normalizeListingPriceForm(kind,'','EUR'));
  }
  assert.equal(input.normalizeListingPriceForm('fixed','0','EUR').kind,'fixed');
});
test('legacy text is unchanged and omitted on an unrelated edit', () => {
  for (const legacy of [null,'','5578','Hind kokkuleppel','1,000 BGN']) {
    const initial = draft.buildListingPriceDraft({kind:null,legacy_text:legacy});
    assert.equal(initial.legacyText,legacy);
    assert.deepEqual(draft.getListingPriceDraftChange({...initial},initial),{changed:false});
    assert.throws(() => draft.getListingPriceDraftChange({...initial,amountInput:'10'},initial));
  }
});
test('unchanged saved historic price is not rejected by new-input registry', () => {
  const initial=draft.buildListingPriceDraft({kind:'fixed',amount:'125.5',currency:'BGN'});
  assert.deepEqual(draft.getListingPriceDraftChange(initial,initial),{changed:false});
  assert.throws(() => draft.getListingPriceDraftChange({...initial,amountInput:'126'},initial));
});
test('explicit price change uses new validation; raw state preserved', () => {
  const initial=draft.buildListingPriceDraft({kind:null,legacy_text:'5578'});
  const current={...draft.selectListingPriceKind(initial,'fixed'),amountInput:'12,50',currencyInput:'EUR'};
  assert.deepEqual(draft.getListingPriceDraftChange(current,initial),{changed:true,price:{kind:'fixed',amount:'12.5',currency:'EUR'}});
  assert.equal(initial.legacyText,'5578'); assert.equal(current.amountInput,'12,50');
  assert.deepEqual(draft.getListingPriceDraftChange({...initial},initial),{changed:false});
});
test('kind choice clears only draft fields and detects explicit free change', () => {
  const initial=draft.buildListingPriceDraft({kind:'fixed',amount:'0',currency:'EUR'});
  const changed=draft.selectListingPriceKind(initial,'free');
  assert.deepEqual(draft.getListingPriceDraftChange(changed,initial),{changed:true,price:{kind:'free',amount:null,currency:null}});
  assert.equal(initial.currencyInput,'EUR');
  assert.throws(() => draft.getListingPriceDraftChange({...initial,legacyText:'tamper'},initial));
});
test('wire never coerces JavaScript nonfinite/undefined amounts', () => {
  for (const a of [NaN,Infinity,-Infinity,undefined,0n]) assert.throws(() => input.normalizeListingPriceWire({kind:'fixed',amount:a,currency:'EUR'}));
});
if (process.env.SELQIRO_PRICE_INPUT_REQUIRE_SQL === '1') {
  test('all actual PostgreSQL outcomes and scales match client (no fallback fixture)', () => {
    assert(process.env.SELQIRO_PRICE_INPUT_CAPTURE);
    const capture=JSON.parse(fs.readFileSync(process.env.SELQIRO_PRICE_INPUT_CAPTURE,'utf8'));
    assert.equal(capture.version,1); assert.equal(capture.count,matrix.expected_count);
    assert.deepEqual(capture.scales,matrix.scales);
    assert.deepEqual(capture.results,matrix.cases.map(c => ({label:c.label,...result(c.input)})));
  });
}
