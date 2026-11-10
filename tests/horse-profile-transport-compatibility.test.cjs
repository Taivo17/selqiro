'use strict';
// Only the existing ordinary-category browser transport changed with the current API's RPC version.
// Its real fixture is loaded, then exercised through the actual current API and V2 parser.
const {test} = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path'), fs = require('node:fs'), vm = require('node:vm');
const esbuild = require('esbuild');
const {runtime, root, inputs, sha, recordInput} = require('./horse-store-category-runtime.cjs');

test('existing ordinary-category browser fixture serves current V2 wrapper while build inputs stay unchanged', async () => {
  const fixturePath = 'tests/browser/store-category-assignment-fixture.jsx';
  const bundle = await esbuild.build({absWorkingDir: root, entryPoints: [fixturePath], bundle: true, write: false,
    platform: 'node', format: 'cjs', metafile: true});
  for (const name of Object.keys(bundle.metafile.inputs)) if (!name.includes('node_modules/')) recordInput(path.join(root, name));
  recordInput(__filename);recordInput(path.join(root, 'tests/public-profile-marketplace.test.cjs'));
  const module = {exports: {}}, location = Object.getOwnPropertyDescriptor(global, 'location');
  Object.defineProperty(global, 'location', {configurable: true, value: new URL('https://fixture.invalid/v2/profile/synthetic-shop')});
  try {vm.runInThisContext('(function(module,exports,require){' + bundle.outputFiles[0].text + '\n})', {filename: fixturePath})(module, module.exports, require);}
  finally {if (location) Object.defineProperty(global, 'location', location);else delete global.location;}
  const fixture = module.exports.fixture, h = runtime(fixture), observed = [];
  try {
    const api = h.load('src/entities/listing/api/getPublicProfileMarketplace.ts').getPublicProfileMarketplace;
    fixture.state.assignments.set('1001', [fixture.ids.child]);
    for (const [category, expected] of [[null, ['1001', '1002']], [fixture.ids.root, ['1001']], [fixture.ids.child, ['1001']], [fixture.ids.foreign, []]]) {
      const page = await api({sellerSlug: 'synthetic-shop', storeCategoryId: category, offset: 0, limit: 24}, new AbortController().signal);
      assert.deepEqual(page.items.map(item => item.id), expected);assert.ok(page.items.every(item => item.contentType === 'listing'));
      assert.equal(fixture.publicReads.at(-1).name, 'get_public_profile_marketplace_v2');observed.push({category, ids: expected});
    }
    const inventoryPath = process.env.SELQIRO_BUILD_INPUTS;
    assert.ok(inventoryPath, 'Use the final completed production-build inventory');
    const inventoryBytes = fs.readFileSync(inventoryPath), inventory = JSON.parse(inventoryBytes), drift = [];
    for (const [name, hash] of Object.entries(inventory)) if (sha(fs.readFileSync(path.join(root, name))) !== hash) drift.push(name);
    assert.equal(Object.keys(inventory).length, 626);assert.deepEqual(drift, []);
    const report = {schemaVersion: 1, status: 'PASS', finishedAt: new Date().toISOString(),
      reason: 'The additive public profile V2 reader requires the current API wrapper to call RPCv2. Two existing transport fixtures were adjusted to RPCv2/schema2; direct V1 parser regressions and production V1 parser/SQL remain unchanged.',
      boundary: 'Loaded the actual existing browser fixture through esbuild and its current production API/parser in JSDOM. This narrow compatibility check is not another full browser or SQL regression run.',
      observed, sourceInputs: [...inputs].map(([name, hash]) => ({path: name, sha256: hash})),
      productionBuild: {inventoryPath, sha256: sha(inventoryBytes), count: Object.keys(inventory).length, drift}};
    const output = process.env.SELQIRO_PROFILE_COMPATIBILITY_OUTPUT;
    if (output) {fs.mkdirSync(output, {recursive: true});fs.writeFileSync(path.join(output, 'fixture-compatibility-result.json'), JSON.stringify(report, null, 2) + '\n');}
  } finally {await h.close();}
});
