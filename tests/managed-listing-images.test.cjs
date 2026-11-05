/* Actual entity model/client modules with controlled actor and journey transport.
 * No browser, database or Storage calls are made by these tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const E = 'src/entities/listing/';
const U = '11111111-1111-4111-8111-111111111111';
const I = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const A = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OTHER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const KEY = { userId: U, identityId: I, listingId: '9007199254740993', attemptId: A };
const copy = value => JSON.parse(JSON.stringify(value));
const defer = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function realm(options = {}) {
  const cache = new Map();
  function load(rel) {
    const file = path.resolve(root, rel), name = path.relative(root, file).split(path.sep).join('/');
    assert.ok(file.startsWith(root + path.sep));
    if (name === E + 'api/getListingActivityActor.ts') return {
      getListingActivityActor: options.actor ?? (async () => { throw Error('Live actor is forbidden in this test'); }),
    };
    if (name === E + 'api/publicationJourneyClient.ts') return {
      publicationJourneyRequest: options.request ?? (async () => { throw Error('Live journey is forbidden in this test'); }),
    };
    if (cache.has(file)) return cache.get(file).exports;
    const source = fs.readFileSync(file, 'utf8');
    const built = ts.transpileModule(source, { fileName: file, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS } });
    assert.deepEqual(built.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error), []);
    const mod = { exports: {} }; cache.set(file, mod);
    const localRequire = spec => {
      assert.ok(spec.startsWith('.'), 'Unexpected external import: ' + spec);
      return load(path.resolve(path.dirname(file), spec) + '.ts');
    };
    vm.runInNewContext(built.outputText, { module: mod, exports: mod.exports, require: localRequire,
      AbortController, setTimeout: options.setTimeout ?? setTimeout, clearTimeout: options.clearTimeout ?? clearTimeout,
      Promise, BigInt, Error, Map, Set, JSON, Object, Array, String, Number }, { filename: file, timeout: 1500 });
    return mod.exports;
  }
  return { model: load(E + 'model/managedListingImages.ts'), client: load(E + 'api/managedListingImagesClient.ts') };
}
const R = realm();
function wire(count = 3, primary = 0, revision = '5', key = KEY) {
  return { schema_version: 1, actor_user_id: key.userId, identity_id: key.identityId,
    listing_id: key.listingId, attempt_id: key.attemptId, revision,
    images: Array.from({ length: count }, (_, ordinal) => ({ ordinal,
      url: `/api/v2/listing-media/${key.attemptId}/${ordinal}`, is_primary: ordinal === primary })) };
}
function command(ordinal = 2, row = wire()) {
  return { key: copy(KEY), baseline: R.model.parseManagedListingImages(row, KEY), ordinal };
}
function saved(cmd) {
  const changed = !cmd.baseline.images.find(image => image.ordinal === cmd.ordinal).isPrimary;
  return { ...wire(cmd.baseline.images.length, cmd.ordinal,
    String(BigInt(cmd.baseline.revision) + (changed ? 1n : 0n)), cmd.key), changed,
    images: cmd.baseline.images.map(image => ({ordinal: image.ordinal, url: image.url, is_primary: image.ordinal === cmd.ordinal})) };
}
function removed(cmd) {
  return {...wire(0, 0, String(BigInt(cmd.baseline.revision) + 1n), cmd.key), changed: true,
    images: cmd.baseline.images.filter(image => image.ordinal !== cmd.ordinal)
      .map(image => ({ordinal: image.ordinal, url: image.url, is_primary: image.isPrimary}))};
}

test('read binds complete actor/listing/attempt and freezes original ordered image metadata', () => {
  const row = wire(), result = R.model.parseManagedListingImages(row, KEY);
  assert.deepEqual(copy(result.key), KEY);
  assert.deepEqual(copy(result.images), row.images.map(image => ({ ordinal: image.ordinal, url: image.url, isPrimary: image.is_primary })));
  assert.equal(result.revision, '5');
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.key) && Object.isFrozen(result.images));
  assert.ok(result.images.every(Object.isFrozen));
  row.images[0].url = '/changed'; row.revision = '999';
  assert.equal(result.images[0].url, `/api/v2/listing-media/${A}/0`);
  assert.equal(result.revision, '5');
});

test('zero images is a valid read; ten original slots are a valid read', () => {
  assert.equal(R.model.parseManagedListingImages(wire(0), KEY).images.length, 0);
  assert.equal(R.model.parseManagedListingImages(wire(10, 9), KEY).images[9].isPrimary, true);
  assert.throws(() => R.model.bindManagedListingPrimaryCommand(command(0, wire(0))), error => error.code === 'invalid');
});

for (const [name, change] of [
  ['schema version', row => row.schema_version = 2],
  ['actor', row => row.actor_user_id = OTHER],
  ['identity', row => row.identity_id = OTHER],
  ['listing', row => row.listing_id = '1'],
  ['attempt', row => row.attempt_id = OTHER],
  ['extra private field', row => row.source_url = 'https://private.example'],
  ['missing revision', row => delete row.revision],
  ['numeric revision', row => row.revision = 5],
  ['negative revision', row => row.revision = '-1'],
  ['leading zero revision', row => row.revision = '05'],
  ['exponent revision', row => row.revision = '5e0'],
  ['newline revision', row => row.revision = '5\n'],
  ['overflow revision', row => row.revision = '9223372036854775808'],
  ['image count', row => row.images = wire(11).images],
  ['sparse image', row => delete row.images[1]],
  ['duplicate ordinal', row => row.images[1].ordinal = 0],
  ['reordered images', row => row.images.reverse()],
  ['negative ordinal', row => row.images[0].ordinal = -1],
  ['string ordinal', row => row.images[0].ordinal = '0'],
  ['unknown image field', row => row.images[0].secret = 'no'],
  ['no primary', row => row.images[0].is_primary = false],
  ['two primary images', row => row.images[1].is_primary = true],
  ['nonboolean primary', row => row.images[0].is_primary = 1],
  ['another attempt URL', row => row.images[0].url = `/api/v2/listing-media/${OTHER}/0`],
  ['another slot URL', row => row.images[0].url = `/api/v2/listing-media/${A}/1`],
  ['absolute URL', row => row.images[0].url = `https://example.com/api/v2/listing-media/${A}/0`],
  ['protocol relative URL', row => row.images[0].url = '//example.com/photo.webp'],
  ['signed URL suffix', row => row.images[0].url += '?token=secret'],
  ['URL newline', row => row.images[0].url += '\n'],
  ['source URL', row => row.images[0].url = `/api/v2/listing-owner-media/${A}/0`],
]) test('reject unbound or malformed image snapshot: ' + name, () => {
  const row = wire(); change(row);
  assert.throws(() => R.model.parseManagedListingImages(row, KEY), error => error.code === 'unknown');
});

for (const [name, key] of [
  ['zero listing', { ...KEY, listingId: '0' }], ['rounded numeric listing', { ...KEY, listingId: Number(KEY.listingId) }],
  ['newline listing', { ...KEY, listingId: '1\n' }], ['leading zero listing', { ...KEY, listingId: '01' }],
  ['overflow listing', { ...KEY, listingId: '9223372036854775808' }],
  ['nil attempt', { ...KEY, attemptId: '00000000-0000-0000-0000-000000000000' }],
  ['uppercase attempt', { ...KEY, attemptId: A.toUpperCase() }],
  ['newline actor', { ...KEY, userId: U + '\n' }],
]) test('invalid key cannot create arguments: ' + name, () => {
  assert.throws(() => R.model.managedListingImagesReadArguments(key), error => error.code === 'invalid');
});

test('RPC arguments carry exact string IDs, expected attempt and baseline revision only', () => {
  const cmd = command();
  assert.deepEqual(copy(R.model.managedListingPrimaryArguments(cmd)), {
    p_expected_user_id: U, p_expected_identity_id: I, p_listing_id: KEY.listingId,
    p_attempt_id: A, p_expected_revision: '5', p_ordinal: 2,
  });
  assert.ok(Object.isFrozen(R.model.managedListingPrimaryArguments(cmd)));
});

test('successful save acknowledges requested primary with immutable original objects', () => {
  const cmd = command(), result = R.model.parseManagedListingPrimarySaved(saved(cmd), cmd);
  assert.equal(result.changed, true); assert.equal(result.snapshot.revision, '6');
  assert.deepEqual(result.snapshot.images.map(image => image.ordinal), [0, 1, 2]);
  assert.equal(result.snapshot.images[2].isPrimary, true);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.snapshot));
});

test('no-op selection preserves the revision and requires changed false', () => {
  const cmd = command(0), result = R.model.parseManagedListingPrimarySaved(saved(cmd), cmd);
  assert.equal(result.changed, false); assert.equal(result.snapshot.revision, '5');
});

test('CAS arithmetic remains exact beyond safe Number precision and at bigint maximum', () => {
  const cmd = command(2, wire(3, 0, '9007199254740993'));
  assert.equal(R.model.parseManagedListingPrimarySaved(saved(cmd), cmd).snapshot.revision, '9007199254740994');
  const unchanged = command(0, wire(3, 0, '9223372036854775807'));
  assert.equal(R.model.parseManagedListingPrimarySaved(saved(unchanged), unchanged).snapshot.revision, '9223372036854775807');
  assert.throws(() => R.model.bindManagedListingPrimaryCommand(command(1, wire(3, 0, '9223372036854775807'))), error => error.code === 'invalid');
});

for (const [name, change] of [
  ['flag false', row => row.changed = false], ['flag missing', row => delete row.changed],
  ['revision unchanged', row => row.revision = '5'], ['revision skipped', row => row.revision = '7'],
  ['wrong primary', row => { row.images[2].is_primary = false; row.images[1].is_primary = true; }],
  ['removed object', row => row.images.pop()],
  ['added object', row => row.images.push({ ordinal: 3, url: `/api/v2/listing-media/${A}/3`, is_primary: false })],
]) test('save never reports phantom success: ' + name, () => {
  const cmd = command(), row = saved(cmd); change(row);
  assert.throws(() => R.model.parseManagedListingPrimarySaved(row, cmd), error => error.code === 'unknown');
});

test('command rejects a baseline from another attempt and a nonexistent selected ordinal', () => {
  const other = copy(command()); other.baseline.key.attemptId = OTHER;
  assert.throws(() => R.model.bindManagedListingPrimaryCommand(other), error => error.code === 'invalid');
  assert.throws(() => R.model.bindManagedListingPrimaryCommand(command(9)), error => error.code === 'invalid');
});

for (const [code, message, expected] of [
  ['40001', 'listing_images_conflict', 'conflict'], ['40001', 'another_conflict', 'unknown'],
  ['42501', 'listing_owner_changed', 'context'], ['22023', 'invalid_ordinal', 'invalid'],
  ['55000', 'listing_images_unavailable', 'unavailable'], ['55000', 'other_state_error', 'unknown'],
  ['PGRST202', 'missing', 'unavailable'], ['42883', 'missing', 'unavailable'],
  ['500', 'server_error', 'unknown'], ['outcome_unknown', 'lost', 'unknown'],
]) test('classify only explicit known rejection: ' + code + '/' + message, () => {
  assert.equal(R.model.classifyManagedListingImagesError({ code, message }).code, expected);
});

test('live adapter uses only the three closed owner image journey actions', async () => {
  const calls = [], cmd = command();
  const r = realm({ actor: async () => ({ userId: U, identityId: I }), request: async (actor, action, args, signal) => {
    calls.push({ actor: copy(actor), action, args: copy(args), signal });
    return action === 'owner-images-read' ? wire() : action === 'owner-images-remove' ? removed(cmd) : saved(cmd);
  } });
  await r.client.readManagedListingImages(KEY);
  await r.client.setManagedListingPrimaryImage(cmd);
  await r.client.removeManagedListingImage(cmd);
  assert.deepEqual(calls.map(call => call.action), ['owner-images-read', 'owner-images-primary', 'owner-images-remove']);
  assert.deepEqual(calls[1].actor, { userId: U, identityId: I });
  assert.equal(calls[1].args.p_attempt_id, A);
  assert.deepEqual(calls[2].args, calls[1].args);
});

test('active membership preserves gaps and primary selection uses the original ordinal', () => {
  const row = wire(10, 0); row.images = row.images.filter(image => [0, 2, 9].includes(image.ordinal));
  const cmd = command(9, row), result = R.model.parseManagedListingPrimarySaved(saved(cmd), cmd);
  assert.deepEqual(result.snapshot.images.map(image => image.ordinal), [0, 2, 9]);
  assert.equal(result.snapshot.images[2].isPrimary, true);
  assert.equal(R.model.managedListingPrimaryArguments(cmd).p_ordinal, 9);
  assert.equal(result.snapshot.images[2].url, `/api/v2/listing-media/${A}/9`);
});

test('one removal preserves every remaining object and primary and increments exact bigint revision once', () => {
  const cmd = command(1, wire(3, 0, '9007199254740993'));
  const result = R.model.parseManagedListingRemoveSaved(removed(cmd), cmd);
  assert.equal(result.changed, true); assert.equal(result.snapshot.revision, '9007199254740994');
  assert.deepEqual(copy(result.snapshot.images), copy(cmd.baseline.images.filter(image => image.ordinal !== 1)));
  assert.deepEqual(copy(R.model.managedListingRemoveArguments(cmd)), {p_expected_user_id: U, p_expected_identity_id: I,
    p_listing_id: KEY.listingId, p_attempt_id: A, p_expected_revision: '9007199254740993', p_ordinal: 1});
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.snapshot.images));
});

for (const [name, cmd] of [
  ['primary', command(0)], ['last image', command(0, wire(1))], ['absent ordinal', command(9)],
  ['revision overflow', command(1, wire(3, 0, '9223372036854775807'))],
  ['different attempt', {...command(1), key: {...KEY, attemptId: OTHER}}],
]) test('removal command refuses ' + name, () => {
  assert.throws(() => R.model.bindManagedListingRemoveCommand(cmd), error => error.code === 'invalid');
});

for (const [name, change] of [
  ['changed false', row => row.changed = false], ['changed missing', row => delete row.changed],
  ['unchanged revision', row => row.revision = '5'], ['skipped revision', row => row.revision = '7'],
  ['retained target', row => row.images = wire().images],
  ['removed another photo', row => row.images = wire().images.filter(image => image.ordinal !== 2)],
  ['changed primary', row => { row.images[0].is_primary = false; row.images[1].is_primary = true; }],
  ['renumbered remaining URL', row => { row.images[1].ordinal = 1; row.images[1].url = `/api/v2/listing-media/${A}/1`; }],
  ['different listing', row => row.listing_id = '1'], ['private detail', row => row.object_path = 'never-return'],
]) test('removal acknowledgement refuses ' + name, () => {
  const cmd = command(1), row = removed(cmd); change(row);
  assert.throws(() => R.model.parseManagedListingRemoveSaved(row, cmd), error => error.code === 'unknown');
});

test('authoritative readback may advance after removal to a newer primary or smaller active membership', () => {
  const cmd = command(1, wire(4)), ack = R.model.parseManagedListingRemoveSaved(removed(cmd), cmd).snapshot;
  assert.deepEqual(copy(R.model.confirmManagedListingImagesReadback(ack, ack)), copy(ack));
  const row = removed(cmd); delete row.changed; row.revision = '7';
  row.images = row.images.filter(image => image.ordinal !== 3).map(image => ({...image, is_primary: image.ordinal === 2}));
  const fresh = R.model.parseManagedListingImages(row, KEY);
  assert.deepEqual(R.model.confirmManagedListingImagesReadback(ack, fresh).images.map(image => image.ordinal), [0, 2]);
});

test('an existing zero-photo gallery remains valid on authoritative readback', () => {
  const empty = R.model.parseManagedListingImages(wire(0), KEY);
  const later = R.model.parseManagedListingImages(wire(0, 0, '6'), KEY);
  assert.equal(R.model.confirmManagedListingImagesReadback(empty, empty).images.length, 0);
  assert.equal(R.model.confirmManagedListingImagesReadback(empty, later).images.length, 0);
});

for (const [name, change] of [
  ['older revision', row => row.revision = '5'],
  ['same revision with another primary', row => { row.images[0].is_primary = false; row.images[1].is_primary = true; }],
  ['same revision with missing member', row => row.images.pop()],
  ['revived retired member', row => { row.revision = '7'; row.images = wire().images; }],
  ['no active members', row => { row.revision = '7'; row.images = []; }],
]) test('readback cannot establish success from ' + name, () => {
  const cmd = command(1), ack = R.model.parseManagedListingRemoveSaved(removed(cmd), cmd).snapshot;
  const row = removed(cmd); delete row.changed; change(row);
  const observed = R.model.parseManagedListingImages(row, KEY);
  assert.throws(() => R.model.confirmManagedListingImagesReadback(ack, observed), error => error.code === 'unknown');
});

test('removal captures immutable confirmation before asynchronous preflight', async () => {
  const gate = defer(), entered = defer(), original = command(1), input = copy(original), calls = []; let reads = 0;
  const api = R.client.createManagedListingImagesClient(async (actor, action, args) => {
    calls.push({actor, action, args}); return removed(original);
  }, async () => { if (reads++ === 0) { entered.resolve(); await gate.promise; } return {userId: U, identityId: I}; });
  const pending = api.remove(input); await entered.promise;
  input.ordinal = 2; input.key.identityId = OTHER; input.baseline.revision = '99'; input.baseline.images[1].url = '/changed';
  gate.resolve(); const result = await pending;
  assert.equal(calls.length, 1); assert.equal(calls[0].action, 'owner-images-remove');
  assert.equal(calls[0].args.p_ordinal, 1); assert.equal(calls[0].args.p_expected_revision, '5');
  assert.deepEqual(result.snapshot.images.map(image => image.ordinal), [0, 2]);
});

for (const current of [{userId: OTHER, identityId: I}, {userId: U, identityId: OTHER}])
  test('removal rejects changed preflight actor with no dispatch ' + JSON.stringify(current), async () => {
    let sent = 0;
    const api = R.client.createManagedListingImagesClient(async () => { sent++; }, async () => current);
    await assert.rejects(api.remove(command(1)), error => error.code === 'context'); assert.equal(sent, 0);
  });

for (const failure of [new Error('lost acknowledgement'), {changed: true}, {code: '40001', message: 'listing_images_conflict'},
  {code: '55000', message: 'listing_images_unavailable'}, {code: '42501'}])
  test('removal is dispatched once for uncertain or rejected result ' + (failure.code ?? failure.message ?? 'malformed'), async () => {
    let sent = 0;
    const api = R.client.createManagedListingImagesClient(async () => {
      sent++; if (failure.changed) return failure; throw failure;
    }, async () => ({userId: U, identityId: I}));
    await assert.rejects(api.remove(command(1))); await tick(); assert.equal(sent, 1);
  });

test('removal postflight context change remains unknown despite valid acknowledgement', async () => {
  const cmd = command(1); let reads = 0, sent = 0;
  const api = R.client.createManagedListingImagesClient(async () => { sent++; return removed(cmd); },
    async () => ({userId: U, identityId: reads++ === 0 ? I : OTHER}));
  await assert.rejects(api.remove(cmd), error => error.code === 'unknown'); assert.equal(sent, 1);
});

test('aborted removal remains unknown and a late acknowledgement never retries', async () => {
  const cmd = command(1), entered = defer(), gate = defer(), control = new AbortController(); let sent = 0;
  const api = R.client.createManagedListingImagesClient(async () => { sent++; entered.resolve(); return gate.promise; },
    async () => ({userId: U, identityId: I}));
  const pending = api.remove(cmd, control.signal); await entered.promise; control.abort();
  await assert.rejects(pending, error => error.code === 'unknown'); gate.resolve(removed(cmd)); await tick(); assert.equal(sent, 1);
});

test('caller mutation during asynchronous preflight cannot change dispatched command or baseline', async () => {
  const gate = defer(), entered = defer(), original = command(), input = copy(original), calls = [];
  let reads = 0;
  const api = R.client.createManagedListingImagesClient(async (actor, action, args) => {
    calls.push({ actor, action, args }); return saved(original);
  }, async () => { if (reads++ === 0) { entered.resolve(); await gate.promise; } return { userId: U, identityId: I }; });
  const pending = api.setPrimary(input); await entered.promise;
  input.key.attemptId = OTHER; input.key.userId = OTHER; input.ordinal = 1;
  input.baseline.revision = '100'; input.baseline.images[2].url = '/changed';
  gate.resolve(); const result = await pending;
  assert.equal(calls.length, 1); assert.equal(calls[0].args.p_ordinal, 2);
  assert.equal(calls[0].args.p_expected_revision, '5'); assert.equal(calls[0].args.p_attempt_id, A);
  assert.ok(Object.isFrozen(calls[0].args) && Object.isFrozen(calls[0].actor));
  assert.equal(result.snapshot.images[2].isPrimary, true);
});

test('read key is captured before an asynchronous actor check', async () => {
  const gate = defer(), input = copy(KEY), calls = [];
  const api = R.client.createManagedListingImagesClient(async (actor, action, args) => {
    calls.push(copy(args)); return wire();
  }, async () => { await gate.promise; return { userId: U, identityId: I }; });
  const pending = api.read(input); input.listingId = '1'; input.attemptId = OTHER; gate.resolve();
  assert.equal((await pending).key.listingId, KEY.listingId); assert.equal(calls[0].p_attempt_id, A);
});

for (const current of [{ userId: OTHER, identityId: I }, { userId: U, identityId: OTHER }])
  test('actor mismatch before dispatch sends no write: ' + JSON.stringify(current), async () => {
    let sent = 0;
    const api = R.client.createManagedListingImagesClient(async () => { sent++; }, async () => current);
    await assert.rejects(api.setPrimary(command()), error => error.code === 'context'); assert.equal(sent, 0);
  });

test('preflight lookup failure sends no write', async () => {
  let sent = 0;
  const api = R.client.createManagedListingImagesClient(async () => { sent++; }, async () => { throw Error('network'); });
  await assert.rejects(api.setPrimary(command()), error => error.code === 'context'); assert.equal(sent, 0);
});

for (const postflight of ['other-account', 'other-identity', 'failed-read'])
  test('post-dispatch context failure remains unknown: ' + postflight, async () => {
    let reads = 0, writes = 0; const cmd = command();
    const api = R.client.createManagedListingImagesClient(async () => { writes++; return saved(cmd); }, async () => {
      if (reads++ === 0) return { userId: U, identityId: I };
      if (postflight === 'failed-read') throw { code: '42501' };
      return { userId: postflight === 'other-account' ? OTHER : U, identityId: postflight === 'other-identity' ? OTHER : I };
    });
    await assert.rejects(api.setPrimary(cmd), error => error.code === 'unknown'); assert.equal(writes, 1);
  });

for (const failure of [new Error('network lost'), new Error('context_changed'),
  { code: '40001', message: 'listing_images_conflict' }, { code: '42501' }, { code: '22023' }, { code: 'PGRST202' },
  { code: '55000', message: 'listing_images_unavailable' }])
  test('a failed write is attempted once without retry: ' + (failure.message ?? failure.code), async () => {
    let writes = 0;
    const api = R.client.createManagedListingImagesClient(async () => { writes++; throw failure; }, async () => ({ userId: U, identityId: I }));
    await assert.rejects(api.setPrimary(command()), error => error.code === R.model.classifyManagedListingImagesError(failure).code);
    await tick(); assert.equal(writes, 1);
  });

test('invalid response after dispatch is unknown, never an acknowledgement', async () => {
  let writes = 0;
  const api = R.client.createManagedListingImagesClient(async () => { writes++; return { changed: true }; }, async () => ({ userId: U, identityId: I }));
  await assert.rejects(api.setPrimary(command()), error => error.code === 'unknown'); assert.equal(writes, 1);
});

test('already aborted read/write does not read actor or dispatch', async () => {
  let actors = 0, sent = 0; const c = new AbortController(); c.abort();
  const api = R.client.createManagedListingImagesClient(async () => { sent++; }, async () => { actors++; return { userId: U, identityId: I }; });
  await assert.rejects(api.read(KEY, c.signal), error => error.code === 'context');
  await assert.rejects(api.setPrimary(command(), c.signal), error => error.code === 'context');
  assert.equal(actors, 0); assert.equal(sent, 0);
});

test('abort while preflight waits cannot later dispatch', async () => {
  const gate = defer(), c = new AbortController(); let sent = 0;
  const api = R.client.createManagedListingImagesClient(async () => { sent++; }, async () => { await gate.promise; return { userId: U, identityId: I }; });
  const pending = api.setPrimary(command(), c.signal); c.abort();
  await assert.rejects(pending, error => error.code === 'context'); gate.resolve(); await tick(); assert.equal(sent, 0);
});

test('abort after dispatch is unknown and late valid response cannot replace it', async () => {
  const gate = defer(), entered = defer(), c = new AbortController(); const cmd = command(); let writes = 0;
  const api = R.client.createManagedListingImagesClient(async () => { writes++; entered.resolve(); return gate.promise; }, async () => ({ userId: U, identityId: I }));
  const pending = api.setPrimary(cmd, c.signal); await entered.promise; c.abort();
  await assert.rejects(pending, error => error.code === 'unknown'); gate.resolve(saved(cmd)); await tick(); assert.equal(writes, 1);
});

test('whole-operation deadline prevents a late preflight from dispatching', async () => {
  let timeout; const gate = defer(); let sent = 0, cleared = 0;
  const r = realm({ setTimeout: (cb, ms) => { assert.equal(ms, 20000); timeout = cb; return 1; }, clearTimeout: () => { cleared++; } });
  const api = r.client.createManagedListingImagesClient(async () => { sent++; }, async () => { await gate.promise; return { userId: U, identityId: I }; });
  const pending = api.setPrimary(command()); timeout(); await assert.rejects(pending, error => error.code === 'context');
  gate.resolve(); await tick(); assert.equal(sent, 0); assert.equal(cleared, 1);
});

test('whole-operation deadline after write dispatch is unknown without retry', async () => {
  let timeout; const entered = defer(), gate = defer(); let sent = 0;
  const r = realm({ setTimeout: cb => { timeout = cb; return 1; }, clearTimeout: () => {} });
  const cmd = command();
  const api = r.client.createManagedListingImagesClient(async () => { sent++; entered.resolve(); return gate.promise; }, async () => ({ userId: U, identityId: I }));
  const pending = api.setPrimary(cmd); await entered.promise; timeout();
  await assert.rejects(pending, error => error.code === 'unknown'); gate.resolve(saved(cmd)); await tick(); assert.equal(sent, 1);
});
