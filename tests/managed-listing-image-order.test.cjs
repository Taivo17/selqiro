/* Focused display-order regression. Actual model/helper, no HTTP or database. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(relative) {
  const filename = path.join(root, relative);
  const built = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS },
  });
  assert.deepEqual(built.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error), []);
  const mod = { exports: {} };
  vm.runInNewContext(built.outputText, {
    module: mod, exports: mod.exports,
    require: name => { throw Error('Unexpected runtime dependency: ' + name); },
    Object, Array, String, Number, BigInt, Error,
  }, { filename, timeout: 1500 });
  return mod.exports;
}

const { orderManagedListingImagesForDisplay: order } = load(
  'src/features/listing-edit/model/managedListingImageOrder.ts');
const model = load('src/entities/listing/model/managedListingImages.ts');
const key = Object.freeze({
  userId: '11111111-1111-4111-8111-111111111111',
  identityId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  listingId: '9007199254740993',
  attemptId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
});

function snapshot(count, primary, revision = '5') {
  return model.parseManagedListingImages({
    schema_version: 1, actor_user_id: key.userId, identity_id: key.identityId,
    listing_id: key.listingId, attempt_id: key.attemptId, revision,
    images: Array.from({ length: count }, (_, ordinal) => ({ ordinal,
      url: `/api/v2/listing-media/${key.attemptId}/${ordinal}`, is_primary: ordinal === primary })),
  }, key);
}
const ordinals = images => Array.from(images, image => image.ordinal);

test('every primary slot displays first without changing immutable snapshot objects or remaining order', () => {
  for (let primary = 0; primary < 10; primary++) {
    const source = snapshot(10, primary), before = JSON.stringify(source);
    const displayed = order(source.images);
    assert.deepEqual(ordinals(displayed), [primary, ...Array.from({ length: 10 }, (_, n) => n).filter(n => n !== primary)]);
    assert.equal(JSON.stringify(source), before);
    assert.ok(Object.isFrozen(source.images));
    for (const image of displayed) assert.equal(image, source.images[image.ordinal]);
  }
});

test('selecting a displaced visible image still sends its original ordinal and unchanged CAS baseline', () => {
  const source = snapshot(3, 2);
  const displayed = order(source.images);
  assert.deepEqual(ordinals(displayed), [2, 0, 1]);
  const selected = displayed[1];
  const args = model.managedListingPrimaryArguments({ key, baseline: source, ordinal: selected.ordinal });
  assert.equal(args.p_ordinal, 0);
  assert.equal(args.p_expected_revision, '5');
  assert.equal(args.p_attempt_id, key.attemptId);
  assert.deepEqual(ordinals(source.images), [0, 1, 2]);
});

test('a confirmed new primary moves first on the next display without renaming URLs', () => {
  const source = snapshot(3, 0);
  const confirmed = snapshot(3, 2, '6');
  assert.deepEqual(ordinals(order(source.images)), [0, 1, 2]);
  assert.deepEqual(ordinals(order(confirmed.images)), [2, 0, 1]);
  for (const image of order(confirmed.images)) assert.equal(image.url, source.images[image.ordinal].url);
});

test('empty and fallback galleries preserve their existing order', () => {
  assert.deepEqual(ordinals(order([])), []);
  const fallback = Object.freeze([
    Object.freeze({ ordinal: 0, url: '/first', isPrimary: false }),
    Object.freeze({ ordinal: 1, url: '/second', isPrimary: false }),
  ]);
  const displayed = order(fallback);
  assert.deepEqual(ordinals(displayed), [0, 1]);
  assert.equal(displayed[0], fallback[0]);
  assert.equal(displayed[1], fallback[1]);
});
