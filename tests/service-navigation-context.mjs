// Focused service return-contract tests with an isolated browser history per case.
// No database, uploads, remote connections, dependency installation or app edits.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile, mkdir, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const esbuild = require(process.env.SELQIRO_BROWSER_ESBUILD || "esbuild");
const {JSDOM} = require(process.env.SELQIRO_TEST_JSDOM || "jsdom");
const output = path.resolve(process.env.SELQIRO_CONTEXT_OUTPUT || path.join(root, ".service-context-proof"));
await mkdir(output, {recursive: true});
const sha = data => createHash("sha256").update(data).digest("hex");
const built = await esbuild.build({absWorkingDir: root, stdin: {contents:
  'export * from "./src/features/service-navigation/model/serviceReturnContext";export * from "./src/features/service-navigation/model/serviceDiscoveryLocation";export * from "./src/features/listing-navigation/model/listingReturnContext";',
  resolveDir: root, sourcefile: "service-context-test-entry.ts", loader: "ts"}, bundle: true, write: false,
  platform: "browser", format: "iife", globalName: "ServiceContext", metafile: true,
  define: {"process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_SUPABASE_URL": '"https://abcdefghijklmnopqrst.supabase.co"'}});
const code = built.outputFiles[0].text;
const proof = {schemaVersion: 1, startedAt: new Date().toISOString(), boundary: "Actual context/filter helpers and jsdom history/sessionStorage; no React layout, database, Next server or production operations",
  command: [process.execPath, ...process.argv.slice(1)], scriptSha256: sha(await readFile(fileURLToPath(import.meta.url))), sources: [], cases: [], failures: []};
for (const input of Object.keys(built.metafile.inputs)) {
  if (input === "service-context-test-entry.ts" || input.includes("node_modules")) continue;
  proof.sources.push({path: input, sha256: sha(await readFile(path.resolve(root, input)))});
}
const serviceA = "33333333-3333-4333-8333-000000000001", serviceB = "33333333-3333-4333-8333-000000000002";
const plain = value => JSON.parse(JSON.stringify(value));
function browser(url = "/v2/services?q=Repair&city=Paide") {
  const dom = new JSDOM("<!doctype html><body></body>", {url: `https://selqiro.test${url}`, runScripts: "outside-only"});
  dom.window.eval(code);
  Object.defineProperty(dom.window, "scrollY", {value: 820, configurable: true});
  dom.window.history.replaceState({__NA: true, preserved: {value: "router-metadata"}}, "", url);
  return {dom, window: dom.window, api: dom.window.ServiceContext};
}
function save(api, extra = {}) {
  return api.saveServiceReturnContext({source: "services", serviceId: serviceA, cardViewportTop: 130,
    loadedOffset: 24, targetOffset: 24, ...extra});
}
async function traverse(window, direction) {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error(`History ${direction} did not fire popstate`)), 1500);
    window.addEventListener("popstate", () => {clearTimeout(timer);resolve();}, {once: true});window.history[direction]();
  });
}
async function test(name, work, url) {
  const context = browser(url);
  try {await work(context);proof.cases.push({name, status: "PASS"});console.log(`PASS ${name}`);}
  catch (error) {proof.failures.push({name, message: error.message, stack: error.stack});console.error(`FAIL ${name}: ${error.message}`);}
  finally {context.dom.window.close();}
}

await test("back-forward-back keeps separate source and detail history snapshots", async ({window, api}) => {
  const original = save(api);assert.ok(original);assert.equal(window.history.state.preserved.value, "router-metadata");
  window.history.pushState({__NA: true, detailMetadata: true}, "", `/v2/service/${serviceA}`);
  assert.equal(api.readServiceDetailReturn(serviceA).token, original.token);assert.equal(window.history.state.detailMetadata, true);
  assert.equal(api.readServiceSourceReturn("services"), null);
  await traverse(window, "back");assert.equal(api.readServiceSourceReturn("services").token, original.token);
  await traverse(window, "forward");assert.equal(api.readServiceDetailReturn(serviceA).token, original.token);
  await traverse(window, "back");assert.equal(api.readServiceSourceReturn("services").token, original.token);
});
await test("a later service visit does not replace an earlier history entry", async ({window, api}) => {
  const first = save(api);window.history.pushState({}, "", `/v2/service/${serviceA}`);api.readServiceDetailReturn(serviceA);
  window.history.pushState({}, "", "/v2/services?q=Other");const second = save(api, {serviceId: serviceB});
  window.history.pushState({}, "", `/v2/service/${serviceB}`);api.readServiceDetailReturn(serviceB);
  assert.notEqual(first.token, second.token);
  await traverse(window, "back");assert.equal(api.readServiceSourceReturn("services").token, second.token);
  await traverse(window, "back");assert.equal(api.readServiceDetailReturn(serviceA).token, first.token);
  await traverse(window, "back");assert.equal(api.readServiceSourceReturn("services").token, first.token);
});
await test("explicit link transfers only its validated original source", ({window, api}) => {
  const original = save(api);window.history.pushState({}, "", `/v2/service/${serviceA}`);
  const detail = api.readServiceDetailReturn(serviceA);api.prepareServiceSourceReturn(detail);
  window.history.pushState({newEntry: true}, "", original.sourceUrl);
  assert.equal(api.readServiceSourceReturn("services").token, original.token);assert.equal(window.history.state.newEntry, true);
});
await test("wrong service and unrelated source URL cannot borrow return state", ({window, api}) => {
  const original = save(api);window.history.pushState({}, "", `/v2/service/${serviceB}`);
  assert.equal(api.readServiceDetailReturn(serviceB), null);assert.equal(api.readServiceDetailReturn(serviceA), null);
  window.history.pushState({}, "", `/v2/service/${serviceA}`);assert.equal(api.readServiceDetailReturn(serviceA).token, original.token);
  const detailState = window.history.state;window.history.replaceState(detailState, "", `/v2/service/${serviceB}`);
  assert.equal(api.readServiceDetailReturn(serviceB), null);
  window.history.replaceState(detailState, "", "/v2/services?q=unrelated");assert.equal(api.readServiceSourceReturn("services"), null);
});
await test("old or future contexts and malformed viewport/page values are rejected", ({api}) => {
  const value = save(api);
  for (const fields of [{createdAt: Date.now() - 2 * 60 * 60 * 1000 - 10}, {createdAt: Date.now() + 61_000},
    {scrollY: -1}, {cardViewportTop: NaN}, {loadedOffset: -24}, {loadedOffset: 1_000_001}, {loadedOffset: 1.5},
    {targetOffset: -24}, {targetOffset: 25}, {targetOffset: 0.5}, {serviceId: "invalid"}])
    assert.equal(api.normalizeServiceReturnContext({...value, ...fields}), null, JSON.stringify(fields));
});
await test("foreign origins, wrong route types and encoded profile separators are rejected", ({api}) => {
  const value = save(api);
  for (const sourceUrl of ["https://evil.example/v2/services", "//evil.example/v2/services", "/v2/my-area", "/v2/services/other", "javascript:alert(1)"])
    assert.equal(api.normalizeServiceReturnContext({...value, sourceUrl}), null, sourceUrl);
  for (const sourceUrl of ["/v2/profile/a%2fb", "/v2/profile/a%5cb", "/v2/profile/a/b"])
    assert.equal(api.normalizeServiceReturnContext({...value, source: "public-profile", sourceUrl, loadedOffset: 0,
      profile: {expanded: true, horizontalScrollLeft: 0}}), null, sourceUrl);
});
await test("profile state is scoped, bounded and contains no service body", ({window, api}) => {
  const value = save(api, {source: "public-profile", loadedOffset: 0, targetOffset: 0,
    profile: {expanded: true, horizontalScrollLeft: 640}, description: "DO NOT PERSIST"});
  assert.ok(value);assert.equal(value.profile.horizontalScrollLeft, 640);
  assert.equal(JSON.stringify(window.history.state).includes("DO NOT PERSIST"), false);
  assert.equal(api.normalizeServiceReturnContext({...value, loadedOffset: 24}), null);
  assert.equal(api.normalizeServiceReturnContext({...value, profile: {expanded: true, horizontalScrollLeft: -1}}), null);
  assert.equal(api.readServiceSourceReturn("services"), null);
}, "/v2/profile/test-workshop");
await test("blocked sessionStorage preserves same-tab source/detail handoff", ({window, api}) => {
  Object.defineProperty(window, "sessionStorage", {get() {throw Error("Blocked browser storage");}});
  const value = save(api);window.history.pushState({}, "", `/v2/service/${serviceA}`);
  assert.equal(api.readServiceDetailReturn(serviceA).token, value.token);
});
await test("switching profile content clears only the active source context and keeps router metadata", ({window, api}) => {
  api.saveListingReturnContext({source: "public-profile", listingId: "123", cardViewportTop: 90,
    publicProfileState: {showAll: true, selectedCategoryId: null, expandedRootId: null, horizontalScrollLeft: 0, resultOffset: 24}});
  assert.equal(api.readListingReturnContext("123").listingId, "123");
  save(api, {source: "public-profile", loadedOffset: 0, targetOffset: 0, profile: {expanded: true, horizontalScrollLeft: 0}});
  assert.equal(api.readListingReturnContext(), null, "Opening a service invalidates the previous one-shot listing return");
  assert.ok(api.readServiceSourceReturn("public-profile"));api.clearServiceReturnSource();
  assert.equal(api.readServiceSourceReturn("public-profile"), null);assert.equal(window.history.state.__NA, true);
  assert.equal(window.history.state.preserved.value, "router-metadata");
  const next = save(api, {source: "public-profile", loadedOffset: 0, targetOffset: 0, profile: {expanded: false, horizontalScrollLeft: 200}});
  window.history.pushState({}, "", `/v2/service/${serviceA}`);api.readServiceDetailReturn(serviceA);api.clearServiceReturnSource();
  assert.equal(api.readServiceDetailReturn(serviceA).token, next.token, "Source-only clearing leaves a detail entry intact");
}, "/v2/profile/test-workshop");
await test("modifier and non-primary clicks do not create normal return navigation", ({api}) => {
  const event = {button: 0, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, defaultPrevented: false};
  assert.equal(api.isPlainServiceClick(event), true);
  for (const fields of [{button: 1}, {button: 2}, {metaKey: true}, {ctrlKey: true}, {altKey: true}, {shiftKey: true}, {defaultPrevented: true}])
    assert.equal(api.isPlainServiceClick({...event, ...fields}), false);
});
await test("UTF-8 filters survive canonical URL roundtrip and preserve API boundaries", ({api}) => {
  const filters = {query: "Remonditöö & hooldus", category: "vehicle_machinery", subcategory: "repair", city: "Pärnu"};
  const url = api.serviceFiltersUrl(filters);assert.ok(url.startsWith("/v2/services?"));
  assert.deepEqual(plain(api.readServiceFilters(new URL(url, "https://selqiro.test").search)), filters);
  assert.deepEqual(plain(api.serviceSearchInput(filters)), {...filters, country: null});
  assert.equal(api.serviceFiltersUrl(api.emptyServiceFilters()), "/v2/services");
});
await test("invalid filters and orphan subcategories do not become API input", ({api}) => {
  const search = "?q=" + "x".repeat(201) + "&category=" + "c".repeat(121) + "&subcategory=repair&city=%00Paide";
  assert.deepEqual(plain(api.readServiceFilters(search)), {query: "", category: "", subcategory: "", city: ""});
  assert.equal(api.serviceFiltersUrl({query: "", category: "", subcategory: "repair", city: ""}), "/v2/services");
});

proof.inputDrift = [];
for (const source of proof.sources) if (sha(await readFile(path.resolve(root, source.path))) !== source.sha256) proof.inputDrift.push(source.path);
proof.finishedAt = new Date().toISOString();proof.status = proof.failures.length || proof.inputDrift.length ? "FAIL" : "PASS";
await writeFile(path.join(output, "context-result.json"), JSON.stringify(proof, null, 2));
console.log(`${proof.status}: ${proof.cases.length} passed; ${proof.failures.length} failed; ${output}/context-result.json`);
if (proof.status !== "PASS") process.exitCode = 1;
