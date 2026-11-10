'use strict';
// Actual React hook, API and parsers; bounded synthetic Auth/PostgREST transport.
const {test, before, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {runtime, inputs, root, sha, recordInput, act} = require('./horse-store-category-runtime.cjs');
let createHorseStoreFixture, actor, key, ids;
const results = [], startedAt = new Date().toISOString(), proofDir = process.env.SELQIRO_HORSE_CATEGORY_RUNTIME_OUTPUT;
before(async () => {
  ({createHorseStoreFixture, actor, key, ids} = await import('./horse-store-category-fixture.mjs'));
  for (const name of ['horse-store-category-assignment.test.cjs', 'horse-store-category-runtime.cjs', 'horse-store-category-fixture.mjs']) recordInput(path.join(root, 'tests', name));
});
const run = (name, body) => test(name, async () => {try {await body();results.push({name, status: 'PASS'});} catch (error) {results.push({name, status: 'FAIL', error: error.stack});throw error;}});
const problem = code => error => error?.code === code;
const saves = h => h.fixture.state.calls.filter(call => call.name === 'set_my_horse_offer_store_categories_v1');
const hookProps = () => ({actor, offerId: ids.offer});
const model = h => h.load('src/entities/horse-offer/model/storeCategories.ts');
async function withRuntime(body) {const h = runtime(createHorseStoreFixture());try {await body(h);} finally {await h.close();}}

run('canonical horse UUID and expected identity are sent through the separate read/set contracts, never listing or publication writes', () => withRuntime(async h => {
  const first = await h.api.read(key);assert.equal(first.categories.length, 3);assert.deepEqual(first.categoryIds, []);
  await h.api.save(key, [ids.child]);await h.api.save(key, [ids.other, ids.root]);const cleared = await h.api.save(key, []);
  assert.deepEqual(cleared.categoryIds, []);assert.equal(h.fixture.state.writes.length, 3);
  for (const call of h.fixture.state.calls.filter(call => call.kind !== 'auth')) {
    assert.equal(call.headers.Authorization, 'Bearer synthetic-token-A');assert.ok(call.signal instanceof AbortSignal);
    assert.ok(['profiles', 'store_categories', 'current_user_has_identity_access', 'get_my_horse_offer_store_categories_v1', 'set_my_horse_offer_store_categories_v1'].includes(call.name));
  }
  assert.deepEqual(saves(h).map(call => call.params), [[ids.child], [ids.root, ids.other], []].map(p_category_ids => ({
    p_offer_id: ids.offer, p_expected_identity_id: ids.identity, p_category_ids,
  })));
  const categories = h.fixture.state.calls.find(call => call.name === 'store_categories');
  assert.deepEqual(categories.filters, [['identity_id', ids.identity]]);assert.equal(categories.count, 'exact');
  await assert.rejects(() => h.api.save(key, [ids.foreign]), problem('invalid'));
  assert.deepEqual(h.fixture.state.assignments.get(ids.offer), []);
}));

run('receipt rejects wrong horse/identity/set/count/shape; bad local input dispatches nothing', () => withRuntime(async h => {
  const parse = model(h).parseHorseStoreCategoryReceipt;
  const receipt = () => ({offer_id: ids.offer, identity_id: ids.identity, category_ids: [ids.child], assigned_count: 1});
  assert.equal(parse(receipt(), key, [ids.child]).assignedCount, 1);
  for (const change of [row => {row.offer_id = ids.secondOffer;}, row => {row.identity_id = ids.secondIdentity;},
    row => {row.category_ids = [ids.other];}, row => {row.category_ids.push(ids.child);row.assigned_count = 2;},
    row => {row.category_ids = '{' + ids.child + '}';}, row => {row.assigned_count = '1';}, row => {row.extra = true;}]) {
    const row = receipt();change(row);assert.throws(() => parse(row, key, [ids.child]), problem('unknown'));
  }
  assert.throws(() => parse([receipt()], key, [ids.child]), problem('unknown'));
  for (const bad of [[null], [ids.child, ids.child], ['1001']]) assert.throws(() => h.api.save(key, bad), problem('invalid'));
  for (const bad of [{...key, offerId: '1001'}, {...key, identityId: ''}, {...key, userId: 'bad'}]) assert.throws(() => h.api.read(bad), problem('invalid'));
  assert.equal(h.fixture.state.calls.length, 0);
}));

run('paginated categories are complete and foreign, duplicate or truncated replies fail closed', () => withRuntime(async h => {
  h.fixture.state.categories = Array.from({length: 1003}, (_, i) => ({id: 'a0000000-0000-4000-8000-' + String(i + 1).padStart(12, '0'),
    identity_id: ids.identity, name: 'Section ' + i, sort_order: i, parent_id: null}));
  const result = await h.api.read(key);assert.equal(result.categories.length, 1003);
  assert.deepEqual(h.fixture.state.calls.filter(call => call.name === 'store_categories').map(call => call.range), [[0, 499], [500, 999], [1000, 1499]]);
  for (const alter of [row => {row.count = null;}, row => {row.data = [];}, row => {row.data[0].identity_id = ids.secondIdentity;}, row => {row.data[1] = {...row.data[0]};}]) {
    h.fixture.intercept('store_categories', (_call, reply) => {const value = reply();alter(value);return value;});
    await assert.rejects(() => h.api.read(key), problem('read'));
  }
}));

run('captured actor/token survives same-user refresh; post-save identity change is unknown and never replays', () => withRuntime(async h => {
  const mutable = {...key};
  h.fixture.intercept('store_categories', (_call, reply) => {mutable.offerId = ids.secondOffer;h.fixture.state.session.access_token = 'synthetic-token-A2';return reply();});
  const read = await h.api.read(mutable);assert.equal(read.key.offerId, ids.offer);
  assert.ok(h.fixture.state.calls.filter(call => call.kind !== 'auth').every(call => call.headers.Authorization === 'Bearer synthetic-token-A'));
  h.fixture.intercept('set_my_horse_offer_store_categories_v1', (_call, reply) => {const result = reply();h.fixture.state.activeIdentity = ids.secondIdentity;return result;});
  await assert.rejects(() => h.api.save(key, [ids.child]), problem('unknown'));assert.deepEqual(h.fixture.state.assignments.get(ids.offer), [ids.child]);
  await assert.rejects(() => h.api.save(key, []), problem('context'));assert.equal(saves(h).length, 1);
}));

run('abort before dispatch sends nothing; abort after dispatch retains an unknown outcome without retry', () => withRuntime(async h => {
  const before = new AbortController();before.abort();await assert.rejects(() => h.api.save(key, [ids.child], before.signal), problem('context'));
  assert.equal(saves(h).length, 0);
  const gate = h.fixture.holdNext('set_my_horse_offer_store_categories_v1'), controller = new AbortController();
  const saved = h.api.save(key, [ids.child], controller.signal), rejected = assert.rejects(saved, problem('unknown'));
  const held = await gate.entered;controller.abort();await rejected;assert.equal(held.call.signal.aborted, true);gate.release();
  assert.equal(saves(h).length, 1);assert.deepEqual(h.fixture.state.assignments.get(ids.offer), [ids.child]);
}));

run('two same-tick saves issue one request; reset, explicit child assignment and clear remain independent', () => withRuntime(async h => {
  await h.render(hookProps());await h.action(() => h.state.toggleCategory(ids.child));
  assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);
  await h.action(() => h.state.resetSelection());assert.deepEqual(h.state.selectedCategoryIds, []);
  await h.action(() => h.state.toggleCategory(ids.child));
  const gate = h.fixture.holdNext('set_my_horse_offer_store_categories_v1');let first, second;
  await h.action(() => {first = h.state.saveSelection();second = h.state.saveSelection();});await gate.entered;
  assert.equal(saves(h).length, 1);assert.equal(h.state.saving, true);
  await h.action(() => {h.state.clearSelection();h.state.toggleCategory(ids.other);});assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);
  gate.release();await act(async () => {await Promise.all([first, second]);});await h.flush();
  assert.equal(h.state.message, 'storeAssignmentOneSaved');
  await h.action(() => h.state.clearSelection());await h.action(() => h.state.saveSelection());
  assert.deepEqual(h.state.savedCategoryIds, []);assert.equal(h.state.message, 'storeAssignmentsRemoved');
}));

run('lost acknowledgement preserves selection and blocks writes/reset until a successful explicit readback', () => withRuntime(async h => {
  await h.render(hookProps());await h.action(() => h.state.toggleCategory(ids.child));
  h.fixture.intercept('set_my_horse_offer_store_categories_v1', (_call, reply) => {reply();throw Error('Synthetic lost acknowledgement');});
  await h.action(() => h.state.saveSelection());assert.equal(h.state.reviewRequired, true);
  await h.action(() => {h.state.resetSelection();void h.state.saveSelection();});assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);
  h.fixture.intercept('get_my_horse_offer_store_categories_v1', () => ({data: null, error: {code: 'NETWORK'}}));
  await h.action(() => h.state.refresh());assert.equal(h.state.reviewRequired, true);assert.equal(h.state.canSave, false);
  await h.action(() => h.state.refresh());assert.equal(h.state.message, 'storeSelectionVerified');assert.equal(h.state.dirty, false);
  assert.equal(saves(h).length, 1);
}));

run('unknown without commit and known rejection retain draft; different readback requires deliberate save', () => withRuntime(async h => {
  await h.render(hookProps());await h.action(() => h.state.toggleCategory(ids.other));
  h.fixture.intercept('set_my_horse_offer_store_categories_v1', () => ({data: null, error: {code: 'NETWORK'}}));
  await h.action(() => h.state.saveSelection());await h.action(() => h.state.refresh());
  assert.equal(h.state.message, 'storeSelectionDiffers');assert.equal(h.state.canSave, true);assert.equal(saves(h).length, 1);
  h.fixture.intercept('set_my_horse_offer_store_categories_v1', () => ({data: null, error: {code: '42501', message: 'horse_store_category_forbidden'}}));
  await h.action(() => h.state.saveSelection());assert.equal(h.state.error, 'storeAssignmentForbidden');assert.equal(h.state.reviewRequired, false);
  await h.action(() => h.state.saveSelection());assert.equal(saves(h).length, 2);
  await h.action(() => h.state.refresh());await h.action(() => h.state.saveSelection());assert.deepEqual(h.state.savedCategoryIds, [ids.other]);
}));

run('new horse scope retires old replies; identity changes invalidate same-tick handlers and late saves', () => withRuntime(async h => {
  const gate = h.fixture.holdNext('get_my_horse_offer_store_categories_v1');await h.render(hookProps());const held = await gate.entered;
  const stale = h.state.saveSelection;await h.render({actor, offerId: ids.secondOffer});assert.equal(held.call.signal.aborted, true);
  gate.release();await h.flush();assert.deepEqual(h.state.savedCategoryIds, [ids.other]);await h.action(stale);assert.equal(saves(h).length, 0);
  await h.action(() => h.state.toggleCategory(ids.child));const saveGate = h.fixture.holdNext('set_my_horse_offer_store_categories_v1');let saving;
  await h.action(() => {saving = h.state.saveSelection();});await saveGate.entered;
  await h.action(() => {h.identity.beginIdentityChange(ids.user);void h.state.saveSelection();});
  assert.equal(h.state.loaded, false);assert.deepEqual(h.state.selectedCategoryIds, []);
  saveGate.release();await act(async () => {await saving;});await h.flush();assert.equal(h.state.message, null);assert.equal(saves(h).length, 1);
}));

run('temporary readiness block preserves unsaved selection; missing categories require a deliberate correction', () => withRuntime(async h => {
  await h.render(hookProps());await h.action(() => h.state.toggleCategory(ids.child));const count = h.fixture.state.calls.length;
  await h.render({...hookProps(), blocked: true});await h.action(() => {h.state.clearSelection();void h.state.saveSelection();});
  assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);assert.equal(h.fixture.state.calls.length, count);
  await h.render({...hookProps(), blocked: false});assert.equal(h.state.canSave, true);
  h.fixture.state.categories = h.fixture.state.categories.filter(row => row.id !== ids.child);
  await h.action(() => h.state.refresh());assert.equal(h.state.missingCategoryCount, 1);assert.equal(h.state.canSave, false);
  await h.action(() => {h.state.clearSelection();h.state.toggleCategory(ids.other);});await h.action(() => h.state.saveSelection());
  assert.deepEqual(h.state.savedCategoryIds, [ids.other]);
}));

run('public V2 wrapper sends exact filter and preserves canonical horse UUID; strict envelope guards and old V1 remain', () => withRuntime(async h => {
  const request = {sellerSlug: 'synthetic-shop', storeCategoryId: ids.child, offset: 0, limit: 24};
  const item = {content_type: 'horse_offer', content_id: ids.offer, offer_type: 'sale', title: 'Stored horse', description_preview: 'Public horse',
    price: {kind: 'contact', amount: null, currency: 'EUR', period: null}, category: 'horses', subcategory: 'sale', detail_category: null,
    condition: null, country: 'EE', city: 'Paide', image_url: null, seller_name: 'Synthetic shop', seller_slug: 'synthetic-shop',
    seller_avatar_url: null, seller_type: 'private', created_at: '2026-11-10T10:00:00Z'};
  const envelope = {schema_version: 2, content_scope: 'public_profile_marketplace', seller_slug: 'synthetic-shop', profile_available: true,
    store_category_id: ids.child, sort: 'newest', items: [item], total_count: '1', result_limit: 24, result_offset: 0,
    has_more: false, next_offset: null, window_limit_reached: false};
  const parse = h.load('src/entities/listing/model/publicRead/publicProfileMarketplaceV2.ts').parsePublicProfileMarketplaceV2;
  h.fixture.intercept('get_public_profile_marketplace_v2', call => {assert.deepEqual(call.params, {
    p_seller_slug: 'synthetic-shop', p_store_category_id: ids.child, p_result_limit: 24, p_result_offset: 0,
  });return {data: envelope, error: null};});
  const page = await h.load('src/entities/listing/api/getPublicProfileMarketplace.ts').getPublicProfileMarketplace(request, new AbortController().signal);
  assert.equal(page.items[0].id, ids.offer);assert.equal(page.items[0].contentType, 'horse_offer');
  for (const change of [row => {row.schema_version = 1;}, row => {row.store_category_id = ids.other;}, row => {row.seller_slug = 'other';},
    row => {row.items[0].seller_slug = 'other';}, row => {row.items[0].content_type = 'service';}, row => {row.items[0].content_id = '1001';},
    row => {row.profile_available = false;}, row => {row.result_offset = 1;}, row => {row.total_count = '2';}, row => {row.extra = true;}]) {
    const row = JSON.parse(JSON.stringify(envelope));change(row);assert.throws(() => parse(row, request));
  }
  const oldParse = h.load('src/entities/listing/model/publicRead/publicProfileMarketplaceV1.ts').parsePublicProfileMarketplaceV1;
  assert.throws(() => oldParse({...envelope, schema_version: 1}, request));
}));

after(() => {
  const drift = [...inputs].filter(([name, digest]) => sha(fs.readFileSync(path.join(root, name))) !== digest).map(([name]) => name);
  const report = {schemaVersion: 1, status: results.every(item => item.status === 'PASS') && !drift.length ? 'PASS' : 'FAIL',
    startedAt, finishedAt: new Date().toISOString(), boundary: 'Actual React DOM category hook, canonical horse API/parser and public profile V2 API/parser. Synthetic Auth/PostgREST only; no hosted authorization or live writes claimed.',
    cases: results, inputDrift: drift, inputs: [...inputs].map(([name, sha256]) => ({path: name, sha256}))};
  if (proofDir) {fs.mkdirSync(proofDir, {recursive: true});fs.writeFileSync(path.join(proofDir, 'runtime-result.json'), JSON.stringify(report, null, 2) + '\n');}
  assert.deepEqual(drift, []);
});
