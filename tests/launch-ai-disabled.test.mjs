// Runs the real disabled route modules in a realm with no provider, database,
// Energy, environment or network access. Run: node --test tests/launch-ai-disabled.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routes = [
  "app/api/ai/enrich-listing/route.ts",
  "app/api/ai/analyze-listing/route.ts",
];

function loadRoute(relativePath) {
  const filename = path.join(root, relativePath);
  const source = readFileSync(filename, "utf8");
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  assert.equal(parsed.parseDiagnostics.length, 0, "The actual route must parse");
  const compiled = ts.transpileModule(source, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2017,
      module: ts.ModuleKind.CommonJS,
    },
  });
  assert.equal(
    compiled.diagnostics.filter((entry) => entry.category === ts.DiagnosticCategory.Error).length,
    0,
    "The actual route must transpile"
  );

  const attempts = { dependency: 0, network: 0, environment: 0, request: 0 };
  const forbidden = (kind) => (...details) => {
    attempts[kind] += 1;
    throw new Error(`Disabled listing AI attempted ${kind} access: ${String(details[0] ?? "")}`);
  };
  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    Response,
    require: forbidden("dependency"),
    fetch: forbidden("network"),
  };
  Object.defineProperty(context, "process", {
    get: forbidden("environment"),
  });
  vm.runInNewContext(compiled.outputText, context, { filename, timeout: 1000 });
  assert.equal(typeof module.exports.POST, "function");

  return {
    handler: module.exports.POST,
    attempts,
    guardRequest(request) {
      // No request member may be read before the hard-off response. This covers
      // parsing, auth, contract selection and any pre-reservation request path.
      return new Proxy(request, { get: forbidden("request") });
    },
  };
}

const cases = [
  {
    name: "anonymous legacy request",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrls: ["data:image/jpeg;base64,dGVzdA=="] }),
  },
  {
    name: "bearer request with a listing ID",
    headers: { "Content-Type": "application/json", Authorization: "Bearer synthetic-test-token" },
    body: JSON.stringify({ listingId: "synthetic-listing", title: "Test", description: "Test description" }),
  },
  {
    name: "V2 Energy contract request",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer synthetic-test-token",
      "x-selqiro-ai-contract": "v2-energy-1",
    },
    body: JSON.stringify({ operationId: "synthetic-operation", imageUrls: [] }),
  },
  {
    name: "unknown contract request",
    headers: { "Content-Type": "application/json", "x-selqiro-ai-contract": "future-contract" },
    body: "{}",
  },
  {
    name: "malformed JSON request",
    headers: { "Content-Type": "application/json" },
    body: "{",
  },
];

for (const route of routes) {
  test(`${route}: imports without provider or database credentials`, () => {
    const { attempts } = loadRoute(route);
    assert.deepEqual(attempts, { dependency: 0, network: 0, environment: 0, request: 0 });
  });

  for (const scenario of cases) {
    test(`${route}: ${scenario.name} is disabled before all I/O`, { timeout: 1000 }, async () => {
      const { handler, attempts, guardRequest } = loadRoute(route);
      const request = new Request(`https://example.test/${route}`, {
        method: "POST",
        headers: scenario.headers,
        body: scenario.body,
      });
      const response = await handler(guardRequest(request));
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      const payload = await response.json();
      assert.equal(payload.success, false);
      assert.equal(payload.code, "listing_ai_disabled");
      assert.equal(payload.retryable, false);
      assert.equal(typeof payload.error, "string");
      assert.ok(payload.error.length > 0);
      assert.deepEqual(attempts, { dependency: 0, network: 0, environment: 0, request: 0 });
      assert.equal(request.bodyUsed, false);
    });
  }
}
