"use strict";
// Focused regression for the final listing-ID bound. No HTTP, SQL or old suites.
// Run: node --test --test-reporter=tap tests/listing-publication-final-es2017.test.cjs
// The repair runner supplies an isolated input copy and its own output directory.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const root = process.env.SELQIRO_REPAIR_SOURCE_ROOT || path.resolve(__dirname, "..");
const ts = require(process.env.SELQIRO_TYPESCRIPT_MODULE || path.join(root, "node_modules/typescript"));
const output = process.env.SELQIRO_FINAL_ES2017_OUTPUT_ROOT || fs.mkdtempSync(path.join(os.tmpdir(), "selqiro-final-es2017-"));
const relative = "src/server/listing-publication/final/finalContract.ts";
const file = path.join(root, relative);
const source = fs.readFileSync(file, "utf8");
const replacement = 'BigInt("9223372036854775807")';
const literal = "9223372036854775807n";
assert.equal(source.split(replacement).length - 1, 1, "one exact string-based bound");
const configResult = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
assert.equal(configResult.error, undefined);
const converted = ts.convertCompilerOptionsFromJson(configResult.config.compilerOptions, root);
assert.deepEqual(converted.errors, []);
assert.equal(converted.options.target, ts.ScriptTarget.ES2017, "use the actual project target");
// Only module loading/output are adapted for the Node test, not target/lib/strict.
const options = { ...converted.options, module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10, noEmit: false, incremental: false,
  rootDir: path.join(root, "src"), outDir: path.join(output, "compiled"), types: [], plugins: [] };
const program = ts.createProgram([file], options);
const diagnostics = ts.getPreEmitDiagnostics(program);
const format = d => ts.flattenDiagnosticMessageText(d.messageText, "\n");
assert.deepEqual(diagnostics.map(format), [], "strict project-target typecheck must pass");
const emitted = program.emit();
assert.equal(emitted.emitSkipped, false);
assert.deepEqual(emitted.diagnostics.map(format), []);
const C = require(path.join(output, "compiled/server/listing-publication/final/finalContract.js"));
const original = source.replace(replacement, literal);
const controlHost = ts.createCompilerHost(options);
const previousRead = controlHost.readFile;
controlHost.readFile = name => path.resolve(name) === path.resolve(file) ? original : previousRead(name);
const control = ts.createProgram([file], { ...options, noEmit: true }, controlHost);
const controlDiagnostics = ts.getPreEmitDiagnostics(control);
const dependencies = program.getSourceFiles().filter(f => !f.isDeclarationFile).map(f => path.relative(root, f.fileName).split(path.sep).join("/")).sort();
const expectedDependencies = [relative, "src/entities/listing/model/privatePublicationUpload.ts",
  "src/entities/listing/model/listingPriceInput.ts", "src/shared/currency/listingCurrencies.generated.ts"].sort();

test("project ES2017 strict compile and exact four-module closure", () => {
  assert.deepEqual(dependencies, expectedDependencies);
  assert.equal(options.strict, true);
  assert.deepEqual(configResult.config.compilerOptions.lib, ["dom", "dom.iterable", "esnext"]);
});
test("original literal is a failing ES2017 negative control", () => {
  assert.equal(controlDiagnostics.length, 1);
  assert.equal(controlDiagnostics[0].code, 2737);
  assert.equal(path.resolve(controlDiagnostics[0].file.fileName), path.resolve(file));
  assert.equal(controlDiagnostics[0].file.getLineAndCharacterOfPosition(controlDiagnostics[0].start).line + 1, 7);
});
test("ID bound is a BigInt string call without numeric rounding", () => {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const literals = []; const bounds = [];
  function walk(n) {
    if (n.kind === ts.SyntaxKind.BigIntLiteral) literals.push(n);
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "BigInt" && n.arguments.length === 1 && ts.isStringLiteral(n.arguments[0])) bounds.push(n.arguments[0].text);
    ts.forEachChild(n, walk);
  }
  walk(sf); assert.deepEqual(literals, []); assert.deepEqual(bounds, ["9223372036854775807"]);
});
const cases = [
  ["minimum", "1", true], ["small", "42", true], ["above number safe range", "9007199254740993", true],
  ["max minus one", "9223372036854775806", true], ["max", "9223372036854775807", true],
  ["max plus one", "9223372036854775808", false], ["nineteen nines", "9999999999999999999", false],
  ["twenty digits", "10000000000000000000", false], ["zero", "0", false], ["negative", "-1", false],
  ["leading zero", "01", false], ["plus sign", "+1", false], ["empty", "", false],
  ["leading space", " 1", false], ["trailing space", "1 ", false], ["linefeed", "1\n", false],
  ["CRLF", "1\r\n", false], ["tab", "1\t", false], ["decimal", "1.0", false],
  ["exponent", "1e3", false], ["hex", "0x10", false], ["fullwidth", "１", false],
  ["arabic digits", "١", false], ["null", null, false], ["undefined", undefined, false],
  ["number", 1, false], ["bigint value", BigInt("1"), false], ["array", ["1"], false],
  ["boxed string", new String("1"), false], ["object", {}, false], ["symbol", Symbol("1"), false],
  ["oversized", "9".repeat(10000), false]
];
for (const [name, value, expected] of cases) test("canonical ID " + name, () => assert.equal(C.isId(value), expected));

test("1000 deterministic strings preserve the original predicate and exact decimal boundary", () => {
  const oldPredicate = v => typeof v === "string" && v.length <= 19 && v.match(/^[1-9][0-9]*$/)?.[0] === v && BigInt(v) <= 9223372036854775807n;
  let seed = 0x53454c51;
  for (let i = 0; i < 1000; i++) {
    let v = "";
    for (let j = 0, size = i % 21; j < size; j++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; v += String(seed % 10); }
    const canonical = /^[1-9][0-9]*$/.test(v);
    const expected = canonical && (v.length < 19 || (v.length === 19 && v <= "9223372036854775807"));
    assert.equal(C.isId(v), expected, v); assert.equal(C.isId(v), oldPredicate(v), v);
  }
});
test("non-string accessor is not coerced or executed", () => {
  let hits = 0;
  const input = { [Symbol.toPrimitive]() { hits++; throw Error("must not coerce"); } };
  assert.equal(C.isId(input), false); assert.equal(hits, 0);
});
const U = "11111111-1111-1111-1111-111111111111", I = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const A = "40000000-0000-0000-0000-000000000001", K = "50000000-0000-0000-0000-000000000001";
const context = { identityId: I, userId: U, attemptId: A, requestKey: K };
const receipt = { schema_version: 1, attempt_id: A, request_key: K, actor_user_id: U, identity_id: I,
  listing_id: "9223372036854775807", state: "published", published_at: "2026-10-13T12:00:00.123456Z", content_deleted: false, files_remaining: 2 };
test("receipt preserves maximum ID as an exact string", () => assert.equal(C.receipt(receipt, context).listing_id, receipt.listing_id));
test("receipt rejects maximum plus one", () => assert.throws(() => C.receipt({ ...receipt, listing_id: "9223372036854775808" }, context), C.FinalError));
test("receipt still refuses foreign identity", () => assert.throws(() => C.receipt(receipt, { ...context, identityId: U }), C.FinalError));
test("canonical price stays an exact string, not a floating-point value", () => {
  const p = { kind: "fixed", amount: "9007199254740993.01", currency: "EUR" };
  const c = C.command({ expectedUserId: U, expectedIdentityId: I, attemptId: A, requestKey: K, expectedPrice: p });
  assert.deepEqual(c.expectedPrice, p); assert.ok(Object.isFrozen(c.expectedPrice));
});
