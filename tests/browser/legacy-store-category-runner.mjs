import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(process.env.SELQIRO_BROWSER_OUTPUT || path.join(root, '.legacy-store-browser-proof'));
const inventoryPath = process.env.SELQIRO_BUILD_INPUTS;
assert.ok(inventoryPath, 'A successful fresh build inventory is required before the browser test');
const { handlerSource } = require('../legacy-store-category-handler-source.cjs');
const esbuild = require(process.env.SELQIRO_BROWSER_ESBUILD || 'esbuild');
const { chromium } = require(process.env.SELQIRO_BROWSER_PLAYWRIGHT || 'playwright');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const handlerFiles = { create: 'app/sell/page.tsx', edit: 'app/my-page/page.tsx' };
const handlers = {}, inputs = [];
for (const [kind, file] of Object.entries(handlerFiles)) {
  const source = await readFile(path.join(root, file));
  handlers[kind] = handlerSource(source.toString(), file, kind === 'create' ? 'createListing' : 'saveEdit');
  inputs.push({ path: file, sha256: sha(source) });
}
await mkdir(output, { recursive: true });
const entryPath = path.join(root, 'tests/browser/legacy-store-category-selection.mjs');
const fixturePath = path.join(root, 'tests/browser/legacy-store-category-browser-fixture.mjs');
const bundle = await esbuild.build({
  absWorkingDir: root, entryPoints: [entryPath], outfile: path.join(output, 'app.js'),
  bundle: true, format: 'iife', platform: 'browser', metafile: true,
  plugins: [{ name: 'bounded-legacy-save-boundaries', setup(build) {
    build.onResolve({ filter: /.*/ }, args => {
      if (args.path === 'selqiro-legacy-handler-sources') return { path: args.path, namespace: 'fixture' };
      const stem = args.path.startsWith('.') ? path.resolve(args.resolveDir, args.path) : args.path;
      if ([path.join(root, 'src/shared/supabase/browserClient'), path.join(root, 'src/shared/supabase/browserClient.ts')].includes(stem)) {
        return { path: 'supabase-browser-boundary', namespace: 'fixture' };
      }
    });
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({
      contents: args.path === 'selqiro-legacy-handler-sources' ? `export const handlers=${JSON.stringify(handlers)};`
        : `import {fixture} from ${JSON.stringify(fixturePath)}; export const supabaseBrowserClient=fixture.client;`,
      loader: 'js', resolveDir: root,
    }));
  } }],
});
for (const file of Object.keys(bundle.metafile.inputs)) {
  if (!file.startsWith('fixture:') && !file.startsWith('<') && !file.includes('node_modules/')) inputs.push({ path: file, sha256: sha(await readFile(path.resolve(root, file))) });
}
const harness = [];
for (const file of ['tests/browser/legacy-store-category-runner.mjs', 'tests/legacy-store-category-handler-source.cjs']) {
  harness.push({ path: file, sha256: sha(await readFile(path.join(root, file))) });
}
const inventoryBytes = await readFile(inventoryPath), inventory = JSON.parse(inventoryBytes);
const runtime = inputs.filter(item => /^(app|src|lib)\//.test(item.path));
const mismatches = runtime.filter(item => inventory[item.path] !== item.sha256).map(item => item.path);
assert.deepEqual(mismatches, [], 'Browser runtime and actual handler source must equal the completed build inputs');
const proof = {
  schemaVersion: 1, startedAt: new Date().toISOString(), sourceRoot: root, node: process.version,
  boundary: 'Actual Chromium events and native alert dialogs executing candidate createListing/saveEdit handler bodies, new legacy adapter/notices and retained managed API/parser. Auth/PostgREST, surrounding form/basic/image/AI operations and navigation destinations are synthetic. This is not a full Next/legacy page layout or live service test.',
  buildAlignment: { inventoryPath, inventorySha256: sha(inventoryBytes), count: runtime.length, mismatches },
  inputs, harness, cases: [], failures: [], bundleSha256: sha(await readFile(path.join(output, 'app.js'))),
};
const js = await readFile(path.join(output, 'app.js'));
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main><h1>Legacy category-save verification</h1><button>Save existing form</button><p role="alert"></p><p role="status">Ready</p></main><script src="/app.js"></script></body></html>';
const server = createServer((request, response) => {
  if (new URL(request.url, 'http://localhost').pathname === '/app.js') { response.setHeader('content-type', 'application/javascript'); response.end(js); }
  else { response.setHeader('content-type', 'text/html'); response.end(html); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.SELQIRO_BROWSER_EXECUTABLE || undefined, args: ['--disable-dev-shm-usage'] });
  proof.browser = browser.version();
  const cases = [
    ['create', 'saved', 'en'], ['create', 'rejected', 'et'], ['create', 'unknown', 'en'],
    ['edit', 'saved', 'et'], ['edit', 'rejected', 'en'], ['edit', 'unknown', 'et'], ['edit', 'identity_changed', 'en'],
  ];
  for (const [kind, outcome, language] of cases) {
    const name = `${kind}/${outcome}/${language}`, page = await browser.newPage();
    const errors = [], dialogs = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
    try {
      await page.goto(`${origin}/?kind=${kind}&outcome=${outcome}&language=${language}`);
      await page.getByRole('button', { name: 'Save existing form' }).click();
      await page.waitForFunction(() => document.documentElement.dataset.finished === 'yes');
      const observed = await page.evaluate(() => {
        const { fixture, ctx } = window.legacyStoreProof;
        return { events: ctx.events, calls: fixture.state.calls.filter(call => call.name === 'set_my_listing_store_categories_v2').length,
          writes: fixture.state.writes.length, categories: fixture.state.assignments.get('1001') };
      });
      const named = name => observed.events.filter(event => event.name === name);
      assert.deepEqual(errors, []); assert.equal(named('photos.saved').length, 1);
      assert.equal(named('console.error').length, 0); assert.equal(observed.calls, outcome === 'identity_changed' ? 0 : 1);
      assert.equal(observed.writes, ['saved', 'unknown'].includes(outcome) ? 1 : 0);
      if (kind === 'create') assert.equal(named('listings.insert').length, 1);
      else assert.equal(named('listings.update').length, 1);
      if (outcome === 'saved') {
        assert.equal(dialogs.length, 0);
        if (kind === 'create') assert.equal(named('navigate')[0].value, '/my-page');
        else { assert.equal(named('editor.closed').length, 1); assert.equal(named('list.refreshed').length, 1); }
      } else {
        assert.equal(dialogs.length, 1); assert.equal(named('navigate')[0].value, '/v2/my-area/listings/1001/store-categories');
        assert.match(dialogs[0], language === 'et' ? /Kuulutus on salvestatud/ : /listing has been saved/);
        if (outcome === 'unknown') assert.match(dialogs[0], language === 'et' ? /ei saanud kinnitada/ : /could not be confirmed/);
        assert.equal(await page.getByRole('alert').textContent(), dialogs[0]);
      }
      proof.cases.push({ name, status: 'PASS', observed, dialogs });
    } catch (error) { proof.cases.push({ name, status: 'FAIL', error: error.stack }); throw error; }
    finally { await page.close(); }
  }
  proof.status = 'PASS';
} catch (error) { proof.status = 'FAIL'; proof.failures.push({ message: error.message, stack: error.stack }); process.exitCode = 1; }
finally {
  proof.inputDrift = [];
  for (const item of [...inputs, ...harness]) if (sha(await readFile(path.resolve(root, item.path))) !== item.sha256) proof.inputDrift.push(item.path);
  if (proof.inputDrift.length) { proof.status = 'FAIL'; process.exitCode = 1; }
  proof.testCount = proof.cases.length; proof.passed = proof.cases.filter(item => item.status === 'PASS').length;
  proof.finishedAt = new Date().toISOString();
  await writeFile(path.join(output, 'browser-result.json'), JSON.stringify(proof, null, 2) + '\n');
  await browser?.close(); await new Promise(resolve => server.close(resolve));
  console.log(`${proof.status}: ${proof.passed}/${proof.testCount}; ${output}/browser-result.json`);
}
