'use strict';
// Actual existing TS readers/parsers and React SSR; bounded synthetic responses only.
// SQL account eligibility, browser interaction and live services are verified separately.
const {test, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto');
const React = require('react'), {renderToStaticMarkup} = require('react-dom/server');
const {loader, language, root, project, origin, jwt, J, P, jsonResponse} = require('../helpers/jobs-public-loader.cjs');
const ID = '9007199254740993', SECOND = '9007199254740995';
const managed = '/api/v2/listing-media/' + P + '/0';
const sources = new Map(), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const originalFetch = global.fetch;
global.fetch = async () => assert.fail('Unexpected network access');
const proof = {format: 'selqiro-account-listing-read-client-tests-v1', started_at: new Date().toISOString(), cases: [],
  limits: ['All transport replies and account-filtered result sets are synthetic; no database or live account is accessed.',
    'Existing readers, parsers, public configuration and metadata transport are real unchanged modules.',
    'SSR uses synthetic hook state, translation context and a return-link stub; it is not browser or hook-transition evidence.',
    'No assertion covers unrelated listing readers, cached images, other offer domains, writes or account closure.']};
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
async function environment({integrated = true, browser = true} = {}, run) {
  const keys = ['NODE_ENV', 'NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL', 'NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW',
    'NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const saved = keys.map(key => [key, process.env[key]]), windowDescriptor = Object.getOwnPropertyDescriptor(global, 'window');
  try {
    for (const key of keys) delete process.env[key];
    process.env.NODE_ENV = 'production'; process.env.NEXT_PUBLIC_SUPABASE_URL = project;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = jwt('anon');
    if (integrated) process.env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL = 'v1';
    if (browser) Object.defineProperty(global, 'window', {value: {location: {origin}}, configurable: true});
    else delete global.window;
    return await run();
  } finally {
    for (const [key, value] of saved) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    if (windowDescriptor) Object.defineProperty(global, 'window', windowDescriptor); else delete global.window;
  }
}
const price = () => ({version: 1, kind: 'fixed', amount: '90071992547409.13', currency: 'EUR', legacy_text: null, legacy_amount: null});
const card = extra => ({content_type: 'listing', content_id: ID, title: 'Available bicycle', description_preview: 'Public description',
  price: price(), category: null, subcategory: null, detail_category: null, condition: 'used', country: 'EE', city: 'Paide',
  image_url: managed, seller_name: 'Available seller', seller_slug: 'available-seller', seller_avatar_url: null,
  seller_type: 'private', created_at: '2026-11-23T08:00:00Z', ...extra});
const mixedCard = extra => ({...card(extra), offer_type: null});
const horse = () => ({...card(), content_type: 'horse_offer', content_id: J, offer_type: 'sale', title: 'Available horse',
  price: {kind: 'contact', amount: null, currency: 'EUR', period: null}, category: 'horses', subcategory: 'sale',
  condition: null, image_url: null, seller_type: 'business'});
const page = extra => ({schema_version: 1, content_scope: 'marketplace', sort: 'newest', items: [], total_count: '0',
  result_limit: 24, result_offset: 0, has_more: false, next_offset: null, window_limit_reached: false, ...extra});
const detailItem = extra => ({...card(), description: 'Public description', title_truncated: false, description_truncated: false,
  images: [{id: P, thumb_url: managed, medium_url: null, original_url: null, is_primary: true, sort_order: 0}],
  images_has_more: false, details: [{key: 'manufacturer', label: 'Manufacturer', value: 'Example'}], details_truncated: false,
  active_until: null, ...extra});
function detail(extra) {const item = detailItem(extra); delete item.description_preview;
  return {schema_version: 1, content_scope: 'public_ordinary_listing_detail', requested_id: ID, item};}
const unavailable = () => ({schema_version: 1, content_scope: 'public_ordinary_listing_detail', requested_id: ID, item: null});
const searchInput = extra => ({query: '', category: '', subcategory: '', detailCategory: '', condition: '', location: '', offset: 0, ...extra});
const searchArgs = (offset = 0, query = '', location = '') => ({p_search_query: query, p_category: null, p_subcategory: null,
  p_detail_category: null, p_condition: null, p_location_query: location, p_result_limit: 24, p_result_offset: offset});
function fixture(rpcName, data, error = null) {
  const calls = [], signals = [];
  const denied = name => {calls.push({name}); throw new Error('Unexpected reader access: ' + name);};
  const client = {from: name => denied('from.' + name),
    auth: new Proxy({}, {get(_target, name) {return () => denied('auth.' + String(name));}}),
    rpc(name, args) {
      calls.push({name, args}); assert.equal(name, rpcName); assert.equal(calls.length, 1, 'Unexpected repeat or fallback RPC');
      const result = Promise.resolve({data, error});
      result.abortSignal = signal => {assert.ok(signal instanceof AbortSignal); signals.push(signal); return result;};
      return result;
    }};
  const load = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: client}});
  const config = load('src/shared/config/v2Integration.ts');
  const integrated = process.env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL === 'v1';
  if (integrated) assert.equal(config.installHostedPreviewCapability({schemaVersion: 1, mode: 'hosted-preview-v1',
    releaseId: 'listing-publication-hosted-preview-v1', instanceId: P, appOrigin: origin, projectOrigin: project,
    storageOrigin: 'https://vyjletlmwoiwxsnsunlm.storage.supabase.co'}), true);
  assert.equal(config.v2IntegrationEnabled(), integrated);
  return {calls, signals, async invoke(name, args) {
    try {return await load('src/entities/listing/api/' + name + '.ts')[name](...args);} finally {remember(load);}
  }};
}
const assertCall = (f, name, args) => assert.deepEqual(f.calls, [{name, args}]);

scenario('hosted marketplace empty results stop without fallback or private account reads', () => environment({}, async () => {
  for (const response of [page(), page({result_offset: 24, total_count: '1'})]) {
    const f = fixture('search_public_marketplace_v1', response), signal = new AbortController().signal;
    const result = await f.invoke('searchPublicListings', [searchInput({offset: response.result_offset}), signal]);
    assert.deepEqual(result, {items: [], totalCount: response.total_count, offset: response.result_offset,
      hasMore: false, nextOffset: null, windowLimitReached: false});
    assertCall(f, 'search_public_marketplace_v1', searchArgs(response.result_offset)); assert.deepEqual(f.signals, [signal]);
  }
}));
scenario('hosted marketplace preserves filtered mixed-card order, exact IDs and prices', () => environment({}, async () => {
  const response = page({items: [mixedCard(), horse(), mixedCard({content_id: SECOND, seller_type: 'business'})],
    total_count: '27', result_offset: 24});
  const f = fixture('search_public_marketplace_v1', response);
  const result = await f.invoke('searchPublicListings', [searchInput({offset: 24, query: ' available ', location: ' Paide '}), new AbortController().signal]);
  assert.deepEqual(result.items.map(item => [item.contentType, item.id]), [['listing', ID], ['horse_offer', J], ['listing', SECOND]]);
  assert.equal(result.totalCount, '27'); assert.equal(result.offset, 24); assert.equal(result.nextOffset, null);
  assert.equal(result.items[0].priceAmount, '90071992547409.13'); assert.equal(result.items[2].priceAmount, '90071992547409.13');
  assert.deepEqual(result.items[1].horsePrice, {kind: 'contact', amount: null, currency: 'EUR', period: null});
  assert.equal(result.items[0].imageUrl, managed); assert.equal(result.items[0].sellerName, 'Available seller');
  assertCall(f, 'search_public_marketplace_v1', searchArgs(24, 'available', 'Paide'));
}));
scenario('hosted marketplace rejects inconsistent pages and transport errors without fallback', () => environment({}, async () => {
  for (const response of [page({total_count: '1'}), page({has_more: true}), page({result_offset: 24}),
    page({items: [mixedCard(), mixedCard()], total_count: '2'})]) {
    const f = fixture('search_public_marketplace_v1', response);
    await assert.rejects(f.invoke('searchPublicListings', [searchInput(), new AbortController().signal]));
    assertCall(f, 'search_public_marketplace_v1', searchArgs());
  }
  const f = fixture('search_public_marketplace_v1', null, {message: 'synthetic failure'});
  await assert.rejects(f.invoke('searchPublicListings', [searchInput(), new AbortController().signal]));
  assertCall(f, 'search_public_marketplace_v1', searchArgs());
}));
scenario('non-integrated v1 search keeps its own empty and legacy-price contract', () => environment({integrated: false}, async () => {
  const legacy = {...card(), price: 'Legacy price label', price_amount: '100.25', currency: null};
  for (const response of [page({content_scope: 'ordinary_listings'}),
    page({content_scope: 'ordinary_listings', items: [legacy], total_count: '1'})]) {
    const f = fixture('search_public_listings_v1', response), result = await f.invoke('searchPublicListings', [searchInput(), new AbortController().signal]);
    assert.equal(result.totalCount, response.total_count); assert.equal(result.items.length, response.items.length);
    if (result.items.length) {assert.equal(result.items[0].id, ID); assert.equal(result.items[0].price, 'Legacy price label');
      assert.equal(result.items[0].priceAmount, '100.25');}
    assertCall(f, 'search_public_listings_v1', searchArgs());
  }
}));
scenario('integrated product reader preserves empty and readable v2 cards', () => environment({}, async () => {
  const f = fixture('search_public_listings_v2', page({schema_version: 2, content_scope: 'ordinary_listings', result_limit: 60}));
  assert.deepEqual(await f.invoke('getProductListings', [{limit: 999}]), []);
  assertCall(f, 'search_public_listings_v2', {p_result_limit: 60, p_result_offset: 0});
  const f2 = fixture('search_public_listings_v2', page({schema_version: 2, content_scope: 'ordinary_listings', result_limit: 30,
    items: [card(), card({content_id: SECOND, seller_type: 'business'})], total_count: '2'}));
  const result = await f2.invoke('getProductListings', []);
  assert.deepEqual(result.map(item => [item.id, item.sellerType]), [[ID, 'private'], [SECOND, 'business']]);
  assert.equal(result[0].priceAmount, '90071992547409.13'); assert.equal(result[0].currency, 'EUR');
  assert.equal(result[0].href, '/v2/listing/' + ID); assert.equal(result[0].isHighlighted, false);
  assert.equal(result[0].imageUrl, managed); assertCall(f2, 'search_public_listings_v2', {p_result_limit: 30, p_result_offset: 0});
}));
scenario('integrated product reader rejects bad pages and query errors without legacy reads', () => environment({}, async () => {
  const responses = [page({schema_version: 2, content_scope: 'ordinary_listings', result_limit: 30, total_count: '1'}),
    page({schema_version: 2, content_scope: 'ordinary_listings', result_limit: 30, items: [card({account_state: 'active'})], total_count: '1'})];
  for (const response of responses) {
    const f = fixture('search_public_listings_v2', response); await assert.rejects(f.invoke('getProductListings', []));
    assertCall(f, 'search_public_listings_v2', {p_result_limit: 30, p_result_offset: 0});
  }
  const f = fixture('search_public_listings_v2', null, {message: 'synthetic failure'});
  await assert.rejects(f.invoke('getProductListings', []), /Kuulutusi ei saanud laadida/);
  assertCall(f, 'search_public_listings_v2', {p_result_limit: 30, p_result_offset: 0});
}));
scenario('integrated detail distinguishes unavailable item from query error without owner fallback', () => environment({}, async () => {
  const f = fixture('get_public_listing_detail_v1', unavailable()); assert.equal(await f.invoke('getListingById', [ID]), null);
  assertCall(f, 'get_public_listing_detail_v1', {p_listing_id: ID});
  const failed = fixture('get_public_listing_detail_v1', null, {message: 'synthetic failure'});
  await assert.rejects(failed.invoke('getListingById', [ID]), /Kuulutust ei saanud laadida/);
  assertCall(failed, 'get_public_listing_detail_v1', {p_listing_id: ID});
}));
scenario('readable private and business detail preserves price, gallery and public-only fields', () => environment({}, async () => {
  for (const seller_type of ['private', 'business']) {
    const f = fixture('get_public_listing_detail_v1', detail({seller_type})), result = await f.invoke('getListingById', [ID]);
    assert.equal(result.id, ID); assert.equal(result.sellerType, seller_type); assert.equal(result.title, 'Available bicycle');
    assert.equal(result.priceAmount, '90071992547409.13'); assert.equal(result.currency, 'EUR');
    assert.deepEqual(result.images, detail().item.images); assert.deepEqual(result.details, {manufacturer: 'Example'});
    assert.equal(result.locationLabel, 'Paide · EE'); assert.equal(result.status, 'active');
    for (const key of ['userId', 'identityId', 'rawLocation', 'listingLat', 'listingLng']) assert.equal(result[key], null);
    assert.equal(Object.hasOwn(result, 'email'), false); assert.equal(Object.hasOwn(result, 'account_state'), false);
    assertCall(f, 'get_public_listing_detail_v1', {p_listing_id: ID});
  }
}));
scenario('detail rejects another ID and private response fields without fallback', () => environment({}, async () => {
  for (const response of [{...detail(), requested_id: SECOND}, detail({content_id: SECOND}), detail({owner_email: 'private@example.invalid'})]) {
    const f = fixture('get_public_listing_detail_v1', response);
    await assert.rejects(f.invoke('getListingById', [ID])); assertCall(f, 'get_public_listing_detail_v1', {p_listing_id: ID});
  }
}));
async function metadata(response, status = 200) {
  const calls = [], load = loader(), previous = global.fetch;
  global.fetch = async (url, init) => {calls.push({url, init}); assert.equal(calls.length, 1); return jsonResponse(response, status);};
  try {return {value: await load('src/server/sharing/offerMetadata.ts').generateOfferMetadata('listing', ID), calls};}
  finally {remember(load); global.fetch = previous;}
}
function publicRequest(calls) {
  assert.equal(calls.length, 1); const {url, init} = calls[0];
  assert.equal(url, project + '/rest/v1/rpc/get_public_listing_detail_v1');
  assert.equal(init.method, 'POST'); assert.deepEqual(JSON.parse(init.body), {p_listing_id: ID});
  assert.equal(init.credentials, 'omit'); assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
  assert.equal(init.referrerPolicy, 'no-referrer'); assert.equal(init.headers.get('cookie'), null);
  assert.equal(init.headers.get('apikey'), jwt('anon')); assert.equal(init.headers.get('authorization'), 'Bearer ' + jwt('anon'));
  assert.ok(init.signal instanceof AbortSignal);
}
scenario('unavailable anonymous listing metadata stays generic with one public request', () => environment({browser: false}, async () => {
  for (const [response, status] of [[unavailable(), 200], [null, 500], [detail({content_id: SECOND}), 200]]) {
    const {value, calls} = await metadata(response, status); publicRequest(calls);
    assert.equal(value.title, 'Selqiro'); assert.deepEqual(value.robots, {index: false, follow: false});
    assert.deepEqual(value.openGraph.images, []); assert.deepEqual(value.twitter.images, []);
    assert.equal(Object.hasOwn(value, 'alternates'), false); assert.equal(JSON.stringify(value).includes('Available bicycle'), false);
  }
}));
scenario('readable anonymous listing metadata uses the fixed public RPC without credentials', () => environment({browser: false}, async () => {
  const {value, calls} = await metadata(detail()); publicRequest(calls);
  assert.equal(value.title, 'Available bicycle | Selqiro'); assert.equal(value.description, 'Public description');
  assert.equal(value.alternates.canonical, origin + '/v2/listing/' + ID);
  assert.deepEqual(value.openGraph.images, [{url: origin + managed, alt: 'Available bicycle'}]);
  assert.equal(value.twitter.card, 'summary_large_image'); assert.deepEqual(value.twitter.images, [origin + managed]);
}));
scenario('existing search UI separates empty, loading and error without rendering cards', async () => {
  const guarded = {__esModule: true, default: () => assert.fail('Card rendered in an empty or failed result')};
  for (const lang of ['et', 'en']) for (const mode of ['empty', 'loading', 'error']) {
    const load = loader({'src/shared/i18n/V2LanguageProvider.tsx': language(lang),
      'src/features/public-listing-search/components/SearchResultCard.tsx': guarded});
    const Component = load('src/features/public-listing-search/components/SearchResults.tsx').default;
    const html = renderToStaticMarkup(React.createElement(Component, {page: mode === 'empty'
      ? {items: [], totalCount: '1', offset: 24, hasMore: false, nextOffset: null, windowLimitReached: false} : null,
      loading: mode === 'loading', error: mode === 'error' ? 'synthetic_error' : null, offset: 24,
      onPage() {}, onRetry() {}, onReset() {}})); remember(load);
    assert.equal(html.includes(lang === 'et' ? 'Kuulutusi ei leitud' : 'No listings found'), mode === 'empty');
    assert.equal(html.includes(lang === 'et' ? 'Kuulutusi ei saanud laadida' : 'Could not load listings'), mode === 'error');
    assert.equal(html.includes(lang === 'et' ? 'Otsin…' : 'Searching…'), mode === 'loading');
    if (mode === 'empty') assert.ok(html.includes(lang === 'et' ? 'Esimesele lehele' : 'First page'));
    assert.equal(html.includes('<img'), false); assert.equal(html.includes('Available bicycle'), false);
  }
});
scenario('existing detail UI separates empty, loading and error without rendering offer actions', async () => {
  const guarded = {__esModule: true, default: () => assert.fail('Offer action or media rendered without an available item')};
  for (const lang of ['et', 'en']) for (const mode of ['empty', 'loading', 'error']) {
    const load = loader({'src/shared/i18n/V2LanguageProvider.tsx': language(lang),
      'src/features/listing-detail/model/useListingDetail.ts': {useListingDetail: () => ({listing: null,
        loading: mode === 'loading', error: mode === 'error' ? 'synthetic_error' : null})},
      'src/entities/listing/ui/ListingPrice.tsx': guarded,
      'src/features/listing-conversation/components/ListingContactButton.tsx': guarded,
      'src/shared/media/PublicPhotoGallery.tsx': guarded,
      'src/shared/sharing/ShareOfferButton.tsx': guarded,
      'src/features/listing-navigation/components/ListingReturnBackButton.tsx': {__esModule: true,
        default: () => React.createElement('a', {href: '/v2/products'}, 'Back')},
    });
    const Component = load('src/features/listing-detail/components/ListingDetailPage.tsx').default;
    const html = renderToStaticMarkup(React.createElement(Component, {listingId: ID})); remember(load);
    assert.equal(html.includes(lang === 'et' ? 'Kuulutust ei leitud' : 'Listing not found'), mode === 'empty');
    assert.equal(html.includes(lang === 'et' ? 'Kuulutust ei saanud laadida' : 'Could not load listing'), mode === 'error');
    assert.equal(html.includes('<img'), false); assert.equal(html.includes('Available bicycle'), false);
    assert.equal(html.includes('href="/v2/products"'), mode !== 'loading');
  }
});

after(() => {
  global.fetch = originalFetch;
  const drift = [...sources].filter(([name, hash]) => sha(fs.readFileSync(path.join(root, name))) !== hash).map(([name]) => name);
  assert.deepEqual(drift, []);
  for (const name of ['tests/helpers/jobs-public-loader.cjs', 'package.json', 'package-lock.json'])
    sources.set(name, sha(fs.readFileSync(path.join(root, name))));
  proof.finished_at = new Date().toISOString(); proof.status = proof.cases.every(item => item.status === 'PASS') && !drift.length ? 'PASS' : 'FAIL';
  proof.runtime = {node: process.version, typescript: require('typescript').version, react: React.version};
  proof.test_file = {path: 'tests/account-listing-read-v1/listing-read.test.cjs', sha256: sha(fs.readFileSync(__filename))};
  proof.input_sha256 = Object.fromEntries([...sources].sort()); proof.source_drift = drift;
  if (process.env.SELQIRO_LISTING_ACCOUNT_CLIENT_PROOF)
    fs.writeFileSync(process.env.SELQIRO_LISTING_ACCOUNT_CLIENT_PROOF, JSON.stringify(proof, null, 2) + '\n');
});
