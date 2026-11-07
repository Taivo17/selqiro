// Pure interface-message boundaries. No browser, auth, storage or database is used.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  fileName: file, compilerOptions: {target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS},
}).outputText, file);
const {marketplaceMessage, renderMarketplaceMessage: render, safeMarketplaceError} = require('../src/shared/i18n/marketplaceMessages.ts');
const {catalogMessage, uiMessage, renderUiMessage} = require('../lib/i18n/interfaceMessage.ts');
const {marketplaceUi} = require('../lib/i18n/catalogs/marketplaceUi.ts');
const {validateContentImageFile} = require('../src/shared/media/imageRules.ts');
const {formatOwnerHorseMoney} = require('../src/entities/horse-offer/model/ownerMoney.ts');

test('a retained marketplace notice can change language without changing its identity or parameters', () => {
  const notice = marketplaceMessage('horse.budget_up_to_value.82a955', {p0:'5 000 €'});
  assert.equal(render('en',notice),'Budget up to 5 000 €');
  assert.equal(render('et',notice),'Eelarve kuni 5 000 €');
  assert.equal(render(null,notice),'Budget up to 5 000 €');
  assert.equal(notice,marketplaceMessage('horse.budget_up_to_value.82a955',{p0:'5 000 €'}));
});

test('composed known notices translate while ordinary user text and invalid references remain data', () => {
  const label = marketplaceMessage('horse.purchase_budget.943f7e');
  const composed = `${label}: ${marketplaceMessage('horse.flexible_budget.20da6f')}`;
  assert.equal(render('en',composed),'Purchase budget: Flexible budget');
  assert.equal(render('et',composed),'Ostueelarve: Eelarve on paindlik');
  for (const text of ['Minu hobune — 500 €','<img onerror=alert(1)> & $5 {p0}',
    'selqiro-ui-catalog:v1:%ZZ:end',catalogMessage('unknown','horse.purchase_budget.943f7e'),
    catalogMessage('marketplace','constructor')]) assert.equal(render('en',text),text);
  const named = marketplaceMessage('horse.budget_up_to_value.82a955',{p0:'$5 {p0} <b>test</b>'});
  assert.equal(render('en',named),'Budget up to $5 {p0} <b>test</b>');
});

test('foreign transport errors become translated feedback while known application feedback survives', () => {
  const fallback = marketplaceMessage('horse.the_draft_could_not_be_saved.fb8388');
  const raw = new Error('database secret / customer token');
  assert.equal(safeMarketplaceError(raw,fallback),fallback);
  assert.equal(safeMarketplaceError(new Error(fallback),''),fallback);
  const generic = uiMessage('operation_failed');
  assert.equal(render('et',generic),renderUiMessage('et',generic));
  assert.equal(safeMarketplaceError(new Error(generic),fallback),generic);
});

test('image validation retains the same rejection and localizes only its notice', () => {
  let notice;
  try { validateContentImageFile({name:'empty.jpg',type:'image/jpeg',size:0}); }
  catch (error) { notice=error.message; }
  assert.equal(render('en',notice),'The image file is empty.');
  assert.equal(render('et',notice),'Pildifail on tühi.');
});

test('money locale changes the display without changing validated numeric inputs', () => {
  const amount=1234.5;
  assert.equal(formatOwnerHorseMoney(amount,'EUR','en'),'€1,234.5');
  assert.match(formatOwnerHorseMoney(amount,'EUR','et'),/1\s234,5\s€/);
  assert.equal(amount,1234.5);
});

test('every marketplace interface message has both an English and Estonian value', () => {
  assert.deepEqual(Object.keys(marketplaceUi.en).sort(),Object.keys(marketplaceUi.et).sort());
  for (const [key,value] of Object.entries(marketplaceUi.en)) {
    assert.ok(value.trim(),key); assert.ok(marketplaceUi.et[key].trim(),key);
  }
});
