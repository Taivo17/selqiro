'use strict';
// Actual editor/transport modules with a synthetic Supabase fetch. No live accounts or writes.
const test = require('node:test'), assert = require('node:assert/strict');
const React = require('react'), {renderToStaticMarkup} = require('react-dom/server');
const {createClient} = require('@supabase/supabase-js');
const {loader, deferred} = require('./helpers/jobs-public-loader.cjs');
const U = '11111111-1111-4111-8111-111111111111', I = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333', R = '44444444-4444-4444-8444-444444444444';
const NEXT = '55555555-5555-4555-8555-555555555555';
const load = loader(), domain = load('src/features/profile-editor/model/profileEditor.ts');
const {ProfileEditorSession} = load('src/features/profile-editor/model/profileEditorSession.ts');
const fields = load('src/entities/profile/model/publicProfileFields.ts');
const actor = {userId: U, identityId: I};
const patch = overrides => ({display_name: 'Minu profiil', bio: '', website_url: '', country: 'Eesti', city: 'Tallinn',
  address_text: '', location_visibility: 'city', ...overrides});
const snapshot = overrides => ({...patch(), user_id: U, identity_id: I, identity_type: 'private', revision: R,
  slug: 'minu-profiil', ...overrides});
const context = overrides => ({...actor, accessToken: 'synthetic.expected.account', signal: new AbortController().signal, ...overrides});

test('the save payload has only public text fields and captured actor/revision', () => {
  const args = domain.profileSaveArgs(actor, R, patch({display_name: '  Selqiro kasutaja  '}), 'private');
  assert.deepEqual(Object.keys(args).sort(), ['p_expected_identity_id', 'p_expected_revision', 'p_expected_user_id', 'p_patch']);
  assert.equal(args.p_patch.display_name, 'Selqiro kasutaja');
  assert.deepEqual(Object.keys(args.p_patch).sort(), [...domain.PROFILE_FIELDS].sort());
  for (const key of ['plan', 'is_premium', 'avatar_url', 'banner_url', 'identity_type', 'slug', 'user_id', 'lat', 'lng', 'contact_email']) {
    assert.throws(() => domain.profileSaveArgs(actor, R, {...patch(), [key]: 'forbidden'}, 'private'));
  }
  assert.throws(() => domain.profileSaveArgs(actor, 'bad', patch(), 'private'));
  assert.throws(() => domain.profileSaveArgs({...actor, userId: ''}, R, patch(), 'private'));
});

test('name/description limits and explicit business address visibility are enforced', () => {
  assert.equal(domain.validateProfilePatch(patch({display_name: ''}), 'private').patch, null);
  assert.equal(domain.validateProfilePatch(patch({display_name: 'a'.repeat(101)}), 'private').patch, null);
  assert.equal(domain.validateProfilePatch(patch({bio: 'a'.repeat(2001)}), 'private').patch, null);
  assert.ok(domain.validateProfilePatch(patch({bio: 'Tutvustus\nTeine rida'}), 'private').patch);
  for (const value of [patch({address_text: 'Ehitajate tee 42-7'}), patch({location_visibility: 'exact'})]) {
    assert.equal(domain.validateProfilePatch(value, 'private').patch, null);
  }
  assert.equal(domain.validateProfilePatch(patch({location_visibility: 'exact'}), 'business').patch, null);
  assert.ok(domain.validateProfilePatch(patch({location_visibility: 'exact', address_text: 'Ettevõtte tänav 1'}), 'business').patch);
  assert.equal(domain.validateProfilePatch(patch({location_visibility: 'hidden', address_text: 'Ettevõtte tänav 1'}), 'business').patch.address_text, 'Ettevõtte tänav 1');
});

test('external profile links reject executable, credentialed and malformed schemes', () => {
  assert.equal(fields.publicProfileWebsite(' https://example.test/about '), 'https://example.test/about');
  assert.equal(fields.publicProfileWebsite('http://example.test'), 'http://example.test/');
  for (const value of ['javascript:alert(1)', 'data:text/html,test', '//example.test', 'example.test',
    'https://user:secret@example.test', 'https://user@example.test', 'https://example.test\\@evil.test',
    'https://example.test/\nother', 'https://example.test/some where', 'https://', 'file:///etc/passwd']) {
    assert.equal(fields.publicProfileWebsite(value), null, value);
    assert.equal(domain.validateProfilePatch(patch({website_url: value}), 'private').patch, null, value);
  }
});

test('public address allowlist requires both business type and exact visibility', () => {
  const row = {identity_type: 'business', location_visibility: 'exact', address_text: '  Ettevõtte tänav 1  '};
  assert.equal(fields.publicBusinessAddress(row), 'Ettevõtte tänav 1');
  for (const extra of [{identity_type: 'private'}, {identity_type: null}, {location_visibility: 'city'}, {location_visibility: 'hidden'}, {location_visibility: null}]) {
    assert.equal(fields.publicBusinessAddress({...row, ...extra}), null);
  }
});

test('owner snapshots are exact and cannot expose another actor or private address', () => {
  assert.deepEqual(domain.parseProfileSnapshot(snapshot(), actor), snapshot());
  assert.equal(domain.parseProfileSnapshot(snapshot({revision: null, slug: null}), actor).revision, null);
  for (const extra of [{user_id: OTHER}, {identity_id: OTHER}, {revision: 'bad'}, {plan: 'premium'},
    {address_text: 'Secret street'}, {location_visibility: 'exact'}, {website_url: null}, {identity_type: 'admin'}]) {
    assert.throws(() => domain.parseProfileSnapshot(snapshot(extra), actor));
  }
});

function transport(result) {
  const requests = [], lateTokens = [];
  const client = createClient('https://syntheticproject.supabase.co', 'synthetic-public-key', {
    accessToken: async () => {lateTokens.push('another-account'); return 'synthetic.other.account';},
    global: {fetch: async (url, init) => {
      const request = {url: String(url), authorization: new Headers(init.headers).get('authorization'), args: JSON.parse(init.body)};
      requests.push(request);
      const value = typeof result === 'function' ? await result(request) : result;
      if (value instanceof Response) return value;
      return new Response(JSON.stringify(value), {status: 200, headers: {'content-type': 'application/json'}});
    }},
  });
  const api = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: client}})('src/features/profile-editor/api/profileEditorClient.ts');
  return {api, requests, lateTokens};
}
test('actual Supabase transport pins the verified account and dispatches one exact RPC', async () => {
  const f = transport(snapshot({display_name: 'Uus nimi', revision: NEXT}));
  const result = await f.api.saveProfileEditor(context(), R, patch({display_name: 'Uus nimi'}), 'private');
  assert.equal(result.revision, NEXT); assert.equal(f.requests.length, 1);
  assert.match(f.requests[0].url, /\/rest\/v1\/rpc\/save_my_profile_editor_v1$/);
  assert.equal(f.requests[0].authorization, 'Bearer synthetic.expected.account');
  assert.deepEqual(f.requests[0].args, {p_expected_user_id: U, p_expected_identity_id: I,
    p_expected_revision: R, p_patch: patch({display_name: 'Uus nimi'})});
});

test('profile read is actor-bound and malformed acknowledgements become uncertain', async () => {
  const f = transport(snapshot());
  assert.equal((await f.api.readProfileEditor(context())).identity_id, I);
  assert.match(f.requests[0].url, /\/get_my_profile_editor_v1$/);
  assert.deepEqual(f.requests[0].args, {p_expected_user_id: U, p_expected_identity_id: I});
  for (const extra of [{identity_id: OTHER, revision: NEXT}, {revision: R}, {revision: NEXT, display_name: 'Unrelated result'}, {revision: NEXT, secret: 'no'}]) {
    const wrong = transport(snapshot(extra));
    await assert.rejects(wrong.api.saveProfileEditor(context(), R, patch(), 'private'), error => error.kind === 'unknown');
    assert.equal(wrong.requests.length, 1);
  }
});

test('historical CRLF and CR descriptions normalize before save acknowledgement comparison', async () => {
  const bio = 'Esimene rida\nTeine rida\nKolmas rida';
  const f = transport(snapshot({bio, revision: NEXT}));
  const result = await f.api.saveProfileEditor(context(), R,
    patch({bio: 'Esimene rida\r\nTeine rida\rKolmas rida'}), 'private');
  assert.equal(f.requests[0].args.p_patch.bio, bio);
  assert.equal(result.bio, bio);
  assert.equal(f.requests.length, 1);
});

test('only exact server error tags are trusted and mutation transport never retries', async () => {
  for (const [code, message, kind] of [['42501', 'PROFILE_EDITOR_AUTH_CHANGED', 'authChanged'],
    ['42501', 'PROFILE_EDITOR_ACTOR_CHANGED', 'actorChanged'], ['42501', 'PROFILE_EDITOR_FORBIDDEN', 'forbidden'],
    ['40001', 'PROFILE_EDITOR_CONFLICT', 'conflict'], ['22023', 'PROFILE_EDITOR_INVALID_INPUT', 'invalid'],
    ['42501', 'Internal SQL text', 'unknown']]) {
    const f = transport(new Response(JSON.stringify({code, message, details: 'private-details'}), {status: 400, headers: {'content-type': 'application/json'}}));
    await assert.rejects(f.api.saveProfileEditor(context(), R, patch(), 'private'), error => error.kind === kind && !error.message.includes('private-details'));
    assert.equal(f.requests.length, 1);
  }
  const failure = transport(() => {throw Error('connection lost');});
  await assert.rejects(failure.api.saveProfileEditor(context(), R, patch(), 'private'), error => error.kind === 'unknown');
  assert.equal(failure.requests.length, 1);
});

function sessionFixture(options = {}) {
  let liveContext = context(), saved = options.initial ?? snapshot(), confirmed = 0;
  const writes = [], reads = [];
  const client = {
    read: async ctx => {reads.push(ctx); return options.read ? options.read(ctx) : saved;},
    save: async (ctx, revision, draft, type) => {
      writes.push({ctx, revision, draft, type});
      if (options.save) return options.save(ctx, revision, draft, type);
      saved = {...saved, ...draft, revision: NEXT}; return saved;
    },
  };
  const session = new ProfileEditorSession({actor, initial: saved, client, context: () => liveContext, confirmed: () => confirmed++});
  return {session, writes, reads, confirmed: () => confirmed, setContext: next => {liveContext = next;}, setSaved: next => {saved = next;}};
}

test('same-identity refresh keeps unsaved text and detects a newer saved revision', () => {
  const f = sessionFixture(); f.session.edit('bio', 'Unsaved description');
  f.session.suspend(); assert.equal(f.session.getSnapshot().available, false);
  f.session.revalidate(snapshot());
  assert.equal(f.session.getSnapshot().draft.bio, 'Unsaved description');
  assert.equal(f.session.getSnapshot().dirty, true); assert.equal(f.session.getSnapshot().phase, 'ready');
  f.session.revalidate(snapshot({revision: NEXT, bio: 'Another browser'}));
  assert.equal(f.session.getSnapshot().phase, 'conflict');
  assert.equal(f.session.getSnapshot().draft.bio, 'Unsaved description');
  assert.equal(f.writes.length, 0);
});

test('two Save clicks dispatch one mutation and the confirmed name change notifies identity readers', async () => {
  const pending = deferred(), f = sessionFixture({save: () => pending.promise});
  f.session.edit('display_name', 'Uus nimi');
  const first = f.session.save(); await f.session.save();
  assert.equal(f.writes.length, 1); assert.equal(f.session.getSnapshot().phase, 'saving');
  pending.resolve(snapshot({display_name: 'Uus nimi', revision: NEXT})); await first;
  assert.equal(f.session.getSnapshot().notice, 'saved'); assert.equal(f.session.getSnapshot().dirty, false);
  assert.equal(f.confirmed(), 1);
});

test('an owned identity without a profile can be created with its first explicit Save', async () => {
  const f = sessionFixture({initial: snapshot({revision: null, slug: null})});
  assert.equal(f.session.getSnapshot().dirty, false);
  await f.session.save(); assert.equal(f.writes.length, 1); assert.equal(f.writes[0].revision, null);
});

test('invalid form and replaced account cannot dispatch a save', async () => {
  const f = sessionFixture(); f.session.edit('display_name', ''); await f.session.save();
  assert.equal(f.session.getSnapshot().errors.display_name, 'required'); assert.equal(f.writes.length, 0);
  f.session.edit('display_name', 'Valid name'); f.setContext(context({userId: OTHER})); await f.session.save();
  assert.equal(f.writes.length, 0);
  assert.throws(() => f.session.revalidate(snapshot({identity_id: OTHER})));
});

test('identity retirement discards late save completion and cannot revive the old form', async () => {
  const pending = deferred(), f = sessionFixture({save: () => pending.promise});
  f.session.edit('bio', 'Old actor text'); const saving = f.session.save();
  f.session.retire(); f.setContext(context({identityId: OTHER}));
  pending.resolve(snapshot({revision: NEXT, bio: 'Old actor text'})); await saving;
  assert.equal(f.session.getSnapshot().phase, 'retired'); assert.equal(f.confirmed(), 0);
  f.session.revalidate(snapshot()); assert.equal(f.session.getSnapshot().phase, 'retired');
});

test('a save interrupted by refresh is uncertain until a separate current read confirms it', async () => {
  const pending = deferred(), f = sessionFixture({save: () => pending.promise});
  f.session.edit('bio', 'Desired text'); const saving = f.session.save();
  f.session.suspend(); f.setContext(context());
  pending.resolve(snapshot({revision: NEXT, bio: 'Desired text'})); await saving;
  assert.equal(f.session.getSnapshot().phase, 'uncertain'); assert.equal(f.confirmed(), 0);
  f.session.revalidate(snapshot({revision: NEXT, bio: 'Desired text'}));
  assert.equal(f.session.getSnapshot().notice, 'checked'); assert.equal(f.confirmed(), 1);
  assert.equal(f.writes.length, 1);
});

test('a lost acknowledgement is read back without repeating the mutation', async () => {
  const f = sessionFixture({save: async () => {throw new domain.ProfileEditorError('unknown');}});
  f.session.edit('bio', 'Desired text'); await f.session.save(); await f.session.save();
  assert.equal(f.writes.length, 1); assert.equal(f.session.getSnapshot().phase, 'uncertain');
  f.setSaved(snapshot({revision: NEXT, bio: 'Desired text'})); await f.session.check();
  assert.equal(f.reads.length, 1); assert.equal(f.writes.length, 1); assert.equal(f.session.getSnapshot().notice, 'checked');
});

test('unchanged readback keeps entered text and requires a deliberate new Save', async () => {
  const f = sessionFixture({save: async () => {throw new domain.ProfileEditorError('unknown');}});
  f.session.edit('bio', 'Desired text'); await f.session.save(); await f.session.check();
  assert.equal(f.session.getSnapshot().notice, 'notConfirmed'); assert.equal(f.session.getSnapshot().dirty, true);
  assert.equal(f.session.getSnapshot().draft.bio, 'Desired text'); assert.equal(f.writes.length, 1);
  await f.session.save(); assert.equal(f.writes.length, 2); assert.equal(f.writes[1].revision, R);
});

test('a conflicting result keeps the local draft and only explicit reload replaces it', async () => {
  const f = sessionFixture({save: async () => {throw new domain.ProfileEditorError('conflict');}});
  f.session.edit('bio', 'Local draft'); await f.session.save(); await f.session.save();
  assert.equal(f.session.getSnapshot().phase, 'conflict'); assert.equal(f.writes.length, 1);
  f.setSaved(snapshot({revision: NEXT, bio: 'Other editor'})); await f.session.reload();
  assert.equal(f.session.getSnapshot().draft.bio, 'Other editor'); assert.equal(f.session.getSnapshot().dirty, false);
});

test('an uncertain result with different newer details becomes conflict instead of overwriting', async () => {
  const f = sessionFixture({save: async () => {throw new domain.ProfileEditorError('unknown');}});
  f.session.edit('bio', 'Local draft'); await f.session.save();
  f.setSaved(snapshot({revision: NEXT, bio: 'Other editor'})); await f.session.check();
  assert.equal(f.session.getSnapshot().phase, 'conflict'); assert.equal(f.session.getSnapshot().draft.bio, 'Local draft');
  assert.equal(f.writes.length, 1);
});

test('public mapper includes safe website and explicitly public business address only', () => {
  const mapper = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: {}}})('src/entities/profile/api/getPublicProfileBySlug.ts').mapPublicProfile;
  const row = {identity_id: I, identity_type: 'business', display_name: 'Näidis', slug: 'naidis',
    website_url: 'https://example.test', address_text: 'Ettevõtte tänav 1', location_visibility: 'exact', city: 'Tallinn', country: 'Eesti'};
  const result = mapper(row, 'naidis');
  assert.equal(result.websiteUrl, 'https://example.test/'); assert.equal(result.businessAddress, 'Ettevõtte tänav 1');
  assert.equal(result.locationLabel, 'Tallinn, Eesti');
  const privateResult = mapper({...row, identity_type: 'private', website_url: 'javascript:alert(1)'}, 'naidis');
  assert.equal(privateResult.websiteUrl, null); assert.equal(privateResult.businessAddress, null);
});

test('rendered text form keeps one Save and read-only identity fields, with image inputs outside the form', () => {
  for (const identityType of ['private', 'business']) {
    const initial = snapshot({identity_type: identityType});
    const f = sessionFixture({initial});
    const view = f.session.getSnapshot();
    const viewLoader = loader({
      'src/shared/i18n/V2LanguageProvider.tsx': {useV2Translation: catalog => ({language: 'et', t: (key, values = {}) =>
        Object.entries(values).reduce((text, [name, value]) => text.replaceAll('{'+name+'}', String(value)), catalog.et[key])})},
      'src/features/profile-editor/model/useProfileEditor.ts': {useProfileEditor: () => ({context: {anonymous: false},
        session: f.session, view, ready: true, error: null, refresh() {}})},
    });
    const Page = viewLoader('src/features/profile-editor/components/ProfileEditorPage.tsx').default;
    const html = renderToStaticMarkup(React.createElement(Page));
    assert.equal((html.match(/type="submit"/g) || []).length, 1);
    assert.match(html, /Minu profiil/); assert.match(html, /name="display_name"/);
    assert.equal(html.includes('name="address_text"'), identityType === 'business');
    assert.equal(html.includes('value="exact"'), identityType === 'business');
    assert.doesNotMatch(html, /name="(?:identity_type|slug|avatar_url|plan)"/);
    const textForm = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/)?.[0];
    assert.ok(textForm); assert.doesNotMatch(textForm, /type="file"/);
    assert.equal((html.match(/type="file"/g) || []).length, 2);
    assert.match(html, /href="\/v2\/profile\/minu-profiil"/);
  }
});

test('canonical profile editor owns its actor refresh, other My Area routes retain reload behavior', () => {
  const {shouldReloadIdentityScopedRoute} = load('src/features/v2-shell/model/identityRouteReload.ts');
  assert.equal(shouldReloadIdentityScopedRoute('/v2/my-area/profile'), false);
  assert.equal(shouldReloadIdentityScopedRoute('/v2/my-area/profile/'), false);
  assert.equal(shouldReloadIdentityScopedRoute('/v2/my-area'), true);
  assert.equal(shouldReloadIdentityScopedRoute('/v2/my-area/jobs/new'), true);
});
