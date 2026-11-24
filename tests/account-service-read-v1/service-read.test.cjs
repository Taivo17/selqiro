'use strict';
// Real unchanged service readers with synthetic public replies. No SQL/browser claim.
const {test, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto');
const F = require('./fixtures.cjs');
const {request, searchInput, service, profileItem, searchPage, profileWire, fixture, S, I, OTHER, C} = F;
const sources = new Map(), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const originalFetch = global.fetch;
global.fetch = async () => assert.fail('Unexpected network access');
const proof = {format: 'selqiro-account-service-client-tests-v1', started_at: new Date().toISOString(), cases: [],
  limits: ['Real unchanged TypeScript parsers, API paths and anonymous preview with synthetic public transport replies.',
    'No live RPC, account/content write, SQL eligibility, Mac, React DOM, browser or deployed journey is proved.',
    'Profile v1 returns an empty array for both unavailable and available-empty profiles; v2 preserves the availability flag.',
    'Service detail viewer changes on an already open page are outside this SQL-only module.']};
function remember(load) {
  for (const [name, hash] of load.inputs) {
    if (sources.has(name)) assert.equal(sources.get(name), hash, 'Source changed: ' + name);
    sources.set(name, hash);
  }
}
function scenario(name, run) {test(name, async () => {
  try {await run(); proof.cases.push({name, status: 'PASS'});}
  catch (error) {proof.cases.push({name, status: 'FAIL', message: error.message}); throw error;}
});}
function parseProfile(value, req, version = 2) {
  const load = F.loader();
  try {return version === 1 ? load('src/entities/profile/model/publicProfileOfferingsV1.ts').parsePublicProfileServicesV1(value, req)
    : load('src/entities/service/model/publicProfileServicesV2.ts').parsePublicProfileServicesV2(value, req);}
  finally {remember(load);}
}
function oneCall(f, name, args, signal) {assert.deepEqual(f.calls, [{name, args, signal}]);}
const detailRpc = 'get_public_service_v1', searchRpc = 'search_public_services_v1', profileRpc = 'get_public_profile_services_v2';

scenario('service detail API keeps unavailable null distinct from active data and transport failure', async () => {
  for (const data of [service(), null]) {
    const signal = new AbortController().signal, f = fixture(() => ({data, error: null}), remember);
    const result = await f.detail(S, signal);
    if (data === null) assert.equal(result, null);
    else {assert.equal(result.id, S); assert.equal(result.priceAmount, '25.50');}
    oneCall(f, detailRpc, {p_service_id: S}, signal);
  }
  const signal = new AbortController().signal, f = fixture(() => ({data: null, error: {message: 'private server detail'}}), remember);
  await assert.rejects(f.detail(S, signal), /^Error: service_public_read_unavailable$/);
  oneCall(f, detailRpc, {p_service_id: S}, signal);
});
scenario('service detail rejects changed IDs and private account fields without a fallback read', async () => {
  for (const data of [service({content_id: OTHER}), service({owner_id: OTHER}), service({account_state: 'active'}),
    service({images: [{id: F.IMAGE, url: '/api/v2/service-owner-media/' + F.P + '/0'}]})]) {
    const signal = new AbortController().signal, f = fixture(() => ({data, error: null}), remember);
    await assert.rejects(f.detail(S, signal), /service_public_response_invalid/);
    oneCall(f, detailRpc, {p_service_id: S}, signal);
  }
});
scenario('service search accepts an empty later page at its original offset without inventing results', async () => {
  for (const offset of [0, 24, 1000000]) {
    const input = searchInput({query: ' repair ', city: ' Paide '}), signal = new AbortController().signal;
    const f = fixture(() => ({data: searchPage([], {offset}), error: null}), remember);
    assert.deepEqual(await f.search(input, offset, signal), {items: [], totalCount: '0', limit: 24, offset, hasMore: false, nextOffset: null});
    oneCall(f, searchRpc, F.searchArgs(input, offset), signal);
  }
});
scenario('service search enforces the narrowed total and rejects inconsistent or private response data', async () => {
  const input = searchInput(), offset = 24, items = [service(), service({content_id: OTHER, seller_type: 'business'})];
  const valid = searchPage(items, {offset, total: 26}), f = fixture(() => ({data: valid, error: null}), remember);
  const result = await f.search(input, offset);
  assert.deepEqual(result.items.map(item => item.id), [S, OTHER]); assert.equal(result.totalCount, '26'); assert.equal(result.nextOffset, null);
  for (const data of [null, {...valid, total_count: '27'}, {...valid, result_offset: 0}, {...valid, next_offset: 26},
    {...valid, items: [service(), service()]}, {...valid, account_user_id: OTHER},
    {...valid, items: [service({owner_email: 'private'}), items[1]]}]) {
    const bad = fixture(() => ({data, error: null}), remember);
    await assert.rejects(bad.search(input, offset), /service_public_response_invalid/); assert.equal(bad.calls.length, 1);
  }
  const failed = fixture(() => ({data: null, error: {message: 'private transport'}}), remember);
  await assert.rejects(failed.search(input, offset), /^Error: service_search_unavailable$/); assert.equal(failed.calls.length, 1);
});
scenario('service profile parsers preserve unavailable envelopes for both versions and original page context', () => {
  for (const version of [1, 2]) for (const storeCategoryId of [null, C]) for (const offset of [0, 24, 100000]) {
    const req = request({storeCategoryId, offset}), wire = profileWire(req, {version, available: false});
    assert.equal(wire.identity_id, null);
    const result = parseProfile(wire, req, version);
    if (version === 1) assert.deepEqual(result, []);
    else assert.deepEqual(result, {totalCount: '0', offset, hasMore: false, nextOffset: null, windowLimitReached: false,
      items: [], sellerSlug: req.sellerSlug, storeCategoryId, profileAvailable: false});
  }
  const req = request();
  assert.equal(parseProfile(profileWire(req), req).profileAvailable, true);
  assert.deepEqual(parseProfile(profileWire(req, {version: 1}), req, 1), []);
});
scenario('service profile parsers reject unavailable identity or image leaks and foreign service ownership', () => {
  for (const version of [1, 2]) {
    const req = request(), absent = profileWire(req, {version, available: false}), active = profileWire(req, {version, items: [profileItem()]});
    for (const data of [null, {...absent, identity_id: I}, {...absent, items: [profileItem()]}, {...absent, account_status: 'closed'},
      {...active, identity_id: OTHER}, {...active, items: [profileItem({identity_id: OTHER})]},
      {...active, items: [profileItem({owner_email: 'private'})]},
      {...active, items: [profileItem({images: [F.clone(profileItem().images[0]), F.clone(profileItem().images[0])]})]}])
      assert.throws(() => parseProfile(data, req, version));
  }
});
scenario('retained service profile v1 API uses the public RPC and never falls back after an unavailable account', async () => {
  await F.withLocalIntegration(async () => {
    for (const available of [true, false]) {
      const req = request(), f = fixture(() => ({data: profileWire(req, {version: 1, available}), error: null}), remember);
      assert.deepEqual(await f.legacyProfile(req), []);
      oneCall(f, 'get_public_profile_services_v1', {p_seller_slug: req.sellerSlug, p_result_limit: req.limit}, null);
    }
  });
});
scenario('current service profile API sends only public scope and keeps unavailable separate from active empty', async () => {
  for (const available of [false, true]) {
    const req = request({storeCategoryId: C, offset: 24}), signal = new AbortController().signal;
    const f = fixture(() => ({data: profileWire(req, {available}), error: null}), remember);
    const result = await f.profile(req, signal);
    assert.equal(result.profileAvailable, available); assert.equal(result.offset, 24); assert.deepEqual(result.items, []);
    oneCall(f, profileRpc, F.profileArgs(req), signal);
  }
});
scenario('service profile paging binds category identity exact totals and the existing result window', () => {
  const req = request({storeCategoryId: C, offset: 24}), item = profileItem();
  const valid = profileWire(req, {items: [item], total: 25}), result = parseProfile(valid, req);
  assert.equal(result.items[0].id, S); assert.equal(result.totalCount, '25'); assert.equal(result.hasMore, false);
  for (const data of [{...valid, schema_version: 1}, {...valid, store_category_id: null}, {...valid, seller_slug: 'other'},
    {...valid, result_offset: 0}, {...valid, total_count: '26'}, {...valid, result_limit: 25},
    {...valid, next_offset: 48}, {...valid, window_limit_reached: true},
    {...valid, items: [item, item], total_count: '26'}]) assert.throws(() => parseProfile(data, req));
  const edge = request({offset: 100000, limit: 1});
  const capped = parseProfile(profileWire(edge, {items: [item], total: '9223372036854775807'}), edge);
  assert.equal(capped.totalCount, '9223372036854775807'); assert.equal(capped.hasMore, true);
  assert.equal(capped.windowLimitReached, true); assert.equal(capped.nextOffset, null);
});
scenario('both service profile API versions keep query and malformed-response failures as errors', async () => {
  for (const version of [1, 2]) for (const reply of [{data: null, error: {message: 'private transport detail'}}, {data: null, error: null},
    {data: profileWire(request(), {version, available: false, items: [profileItem()]}), error: null}]) {
    const req = request(), signal = new AbortController().signal, f = fixture(() => reply, remember);
    await F.withLocalIntegration(async () => {
      await assert.rejects(version === 1 ? f.legacyProfile(req) : f.profile(req, signal), error => !error.message.includes('private transport detail'));
    });
    assert.equal(f.calls.length, 1); assert.equal(f.calls[0].name, version === 1 ? 'get_public_profile_services_v1' : profileRpc);
  }
});
scenario('service profile API rejects a pending reply after abort and invalid scope before transport', async () => {
  const req = request(), controller = new AbortController(), pending = F.deferred();
  const f = fixture(() => pending.promise, remember), reading = f.profile(req, controller.signal);
  await F.tick(); controller.abort(); pending.resolve({data: profileWire(req, {items: [profileItem()]}), error: null});
  await assert.rejects(reading, /^Error: public_profile_services_unavailable$/);
  oneCall(f, profileRpc, F.profileArgs(req), controller.signal);
  for (const change of [{identityId: 'invalid'}, {sellerSlug: ''}, {storeCategoryId: 'invalid'}, {offset: 100001}, {limit: 61}]) {
    const bad = fixture(() => assert.fail('Invalid profile request reached transport'), remember);
    await assert.rejects(bad.profile(request(change))); assert.deepEqual(bad.calls, []);
  }
});
scenario('services category API accepts the unavailable owner envelope and keeps a query error distinct', async () => {
  const req = {...request(), scope: 'services', limit: 100}, signal = new AbortController().signal;
  const wire = {schema_version: 2, content_scope: 'public_profile_store_categories', filter_scope: 'services', seller_slug: req.sellerSlug,
    identity_id: null, profile_available: false, items: [], total_count: '0', result_limit: 100, result_offset: 0,
    has_more: false, next_offset: null, window_limit_reached: false};
  const f = fixture(() => ({data: wire, error: null}), remember);
  assert.deepEqual(await f.categories(req, signal), []);
  oneCall(f, 'get_public_profile_store_categories_v2', {p_seller_slug: req.sellerSlug, p_content_scope: 'services', p_result_limit: 100, p_result_offset: 0}, signal);
  const failed = fixture(() => ({data: null, error: {message: 'private detail'}}), remember);
  await assert.rejects(failed.categories(req, signal), error => !error.message.includes('private detail')); assert.equal(failed.calls.length, 1);
});
scenario('service restoration stops after an aborted or stale first page without exposing a partial window', async () => {
  for (const cancel of ['abort', 'generation']) {
    const controller = new AbortController(), pending = F.deferred(), f = fixture(() => pending.promise, remember);
    let current = true;
    const reading = f.window(searchInput(), 24, 24, controller.signal, () => current);
    await F.tick(); if (cancel === 'abort') controller.abort(); else current = false;
    pending.resolve({data: searchPage(Array.from({length: 24}, (_, index) => F.uniqueService(index)), {total: 48}), error: null});
    await assert.rejects(reading, /^Error: service_search_cancelled$/); assert.equal(f.calls.length, 1);
  }
});
scenario('anonymous service metadata omits unavailable failed or private replies using one anonymous public read', async () => {
  const load = F.loader(), preview = load('src/server/sharing/anonymousOfferPreview.ts').readAnonymousOfferPreview;
  try {
    for (const [data, status] of [[null, 200], [null, 500], [service({account_user_id: OTHER}), 200], [service({content_id: OTHER}), 200]]) {
      const calls = [], result = await preview('service', S, F.config, async (url, init) => {
        calls.push({url, init}); return F.jsonResponse(data, status);
      });
      assert.equal(result, null); assert.equal(calls.length, 1);
      assert.equal(calls[0].url, F.config.projectOrigin + '/rest/v1/rpc/get_public_service_v1');
      assert.deepEqual(JSON.parse(calls[0].init.body), {p_service_id: S});
      assert.equal(calls[0].init.credentials, 'omit'); assert.equal(calls[0].init.cache, 'no-store');
      assert.equal(calls[0].init.headers.get('authorization'), 'Bearer ' + F.config.publicKey);
      assert.equal(calls[0].init.headers.has('cookie'), false);
    }
  } finally {remember(load);}
});
scenario('anonymous service metadata preserves active public fields and refuses privileged or user keys', async () => {
  const load = F.loader(), preview = load('src/server/sharing/anonymousOfferPreview.ts').readAnonymousOfferPreview;
  try {
    const result = await preview('service', S, F.config, async () => F.jsonResponse(service()));
    assert.deepEqual(result, {url: 'https://selqiro.vercel.app/v2/service/' + S, title: service().title,
      description: service().description, image: 'https://selqiro.vercel.app' + F.media});
    for (const role of ['authenticated', 'service_role']) {
      let calls = 0;
      assert.equal(await preview('service', S, {...F.config, publicKey: F.jwt(role)}, async () => {calls++; return F.jsonResponse(service());}), null);
      assert.equal(calls, 0);
    }
  } finally {remember(load);}
});

after(() => {
  global.fetch = originalFetch;
  const drift = [...sources].filter(([name, hash]) => sha(fs.readFileSync(path.join(F.root, name))) !== hash).map(([name]) => name);
  assert.deepEqual(drift, []);
  for (const name of ['tests/helpers/jobs-public-loader.cjs', 'tests/account-service-read-v1/fixtures.cjs', 'package.json', 'package-lock.json'])
    sources.set(name, sha(fs.readFileSync(path.join(F.root, name))));
  proof.finished_at = new Date().toISOString(); proof.status = proof.cases.every(item => item.status === 'PASS') && !drift.length ? 'PASS' : 'FAIL';
  proof.runtime = {node: process.version, typescript: require('typescript').version, react: require('react').version};
  proof.test_file = {path: 'tests/account-service-read-v1/service-read.test.cjs', sha256: sha(fs.readFileSync(__filename))};
  proof.input_sha256 = Object.fromEntries([...sources].sort()); proof.source_drift = drift;
  if (process.env.SELQIRO_SERVICE_ACCOUNT_CLIENT_PROOF)
    fs.writeFileSync(process.env.SELQIRO_SERVICE_ACCOUNT_CLIENT_PROOF, JSON.stringify(proof, null, 2) + '\n');
});
