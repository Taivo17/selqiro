// Run after the current production build. Dependencies may live outside this
// project via SELQIRO_BROWSER_ESBUILD and SELQIRO_BROWSER_PLAYWRIGHT; no install.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile, writeFile, mkdir, readdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {createServer} from "node:http";

const require = createRequire(import.meta.url), root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const output = path.resolve(process.env.SELQIRO_BROWSER_OUTPUT || path.join(root, ".service-browser-proof"));
const prepareOnly = process.argv.includes("--prepare");
const esbuild = require(process.env.SELQIRO_BROWSER_ESBUILD || "esbuild");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
await mkdir(output, {recursive: true});

const fixtureSource = `
const q=new URLSearchParams(location.search), language=q.get('language')==='et'?'et':'en';
const actor={userId:'11111111-1111-4111-8111-111111111111',identityId:'22222222-2222-4222-8222-222222222222'};
const serviceId='33333333-3333-4333-8333-333333333333',policyId='55555555-5555-4555-8555-555555555555',time='2026-11-09T10:00:00.000Z';
const description=(language==='et'?'Hooldame ja parandame töökojas sõidukeid, masinaid ning seadmeid. Teenuse täpne sisu ja aeg lepitakse enne töö algust kokku. ':'We maintain and repair vehicles, machines and equipment at our workshop. The exact work and appointment are agreed before the service begins. ').repeat(12);
let held=false,callbacks=[],auth=null;
export const fixture={language,actor,serviceId,create:q.get('create')==='true',description,createdUrls:[],revokedUrls:[],requests:[],actorReads:0,lastSelectedFile:null,
 holdActor(){held=true;},releaseActor(){held=false;for(const resolve of callbacks.splice(0))resolve({...actor});},pendingActor(){return callbacks.length;},
 readActor(){fixture.actorReads++;return held?new Promise(resolve=>callbacks.push(resolve)):Promise.resolve({...actor});},
 authSubscribe(fn){auth=fn;return{data:{subscription:{unsubscribe(){auth=null;}}}};},signOut(){auth?.('SIGNED_OUT',null);},
 router:{replace(){throw Error('Unexpected navigation during selection test');}},
 categories:[{code:'vehicle_machinery',parentCode:null,labelEt:'Sõidukid ja masinad',labelEn:'Vehicles and machinery',sortOrder:0}],
 policy:{snapshot:[{documentId:policyId,version:'1',contentHash:'a'.repeat(64),accepted:true}],loading:false,error:false,accepting:false,refresh(){},
  policy:{accepted:true,locale:'en',title:'Synthetic test policy',summary:'Local test only',bodyText:'No remote services are used.'}},
 rawOwner:{schema_version:1,content_type:'service',actor_user_id:actor.userId,identity_id:actor.identityId,service_id:serviceId,edit_revision:'12',status:'published',
  content:{serviceId,title:language==='et'?'Remonditeenus':'Repair service',description,category:'vehicle_machinery',subcategory:null,
    priceType:'contact',priceAmount:null,currency:'EUR',country:'Estonia',city:'Paide',location:null},images:[],
  policy_snapshot:[{document_id:policyId,version:'1',content_hash:'a'.repeat(64)}],created_at:time,updated_at:time,published_at:time,sort_order:0},
 publicService:{id:serviceId,identityId:actor.identityId,title:language==='et'?'Remonditeenus':'Repair service',description,
  category:'vehicle_machinery',subcategory:null,priceType:'contact',priceAmount:null,currency:'EUR',country:'Estonia',city:'Paide',location:null,
  images:[],imageUrl:null,status:'published',sortOrder:0,publishedAt:time,createdAt:time,updatedAt:time}
};
const signal=new AbortController().signal;
fixture.conversationActor={actor:{expectedUserId:actor.userId,expectedIdentityId:actor.identityId,generation:1,signal},
 anonymous:false,loading:false,error:null,isCurrent:()=>true,refresh(){}};
`;
const mockSources = {
  "next/link": `import React from 'react';export default function LocalLink({href,children,...props}){return React.createElement('a',{...props,href},children);}`,
  "next/navigation": `import {fixture} from 'selqiro-browser-fixture';export const useRouter=()=>fixture.router;`,
  "src/shared/i18n/V2LanguageProvider.tsx": `import {fixture} from 'selqiro-browser-fixture';import {getCatalogTranslation} from '${root}/lib/i18n/useTranslation.ts';export const useV2Translation=catalog=>({language:fixture.language,t:(key,params)=>getCatalogTranslation(fixture.language,catalog,key,params)});`,
  "src/entities/listing/api/getListingActivityActor.ts": `import {fixture} from 'selqiro-browser-fixture';export const getListingActivityActor=()=>fixture.readActor();`,
  "src/shared/supabase/browserClient.ts": `import {fixture} from 'selqiro-browser-fixture';export const supabaseBrowserClient={auth:{onAuthStateChange:fn=>fixture.authSubscribe(fn)}};`,
  "src/entities/service/api/servicePublicationClient.ts": `import {fixture} from 'selqiro-browser-fixture';import {bindServiceOwnerSnapshot} from '${root}/src/entities/service/model/servicePublication.ts';
   const owner=()=>bindServiceOwnerSnapshot(fixture.rawOwner,fixture.actor,fixture.serviceId);
   export const readServiceOwner=async()=>{fixture.requests.push('owner-read');return owner();};
   export const listServiceOwners=async()=>{fixture.requests.push('owner-list');return{items:[owner()],totalCount:'1',nextOffset:null};};
   export const servicePublicationRequest=async(_actor,action)=>{fixture.requests.push(action);throw Error('Unexpected publication request');};
   export const setServiceOwnerStatus=async()=>{throw Error('Unexpected status write');};
   export const fetchServiceOwnerImage=async()=>{throw Error('Fixture has no stored photos');};`,
  "src/entities/listing/api/publicationJourneyClient.ts": `export const putPublicationPart=async()=>{throw Error('Selecting a photo must not upload it');};`,
  "src/entities/listing/model/listingPhotoPreparation.ts": `export const prepareListingPhoto=async()=>{throw Error('Selecting a photo must not start upload preparation');};`,
  "src/features/service-editor/model/useServicePolicy.ts": `import {fixture} from 'selqiro-browser-fixture';export const useServicePolicy=()=>fixture.policy;`,
  "src/features/listing-conversation/model/useConversationActor.ts": `import {fixture} from 'selqiro-browser-fixture';export const useConversationActor=()=>fixture.conversationActor;`,
  "src/entities/service/api/getPublicServices.ts": `import {fixture} from 'selqiro-browser-fixture';export const getPublicServices=async()=>[fixture.publicService];`,
  "src/entities/service-category/api/getServiceCategories.ts": `import {fixture} from 'selqiro-browser-fixture';export const getServiceCategories=async()=>fixture.categories;`,
};
const result = await esbuild.build({absWorkingDir: root, entryPoints: [path.join(root, "tests/browser/service-photo-selection.jsx")], outfile: path.join(output, "app.js"),
  bundle: true, platform: "browser", format: "iife", jsx: "automatic", metafile: true, sourcemap: false,
  define: {"process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_SUPABASE_URL": '"https://abcdefghijklmnopqrst.supabase.co"',
    "process.env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW": "undefined", "process.env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL": "undefined",
    "process.env.NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION": "undefined"},
  plugins: [{name: "synthetic-service-boundaries", setup(build) {
    build.onResolve({filter: /.*/}, args => {
      if (args.path === "selqiro-browser-fixture") return {path: args.path, namespace: "fixture"};
      if (Object.hasOwn(mockSources, args.path)) return {path: args.path, namespace: "mock"};
      const candidate = args.path.startsWith("@/") ? path.join(root, args.path.slice(2))
        : args.path.startsWith(".") ? path.resolve(args.resolveDir, args.path) : args.path;
      for (const suffix of ["", ".ts", ".tsx"]) {
        const relative = path.relative(root, candidate + suffix).split(path.sep).join("/");
        if (Object.hasOwn(mockSources, relative)) return {path: relative, namespace: "mock"};
      }
    });
    build.onLoad({filter: /.*/, namespace: "fixture"}, () => ({contents: fixtureSource, loader: "js", resolveDir: root}));
    build.onLoad({filter: /.*/, namespace: "mock"}, args => ({contents: mockSources[args.path], loader: "js", resolveDir: root}));
  }}]});
const inputs = [];
for (const input of Object.keys(result.metafile.inputs)) {
  const file = path.resolve(root, input);
  if (!input.startsWith("mock:") && !input.startsWith("fixture:") && !file.includes(`${path.sep}node_modules${path.sep}`)) {
    const bytes = await readFile(file);inputs.push({path: path.relative(root, file), sha256: sha(bytes)});
  }
}
const proof = {schemaVersion: 1, startedAt: new Date().toISOString(), node: process.version, syntheticOnly: true,
  boundary: "Real React/Chromium/DOM/File/Blob and current components; synthetic Auth, actor, policy and data/API reads; localhost only",
  harnessSha256: sha(await readFile(fileURLToPath(import.meta.url))),
  sources: inputs, bundleSha256: sha(await readFile(path.join(output, "app.js"))), cases: [], networkRequests: [], failures: []};
if (prepareOnly) {
  await writeFile(path.join(output, "prepared.json"), JSON.stringify({...proof, status: "PREPARED_NOT_RUN"}, null, 2));
  console.log(`PREPARED: ${output}`);
  process.exit(0);
}
async function allFiles(dir) {
  const children = await readdir(dir, {withFileTypes: true});
  return (await Promise.all(children.map(child => child.isDirectory() ? allFiles(path.join(dir, child.name)) : path.join(dir, child.name)))).flat();
}
const cssFiles = (await allFiles(path.join(root, ".next/static"))).filter(file => file.endsWith(".css"));
assert.ok(cssFiles.length, "A current production build must supply real application CSS");
const cssParts = await Promise.all(cssFiles.map(file => readFile(file)));
proof.productionCss = cssFiles.map((file, index) => ({path: path.relative(root, file), sha256: sha(cssParts[index])}));
const css = Buffer.concat(cssParts), js = await readFile(path.join(output, "app.js"));
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>`;
const server = createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/app.js") {response.setHeader("content-type", "application/javascript");response.end(js);}
  else if (url.pathname === "/app.css") {response.setHeader("content-type", "text/css");response.end(css);}
  else if (url.pathname === "/") {response.setHeader("content-type", "text/html");response.end(html);}
  else {response.statusCode = 404;response.end();}
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const {chromium} = require(process.env.SELQIRO_BROWSER_PLAYWRIGHT || "playwright");
const browser = await chromium.launch({headless: true, executablePath: process.env.SELQIRO_BROWSER_EXECUTABLE || undefined,
  args: ["--disable-dev-shm-usage"]});proof.browser = browser.version();
const photo = {name: "service.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64")};
const wait = (page, expression, arg) => page.waitForFunction(expression, arg, {timeout: 10000});

async function withPage(name, language, width, query, work) {
  const context = await browser.newContext({viewport: {width, height: width < 600 ? 844 : 1000}, locale: language === "et" ? "et-EE" : "en-GB"});
  const page = await context.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {proof.networkRequests.push({case: name, url: url.origin + url.pathname, blocked: true});return route.abort();}
    return route.continue();
  });
  try {
    await page.goto(`${origin}/?language=${language}&${query}`);
    await wait(page, () => !!window.__serviceBrowser);
    const data = await work(page);
    assert.deepEqual(errors, [], "No browser runtime errors");
    assert.equal(proof.networkRequests.some(request => request.case === name), false, "No remote request should be attempted");
    proof.cases.push({name, language, width, status: "PASS", ...data});
  } catch (error) {
    await page.screenshot({path: path.join(output, `${name}-failed.png`), fullPage: true}).catch(() => {});
    proof.failures.push({name, message: error.message, errors});throw error;
  } finally {await context.close();}
}

try {
  for (const width of [390, 1365]) for (const language of ["et", "en"]) for (const create of [false, true]) {
    const name = `photo-${language}-${width}-${create ? "create" : "edit"}`;
    await withPage(name, language, width, `create=${create}`, async page => {
      const title = page.locator('input[name="service-title"]');await title.waitFor();await wait(page, () => document.querySelector('[data-service-editor-mode="editing"]'));
      await title.fill("Unsaved service title");
      const saveName = create ? language === "et" ? "Avalda" : "Publish" : language === "et" ? "Salvesta muudatused" : "Save changes";
      const save = page.getByRole("button", {name: saveName, exact: true});
      const chooserReady = page.waitForEvent("filechooser");
      await page.getByRole("button", {name: language === "et" ? "Lisa fotosid" : "Add photos", exact: true}).click();
      const chooser = await chooserReady;
      await page.evaluate(() => {window.__serviceBrowser.holdActor();window.dispatchEvent(new Event("focus"));});
      await wait(page, () => window.__serviceBrowser.pendingActor() === 1);
      assert.equal(await save.isDisabled(), true);
      await chooser.setFiles(photo);
      const preview = page.locator('img[src^="blob:"]');await preview.waitFor();await wait(page, () => document.querySelector('img[src^="blob:"]')?.naturalWidth > 0);
      assert.equal(await title.inputValue(), "Unsaved service title");assert.equal(await save.isDisabled(), true);
      const selected = await page.evaluate(() => ({created: [...window.__serviceBrowser.createdUrls], revoked: [...window.__serviceBrowser.revokedUrls],
        inputValue: document.querySelector('input[type="file"]').value, requests: [...window.__serviceBrowser.requests]}));
      assert.equal(selected.created.length, 1);assert.deepEqual(selected.revoked, []);assert.equal(selected.inputValue, "");
      assert.ok(selected.requests.every(action => action === "owner-read"));
      await page.evaluate(() => window.__serviceBrowser.releaseActor());await wait(page, label => [...document.querySelectorAll("button")].some(button => button.textContent === label && !button.disabled), saveName);
      assert.equal(await preview.getAttribute("src"), selected.created[0]);assert.equal(await title.inputValue(), "Unsaved service title");
      await page.screenshot({path: path.join(output, `${name}.png`), fullPage: true});
      await page.getByRole("button", {name: language === "et" ? "Eemalda" : "Remove", exact: true}).click();
      await wait(page, () => window.__serviceBrowser.revokedUrls.length === 1);
      await page.evaluate(() => {const input = document.querySelector('input[type="file"]'), data = new DataTransfer();data.items.add(window.__serviceBrowser.lastSelectedFile);input.files = data.files;input.dispatchEvent(new Event("change", {bubbles: true}));});
      await preview.waitFor();await wait(page, () => window.__serviceBrowser.createdUrls.length === 2);
      assert.notEqual(await preview.getAttribute("src"), selected.created[0]);
      return {chooser: "native filechooser event followed by controlled focus then setFiles", selected, repeatedSameFile: true};
    });
  }
  for (const language of ["et", "en"]) {
    await withPage(`identity-${language}`, language, 390, "create=false", async page => {
      const title = page.locator('input[name="service-title"]');await title.waitFor();await wait(page, () => document.querySelector('[data-service-editor-mode="editing"]'));await title.fill("Preserved local draft");
      const chooserReady = page.waitForEvent("filechooser");
      await page.getByRole("button", {name: language === "et" ? "Lisa fotosid" : "Add photos", exact: true}).click();await chooserReady;
      await page.evaluate(() => {
        const api = window.__serviceBrowser, input = document.querySelector('input[type="file"]'), data = new DataTransfer();
        data.items.add(new File(["late selected bytes"], "late.png", {type: "image/png"}));
        window.__pendingIdentityChange = api.beginIdentityChange(api.actor.userId);
        input.files = data.files;input.dispatchEvent(new Event("change", {bubbles: true}));
      });
      await wait(page, () => !document.querySelector('input[name="service-title"]'));
      assert.deepEqual(await page.evaluate(() => window.__serviceBrowser.createdUrls), []);
      await page.evaluate(() => window.__serviceBrowser.finishIdentityChange(window.__pendingIdentityChange));
      await title.waitFor();await wait(page, () => document.querySelector('[data-service-editor-mode="editing"]'));
      assert.equal(await title.inputValue(), "Preserved local draft");assert.equal(await page.locator('img[src^="blob:"]').count(), 0);
      const requests = await page.evaluate(() => window.__serviceBrowser.requests);assert.ok(requests.every(action => action === "owner-read"));
      return {lateChangeRejected: true, localDraftPreserved: true, requests};
    });
  }
  for (const width of [390, 1365]) for (const language of ["et", "en"]) {
    const name = `descriptions-${language}-${width}`;
    await withPage(name, language, width, "view=lists", async page => {
      const description = await page.evaluate(() => window.__serviceBrowser.description), measurements = [];
      for (const section of ["my-area", "profile-preview", "profile-expanded"]) {
        const paragraph = page.locator(`[data-case="${section}"] .line-clamp-2`).filter({hasText: description});await paragraph.waitFor();
        const geometry = await paragraph.evaluate(element => {const style = getComputedStyle(element);return {
          textLength: element.textContent.length, height: element.getBoundingClientRect().height, lineHeight: parseFloat(style.lineHeight),
          scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, lineClamp: style.webkitLineClamp, overflow: style.overflow,
          href: element.closest("a")?.getAttribute("href") ?? null};});
        assert.equal(geometry.lineClamp, "2");assert.equal(geometry.overflow, "hidden");
        assert.ok(geometry.height <= geometry.lineHeight * 2 + 1 && geometry.height >= geometry.lineHeight * 1.9, JSON.stringify(geometry));
        assert.ok(geometry.scrollHeight > geometry.clientHeight + geometry.lineHeight, "Long text genuinely overflows the two-line box");
        assert.equal(geometry.href, "/v2/service/33333333-3333-4333-8333-333333333333");measurements.push({section, ...geometry});
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({path: path.join(output, `${name}.png`), fullPage: true});return {measurements};
    });
  }
  proof.status = "PASS";
} catch (error) {proof.status = "FAIL";console.error(error);process.exitCode = 1;}
finally {
  proof.finishedAt = new Date().toISOString();await writeFile(path.join(output, "browser-result.json"), JSON.stringify(proof, null, 2));
  await browser.close();await new Promise(resolve => server.close(resolve));
}
console.log(`${proof.status}: ${proof.cases.length} cases, ${proof.failures.length} failures; ${output}`);
