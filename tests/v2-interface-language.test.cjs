// Interface-language contract only. No auth, database or production calls.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  fileName: file, compilerOptions: {target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true},
}).outputText, file);
const {getTranslation, getCatalogTranslation: translate, normalizeLanguage, localeForLanguage} = require('../lib/i18n/useTranslation.ts');
const catalog = {en: {add: 'Add photo', remaining: '{count} photos remain for {name}', fallback: 'English fallback'},
  et: {add: 'Lisa foto', remaining: '{name}: alles on {count} fotot'}};

test('missing and unsupported interface preferences use English; no inherited object properties are languages', () => {
  for (const language of [null, undefined, '', 'fr', 'ET', 'constructor', '__proto__']) {
    assert.equal(normalizeLanguage(language), 'en');
    assert.equal(translate(language, catalog, 'add'), 'Add photo');
    assert.equal(localeForLanguage(language), 'en-GB');
  }
  assert.equal(translate('et', catalog, 'add'), 'Lisa foto');
  assert.equal(localeForLanguage('et'), 'et-EE');
});

test('a missing or empty secondary translation falls back to the English source', () => {
  assert.equal(translate('et', catalog, 'fallback'), 'English fallback');
  assert.equal(translate('et', {en: {a: 'Fallback'}, et: {a: ''}}, 'a'), 'Fallback');
});

test('message parameters preserve zero, names, punctuation and placeholders without evaluating data', () => {
  const params = {count: 0, name: '<img onerror=alert(1)> & $5 {count}'};
  assert.equal(translate('en', catalog, 'remaining', params), '0 photos remain for <img onerror=alert(1)> & $5 {count}');
  assert.equal(translate('et', catalog, 'remaining', {count: 2, name: 'Õie'}), 'Õie: alles on 2 fotot');
  assert.equal(translate('en', catalog, 'remaining', {count: 1}), '1 photos remain for {name}');
});

test('V1 lookup remains supported and shares the English default', () => {
  assert.equal(getTranslation('et', 'common.save'), 'Salvesta');
  assert.equal(getTranslation('en', 'common.save'), 'Save');
  assert.equal(getTranslation('constructor', 'common.save'), 'Save');
});

const {CATEGORY_FIELDS, getFieldLabel} = require('../lib/categoryFields.ts');
test('every registered category field has an Estonian label without changing field keys or values', () => {
  let checked = 0;
  for (const fields of Object.values(CATEGORY_FIELDS)) {
    for (const field of fields) {
      assert.notEqual(getFieldLabel(field.key, '__missing__', 'et'), '__missing__', field.key);
      assert.equal(getFieldLabel(field.key, field.label, 'en'), field.label);
      checked++;
    }
  }
  assert.ok(checked > 100);
  assert.equal(getFieldLabel('constructor', 'Unknown field', 'et'), 'Unknown field');
  assert.equal(getFieldLabel('unregistered_field', 'Future field', 'et'), 'Future field');
});
