'use strict';
// Real React DOM, category API/parser/hook and identity events. Auth/PostgREST is synthetic.
const {test, before, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {runtime, inputs, root, sha, recordInput, act} = require('./managed-store-category-runtime.cjs');
let createStoreFixture, actor, key, ids;const results = [], startedAt = new Date().toISOString();
const proofDir = process.env.SELQIRO_STORE_RUNTIME_OUTPUT;
before(async () => {
  ({createStoreFixture, actor, key, ids} = await import('./managed-store-category-fixture.mjs'));
  for (const file of ['tests/managed-store-category-assignment.test.cjs', 'tests/managed-store-category-runtime.cjs', 'tests/managed-store-category-fixture.mjs']) recordInput(path.join(root, file));
});
const run = (name, body) => test(name, async () => {try {await body();results.push({name, status: 'PASS'});} catch (error) {results.push({name, status: 'FAIL', error: error.stack});throw error;}});
const problem = code => error => error?.code === code;
const writes = h => h.fixture.state.calls.filter(call => call.name === 'set_my_listing_store_categories_v2');
const model = h => h.load('src/entities/listing/model/managedListingStoreCategories.ts');
async function withRuntime(body) {const h = runtime(createStoreFixture());try {await body(h);} finally {await h.close();}}

run('API captures one actor token, scopes every read, and saves/replaces/clears only through the existing RPC', () => withRuntime(async h => {
  const initial = await h.api.read(key);assert.equal(initial.categories.length, 3);assert.deepEqual(initial.categoryIds, []);
  await h.api.save(key, [ids.child]);await h.api.save(key, [ids.other, ids.root]);const cleared = await h.api.save(key, []);
  assert.deepEqual(cleared.categoryIds, []);assert.equal(h.fixture.state.writes.length, 3);
  for (const call of h.fixture.state.calls.filter(call => call.kind !== 'auth')) {assert.equal(call.headers.Authorization, 'Bearer synthetic-token-A');assert.ok(call.signal instanceof AbortSignal);}
  const categories = h.fixture.state.calls.find(call => call.name === 'store_categories');
  assert.deepEqual(categories.filters, [['identity_id', ids.identity]]);assert.equal(categories.count, 'exact');
  const assignments = h.fixture.state.calls.find(call => call.name === 'listing_store_categories');
  assert.deepEqual(assignments.filters, [['listing_id', '1001'], ['listings.identity_id', ids.identity]]);
  assert.deepEqual(writes(h).map(call => call.params.p_category_ids), [[ids.child], [ids.root, ids.other], []]);
  await assert.rejects(() => h.api.save(key, [ids.foreign]), problem('forbidden'));
  assert.deepEqual(h.fixture.state.assignments.get('1001'), []);
}));

run('strict acknowledgement rejects another listing/set, duplicates, extra fields, coercion and multiple rows', () => withRuntime(async h => {
  const parse = model(h).parseManagedStoreCategorySaved;
  const ack = () => [{listing_id: 1001, category_ids: [ids.child], assigned_count: 1, removed_previous_links: 0}];
  assert.equal(parse(ack(), key, [ids.child]).assignedCount, 1);
  for (const mutate of [rows => {rows[0].listing_id = 1002;}, rows => {rows[0].category_ids = [ids.other];},
    rows => {rows[0].category_ids.push(ids.child);rows[0].assigned_count = 2;}, rows => {rows[0].extra = true;},
    rows => {rows[0].category_ids = '{' + ids.child + '}';}, rows => {rows[0].assigned_count = '1';},
    rows => {rows[0].removed_previous_links = -1;}, rows => {rows.push({...rows[0]});}, rows => {rows.length = 0;}]) {
    const rows = ack();mutate(rows);assert.throws(() => parse(rows, key, [ids.child]), problem('unknown'));
  }
  const before = h.fixture.state.calls.length;
  for (const bad of [[], [ids.child, ids.child], [null], ['not-an-id']]) {
    if (bad.length) assert.throws(() => h.api.save(key, bad), problem('invalid'));
  }
  for (const badKey of [{...key, listingId: '01'}, {...key, listingId: ids.child}, {...key, userId: 'bad'}, {...key, listingId: '9223372036854775808'}])
    assert.throws(() => h.api.read(badKey), problem('invalid'));
  assert.equal(h.fixture.state.calls.length, before, 'invalid input never begins transport');
}));

run('reads beyond the default row cap remain complete; partial/inconsistent and foreign-shaped replies fail closed', () => withRuntime(async h => {
  h.fixture.state.categories = Array.from({length: 1003}, (_, index) => ({id: 'a0000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'),
    identity_id: ids.identity, name: 'Section ' + index, sort_order: index, parent_id: null}));
  h.fixture.state.assignments.set('1001', h.fixture.state.categories.map(row => row.id));
  const snapshot = await h.api.read(key);assert.equal(snapshot.categories.length, 1003);assert.equal(snapshot.categoryIds.length, 1003);
  for (const table of ['store_categories', 'listing_store_categories']) assert.deepEqual(h.fixture.state.calls.filter(call => call.name === table).map(call => call.range), [[0, 499], [500, 999], [1000, 1499]]);
  h.fixture.intercept('store_categories', (_call, reply) => ({...reply(), count: null}));await assert.rejects(() => h.api.read(key), problem('read'));
  h.fixture.intercept('store_categories', (_call, reply) => ({...reply(), data: []}));await assert.rejects(() => h.api.read(key), problem('read'));
  h.fixture.intercept('listing_store_categories', (_call, reply) => {const result = reply();result.data[0].listings.identity_id = ids.secondIdentity;return result;});
  await assert.rejects(() => h.api.read(key), problem('read'));
}));

run('captured token survives same-user refresh, while pre/post identity mismatch never reports a confirmed write', () => withRuntime(async h => {
  h.fixture.intercept('store_categories', (_call, reply) => {h.fixture.state.session.access_token = 'synthetic-token-A2';return reply();});
  await h.api.read(key);
  assert.ok(h.fixture.state.calls.filter(call => call.kind !== 'auth').every(call => call.headers.Authorization === 'Bearer synthetic-token-A'));
  h.fixture.intercept('set_my_listing_store_categories_v2', (_call, reply) => {const result = reply();h.fixture.state.activeIdentity = ids.secondIdentity;return result;});
  await assert.rejects(() => h.api.save(key, [ids.child]), problem('unknown'));
  assert.deepEqual(h.fixture.state.assignments.get('1001'), [ids.child], 'postflight failure cannot prove rollback');
  const count = writes(h).length;await assert.rejects(() => h.api.save(key, []), problem('context'));assert.equal(writes(h).length, count);
}));

run('abort before dispatch is context loss; abort after dispatch is unconfirmed, with no automatic replay', () => withRuntime(async h => {
  const before = new AbortController();before.abort();await assert.rejects(() => h.api.save(key, [ids.child], before.signal), problem('context'));assert.equal(writes(h).length, 0);
  const gate = h.fixture.holdNext('set_my_listing_store_categories_v2'), controller = new AbortController();
  const saved = h.api.save(key, [ids.child], controller.signal);const rejected = assert.rejects(saved, problem('unknown'));
  const held = await gate.entered;controller.abort();await rejected;assert.equal(held.call.signal.aborted, true);gate.release();
  assert.equal(writes(h).length, 1);assert.deepEqual(h.fixture.state.assignments.get('1001'), [ids.child]);
}));

run('React selection assigns, replaces and clears, and two callbacks in one tick dispatch exactly one save', () => withRuntime(async h => {
  await h.render({actor, listingId: '1001'});assert.equal(h.state.loaded, true);assert.equal(h.state.canSave, false);
  await h.action(() => h.state.toggleCategory(ids.child));const gate = h.fixture.holdNext('set_my_listing_store_categories_v2');
  let first, second;await h.action(() => {first = h.state.saveSelection();second = h.state.saveSelection();});await gate.entered;
  assert.equal(writes(h).length, 1);assert.equal(h.state.saving, true);assert.equal(h.state.canSave, false);
  await h.action(() => {h.state.clearSelection();h.state.toggleCategory(ids.other);});assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);
  gate.release();await act(async () => {await Promise.all([first, second]);});await h.flush();
  assert.deepEqual(h.state.savedCategoryIds, [ids.child]);assert.equal(h.state.message, 'storeAssignmentOneSaved');
  await h.action(() => {h.state.clearSelection();h.state.toggleCategory(ids.other);});await h.action(() => h.state.saveSelection());
  assert.deepEqual(h.state.savedCategoryIds, [ids.other]);await h.action(() => h.state.clearSelection());await h.action(() => h.state.saveSelection());
  assert.deepEqual(h.state.savedCategoryIds, []);assert.equal(h.state.message, 'storeAssignmentsRemoved');assert.equal(writes(h).length, 3);
}));

run('explicit rejection preserves selected draft and requires a successful refresh before a deliberate retry', () => withRuntime(async h => {
  await h.render({actor, listingId: '1001'});await h.action(() => h.state.toggleCategory(ids.child));
  h.fixture.intercept('set_my_listing_store_categories_v2', () => ({data: null, error: {code: '42501'}}));await h.action(() => h.state.saveSelection());
  assert.equal(h.state.error, 'storeAssignmentForbidden');assert.equal(h.state.reviewRequired, false);
  assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);assert.deepEqual(h.state.savedCategoryIds, []);
  await h.action(() => h.state.saveSelection());assert.equal(writes(h).length, 1);
  await h.action(() => h.state.refresh());assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);assert.equal(h.state.canSave, true);
  await h.action(() => h.state.saveSelection());assert.deepEqual(h.state.savedCategoryIds, [ids.child]);
}));

run('lost acknowledgement after commit keeps the choice and blocks reset/retry until readback confirms it', () => withRuntime(async h => {
  await h.render({actor, listingId: '1001'});await h.action(() => h.state.toggleCategory(ids.child));
  h.fixture.intercept('set_my_listing_store_categories_v2', (_call, reply) => {reply();throw Error('Synthetic connection lost after commit');});
  await h.action(() => h.state.saveSelection());assert.equal(h.state.reviewRequired, true);assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);
  await h.action(() => {h.state.resetSelection();h.state.clearSelection();h.state.toggleCategory(ids.other);void h.state.saveSelection();});
  assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);assert.equal(writes(h).length, 1);
  await h.action(() => h.state.refresh());assert.equal(h.state.reviewRequired, false);assert.equal(h.state.dirty, false);
  assert.equal(h.state.message, 'storeSelectionVerified');assert.equal(writes(h).length, 1);
}));

run('unconfirmed no-commit result and failed reconciliation preserve draft; differing readback never autosaves', () => withRuntime(async h => {
  await h.render({actor, listingId: '1001'});await h.action(() => h.state.toggleCategory(ids.other));
  h.fixture.intercept('set_my_listing_store_categories_v2', () => ({data: null, error: {code: 'NETWORK'}}));await h.action(() => h.state.saveSelection());
  h.fixture.intercept('store_categories', () => ({data: null, error: {code: 'NETWORK'}, count: null}));await h.action(() => h.state.refresh());
  assert.equal(h.state.reviewRequired, true);assert.deepEqual(h.state.selectedCategoryIds, [ids.other]);assert.equal(h.state.canSave, false);
  await h.action(() => h.state.refresh());assert.equal(h.state.message, 'storeSelectionDiffers');assert.equal(h.state.canSave, true);
  assert.deepEqual(h.state.savedCategoryIds, []);assert.deepEqual(h.state.selectedCategoryIds, [ids.other]);assert.equal(writes(h).length, 1);
  await h.action(() => h.state.saveSelection());assert.deepEqual(h.state.savedCategoryIds, [ids.other]);
}));

run('a disappearing selected category remains visible as missing until clear/reselect; read errors do not silently erase choices', () => withRuntime(async h => {
  await h.render({actor, listingId: '1001'});await h.action(() => h.state.toggleCategory(ids.child));
  h.fixture.state.categories = h.fixture.state.categories.filter(row => row.id !== ids.child);await h.action(() => h.state.refresh());
  assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);assert.equal(h.state.missingCategoryCount, 1);assert.equal(h.state.canSave, false);
  await h.action(() => h.state.saveSelection());assert.equal(writes(h).length, 0);
  h.fixture.intercept('listing_store_categories', () => ({data: null, error: {code: 'NETWORK'}, count: null}));await h.action(() => h.state.refresh());
  assert.equal(h.state.error, 'storeAssignmentReadFailed');assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);
  await h.action(() => h.state.refresh());await h.action(() => {h.state.clearSelection();h.state.toggleCategory(ids.other);});
  assert.equal(h.state.missingCategoryCount, 0);await h.action(() => h.state.saveSelection());assert.deepEqual(h.state.savedCategoryIds, [ids.other]);
}));

run('old listing replies and callbacks cannot replace or save the newly selected listing scope', () => withRuntime(async h => {
  const gate = h.fixture.holdNext('store_categories');await h.render({actor, listingId: '1001'});const first = await gate.entered, oldSave = h.state.saveSelection;
  await h.render({actor, listingId: '1002'});assert.equal(first.call.signal.aborted, true);assert.deepEqual(h.state.savedCategoryIds, [ids.other]);
  gate.release();await h.flush();assert.equal(h.state.scope.endsWith(':1002'), true);assert.deepEqual(h.state.savedCategoryIds, [ids.other]);
  await h.action(() => oldSave());assert.equal(writes(h).length, 0);
}));

run('identity change invalidates synchronous old handlers and a late save reply; account loss cannot reopen the card', () => withRuntime(async h => {
  await h.render({actor, listingId: '1001'});await h.action(() => h.state.toggleCategory(ids.child));
  const stale = h.state.saveSelection, gate = h.fixture.holdNext('set_my_listing_store_categories_v2');let saving;
  await h.action(() => {saving = stale();});const held = await gate.entered;
  let change;await h.action(() => {change = h.identity.beginIdentityChange(ids.user);void stale();});
  assert.equal(held.call.signal.aborted, true);assert.equal(h.state.loaded, false);assert.deepEqual(h.state.selectedCategoryIds, []);
  gate.release();await act(async () => {await saving;});await h.flush();assert.equal(h.state.message, null);assert.equal(writes(h).length, 1);
  await h.action(() => h.identity.finishIdentityChange(change));await h.action(() => h.state.refresh());assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);
  const read = h.fixture.holdNext('store_categories');let refreshing;await h.action(() => {refreshing = h.state.refresh();});await read.entered;
  await h.action(() => h.fixture.authEvent('SIGNED_OUT', null));read.release();await act(async () => {await refreshing;});await h.flush();
  assert.equal(h.state.loaded, false);assert.deepEqual(h.state.categories, []);assert.equal(h.state.error, 'storeAssignmentContextChanged');
}));

run('owner soft blocking and same-user token refresh retain an unsaved choice without a read or write', () => withRuntime(async h => {
  await h.render({actor, listingId: '1001'});await h.action(() => h.state.toggleCategory(ids.child));const before = h.fixture.state.calls.length;
  await h.render({actor: {...actor}, listingId: '1001', blocked: true});assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);assert.equal(h.state.canSave, false);
  await h.action(() => {h.state.clearSelection();void h.state.saveSelection();h.fixture.authEvent('TOKEN_REFRESHED', {access_token: 'synthetic-token-A2', user: {id: ids.user}});});
  assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);assert.equal(h.fixture.state.calls.length, before);
  await h.render({actor: {...actor}, listingId: '1001', blocked: false});assert.equal(h.state.canSave, true);assert.deepEqual(h.state.selectedCategoryIds, [ids.child]);
}));

after(() => {
  const drift = [...inputs].filter(([name, digest]) => sha(fs.readFileSync(path.join(root, name))) !== digest).map(([name]) => name);
  const report = {schemaVersion: 1, status: results.every(item => item.status === 'PASS') && !drift.length ? 'PASS' : 'FAIL',
    startedAt, finishedAt: new Date().toISOString(), node: process.version, root, testCount: results.length,
    passed: results.filter(item => item.status === 'PASS').length, failed: results.filter(item => item.status === 'FAIL').length,
    boundary: 'Actual React DOM/jsdom, production API/parser/hook and identity events; synthetic Auth/PostgREST replies. No real Supabase, network, storage or production writes.',
    command: 'NODE_PATH=<isolated jsdom runtime> SELQIRO_STORE_RUNTIME_OUTPUT=<proof> node --test tests/managed-store-category-assignment.test.cjs',
    results, inputs: [...inputs].map(([path, sha256]) => ({path, sha256})), inputDrift: drift};
  if (proofDir) {fs.mkdirSync(proofDir, {recursive: true});fs.writeFileSync(path.join(proofDir, 'client-result.json'), JSON.stringify(report, null, 2) + '\n');}
  assert.deepEqual(drift, []);
});
