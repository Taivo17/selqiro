'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const React = require('react'), {renderToStaticMarkup} = require('react-dom/server');
const {createClient} = require('@supabase/supabase-js');
const {loader, deferred} = require('../helpers/jobs-public-loader.cjs');
const U = '11111111-1111-4111-8111-111111111111', I = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333', R = '44444444-4444-4444-8444-444444444444', NEXT = '55555555-5555-4555-8555-555555555555';
const load = loader(), domain = load('src/features/profile-editor-v2/model/profileLocation.ts');
const {ProfileLocationSession} = load('src/features/profile-editor-v2/model/profileLocationSession.ts');
const lookupDomain = load('src/shared/location/lookupSession.ts');
const {LocationLookupSession, parseLocationSuggestions} = lookupDomain;
const actor = {userId: U, identityId: I};
const place = overrides => ({country_code: 'EE', country_name: 'Estonia', place_name: 'Paide', region_name: 'Järva maakond',
  latitude: 58.885, longitude: 25.558, precision: 'locality', source: 'geoapify', source_id: 'synthetic-paide', source_kind: 'city', ...overrides});
const choice = overrides => ({location: place(), proof: 'synthetic.signed.choice', expires_at: 1795780000, ...overrides});
const patch = overrides => ({display_name: 'Minu profiil', bio: '', website_url: '', country: 'Estonia', city: 'Paide',
  address_text: '', location_visibility: 'city', ...overrides});
const snapshot = (extra = {}, location = place()) => ({profile: {...patch(), user_id: U, identity_id: I, identity_type: 'private', revision: R,
  slug: 'minu-profiil', ...extra}, location});
const context = overrides => ({...actor, accessToken: 'synthetic.expected.account', signal: new AbortController().signal, ...overrides});
const response = (value, status = 200) => new Response(JSON.stringify(value), {status, headers: {'content-type': 'application/json'}});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('v2 envelope is exact, actor-bound, private and keeps valid zero coordinates', () => {
  const value = snapshot({}, place({latitude: 0, longitude: 0}));
  assert.deepEqual(domain.parseProfileLocationSnapshot(value, actor), value);
  assert.deepEqual(domain.parseProfileLocationSnapshot(snapshot({country: 'Eesti', city: 'Vana sisestus'}, null), actor).location, null);
  for (const value of [{...snapshot(), extra: 1}, snapshot({identity_id: OTHER}), snapshot({address_text: 'Private street'}),
    snapshot({location_visibility: 'exact'}), snapshot({city: 'Helsinki'}), snapshot({}, {...place(), street: 'Secret'}),
    snapshot({}, place({latitude: NaN})), snapshot({}, place({source_kind: 'street', precision: 'exact'}))]) {
    assert.throws(() => domain.parseProfileLocationSnapshot(value, actor));
  }
});

test('suggestions retain Unicode and reject wrong-country, malformed or duplicate proofs', () => {
  const jp = choice({location: place({country_code: 'JP', country_name: 'Japan', place_name: '東京', region_name: '東京都'})});
  assert.equal(parseLocationSuggestions({suggestions: [jp]}, 'JP')[0].location.place_name, '東京');
  assert.equal(lookupDomain.locationQuery('  東京  都 '), '東京 都');
  for (const value of [{suggestions: [choice()]}, {suggestions: [jp], extra: true}, {suggestions: [jp, jp]},
    {suggestions: [{...jp, expires_at: 0}]}, {suggestions: [{...jp, proof: 'has spaces'}]}]) {
    assert.throws(() => parseLocationSuggestions(value, 'JP'));
  }
});

function fixture(options = {}) {
  let live = context(), saved = options.initial ?? snapshot(), confirmed = 0;
  const writes = [], reads = [];
  const client = {
    read: async ctx => {reads.push(ctx); return options.read ? options.read(ctx) : saved;},
    save: async (ctx, revision, save, type) => {
      writes.push({ctx, revision, save, type});
      if (options.save) return options.save(ctx, revision, save, type);
      saved = {profile: {...saved.profile, ...save.profile, revision: NEXT}, location: save.expectedLocation}; return saved;
    },
  };
  const session = new ProfileLocationSession({actor, initial: saved, client, context: () => live, confirmed: () => confirmed++});
  return {session, writes, reads, setContext: value => {live = value;}, setSaved: value => {saved = value;}, confirmed: () => confirmed};
}
test('unchanged legacy text can save a bio with keep and no geocoding', async () => {
  const f = fixture({initial: snapshot({country: 'Eesti', city: 'Vana küla'}, null)});
  f.session.edit('bio', 'Uus kirjeldus'); await f.session.save();
  assert.equal(f.writes.length, 1); assert.deepEqual(f.writes[0].save.command, {action: 'keep'});
  assert.equal(f.writes[0].save.profile.city, 'Vana küla'); assert.equal(f.writes[0].save.expectedLocation, null);
  assert.equal(f.session.getSnapshot().notice, 'saved');
});
test('typing a country or place discards its proof and blocks the main save', async () => {
  const f = fixture(); f.session.selectCountry('EE', 'Eesti'); f.session.selectLocation(choice());
  assert.equal(f.session.getSnapshot().locationDraft.mode, 'select');
  f.session.inputPlace('Pa'); await f.session.save();
  assert.equal(f.writes.length, 0); assert.equal(f.session.getSnapshot().notice, 'locationIncomplete');
  assert.equal(f.session.getSnapshot().locationDraft.selection, null);
  f.session.selectLocation(choice()); f.session.inputCountry('Soo');
  assert.equal(f.session.getSnapshot().locationDraft.countryCode, null);
  assert.equal(f.session.getSnapshot().locationDraft.placeQuery, '');
  await f.session.save(); assert.equal(f.writes.length, 0);
});
test('a stale country suggestion cannot replace the selected country', async () => {
  const f = fixture(); f.session.selectCountry('FI', 'Soome'); f.session.selectLocation(choice());
  assert.equal(f.session.getSnapshot().locationDraft.mode, 'editing');
  assert.equal(f.session.getSnapshot().locationDraft.countryCode, 'FI');
  await f.session.save(); assert.equal(f.writes.length, 0);
});
test('one select save contains canonical text and only an opaque location proof', async () => {
  const f = fixture(); f.session.selectCountry('JP', 'Jaapan');
  const jp = choice({location: place({country_code: 'JP', country_name: 'Japan', place_name: '東京', region_name: '東京都', source_id: 'tokyo'})});
  f.session.selectLocation(jp); await f.session.save();
  assert.equal(f.writes.length, 1); assert.deepEqual(f.writes[0].save.command, {action: 'select', proof: jp.proof});
  assert.equal(f.writes[0].save.profile.country, 'Japan'); assert.equal(f.writes[0].save.profile.city, '東京');
  assert.equal(f.session.getSnapshot().dirty, false);
});
test('actual business location change clears the old address and exact visibility', () => {
  const f = fixture({initial: snapshot({identity_type: 'business', address_text: 'Paide tänav 1', location_visibility: 'exact'})});
  f.session.selectCountry('FI', 'Soome'); f.session.selectLocation(choice({location: place({country_code: 'FI', country_name: 'Finland',
    place_name: 'Helsinki', region_name: 'Uusimaa', source_id: 'helsinki'})}));
  const view = f.session.getSnapshot(); assert.equal(view.draft.address_text, ''); assert.equal(view.draft.location_visibility, 'city');
  assert.equal(view.addressReset, true);
});
test('reselecting the same business place keeps its deliberate address visibility', () => {
  const f = fixture({initial: snapshot({identity_type: 'business', address_text: 'Paide tänav 1', location_visibility: 'exact'})});
  f.session.selectCountry('EE', 'Eesti'); f.session.selectLocation(choice());
  assert.equal(f.session.getSnapshot().draft.address_text, 'Paide tänav 1');
  assert.equal(f.session.getSnapshot().draft.location_visibility, 'exact'); assert.equal(f.session.getSnapshot().addressReset, false);
});
test('explicit clear empties both location texts and address while restore preserves other draft edits', async () => {
  const f = fixture({initial: snapshot({identity_type: 'business', address_text: 'Paide tänav 1', location_visibility: 'exact'})});
  f.session.edit('bio', 'Alles jääv kirjeldus'); f.session.clearLocation();
  assert.equal(f.session.getSnapshot().draft.country, ''); assert.equal(f.session.getSnapshot().draft.city, '');
  assert.equal(f.session.getSnapshot().draft.address_text, ''); assert.equal(f.session.getSnapshot().draft.location_visibility, 'city');
  f.session.restoreLocation(); assert.equal(f.session.getSnapshot().draft.address_text, 'Paide tänav 1');
  assert.equal(f.session.getSnapshot().draft.bio, 'Alles jääv kirjeldus');
  f.session.clearLocation(); await f.session.save(); assert.deepEqual(f.writes[0].save.command, {action: 'clear'});
  assert.equal(f.writes[0].save.expectedLocation, null);
});
test('same-identity refresh preserves an unsaved location and detects another revision', () => {
  const f = fixture(); f.session.selectCountry('EE', 'Eesti'); f.session.inputPlace('Pa');
  f.session.suspend(); f.setContext(context()); f.session.revalidate(snapshot());
  assert.equal(f.session.getSnapshot().locationDraft.placeQuery, 'Pa'); assert.equal(f.session.getSnapshot().phase, 'ready');
  f.session.revalidate(snapshot({revision: NEXT})); assert.equal(f.session.getSnapshot().phase, 'conflict');
  assert.equal(f.session.getSnapshot().locationDraft.placeQuery, 'Pa');
});
test('double Save dispatches once and an actor switch cannot adopt its late result', async () => {
  const late = deferred(), f = fixture({save: () => late.promise});
  f.session.edit('bio', 'Old actor'); const saving = f.session.save(); await f.session.save(); assert.equal(f.writes.length, 1);
  f.session.retire(); f.setContext(context({identityId: OTHER}));
  late.resolve(snapshot({revision: NEXT, bio: 'Old actor'})); await saving;
  assert.equal(f.session.getSnapshot().phase, 'retired'); assert.equal(f.confirmed(), 0);
});
test('lost acknowledgement reconciles both profile and canonical location without retrying the save', async () => {
  const f = fixture({save: async () => {throw new domain.ProfileLocationError('unknown');}});
  f.session.selectCountry('EE', 'Eesti'); f.session.selectLocation(choice()); f.session.edit('bio', 'Desired');
  await f.session.save(); await f.session.save(); assert.equal(f.writes.length, 1);
  f.setSaved(snapshot({revision: NEXT, bio: 'Desired'})); await f.session.check();
  assert.equal(f.reads.length, 1); assert.equal(f.writes.length, 1); assert.equal(f.session.getSnapshot().notice, 'checked');
});
test('matching text with a different canonical point cannot confirm an uncertain save', async () => {
  const f = fixture({save: async () => {throw new domain.ProfileLocationError('unknown');}});
  f.session.selectCountry('EE', 'Eesti'); f.session.selectLocation(choice()); await f.session.save();
  f.setSaved(snapshot({revision: NEXT}, place({source_id: 'different-paide'}))); await f.session.check();
  assert.equal(f.session.getSnapshot().phase, 'conflict'); assert.equal(f.writes.length, 1);
});
test('expired proof keeps other edits, requires selection again and never auto retries', async () => {
  const f = fixture({save: async () => {throw new domain.ProfileLocationError('selectionExpired');}});
  f.session.selectCountry('EE', 'Eesti'); f.session.selectLocation(choice()); f.session.edit('bio', 'Unsaved');
  await f.session.save(); assert.equal(f.session.getSnapshot().notice, 'selectionExpired');
  assert.equal(f.session.getSnapshot().locationDraft.selection, null); assert.equal(f.session.getSnapshot().draft.bio, 'Unsaved');
  await f.session.save(); assert.equal(f.writes.length, 1);
});

test('the suggestion session debounces and does not request during IME composition or initial saved state', async () => {
  const requests = [], session = new LocationLookupSession(async request => {requests.push(request); return [];}, 10);
  const base = {countryCode: 'JP', query: '東京', language: 'en', actorKey: 'actor:1', enabled: false, composing: false};
  session.update(base); await delay(15); assert.equal(requests.length, 0);
  session.update({...base, enabled: true, composing: true}); await delay(15); assert.equal(requests.length, 0);
  session.update({...base, enabled: true}); session.update({...base, enabled: true, query: '東京都'});
  assert.equal(requests.length, 0); await delay(15); assert.equal(requests.length, 1); assert.equal(requests[0].query, '東京都'); session.retire();
});
test('country, language and actor changes cancel requests and ignore late results', async () => {
  const requests = [], waits = [];
  const session = new LocationLookupSession(request => {requests.push(request); const wait = deferred(); waits.push(wait); return wait.promise;}, 0);
  const base = {countryCode: 'EE', query: 'Paide', language: 'en', actorKey: 'actor:1', enabled: true, composing: false};
  session.update(base); await delay(5);
  session.update({...base, countryCode: 'FI', query: 'Helsinki', language: 'et', actorKey: 'actor:2'}); await delay(5);
  assert.equal(requests.length, 2); assert.equal(requests[0].signal.aborted, true);
  waits[0].resolve([choice()]); await delay(1); assert.equal(session.getSnapshot().suggestions.length, 0);
  const fi = choice({location: place({country_code: 'FI', country_name: 'Finland', place_name: 'Helsinki'})});
  waits[1].resolve([fi]); await delay(1); assert.equal(session.getSnapshot().suggestions[0].location.country_code, 'FI'); session.retire();
});
test('lookup errors do not trigger hidden retries and suspend can resume the same request', async () => {
  let calls = 0;
  const session = new LocationLookupSession(async () => {++calls; throw new lookupDomain.LocationLookupFailure('rateLimited');}, 0);
  const input = {countryCode: 'EE', query: 'Paide', language: 'et', actorKey: 'actor', enabled: true, composing: false};
  session.update(input); await delay(5); session.update(input); await delay(5);
  assert.equal(calls, 1); assert.equal(session.getSnapshot().error, 'rateLimited');
  session.retry(input); await delay(5); assert.equal(calls, 2);
  session.suspend(); session.update(input); await delay(5); assert.equal(calls, 3); session.retire();
});

function apiFixture(readValue = snapshot()) {
  const requests = [];
  const supabase = createClient('https://syntheticproject.supabase.co', 'synthetic-public-key', {
    accessToken: async () => 'synthetic.other.account',
    global: {fetch: async (url, init) => {requests.push({url: String(url), headers: new Headers(init.headers), body: JSON.parse(init.body)}); return response(readValue);}},
  });
  const api = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: supabase}})('src/features/profile-editor-v2/api/profileLocationClient.ts');
  return {api, requests};
}
test('v2 owner read pins the captured token and uses only the v2 RPC', async () => {
  const f = apiFixture(); const result = await f.api.readProfileLocation(context());
  assert.equal(result.profile.identity_id, I); assert.equal(f.requests.length, 1);
  assert.match(f.requests[0].url, /\/rest\/v1\/rpc\/get_my_profile_editor_v2$/);
  assert.equal(f.requests[0].headers.get('authorization'), 'Bearer synthetic.expected.account');
  assert.deepEqual(f.requests[0].body, {p_expected_user_id: U, p_expected_identity_id: I});
});
test('actual save transport sends canonical patch plus opaque proof and validates exact acknowledgement', async () => {
  const original = global.fetch, requests = [], f = apiFixture();
  global.fetch = async (url, init) => {requests.push({url, init, body: JSON.parse(init.body)}); return response(snapshot({revision: NEXT}));};
  try {
    const save = {profile: patch(), command: {action: 'select', proof: choice().proof}, expectedLocation: place()};
    assert.equal((await f.api.saveProfileLocation(context(), R, save, 'private')).profile.revision, NEXT);
    assert.equal(requests.length, 1); assert.equal(requests[0].url, '/api/v2/profile-location/save');
    assert.equal(requests[0].init.headers.Authorization, 'Bearer synthetic.expected.account');
    assert.deepEqual(requests[0].body, {user_id: U, identity_id: I, expected_revision: R, patch: patch(), location: save.command});
    assert.equal('latitude' in requests[0].body.location, false);
  } finally {global.fetch = original;}
});
test('wrong canonical point, unknown fields or unchanged revision acknowledgements are uncertain', async () => {
  const original = global.fetch, f = apiFixture(), save = {profile: patch(), command: {action: 'keep'}, expectedLocation: place()};
  try {
    for (const value of [snapshot(), snapshot({revision: NEXT}, place({source_id: 'other'})), {...snapshot({revision: NEXT}), extra: true}]) {
      let calls = 0; global.fetch = async () => {++calls; return response(value);};
      await assert.rejects(f.api.saveProfileLocation(context(), R, save, 'private'), error => error.kind === 'unknown'); assert.equal(calls, 1);
    }
  } finally {global.fetch = original;}
});
test('safe errors map without exposing raw response detail and no mutation retry occurs', async () => {
  const original = global.fetch, f = apiFixture(), save = {profile: patch(), command: {action: 'keep'}, expectedLocation: place()};
  try {
    for (const kind of ['selectionExpired', 'forbidden', 'conflict', 'rateLimited', 'unknown']) {
      let calls = 0; global.fetch = async () => {++calls; return response({error: kind}, 400);};
      await assert.rejects(f.api.saveProfileLocation(context(), R, save, 'private'), error => error.kind === kind); assert.equal(calls, 1);
    }
    global.fetch = async () => response({error: 'forbidden', details: 'private database message'}, 403);
    await assert.rejects(f.api.saveProfileLocation(context(), R, save, 'private'), error => error.kind === 'unknown' && !error.message.includes('private database'));
  } finally {global.fetch = original;}
});
test('suggest transport uses captured actor/country/language and rejects a wrong-country response', async () => {
  const original = global.fetch, f = apiFixture(), requests = [];
  global.fetch = async (url, init) => {requests.push({url, init, body: JSON.parse(init.body)}); return response({suggestions: [choice()]});};
  try {
    await assert.rejects(f.api.suggestProfileLocation(context(), {countryCode: 'FI', query: 'Helsinki', language: 'et', signal: new AbortController().signal}),
      error => error.kind === 'unknown');
    assert.equal(requests.length, 1); assert.equal(requests[0].url, '/api/v2/profile-location/suggest');
    assert.deepEqual(requests[0].body, {user_id: U, identity_id: I, country_code: 'FI', query: 'Helsinki', language: 'et'});
  } finally {global.fetch = original;}
});
test('rendered shared picker has two labelled comboboxes, approximate copy and provider attribution', () => {
  const viewLoader = loader({'src/shared/i18n/V2LanguageProvider.tsx': {useV2Translation: catalog => ({language: 'et',
    t: (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll('{'+name+'}', String(value)), catalog.et[key])})}});
  const Picker = viewLoader('src/shared/location/CountryPlaceSelector.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Picker, {value: domain.savedProfileLocationDraft(snapshot()), savedLocation: place(), disabled: false,
    actorKey: 'actor', lookup: async () => [], onCountryInput() {}, onCountrySelect() {}, onPlaceInput() {}, onSelect() {}, onClear() {}, onRestore() {}}));
  assert.equal((html.match(/role="combobox"/g) || []).length, 2); assert.match(html, /Linn või piirkond/);
  assert.match(html, /mitte sinu täpset aadressi/); assert.match(html, /geoapify\.com/); assert.match(html, /openstreetmap\.org\/copyright/);
  assert.doesNotMatch(html, /name="(?:latitude|longitude|street|address)"/);
});
