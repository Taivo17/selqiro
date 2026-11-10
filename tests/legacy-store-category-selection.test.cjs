'use strict';
const {test, before, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {runtime, inputs, root, sha, recordInput} = require('./managed-store-category-runtime.cjs');
const {bindHandler} = require('./legacy-store-category-handler-source.cjs');
let createStoreFixture, ids, legacyHandlerContext;
const results = [], startedAt = new Date().toISOString();
const apiPath = 'src/entities/listing/api/saveLegacyStoreCategorySelection.ts';
const recoveryPath = 'src/features/listing-edit/model/legacyStoreCategoryRecovery.ts';
before(async () => {
  ({createStoreFixture, ids} = await import('./managed-store-category-fixture.mjs'));
  ({legacyHandlerContext} = await import('./legacy-store-category-handler-fixture.mjs'));
  for (const file of ['tests/legacy-store-category-selection.test.cjs', 'tests/legacy-store-category-handler-source.cjs',
    'tests/legacy-store-category-handler-fixture.mjs', 'tests/managed-store-category-runtime.cjs', 'tests/managed-store-category-fixture.mjs']) recordInput(path.join(root, file));
});
const run = (name, body) => test(name, async () => {
  try { await body(); results.push({name, status:'PASS'}); }
  catch (error) { results.push({name, status:'FAIL', error:error.stack}); throw error; }
});
async function scoped(body) {
  const h = runtime(createStoreFixture());
  try { const api = h.load(apiPath); await body(h, api, h.load(recoveryPath)); }
  finally { await h.close(); }
}
const rpcCalls = h => h.fixture.state.calls.filter(x => x.name === 'set_my_listing_store_categories_v2');
const intent = (api, category = ids.child, identity = ids.identity) => api.captureLegacyStoreCategoryIntent(ids.user, identity, category);

run('legacy create and edit use one atomic assignment RPC with the captured token', () => scoped(async (h, api) => {
  h.fixture.state.assignments.set('1001', [ids.other]);
  const result = await api.saveLegacyStoreCategorySelection(intent(api), 1001, 'edit');
  assert.equal(result.status, 'saved'); assert.equal(rpcCalls(h).length, 1);
  assert.deepEqual(h.fixture.state.assignments.get('1001'), [ids.child]);
  assert.equal(rpcCalls(h)[0].headers.Authorization, 'Bearer synthetic-token-A');
  assert.equal(h.fixture.state.calls.some(x => x.name === 'listing_store_categories'), false);
}));
run('clearing a legacy edit uses the atomic empty set without deleting the listing', () => scoped(async (h, api) => {
  h.fixture.state.assignments.set('1001', [ids.root, ids.child]);
  const listings = JSON.stringify(h.fixture.state.listings);
  const result = await api.saveLegacyStoreCategorySelection(intent(api, ''), '1001', 'edit');
  assert.equal(result.status, 'saved'); assert.deepEqual(rpcCalls(h)[0].params.p_category_ids, []);
  assert.deepEqual(h.fixture.state.assignments.get('1001'), []); assert.equal(JSON.stringify(h.fixture.state.listings), listings);
}));
run('a new listing with no selected category does not issue an unnecessary assignment', () => scoped(async (h, api) => {
  assert.equal((await api.saveLegacyStoreCategorySelection(intent(api, ''), 1001, 'create')).status, 'not_requested');
  assert.equal(h.fixture.state.calls.length, 0);
}));
run('missing identity and unsafe numeric listing IDs cannot dispatch an assignment', () => scoped(async (h, api) => {
  const missing = await api.saveLegacyStoreCategorySelection(intent(api, ids.child, null), 1001, 'edit');
  assert.equal(missing.status, 'not_saved'); assert.equal(missing.reason, 'identity');
  assert.equal((await api.saveLegacyStoreCategorySelection(intent(api), Number.MAX_SAFE_INTEGER + 1, 'edit')).status, 'not_saved');
  assert.equal(h.fixture.state.calls.length, 0);
}));
run('foreign and missing categories reject atomically while retaining the previous links', () => scoped(async (h, api) => {
  h.fixture.state.assignments.set('1001', [ids.other]);
  for (const category of [ids.foreign, '99999999-9999-4999-8999-999999999999']) {
    assert.equal((await api.saveLegacyStoreCategorySelection(intent(api, category), 1001, 'edit')).status, 'not_saved');
    assert.deepEqual(h.fixture.state.assignments.get('1001'), [ids.other]);
  }
  assert.equal(rpcCalls(h).length, 2); assert.equal(h.fixture.state.writes.length, 0);
}));
run('a foreign listing or NULL-identity listing never receives a user-ID ownership fallback', () => scoped(async (h, api) => {
  assert.equal((await api.saveLegacyStoreCategorySelection(intent(api), 2001, 'edit')).status, 'not_saved');
  h.fixture.state.listings[0].identity_id = null;
  assert.equal((await api.saveLegacyStoreCategorySelection(intent(api), 1001, 'edit')).status, 'not_saved');
  assert.equal(rpcCalls(h).length, 0);
}));
run('an identity change after form capture rejects rather than recapturing another identity', () => scoped(async (h, api) => {
  const captured = intent(api); h.fixture.state.activeIdentity = ids.secondIdentity;
  const result = await api.saveLegacyStoreCategorySelection(captured, 1001, 'edit');
  assert.equal(result.status, 'not_saved'); assert.equal(result.reason, 'identity'); assert.equal(rpcCalls(h).length, 0);
}));
run('known RPC rejection has one attempt and no direct-write fallback', () => scoped(async (h, api) => {
  h.fixture.intercept('set_my_listing_store_categories_v2', () => ({ data:null, error:{code:'42501'} }));
  assert.equal((await api.saveLegacyStoreCategorySelection(intent(api), 1001, 'edit')).status, 'not_saved');
  assert.equal(rpcCalls(h).length, 1); assert.equal(h.fixture.state.writes.length, 0);
}));
run('lost acknowledgement after commit remains unconfirmed and is never automatically retried', () => scoped(async (h, api) => {
  h.fixture.intercept('set_my_listing_store_categories_v2', (_call, reply) => { reply(); throw Error('Synthetic lost acknowledgement'); });
  assert.equal((await api.saveLegacyStoreCategorySelection(intent(api), 1001, 'edit')).status, 'unconfirmed');
  assert.equal(rpcCalls(h).length, 1); assert.deepEqual(h.fixture.state.assignments.get('1001'), [ids.child]);
}));
run('a malformed acknowledgement is not converted into success', () => scoped(async (h, api) => {
  h.fixture.intercept('set_my_listing_store_categories_v2', (_call, reply) => { const value=reply(); value.data[0].assigned_count=0; return value; });
  assert.equal((await api.saveLegacyStoreCategorySelection(intent(api), 1001, 'edit')).status, 'unconfirmed');
  assert.equal(rpcCalls(h).length, 1);
}));
run('post-write identity change remains unconfirmed instead of claiming no save', () => scoped(async (h, api) => {
  h.fixture.intercept('set_my_listing_store_categories_v2', (_call, reply) => { const value=reply(); h.fixture.state.activeIdentity=ids.secondIdentity; return value; });
  assert.equal((await api.saveLegacyStoreCategorySelection(intent(api), 1001, 'edit')).status, 'unconfirmed');
  assert.equal(rpcCalls(h).length, 1); assert.equal(h.fixture.state.writes.length, 1);
}));
run('English fallback and Estonian notices distinguish rejection from an unconfirmed save', () => scoped(async (_h, _api, ui) => {
  assert.equal(ui.legacyStoreCategoryRecovery({status:'saved'}, 'et', 1001), null);
  assert.equal(ui.legacyStoreCategoryRecovery({status:'not_requested'}, 'en', 1001), null);
  const en=ui.legacyStoreCategoryRecovery({status:'unconfirmed'}, 'fr', 1001);
  const et=ui.legacyStoreCategoryRecovery({status:'unconfirmed'}, 'et', 1001);
  assert.match(en.message, /could not be confirmed/); assert.match(et.message, /ei saanud kinnitada/);
  assert.equal(en.href, '/v2/my-area/listings/1001/store-categories'); assert.equal(et.href, en.href);
  assert.match(ui.legacyStoreCategoryRecovery({status:'not_saved', reason:'identity'}, 'en', 1001).message, /without an identity/);
}));

async function handlerCase(kind, categoryOutcome, language = 'en', changeDuringPhotos = false) {
  await scoped(async (h, api, ui) => {
    if (categoryOutcome === 'rejected') h.fixture.intercept('set_my_listing_store_categories_v2', () => ({data:null,error:{code:'42501'}}));
    if (categoryOutcome === 'unknown') h.fixture.intercept('set_my_listing_store_categories_v2', (_call, reply) => {reply();throw Error('Synthetic response loss');});
    const ctx = legacyHandlerContext({ids, helpers:{...api,...ui}, language, onPhotoSave: async () => {
      if (changeDuringPhotos) {ctx.profile.active_identity_id=ids.secondIdentity;h.fixture.state.activeIdentity=ids.secondIdentity;}
    }});
    const file = kind === 'create' ? 'app/sell/page.tsx' : 'app/my-page/page.tsx';
    const name = kind === 'create' ? 'createListing' : 'saveEdit';
    await bindHandler(recordInput(path.join(root, file)), file, name, ctx)();
    const event = name => ctx.events.filter(x => x.name === name);
    assert.equal(event('photos.saved').length, 1, 'Existing selected-photo work completes');
    assert.equal(event('console.error').length, 0); assert.equal(event('saving').at(-1).value, false);
    assert.equal(rpcCalls(h).length, changeDuringPhotos ? 0 : 1);
    if (kind === 'create') {assert.equal(event('listings.insert').length, 1);assert.equal(event('draft.removed').length, 1);}
    else assert.equal(event('listings.update').length, 1);
    if (categoryOutcome === 'saved' && !changeDuringPhotos) {
      assert.equal(event('notice').length, 0);
      if (kind === 'create') assert.equal(event('navigate')[0].value, '/my-page');
      else {assert.equal(event('editor.closed').length, 1);assert.equal(event('list.refreshed').length, 1);}
    } else {
      assert.equal(event('navigate')[0].value, '/v2/my-area/listings/1001/store-categories');
      assert.equal(event('notice').length, 1);assert.match(event('notice')[0].value, language === 'et' ? /Kuulutus on salvestatud/ : /listing has been saved/);
      assert.equal(event('editor.closed').length, 0);assert.equal(event('list.refreshed').length, 0);
      assert.ok(ctx.events.findIndex(x => x.name === 'photos.saved') < ctx.events.findIndex(x => x.name === 'navigate'));
    }
  });
}
for (const kind of ['create', 'edit']) for (const outcome of ['saved', 'rejected', 'unknown']) {
  run(`actual legacy ${kind} handler preserves photo completion and truthful ${outcome} outcome`, () => handlerCase(kind, outcome, outcome === 'rejected' ? 'et' : 'en'));
}
run('actual legacy edit captures identity before image work and cannot silently switch actor', () => handlerCase('edit', 'saved', 'en', true));

after(() => {
  const drift=[...inputs].filter(([name,digest])=>sha(fs.readFileSync(path.join(root,name)))!==digest).map(([name])=>name);
  const report={schemaVersion:1,status:results.every(x=>x.status==='PASS')&&!drift.length?'PASS':'FAIL',startedAt,finishedAt:new Date().toISOString(),node:process.version,
    testCount:results.length,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,
    boundary:'Real legacy page save-handler bodies extracted by TypeScript AST, new adapter/notices and retained managed API/parser. Synthetic Auth/PostgREST and surrounding form/basic/image/AI/navigation boundaries. No full legacy page render or live service writes.',
    results,inputs:[...inputs].map(([path,sha256])=>({path,sha256})),inputDrift:drift};
  if(process.env.SELQIRO_LEGACY_STORE_OUTPUT){fs.mkdirSync(process.env.SELQIRO_LEGACY_STORE_OUTPUT,{recursive:true});fs.writeFileSync(path.join(process.env.SELQIRO_LEGACY_STORE_OUTPUT,'client-result.json'),JSON.stringify(report,null,2)+'\n');}
  assert.deepEqual(drift,[]);
});
