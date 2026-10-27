// New integrated ordinary-publication controller cases only. No earlier suites run.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const repo = path.resolve(__dirname, '..');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  }, fileName: filename }).outputText, filename);
};
const { OrdinaryPublicationSession } = require('../src/features/listing-create/model/ordinaryPublicationSession.ts');
const { privateUploadHttp } = require('../src/entities/listing/api/privateUploadHttp.ts');
const USER = '71000000-0000-0000-0000-000000000001';
const IDENTITY = '72000000-0000-0000-0000-000000000002';
const ATTEMPT = '73000000-0000-0000-0000-000000000003';
const REQUEST = '74000000-0000-0000-0000-000000000004';
const CLIENT = '75000000-0000-0000-0000-000000000005';
const ORIGIN = 'https://abcdefghijklmnopqrst.supabase.co';
const STAMP = '2026-10-17T12:00:00.000000Z';
const copy = value => structuredClone(value);
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const sha = async blob => crypto.createHash('sha256').update(Buffer.from(await blob.arrayBuffer())).digest('hex');
const listing = () => ({
  basics: { title: 'Original integrated item', description: 'Exact original description\nWith second line.', condition: 'used' },
  price: { kind: 'fixed', amount: '123.40', currency: 'EUR' },
  category_path: ['vehicles', 'trucks_commercial', 'trucks'],
  location: { country: 'Estonia', city: 'Paide', latitude: null, longitude: null },
  attributes: { manufacturer: '', part_number: '', oem_number: '', vehicle_brand: '', vehicle_model: '', vehicle_year: '', engine: '' },
  details: { power: '90 kW' }, language: 'et',
});
function snapshot(body, state = 'open') {
  return { schema_version: 1, attempt_id: ATTEMPT, request_key: body.requestKey,
    actor_user_id: body.expectedUserId, identity_id: body.expectedIdentityId, state,
    created_at: STAMP, expires_at: '2026-10-24T12:00:00.000000Z', payload: state === 'open' ? { version: 1, ...copy(body.listing) } : null,
    slots: body.images.map((image, index) => ({ slot_id: '76000000-0000-0000-0000-' + String(index + 1).padStart(12, '0'),
      ordinal: index, client_file_id: image.client_file_id, expected_bytes: image.byte_length, expected_sha256: image.sha256 })) };
}
function harness(options = {}) {
  const h = { journal: null, writes: [], clears: 0, requests: [], puts: [], digests: [], uuidCalls: 0,
    backend: { snapshot: null, published: false, closed: false }, rejectJournal: false, verifyReady: true };
  const actor = options.actor ?? { userId: USER, identityId: IDENTITY };
  h.final = () => ({ schema_version: 1, attempt_id: ATTEMPT, request_key: h.backend.snapshot.request_key,
    actor_user_id: h.backend.snapshot.actor_user_id, identity_id: h.backend.snapshot.identity_id,
    listing_id: '9007199254740993', state: 'published', published_at: STAMP, content_deleted: false,
    files_remaining: h.backend.snapshot.slots.length * 2 });
  h.part = () => {
    const slot = h.backend.snapshot.slots[0];
    return { kind: 'part', attemptId: ATTEMPT, slotId: slot.slot_id, upload: {
      url: `${ORIGIN}/storage/v1/s3/listing-publication-private/v1/${ATTEMPT}/${slot.slot_id}/source.upload?partNumber=1&uploadId=synthetic-upload-id`,
      headers: { 'content-type': 'application/octet-stream' }, expiresAt: Date.now() + 60000,
      expectedBytes: slot.expected_bytes, sha256: slot.expected_sha256 } };
  };
  h.ready = slot => ({ kind: 'ready', receipt: { schema_version: 1, attempt_id: ATTEMPT, slot_id: slot.slot_id,
    receipt_id: '77000000-0000-0000-0000-000000000007', job_id: '78000000-0000-0000-0000-000000000008', pipeline_version: 'listing-web-v1' } });
  h.server = (action, body) => {
    if (action === 'prepare') {
      if (h.backend.closed) throw Error('refused');
      h.backend.snapshot = snapshot(body); return copy(h.backend.snapshot);
    }
    if (action === 'status') return { snapshot: h.backend.snapshot ? { ...copy(h.backend.snapshot),
      ...(h.backend.published ? { state: 'published', payload: null } : h.backend.closed ? { state: 'cancelled', payload: null } : {}) } : null,
      receipt: h.backend.published ? h.final() : null, intent_closed: h.backend.closed };
    if (action === 'cancel') { h.backend.closed = true; return h.server('status', body); }
    if (action === 'image-prepare') return h.part();
    if (action === 'image-verify') return h.verifyReady ? h.ready(h.backend.snapshot.slots.find(x => x.slot_id === body.slotId)) : { kind: 'needs_attention' };
    if (action === 'publish') { h.backend.published = true; return { ...h.final(), replayed: false }; }
    throw Error('Unexpected new journey action: ' + action);
  };
  h.deps = { actor, projectOrigin: ORIGIN,
    readJournal: () => h.journal === null ? null : copy(h.journal),
    writeJournal: value => { if (h.rejectJournal) throw Error('synthetic_storage_quota'); h.journal = copy(value); h.writes.push(copy(value)); },
    clearJournal: () => { h.clears++; h.journal = null; },
    withLock: options.withLock ?? (async work => work()),
    request: async (action, body, signal) => { h.requests.push({ action, body: copy(body), signal });
      const value = options.request ? await options.request(action, body, h, signal) : undefined;
      return value === undefined ? h.server(action, body) : value; },
    putPart: async (url, headers, bytes, signal) => { h.puts.push({ url, headers: copy(headers), text: await bytes.text(), signal,
      journalAtDispatch: copy(h.journal) }); if (options.putPart) await options.putPart(h, signal); },
    uuid: () => '79000000-0000-0000-0000-' + String(++h.uuidCalls).padStart(12, '0'),
    digest: async bytes => { if (options.digest) await options.digest(h); const result = await sha(bytes); h.digests.push({ text: await bytes.text(), hash: result }); return result; },
  };
  h.session = () => new OrdinaryPublicationSession(h.deps);
  h.open = async (blob, payload = listing()) => {
    h.journal = { version: 1, requestKey: REQUEST, dispatched: [] };
    h.backend.snapshot = snapshot({ expectedUserId: USER, expectedIdentityId: IDENTITY, requestKey: REQUEST,
      listing: payload, images: blob ? [{ client_file_id: CLIENT, byte_length: blob.size, sha256: await sha(blob) }] : [] });
  };
  return h;
}

test('hosted upload origin: omitted configuration preserves the existing API and local origins', async () => {
  for (const origin of [ORIGIN, 'http://127.0.0.1:63111']) {
    const h = harness(), originalPart = h.part;
    h.deps.projectOrigin = origin;
    h.part = () => { const part = originalPart(); part.upload.url = part.upload.url.replace(ORIGIN, origin); return part; };
    const s = h.session();
    await s.start(listing(), [new Blob(['existing origin bytes'])]);
    assert.equal(s.view.phase, 'published'); assert.equal(h.puts.length, 1);
    assert.equal(new URL(h.puts[0].url).origin, origin);
  }
});

test('hosted upload origin: the configured same-project Storage origin is used and captured before caller mutation', async () => {
  const storageOrigin = 'https://abcdefghijklmnopqrst.storage.supabase.co';
  const h = harness(), originalPart = h.part;
  h.deps.storageOrigin = storageOrigin;
  h.part = () => { const part = originalPart(); part.upload.url = part.upload.url.replace(ORIGIN, storageOrigin); return part; };
  const s = h.session();
  h.deps.storageOrigin = 'https://another-upload-host.example';
  h.deps.projectOrigin = 'https://another-api-host.example';
  await s.start(listing(), [new Blob(['hosted Storage bytes'])]);
  assert.equal(s.view.phase, 'published'); assert.equal(h.puts.length, 1);
  assert.equal(new URL(h.puts[0].url).origin, storageOrigin);
  assert.equal(h.puts[0].text, 'hosted Storage bytes');
  assert.deepEqual(h.requests.map(x => x.action), ['prepare', 'image-prepare', 'image-verify', 'publish']);
});

test('hosted upload origin: unrelated or noncanonical configuration is rejected before any request or PUT', () => {
  for (const origin of [
    'https://zyxwvutsrqponmlkjihg.storage.supabase.co',
    'https://another-upload-host.example',
    'https://abcdefghijklmnopqrst.storage.supabase.co.attacker.example',
    'https://abcdefghijklmnopqrst.storage.supabase.co:443',
    'https://abcdefghijklmnopqrst.storage.supabase.co:8443',
    'https://ABCDEFGHIJKLMNOPQRST.storage.supabase.co',
    'https://abcdefghijklmnopqrst.storage.supabase.co/',
    'https://abcdefghijklmnopqrst.storage.supabase.co/storage/v1/s3',
    'https://user@abcdefghijklmnopqrst.storage.supabase.co',
    'https://abcdefghijklmnopqrst.storage.supabase.co?redirect=1',
    'https://abcdefghijklmnopqrst.storage.supabase.co#fragment',
    'http://abcdefghijklmnopqrst.storage.supabase.co',
    '', null,
  ]) {
    const h = harness(); h.deps.storageOrigin = origin;
    assert.throws(() => h.session(), /configuration/);
    assert.equal(h.requests.length, 0); assert.equal(h.puts.length, 0); assert.equal(h.writes.length, 0);
  }
});

test('start captures nested form state and selected Blob set before deferred cross-tab lock; double click shares one operation', async () => {
  const lock = deferred(), h = harness({ withLock: async work => { await lock.promise; return work(); } });
  const s = h.session(), form = listing(), selected = [new Blob(['original source bytes'])];
  const first = s.start(form, selected), second = s.start(listing(), []);
  assert.equal(first, second); assert.equal(h.uuidCalls, 1); assert.equal(h.requests.length, 0);
  form.basics.title = 'Mutated title'; form.details.power = '999 kW'; form.price.amount = '999.00'; form.category_path[2] = 'buses';
  selected[0] = new Blob(['replacement']); selected.push(new Blob(['extra']));
  lock.resolve(); await first;
  const prepared = h.requests.find(x => x.action === 'prepare').body;
  assert.equal(prepared.listing.basics.title, 'Original integrated item'); assert.equal(prepared.listing.details.power, '90 kW');
  assert.equal(prepared.listing.price.amount, '123.4'); assert.equal(prepared.listing.category_path[2], 'trucks');
  assert.equal(prepared.images.length, 1); assert.equal(h.puts[0].text, 'original source bytes');
  assert.equal(h.requests.filter(x => x.action === 'prepare').length, 1); assert.equal(s.view.phase, 'published');
});

test('actor is captured at controller construction and cannot be rebound by caller mutation', async () => {
  const actor = { userId: USER, identityId: IDENTITY }, h = harness({ actor }), s = h.session();
  actor.userId = '81000000-0000-0000-0000-000000000001'; actor.identityId = '82000000-0000-0000-0000-000000000002';
  await s.start(listing(), []);
  assert.equal(h.requests[0].body.expectedUserId, USER); assert.equal(h.requests[0].body.expectedIdentityId, IDENTITY);
  assert.equal(s.view.receipt.actor_user_id, USER);
});

test('resume captures original selected bytes before status awaits and retains the saved listing intent', async () => {
  const status = deferred(), entered = deferred();
  const h = harness({ request: async action => { if (action === 'status') { entered.resolve(); await status.promise; } } });
  const original = new Blob(['resume original bytes']); await h.open(original);
  const s = h.session(), selected = [original], pending = s.resume(selected); await entered.promise;
  selected[0] = new Blob(['caller replaced after click']); selected.push(new Blob(['not selected at click']));
  status.resolve(); await pending;
  assert.equal(h.puts.length, 1); assert.equal(h.puts[0].text, 'resume original bytes');
  assert.equal(h.requests.some(x => x.action === 'prepare'), false); assert.equal(s.view.phase, 'published');
});

for (const [name, mutate] of [
  ['missing payload version', payload => { delete payload.version; }],
  ['unsupported payload version', payload => { payload.version = 2; }],
]) {
  test(`native snapshot rejects ${name} before any image or publish request on start and resume`, async () => {
    for (const phase of ['prepare', 'status']) {
      const h = harness({ request: async (action, body, state) => {
        if (action === phase) {
          const result = state.server(action, body);
          mutate(action === 'status' ? result.snapshot.payload : result.payload);
          return result;
        }
      } });
      const bytes = new Blob(['native version boundary']);
      if (phase === 'status') await h.open(bytes);
      const s = h.session();
      if (phase === 'prepare') await s.start(listing(), [bytes]);
      else await s.resume([bytes]);
      assert.equal(s.view.phase, 'unknown'); assert.equal(h.puts.length, 0);
      assert.deepEqual(h.requests.map(x => x.action), [phase]);
      assert.equal(h.backend.published, false); assert.equal(h.clears, 0);
    }
  });
}

test('lost PUT result is journaled before dispatch; reload verifies only, and ambiguous verification never publishes', async () => {
  const h = harness({ putPart: async () => { throw Error('lost_put_response'); } }); h.verifyReady = false;
  const first = h.session(); await first.start(listing(), [new Blob(['lost PUT bytes'])]);
  assert.equal(first.view.phase, 'unknown'); assert.equal(h.puts.length, 1);
  const slot = h.backend.snapshot.slots[0]; assert.deepEqual(h.puts[0].journalAtDispatch.dispatched, [slot.slot_id]);
  const beforeReload = h.requests.length, reloaded = h.session(); await reloaded.resume([]);
  assert.equal(reloaded.view.phase, 'needs_attention'); assert.equal(h.puts.length, 1);
  assert.deepEqual(h.requests.slice(beforeReload).map(x => x.action), ['status', 'image-verify']);
  assert.equal(h.requests.some(x => x.action === 'publish'), false); assert.equal(h.clears, 0);
  h.verifyReady = true; const beforeRetry = h.requests.length; await reloaded.resume([]);
  assert.deepEqual(h.requests.slice(beforeRetry).map(x => x.action), ['status', 'image-verify', 'publish']);
  assert.equal(h.puts.length, 1); assert.equal(reloaded.view.phase, 'published');
});

test('unknown publish outcome recovers the exact server receipt by inspect without re-publishing', async () => {
  const h = harness({ request: async (action, body, state) => { if (action === 'publish') { state.server(action, body); throw Error('publish_response_lost'); } } });
  const first = h.session(); await first.start(listing(), []);
  assert.equal(first.view.phase, 'unknown'); const key = h.journal.requestKey;
  const reloaded = h.session(); await reloaded.inspect();
  assert.equal(reloaded.view.phase, 'published'); assert.equal(reloaded.view.receipt.listing_id, '9007199254740993');
  assert.equal(reloaded.view.receipt.request_key, key); assert.equal(h.requests.filter(x => x.action === 'publish').length, 1);
  assert.equal(h.clears, 0);
});

test('cancel retains the same durable request key even when prepare has no confirmed snapshot', async () => {
  let delayedPrepare;
  const h = harness({ request: async (action, body, state) => { if (action === 'prepare') {
    delayedPrepare = () => state.server(action, body); throw Error('prepare_outcome_unknown');
  } } });
  const s = h.session(); await s.start(listing(), []);
  assert.equal(s.view.phase, 'unknown'); assert.equal(h.backend.snapshot, null);
  const key = h.journal.requestKey; await s.cancel();
  assert.equal(s.view.phase, 'closed'); assert.equal(h.requests.at(-1).action, 'cancel');
  assert.equal(h.requests.at(-1).body.requestKey, key); assert.equal(h.journal.requestKey, key); assert.equal(h.clears, 0);
  assert.throws(delayedPrepare, /refused/); assert.equal(h.backend.snapshot, null);
});

for (const phase of ['digest', 'prepare', 'image-prepare', 'publish']) {
  test(`identity invalidation while ${phase} awaits prevents all late UI updates and follow-on writes`, async () => {
    const gate = deferred(), entered = deferred();
    const h = harness({ digest: phase === 'digest' ? async () => { entered.resolve(); await gate.promise; } : undefined,
      request: async action => { if (action === phase) { entered.resolve(); await gate.promise; } } });
    const s = h.session(), seen = []; s.subscribe(view => seen.push(view));
    const running = s.start(listing(), phase === 'publish' ? [] : [new Blob(['identity-bound bytes'])]);
    await entered.promise; const before = { view: s.view, changes: seen.length, requests: h.requests.length, puts: h.puts.length };
    s.invalidate(); gate.resolve(); await running;
    assert.equal(s.view, before.view); assert.equal(seen.length, before.changes);
    assert.equal(h.requests.length, before.requests); assert.equal(h.puts.length, before.puts);
    assert.equal(h.clears, 0);
  });
}

test('early form or image validation errors leave no journal and keep the form editable', async () => {
  for (const input of [() => ({ form: { ...listing(), price: { kind: 'fixed', amount: '-1.00', currency: 'EUR' } }, files: [] }),
    () => ({ form: listing(), files: [new Blob([])] }), () => ({ form: listing(), files: Array.from({ length: 11 }, () => new Blob(['x'])) })]) {
    const h = harness(), s = h.session(), value = input(); await s.start(value.form, value.files);
    assert.equal(s.view.phase, 'editing'); assert.equal(h.journal, null); assert.equal(h.requests.length, 0); assert.equal(h.puts.length, 0);
  }
});

test('journal quota failure before prepare leaves an editable form and dispatches no external intent', async () => {
  const h = harness(); h.rejectJournal = true; const s = h.session();
  await s.start(listing(), [new Blob(['quota test bytes'])]);
  assert.equal(s.view.phase, 'editing'); assert.equal(h.journal, null); assert.equal(h.requests.length, 0); assert.equal(h.puts.length, 0);
  h.rejectJournal = false; await s.start(listing(), []); assert.equal(s.view.phase, 'published');
});

test('cross-tab lock failure before any intent keeps an editable form and cannot create a journal', async () => {
  const h = harness({ withLock: async () => { throw Error('busy_elsewhere'); } }), s = h.session(); await s.start(listing(), []);
  assert.equal(s.view.phase, 'editing'); assert.equal(h.journal, null); assert.equal(h.requests.length, 0);
});

test('losing local journal after a dispatched prepare cannot turn unknown remote intent into a safe local reset', async () => {
  const h = harness({ request: async (action, body, state) => { if (action === 'prepare') { state.journal = null; throw Error('lost_remote_result_and_journal'); } } });
  const s = h.session(); await s.start(listing(), []);
  assert.equal(s.view.phase, 'unknown'); s.reset(); assert.equal(h.clears, 0); assert.equal(s.view.phase, 'unknown');
});

test('a completed attempt reset does not attach the next form validation error to the old remote intent', async () => {
  const h = harness(), s = h.session(); await s.start(listing(), []); assert.equal(s.view.phase, 'published');
  s.reset(); assert.equal(h.journal, null); assert.equal(s.view.phase, 'editing');
  await s.start(listing(), [new Blob([])]);
  assert.equal(s.view.phase, 'editing'); assert.equal(h.journal, null); assert.equal(h.requests.filter(x => x.action === 'prepare').length, 1);
});

const tamper = {
  'remote host': p => { p.upload.url = p.upload.url.replace(ORIGIN, 'https://other.example'); },
  'other slot': p => { p.upload.url = p.upload.url.replace(p.slotId, '86000000-0000-0000-0000-000000000001'); },
  'other object': p => { p.upload.url = p.upload.url.replace('/source.upload', '/web.webp'); },
  'second part': p => { p.upload.url = p.upload.url.replace('partNumber=1', 'partNumber=2'); },
  'duplicate part query': p => { p.upload.url += '&partNumber=1'; },
  'duplicate upload query': p => { p.upload.url += '&uploadId=other'; },
  'missing upload query': p => { p.upload.url = p.upload.url.replace('&uploadId=synthetic-upload-id', ''); },
  'credential URL': p => { p.upload.url = p.upload.url.replace('https://', 'https://synthetic:synthetic@'); },
  'fragment': p => { p.upload.url += '#fragment'; },
  'wrong actor attempt envelope': p => { p.attemptId = '83000000-0000-0000-0000-000000000003'; },
  'wrong slot envelope': p => { p.slotId = '86000000-0000-0000-0000-000000000001'; },
  'byte count': p => { p.upload.expectedBytes += 1; },
  'content hash': p => { p.upload.sha256 = '0'.repeat(64); },
  'expired part': p => { p.upload.expiresAt = Date.now() - 1; },
  'unexpected authorization header': p => { p.upload.headers.authorization = 'synthetic'; },
};
for (const [name, mutate] of Object.entries(tamper)) {
  test(`part response rejects ${name} before journal dispatch and byte upload`, async () => {
    const h = harness({ request: async (action, _body, state) => { if (action === 'image-prepare') { const part = state.part(); mutate(part); return part; } } });
    const s = h.session(); await s.start(listing(), [new Blob(['bound source'])]);
    assert.equal(h.puts.length, 0); assert.deepEqual(h.journal.dispatched, []);
    assert.equal(h.requests.some(x => x.action === 'publish'), false); assert.equal(s.view.phase, 'unknown');
  });
}

test('unbound ready receipt cannot authorize publication', async () => {
  const h = harness({ request: async (action, _body, state) => { if (action === 'image-prepare') {
    const result = state.ready(state.backend.snapshot.slots[0]); result.receipt.slot_id = '86000000-0000-0000-0000-000000000001'; return result;
  } } });
  const s = h.session(); await s.start(listing(), [new Blob(['bound receipt'])]);
  assert.equal(h.puts.length, 0); assert.equal(h.requests.some(x => x.action === 'publish'), false); assert.equal(s.view.phase, 'unknown');
});

test('owner HTTP keeps a bounded opted-in conflict while default and unlisted errors remain unread', async () => {
  const body = {code: '40001', message: 'listing_price_conflict', details: null};
  const fetcher = async () => Response.json(body, {status: 409});
  assert.deepEqual(await privateUploadHttp(fetcher, ORIGIN, {method: 'POST'}), {status: 409, json: null});
  assert.deepEqual(await privateUploadHttp(fetcher, ORIGIN, {method: 'POST'}, {readErrorStatuses: [409]}), {status: 409, json: body});
  assert.deepEqual(await privateUploadHttp(fetcher, ORIGIN, {method: 'POST'}, {readErrorStatuses: [403]}), {status: 409, json: null});
});

test('owner HTTP captures its error allowlist before waiting for the response', async () => {
  const response = deferred(), statuses = [409];
  const waiting = privateUploadHttp(async () => response.promise, ORIGIN, {method: 'POST'}, {readErrorStatuses: statuses});
  statuses[0] = 503;
  response.resolve(Response.json({code: '40001', message: 'listing_basics_conflict'}, {status: 409}));
  assert.equal((await waiting).json.code, '40001');
});

for (const [label, response] of [
  ['declared oversized error', () => new Response('{}', {status: 409, headers: {'content-length': '1000'}})],
  ['streamed oversized error', () => new Response('x'.repeat(129), {status: 409})],
  ['invalid UTF-8 error', () => new Response(new Uint8Array([0xff, 0xfe]), {status: 409})],
  ['malformed JSON error', () => new Response('{"code":"40001"', {status: 409})],
]) {
  test('owner HTTP rejects ' + label + ' without fabricating a known conflict', async () => {
    await assert.rejects(privateUploadHttp(async () => response(), ORIGIN, {method: 'POST'}, {
      readErrorStatuses: [409], responseBytes: 128,
    }), error => ['invalid_response', 'outcome_unknown'].includes(error.code));
  });
}

test('owner HTTP bounds a stalled error body and never retries the write', async () => {
  let requests = 0, cancelled = false;
  const stalled = new ReadableStream({cancel() {cancelled = true;}});
  await assert.rejects(privateUploadHttp(async (_url, init) => {
    requests += 1;
    init.signal.addEventListener('abort', () => { void stalled.cancel().catch(() => {}); });
    return new Response(stalled, {status: 409});
  }, ORIGIN, {method: 'POST'}, {readErrorStatuses: [409], timeoutMs: 20}), error => error.code === 'outcome_unknown');
  assert.equal(requests, 1);
});
