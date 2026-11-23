'use strict';
// Actual account modules; synthetic Auth and real Supabase transport with injected fetch.
const test = require('node:test'), assert = require('node:assert/strict');
const React = require('react'), {renderToStaticMarkup} = require('react-dom/server');
const {createClient} = require('@supabase/supabase-js');
const {loader, deferred, language} = require('../helpers/jobs-public-loader.cjs');
const U = '11111111-1111-4111-8111-111111111111', V = '22222222-2222-4222-8222-222222222222';
const modelPath = 'src/entities/accountLifecycle/model/accountState.ts';
const apiPath = 'src/entities/accountLifecycle/api/getMyAccountState.ts';
const sessionPath = 'src/features/account-lifecycle/model/accountStateSession.ts';
const pagePath = 'src/features/account-lifecycle/components/AccountSettingsPage.tsx';
const hookPath = 'src/features/account-lifecycle/model/useAccountState.ts';
const load = loader(), domain = load(modelPath), {AccountStateSession} = load(sessionPath);
const snapshot = extra => ({schema_version: 1, actor_user_id: U, scope: 'account', state: 'active', revision: '1',
  account_created_at: '2026-07-01T09:10:11.123456+00:00', read_at: '2026-11-22T20:10:11+00:00', ...extra});
const context = extra => ({userId: U, accessToken: 'synthetic.captured.token', signal: new AbortController().signal, ...extra});
const flush = () => new Promise(resolve => setImmediate(resolve));

test('account parser accepts the exact own-account contract and preserves legacy null creation date', () => {
  const result = domain.parseAccountState(snapshot(), U);
  assert.deepEqual(result, snapshot()); assert.equal(Object.isFrozen(result), true);
  assert.equal(domain.parseAccountState(snapshot({account_created_at: null}), U).account_created_at, null);
  assert.equal(domain.parseAccountState(snapshot({revision: '9223372036854775807'}), U).revision, '9223372036854775807');
});

test('account parser rejects extra fields, another account, unknown states and noncanonical revisions', () => {
  for (const extra of [{schema_version: 2}, {scope: 'identity'}, {state: 'closed'}, {identity_id: V},
    {revision: '01'}, {revision: '0'}, {revision: '-1'}, {revision: 1}, {revision: '9223372036854775808'},
    {actor_user_id: 'not-an-id'}, {account_created_at: undefined}, {read_at: null}]) {
    assert.throws(() => domain.parseAccountState(snapshot(extra), U), e => e.kind === 'readError');
  }
  assert.throws(() => domain.parseAccountState(snapshot({actor_user_id: V}), U), e => e.kind === 'authChanged');
  for (const value of [null, [], '', {}, {...snapshot(), account_created_at: new Date()}])
    assert.throws(() => domain.parseAccountState(value, U));
});

test('account parser rejects impossible and non-UTC timestamps without losing valid microseconds', () => {
  for (const timestamp of ['2026-02-30T10:00:00Z', '2025-02-29T10:00:00Z', '2026-01-01T24:00:00Z',
    '2026-01-01T00:60:00Z', '2026-01-01T00:00:60Z', '0000-01-01T00:00:00Z',
    '2026-01-01T00:00:00+02:00', '2026-01-01T00:00:00', '2026-01-01T00:00:00.1234567Z']) {
    assert.throws(() => domain.parseAccountState(snapshot({read_at: timestamp}), U));
  }
  const timestamp = '2024-02-29T23:59:59.123456Z';
  assert.equal(domain.parseAccountState(snapshot({read_at: timestamp}), U).read_at, timestamp);
});

test('only fixed account SQL errors influence UI classifications and no raw error detail is exposed', () => {
  for (const [message, kind] of [['ACCOUNT_AUTH_REQUIRED','authRequired'], ['ACCOUNT_ACTOR_MISMATCH','authChanged'],
    ['ACCOUNT_UNAVAILABLE','unavailable'], ['ACCOUNT_STATE_UNAVAILABLE','unavailable']]) {
    const error = domain.accountStateFailure({code: 'P0001', message, details: 'private SQL detail'});
    assert.equal(error.kind, kind); assert.equal(error.message, kind); assert.equal(error.details, undefined);
  }
  assert.equal(domain.accountStateFailure({code: '42501', message: 'raw private text'}).kind, 'authRequired');
  for (const raw of [new Error('raw network details'), {code: 'XX000', message: 'ACCOUNT_STATE_UNAVAILABLE'},
    {code: 'P0001', message: 'ACCOUNT_STATE_UNAVAILABLE extra'}]) {
    assert.equal(domain.accountStateFailure(raw).kind, 'readError');
  }
});

function transport(result) {
  const requests = [], lateTokens = [];
  const client = createClient('https://syntheticaccount.supabase.co', 'synthetic-public-key', {
    accessToken: async () => {lateTokens.push('later-account'); return 'synthetic.later.token';},
    global: {fetch: async (url, init) => {
      requests.push({url: String(url), method: init.method, auth: new Headers(init.headers).get('authorization'),
        args: JSON.parse(init.body), signal: init.signal});
      const value = typeof result === 'function' ? await result(requests.at(-1)) : result;
      return value instanceof Response ? value : new Response(JSON.stringify(value), {status: 200, headers: {'content-type':'application/json'}});
    }},
  });
  const api = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: client}})(apiPath);
  return {api, requests, lateTokens};
}

test('account API pins the captured token and dispatches one account-only read with no identity input', async () => {
  const f = transport(snapshot());
  assert.equal((await f.api.getMyAccountState(context())).state, 'active');
  assert.equal(f.requests.length, 1); assert.match(f.requests[0].url, /\/rest\/v1\/rpc\/get_my_account_state_v1$/);
  assert.equal(f.requests[0].auth, 'Bearer synthetic.captured.token');
  assert.deepEqual(f.requests[0].args, {p_expected_user_id: U});
});

test('account API refuses invalid or cancelled context before transport', async () => {
  const f = transport(snapshot()), abort = new AbortController(); abort.abort();
  for (const value of [context({userId: ''}), context({accessToken: ''}), context({accessToken: 'unsafe token'}), context({signal: abort.signal})])
    await assert.rejects(f.api.getMyAccountState(value));
  assert.equal(f.requests.length, 0);
});

test('account API rejects crossed and malformed results and never retries them', async () => {
  for (const value of [null, snapshot({actor_user_id: V}), snapshot({state: 'closure_pending'}), {...snapshot(), secret: 'private'}]) {
    const f = transport(value); await assert.rejects(f.api.getMyAccountState(context())); assert.equal(f.requests.length, 1);
  }
});

test('account API classifies missing state and transport failure without inventing active state', async () => {
  const missing = transport(new Response(JSON.stringify({code:'P0001',message:'ACCOUNT_STATE_UNAVAILABLE',details:'private'}),
    {status: 400, headers: {'content-type':'application/json'}}));
  await assert.rejects(missing.api.getMyAccountState(context()), e => e.kind === 'unavailable' && e.message === 'unavailable');
  assert.equal(missing.requests.length, 1);
  const network = transport(() => {throw new Error('private transport error');});
  await assert.rejects(network.api.getMyAccountState(context()), e => e.kind === 'readError');
  assert.equal(network.requests.length, 1);
});

test('account API abort reaches the actual Supabase fetch and ignores a later successful response', async () => {
  const pending = deferred(), abort = new AbortController();
  const f = transport(() => pending.promise);
  const request = f.api.getMyAccountState(context({signal: abort.signal}));
  await flush(); assert.equal(f.requests.length, 1); abort.abort();
  assert.equal(f.requests[0].signal.aborted, true);
  pending.resolve(snapshot());
  await assert.rejects(request, e => e.kind === 'cancelled');
  assert.equal(f.requests.length, 1);
});

function reader(t, overrides = {}) {
  let account = {userId: U, accessToken: 'synthetic.original.token'};
  const calls = {session: 0, users: [], reads: []};
  const source = {
    session: async () => {calls.session++; return overrides.session ? overrides.session() : account;},
    user: async token => {calls.users.push(token); return overrides.user ? overrides.user(token) : {userId: account.userId, email: 'owner@example.test'};},
    read: async ctx => {calls.reads.push(ctx); return overrides.read ? overrides.read(ctx) : snapshot({actor_user_id: ctx.userId});},
  };
  const session = new AccountStateSession(source); t.after(() => session.stop());
  return {session, calls, setAccount: value => {account = value;}};
}

test('account reader works with no profile dependency and verifies the captured user before RPC', async t => {
  const f = reader(t); f.session.start(); await flush();
  assert.equal(f.session.getSnapshot().phase, 'ready');
  assert.equal(f.session.getSnapshot().email, 'owner@example.test');
  assert.deepEqual(f.calls.users, ['synthetic.original.token']); assert.equal(f.calls.reads.length, 1);
  assert.equal(f.calls.reads[0].userId, U); assert.equal(f.calls.reads[0].accessToken, 'synthetic.original.token');
  assert.equal(Object.hasOwn(f.calls.reads[0], 'identityId'), false);
});

test('account reader treats an absent session as signed out and a failed session as an error', async t => {
  const absent = reader(t, {session: async () => null}); absent.session.start(); await flush();
  assert.equal(absent.session.getSnapshot().phase, 'anonymous'); assert.equal(absent.calls.reads.length, 0);
  const failed = reader(t, {session: async () => {throw new domain.AccountStateError('authChanged');}});
  failed.session.start(); await flush(); assert.equal(failed.session.getSnapshot().phase, 'error');
  assert.equal(failed.session.getSnapshot().error, 'authChanged'); assert.equal(failed.calls.reads.length, 0);
});

test('account reader rejects a provider-confirmed different account before any state query', async t => {
  const f = reader(t, {user: async () => ({userId: V, email: 'another@example.test'})});
  f.session.start(); await flush(); assert.equal(f.session.getSnapshot().error, 'authChanged');
  assert.equal(f.calls.reads.length, 0); assert.equal('email' in f.session.getSnapshot(), false);
});

test('auth invalidation clears private details synchronously and defers new Auth calls', async t => {
  const f = reader(t); f.session.start(); await flush(); assert.equal(f.session.getSnapshot().phase, 'ready');
  const before = f.calls.session; f.session.authChanged();
  assert.equal(f.session.getSnapshot().phase, 'loading'); assert.equal('email' in f.session.getSnapshot(), false);
  assert.equal(f.calls.session, before);
  await new Promise(resolve => setTimeout(resolve, 5)); await flush();
  assert.equal(f.session.getSnapshot().phase, 'ready'); assert.equal(f.calls.session, before + 1);
});

test('account switch aborts the old read and late results cannot overwrite the new account', async t => {
  const pending = deferred(); let number = 0;
  const f = reader(t, {read: ctx => ++number === 1 ? pending.promise : Promise.resolve(snapshot({actor_user_id: ctx.userId}))});
  f.session.start(); await flush(); assert.equal(f.calls.reads.length, 1);
  const old = f.calls.reads[0]; f.setAccount({userId: V, accessToken: 'synthetic.new.token'}); f.session.refresh();
  assert.equal(old.signal.aborted, true); await flush();
  assert.equal(f.session.getSnapshot().account.actor_user_id, V);
  pending.resolve(snapshot()); await flush(); assert.equal(f.session.getSnapshot().account.actor_user_id, V);
});

test('same-account refresh retires older generations and sign-out never keeps old private details', async t => {
  const pending = deferred(); let number = 0;
  const f = reader(t, {read: () => ++number === 1 ? pending.promise : Promise.resolve(snapshot({revision:'2'}))});
  f.session.start(); await flush(); f.session.refresh(); await flush();
  assert.equal(f.session.getSnapshot().account.revision, '2'); pending.resolve(snapshot()); await flush();
  assert.equal(f.session.getSnapshot().account.revision, '2');
  f.setAccount(null); f.session.refresh(); assert.equal(f.session.getSnapshot().phase, 'loading');
  await flush(); assert.equal(f.session.getSnapshot().phase, 'anonymous'); assert.equal('email' in f.session.getSnapshot(), false);
});

test('account unmount aborts an in-flight query and prevents a late result publication', async t => {
  const pending = deferred(), f = reader(t, {read: () => pending.promise});
  let notifications = 0; f.session.subscribe(() => {notifications++;}); f.session.start(); await flush();
  const before = notifications; f.session.stop(); assert.equal(f.calls.reads[0].signal.aborted, true);
  pending.resolve(snapshot()); await flush(); assert.equal(notifications, before);
  assert.equal(f.session.getSnapshot().phase, 'loading');
});

test('missing lifecycle state remains an error until explicit refresh succeeds', async t => {
  let missing = true; const f = reader(t, {read: async () => {
    if (missing) throw new domain.AccountStateError('unavailable'); return snapshot();
  }});
  f.session.start(); await flush(); assert.equal(f.session.getSnapshot().error, 'unavailable');
  await flush(); assert.equal(f.calls.reads.length, 1);
  missing = false; f.session.refresh(); await flush(); assert.equal(f.session.getSnapshot().phase, 'ready');
  assert.equal(f.calls.reads.length, 2);
});

test('account load deadline ends a stuck Auth read without retry or late data publication', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const pending = deferred(), f = reader(t, {session: () => pending.promise}); f.session.start();
  t.mock.timers.tick(20_000); assert.equal(f.session.getSnapshot().error, 'readError');
  pending.resolve({userId: U, accessToken: 'synthetic.old.token'}); await flush();
  assert.equal(f.session.getSnapshot().error, 'readError'); assert.equal(f.calls.reads.length, 0);
  assert.equal(f.calls.session, 1);
});

function viewHtml(view, locale = 'et') {
  const viewLoader = loader({
    'src/shared/i18n/V2LanguageProvider.tsx': language(locale),
    [hookPath]: {useAccountState: () => {throw new Error('View test must not access Auth');}},
  });
  const {AccountSettingsView} = viewLoader(pagePath);
  return renderToStaticMarkup(React.createElement(AccountSettingsView, {view, refresh() {}}));
}

test('account page renders real state and private account identity in Estonian and English without mutation controls', () => {
  const view = {phase: 'ready', account: snapshot(), email: 'owner@example.test'};
  const et = viewHtml(view), en = viewHtml(view, 'en');
  assert.match(et, /Minu konto/); assert.match(et, /Aktiivne/); assert.match(et, /Konto loodud/);
  assert.match(en, /Your account/); assert.match(en, /Active/); assert.match(en, /Account created/);
  assert.match(et, /owner@example.test/); assert.match(et, /<time dateTime="2026-07-01T09:10:11.123456\+00:00"/);
  for (const html of [et, en]) {assert.doesNotMatch(html, /<button/); assert.doesNotMatch(html, /Sulge|Kustuta|Close account|Delete account|identity_id/);}
});

test('account page omits unknown creation time and never presents a failed read as active', () => {
  const absentDate = viewHtml({phase:'ready', account:snapshot({account_created_at:null}), email:null});
  assert.doesNotMatch(absentDate, /Konto loodud|<time|E-post/);
  const error = viewHtml({phase:'error',error:'unavailable'});
  assert.match(error, /role="alert"/); assert.match(error, /Kontrolli uuesti/); assert.doesNotMatch(error, /Aktiivne|<time|owner@example/);
  const anonymous = viewHtml({phase:'anonymous'});
  assert.match(anonymous, /\/auth\?next=%2Fv2%2Fmy-area%2Faccount/); assert.match(anonymous, /Logi sisse/);
  assert.doesNotMatch(anonymous, /Aktiivne|<time/);
  assert.match(viewHtml({phase:'loading'}), /role="status"/);
});
