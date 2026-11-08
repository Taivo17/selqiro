'use strict';
// Mocked boundaries only. No hosted calls or real image/storage mutations.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { createHash } = require('node:crypto');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename);
};
const { createHorsePublicationRequestHandler } = require('../src/server/horse-publication/createHorsePublicationHandler.ts');
const { createHorseMediaHandler } = require('../src/server/horse-publication/serveHorseMedia.ts');
const { createListingMediaHandler } = require('../src/server/listing-publication/final/serveListingMedia.ts');
const { createHorseCleanupPass } = require('../src/server/horse-publication/settleHorseCleanup.ts');
const USER = '11000000-0000-4000-8000-000000000001';
const IDENTITY = '12000000-0000-4000-8000-000000000002';
const REQUEST = '13000000-0000-4000-8000-000000000003';
const ATTEMPT = '14000000-0000-4000-8000-000000000004';
const SLOT = '15000000-0000-4000-8000-000000000005';
const FILE = '16000000-0000-4000-8000-000000000006';
const OFFER = '17000000-0000-4000-8000-000000000007';
const EVENT = '18000000-0000-4000-8000-000000000008';
const RUN = '19000000-0000-4000-8000-000000000009';
const HASH = 'ab'.repeat(32);
const APP = 'http://127.0.0.1:3100';
const API = 'https://abcdefghijklmnopqrst.supabase.co';
const config = { appOrigin: APP, projectOrigin: API, publicKey: 'public-key', serviceKey: 'service-key', runId: RUN };
const actor = { expectedUserId: USER, expectedIdentityId: IDENTITY };
const command = { ...actor, attemptId: ATTEMPT, requestKey: REQUEST };
const prepare = { ...actor, requestKey: REQUEST, offerId: null, expectedRevision: null,
  content: { offerType: 'sale' }, gallery: [{ clientFileId: FILE, byteLength: 123, sha256: HASH, isPrimary: true }],
  confirmations: {}, policySnapshot: [{ accepted: true }, { accepted: true }] };
const slot = { slot_id: SLOT, client_file_id: FILE, ordinal: 0, expected_bytes: 123, expected_sha256: HASH };
const receipt = (patch = {}) => ({ schema_version: 1, content_type: 'horse_offer', state: 'prepared',
  actor_user_id: USER, identity_id: IDENTITY, request_key: REQUEST, attempt_id: ATTEMPT,
  horse_offer_id: OFFER, edit_revision: '1', publication_event_id: null, slots: [slot], ...patch });
const request = (body, patch = {}) => new Request(APP + '/api/v2/horse-publication/prepare', {
  method: 'POST', headers: { host: new URL(APP).host, origin: APP, authorization: 'Bearer user-token',
    'content-type': 'application/json', ...patch }, body: JSON.stringify(body),
});
const failImages = { prepare: async () => { throw new Error('unexpected image transport'); },
  verify: async () => { throw new Error('unexpected image transport'); } };
function setup(result, images = failImages, after) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, args: init.body ? JSON.parse(init.body) : null });
    assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store');
    if (url.endsWith('/assert_selqiro_disposable_v2')) return Response.json({ scope: 'disposable-v2', run_id: RUN });
    assert.equal(init.headers.get('authorization'), 'Bearer user-token');
    return typeof result === 'function' ? result(url, init) : Response.json(result);
  };
  return { calls, handle: createHorsePublicationRequestHandler(config, images, fetcher, after) };
}

test('horse HTTP binds a prepare to typed content and exact immutable slot fingerprints', async () => {
  const { calls, handle } = setup(receipt());
  const res = await handle(request(prepare), 'prepare');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), receipt());
  assert.equal(calls.length, 2);
  assert.ok(calls[1].url.endsWith('/prepare_my_horse_publication_v1'));
  assert.deepEqual(calls[1].args, { p_expected_user_id: USER, p_expected_identity_id: IDENTITY,
    p_request_key: REQUEST, p_offer_id: null, p_expected_revision: null, p_content: prepare.content,
    p_gallery: prepare.gallery, p_confirmations: {}, p_policy_snapshot: prepare.policySnapshot });
  for (const bad of [receipt({ content_type: 'listing' }), receipt({ request_key: FILE }),
    receipt({ slots: [{ ...slot, expected_sha256: 'cd'.repeat(32) }] }), receipt({ slots: [] })]) {
    const denied = await setup(bad).handle(request(prepare), 'prepare');
    assert.equal(denied.status, 503);
    assert.deepEqual(await denied.json(), { error: 'outcome_unknown' });
  }
});

test('horse HTTP rejects unbound envelopes and cross-origin requests before any remote call', async () => {
  for (const [body, headers] of [[{ ...prepare, listingId: '201' }, {}], [prepare, { origin: 'https://different.invalid' }],
    [prepare, { host: 'different.invalid' }], [prepare, { authorization: '' }],
    [{ ...command, attemptId: null }, {}]]) {
    const { calls, handle } = setup(receipt());
    const res = await handle(request(body, headers), Object.hasOwn(body, 'attemptId') ? 'publish' : 'prepare');
    assert.notEqual(res.status, 200); assert.equal(calls.length, 0);
  }
});

test('horse status resolves a lost prepare by request key without replaying a write', async () => {
  const notFound = receipt({ state: 'not_found', attempt_id: null, horse_offer_id: null,
    edit_revision: null, publication_event_id: null, slots: [] });
  const { calls, handle } = setup(notFound);
  const res = await handle(request({ ...command, attemptId: null }), 'status');
  assert.equal(res.status, 200); assert.deepEqual(await res.json(), notFound);
  assert.ok(calls[1].url.endsWith('/get_my_horse_publication_attempt_v1'));
  assert.equal(calls[1].args.p_attempt_id, null);
  assert.equal(calls.length, 2);
});

test('horse multipart transport needs typed actor/slot/client-file binding before issuing capability', async () => {
  const imgCommand = { ...actor, attemptId: ATTEMPT, slotId: SLOT, requestKey: FILE };
  const bound = { schema_version: 1, content_type: 'horse_offer', actor_user_id: USER, identity_id: IDENTITY,
    attempt_id: ATTEMPT, slot_id: SLOT, client_file_id: FILE, expected_bytes: 123, expected_sha256: HASH };
  let imageCalls = 0;
  const images = { ...failImages, prepare: async (token, input) => {
    imageCalls++; assert.equal(token, 'user-token'); assert.deepEqual(input, imgCommand);
    return { kind: 'pending', attemptId: ATTEMPT, slotId: SLOT };
  } };
  const { calls, handle } = setup(bound, images);
  assert.equal((await handle(request(imgCommand), 'image-prepare')).status, 200);
  assert.equal(imageCalls, 1);
  assert.ok(calls[1].url.endsWith('/get_my_horse_publication_image_binding_v1'));
  assert.equal(calls[1].args.p_client_file_id, FILE);
  for (const bad of [{ ...bound, content_type: 'listing' }, { ...bound, client_file_id: REQUEST },
    { ...bound, attempt_id: FILE }, null]) {
    const res = await setup(bad, images).handle(request(imgCommand), 'image-prepare');
    assert.equal(res.status, 503);
  }
  assert.equal(imageCalls, 1, 'a wrong-domain or stale binding must never reach image IO');
});

test('horse publish requires an event-bound ACK; cleanup only runs after a valid commit', async () => {
  const jobs = [], published = receipt({ state: 'published', publication_event_id: EVENT, edit_revision: '3' });
  const good = setup(published, failImages, work => jobs.push(work));
  const res = await good.handle(request(command), 'publish');
  assert.equal(res.status, 200); assert.deepEqual(await res.json(), published); assert.equal(jobs.length, 1);
  assert.equal(good.calls.length, 2, 'cleanup must not delay publication response');
  for (const bad of [receipt(), { ...published, publication_event_id: null }, { ...published, identity_id: FILE }]) {
    const failed = setup(bad, failImages, work => jobs.push(work));
    assert.equal((await failed.handle(request(command), 'publish')).status, 503);
  }
  assert.equal(jobs.length, 1);
});

test('horse owner read retains flat canonical UUID snapshot and redacts unrecognized database failures', async () => {
  const owner = { content_type: 'horse_offer', content_id: OFFER, offer_id: OFFER, identity_id: IDENTITY,
    edit_revision: '5', images: [] };
  const res = await setup(owner).handle(request({ ...actor, offerId: OFFER }), 'owner-read');
  assert.equal(res.status, 200); assert.deepEqual(await res.json(), owner);
  let writes = 0;
  const broken = setup(() => { writes++; return Response.json({ code: 'XX000', message: 'secret-internal-token',
    details: 'private-path' }, { status: 500 }); });
  const failed = await broken.handle(request(command), 'publish');
  assert.equal(failed.status, 503); assert.deepEqual(await failed.json(), { error: 'outcome_unknown' });
  assert.equal(writes, 1, 'unknown writes must never be repeated');
});

test('saved horse confirmations cross HTTP as an exact original-event reference without fabricated booleans', async () => {
  const input = { ...prepare, offerId: OFFER, expectedRevision: '7',
    confirmations: { reusePublicationEventId: EVENT } };
  const { calls, handle } = setup(receipt({ edit_revision: '7' }));
  const res = await handle(request(input), 'prepare');
  assert.equal(res.status, 200); assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].args.p_confirmations, { reusePublicationEventId: EVENT });
  assert.equal(calls[1].args.p_offer_id, OFFER); assert.equal(calls[1].args.p_expected_revision, '7');
  assert.deepEqual(calls[1].args.p_policy_snapshot, input.policySnapshot, 'saved facts never replace the shown policy snapshot');
});

test('new-offer and malformed saved-confirmation references are rejected before remote work', async () => {
  const edit = { ...prepare, offerId: OFFER, expectedRevision: '7' };
  for (const input of [
    { ...prepare, confirmations: { reusePublicationEventId: EVENT } },
    ...[null, 2, 'not-an-event', '00000000-0000-0000-0000-000000000000'].map(value =>
      ({ ...edit, confirmations: { reusePublicationEventId: value } })),
    { ...edit, confirmations: { reusePublicationEventId: EVENT, publisher_confirms_age_18_or_over: true } },
    { ...edit, confirmations: { reusePublicationEventId: EVENT, actor_user_id: USER } },
  ]) {
    const { calls, handle } = setup(receipt());
    assert.ok([409, 503].includes((await handle(request(input), 'prepare')).status),
      'malformed input must fail closed before any remote call');
    assert.equal(calls.length, 0);
  }
});

test('owner-only saved-confirmation descriptor remains separate from current policy consent', async () => {
  const saved = { schema_version: 1, offer_id: OFFER, identity_id: IDENTITY, actor_user_id: USER,
    offer_type: 'sale', publication_event_id: EVENT, confirmed_at: '2026-11-08T13:00:00.123456Z' };
  const owner = { content_type: 'horse_offer', content_id: OFFER, offer_id: OFFER, identity_id: IDENTITY,
    edit_revision: '7', images: [], saved_confirmation: saved };
  const { calls, handle } = setup(owner);
  const res = await handle(request({ ...actor, offerId: OFFER }), 'owner-read');
  assert.equal(res.status, 200); assert.deepEqual(await res.json(), owner);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].url.endsWith('/get_my_horse_offer_publication_snapshot_v1'));
});

test('a rejected saved-confirmation reference is returned once without inventing confirmation or replaying the write', async () => {
  const input = { ...prepare, offerId: OFFER, expectedRevision: '7', confirmations: { reusePublicationEventId: EVENT } };
  const { calls, handle } = setup(() => Response.json({ code: '22023', message: 'horse_offer_confirmations_required',
    details: 'private-original-event-details' }, { status: 400 }));
  const res = await handle(request(input), 'prepare');
  assert.equal(res.status, 409); assert.deepEqual(await res.json(), { error: 'refused', code: '22023' });
  assert.equal(calls.length, 2);
});

const bytes = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64');
const mediaBinding = { schema_version: 1, attempt_id: ATTEMPT, ordinal: 0, bucket_id: 'listing-publication-private',
  object_path: `v1/${ATTEMPT}/${SLOT}/web-v1.webp`, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };

test('horse public/owner media reuse exact-byte proof and post-read membership revocation; ordinary RPC stays ordinary', async () => {
  for (const domain of ['horse', 'ordinary', 'horse-owner']) for (const mode of ['valid', 'bad-hash', 'revoked']) {
    const calls = []; let reads = 0;
    const bindingName = domain === 'ordinary' ? 'get_public_listing_media_binding_v1'
      : domain === 'horse-owner' ? 'get_my_horse_media_binding_v1' : 'get_public_horse_media_binding_v1';
    const fetcher = async (url, init) => {
      calls.push(url);
      if (url.endsWith('/' + bindingName)) {
        assert.equal(init.headers.get('authorization'), domain === 'horse-owner' ? 'Bearer owner-token' : 'Bearer service-key');
        assert.deepEqual(JSON.parse(init.body), { p_attempt_id: ATTEMPT, p_ordinal: 0,
          ...(domain === 'horse-owner' ? { p_expected_user_id: USER, p_expected_identity_id: IDENTITY } : {}) });
        reads++; return Response.json(mode === 'revoked' && reads === 2 ? null : mediaBinding);
      }
      assert.equal(url, API + '/storage/v1/object/authenticated/' + mediaBinding.bucket_id + '/' + mediaBinding.object_path);
      assert.equal(init.headers.get('authorization'), 'Bearer service-key');
      const body = Buffer.from(bytes); if (mode === 'bad-hash') body[body.length - 1] ^= 1;
      return new Response(body, { headers: { 'content-type': 'image/webp', 'content-length': String(body.length) } });
    };
    const handler = domain === 'ordinary' ? createListingMediaHandler(config, fetcher)
      : createHorseMediaHandler(config, fetcher, domain === 'horse-owner'
        ? { userId: USER, identityId: IDENTITY, accessToken: 'owner-token', publicKey: 'public-key' } : undefined);
    const res = await handler(ATTEMPT, '0');
    assert.equal(res.status, mode === 'valid' ? 200 : mode === 'bad-hash' ? 503 : 404);
    assert.match(res.headers.get('cache-control'), /no-store/);
    assert.equal((await res.arrayBuffer()).byteLength, mode === 'valid' ? bytes.length : 0);
    assert.equal(calls.length, mode === 'bad-hash' ? 2 : 3);
  }
});

test('horse cleanup scopes server claim, checks actual absence and records one exact object', async () => {
  const object = '21000000-0000-4000-8000-000000000001', key = '22000000-0000-4000-8000-000000000002';
  const path = `v1/${ATTEMPT}/${SLOT}/source.upload`, calls = []; let claims = 0;
  const fetcher = async (url, init) => {
    calls.push(url);
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: USER });
    if (url.endsWith('/claim_horse_publication_cleanup_v1')) {
      assert.deepEqual(JSON.parse(init.body), { p_expected_user_id: USER, p_expected_identity_id: IDENTITY,
        p_attempt_id: ATTEMPT, p_request_key: REQUEST });
      return Response.json(++claims === 1 ? { schema_version: 1, object_id: object, work_key: key,
        bucket_id: 'listing-publication-private', object_path: path, try_count: 1,
        lease_until_epoch: Math.floor(Date.now() / 1000) + 60 } : null);
    }
    if (url.endsWith('/storage/v1/object/listing-publication-private')) {
      assert.equal(init.method, 'DELETE'); assert.deepEqual(JSON.parse(init.body), { prefixes: [path] });
      return Response.json([{ name: path }]);
    }
    if (url.includes('/storage/v1/object/authenticated/')) {
      assert.ok(url.includes('/' + path + '?cacheNonce='));
      return Response.json({ statusCode: '404', error: 'not_found', message: 'Object not found' }, { status: 404 });
    }
    assert.ok(url.endsWith('/record_horse_publication_cleanup_v1'));
    assert.equal(JSON.parse(init.body).p_result, 'deleted');
    return Response.json({ object_id: object, work_key: key, state: 'deleted' });
  };
  await createHorseCleanupPass(config, fetcher)('user-token', command);
  assert.equal(claims, 2); assert.equal(calls.length, 6);
});
