'use strict';
const {test, before, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), React = require('react');
const {runtime, inputs, root, sha, recordInput} = require('./managed-store-category-runtime.cjs');
let createStoreReviewFixture, ids;
const results = [], startedAt = new Date().toISOString();
const route = 'app/v2/my-area/listings/[id]/store-categories/page.tsx';
const apiPath = 'src/entities/listing/api/saveLegacyStoreCategorySelection.ts';
const recoveryPath = 'src/features/listing-edit/model/legacyStoreCategoryRecovery.ts';
before(async () => {
  ({createStoreReviewFixture} = await import('./store-category-review-fixture.mjs'));
  ({ids} = await import('./managed-store-category-fixture.mjs'));
  for (const file of ['tests/store-category-review.test.cjs', 'tests/store-category-review-fixture.mjs',
    'tests/managed-store-category-runtime.cjs', 'tests/managed-store-category-fixture.mjs']) recordInput(path.join(root, file));
});
const run = (name, body) => test(name, async () => {
  try {await body(); results.push({name, status:'PASS'});}
  catch (error) {results.push({name, status:'FAIL', error:error.stack}); throw error;}
});
async function scoped(body, language = 'en') {
  const h = runtime(createStoreReviewFixture(), {language, modules: {
    'components/v2/layout/V2Shell.tsx': {__esModule:true, default: ({children}) => React.createElement(React.Fragment, null, children)},
  }});
  try {await body(h);} finally {await h.close();}
}
const writes = h => h.fixture.state.calls.filter(call => call.name === 'set_my_listing_store_categories_v2');
const option = (h, name) => [...h.container.querySelectorAll('button[aria-pressed]')].find(node => node.textContent.includes(name));
const button = (h, text) => [...h.container.querySelectorAll('button')].find(node => node.textContent === text);
const pressed = (h, name) => option(h, name)?.getAttribute('aria-pressed');
async function open(h, id = '1001') {
  const element = await h.load(route).default({params: Promise.resolve({id})});
  await h.render({}, () => element); await h.flush();
}
async function priorSave(h, outcome) {
  const api = h.load(apiPath);
  h.fixture.state.assignments.set('1001', [ids.other]);
  h.fixture.intercept('set_my_listing_store_categories_v2', (_call, reply) => {
    if (outcome === 'unknown') {reply(); throw Error('Synthetic lost acknowledgement');}
    return {data:null, error:{code:'42501'}};
  });
  const result = await api.saveLegacyStoreCategorySelection(api.captureLegacyStoreCategoryIntent(ids.user, ids.identity, ids.child), 1001, 'create');
  const recovery = h.load(recoveryPath).legacyStoreCategoryRecovery(result, 'en', 1001);
  assert.equal(recovery.href, '/v2/my-area/listings/1001/store-categories');
  return result;
}

run('the actual destination reads a receipt-free listing before enabling a manual change', () => scoped(async h => {
  assert.equal(Object.hasOwn(h.fixture.state.listings[0], 'receipt'), false);
  h.fixture.state.assignments.set('1001', [ids.other]);
  const held = h.fixture.holdNext('listing_store_categories');
  await open(h); await held.entered;
  assert.match(h.container.textContent, /Review listing categories/);
  assert.equal(h.container.querySelectorAll('button[aria-pressed]').length, 0);
  assert.equal(writes(h).length, 0);
  await h.action(() => held.release());
  assert.equal(pressed(h, 'Tools'), 'true'); assert.equal(pressed(h, 'Engine parts'), 'false');
  assert.equal(button(h, 'Save sections').disabled, true);
  await h.action(() => option(h, 'Engine parts').click());
  assert.equal(button(h, 'Save sections').disabled, false);
  await h.action(() => button(h, 'Save sections').click());
  assert.deepEqual(h.fixture.state.assignments.get('1001'), [ids.child, ids.other].sort());
  assert.equal(writes(h).length, 1);
  assert.equal(h.fixture.state.calls.some(call => /owner-status|publication/i.test(call.name)), false);
}));
run('legacy rejection opens the actual destination with the unchanged saved set', () => scoped(async h => {
  assert.equal((await priorSave(h, 'rejected')).status, 'not_saved');
  await open(h);
  assert.equal(pressed(h, 'Tools'), 'true'); assert.equal(pressed(h, 'Engine parts'), 'false');
  assert.equal(button(h, 'Save sections').disabled, true); assert.equal(writes(h).length, 1);
  assert.equal(h.fixture.state.writes.length, 0);
}));
run('legacy lost acknowledgement opens the actual destination with the committed set and no replay', () => scoped(async h => {
  assert.equal((await priorSave(h, 'unknown')).status, 'unconfirmed');
  await open(h);
  assert.equal(pressed(h, 'Engine parts'), 'true'); assert.equal(pressed(h, 'Tools'), 'false');
  assert.equal(button(h, 'Salvesta rubriigid').disabled, true);
  assert.match(h.container.textContent, /Vaata kuulutuse rubriigid üle/);
  assert.equal(writes(h).length, 1); assert.equal(h.fixture.state.writes.length, 1);
}, 'et'));
for (const scope of ['foreign', 'null', 'missing', 'access_denied']) run(`the destination cannot edit ${scope} listing scope`, () => scoped(async h => {
  if (scope === 'foreign') h.fixture.state.listings[0].identity_id = ids.secondIdentity;
  if (scope === 'null') h.fixture.state.listings[0].identity_id = null;
  if (scope === 'missing') h.fixture.state.listings.shift();
  if (scope === 'access_denied') h.fixture.state.accessAllowed = false;
  await open(h);
  assert.ok(h.container.querySelector('[role="alert"]'));
  assert.equal(h.container.querySelectorAll('button[aria-pressed]').length, 0);
  assert.equal(h.fixture.state.calls.some(call => call.name === 'listing_store_categories'), false);
  assert.equal(writes(h).length, 0);
}));
run('identity switching retires old controls and ignores a held previous-scope read', () => scoped(async h => {
  h.fixture.state.assignments.set('1001', [ids.other]);
  const held = h.fixture.holdNext('listing_store_categories');
  await open(h); await held.entered;
  let change;
  await h.action(() => {change = h.identity.beginIdentityChange(ids.user);});
  await h.action(() => {h.fixture.state.activeIdentity = ids.secondIdentity; h.identity.finishIdentityChange(change);});
  await h.action(() => held.release()); await h.flush();
  assert.equal(h.container.querySelectorAll('button[aria-pressed]').length, 0);
  assert.ok(h.container.querySelector('[role="alert"]')); assert.equal(writes(h).length, 0);
}));
run('sign-out removes old category controls and offers a return to this exact destination', () => scoped(async h => {
  await open(h); assert.ok(option(h, 'Engine parts'));
  await h.action(() => h.fixture.authEvent('SIGNED_OUT', null));
  assert.equal(h.container.querySelectorAll('button[aria-pressed]').length, 0);
  const login = [...h.container.querySelectorAll('a')].find(node => node.textContent === 'Sign in');
  assert.equal(login?.getAttribute('href'), '/auth?next=%2Fv2%2Fmy-area%2Flistings%2F1001%2Fstore-categories');
  assert.equal(writes(h).length, 0);
}));
run('a failed saved-set read keeps manual save unavailable until a successful explicit refresh', () => scoped(async h => {
  h.fixture.state.assignments.set('1001', [ids.child]);
  h.fixture.intercept('listing_store_categories', () => ({data:null,error:{code:'NETWORK'},count:null}));
  await open(h); assert.ok(h.container.querySelector('[role="alert"]'));
  assert.equal(h.container.querySelectorAll('button[aria-pressed]').length, 0);
  await h.action(() => button(h, 'Refresh sections').click());
  assert.equal(pressed(h, 'Engine parts'), 'true'); assert.equal(button(h, 'Save sections').disabled, true);
  assert.equal(writes(h).length, 0);
}));

after(() => {
  const drift = [...inputs].filter(([name,digest]) => sha(fs.readFileSync(path.join(root,name))) !== digest).map(([name]) => name);
  const report = {schemaVersion:1,status:results.every(item=>item.status==='PASS')&&!drift.length?'PASS':'FAIL',startedAt,
    finishedAt:new Date().toISOString(),node:process.version,testCount:results.length,passed:results.filter(item=>item.status==='PASS').length,
    boundary:'Actual async destination route, review page, active-identity hook/readers and category card/hook/API/parser. Synthetic Auth/PostgREST, shell/Next Link and language context. No publication receipt fixture, publication API, database or browser deployment.',
    results,inputs:[...inputs].map(([path,sha256])=>({path,sha256})),inputDrift:drift};
  if (process.env.SELQIRO_STORE_REVIEW_OUTPUT) {fs.mkdirSync(process.env.SELQIRO_STORE_REVIEW_OUTPUT,{recursive:true});fs.writeFileSync(path.join(process.env.SELQIRO_STORE_REVIEW_OUTPUT,'review-result.json'),JSON.stringify(report,null,2)+'\n');}
  assert.deepEqual(drift,[]);
});
