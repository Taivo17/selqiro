'use strict';
// Actual TS readers, map URL builders and React SSR; all RPC replies are synthetic.
// No geocoder, map tiles, real account, live database or browser is contacted.
const {test, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto');
const React = require('react'), {renderToStaticMarkup} = require('react-dom/server');
const {createClient} = require('@supabase/supabase-js');
const {loader, deferred, root} = require('../helpers/jobs-public-loader.cjs');
const I = '22222222-2222-4222-8222-222222222222', OTHER = '33333333-3333-4333-8333-333333333333';
const sources = new Map(), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const proof = {format: 'selqiro-public-profile-map-client-tests-v1', started_at: new Date().toISOString(), cases: [],
  limits: ['Actual TypeScript with synthetic RPC transport; database eligibility is verified separately.',
    'React renderToStaticMarkup is not browser, map-provider or deployment verification.',
    'No geocoding, tiles, public site, real account or production database calls.']};
const domainPath = 'src/entities/profile/model/publicProfileLocation.ts';
const apiPath = 'src/entities/profile/api/getPublicProfileLocation.ts';
const mapPath = 'src/features/public-profile/model/publicProfileMap.ts';
const cardPath = 'src/features/public-profile/components/PublicProfileLocationCard.tsx';
function remember(load) {
  for (const [name, hash] of load.inputs) {
    if (sources.has(name)) assert.equal(sources.get(name), hash, 'Source changed: ' + name);
    sources.set(name, hash);
  }
}
function scenario(name, run) {
  test(name, async context => {
    try {await run(context); proof.cases.push({name, status: 'PASS'});}
    catch (error) {proof.cases.push({name, status: 'FAIL', message: error.message}); throw error;}
  });
}
const load = loader(), domain = load(domainPath), maps = load(mapPath);
const place = extra => ({country_code: 'EE', country_name: 'Eesti', place_name: 'Paide linn', region_name: 'Järva maakond',
  latitude: 58.885, longitude: 25.557, precision: 'locality', ...extra});
const envelope = extra => ({identity_id: I, location: place(), ...extra});
const profile = extra => ({identityId: I, identityType: 'private', legacyUserId: null, displayName: 'Avalik profiil', slug: 'avalik-profiil',
  bio: null, avatarUrl: null, bannerUrl: null, bannerDominantColor: null, country: 'Eesti', city: 'Paide linn',
  locationLabel: 'Paide linn, Eesti', websiteUrl: null, businessAddress: null, locationVisibility: 'city', mapLocation: place(), ...extra});
const tick = () => new Promise(resolve => setImmediate(resolve));

scenario('public location parser distinguishes an unavailable profile from a readable profile without a map', () => {
  assert.equal(domain.parsePublicProfileLocation(null, I), null);
  assert.deepEqual(domain.parsePublicProfileLocation(envelope({location: null}), I), {identity_id: I, location: null});
  const value = domain.parsePublicProfileLocation(envelope({location: place({latitude: 0, longitude: 0})}), I);
  assert.equal(value.location.latitude, 0); assert.equal(value.location.longitude, 0);
  assert.ok(Object.isFrozen(value)); assert.ok(Object.isFrozen(value.location));
  assert.equal(domain.parseCoarseProfileLocation(place({country_code: 'JP', place_name: '東京', region_name: '東京都'})).place_name, '東京');
});

scenario('public location parser rejects wrong identity, extra private fields and malformed envelopes', () => {
  for (const value of [undefined, [], {}, 'null', envelope({identity_id: OTHER}), {...envelope(), address_text: 'Private street'},
    envelope({location: {...place(), source_id: 'provider-private-id'}}), envelope({location: undefined})]) {
    assert.throws(() => domain.parsePublicProfileLocation(value, I));
  }
  assert.throws(() => domain.parsePublicProfileLocation(null, 'not-a-uuid'));
  assert.equal(domain.parseCoarseProfileLocation({...place(), source: 'geoapify'}), null);
});

scenario('only bounded locality or region coordinates and canonical countries can become a public map', () => {
  for (const change of [{latitude: NaN}, {latitude: Infinity}, {latitude: 90.1}, {latitude: '58'}, {latitude: null},
    {longitude: -180.1}, {longitude: '25'}, {precision: 'exact'}, {precision: 'street'}, {country_code: 'ZZ'},
    {country_code: 'ee'}, {country_name: ''}, {place_name: ' Paide'}, {region_name: 'Järva\nmaakond'},
    {place_name: 'a'.repeat(121)}, {country_name: 'a'.repeat(101)}, {region_name: 'a'.repeat(161)}]) {
    assert.equal(domain.parseCoarseProfileLocation(place(change)), null, JSON.stringify(change));
  }
  assert.ok(domain.parseCoarseProfileLocation(place({latitude: 90, longitude: -180, region_name: '', precision: 'region'})));
});

function transport(value) {
  const requests = [];
  const client = createClient('https://syntheticproject.supabase.co', 'synthetic-public-key', {
    accessToken: async () => 'synthetic.public.viewer',
    global: {fetch: async (url, init) => {
      requests.push({url: String(url), method: init.method, body: JSON.parse(init.body), signal: init.signal});
      if (typeof value === 'function') return value(requests.at(-1));
      return value instanceof Response ? value : new Response(JSON.stringify(value), {status: 200, headers: {'content-type': 'application/json'}});
    }},
  });
  const local = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: client}}), api = local(apiPath);
  return {requests, async read(id = I, signal) {try {return await api.getPublicProfileLocation(id, signal);} finally {remember(local);}}};
}
scenario('actual Supabase map transport performs one identity-bound RPC and preserves null semantics', async () => {
  for (const value of [envelope(), envelope({location: null}), null]) {
    const f = transport(value); assert.deepEqual(await f.read(), value); assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].url, 'https://syntheticproject.supabase.co/rest/v1/rpc/get_public_profile_location_v1');
    assert.equal(f.requests[0].method, 'POST'); assert.deepEqual(f.requests[0].body, {p_identity_id: I});
    assert.ok(f.requests[0].signal instanceof AbortSignal);
  }
});

scenario('invalid identity and an already aborted caller perform no map request', async () => {
  const f = transport(envelope()), controller = new AbortController(); controller.abort();
  await assert.rejects(f.read('bad'), /profile_location_identity_invalid/);
  await assert.rejects(f.read(I, controller.signal), /public_profile_location_read_failed/);
  assert.deepEqual(f.requests, []);
});

scenario('map transport fails closed on errors or another identity and never retries or leaks backend text', async () => {
  const failure = transport(new Response(JSON.stringify({message: 'private server detail', code: '42501'}),
    {status: 403, headers: {'content-type': 'application/json'}}));
  await assert.rejects(failure.read(), error => error.message === 'public_profile_location_read_failed');
  assert.equal(failure.requests.length, 1);
  const wrong = transport(envelope({identity_id: OTHER}));
  await assert.rejects(wrong.read(), /public_profile_location_response_invalid/);
  assert.equal(wrong.requests.length, 1);
});

function hangingTransport() {
  let requestSignal = null, calls = 0;
  const local = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: {rpc(name, args) {
    ++calls; assert.equal(name, 'get_public_profile_location_v1'); assert.deepEqual(args, {p_identity_id: I});
    return {abortSignal(signal) {requestSignal = signal; return new Promise(() => {});}};
  }}}});
  const api = local(apiPath);
  return {read: signal => api.getPublicProfileLocation(I, signal), calls: () => calls, signal: () => requestSignal, remember: () => remember(local)};
}
scenario('caller cancellation ends a hung map read even when the transport ignores abort', async () => {
  const f = hangingTransport(), controller = new AbortController();
  const pending = f.read(controller.signal), rejected = assert.rejects(pending, /public_profile_location_read_failed/);
  await tick(); assert.equal(f.calls(), 1); controller.abort(); await rejected;
  assert.equal(f.signal().aborted, true); assert.equal(f.calls(), 1); f.remember();
});

scenario('the map deadline ends an unresponsive transport after twelve seconds without retry', async context => {
  context.mock.timers.enable({apis: ['setTimeout']});
  const f = hangingTransport(), pending = f.read(), rejected = assert.rejects(pending, /public_profile_location_read_failed/);
  await tick(); assert.equal(f.calls(), 1); context.mock.timers.tick(12_000); await rejected;
  assert.equal(f.signal().aborted, true); assert.equal(f.calls(), 1); f.remember();
});

const rpcCard = extra => ({identity_id: I, identity_type: 'private', display_name: 'Avalik profiil', slug: 'avalik-profiil',
  country: 'Eesti', city: 'Paide linn', location_visibility: 'city', avatar_url: null, banner_url: null, ...extra});
const rpcMedia = extra => ({identity_id: I, slug: 'avalik-profiil', avatar_url: null, banner_url: null,
  banner_width: null, banner_height: null, focus_x: 500, focus_y: 500, zoom: 1000, ...extra});
function readerFixture({card = rpcCard(), media = rpcMedia(), location = envelope(), mediaError = null, locationError = null} = {}) {
  const calls = [], local = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: {
    from() {assert.fail('Raw profile-table read');}, auth: new Proxy({}, {get() {assert.fail('Private account read');}}),
    rpc(name, args) {
      calls.push({name, args});
      if (name === 'get_store_by_slug') return Promise.resolve({data: card ? [card] : [], error: null});
      const value = name === 'get_public_profile_media_v1' ? media : location;
      assert.ok(['get_public_profile_media_v1', 'get_public_profile_location_v1'].includes(name));
      return {abortSignal(signal) {
        assert.ok(signal instanceof AbortSignal);
        return typeof value === 'function' ? value() : Promise.resolve({data: value,
          error: name === 'get_public_profile_media_v1' ? mediaError : locationError});
      }};
    },
  }}});
  const api = local('src/entities/profile/api/getPublicProfileBySlug.ts');
  return {calls, async read() {try {return await api.getPublicProfileBySlug('avalik-profiil');} finally {remember(local);}}};
}

scenario('public profile starts bounded media and map reads together and joins only the matching locality', async () => {
  const a = deferred(), b = deferred(), f = readerFixture({media: () => a.promise, location: () => b.promise});
  let settled = false; const pending = f.read().then(value => {settled = true; return value;}); await tick();
  assert.deepEqual(f.calls.map(row => row.name), ['get_store_by_slug', 'get_public_profile_media_v1', 'get_public_profile_location_v1']);
  assert.equal(settled, false); b.resolve({data: envelope(), error: null}); await tick(); assert.equal(settled, false);
  a.resolve({data: rpcMedia(), error: null}); const result = await pending;
  assert.deepEqual(result.mapLocation, place()); assert.equal(result.locationVisibility, 'city');
  assert.equal(result.businessAddress, null); assert.equal(result.displayName, 'Avalik profiil');
});

scenario('an explicit unavailable result from either guarded reader removes the earlier public profile', async () => {
  for (const changes of [{location: null}, {media: null}, {location: null, mediaError: {message: 'unreachable'}},
    {media: null, locationError: {message: 'unreachable'}}]) {
    const f = readerFixture(changes); assert.equal(await f.read(), null); assert.equal(f.calls.length, 3);
  }
});

scenario('a missing map or map transport failure keeps a readable profile without a fabricated point', async () => {
  for (const changes of [{location: envelope({location: null})}, {locationError: {message: 'unavailable'}},
    {location: envelope({identity_id: OTHER})}, {location: envelope({location: {...place(), address: 'private'}})}]) {
    const f = readerFixture(changes), value = await f.read();
    assert.equal(value.displayName, 'Avalik profiil'); assert.equal(value.mapLocation, null); assert.equal(f.calls.length, 3);
  }
});

scenario('a concurrent place or visibility change cannot attach a stale map to the public card', async () => {
  for (const changes of [{location: envelope({location: place({place_name: 'Helsinki'})})},
    {location: envelope({location: place({country_name: 'Soome'})})}, {card: rpcCard({location_visibility: 'hidden'})},
    {card: rpcCard({location_visibility: 'unknown'})}, {card: rpcCard({city: null, lat: 1, lng: 2})}]) {
    const f = readerFixture(changes); assert.equal((await f.read()).mapLocation, null);
  }
});

scenario('map visibility independently rejects hidden, unknown, private-exact and inconsistent profiles', () => {
  assert.deepEqual(maps.visibleProfileMapLocation(profile()), place());
  assert.deepEqual(maps.visibleProfileMapLocation(profile({identityType: 'business', locationVisibility: 'exact'})), place());
  for (const change of [{locationVisibility: 'hidden'}, {locationVisibility: null}, {locationVisibility: 'approximate'},
    {identityType: 'admin'}, {identityType: null}, {locationVisibility: 'exact'}, {country: 'Soome'},
    {city: 'Tallinn'}, {mapLocation: null}, {mapLocation: {...place(), source_id: 'private'}}]) {
    assert.equal(maps.visibleProfileMapLocation(profile(change)), null);
  }
});

scenario('OSM maps use a fixed origin and unmarked coarse bounds with a wider region view', () => {
  const city = maps.publicProfileMapUrls(place()), region = maps.publicProfileMapUrls(place({precision: 'region'}));
  const embed = new URL(city.embedUrl), wide = new URL(region.embedUrl);
  assert.equal(embed.origin, 'https://www.openstreetmap.org'); assert.equal(embed.pathname, '/export/embed.html');
  assert.deepEqual([...embed.searchParams.keys()].sort(), ['bbox', 'layer']); assert.equal(embed.searchParams.get('layer'), 'mapnik');
  const bounds = embed.searchParams.get('bbox').split(',').map(Number), regional = wide.searchParams.get('bbox').split(',').map(Number);
  assert.ok(bounds[0] < place().longitude && bounds[2] > place().longitude);
  assert.ok(bounds[1] < place().latitude && bounds[3] > place().latitude);
  assert.ok(regional[2] - regional[0] > bounds[2] - bounds[0]);
  assert.match(city.mapUrl, /#map=12\//); assert.match(region.mapUrl, /#map=8\//);
  assert.doesNotMatch(city.embedUrl, /(?:marker|address|apiKey|Paide|22222222|source_id)/i);
});

scenario('map bounds remain finite and ordered at the equator, poles and international date line', () => {
  for (const [latitude, longitude] of [[0, 0], [90, 180], [-90, -180], [84.9, 179.999], [-84.9, -179.999]]) {
    const value = maps.publicProfileMapUrls(place({latitude, longitude})); assert.ok(value);
    const bounds = new URL(value.embedUrl).searchParams.get('bbox').split(',').map(Number);
    assert.ok(bounds.every(Number.isFinite)); assert.ok(bounds[0] < bounds[2]); assert.ok(bounds[1] < bounds[3]);
    assert.ok(bounds[0] >= -180 && bounds[2] <= 180); assert.ok(bounds[1] >= -85.052 && bounds[3] <= 85.052);
  }
  assert.match(maps.publicProfileMapUrls(place({latitude: 0, longitude: 0})).mapUrl, /\/0\/0$/);
  assert.equal(maps.publicProfileMapUrls(place({latitude: NaN})), null);
});

scenario('only explicitly public business addresses get an encoded official Google Maps link', () => {
  const business = profile({identityType: 'business', locationVisibility: 'exact', businessAddress: 'Pärnu mnt 35 Paide'});
  const url = new URL(maps.publicBusinessMapUrl(business));
  assert.equal(url.origin, 'https://www.google.com'); assert.equal(url.pathname, '/maps/search/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('query'), 'Pärnu mnt 35 Paide, Paide linn, Eesti');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['api', 'query']);
  for (const change of [{identityType: 'private'}, {identityType: null}, {locationVisibility: 'city'},
    {locationVisibility: 'hidden'}, {locationVisibility: null}, {businessAddress: ''}, {country: null}, {city: null}]) {
    assert.equal(maps.publicBusinessMapUrl({...business, ...change}), null);
  }
});

scenario('address links cannot change the destination origin or exceed bounded encoded URL length', () => {
  const business = profile({identityType: 'business', locationVisibility: 'exact', businessAddress: 'A & B # ? @ / tänav 5'});
  const url = new URL(maps.publicBusinessMapUrl(business));
  assert.equal(url.origin, 'https://www.google.com'); assert.equal(url.hash, '');
  assert.equal(url.searchParams.get('query'), 'A & B # ? @ / tänav 5, Paide linn, Eesti');
  for (const address of ['a'.repeat(241), '界'.repeat(240), 'Street\nprivate', ' street ', '\u0000street']) {
    assert.equal(maps.publicBusinessMapUrl({...business, businessAddress: address}), null);
  }
});

function renderCard(value, lang = 'et') {
  const local = loader({'src/shared/i18n/V2LanguageProvider.tsx': {useV2Translation: catalog => ({language: lang,
    t: (key, params = {}) => Object.entries(params).reduce((text, [name, value]) =>
      text.replaceAll('{'+name+'}', String(value)), catalog[lang]?.[key] ?? catalog.en[key])})}});
  const Card = local(cardPath).default, html = renderToStaticMarkup(React.createElement(Card, {profile: value}));
  remember(local); return html;
}

scenario('the real private map card renders a labelled lazy iframe and a separate larger-map link', () => {
  const html = renderCard(profile());
  assert.equal((html.match(/<iframe\b/g) || []).length, 1); assert.match(html, /loading="lazy"/);
  assert.match(html, /title="Linna või piirkonna kaart: Paide linn, Eesti"/);
  assert.match(html, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(html, /Kaart näitab valitud linna või piirkonda\./); assert.match(html, /Vaata suuremat kaarti/);
  assert.match(html, /avaneb uues aknas/); assert.match(html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /google\.com|marker=|apiKey=|bg-gradient/);
});

scenario('the real business map card keeps the coarse map separate from its public street-address action', () => {
  const html = renderCard(profile({identityType: 'business', locationVisibility: 'exact', businessAddress: 'Pärnu mnt 35 Paide'}));
  assert.equal((html.match(/<iframe\b/g) || []).length, 1); assert.equal((html.match(/<a\b/g) || []).length, 2);
  assert.match(html, /Pärnu mnt 35 Paide/); assert.match(html, /Ava aadress Google Mapsis/);
  const src = html.match(/<iframe\b[^>]* src="([^"]+)"/)?.[1]; assert.ok(src);
  assert.doesNotMatch(src, /(?:P%C3%A4rnu|mnt|query=|marker=|google)/);
  assert.match(html, /Kaart näitab valitud linna või piirkonda\./);
});

scenario('hidden profiles render no map or address link even if stale fields remain populated', () => {
  assert.equal(renderCard(profile({identityType: 'business', locationVisibility: 'hidden', businessAddress: 'Hidden street 12'})), '');
  assert.equal(renderCard(profile({locationVisibility: 'hidden'})), '');
  const privateHtml = renderCard(profile({businessAddress: 'Private street 12'}));
  assert.doesNotMatch(privateHtml, /Private street|google\.com/);
});

scenario('legacy or absent map points retain honest text feedback without fake coordinates or a gray placeholder', () => {
  const html = renderCard(profile({mapLocation: null}));
  assert.match(html, /Paide linn, Eesti/); assert.match(html, /Selle asukoha kaart ei ole veel saadaval/);
  assert.doesNotMatch(html, /<iframe|openstreetmap\.org|bg-gradient/);
  assert.equal(renderCard(profile({mapLocation: null, country: null, city: null, locationLabel: ''})), '');
});

scenario('map UI translates between Estonian and English while user location text is escaped unchanged', () => {
  const changed = profile({city: '<Town & district>', locationLabel: '<Town & district>, Eesti',
    mapLocation: place({place_name: '<Town & district>'})});
  const et = renderCard(changed, 'et'), en = renderCard(changed, 'en');
  assert.match(et, /Vaata suuremat kaarti/); assert.match(en, /View larger map/);
  assert.match(en, /The map shows the selected city or area/);
  for (const html of [et, en]) {
    assert.match(html, /&lt;Town &amp; district&gt;, Eesti/); assert.doesNotMatch(html, /<Town/);
    assert.equal((html.match(/<iframe\b/g) || []).length, 1);
  }
});

after(() => {
  remember(load);
  const drift = [...sources].filter(([name, hash]) => sha(fs.readFileSync(path.join(root, name))) !== hash).map(([name]) => name);
  assert.deepEqual(drift, []);
  for (const name of ['tests/helpers/jobs-public-loader.cjs', 'package.json', 'package-lock.json'])
    sources.set(name, sha(fs.readFileSync(path.join(root, name))));
  proof.finished_at = new Date().toISOString(); proof.status = proof.cases.every(item => item.status === 'PASS') && !drift.length ? 'PASS' : 'FAIL';
  proof.runtime = {node: process.version, typescript: require('typescript').version, react: React.version};
  proof.test_file = {path: 'tests/public-profile-map-v1/client.test.cjs', sha256: sha(fs.readFileSync(__filename))};
  proof.input_sha256 = Object.fromEntries([...sources].sort()); proof.source_drift = drift;
  if (process.env.SELQIRO_PUBLIC_PROFILE_MAP_CLIENT_PROOF)
    fs.writeFileSync(process.env.SELQIRO_PUBLIC_PROFILE_MAP_CLIENT_PROOF, JSON.stringify(proof, null, 2) + '\n');
});
