'use strict';
// Real React DOM, management API/parser/hook and identity events; synthetic Auth/PostgREST.
const {test, before, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {runtime, inputs, root, sha, recordInput, act} = require('./store-category-management-runtime.cjs');
let createManagementFixture, actor, ids; const results = [], startedAt = new Date().toISOString();
const proofDir = process.env.SELQIRO_STORE_MANAGEMENT_OUTPUT;
before(async () => {
  ({createManagementFixture, actor, ids} = await import('./store-category-management-fixture.mjs'));
  for (const name of ['tests/store-category-management.test.cjs', 'tests/store-category-management-runtime.cjs',
    'tests/store-category-management-fixture.mjs', 'tests/managed-store-category-fixture.mjs']) recordInput(path.join(root, name));
});
const run = (name, body) => test(name, {timeout: 15000}, async () => {
  try {await body(); results.push({name, status: 'PASS'});} catch (error) {results.push({name, status: 'FAIL', error: error.stack}); throw error;}
});
const problem = code => error => error?.code === code;
const createId = 'a1111111-1111-4111-8111-111111111111', childId = 'a2222222-2222-4222-8222-222222222222';
const command = (operation = 'create_root', categoryId = createId, name = 'New section', parentId = null, expectedName = null) => ({operation, categoryId, name, parentId, expectedName});
const writes = h => h.fixture.state.managementCommands;
const model = h => h.load('src/entities/store-category/model/managedStoreCategories.ts');
async function withRuntime(body) {const h = runtime(createManagementFixture()); try {await body(h);} finally {await h.close();}}

run('API pins one actor token and creates, renames and deletes only the requested category while retaining listing content', () => withRuntime(async h => {
  h.fixture.state.listings[0].title = 'Retain title'; h.fixture.state.listings[0].images = ['synthetic-image'];
  const before = structuredClone(h.fixture.state.listings);
  const initial = await h.api.read(actor); assert.equal(initial.categories.length, 3);
  const made = await h.api.mutate(actor, command('create_root', createId, '  New\t section  ')); assert.equal(made.name, 'New section');
  const replay = await h.api.mutate(actor, command()); assert.equal(replay.changed, false);
  await h.api.mutate(actor, command('create_child', childId, 'Child', createId));
  await h.api.mutate(actor, command('rename', childId, 'Renamed', createId, 'Child'));
  h.fixture.state.assignments.set('1001', [childId, ids.root]);
  await assert.rejects(() => h.api.mutate(actor, command('delete', createId, 'New section', null, 'New section')), problem('has_children'));
  const removed = await h.api.mutate(actor, command('delete', childId, 'Renamed', createId, 'Renamed'));
  assert.equal(removed.removedListingLinks, 1); assert.deepEqual(h.fixture.state.assignments.get('1001'), [ids.root]);
  await h.api.mutate(actor, command('delete', createId, 'New section', null, 'New section'));
  assert.deepEqual(h.fixture.state.listings, before);
  for (const call of h.fixture.state.calls.filter(call => call.kind !== 'auth')) {
    assert.equal(call.headers.Authorization, 'Bearer synthetic-token-A'); assert.ok(call.signal instanceof AbortSignal);
  }
  for (const call of writes(h)) assert.deepEqual(Object.keys(call.params).sort(), ['p_category_id', 'p_expected_identity_id', 'p_expected_name', 'p_expected_user_id', 'p_name', 'p_operation', 'p_parent_id']);
}));

run('strict JSONB receipt rejects mismatched scope, material, shape and coercion before a result can be acknowledged', () => withRuntime(async h => {
  const parse = model(h).parseManagedStoreCategoryReceipt, requested = command();
  const receipt = () => ({schema_version: 1, operation: 'create_root', actor_user_id: ids.user, identity_id: ids.identity,
    category_id: createId, name: 'New section', sort_order: 3, parent_id: null, changed: true, removed_listing_links: 0});
  assert.equal(parse(receipt(), actor, requested).categoryId, createId);
  for (const mutate of [r => {r.schema_version = '1';}, r => {r.operation = 'rename';}, r => {r.actor_user_id = ids.secondUser;},
    r => {r.identity_id = ids.secondIdentity;}, r => {r.category_id = ids.root;}, r => {r.name = 'Different';},
    r => {r.parent_id = ids.root;}, r => {r.sort_order = '3';}, r => {r.changed = 1;}, r => {r.removed_listing_links = -1;},
    r => {r.removed_listing_links = 1;}, r => {r.extra = true;}]) {
    const row = receipt(); mutate(row); assert.throws(() => parse(row, actor, requested), problem('unknown'));
  }
  assert.throws(() => parse([receipt()], actor, requested), problem('unknown'));
  const before = h.fixture.state.calls.length;
  for (const bad of [{...requested, categoryId: 'bad'}, {...requested, operation: 'update'}, {...requested, name: ''},
    {...requested, name: '🙂'.repeat(61)}, {...requested, parentId: ids.root}, {...requested, expectedName: 'unexpected'}])
    assert.throws(() => h.api.mutate(actor, bad), problem('invalid'));
  assert.equal(h.fixture.state.calls.length, before);
  assert.equal(model(h).prepareManagedStoreCategoryCommand({...requested, name: '🙂'.repeat(60)}).name.length, 120);
}));

run('all paginated rows load with exact count; count drift, duplicate IDs and foreign identity rows fail closed', () => withRuntime(async h => {
  h.fixture.state.categories = Array.from({length: 1003}, (_, index) => ({id: 'a0000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'),
    identity_id: ids.identity, name: 'Section ' + index, sort_order: index, parent_id: null}));
  assert.equal((await h.api.read(actor)).categories.length, 1003);
  assert.deepEqual(h.fixture.state.calls.filter(call => call.name === 'store_categories').map(call => call.range), [[0, 499], [500, 999], [1000, 1499]]);
  for (const change of [reply => ({...reply, count: null}), reply => ({...reply, data: []}),
    reply => ({...reply, data: reply.data.map((row, index) => index === 0 ? {...row, identity_id: ids.secondIdentity} : row)}),
    reply => ({...reply, data: reply.data.map((row, index) => index === 1 ? {...row, id: reply.data[0].id} : row)})]) {
    h.fixture.intercept('store_categories', (_call, run) => change(run())); await assert.rejects(() => h.api.read(actor), problem('read'));
  }
}));

run('same-user token refresh retains captured token; changed identity postflight is unconfirmed, not assumed rolled back', () => withRuntime(async h => {
  h.fixture.intercept('store_categories', (_call, run) => {h.fixture.state.session.access_token = 'synthetic-token-A2'; return run();});
  await h.api.read(actor); assert.ok(h.fixture.state.calls.filter(call => call.kind !== 'auth').every(call => call.headers.Authorization === 'Bearer synthetic-token-A'));
  h.fixture.mutateNext((_call, run) => {const reply = run(); h.fixture.state.activeIdentity = ids.secondIdentity; return reply;});
  await assert.rejects(() => h.api.mutate(actor, command()), problem('unknown'));
  assert.ok(h.fixture.state.categories.some(row => row.id === createId));
  const count = writes(h).length; await assert.rejects(() => h.api.mutate(actor, command()), problem('context')); assert.equal(writes(h).length, count);
}));

run('cancellation before dispatch writes nothing; cancellation after commit returns unknown without replay', () => withRuntime(async h => {
  const before = new AbortController(); before.abort(); await assert.rejects(() => h.api.mutate(actor, command(), before.signal), problem('context')); assert.equal(writes(h).length, 0);
  const gate = h.fixture.holdMutation(), controller = new AbortController();
  const promise = h.api.mutate(actor, command(), controller.signal), rejected = assert.rejects(promise, problem('unknown'));
  const held = await gate.entered; controller.abort(); await rejected; assert.equal(held.call.signal.aborted, true); gate.release(); assert.equal(writes(h).length, 1);
}));

run('React management creates root and child, renames, cancels delete and removes only a childless category', () => withRuntime(async h => {
  await h.render({actor}); assert.equal(h.state.loaded, true);
  await h.action(() => h.state.beginCreate()); await h.action(() => h.state.changeName('Workshop')); const rootId = h.state.editor.categoryId;
  await h.action(() => h.state.submit()); assert.equal(h.state.outcome.code, 'created'); assert.equal(h.state.editor, null);
  await h.action(() => h.state.beginCreate(rootId)); await h.action(() => h.state.changeName('Repairs')); const id = h.state.editor.categoryId;
  await h.action(() => h.state.submit()); await h.action(() => h.state.beginRename(id)); await h.action(() => h.state.changeName('Vehicle repairs'));
  await h.action(() => h.state.submit()); assert.equal(h.state.outcome.code, 'renamed');
  await h.action(() => h.state.beginDelete(rootId)); assert.equal(h.state.editor, null, 'parent with child cannot open delete');
  const before = writes(h).length; await h.action(() => h.state.beginDelete(id)); await h.action(() => h.state.cancelEdit()); assert.equal(writes(h).length, before);
  h.fixture.state.assignments.set('1001', [id]); const listings = structuredClone(h.fixture.state.listings);
  await h.action(() => h.state.beginDelete(id)); await h.action(() => h.state.submit());
  assert.equal(h.state.outcome.removedListingLinks, 1); assert.deepEqual(h.fixture.state.assignments.get('1001'), []); assert.deepEqual(h.fixture.state.listings, listings);
  await h.action(() => h.state.beginDelete(rootId)); await h.action(() => h.state.submit()); assert.equal(h.state.outcome.code, 'deleted');
}));

run('one synchronous operation lock prevents duplicate mutation and editing while a save is pending', () => withRuntime(async h => {
  await h.render({actor}); await h.action(() => h.state.beginRename(ids.other)); await h.action(() => h.state.changeName('Workshop tools'));
  const gate = h.fixture.holdMutation(); let first, second;
  await h.action(() => {first = h.state.submit(); second = h.state.submit();}); await gate.entered;
  assert.equal(writes(h).length, 1); assert.equal(h.state.busy, 'rename');
  await h.action(() => {h.state.changeName('Must not replace'); h.state.cancelEdit(); h.state.beginCreate();}); assert.equal(h.state.editor.name, 'Workshop tools');
  gate.release(); await act(async () => {await Promise.all([first, second]);}); await h.flush(); assert.equal(h.state.outcome.code, 'renamed');
}));

run('lost create acknowledgement preserves stable UUID and input; failed readback keeps the lock until matching readback', () => withRuntime(async h => {
  await h.render({actor}); await h.action(() => h.state.beginCreate()); await h.action(() => h.state.changeName('Workshop')); const draft = {...h.state.editor};
  h.fixture.mutateNext((_call, run) => {run(); throw Error('Synthetic lost acknowledgement');}); await h.action(() => h.state.submit());
  assert.equal(h.state.reviewRequired, true); assert.deepEqual(h.state.editor, draft); assert.equal(h.state.canSubmit, false);
  await h.action(() => {h.state.changeName('Lost'); h.state.cancelEdit(); void h.state.submit();}); assert.deepEqual(h.state.editor, draft); assert.equal(writes(h).length, 1);
  h.fixture.intercept('store_categories', () => ({data: null, error: {code: 'NETWORK'}, count: null})); await h.action(() => h.state.refresh());
  assert.equal(h.state.reviewRequired, true); assert.deepEqual(h.state.editor, draft);
  await h.action(() => h.state.refresh()); assert.equal(h.state.reviewRequired, false); assert.equal(h.state.outcome.code, 'review_matches'); assert.equal(h.state.canSubmit, false);
  await h.action(() => h.state.submit()); assert.equal(writes(h).length, 1); await h.action(() => h.state.cancelEdit()); assert.equal(h.state.editor, null);
}));

run('noncommitted unknown create keeps its UUID after differing readback; a same-named different row is not confirmation', () => withRuntime(async h => {
  await h.render({actor}); await h.action(() => h.state.beginCreate()); await h.action(() => h.state.changeName('New section')); const id = h.state.editor.categoryId;
  h.fixture.mutateNext(() => ({data: null, error: {code: 'NETWORK'}})); await h.action(() => h.state.submit());
  h.fixture.state.categories.push({id: childId, identity_id: ids.identity, name: 'New section', parent_id: null, sort_order: 4});
  await h.action(() => h.state.refresh()); assert.equal(h.state.outcome.code, 'review_differs'); assert.equal(h.state.editor.categoryId, id); assert.equal(writes(h).length, 1);
  h.fixture.state.categories = h.fixture.state.categories.filter(row => row.id !== childId); await h.action(() => h.state.refresh());
  await h.action(() => h.state.submit()); assert.equal(h.state.outcome.code, 'created'); assert.deepEqual(writes(h).map(row => row.params.p_category_id), [id, id]);
}));

run('changed or missing targets preserve draft and original CAS until cancel and reopen', () => withRuntime(async h => {
  await h.render({actor}); await h.action(() => h.state.beginRename(ids.other)); await h.action(() => h.state.changeName('My draft'));
  h.fixture.state.categories.find(row => row.id === ids.other).name = 'Changed elsewhere'; await h.action(() => h.state.refresh());
  assert.equal(h.state.editor.name, 'My draft'); assert.equal(h.state.editor.originalName, 'Tools'); assert.equal(h.state.error, 'stale'); assert.equal(h.state.canSubmit, false);
  await h.action(() => h.state.submit()); assert.equal(writes(h).length, 0); await h.action(() => h.state.cancelEdit());
  await h.action(() => h.state.beginRename(ids.other)); assert.equal(h.state.editor.originalName, 'Changed elsewhere');
  h.fixture.state.categories = h.fixture.state.categories.filter(row => row.id !== ids.other); await h.action(() => h.state.refresh());
  assert.equal(h.state.editor.categoryId, ids.other); assert.equal(h.state.error, 'stale'); assert.equal(h.state.canSubmit, false);
}));

run('explicit rejection preserves input and blocks unchanged retry until refresh; duplicate names may be corrected', () => withRuntime(async h => {
  await h.render({actor}); await h.action(() => h.state.beginRename(ids.other)); await h.action(() => h.state.changeName('Parts')); await h.action(() => h.state.submit());
  assert.equal(h.state.error, 'duplicate'); assert.equal(h.state.reviewRequired, false); assert.equal(h.state.editor.name, 'Parts');
  await h.action(() => h.state.changeName('Workshop')); assert.equal(h.state.canSubmit, true);
  h.fixture.mutateNext(() => ({data: null, error: {code: '42501', message: 'store_category_forbidden'}})); await h.action(() => h.state.submit());
  assert.equal(h.state.error, 'forbidden'); const count = writes(h).length; await h.action(() => h.state.submit()); assert.equal(writes(h).length, count);
  await h.action(() => h.state.refresh()); assert.equal(h.state.editor.name, 'Workshop'); assert.equal(h.state.canSubmit, true); await h.action(() => h.state.submit()); assert.equal(h.state.outcome.code, 'renamed');
}));

run('late read and old handlers cannot replace or mutate the next identity scope', () => withRuntime(async h => {
  const gate = h.fixture.holdNext('store_categories'); await h.render({actor}); const first = await gate.entered, oldBegin = h.state.beginCreate;
  h.fixture.state.activeIdentity = ids.secondIdentity; await h.render({actor: {...actor, identityId: ids.secondIdentity}});
  assert.equal(first.call.signal.aborted, true); assert.deepEqual(h.state.categories.map(row => row.id), [ids.foreign]);
  gate.release(); await h.flush(); await h.action(() => oldBegin()); assert.equal(h.state.editor, null); assert.equal(writes(h).length, 0);
}));

run('identity events retire pending writes synchronously; signout and storage invalidate without late success', () => withRuntime(async h => {
  await h.render({actor}); await h.action(() => h.state.beginRename(ids.other)); await h.action(() => h.state.changeName('Workshop'));
  const stale = h.state.submit, gate = h.fixture.holdMutation(); let saving, change;
  await h.action(() => {saving = stale();}); const held = await gate.entered;
  await h.action(() => {change = h.identity.beginIdentityChange(ids.user); void stale();});
  assert.equal(held.call.signal.aborted, true); assert.equal(h.state.loaded, false); assert.equal(h.state.editor, null);
  gate.release(); await act(async () => {await saving;}); await h.flush(); assert.equal(h.state.outcome, null); assert.equal(writes(h).length, 1);
  await h.action(() => h.identity.finishIdentityChange(change)); await h.action(() => h.state.refresh()); assert.equal(h.state.loaded, true);
  await h.action(() => h.window.dispatchEvent(new h.window.StorageEvent('storage', {key: 'sb-fixture-auth-token'}))); assert.equal(h.state.loaded, false);
  await h.action(() => h.state.refresh()); await h.action(() => h.fixture.authEvent('SIGNED_OUT', null)); assert.equal(h.state.loaded, false); assert.equal(h.state.error, 'context');
}));

run('soft owner checking and same-user token refresh retain the exact draft without extra read/write', () => withRuntime(async h => {
  await h.render({actor}); await h.action(() => h.state.beginRename(ids.other)); await h.action(() => h.state.changeName('Keep draft')); const before = h.fixture.state.calls.length, draft = h.state.editor;
  await h.render({actor: {...actor}, blocked: true}); assert.equal(h.state.disabled, true);
  await h.action(() => {h.state.changeName('Wrong'); h.state.cancelEdit(); void h.state.submit(); h.fixture.authEvent('TOKEN_REFRESHED', {access_token: 'synthetic-token-A2', user: {id: ids.user}});});
  assert.deepEqual(h.state.editor, draft); assert.equal(h.fixture.state.calls.length, before);
  await h.render({actor: {...actor}, blocked: false}); assert.equal(h.state.canSubmit, true); assert.deepEqual(h.state.editor, draft);
}));

run('initial read and confirmed mutations notify existing filters once; legacy deeper rows stay visible without new deep creation', () => withRuntime(async h => {
  h.fixture.state.categories.push({id: createId, identity_id: ids.identity, name: 'Legacy depth', parent_id: ids.child, sort_order: 4});
  let events = 0; h.window.addEventListener('selqiro:store-categories-changed', () => ++events);
  await h.render({actor}); assert.equal(events, 1); assert.equal(h.state.categories.length, 4);
  await h.action(() => h.state.beginCreate(ids.child)); assert.equal(h.state.editor, null);
  await h.action(() => h.state.beginRename(createId)); await h.action(() => h.state.changeName('Legacy renamed')); await h.action(() => h.state.submit()); assert.equal(events, 2);
  await h.action(() => h.state.refresh()); assert.equal(events, 3); await h.flush(); assert.equal(events, 3, 'notification does not cause a self-read loop');
}));

after(() => {
  const drift = [...inputs].filter(([name, digest]) => sha(fs.readFileSync(path.join(root, name))) !== digest).map(([name]) => name);
  const report = {schemaVersion: 1, status: results.every(row => row.status === 'PASS') && !drift.length ? 'PASS' : 'FAIL', startedAt,
    finishedAt: new Date().toISOString(), node: process.version, root, testCount: results.length,
    passed: results.filter(row => row.status === 'PASS').length, failed: results.filter(row => row.status === 'FAIL').length,
    boundary: 'Actual React DOM/jsdom, production management API/parser/hook and identity events; synthetic Auth/PostgREST. No real Supabase, network, storage or production writes.',
    command: 'NODE_PATH=<isolated jsdom runtime> SELQIRO_STORE_MANAGEMENT_OUTPUT=<proof> node --test tests/store-category-management.test.cjs',
    results, inputs: [...inputs].map(([path, sha256]) => ({path, sha256})), inputDrift: drift};
  if (proofDir) {fs.mkdirSync(proofDir, {recursive: true}); fs.writeFileSync(path.join(proofDir, 'api-hook-result.json'), JSON.stringify(report, null, 2) + '\n');}
  assert.deepEqual(drift, []);
});
