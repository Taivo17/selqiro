"use strict";

// Packaging gate only. A PASS does not execute deployed routes or authorize uploads.
const fs = require("node:fs");
const path = require("node:path");
const { EXPECTED, inspectRuntime, localFile, readJson, relativeFile, fail, runGate } = require("./check-image-runtime.cjs");
const FORMAT = "selqiro-security-image-traces-v1";
const ROUTES = Object.freeze([
  ["profile-media", false], ["message-images", false], ["publication", true],
  ["horse-publication", true], ["service-publication", true],
]);
const WORKER_FILES = Object.freeze([
  "src/server/listing-publication/images/sanitize.cjs",
  "src/server/listing-publication/images/worker.cjs",
  "src/server/listing-publication/images/image-contract.cjs",
]);

function traceReference(root, file) {
  const absolute = path.resolve(file);
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  if (!relative || relative === ".." || relative.startsWith("../") || path.isAbsolute(relative)) fail("file_outside_project");
  if (!fs.lstatSync(absolute).isSymbolicLink()) return relativeFile(root, absolute);
  // Only the final entry may be a link; do not follow linked parent directories.
  if (fs.realpathSync(path.dirname(absolute)) !== path.dirname(absolute)) fail("trace_link_parent_invalid");
  const link = fs.readlinkSync(absolute);
  if (path.isAbsolute(link)) fail("trace_link_target_invalid");
  const target = path.resolve(path.dirname(absolute), link);
  const alias = relative.match(/^\.next\/node_modules\/((?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*)-[a-f0-9]{16}$/);
  if (alias) {
    const expected = path.join(root, "node_modules", alias[1]);
    if (target !== expected || fs.realpathSync(target) !== expected || !fs.statSync(target).isDirectory()) fail("trace_package_alias_invalid");
    if (readJson(root, path.join(expected, "package.json")).name !== alias[1]) fail("trace_package_alias_manifest_invalid");
    return relative; // An alias never stands in for explicit native/worker files.
  }
  const member = relative.match(/^node_modules\/((?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*)\/(.+)$/);
  if (!member) fail("trace_link_path_invalid");
  const packageRoot = path.join(root, "node_modules", member[1]);
  if (!target.startsWith(packageRoot + path.sep)) fail("trace_link_target_invalid");
  if (readJson(root, path.join(packageRoot, "package.json")).name !== member[1]) fail("trace_link_manifest_invalid");
  localFile(root, target); // npm .bin links may target a regular file inside this package only.
  return relative;
}

function inspectTraces() {
  const runtime = inspectRuntime();
  const { root } = runtime;
  const framework = readJson(root, path.join(root, ".next/diagnostics/framework.json"));
  if (framework.name !== "Next.js" || framework.version !== EXPECTED.next) fail("build_framework_version_mismatch");
  const buildId = fs.readFileSync(localFile(root, path.join(root, ".next/BUILD_ID")), "utf8").trim();
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(buildId)) fail("build_id_invalid");
  const routes = ROUTES.map(([kind, worker]) => {
    const route = "/api/v2/" + kind + "/[action]";
    const trace = ".next/server/app" + route + "/route.js.nft.json";
    const tracePath = path.join(root, trace);
    const nft = readJson(root, tracePath);
    localFile(root, path.join(root, ".next/server/app" + route + "/route.js"));
    if (nft.version !== 1 || !Array.isArray(nft.files) || !nft.files.length || nft.files.length > 50000) fail("trace_format_invalid_" + kind);
    const files = new Set(nft.files.map(file => {
      if (typeof file !== "string" || !file || file.length > 4096 || path.isAbsolute(file)) fail("trace_path_invalid_" + kind);
      return traceReference(root, path.resolve(path.dirname(tracePath), file));
    }));
    // Route imports may use Sharp's ESM export. The isolated child requires CJS.
    const cjs = runtime.requiredFiles;
    const esm = cjs.map(file => file.startsWith("node_modules/sharp/dist/") ? file.replace(/\.cjs$/, ".mjs") : file);
    const variants = worker ? [cjs] : [cjs, esm];
    const required = variants.find(list => list.every(file => files.has(file)));
    if (!required) fail("trace_native_files_missing_" + kind);
    const requiredFiles = [...new Set([...required, ...(worker ? WORKER_FILES : [])])].sort();
    if (!requiredFiles.every(file => files.has(file))) fail("trace_worker_files_missing_" + kind);
    for (const file of requiredFiles) localFile(root, path.join(root, file));
    return { route, trace, fileCount: files.size, requiredFiles };
  });
  return { format: FORMAT, status: "PASS", platform: runtime.report.platform, routes };
}

module.exports = { inspectTraces, traceReference, ROUTES, WORKER_FILES };
if (require.main === module) runGate(FORMAT, inspectTraces);
