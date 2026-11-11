'use strict';
// Actual HTTP handler and response binders. Remote auth/database are synthetic.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename, compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true},
}).outputText, filename);
const {createServicePublicationRequestHandler} = require('../src/server/service-publication/createServicePublicationHandler.ts');
const U = '11000000-0000-4000-8000-000000000001', I = '12000000-0000-4000-8000-000000000002';
const S = '17000000-0000-4000-8000-000000000007', F = '16000000-0000-4000-8000-000000000006';
const RUN = '19000000-0000-4000-8000-000000000009', APP = 'http://127.0.0.1:3100';
const API = 'https://abcdefghijklmnopqrst.supabase.co';
const OLD = '2026-11-10T10:00:00.123456+00:00', NOW = '2026-11-11T10:00:00.654321+00:00';
const NEXT = '2027-11-11T10:00:00.654321+00:00';
const actor = {expectedUserId: U, expectedIdentityId: I}, scope = {...actor, serviceId: S};
const command = {...scope, expectedActiveUntil: OLD};
const validity = (patch = {}) => ({active_until: OLD, origin: 'transition', last_confirmed_at: null,
  is_expired: true, can_renew: true, server_now: NOW, ...patch});
const activity = (patch = {}) => ({schema_version: 1, content_type: 'service', actor_user_id: U,
  identity_id: I, service_id: S, status: 'published', activity: validity(), ...patch});
const renewed = (patch = {}) => activity({changed: true,
  activity: validity({active_until: NEXT, last_confirmed_at: NOW, is_expired: false}), ...patch});
const owner = (patch = {}) => ({schema_version: 2, content_type: 'service', actor_user_id: U, identity_id: I,
  service_id: S, edit_revision: '5', status: 'published', content: {serviceId: S, title: 'Repair service',
    description: 'Saved details', category: 'vehicle_machinery', subcategory: null, priceType: 'contact',
    priceAmount: null, currency: 'EUR', country: 'Estonia', city: 'Paide', location: null},
  images: [], policy_snapshot: [], created_at: OLD, updated_at: OLD, published_at: OLD, sort_order: 0,
  activity: validity(), ...patch});
const request = (body, headers = {}) => new Request(APP + '/api/v2/service-publication/activity-renew', {
  method: 'POST', headers: {host: new URL(APP).host, origin: APP, authorization: 'Bearer user-token',
    'content-type': 'application/json', ...headers}, body: JSON.stringify(body),
});
function setup(result) {
  const calls = [], jobs = [];
  const fetcher = async (url, init) => {
    calls.push({url, args: init.body ? JSON.parse(init.body) : null});
    assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store');
    if (url.endsWith('/assert_selqiro_disposable_v2')) return Response.json({scope: 'disposable-v2', run_id: RUN});
    assert.equal(init.headers.get('authorization'), 'Bearer user-token');
    return typeof result === 'function' ? result(url, init) : Response.json(result);
  };
  const images = {prepare: async () => {throw Error('unexpected image write');}, verify: async () => {throw Error('unexpected image write');}};
  return {calls, jobs, handle: createServicePublicationRequestHandler({appOrigin: APP, projectOrigin: API,
    publicKey: 'public-key', serviceKey: 'service-key', runId: RUN}, images, fetcher, work => jobs.push(work))};
}

test('explicit renewal forwards one exact deadline with all six microseconds, not a new deadline or revision', async () => {
  const f = setup(renewed()), r = await f.handle(request(command), 'activity-renew');
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), renewed());
  assert.deepEqual(f.calls[1].args, {p_expected_user_id: U, p_expected_identity_id: I,
    p_service_id: S, p_expected_active_until: OLD});
  assert.match(f.calls[1].url, /\/renew_my_service_activity_v1$/); assert.equal(f.calls.length, 2);
  assert.equal(f.jobs.length, 0); assert.match(r.headers.get('cache-control'), /private, no-store/);
});

test('renewal rejects invalid deadlines, scope and extra fields before any remote call', async () => {
  for (const bad of [{...command, serviceId: '201'}, {...command, expectedIdentityId: F + 'x'},
    ...[null, '', 'infinity', '2026-02-30T10:00:00Z', '2026-11-11', '2026-11-11T10:00:00.1234567Z', 123].map(expectedActiveUntil => ({...command, expectedActiveUntil})),
    {...command, newDeadline: NEXT}, {...command, days: 365}, {...command, status: 'published'}, {...command, expectedRevision: '5'}]) {
    const f = setup(renewed()); assert.equal((await f.handle(request(bad), 'activity-renew')).status, 409); assert.equal(f.calls.length, 0);
  }
  for (const headers of [{origin: 'https://other.invalid'}, {host: 'other.invalid'}, {authorization: ''}]) {
    const f = setup(renewed()); assert.notEqual((await f.handle(request(command, headers), 'activity-renew')).status, 200);
    assert.equal(f.calls.length, 0);
  }
});

test('renewal receipts cannot bind another service/identity, lie about the deadline or smuggle private fields', async () => {
  for (const bad of [renewed({service_id: F}), renewed({identity_id: F}), renewed({actor_user_id: F}),
    renewed({content_type: 'listing'}), renewed({private_path: 'not-forwarded'}), renewed({changed: false}),
    renewed({activity: validity({active_until: NEXT, is_expired: true})}),
    renewed({activity: validity({active_until: NEXT, is_expired: false, last_confirmed_at: OLD})}),
    renewed({activity: validity({active_until: '2028-11-11T10:00:00.654321+00:00', is_expired: false, last_confirmed_at: NOW})})]) {
    const f = setup(bad), r = await f.handle(request(command), 'activity-renew');
    assert.equal(r.status, 503); assert.deepEqual(await r.json(), {error: 'outcome_unknown'});
    assert.equal(f.calls.length, 2); assert.equal(f.jobs.length, 0);
  }
});

test('paused renewal stays paused, and a valid no-op preserves the longer existing deadline', async () => {
  const paused = renewed({status: 'archived'}), f = setup(paused);
  assert.deepEqual(await (await f.handle(request(command), 'activity-renew')).json(), paused);
  const farther = '2028-11-11T10:00:00.654321+00:00';
  const unchanged = activity({changed: false, activity: validity({active_until: farther, is_expired: false})});
  const r = await setup(unchanged).handle(request({...command, expectedActiveUntil: farther}), 'activity-renew');
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), unchanged);
});

test('known conflicts are bounded and unknown outcomes are not retried or declared a rollback', async () => {
  for (const [failure, status, expected] of [
    [{code: '40001', message: 'service_activity_conflict'}, 409, {error: 'conflict', code: '40001', message: 'service_activity_conflict'}],
    [{code: '42501', message: 'private-owner-detail'}, 403, {error: 'context_changed', code: '42501'}],
    [{code: 'XX000', message: 'secret', details: 'private-object'}, 503, {error: 'outcome_unknown'}],
  ]) {
    const f = setup(() => Response.json(failure, {status: 500})), r = await f.handle(request(command), 'activity-renew');
    assert.equal(r.status, status); assert.deepEqual(await r.json(), expected); assert.equal(f.calls.length, 2);
  }
  const lost = setup(() => {throw Error('Synthetic connection lost after dispatch');});
  const r = await lost.handle(request(command), 'activity-renew');
  assert.equal(r.status, 503); assert.equal(lost.calls.length, 2); assert.equal(lost.jobs.length, 0);
});

test('activity read is a separate actor-bound call and never reads or adopts the editor content', async () => {
  const wire = activity(), f = setup(wire), r = await f.handle(request(scope), 'activity-read');
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), wire);
  assert.match(f.calls[1].url, /\/get_my_service_activity_v1$/); assert.deepEqual(f.calls[1].args,
    {p_expected_user_id: U, p_expected_identity_id: I, p_service_id: S});
  assert.equal(f.calls.length, 2);
  assert.equal((await setup(activity({identity_id: F})).handle(request(scope), 'activity-read')).status, 503);
});

test('v2 owner snapshots include validity while v1 owner reads keep their exact old contract', async () => {
  const current = owner(), f = setup(current), r = await f.handle(request(scope), 'owner-activity-read');
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), current);
  assert.match(f.calls[1].url, /\/get_my_service_publication_snapshot_v2$/);
  const {activity: _activity, ...legacy} = current; legacy.schema_version = 1;
  const old = setup(legacy), v1 = await old.handle(request(scope), 'owner-read');
  assert.equal(v1.status, 200); assert.deepEqual(await v1.json(), legacy);
  assert.match(old.calls[1].url, /\/get_my_service_publication_snapshot_v1$/);
  assert.equal((await setup(current).handle(request(scope), 'owner-read')).status, 503);
});

test('activity-aware pages retain the bounded 50-item / 4MiB transport and exact pagination', async () => {
  const items = Array.from({length: 50}, (_, n) => {
    const id = 'aaaaaaaa-aaaa-4aaa-8aaa-' + String(n + 1).padStart(12, '0');
    return owner({service_id: id, content: {...owner().content, serviceId: id, description: 'x'.repeat(5000)}});
  });
  const wire = {schema_version: 2, actor_user_id: U, identity_id: I, items, total_count: '301',
    result_limit: 50, result_offset: 200, has_more: true, next_offset: 250};
  assert.ok(Buffer.byteLength(JSON.stringify(wire)) > 65536);
  const f = setup(wire), body = {...actor, resultLimit: 50, resultOffset: 200};
  const r = await f.handle(request(body), 'owner-activity-list');
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), wire);
  assert.match(f.calls[1].url, /\/get_my_service_publications_v2$/);
  assert.equal((await setup({...wire, result_offset: 0}).handle(request(body), 'owner-activity-list')).status, 503);
  const invalid = setup(wire); assert.equal((await invalid.handle(request({...body, resultLimit: 51}), 'owner-activity-list')).status, 409);
  assert.equal(invalid.calls.length, 0);
});
