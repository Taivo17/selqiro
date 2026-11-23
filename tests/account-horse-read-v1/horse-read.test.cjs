'use strict';
// Existing horse clients, parsers, metadata and React SSR with synthetic transport.
// SQL eligibility, browser interaction and live account behavior have separate proof.
const {test, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto');
const React = require('react'), {renderToStaticMarkup} = require('react-dom/server');
const {loader, language, root, project, origin, jwt, J, P, jsonResponse} = require('../helpers/jobs-public-loader.cjs');
const OTHER = '55555555-5555-4555-8555-555555555555', IMAGE = '66666666-6666-4666-8666-666666666666';
const ORDINARY = '9007199254740993', horseUrl = '/api/v2/horse-media/' + P + '/0';
const sources = new Map(), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const originalFetch = global.fetch;
global.fetch = async () => assert.fail('Unexpected network access');
const proof = {format: 'selqiro-account-horse-read-client-tests-v1', started_at: new Date().toISOString(), cases: [],
  limits: ['Transport replies and filtered result sets are synthetic; no SQL, account or live service is accessed.',
    'Actual unchanged clients, parsers, hosted configuration, metadata transport and React components are used.',
    'SSR uses synthetic detail hook state, language context and a return-link stub; no browser or effect-transition proof.',
    'Profile offer RPCs, media authorization, contact/writes, cached responses and account closure are outside scope.']};
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
async function environment({browser = true} = {}, run) {
  const keys = ['NODE_ENV', 'NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL', 'NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW',
    'NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const saved = keys.map(key => [key, process.env[key]]), windowDescriptor = Object.getOwnPropertyDescriptor(global, 'window');
  try {
    for (const key of keys) delete process.env[key];
    process.env.NODE_ENV = 'production'; process.env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL = 'v1';
    process.env.NEXT_PUBLIC_SUPABASE_URL = project; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = jwt('anon');
    if (browser) Object.defineProperty(global, 'window', {value: {location: {origin}}, configurable: true});
    else delete global.window;
    return await run();
  } finally {
    for (const [key, value] of saved) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    if (windowDescriptor) Object.defineProperty(global, 'window', windowDescriptor); else delete global.window;
  }
}
const price = (extra = {}) => ({kind: 'fixed', amount: '9500.25', currency: 'EUR', period: null, ...extra});
const horse = (extra = {}) => ({schema_version: 1, content_type: 'horse_offer', content_id: J, offer_type: 'sale',
  title: 'Readable horse', description: 'A public seller description.', price: price(), country: 'EE', city: 'Paide', region: 'Järvamaa',
  fields: {horse_name: 'Tormi', breed: 'Estonian'}, images: [{id: IMAGE, url: horseUrl}],
  seller_name: 'Readable seller', seller_slug: 'readable-seller', seller_type: 'private',
  published_at: '2026-11-23T08:00:00Z', active_until: null, ...extra});
const card = (extra = {}) => ({content_type: 'horse_offer', content_id: J, offer_type: 'sale', title: 'Readable horse',
  description_preview: 'A public seller description.', price: price(), category: 'horses', subcategory: 'sale', detail_category: null,
  condition: null, country: 'EE', city: 'Paide', image_url: horseUrl, seller_name: 'Readable seller', seller_slug: 'readable-seller',
  seller_avatar_url: null, seller_type: 'private', created_at: '2026-11-23T08:00:00Z', ...extra});
const ordinary = () => card({content_type: 'listing', content_id: ORDINARY, offer_type: null, title: 'Readable bicycle',
  price: {version: 1, kind: 'fixed', amount: '90071992547409.13', currency: 'EUR', legacy_text: null, legacy_amount: null},
  category: null, subcategory: null, condition: 'used', image_url: null});
const page = (extra = {}) => ({schema_version: 1, content_scope: 'marketplace', sort: 'newest', items: [], total_count: '0',
  result_limit: 24, result_offset: 0, has_more: false, next_offset: null, window_limit_reached: false, ...extra});
const input = (extra = {}) => ({query: '', category: 'horses', subcategory: '', detailCategory: '', condition: '', location: '', offset: 0, ...extra});
const args = (extra = {}) => ({p_search_query: '', p_category: 'horses', p_subcategory: null, p_detail_category: null,
  p_condition: null, p_location_query: '', p_result_limit: 24, p_result_offset: 0, ...extra});
function fixture(expectedRpc, data, error = null, integrated = false) {
  const calls = [], signals = [];
  const denied = name => {calls.push({name}); throw new Error('Unexpected reader access: ' + name);};
  const client = {from: name => denied('from.' + name),
    auth: new Proxy({}, {get(_target, name) {return () => denied('auth.' + String(name));}}),
    rpc(name, values) {
      calls.push({name, args: values}); assert.equal(name, expectedRpc); assert.equal(calls.length, 1, 'Repeat or fallback RPC');
      const result = Promise.resolve({data, error});
      result.abortSignal = signal => {assert.ok(signal instanceof AbortSignal); signals.push(signal); return result;};
      return result;
    }};
  const load = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: client}});
  if (integrated) {
    const config = load('src/shared/config/v2Integration.ts');
    assert.equal(config.installHostedPreviewCapability({schemaVersion: 1, mode: 'hosted-preview-v1',
      releaseId: 'listing-publication-hosted-preview-v1', instanceId: P, appOrigin: origin, projectOrigin: project,
      storageOrigin: 'https://vyjletlmwoiwxsnsunlm.storage.supabase.co'}), true);
    assert.equal(config.v2IntegrationEnabled(), true);
  }
  return {calls, signals, async horse(id = J, signal = new AbortController().signal) {
    try {return await load('src/entities/horse-offer/api/getPublicHorse.ts').getPublicHorse(id, signal);} finally {remember(load);}
  }, async search(values) {
    try {return await load('src/entities/listing/api/searchPublicListings.ts').searchPublicListings(values, new AbortController().signal);}
    finally {remember(load);}
  }};
}
const publicCall = f => assert.deepEqual(f.calls, [{name: 'get_public_horse_offer_v1', args: {p_offer_id: J}}]);

scenario('unavailable horse detail stays raw null after one public read without owner or account fallback', async () => {
  const f = fixture('get_public_horse_offer_v1', null), signal = new AbortController().signal;
  assert.equal(await f.horse(J, signal), null); publicCall(f); assert.deepEqual(f.signals, [signal]);
});
scenario('horse detail query failure stays an error with the original abort signal and no retry', async () => {
  const f = fixture('get_public_horse_offer_v1', null, {message: 'synthetic transport failure'}), controller = new AbortController();
  await assert.rejects(f.horse(J, controller.signal), /horse_public_read_unavailable/);
  publicCall(f); assert.deepEqual(f.signals, [controller.signal]);
});
scenario('readable private and business horses retain public fields, exact money and ordered gallery', async () => {
  const responses = [horse({images: [{id: IMAGE, url: horseUrl}, {id: OTHER, url: '/api/v2/horse-media/' + P + '/1'}]}),
    horse({seller_type: 'business', offer_type: 'wanted', price: price({kind: 'budget', amount: '7500.50'}),
      fields: {preferred_breed: 'Estonian', intended_use: 'Family riding'}, city: 'Türi', region: null,
      active_until: '2099-12-31T08:00:00Z'})];
  for (const response of responses) {
    const f = fixture('get_public_horse_offer_v1', response), result = await f.horse();
    assert.equal(result.id, J); assert.equal(result.offerType, response.offer_type); assert.equal(result.sellerType, response.seller_type);
    assert.deepEqual(result.price, response.price); assert.deepEqual(result.images, response.images); assert.deepEqual(result.fields, response.fields);
    assert.equal(result.city, response.city); assert.equal(result.region, response.region); assert.equal(result.country, 'EE');
    assert.equal(result.sellerSlug, response.seller_slug); assert.equal(result.activeUntil, response.active_until);
    for (const field of ['account_state', 'accountUserId', 'identity_id', 'owner_email', 'location_text', 'latitude'])
      assert.equal(Object.hasOwn(result, field), false);
    publicCall(f);
  }
});
scenario('horse detail rejects cross-ID, private fields, owner media and invented null envelopes without fallback', async () => {
  for (const response of [horse({content_id: OTHER}), horse({account_state: 'active'}), horse({location_text: 'Private address'}),
    horse({images: [{id: IMAGE, url: '/api/v2/horse-owner-media/' + P + '/0'}]}), {item: null}]) {
    const f = fixture('get_public_horse_offer_v1', response); await assert.rejects(f.horse()); publicCall(f);
  }
});
scenario('invalid horse identifiers are unavailable without any public or private request', async () => {
  for (const id of [ORDINARY, '', '../private', '00000000-0000-0000-0000-000000000000']) {
    const f = fixture('get_public_horse_offer_v1', horse()); assert.equal(await f.horse(id), null); assert.deepEqual(f.calls, []);
  }
});
scenario('horse discovery accepts authoritative empty pages without trying another feed', () => environment({}, async () => {
  for (const response of [page(), page({result_offset: 24, total_count: '2'})]) {
    const f = fixture('search_public_marketplace_v1', response, null, true), result = await f.search(input({offset: response.result_offset}));
    assert.deepEqual(result, {items: [], totalCount: response.total_count, offset: response.result_offset,
      hasMore: false, nextOffset: null, windowLimitReached: false});
    assert.deepEqual(f.calls, [{name: 'search_public_marketplace_v1', args: args({p_result_offset: response.result_offset})}]);
  }
}));
scenario('filtered mixed discovery preserves ordinary and horse order, exact IDs and shared last-page count', () => environment({}, async () => {
  const response = page({items: [ordinary(), card(), card({content_id: OTHER, offer_type: 'lease', subcategory: 'lease',
    price: price({amount: '250.75', period: 'month'}), seller_type: 'business'})], total_count: '27', result_offset: 24});
  const f = fixture('search_public_marketplace_v1', response, null, true), result = await f.search(input({category: '', offset: 24,
    query: ' readable ', location: ' Paide '}));
  assert.deepEqual(result.items.map(item => [item.contentType, item.id]), [['listing', ORDINARY], ['horse_offer', J], ['horse_offer', OTHER]]);
  assert.equal(result.totalCount, '27'); assert.equal(result.hasMore, false); assert.equal(result.nextOffset, null);
  assert.equal(result.items[0].priceAmount, '90071992547409.13'); assert.deepEqual(result.items[1].horsePrice, price());
  assert.deepEqual(result.items[2].horsePrice, price({amount: '250.75', period: 'month'}));
  assert.deepEqual(f.calls, [{name: 'search_public_marketplace_v1', args: args({p_category: null, p_result_offset: 24,
    p_search_query: 'readable', p_location_query: 'Paide'})}]);
}));
scenario('horse discovery rejects wrong page contracts, private cards and query failure without fallback', () => environment({}, async () => {
  for (const response of [page({total_count: '1'}), page({items: [card()], total_count: '1', next_offset: 24}),
    page({items: [card({account_state: 'active'})], total_count: '1'}), page({result_offset: 24}),
    page({items: [card(), card()], total_count: '2'})]) {
    const f = fixture('search_public_marketplace_v1', response, null, true); await assert.rejects(f.search(input()));
    assert.deepEqual(f.calls, [{name: 'search_public_marketplace_v1', args: args()}]);
  }
  const f = fixture('search_public_marketplace_v1', null, {message: 'synthetic failure'}, true);
  await assert.rejects(f.search(input())); assert.deepEqual(f.calls, [{name: 'search_public_marketplace_v1', args: args()}]);
}));
async function metadata(response, status = 200) {
  const calls = [], load = loader(), previous = global.fetch;
  global.fetch = async (url, init) => {calls.push({url, init}); assert.equal(calls.length, 1); return jsonResponse(response, status);};
  try {return {value: await load('src/server/sharing/offerMetadata.ts').generateOfferMetadata('horse', J), calls};}
  finally {remember(load); global.fetch = previous;}
}
function anonymousRequest(calls) {
  assert.equal(calls.length, 1); const {url, init} = calls[0];
  assert.equal(url, project + '/rest/v1/rpc/get_public_horse_offer_v1');
  assert.equal(init.method, 'POST'); assert.deepEqual(JSON.parse(init.body), {p_offer_id: J});
  assert.equal(init.credentials, 'omit'); assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
  assert.equal(init.referrerPolicy, 'no-referrer'); assert.equal(init.headers.get('cookie'), null);
  assert.equal(init.headers.get('apikey'), jwt('anon')); assert.equal(init.headers.get('authorization'), 'Bearer ' + jwt('anon'));
  assert.ok(init.signal instanceof AbortSignal);
}
scenario('unavailable or failed anonymous horse metadata stays generic with one public request', () => environment({browser: false}, async () => {
  for (const [response, status] of [[null, 200], [null, 500], [horse({content_id: OTHER}), 200],
    [horse({active_until: '2000-01-01T00:00:00Z'}), 200]]) {
    const {value, calls} = await metadata(response, status); anonymousRequest(calls);
    assert.equal(value.title, 'Selqiro'); assert.deepEqual(value.robots, {index: false, follow: false});
    assert.deepEqual(value.openGraph.images, []); assert.deepEqual(value.twitter.images, []);
    assert.equal(Object.hasOwn(value, 'alternates'), false); assert.equal(JSON.stringify(value).includes('Readable horse'), false);
  }
}));
scenario('readable horse metadata uses anonymous public fields and refuses privileged credentials', () => environment({browser: false}, async () => {
  for (const active_until of [null, '2099-12-31T08:00:00Z']) {
    const {value, calls} = await metadata(horse({active_until})); anonymousRequest(calls);
    assert.equal(value.title, 'Readable horse | Selqiro'); assert.equal(value.description, 'A public seller description.');
    assert.equal(value.alternates.canonical, origin + '/v2/horse-offer/' + J);
    assert.deepEqual(value.openGraph.images, [{url: origin + horseUrl, alt: 'Readable horse'}]);
    assert.deepEqual(value.twitter.images, [origin + horseUrl]);
  }
  for (const role of ['authenticated', 'service_role']) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = jwt(role);
    const {value, calls} = await metadata(horse()); assert.deepEqual(calls, []); assert.equal(value.title, 'Selqiro');
  }
}));
scenario('existing horse view separates loading, unavailable, error and stale-ID states without offer actions', async () => {
  const guarded = {__esModule: true, default: () => assert.fail('Offer action or gallery rendered without an available horse')};
  for (const lang of ['et', 'en']) for (const mode of ['loading', 'unavailable', 'error', 'stale']) {
    const load = loader({'src/shared/i18n/V2LanguageProvider.tsx': language(lang),
      'src/entities/horse-offer/api/getPublicHorse.ts': {getPublicHorse: () => assert.fail('SSR executed an effect')},
      'src/entities/listing/ui/ListingPrice.tsx': guarded,
      'src/features/horse-offer-public/components/HorseContactButton.tsx': guarded,
      'src/shared/media/PublicPhotoGallery.tsx': guarded,
      'src/shared/sharing/ShareOfferButton.tsx': guarded,
      'src/features/listing-navigation/components/ListingReturnBackButton.tsx': {__esModule: true,
        default: ({fallbackHref}) => React.createElement('a', {href: fallbackHref}, 'Back')},
    });
    const Component = load('src/features/horse-offer-public/components/PublicHorsePage.tsx').default;
    const previous = React.useState; let calls = 0, html;
    const read = mode === 'loading' ? null : {id: mode === 'stale' ? OTHER : J, item: null, error: mode === 'error'};
    React.useState = initial => {calls++; return [initial === null ? read : initial, () => assert.fail('SSR state update')];};
    try {html = renderToStaticMarkup(React.createElement(Component, {offerId: J}));}
    finally {React.useState = previous; remember(load);}
    assert.equal(calls, 2);
    assert.equal(html.includes(lang === 'et' ? 'Laen kuulutust…' : 'Loading listing…'), mode === 'loading' || mode === 'stale');
    assert.equal(html.includes(lang === 'et' ? 'See kuulutus ei ole praegu saadaval.' : 'This listing is currently unavailable.'), mode === 'unavailable');
    assert.equal(html.includes(lang === 'et' ? 'Kuulutuse laadimine ei õnnestunud.' : 'Could not load the listing.'), mode === 'error');
    assert.equal(html.includes('<button'), mode === 'error');
    assert.equal(html.includes('href="/v2/products?category=horses"'), mode === 'error' || mode === 'unavailable');
    assert.equal(html.includes('<img'), false); assert.equal(html.includes('Readable horse'), false);
  }
});
scenario('existing search and profile horse cards retain the public UUID detail link', async () => {
  for (const lang of ['et', 'en']) {
    const load = loader({'src/shared/i18n/V2LanguageProvider.tsx': {...language(lang), useV2Language: () => ({language: lang})}});
    const item = load('src/entities/listing/model/publicRead/publicMarketplace.ts').parsePublicMarketplace(
      page({items: [card()], total_count: '1'}), 0).items[0];
    for (const name of ['src/features/public-listing-search/components/SearchResultCard.tsx',
      'src/features/public-profile/components/PublicProfileListingCard.tsx']) {
      const Component = load(name).default;
      const html = renderToStaticMarkup(React.createElement(Component, {item, expanded: false, onOpen() {}}));
      assert.ok(html.includes('href="/v2/horse-offer/' + J + '"')); assert.ok(html.includes('Readable horse'));
      assert.equal(html.includes('/v2/my-area/'), false); assert.equal(html.includes('/v2/listing/' + J), false);
      assert.ok(html.includes(horseUrl));
    }
    remember(load);
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
  proof.test_file = {path: 'tests/account-horse-read-v1/horse-read.test.cjs', sha256: sha(fs.readFileSync(__filename))};
  proof.input_sha256 = Object.fromEntries([...sources].sort()); proof.source_drift = drift;
  if (process.env.SELQIRO_HORSE_ACCOUNT_CLIENT_PROOF)
    fs.writeFileSync(process.env.SELQIRO_HORSE_ACCOUNT_CLIENT_PROOF, JSON.stringify(proof, null, 2) + '\n');
});
