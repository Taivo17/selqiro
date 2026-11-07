const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.join(__dirname, '..');
function compile(relative, context, imports = {}) {
  const filename = path.join(root, relative), module = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}, fileName: filename,
  }).outputText;
  vm.runInNewContext(code, {...context, module, exports: module.exports,
    require: name => {assert.ok(name in imports, 'unexpected import ' + name); return imports[name];}}, {filename});
  return module.exports;
}
function harness() {
  const entries = [], h = {clock: 100, failure: false, entries};
  const performance = {
    now() {if (h.failure) throw Error('timing_unavailable'); return h.clock;},
    getEntriesByName: name => entries.filter(e => e.name === name),
    clearMeasures(name) {for (let i = entries.length - 1; i >= 0; i--) if (entries[i].name === name) entries.splice(i, 1);},
    measure(name, options) {entries.push({name, duration: options.end - options.start, detail: {...options.detail}});},
  };
  h.context = {window: {location: {origin: 'https://synthetic.invalid'}}, performance};
  h.api = compile('src/entities/listing/model/photoPerformance.ts', h.context);
  return h;
}

test('browser photo timings contain only fixed labels, duration and bounded byte counts', async () => {
  const h = harness(), sizes = {inputBytes: 1024, filename: 'private.jpg', url: 'https://private.invalid', actor: 'private'};
  const sentinel = {};
  assert.equal(await h.api.measurePhotoTask('preparation', async () => {
    h.clock += 12.4; sizes.outputBytes = 256; return sentinel;
  }, sizes), sentinel);
  assert.equal(h.entries.length, 1);
  assert.equal(h.entries[0].name, 'selqiro:photo:preparation');
  assert.ok(Math.abs(h.entries[0].duration - 12.4) < 0.001);
  assert.deepEqual(h.entries[0].detail, {inputBytes: 1024, outputBytes: 256});
  assert.ok(!JSON.stringify(h.entries).includes('private'));
  h.api.recordPhotoTiming('actor-or-filename', 1, sizes);
  h.api.recordPhotoTiming('upload', NaN, sizes);
  h.api.recordPhotoTiming('upload', -1, sizes);
  assert.equal(h.entries.length, 1);
  h.api.recordPhotoTiming('upload', 5, {inputBytes: Infinity, outputBytes: 26 * 1024 * 1024});
  assert.deepEqual(h.entries.at(-1).detail, {});
});

test('timing entries remain bounded during repeated uploads and do not clear other stages', () => {
  const h = harness();
  h.api.recordPhotoTiming('preparation', 4);
  for (let i = 0; i < 100; i++) h.api.recordPhotoTiming('upload', 1);
  assert.ok(h.entries.filter(e => e.name === 'selqiro:photo:upload').length <= 8);
  assert.equal(h.entries.filter(e => e.name === 'selqiro:photo:preparation').length, 1);
});

test('measurement failure and nonbrowser execution preserve the original result or exact error', async () => {
  const h = harness(), sentinel = {}, error = new Error('original_failure');
  h.failure = true;
  assert.equal(await h.api.measurePhotoTask('upload', async () => sentinel), sentinel);
  await assert.rejects(h.api.measurePhotoTask('upload', async () => {throw error;}), e => e === error);
  assert.equal(h.entries.length, 0);
  const ssr = compile('src/entities/listing/model/photoPerformance.ts', {});
  assert.equal(await ssr.measurePhotoTask('upload', async () => sentinel), sentinel);
  await assert.rejects(ssr.measurePhotoTask('upload', async () => {throw error;}), e => e === error);
});

function clientHarness() {
  const h = harness(); h.httpCalls = []; h.puts = [];
  h.session = {data: {session: {user: {id: 'user'}, access_token: 'private-token'}}, error: null};
  h.response = {status: 200, json: {ok: true}};
  h.putResponse = {status: 200, redirected: false, body: null};
  h.client = compile('src/entities/listing/api/publicationJourneyClient.ts', {...h.context, AbortController,
    setTimeout, clearTimeout, fetch: async (url, init) => {h.puts.push({url, init}); h.clock += 4; return h.putResponse;}}, {
    '../../../shared/supabase/browserClient': {supabaseBrowserClient: {auth: {getSession: async () => h.session}}},
    '../../../shared/config/v2Integration': {v2IntegrationEnabled: () => true},
    './privateUploadHttp': {privateUploadHttp: async (...args) => {h.httpCalls.push(args); h.clock += 2; return h.response;}},
    '../model/publicationCapacity': {isPublicationCapacityError: () => false},
    '../model/photoPerformance': h.api,
  });
  return h;
}

test('request instrumentation preserves actor guard, error allowlist, request and response contracts', async () => {
  const h = clientHarness(), actor = {userId: 'user', identityId: 'identity'}, signal = new AbortController().signal;
  const payload = {privateBody: 'never included in measurements'};
  assert.equal(await h.client.publicationJourneyRequest(actor, 'image-verify', payload, signal), h.response.json);
  assert.equal(h.httpCalls.length, 1);
  assert.equal(h.httpCalls[0][1], 'https://synthetic.invalid/api/v2/publication/image-verify');
  assert.equal(h.httpCalls[0][2].headers.authorization, 'Bearer private-token');
  assert.equal(h.httpCalls[0][3].timeoutMs, 120000);
  assert.equal(h.entries.at(-1).name, 'selqiro:photo:image_verify');
  assert.ok(!JSON.stringify(h.entries).match(/private|identity|user/));
  h.response = {status: 409, json: {error: 'owner_contract', code: '40001', message: 'listing_images_conflict'}};
  await assert.rejects(h.client.publicationJourneyRequest(actor, 'owner-images-add-append', payload, signal),
    e => e.code === '40001' && e.message === 'listing_images_conflict');
  h.session.data.session.user.id = 'different';
  const before = h.httpCalls.length;
  await assert.rejects(h.client.publicationJourneyRequest(actor, 'image-prepare', payload, signal), /context_changed/);
  assert.equal(h.httpCalls.length, before);
});

test('PUT timing adds no retry and keeps unknown outcome behavior when instrumentation is unavailable', async () => {
  const h = clientHarness(), bytes = new Blob(['exact photo bytes']), signal = new AbortController().signal;
  await h.client.putPublicationPart('https://private.invalid/signed', {'content-type': 'application/octet-stream'}, bytes, signal);
  assert.equal(h.puts.length, 1); assert.equal(h.puts[0].init.body, bytes);
  assert.deepEqual(h.entries.at(-1).detail, {inputBytes: bytes.size});
  assert.ok(!JSON.stringify(h.entries).includes('private'));
  h.failure = true; h.putResponse = {status: 503, redirected: false, body: null};
  await assert.rejects(h.client.putPublicationPart('https://private.invalid/signed', {}, bytes, signal), /outcome_unknown/);
  assert.equal(h.puts.length, 2);
});
