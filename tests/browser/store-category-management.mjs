// Uses the candidate's completed production CSS and real React components in Chromium.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runManagementBrowserCases} from './store-category-management-cases.mjs';

const require = createRequire(import.meta.url), root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(process.env.SELQIRO_BROWSER_OUTPUT || path.join(root, '.store-management-browser-proof'));
const esbuild = require(process.env.SELQIRO_BROWSER_ESBUILD || 'esbuild'), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inventoryPath = process.env.SELQIRO_BUILD_INPUTS || path.join(root, '../store-management-build-inputs.json');
await mkdir(output, {recursive: true});
const mocks = {
  'next/link': `export default function Link({prefetch,scroll,...props}){return <a {...props}/>;}`,
  'src/shared/i18n/V2LanguageProvider.tsx': `import {fixture} from 'selqiro-management-fixture';import {getCatalogTranslation} from '${root}/lib/i18n/useTranslation.ts';
    export const useV2Language=()=>({language:fixture.language});export const useV2Translation=catalog=>({language:fixture.language,t:(key,params)=>getCatalogTranslation(fixture.language,catalog,key,params)});`,
  'src/shared/supabase/browserClient.ts': `import {fixture} from 'selqiro-management-fixture';export const supabaseBrowserClient=fixture.client;`,
  'src/entities/identity/api/getActiveIdentity.ts': `import {fixture} from 'selqiro-management-fixture';export const getActiveIdentity=async()=>fixture.getIdentity();`,
  'src/shared/config/v2Integration.ts': `export const v2IntegrationEnabled=()=>true;export const localPublicationOrigin=()=>false;`,
  'src/features/my-area/components/MyAreaListingsSection.tsx': `export default function Listings(){return <div data-existing-listings-boundary/>;}`,
  'src/features/service-editor/components/MyAreaServicesSection.tsx': `export default function Services(){return <div data-existing-services-boundary/>;}`,
  'src/features/energy-wallet/model/useEnergySummary.ts': `export const useEnergySummary=()=>({wallet:null,loading:false,error:null});`,
  'src/features/product-showcase-management/components/ProductShowcaseManagementCard.tsx': `export default function Showcase(){return <div data-unrelated-showcase/>;}`,
  'src/features/store-category-management/components/StoreCategoryManagementCard.tsx': `export default function Legacy(){return <div data-legacy-management/>;}`,
};
const bundle = await esbuild.build({absWorkingDir: root, entryPoints: [path.join(root, 'tests/browser/store-category-management.jsx')],
  outfile: path.join(output, 'app.js'), bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic', metafile: true,
  // React's development build reports duplicate keys and other component warnings.
  // CSS still comes only from the independently completed Next production build.
  define: {'process.env.NODE_ENV': '"development"', 'process.env': '{}'},
  plugins: [{name: 'bounded-category-boundaries', setup(build) {
    build.onResolve({filter: /.*/}, args => {
      if (args.path === 'selqiro-management-fixture') return {path: path.join(root, 'tests/browser/store-category-management-fixture.jsx')};
      if (Object.hasOwn(mocks, args.path)) return {path: args.path, namespace: 'mock'};
      const stem = args.path.startsWith('@/') ? path.join(root, args.path.slice(2)) : args.path.startsWith('.') ? path.resolve(args.resolveDir, args.path) : args.path;
      for (const suffix of ['', '.ts', '.tsx']) {const relative = path.relative(root, stem + suffix).split(path.sep).join('/');if (Object.hasOwn(mocks, relative)) return {path: relative, namespace: 'mock'};}
    });
    build.onLoad({filter: /.*/, namespace: 'mock'}, args => ({contents: mocks[args.path], loader: 'jsx', resolveDir: root}));
  }}]});
const inputs = [];
for (const name of Object.keys(bundle.metafile.inputs)) if (!name.startsWith('mock:') && !name.startsWith('<') && !name.includes('node_modules/')) inputs.push({path: name, sha256: sha(await readFile(path.resolve(root, name)))});
const harness = [];
for (const name of ['store-category-management.jsx', 'store-category-management-fixture.jsx', 'store-category-management-boundaries.jsx', 'store-category-management-cases.mjs', 'store-category-management.mjs'])
  harness.push({path: 'tests/browser/' + name, sha256: sha(await readFile(path.join(root, 'tests/browser', name)))});
const proof = {schemaVersion: 1, startedAt: new Date().toISOString(), sourceRoot: root, node: process.version,
  boundary: 'Actual Chromium, React DOM, V2MyAreaPage, useMyAreaIdentity, new category management UI/hook/API/parser and legacy category read hook, plus assignment card management link. Synthetic Auth/PostgREST, active-identity presentation and unrelated listing/service/Energy/showcase boundaries; Next Link anchor adapter. No live database, full Next server, real account or production writes.',
  databaseBoundary: 'Management RPC responses and shared relation rows are synthetic here. The exact new SQL is independently exercised by 17 runtime and 18 installation cases in disposable PGlite.',
  reactMode: 'development, to collect duplicate-key and component warnings; unchanged source with fresh production CSS',
  mocks: Object.keys(mocks), inputs, harness, cases: [], failures: [], bundleSha256: sha(await readFile(path.join(output, 'app.js')))};
if (process.argv.includes('--prepare')) {await writeFile(path.join(output, 'prepared.json'), JSON.stringify({...proof, status: 'PREPARED_NOT_RUN'}, null, 2));console.log('PREPARED ' + output);process.exit(0);}
const inventoryBytes = await readFile(inventoryPath), inventory = JSON.parse(inventoryBytes);
const runtimeInputs = inputs.filter(item => /^(src|lib|components|app)\//.test(item.path));
proof.buildAlignment = {inventoryPath, inventorySha256: sha(inventoryBytes), count: runtimeInputs.length,
  mismatches: runtimeInputs.filter(item => inventory[item.path] !== item.sha256).map(item => item.path)};
assert.deepEqual(proof.buildAlignment.mismatches, [], 'Runtime source must match the completed build inventory');
async function files(directory) {const entries = await readdir(directory, {withFileTypes: true});return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();}
const staticRoot = path.join(root, '.next/static'), cssFiles = (await files(staticRoot)).filter(file => file.endsWith('.css'));assert.ok(cssFiles.length);
proof.productionCss = await Promise.all(cssFiles.map(async file => ({path: path.relative(root, file), sha256: sha(await readFile(file))})));
const links = cssFiles.map(file => '<link rel="stylesheet" href="/_next/static/' + path.relative(staticRoot, file) + '">').join('');
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + links + '</head><body><div id="root"></div><script src="/app.js"></script></body></html>';
const js = await readFile(path.join(output, 'app.js'));
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/app.js') {response.setHeader('content-type', 'application/javascript');response.end(js);}
    else if (url.pathname.startsWith('/v2/')) {response.setHeader('content-type', 'text/html');response.end(html);}
    else if (url.pathname.startsWith('/_next/static/')) {
      const file = path.resolve(staticRoot, url.pathname.slice('/_next/static/'.length));assert.ok(file.startsWith(staticRoot + path.sep));
      response.setHeader('content-type', file.endsWith('.css') ? 'text/css' : file.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream');response.end(await readFile(file));
    } else {response.statusCode = 204;response.end();}
  } catch {response.statusCode = 404;response.end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));const origin = 'http://127.0.0.1:' + server.address().port;
const {chromium} = require(process.env.SELQIRO_BROWSER_PLAYWRIGHT || 'playwright');let browser;
try {
  browser = await chromium.launch({headless: true, executablePath: process.env.SELQIRO_BROWSER_EXECUTABLE || undefined, args: ['--disable-dev-shm-usage']});proof.browser = browser.version();
  await runManagementBrowserCases({browser, origin, output, proof});proof.status = 'PASS';
} catch (error) {proof.status = 'FAIL';proof.failures.push({message: error.message, stack: error.stack});console.error(error);process.exitCode = 1;}
finally {
  proof.inputDrift = [];
  for (const item of [...inputs, ...harness]) if (sha(await readFile(path.resolve(root, item.path))) !== item.sha256) proof.inputDrift.push(item.path);
  if (proof.inputDrift.length) {proof.status = 'FAIL';process.exitCode = 1;}
  proof.testCount = proof.cases.length;proof.passed = proof.cases.filter(item => item.status === 'PASS').length;proof.failed = proof.cases.filter(item => item.status === 'FAIL').length;
  proof.finishedAt = new Date().toISOString();await writeFile(path.join(output, 'browser-result.json'), JSON.stringify(proof, null, 2) + '\n');
  await browser?.close();await new Promise(resolve => server.close(resolve));console.log(`${proof.status}: ${proof.passed}/${proof.testCount}; ${output}/browser-result.json`);
}
