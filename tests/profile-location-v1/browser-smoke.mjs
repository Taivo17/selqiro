// Real Chromium + actual profile editor/v2 hook/session/client. Network and actor boundaries are synthetic.
import assert from "node:assert/strict";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {readFile, writeFile, mkdir, readdir, stat} from "node:fs/promises";
import {createHash} from "node:crypto";
import {createServer} from "node:http";

const require = createRequire(import.meta.url), root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const output = path.resolve(process.env.SELQIRO_LOCATION_BROWSER_OUTPUT || path.join(root, "../ui-browser-proof"));
const cssRoot = path.resolve(process.env.SELQIRO_LOCATION_CSS_ROOT || root), sha = value => createHash("sha256").update(value).digest("hex");
const fixture = path.join(root, "tests/profile-location-v1/browser-fixture.jsx");
const webpack = require("next/dist/compiled/webpack/webpack").webpack;
await mkdir(output, {recursive: true});
const loaderPath = path.join(output, "typescript-loader.cjs");
await writeFile(loaderPath, `const ts=require(${JSON.stringify(require.resolve("typescript"))});module.exports=function(source){return ts.transpileModule(source,{fileName:this.resourcePath,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
const mockSources = {
  "next/link": `import React from 'react';export default function Link({href,children,prefetch,...props}){return <a href={href} {...props}>{children}</a>;}`,
  "src/shared/i18n/V2LanguageProvider.tsx": `import {fixture} from ${JSON.stringify(fixture)};import {getCatalogTranslation} from ${JSON.stringify(path.join(root,"lib/i18n/useTranslation.ts"))};export const useV2Translation=catalog=>({language:fixture.language,t:(key,params)=>getCatalogTranslation(fixture.language,catalog,key,params)});`,
  "src/features/listing-conversation/model/useConversationActor.ts": `export {useFixtureActor as useConversationActor} from ${JSON.stringify(fixture)};`,
  "src/shared/supabase/browserClient.ts": `import {fixture} from ${JSON.stringify(fixture)};export const supabaseBrowserClient={rpc:(...args)=>fixture.rpc(...args)};`,
  "src/features/v2-shell/model/identityEvents.ts": `import {fixture} from ${JSON.stringify(fixture)};export const notifyIdentityResolutionNeeded=()=>{fixture.acknowledged++;};`,
  "src/features/profile-media/model/useProfileMediaEditor.ts": `export const useProfileMediaEditor=()=>({view:null});`,
  "src/features/profile-media/components/ProfileMediaEditor.tsx": `export default function MediaBoundary(){return null;}`,
};
const mocks = new Map();
for (const [index, [key, contents]] of Object.entries(mockSources).entries()) {
  const file = path.join(output, `mock-${index}.jsx`); await writeFile(file, contents); mocks.set(key, file);
}
const proof = {format: "selqiro-profile-location-browser-smoke-v1", started_at: new Date().toISOString(),
  boundary: "Actual React ProfileEditorPage, v2 hook, session, client and shared picker in Chromium. Synthetic actor/RPC/HTTP fixtures; unrelated profile media omitted. No Next server, provider, live account, DB, storage or production request.",
  source_root: root, mocks: Object.keys(mockSources), cases: [], failures: [], inputs: [], screenshots: []};
const compiler = webpack({mode: "production", target: "web", context: root, entry: fixture,
  output: {path: output, filename: "app.js"}, optimization: {minimize: false},
  resolve: {extensions: [".tsx", ".ts", ".jsx", ".js"], modules: [path.join(root, "node_modules"), "node_modules"]},
  module: {rules: [{test: /\.(?:tsx?|jsx)$/, exclude: /node_modules/, use: [{loader: loaderPath}]}]},
  plugins: [new webpack.NormalModuleReplacementPlugin(/.*/, resource => {
    if (mocks.has(resource.request)) {resource.request = mocks.get(resource.request);return;}
    const candidate = resource.request.startsWith("@/") ? path.join(root, resource.request.slice(2))
      : resource.request.startsWith(".") ? path.resolve(resource.context, resource.request) : resource.request;
    for (const suffix of ["", ".ts", ".tsx"]) {
      const relative = path.relative(root, candidate + suffix).split(path.sep).join("/");
      if (mocks.has(relative)) {resource.request = mocks.get(relative);return;}
    }
  })],
});
const stats = await new Promise((resolve, reject) => compiler.run((error, result) => error ? reject(error) : resolve(result)));
await new Promise((resolve, reject) => compiler.close(error => error ? reject(error) : resolve()));
if (stats.hasErrors()) throw Error(stats.toString({all: false, errors: true}));
for (const file of stats.compilation.fileDependencies) {
  if (file.startsWith(root + path.sep) && !file.includes(`${path.sep}node_modules${path.sep}`) && (await stat(file)).isFile())
    proof.inputs.push({path: path.relative(root, file), sha256: sha(await readFile(file))});
}
proof.harness = await Promise.all(["browser-smoke.mjs", "browser-fixture.jsx"].map(async name => ({path: `tests/profile-location-v1/${name}`,
  sha256: sha(await readFile(path.join(root, "tests/profile-location-v1", name)))})));
async function files(dir) {return (await Promise.all((await readdir(dir, {withFileTypes: true})).map(item => item.isDirectory()
  ? files(path.join(dir, item.name)) : path.join(dir, item.name)))).flat();}
const cssFiles = (await files(path.join(cssRoot, ".next/static"))).filter(file => file.endsWith(".css"));
assert.ok(cssFiles.length, "The candidate production build must supply CSS.");
const cssParts = await Promise.all(cssFiles.map(file => readFile(file)));
proof.css = cssFiles.map((file, index) => ({path: path.relative(cssRoot, file), sha256: sha(cssParts[index])}));
const js = await readFile(path.join(output, "app.js")), css = Buffer.concat(cssParts); proof.bundle_sha256 = sha(js);
const html = '<!doctype html><html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
const server = createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/app.js") {response.setHeader("content-type", "application/javascript");response.end(js);}
  else if (url.pathname === "/app.css") {response.setHeader("content-type", "text/css");response.end(css);}
  else if (url.pathname === "/") {response.setHeader("content-type", "text/html");response.end(html);}
  else {response.statusCode = 404;response.end();}
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`, {chromium} = require("playwright");
let browser;
const country = page => page.getByRole("combobox", {name: "Riik", exact: true});
const city = page => page.getByRole("combobox", {name: "Linn või piirkond", exact: true});
const save = page => page.getByRole("button", {name: "Salvesta muudatused", exact: true});
async function ready(page, extra = "") {await page.goto(origin + "/" + extra);await page.getByRole("heading", {name: "Sinu avalik profiil", exact: true}).waitFor();
  await page.waitForFunction(() => !!window.__profileLocation && [...document.querySelectorAll('[role="combobox"]')].length === 2);}
async function chooseCountry(page, name) {await country(page).fill(name);await page.getByRole("option", {name: new RegExp(name)}).first().waitFor();
  await country(page).press("ArrowDown");await country(page).press("Enter");}
async function choosePlace(page, query, name = query) {await city(page).fill(query);await page.getByRole("option", {name: new RegExp(name)}).waitFor();
  await city(page).press("ArrowDown");await city(page).press("Enter");}
async function selectPaide(page) {await chooseCountry(page, "Eesti");await choosePlace(page, "Paide");}
async function saveCount(page, count) {await page.waitForFunction(value => window.__profileLocation.saves.length === value, count);}
try {
  browser = await chromium.launch({headless: true, executablePath: process.env.SELQIRO_BROWSER_EXECUTABLE || undefined, args: ["--disable-dev-shm-usage"]}); proof.browser = browser.version();
  const context = await browser.newContext({viewport: {width: 1280, height: 1000}}), page = await context.newPage();
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await ready(page); await page.waitForTimeout(450);
  assert.equal(await page.evaluate(() => window.__profileLocation.requests.length), 0);
  assert.equal(await page.getByLabel("Ettevõtte aadress", {exact: false}).count(), 0);
  await selectPaide(page);await save(page).click();await saveCount(page, 1);
  const first = await page.evaluate(() => ({save: window.__profileLocation.saves[0], saved: window.__profileLocation.saved}));
  assert.deepEqual(Object.keys(first.save.location).sort(), ["action", "proof"]);
  assert.equal(first.save.patch.country, "Estonia");assert.equal(first.save.patch.city, "Paide");assert.equal(first.saved.location.country_code, "EE");
  proof.cases.push({name: "private legacy -> keyboard EE/Paide -> one atomic Save", requests: 1, location_fields: Object.keys(first.save.location)});

  await page.getByLabel("Kirjeldus", {exact: true}).fill("See kirjeldus jääb alles.");
  await page.getByRole("button", {name: "Eemalda asukoht", exact: true}).click();
  assert.equal(await country(page).inputValue(), "");assert.equal(await city(page).inputValue(), "");
  await page.getByRole("button", {name: "Taasta salvestatud asukoht", exact: true}).click();
  assert.equal(await city(page).inputValue(), "Paide");assert.equal(await page.getByLabel("Kirjeldus", {exact: true}).inputValue(), "See kirjeldus jääb alles.");
  await page.getByRole("button", {name: "Eemalda asukoht", exact: true}).click();await save(page).click();await saveCount(page, 2);
  const cleared = await page.evaluate(() => window.__profileLocation.saves[1]);
  assert.deepEqual(cleared.location, {action: "clear"});assert.equal(cleared.patch.country, "");assert.equal(cleared.patch.city, "");
  proof.cases.push({name: "remove/restore retains other draft fields; explicit clear saves empty location"});

  await ready(page); await page.evaluate(() => {window.__profileLocation.slowEE = true;});
  await chooseCountry(page, "Eesti");await city(page).fill("Paide");
  await page.waitForFunction(() => window.__profileLocation.requests.some(value => value.body.country_code === "EE"));
  await country(page).fill("Soome");assert.equal(await city(page).inputValue(), "");
  await save(page).click();assert.equal(await page.evaluate(() => window.__profileLocation.saves.length), 0);
  await chooseCountry(page, "Soome");await choosePlace(page, "Helsinki");await page.waitForTimeout(1300);
  assert.equal(await city(page).inputValue(), "Helsinki");assert.equal(await page.getByRole("option", {name: /Paide/}).count(), 0);
  await save(page).click();await saveCount(page, 1);
  assert.equal(await page.evaluate(() => window.__profileLocation.saved.location.country_code), "FI");
  proof.cases.push({name: "country edit drops proof/options, blocks incomplete Save, ignores late EE response under FI"});

  await ready(page);await chooseCountry(page, "Jaapan");
  await city(page).dispatchEvent("compositionstart", {data: "東"});await city(page).fill("東京");await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => window.__profileLocation.requests.length), 0);
  await city(page).dispatchEvent("compositionend", {data: "東京"});await page.getByRole("option", {name: /東京/}).waitFor();
  await city(page).press("ArrowDown");await city(page).press("Enter");await save(page).click();await saveCount(page, 1);
  assert.equal(await page.evaluate(() => window.__profileLocation.saved.location.place_name), "東京");
  proof.cases.push({name: "IME composition suppresses requests; Unicode 東京 can be selected and saved"});

  await ready(page, "?kind=business");await chooseCountry(page, "Soome");await choosePlace(page, "Helsinki");
  assert.equal(await page.getByLabel("Ettevõtte aadress", {exact: false}).inputValue(), "");
  assert.equal(await page.getByLabel("Asukoha nähtavus", {exact: true}).inputValue(), "city");
  proof.cases.push({name: "business locality change clears old street and resets exact publication"});

  await ready(page);await page.evaluate(() => {window.__profileLocation.slowEE = true;});await chooseCountry(page, "Eesti");await city(page).fill("Paide");
  await page.waitForFunction(() => window.__profileLocation.requests.some(value => value.body.country_code === "EE"));
  await page.evaluate(() => window.__profileLocation.switchActor());
  await page.getByText("Teine profiil", {exact: true}).waitFor();await page.waitForTimeout(1300);
  assert.equal(await city(page).inputValue(), "Helsinki");assert.equal(await page.getByRole("option", {name: /Paide/}).count(), 0);
  assert.equal(await page.evaluate(() => window.__profileLocation.saves.length), 0);
  proof.cases.push({name: "active identity switch retires old request and draft before late response"});

  await page.setViewportSize({width: 390, height: 844});await ready(page);await selectPaide(page);
  const overflow = await page.evaluate(() => ({scrollWidth: document.documentElement.scrollWidth, innerWidth,
    combos: [...document.querySelectorAll('[role="combobox"]')].map(element => ({width: element.getBoundingClientRect().width, left: element.getBoundingClientRect().left}))}));
  assert.ok(overflow.scrollWidth <= overflow.innerWidth + 1, "Mobile page has horizontal overflow");
  await country(page).scrollIntoViewIfNeeded(); const mobilePath = path.join(output, "profile-location-mobile.png");await page.screenshot({path: mobilePath, fullPage: true});
  proof.screenshots.push({file: path.basename(mobilePath), sha256: sha(await readFile(mobilePath))});
  proof.cases.push({name: "390px mobile layout retains visible controls without horizontal overflow", geometry: overflow});
  await page.setViewportSize({width: 1280, height: 1000});await ready(page);await selectPaide(page);
  const desktopPath = path.join(output, "profile-location-desktop.png");await page.screenshot({path: desktopPath, fullPage: true});
  proof.screenshots.push({file: path.basename(desktopPath), sha256: sha(await readFile(desktopPath))});
  assert.deepEqual(errors, [], "Browser JavaScript errors"); proof.status = "PASS";await context.close();
} catch (error) {proof.status = browser ? "FAIL" : "BROWSER_NOT_EXECUTED";proof.failures.push({message: error.message, stack: error.stack});process.exitCode = 1;}
finally {
  proof.input_drift = [];
  for (const input of proof.inputs) if (sha(await readFile(path.join(root, input.path))) !== input.sha256) proof.input_drift.push(input.path);
  if (proof.input_drift.length) {proof.status = "FAIL";process.exitCode = 1;}
  proof.finished_at = new Date().toISOString();await writeFile(path.join(output, "browser-result.json"), JSON.stringify(proof, null, 2));
  await browser?.close();await new Promise(resolve => server.close(resolve));
  console.log(`${proof.status}: ${proof.cases.length} cases; ${path.join(output,"browser-result.json")}`);
}
