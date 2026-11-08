'use strict';
// Mocked HTTP boundaries. No hosted calls, account mutation or Storage traffic.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);
const { createHorsePublicationRequestHandler } = require('../src/server/horse-publication/createHorsePublicationHandler.ts');
const USER = '11000000-0000-4000-8000-000000000001';
const IDENTITY = '12000000-0000-4000-8000-000000000002';
const OFFER = '17000000-0000-4000-8000-000000000007';
const OTHER = '18000000-0000-4000-8000-000000000008';
const RUN = '19000000-0000-4000-8000-000000000009';
const APP = 'http://127.0.0.1:3100';
const API = 'https://abcdefghijklmnopqrst.supabase.co';
const UNTIL = '2027-02-06T12:34:56.123456Z';
const config = { appOrigin: APP, projectOrigin: API, publicKey: 'public-key', serviceKey: 'service-key', runId: RUN };
const actor = { expectedUserId: USER, expectedIdentityId: IDENTITY };
const readBody = { ...actor, offerId: OFFER };
const command = { ...readBody, expectedRevision: '5', expectedStatus: 'published', expectedActiveUntil: UNTIL };
const receipt = (patch = {}) => ({ schema_version: 1, content_type: 'horse_offer', content_id: OFFER,
  actor_user_id: USER, identity_id: IDENTITY, source_status: 'published', status: 'active', active_until: UNTIL,
  edit_revision: '5', changed: false, ...patch });
const request = (body, headers = {}) => new Request(APP + '/api/v2/horse-publication/owner-activity', {
  method: 'POST', headers: { host: new URL(APP).host, origin: APP, authorization: 'Bearer owner-token',
    'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
});
function setup(result) {
  const calls = [], jobs = [];
  const fetcher = async (url, init) => {
    calls.push({ url, args: JSON.parse(init.body || 'null') });
    assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store');
    if (url.endsWith('/assert_selqiro_disposable_v2')) return Response.json({ scope: 'disposable-v2', run_id: RUN });
    assert.equal(init.headers.get('authorization'), 'Bearer owner-token');
    return typeof result === 'function' ? result(url, init) : Response.json(result);
  };
  const images = { prepare: async () => { throw Error('unexpected image IO'); }, verify: async () => { throw Error('unexpected image IO'); } };
  return { calls, jobs, handle: createHorsePublicationRequestHandler(config, images, fetcher, work => jobs.push(work)) };
}

test('horse lifecycle read binds current actor, identity and canonical UUID without a write', async () => {
  const good = setup(receipt()), res = await good.handle(request(readBody), 'owner-activity');
  assert.equal(res.status, 200); assert.deepEqual(await res.json(), receipt());
  assert.match(res.headers.get('cache-control'), /private, no-store/);
  assert.equal(good.calls.length, 2);
  assert.ok(good.calls[1].url.endsWith('/get_my_horse_offer_lifecycle_v1'));
  assert.deepEqual(good.calls[1].args, { p_expected_user_id: USER, p_expected_identity_id: IDENTITY, p_offer_id: OFFER });
  assert.equal(good.jobs.length, 0);
});

test('horse status RPC receives exact revision and six-digit deadline and confirms only requested outcome', async () => {
  const expected = receipt({ source_status: 'closed', status: 'sold', edit_revision: '6', changed: true });
  const good = setup(expected), res = await good.handle(request({ ...command, status: 'sold' }), 'owner-set-status');
  assert.equal(res.status, 200); assert.deepEqual(await res.json(), expected);
  assert.equal(good.calls.length, 2); assert.ok(good.calls[1].url.endsWith('/set_my_horse_offer_status_v1'));
  assert.deepEqual(good.calls[1].args, { p_expected_user_id: USER, p_expected_identity_id: IDENTITY, p_offer_id: OFFER,
    p_expected_revision: '5', p_expected_status: 'published', p_expected_active_until: UNTIL, p_status: 'sold' });
  assert.equal(good.jobs.length, 0, 'status does not schedule publication or cleanup');
  const noop = setup(receipt());
  assert.equal((await noop.handle(request({ ...command, status: 'active' }), 'owner-set-status')).status, 200);
});

test('horse renewal accepts explicit nonshortening deadline ACK and no-op longer period only', async () => {
  const expected = receipt({ active_until: '2027-02-06T12:34:56.123457+00:00', edit_revision: '6', changed: true });
  const good = setup(expected), res = await good.handle(request(command), 'owner-renew');
  assert.equal(res.status, 200); assert.deepEqual(await res.json(), expected);
  assert.ok(good.calls[1].url.endsWith('/renew_my_horse_offer_activity_v1'));
  assert.deepEqual(good.calls[1].args, { p_expected_user_id: USER, p_expected_identity_id: IDENTITY, p_offer_id: OFFER,
    p_expected_revision: '5', p_expected_status: 'published', p_expected_active_until: UNTIL });
  assert.equal(good.jobs.length, 0);
  assert.equal((await setup(receipt()).handle(request(command), 'owner-renew')).status, 200);
  for (const bad of [receipt({ changed: true, edit_revision: '6' }),
    receipt({ active_until: '2027-02-06T12:34:56.123455Z', edit_revision: '6', changed: true }),
    receipt({ active_until: '2027-02-07T12:34:56.123456Z' }),
    receipt({ active_until: '2027-02-07T12:34:56.123456Z', edit_revision: '7', changed: true })]) {
    const badResult = await setup(bad).handle(request(command), 'owner-renew');
    assert.equal(badResult.status, 503); assert.deepEqual(await badResult.json(), { error: 'outcome_unknown' });
  }
});

test('horse lifecycle rejects malformed bodies and origin/auth confusion before any remote call', async () => {
  for (const [body, action, headers] of [
    [{ ...readBody, requestKey: OTHER }, 'owner-activity', {}],
    [{ ...command, status: 'paused', requestKey: OTHER }, 'owner-set-status', {}],
    [{ ...command, status: 'draft' }, 'owner-set-status', {}],
    [{ ...command, status: ['paused'] }, 'owner-set-status', {}],
    [{ ...command, expectedStatus: ['published'] }, 'owner-renew', {}],
    [{ ...command, expectedStatus: 'held_for_review' }, 'owner-renew', {}],
    [{ ...command, expectedRevision: '0' }, 'owner-renew', {}],
    [{ ...command, expectedRevision: '9223372036854775808' }, 'owner-renew', {}],
    [{ ...command, expectedRevision: 5 }, 'owner-renew', {}],
    [{ ...command, expectedActiveUntil: null }, 'owner-renew', {}],
    [{ ...command, expectedActiveUntil: 'infinity' }, 'owner-renew', {}],
    [{ ...command, expectedActiveUntil: '2027-02-30T12:00:00Z' }, 'owner-renew', {}],
    [command, 'owner-renew', { origin: 'https://different.invalid' }],
    [command, 'owner-renew', { host: 'different.invalid' }],
    [command, 'owner-renew', { authorization: '' }],
  ]) {
    const harness = setup(receipt()), result = await harness.handle(request(body, headers), action);
    assert.notEqual(result.status, 200); assert.equal(harness.calls.length, 0); assert.equal(harness.jobs.length, 0);
  }
});

test('horse lifecycle read never accepts another actor, content kind, unknown fields or fictitious state', async () => {
  for (const bad of [receipt({ actor_user_id: OTHER }), receipt({ identity_id: OTHER }), receipt({ content_id: OTHER }),
    receipt({ content_type: 'listing' }), receipt({ changed: true }), receipt({ source_status: 'paused' }),
    receipt({ active_until: 'infinity' }), receipt({ edit_revision: '0' }), receipt({ private_token: 'never forward' })]) {
    const harness = setup(bad), result = await harness.handle(request(readBody), 'owner-activity');
    assert.equal(result.status, 503); assert.deepEqual(await result.json(), { error: 'outcome_unknown' });
    assert.equal(harness.calls.length, 2); assert.equal(harness.jobs.length, 0);
  }
});

test('horse status ACK cannot silently renew, ignore a change or jump revisions', async () => {
  const valid = receipt({ source_status: 'paused', status: 'paused', edit_revision: '6', changed: true });
  for (const bad of [{ ...valid, active_until: '2027-02-06T12:34:56.123457Z' }, { ...valid, edit_revision: '7' },
    { ...valid, edit_revision: '5' }, { ...valid, changed: false }, receipt({ edit_revision: '6', changed: true })]) {
    const harness = setup(bad), result = await harness.handle(request({ ...command, status: 'paused' }), 'owner-set-status');
    assert.equal(result.status, 503); assert.deepEqual(await result.json(), { error: 'outcome_unknown' });
    assert.equal(harness.calls.length, 2); assert.equal(harness.jobs.length, 0);
  }
});

test('horse lifecycle conflict and refused states keep safe codes and never replay uncertain writes', async () => {
  for (const [failure, statusCode, expected] of [
    [{ code: '40001', message: 'sensitive database context' }, 409, { error: 'conflict', code: '40001', message: 'horse_offer_edit_conflict' }],
    [{ code: '42501', message: 'sensitive database context' }, 403, { error: 'context_changed', code: '42501' }],
    [{ code: '55000', message: 'sensitive database context' }, 409, { error: 'refused', code: '55000' }],
    [{ code: '22023', message: 'sensitive database context' }, 409, { error: 'refused', code: '22023' }],
    [{ code: 'XX000', message: 'private-path', details: 'secret' }, 503, { error: 'outcome_unknown' }],
  ]) {
    const harness = setup(() => Response.json(failure, { status: 500 })), result = await harness.handle(request(command), 'owner-renew');
    assert.equal(result.status, statusCode); assert.deepEqual(await result.json(), expected);
    assert.equal(harness.calls.length, 2, 'one gate and one RPC, never an automatic write retry');
    assert.equal(harness.jobs.length, 0);
  }
});
