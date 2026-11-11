// Uses the candidate's completed production CSS and real React components in Chromium.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runServiceActivityBrowserCases} from './service-activity-cases.mjs';

const require = createRequire(import.meta.url), root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(process.env.SELQIRO_BROWSER_OUTPUT || path.join(root, '.service-activity-browser-proof'));
const esbuild = require(process.env.SELQIRO_BROWSER_ESBUILD || 'esbuild'), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inventoryPath = process.env.SELQIRO_BUILD_INPUTS || path.join(root, '../service-activity-build-inputs.json');
await mkdir(output, {recursive: true});
const mocks = {
  'next/link': `import React from 'react';import {navigate} from 'selqiro-service-activity-fixture';
    export default function Link({href,children,onClick,onNavigate,scroll,replace,prefetch,...props}) {
      return <a {...props} href={href} onClick={event=>{onClick?.(event);if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||props.target==='_blank'||props.download)return;
        let cancelled=false;onNavigate?.({preventDefault(){cancelled=true;}});if(cancelled){event.preventDefault();return;}
        event.preventDefault();navigate(href,{scroll},replace);}}>{children}</a>;
    }`,
  'next/navigation': `import {fixture} from 'selqiro-service-activity-fixture';export const useRouter=()=>fixture.router;`,
  'src/shared/i18n/V2LanguageProvider.tsx': `import {fixture} from 'selqiro-service-activity-fixture';import {getCatalogTranslation} from '${root}/lib/i18n/useTranslation.ts';
    export const useV2Language=()=>({language:fixture.language});export const useV2Translation=catalog=>({language:fixture.language,t:(key,params)=>getCatalogTranslation(fixture.language,catalog,key,params)});`,
  'src/shared/supabase/browserClient.ts': `import {fixture} from 'selqiro-service-activity-fixture';export const supabaseBrowserClient=fixture.client;`,
  'src/shared/config/v2Integration.ts': `export const v2IntegrationEnabled=()=>true;export const v2NavigationContextEnabled=()=>true;export const localPublicationOrigin=()=>undefined;`,
  'src/entities/listing/api/getListingActivityActor.ts': `import {fixture} from 'selqiro-service-activity-fixture';export const getListingActivityActor=fixture.getActor;`,
  'src/entities/listing/api/privateUploadHttp.ts': `import {fixture} from 'selqiro-service-activity-fixture';export const privateUploadHttp=fixture.privateHttp;`,
  'src/entities/service/api/serviceOwnerPageHttp.ts': `import {fixture} from 'selqiro-service-activity-fixture';export const serviceOwnerPageHttp=fixture.privateHttp;`,
  'src/features/service-editor/model/useServicePublication.ts': `import {fixture} from 'selqiro-service-activity-fixture';export const useServicePublication=(_actor,_service,active)=>({...fixture.publication,session:active?fixture.publication.session:null});`,
  'src/features/service-editor/model/useServicePolicy.ts': `import {fixture} from 'selqiro-service-activity-fixture';export const useServicePolicy=()=>fixture.policy;`,
  'src/features/service-editor/components/ServicePolicyGate.tsx': `export default function Gate(){return <section data-test-policy-boundary>Existing policy workflow boundary</section>;}`,
  'src/entities/service-category/api/getServiceCategories.ts': `import {fixture} from 'selqiro-service-activity-fixture';export const getServiceCategories=fixture.readCategories;`,
  'src/features/service-detail/components/ServiceContactButton.tsx': `export default function Contact(){return <span>Contact boundary</span>;}`,
};
const bundle = await esbuild.build({absWorkingDir: root, entryPoints: [path.join(root, 'tests/browser/service-activity.jsx')],
  outfile: path.join(output, 'app.js'), bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic', metafile: true,
  // React's development build reports duplicate keys and other component warnings.
  // CSS still comes only from the independently completed Next production build.
  define: {'process.env.NODE_ENV': '"development"', 'process.env': '{}'},
  plugins: [{name: 'bounded-service-activity-boundaries', setup(build) {
    build.onResolve({filter: /.*/}, args => {
      if (args.path === 'selqiro-service-activity-fixture') return {path: path.join(root, 'tests/browser/service-activity-fixture.jsx')};
      if (Object.hasOwn(mocks, args.path)) return {path: args.path, namespace: 'mock'};
      const stem = args.path.startsWith('@/') ? path.join(root, args.path.slice(2)) : args.path.startsWith('.') ? path.resolve(args.resolveDir, args.path) : args.path;
      for (const suffix of ['', '.ts', '.tsx']) {const relative = path.relative(root, stem + suffix).split(path.sep).join('/');if (Object.hasOwn(mocks, relative)) return {path: relative, namespace: 'mock'};}
    });
    build.onLoad({filter: /.*/, namespace: 'mock'}, args => ({contents: mocks[args.path], loader: 'jsx', resolveDir: root}));
  }}]});
const inputs = [];
for (const name of Object.keys(bundle.metafile.inputs)) if (!name.startsWith('mock:') && !name.startsWith('<') && !name.includes('node_modules/')) inputs.push({path: name, sha256: sha(await readFile(path.resolve(root, name)))});
const harness = [];
for (const name of ['service-activity.jsx', 'service-activity-fixture.jsx', 'service-activity-cases.mjs', 'service-activity.mjs'])
  harness.push({path: 'tests/browser/' + name, sha256: sha(await readFile(path.join(root, 'tests/browser', name)))});
const proof = {schemaVersion: 1, startedAt: new Date().toISOString(), sourceRoot: root, node: process.version,
  boundary: 'Actual Chromium, React DOM, MyAreaServicesSection/useMyServicePublications, ServiceEditor/useServiceOwnerContext, service activity controller/hook/API/parser and EN/ET catalog. Synthetic authenticated HTTP/Auth/PostgREST plus isolated publication controller/policy and documented Link/router boundary. Actual production CSS. No live database, full Next server, uploaded photo or production writes.',
  publicFilterBoundary: 'Expiry visibility, counts, profile categories, detail/contact/media and preservation are separately covered by additive PostgreSQL-WASM tests.',
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
  await runServiceActivityBrowserCases({browser, origin, output, proof});proof.status = 'PASS';
} catch (error) {proof.status = 'FAIL';proof.failures.push({message: error.message, stack: error.stack});console.error(error);process.exitCode = 1;}
finally {
  proof.inputDrift = [];
  for (const item of [...inputs, ...harness]) if (sha(await readFile(path.resolve(root, item.path))) !== item.sha256) proof.inputDrift.push(item.path);
  if (proof.inputDrift.length) {proof.status = 'FAIL';process.exitCode = 1;}
  proof.testCount = proof.cases.length;proof.passed = proof.cases.filter(item => item.status === 'PASS').length;proof.failed = proof.cases.filter(item => item.status === 'FAIL').length;
  proof.finishedAt = new Date().toISOString();await writeFile(path.join(output, 'browser-result.json'), JSON.stringify(proof, null, 2) + '\n');
  await browser?.close();await new Promise(resolve => server.close(resolve));console.log(`${proof.status}: ${proof.passed}/${proof.testCount}; ${output}/browser-result.json`);
}
