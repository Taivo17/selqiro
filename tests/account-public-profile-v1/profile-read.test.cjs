'use strict';
// Existing public TS reader/parser and React SSR, with closed synthetic RPC replies.
// No database, Auth, private account-state read, content writes, network or new dependency.
const {test, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto');
const React = require('react'), {renderToStaticMarkup} = require('react-dom/server');
const {loader, language, root, project} = require('../helpers/jobs-public-loader.cjs');
const I = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const SLUG = 'available-profile';
const storage = project + '/storage/v1/object/public/identity-media/';
const managed = storage + 'managed-profile-v1/' + I + '/44444444-4444-4444-8444-444444444444.webp';
const legacy = storage + 'legacy-cover.webp';
const sources = new Map(), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const previousProject = process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_URL = project;
const proof = {format: 'selqiro-account-public-profile-client-tests-v1', started_at: new Date().toISOString(),
  cases: [], limits: ['RPC transport and account eligibility responses are synthetic.',
    'SQL account eligibility is tested separately; these cases verify preserved profile and media behavior with the new guarded map read.',
    'React renderToStaticMarkup is not a browser, DOM, real service or account-closure test.']};
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
const card = extra => ({identity_id: I, identity_type: 'private', slug: SLUG, display_name: 'Available person',
  bio: 'Public description', avatar_url: storage + 'legacy-avatar.webp', banner_url: managed,
  country: 'Estonia', city: 'Paide', location: 'Paide', location_visibility: 'approximate',
  address_text: 'A private address', website_url: 'https://example.invalid/about', ...extra});
const media = extra => ({identity_id: I, slug: SLUG, avatar_url: storage + 'current-avatar.webp',
  banner_url: managed, banner_width: 1600, banner_height: 900, focus_x: 330, focus_y: 740, zoom: 1250, ...extra});
function fixture({profile = [card()], profileError = null, decoration = media(), mediaError = null} = {}) {
  const calls = [];
  function denied(name) {calls.push({name}); throw new Error('Unexpected public reader access: ' + name);}
  const client = {auth: new Proxy({}, {get(_target, name) {return () => denied('auth.' + String(name));}}),
    from: name => denied('from.' + name), rpc(name, args) {
      calls.push({name, args});
      if (name === 'get_store_by_slug') return Promise.resolve({data: profile, error: profileError});
      if (name === 'get_public_profile_media_v1') return {abortSignal(signal) {
        assert.ok(signal instanceof AbortSignal); assert.equal(signal.aborted, false);
        return Promise.resolve({data: decoration, error: mediaError});
      }};
      if (name === 'get_public_profile_location_v1') return {abortSignal(signal) {
        assert.ok(signal instanceof AbortSignal); assert.equal(signal.aborted, false);
        return Promise.resolve({data: {identity_id: I, location: null}, error: null});
      }};
      throw new Error('Unexpected public RPC: ' + name);
    }};
  const load = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: client}});
  const api = load('src/entities/profile/api/getPublicProfileBySlug.ts');
  return {calls, async read(slug = SLUG) {try {return await api.getPublicProfileBySlug(slug);} finally {remember(load);}}};
}
const expectedReads = [{name: 'get_store_by_slug', args: {store_slug_input: SLUG}},
  {name: 'get_public_profile_media_v1', args: {p_identity_id: I}},
  {name: 'get_public_profile_location_v1', args: {p_identity_id: I}}];

scenario('empty canonical result stops before media, offers, raw tables or private account reads', async () => {
  for (const profile of [[], null]) {
    const f = fixture({profile}); assert.equal(await f.read(), null);
    assert.deepEqual(f.calls, expectedReads.slice(0, 1));
  }
});
scenario('a missing slug performs no request', async () => {
  const f = fixture(); assert.equal(await f.read(''), null); assert.deepEqual(f.calls, []);
});
scenario('readable private and business profiles preserve media fit and address privacy', async () => {
  for (const kind of ['private', 'business']) {
    const f = fixture({profile: [card({identity_type: kind, location_visibility: 'exact'})]}), value = await f.read();
    assert.equal(value.identityId, I); assert.equal(value.identityType, kind);
    assert.equal(value.slug, SLUG); assert.equal(value.displayName, 'Available person');
    assert.equal(value.bio, 'Public description'); assert.equal(value.locationLabel, 'Paide, Estonia');
    assert.equal(value.websiteUrl, 'https://example.invalid/about');
    assert.equal(value.businessAddress, kind === 'business' ? 'A private address' : null);
    assert.equal(value.avatarUrl, media().avatar_url); assert.equal(value.bannerUrl, managed);
    assert.deepEqual(value.bannerFit, {focus_x: 330, focus_y: 740, zoom: 1250});
    assert.equal(value.bannerWidth, 1600); assert.equal(value.bannerHeight, 900);
    assert.equal(Object.hasOwn(value, 'account_state'), false); assert.equal(Object.hasOwn(value, 'email'), false);
    assert.deepEqual(f.calls, expectedReads);
  }
});
scenario('canonical transport error remains an error and does not request alternative profile data', async () => {
  const f = fixture({profile: null, profileError: {message: 'synthetic canonical read failed'}});
  await assert.rejects(f.read(), /synthetic canonical read failed/);
  assert.deepEqual(f.calls, expectedReads.slice(0, 1));
});
scenario('successful media null hides the earlier card when the delegated profile is unavailable', async () => {
  const f = fixture({decoration: null}); assert.equal(await f.read(), null);
  assert.deepEqual(f.calls, expectedReads);
});
scenario('media transport error preserves readable card but omits unavailable managed-cover positioning', async () => {
  for (const banner of [managed, legacy]) {
    const f = fixture({profile: [card({banner_url: banner})], decoration: null,
      mediaError: {message: 'synthetic decorative read failed'}}), value = await f.read();
    assert.equal(value.identityId, I); assert.equal(value.displayName, 'Available person');
    assert.equal(value.bannerUrl, banner === managed ? null : legacy);
    assert.equal(value.avatarUrl, card().avatar_url); assert.deepEqual(f.calls, expectedReads);
  }
});
scenario('real media parser rejects another identity and never copies its decorative values', async () => {
  const f = fixture({decoration: media({identity_id: OTHER, avatar_url: storage + 'other-account.webp'})});
  const value = await f.read(); assert.equal(value.identityId, I);
  assert.equal(value.avatarUrl, card().avatar_url); assert.equal(value.bannerUrl, null);
  assert.equal(JSON.stringify(value).includes('other-account.webp'), false); assert.deepEqual(f.calls, expectedReads);
});
scenario('existing public page distinguishes empty, load and error states without rendering offers', async () => {
  const guarded = {__esModule: true, default: () => assert.fail('Offer section rendered without an available profile')};
  for (const lang of ['et', 'en']) {
    for (const [mode, current] of Object.entries({empty: {profile: null, loading: false, error: null},
      loading: {profile: null, loading: true, error: null}, error: {profile: null, loading: false, error: 'synthetic_error'}})) {
      const load = loader({
        'src/shared/i18n/V2LanguageProvider.tsx': language(lang),
        'src/features/public-profile/model/usePublicProfile.ts': {usePublicProfile: () => current},
        'src/features/viewer-provider-controls/components/ProviderControlsBoundary.tsx': {__esModule: true,
          default: ({children}) => React.createElement(React.Fragment, null, children)},
        'src/features/public-profile/components/PublicProfileListingsSection.tsx': guarded,
        'src/features/public-profile/components/PublicProfileProductShowcasesSection.tsx': guarded,
        'src/features/public-profile/components/PublicProfileServicesSection.tsx': guarded,
        'src/features/public-profile/components/PublicProfileProviderMenu.tsx': guarded,
        'src/features/jobs/components/PublicProfileJobsSection.tsx': guarded,
      });
      const Page = load('src/features/public-profile/components/PublicProfilePage.tsx').default;
      const html = renderToStaticMarkup(React.createElement(Page, {slug: SLUG})); remember(load);
      const emptyTitle = lang === 'et' ? 'Profiili ei leitud' : 'Profile not found';
      const errorTitle = lang === 'et' ? 'Profiili ei saanud laadida' : 'Could not load profile';
      assert.equal(html.includes(emptyTitle), mode === 'empty');
      assert.equal(html.includes(errorTitle), mode === 'error');
      assert.equal(html.includes('<img'), false); assert.equal(html.includes('Available person'), false);
      if (mode === 'empty') assert.ok(html.includes(lang === 'et'
        ? 'See profiil võib olla eemaldatud või mitte avalik.' : 'This profile may have been removed or made private.'));
    }
  }
});

after(() => {
  const drift = [...sources].filter(([name, hash]) => sha(fs.readFileSync(path.join(root, name))) !== hash).map(([name]) => name);
  assert.deepEqual(drift, []);
  for (const name of ['tests/helpers/jobs-public-loader.cjs', 'package.json', 'package-lock.json'])
    sources.set(name, sha(fs.readFileSync(path.join(root, name))));
  proof.finished_at = new Date().toISOString(); proof.status = proof.cases.every(item => item.status === 'PASS') && !drift.length ? 'PASS' : 'FAIL';
  proof.runtime = {node: process.version, typescript: require('typescript').version, react: React.version};
  proof.test_file = {path: 'tests/account-public-profile-v1/profile-read.test.cjs', sha256: sha(fs.readFileSync(__filename))};
  proof.input_sha256 = Object.fromEntries([...sources].sort()); proof.source_drift = drift;
  if (process.env.SELQIRO_PROFILE_ACCOUNT_CLIENT_PROOF)
    fs.writeFileSync(process.env.SELQIRO_PROFILE_ACCOUNT_CLIENT_PROOF, JSON.stringify(proof, null, 2) + '\n');
  if (previousProject === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = previousProject;
});
