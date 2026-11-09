// Focused real Chromium tests. Run after the candidate production build; no install.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile, writeFile, mkdir, readdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {createServer} from "node:http";
import {runNavigationCases} from "./service-navigation-cases.mjs";

const require = createRequire(import.meta.url), harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const root = path.resolve(process.env.SELQIRO_NAV_SOURCE_ROOT || harnessRoot);
const cssRoot = path.resolve(process.env.SELQIRO_NAV_CSS_ROOT || root);
const output = path.resolve(process.env.SELQIRO_BROWSER_OUTPUT || path.join(harnessRoot, ".service-navigation-proof"));
const baseline = process.argv.includes("--baseline"), prepareOnly = process.argv.includes("--prepare");
const esbuild = require(process.env.SELQIRO_BROWSER_ESBUILD || "esbuild"), sha = bytes => createHash("sha256").update(bytes).digest("hex");
await mkdir(output, {recursive: true});
const fixturePath = path.join(harnessRoot, "tests/browser/service-navigation-fixture.jsx");
const mockSources = {
  "next/link": `import React from 'react';import {navigate} from 'selqiro-service-fixture';
    export default function Link({href,children,onClick,onNavigate,scroll,replace,prefetch,...props}) {
      return <a {...props} href={href} onClick={event=>{onClick?.(event);if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||props.target==='_blank'||props.download)return;
        let cancelled=false;onNavigate?.({preventDefault(){cancelled=true;}});if(cancelled){event.preventDefault();return;}
        event.preventDefault();navigate(href,{scroll},replace);}}>{children}</a>;
    }`,
  "next/navigation": `import {useSyncExternalStore} from 'react';import {fixture,locationSnapshot,subscribeLocation} from 'selqiro-service-fixture';
    export const useRouter=()=>fixture.router;export const usePathname=()=>new URL(useSyncExternalStore(subscribeLocation,locationSnapshot,locationSnapshot),location.origin).pathname;
    export const useSearchParams=()=>new URLSearchParams(new URL(useSyncExternalStore(subscribeLocation,locationSnapshot,locationSnapshot),location.origin).search);`,
  "src/shared/i18n/V2LanguageProvider.tsx": `import {fixture} from 'selqiro-service-fixture';import {getCatalogTranslation} from '${root}/lib/i18n/useTranslation.ts';
    export const useV2Language=()=>({language:fixture.language});export const useV2Translation=catalog=>({language:fixture.language,t:(key,params)=>getCatalogTranslation(fixture.language,catalog,key,params)});`,
  "src/shared/config/v2Integration.ts": `export const v2IntegrationEnabled=()=>true;export const v2NavigationContextEnabled=()=>true;`,
  "src/shared/supabase/browserClient.ts": `import {fixture} from 'selqiro-service-fixture';export const supabaseBrowserClient={rpc:(name,args)=>fixture.rpc(name,args)};`,
  "src/entities/profile/api/getPublicProfileBySlug.ts": `import {fixture} from 'selqiro-service-fixture';export const getPublicProfileBySlug=slug=>fixture.readProfile(slug);`,
  "src/entities/service-category/api/getServiceCategories.ts": `import {fixture} from 'selqiro-service-fixture';export const getServiceCategories=()=>fixture.readCategories();`,
  "src/entities/store-category/api/getPublicStoreCategories.ts": `import {fixture} from 'selqiro-service-fixture';export const getPublicStoreCategories=()=>fixture.readStoreCategories();`,
  "src/entities/listing/api/getPublicProfileMarketplace.ts": `import {fixture} from 'selqiro-service-fixture';export const getPublicProfileMarketplace=()=>fixture.readMarketplace();`,
  "src/features/public-profile/components/PublicProfileProductShowcasesSection.tsx": `import {useEffect,useState} from 'react';import {fixture} from 'selqiro-service-fixture';
    export default function Showcases(){const [height,setHeight]=useState(180);useEffect(()=>{if(!window.__testGrow||fixture.profileReads<2)return;const timer=setTimeout(()=>setHeight(360),400);return()=>clearTimeout(timer);},[]);
      return window.__testGrow?<div data-test-late-layout style={{height}}>Synthetic delayed upper section</div>:null;}`,
  "src/features/service-detail/components/ServiceContactButton.tsx": `export default function Contact(){return <span>Contact boundary</span>;}`,
};
const built = await esbuild.build({absWorkingDir: root, entryPoints: [path.join(harnessRoot, "tests/browser/service-navigation.jsx")],
  nodePaths: [path.join(harnessRoot, "node_modules")],
  outfile: path.join(output, "app.js"), bundle: true, platform: "browser", format: "iife", jsx: "automatic", metafile: true,
  define: {"process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_SUPABASE_URL": '"https://abcdefghijklmnopqrst.supabase.co"'},
  plugins: [{name: "bounded-service-read-and-router-adapter", setup(build) {
    build.onResolve({filter: /.*/}, args => {
      if (args.path === "selqiro-service-fixture") return {path: fixturePath, namespace: "fixture"};
      if (args.path.startsWith("selqiro-app/")) return {path: path.join(root, args.path.slice("selqiro-app/".length))};
      if (Object.hasOwn(mockSources, args.path)) return {path: args.path, namespace: "mock"};
      const candidate = args.path.startsWith("@/") ? path.join(root, args.path.slice(2))
        : args.path.startsWith(".") ? path.resolve(args.resolveDir, args.path) : args.path;
      for (const suffix of ["", ".ts", ".tsx"]) {
        const relative = path.relative(root, candidate + suffix).split(path.sep).join("/");
        if (Object.hasOwn(mockSources, relative)) return {path: relative, namespace: "mock"};
      }
    });
    build.onLoad({filter: /.*/, namespace: "fixture"}, async () => ({contents: await readFile(fixturePath, "utf8"), loader: "jsx", resolveDir: harnessRoot}));
    build.onLoad({filter: /.*/, namespace: "mock"}, args => ({contents: mockSources[args.path], loader: "jsx", resolveDir: root}));
  }}]});
const inputs = [];
for (const input of Object.keys(built.metafile.inputs)) {
  const file = path.resolve(root, input);
  if (!input.startsWith("mock:") && !input.startsWith("fixture:") && !file.includes(`${path.sep}node_modules${path.sep}`))
    inputs.push({path: path.relative(root, file), sha256: sha(await readFile(file))});
}
const proof = {schemaVersion: 1, startedAt: new Date().toISOString(), baseline, node: process.version, sourceRoot: root,
  boundary: "Real Chromium, history Back/Forward, DOM geometry, actual React components/hooks/service API parsers; bounded synthetic RPC reads, unrelated profile/category/contact API boundaries and a documented Next Link/router history adapter. No Next server, live database or production access.",
  manualBrowserScroll: "history.scrollRestoration=manual; route mount starts at top; overflow-anchor:none disables native layout anchoring. Only app restoration can pass.",
  mocks: Object.keys(mockSources), inputs, harness: [], cases: [], networkRequests: [], failures: [], bundleSha256: sha(await readFile(path.join(output, "app.js")))};
for (const name of ["service-navigation.jsx", "service-navigation-fixture.jsx", "service-navigation.mjs", "service-navigation-cases.mjs"])
  proof.harness.push({path: `tests/browser/${name}`, sha256: sha(await readFile(path.join(harnessRoot, "tests/browser", name)))});
if (prepareOnly) {await writeFile(path.join(output, "prepared.json"), JSON.stringify({...proof, status: "PREPARED_NOT_RUN"}, null, 2));console.log(`PREPARED ${output}`);process.exit(0);}
async function files(dir) {const children = await readdir(dir, {withFileTypes: true});return (await Promise.all(children.map(child => child.isDirectory() ? files(path.join(dir, child.name)) : path.join(dir, child.name)))).flat();}
const cssFiles = (await files(path.join(cssRoot, ".next/static"))).filter(file => file.endsWith(".css"));
assert.ok(cssFiles.length, "A production build must supply real CSS");
const cssParts = await Promise.all(cssFiles.map(file => readFile(file)));
proof.productionCss = cssFiles.map((file, i) => ({path: path.relative(cssRoot, file), sha256: sha(cssParts[i])}));
proof.cssSourceRoot = cssRoot;
const css = Buffer.concat(cssParts), js = await readFile(path.join(output, "app.js"));
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>html,body{overflow-anchor:none}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
const server = createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/app.js") {response.setHeader("content-type", "application/javascript");response.end(js);}
  else if (url.pathname === "/app.css") {response.setHeader("content-type", "text/css");response.end(css);}
  else if (url.pathname.startsWith("/v2/")) {response.setHeader("content-type", "text/html");response.end(html);}
  else {response.statusCode = 404;response.end();}
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const {chromium} = require(process.env.SELQIRO_BROWSER_PLAYWRIGHT || "playwright");
let browser;
try {
  browser = await chromium.launch({headless: true, executablePath: process.env.SELQIRO_BROWSER_EXECUTABLE || undefined, args: ["--disable-dev-shm-usage"]});
  proof.browser = browser.version();
  await runNavigationCases({browser, origin, output, proof, baseline});
  proof.status = baseline ? "EXPECTED_FAILURES_REPRODUCED" : "PASS";
} catch (error) {proof.status = "FAIL";proof.failures.push({message: error.message, stack: error.stack});console.error(error);process.exitCode = 1;}
finally {
  // Bind final proof to unchanged inputs; a concurrent source edit invalidates it.
  proof.inputDrift = [];
  for (const item of inputs) if (sha(await readFile(path.resolve(root, item.path))) !== item.sha256) proof.inputDrift.push(item.path);
  if (proof.inputDrift.length) {proof.status = "FAIL";process.exitCode = 1;}
  proof.finishedAt = new Date().toISOString();await writeFile(path.join(output, "browser-result.json"), JSON.stringify(proof, null, 2));
  await browser?.close();await new Promise(resolve => server.close(resolve));
  console.log(`${proof.status}: ${proof.cases.length} cases; ${output}/browser-result.json`);
}
