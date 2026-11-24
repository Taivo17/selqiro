'use strict';
// Real unchanged parsers/APIs, synthetic RPC replies; no SQL eligibility or browser claim.
const {test, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto');
const F = require('./fixtures.cjs');
const {loader, root, I, OTHER, C, H, request, categoryRequest, category, card, horse,
  marketplace, categories, fixture, clone, marketplaceArgs, categoryArgs} = F;
const sources = new Map(), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const originalFetch = global.fetch;
global.fetch = async () => assert.fail('Unexpected network access');
const proof = {format: 'selqiro-account-profile-marketplace-client-tests-v1', started_at: new Date().toISOString(), cases: [],
  limits: ['Real unchanged TypeScript parsers and APIs with synthetic public RPC replies; no database/account/content writes.',
    'No browser, React effect scheduling, deployed API, SQL eligibility or production acceptance is implied.',
    'Separate preparation-only hook harness verifies real hook callbacks under explicit synthetic render/effect scheduling.']};
function remember(load) {
  for (const [name, hash] of load.inputs) {
    if (sources.has(name)) assert.equal(sources.get(name), hash, 'Source changed: ' + name);
    sources.set(name, hash);
  }
}
function scenario(name, run) {
  test(name, async () => {
    try {await run(); proof.cases.push({name, status: 'PASS'});}
    catch (error) {proof.cases.push({name, status: 'FAIL', message: error.message}); throw error;}
  });
}
function parseMarket(value, req, version) {
  const load = loader();
  try {return load('src/entities/listing/model/publicRead/publicProfileMarketplaceV' + version + '.ts')
    ['parsePublicProfileMarketplaceV' + version](value, req);}
  finally {remember(load);}
}
function parseCategories(value, req) {
  const load = loader();
  try {return load('src/entities/store-category/model/publicProfileCategoriesV2.ts').parsePublicProfileCategoriesV2(value, req);}
  finally {remember(load);}
}
function singleCall(f, name, args, signal) {
  assert.equal(f.calls.length, 1); assert.deepEqual(f.calls[0], {name, args, signal});
}
const marketRpc = 'get_public_profile_marketplace_v2', categoryRpc = 'get_public_profile_store_categories_v2';

scenario('both marketplace parser versions preserve unavailable profile envelopes at original category and page', () => {
  for (const version of [1, 2]) for (const storeCategoryId of [null, C]) for (const offset of [0, 24, 100000]) {
    const req = request({storeCategoryId, offset, limit: 24});
    const result = parseMarket(marketplace(req, {version, available: false}), req, version);
    assert.deepEqual(result, {items: [], totalCount: '0', offset, hasMore: false, nextOffset: null, windowLimitReached: false,
      sellerSlug: req.sellerSlug, storeCategoryId, profileAvailable: false});
  }
});
scenario('marketplace parsers distinguish an available empty profile from an unavailable one', () => {
  for (const version of [1, 2]) for (const available of [true, false]) {
    const req = request(), result = parseMarket(marketplace(req, {version, available}), req, version);
    assert.equal(result.profileAvailable, available); assert.deepEqual(result.items, []);
    assert.equal(result.totalCount, '0'); assert.equal(result.hasMore, false);
  }
});
scenario('mixed profile cards keep exact money and server order while v1 and v2 category contracts remain distinct', () => {
  const items = [horse(), card(), horse({content_id: OTHER, seller_type: 'business', offer_type: 'wanted', subcategory: 'wanted',
    price: {kind: 'budget', amount: '8000.50', currency: 'EUR', period: null}})];
  for (const version of [1, 2]) {
    const req = request(), result = parseMarket(marketplace(req, {version, items}), req, version);
    assert.deepEqual(result.items.map(item => [item.contentType, item.id]), [['horse_offer', H], ['listing', '9007199254740993'], ['horse_offer', OTHER]]);
    assert.equal(result.items[1].priceAmount, '90071992547409.13'); assert.deepEqual(result.items[0].horsePrice, items[0].price);
    assert.deepEqual(result.items[2].horsePrice, items[2].price); assert.equal(result.totalCount, '3');
  }
  const req = request({storeCategoryId: C});
  assert.throws(() => parseMarket(marketplace(req, {version: 1, items}), req, 1));
  assert.equal(parseMarket(marketplace(req, {version: 1, items: [card()]}), req, 1).items[0].contentType, 'listing');
  assert.deepEqual(parseMarket(marketplace(req, {items}), req, 2).items.map(item => item.id), [H, card().content_id, OTHER]);
});
scenario('marketplace parser rejects raw null, unavailable content, changed scope, paging and private fields', () => {
  for (const version of [1, 2]) {
    const req = request(), base = marketplace(req, {version, items: [card()]});
    const corruptions = [null, {...base, schema_version: version === 1 ? 2 : 1}, {...base, profile_available: false},
      {...base, owner_email: 'not-public'}, {...base, seller_slug: 'other'}, {...base, store_category_id: C},
      {...base, result_offset: 24}, {...base, total_count: '5'}, {...base, next_offset: 24},
      {...base, items: [card({seller_slug: 'other'})]}, {...base, items: [card({account_state: 'active'})]},
      {...base, items: [card(), card()], total_count: '2'}];
    for (const wire of corruptions) assert.throws(() => parseMarket(wire, req, version));
  }
});
scenario('invalid marketplace inputs stop before any RPC or account fallback', async () => {
  for (const change of [{sellerSlug: ''}, {sellerSlug: ' untrimmed'}, {sellerSlug: 'x'.repeat(161)},
    {storeCategoryId: 'invalid'}, {limit: 0}, {limit: 61}, {offset: -1}, {offset: 100001}, {offset: 1.5}]) {
    const f = fixture(() => assert.fail('Invalid request reached RPC'), remember);
    await assert.rejects(f.marketplace(request(change))); assert.deepEqual(f.calls, []);
  }
});
scenario('current marketplace API accepts one unavailable public response with the exact abort signal', async () => {
  const req = request({storeCategoryId: C, offset: 24}), signal = new AbortController().signal;
  const f = fixture(() => ({data: marketplace(req, {available: false}), error: null}), remember);
  assert.equal((await f.marketplace(req, signal)).profileAvailable, false);
  singleCall(f, marketRpc, marketplaceArgs(req), signal);
});
scenario('current marketplace API preserves active mixed second-page data and canonical exact IDs', async () => {
  const req = request({storeCategoryId: C, offset: 24}), signal = new AbortController().signal;
  const f = fixture(() => ({data: marketplace(req, {items: [horse(), card()], total: 26}), error: null}), remember);
  const result = await f.marketplace(req, signal);
  assert.deepEqual(result.items.map(item => item.id), [H, '9007199254740993']); assert.equal(result.offset, 24);
  assert.equal(result.totalCount, '26'); assert.equal(result.hasMore, false); assert.equal(result.nextOffset, null);
  singleCall(f, marketRpc, marketplaceArgs(req), signal);
});
scenario('marketplace API query and malformed-response failures remain errors without retry or private reads', async () => {
  const req = request();
  for (const reply of [{data: null, error: {message: 'private transport detail'}}, {data: null, error: null},
    {data: marketplace(req, {available: false, items: [card()]}), error: null}]) {
    const signal = new AbortController().signal, f = fixture(() => reply, remember);
    await assert.rejects(f.marketplace(req, signal), error => !error.message.includes('private transport detail'));
    singleCall(f, marketRpc, marketplaceArgs(req), signal);
  }
});
scenario('both category scopes accept unavailable envelopes with null identity and no invented content', () => {
  for (const scope of ['marketplace', 'services']) for (const offset of [0, 100, 100000]) {
    const req = categoryRequest({scope, offset}), wire = categories(req, {available: false}), result = parseCategories(wire, req);
    assert.equal(wire.identity_id, null); assert.deepEqual(result, {totalCount: '0', offset, hasMore: false,
      nextOffset: null, windowLimitReached: false, profileAvailable: false, items: []});
  }
});
scenario('category parser binds the profile identity, scope, hierarchy fields and exact pagination', () => {
  const req = categoryRequest(), items = [category(0), category(1, {parent_id: category(0).id})];
  assert.deepEqual(parseCategories(categories(req, {items}), req).items, items.map(({identity_id, ...item}) => item));
  const base = categories(req, {items});
  for (const wire of [null, {...base, identity_id: OTHER}, {...base, profile_available: false}, {...base, filter_scope: 'services'},
    {...base, seller_slug: 'other'}, {...base, schema_version: 1}, {...base, result_offset: 100}, {...base, owner_id: OTHER},
    {...base, items: [category(0, {identity_id: OTHER}), items[1]]}, {...base, items: [category(0), category(0)]},
    {...base, items: [category(0, {parent_id: category(0).id}), items[1]]}])
    assert.throws(() => parseCategories(wire, req));
  const boundaryReq = categoryRequest({offset: 100000, limit: 1});
  const boundary = parseCategories(categories(boundaryReq, {items: [category(0)], total: 100002}), boundaryReq);
  assert.equal(boundary.windowLimitReached, true); assert.equal(boundary.nextOffset, null);
});
scenario('category APIs return an empty tree for unavailable profiles in either scope with one public read', async () => {
  for (const scope of ['marketplace', 'services']) {
    const req = categoryRequest({scope}), signal = new AbortController().signal;
    const f = fixture(() => ({data: categories(req, {available: false}), error: null}), remember);
    assert.deepEqual(await f.categories(req, signal), []); singleCall(f, categoryRpc, categoryArgs(req), signal);
  }
});
scenario('category API reads the whole contextual tree across pages including a later parent', async () => {
  for (const scope of ['marketplace', 'services']) {
    const req = categoryRequest({scope}), signal = new AbortController().signal;
    const rows = Array.from({length: 101}, (_, n) => category(n, n === 0 ? {parent_id: category(100).id} : {}));
    const f = fixture(call => {
      const pageReq = {...req, offset: call.args.p_result_offset};
      return {data: categories(pageReq, {items: rows.slice(pageReq.offset, pageReq.offset + 100), total: 101}), error: null};
    }, remember);
    const result = await f.categories(req, signal);
    assert.deepEqual(result, rows.map(({identity_id, ...item}) => item));
    assert.deepEqual(f.calls.map(call => [call.name, call.args, call.signal]), [
      [categoryRpc, categoryArgs(req), signal], [categoryRpc, categoryArgs({...req, offset: 100}), signal]]);
  }
});
scenario('category API refuses changed totals, a disappearing profile and duplicate IDs between pages', async () => {
  const req = categoryRequest(), first = Array.from({length: 100}, (_, n) => category(n));
  const secondReq = {...req, offset: 100};
  const secondPages = [categories(secondReq, {items: [category(100), category(101)], total: 102}),
    categories(secondReq, {available: false}), categories(secondReq, {items: [category(0)], total: 101})];
  for (const data of secondPages) {
    const f = fixture((_call, index) => ({data: index === 1 ? categories(req, {items: first, total: 101}) : data, error: null}), remember);
    await assert.rejects(f.categories(req), /public_profile_categories_changed/); assert.equal(f.calls.length, 2);
    assert.ok(f.calls.every(call => call.name === categoryRpc));
  }
});
scenario('category API rejects failed or malformed later pages without exposing a partial tree or retrying', async () => {
  const req = categoryRequest(), first = Array.from({length: 100}, (_, n) => category(n));
  const replies = [{data: null, error: {message: 'private transport detail'}}, {data: null, error: null},
    {data: categories({...req, offset: 100}, {items: [category(100, {identity_id: OTHER})], total: 101}), error: null}];
  for (const reply of replies) {
    const f = fixture((_call, index) => index === 1 ? {data: categories(req, {items: first, total: 101}), error: null} : reply, remember);
    await assert.rejects(f.categories(req), error => !error.message.includes('private transport detail'));
    assert.equal(f.calls.length, 2); assert.ok(f.calls.every(call => call.name === categoryRpc));
  }
});
scenario('category API refuses missing ancestors and cycles instead of returning an incomplete hierarchy', async () => {
  const req = categoryRequest();
  for (const items of [[category(0, {parent_id: category(1).id})],
    [category(0, {parent_id: category(1).id}), category(1, {parent_id: category(0).id})]]) {
    const f = fixture(() => ({data: categories(req, {items}), error: null}), remember);
    await assert.rejects(f.categories(req), /public_profile_categories_incomplete/); assert.equal(f.calls.length, 1);
  }
});
scenario('category API validates inputs and rejects an already aborted read before public transport', async () => {
  for (const change of [{identityId: 'invalid'}, {sellerSlug: ''}, {sellerSlug: ' untrimmed'}, {scope: 'private'}]) {
    const f = fixture(() => assert.fail('Invalid request reached RPC'), remember);
    await assert.rejects(f.categories(categoryRequest(change))); assert.deepEqual(f.calls, []);
  }
  const controller = new AbortController(); controller.abort();
  const f = fixture(() => assert.fail('Aborted request reached RPC'), remember);
  await assert.rejects(f.categories(categoryRequest(), controller.signal), /public_profile_categories_unavailable/);
  assert.deepEqual(f.calls, []);
});
scenario('category API aborts a pending page without continuing into the remaining contextual tree', async () => {
  const req = categoryRequest(), controller = new AbortController(), pending = F.deferred();
  const f = fixture(() => pending.promise, remember), result = f.categories(req, controller.signal);
  await F.tick(); assert.equal(f.calls.length, 1); controller.abort();
  pending.resolve({data: categories(req, {items: Array.from({length: 100}, (_, n) => category(n)), total: 101}), error: null});
  await assert.rejects(result, /public_profile_categories_unavailable/); assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].signal, controller.signal);
});

after(() => {
  global.fetch = originalFetch;
  const drift = [...sources].filter(([name, hash]) => sha(fs.readFileSync(path.join(root, name))) !== hash).map(([name]) => name);
  assert.deepEqual(drift, []);
  for (const name of ['tests/helpers/jobs-public-loader.cjs', 'tests/account-profile-marketplace-read-v1/fixtures.cjs', 'package.json', 'package-lock.json'])
    sources.set(name, sha(fs.readFileSync(path.join(root, name))));
  proof.finished_at = new Date().toISOString(); proof.status = proof.cases.every(item => item.status === 'PASS') && !drift.length ? 'PASS' : 'FAIL';
  proof.runtime = {node: process.version, typescript: require('typescript').version, react: require('react').version};
  proof.test_file = {path: 'tests/account-profile-marketplace-read-v1/profile-marketplace-read.test.cjs', sha256: sha(fs.readFileSync(__filename))};
  proof.input_sha256 = Object.fromEntries([...sources].sort()); proof.source_drift = drift;
  if (process.env.SELQIRO_PROFILE_MARKETPLACE_ACCOUNT_CLIENT_PROOF)
    fs.writeFileSync(process.env.SELQIRO_PROFILE_MARKETPLACE_ACCOUNT_CLIENT_PROOF, JSON.stringify(proof, null, 2) + '\n');
});
