"use strict";

// Local release gate: no network, application handlers, images or user records.
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const FORMAT = "selqiro-security-image-runtime-v1";
const EXPECTED = Object.freeze({ next: "16.4.6", sharp: "0.35.5", vips: "8.18.7", nativeVips: "1.3.4" });
const ROOT = path.resolve(__dirname, "../..");

function fail(code) {
  const error = new Error(code);
  error.gateCode = code;
  throw error;
}
function localFile(root, file) {
  const absolute = path.resolve(file);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith(".." + path.sep) || relative === ".." || path.isAbsolute(relative)) fail("file_outside_project");
  const real = fs.realpathSync(absolute);
  if (real !== absolute || !fs.statSync(real).isFile()) fail("file_not_regular_local");
  return real;
}
function readJson(root, file) {
  const target = localFile(root, file);
  if (fs.statSync(target).size > 16 * 1024 * 1024) fail("json_size_invalid");
  return JSON.parse(fs.readFileSync(target, "utf8"));
}
function relativeFile(root, file) {
  return path.relative(root, localFile(root, file)).split(path.sep).join("/");
}

function inspectRuntime() {
  const root = fs.realpathSync(ROOT);
  const manifest = readJson(root, path.join(root, "package.json"));
  const lock = readJson(root, path.join(root, "package-lock.json"));
  if (lock.lockfileVersion !== 3 || !lock.packages || !lock.packages[""]) fail("lock_format_invalid");
  const load = createRequire(path.join(root, "package.json"));
  const checkedPackages = new Set();
  function packageInfo(name, version) {
    const dir = path.join(root, "node_modules", name);
    const pkg = readJson(root, path.join(dir, "package.json"));
    const locked = lock.packages["node_modules/" + name];
    if (pkg.name !== name || pkg.version !== version || locked?.version !== version ||
        typeof locked.resolved !== "string" || !locked.resolved.startsWith("https://registry.npmjs.org/") ||
        !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(locked.integrity || "")) fail("package_lock_mismatch");
    checkedPackages.add(name);
    return { dir, pkg };
  }
  for (const [name, version] of [["next", EXPECTED.next], ["eslint-config-next", EXPECTED.next], ["sharp", EXPECTED.sharp]]) {
    const declared = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name];
    const locked = lock.packages[""].dependencies?.[name] ?? lock.packages[""].devDependencies?.[name];
    if (declared !== version || locked !== version) fail("release_pin_mismatch");
    packageInfo(name, version);
  }
  const nextEntry = localFile(root, load.resolve("next"));
  const sharpEntry = localFile(root, load.resolve("sharp"));
  if (sharpEntry !== path.join(root, "node_modules/sharp/dist/index.cjs") ||
      !nextEntry.startsWith(path.join(root, "node_modules/next") + path.sep)) fail("package_resolution_invalid");
  const nextLoad = createRequire(path.join(root, "node_modules/next/dist/server/image-optimizer.js"));
  if (localFile(root, nextLoad.resolve("sharp")) !== sharpEntry) fail("next_sharp_not_deduplicated");
  if (typeof load("next") !== "function") fail("next_module_invalid");
  const sharp = load("sharp");
  const binding = load(path.join(root, "node_modules/sharp/dist/sharp.cjs"));
  const platform = load(path.join(root, "node_modules/sharp/dist/libvips.cjs")).runtimePlatformArch();
  if (!/^(darwin|linux|linuxmusl)-(arm64|x64|arm|ppc64|riscv64|s390x)$/.test(platform)) fail("native_platform_unsupported");
  const nativeName = "@img/sharp-" + platform;
  const vipsName = "@img/sharp-libvips-" + platform;
  const native = packageInfo(nativeName, EXPECTED.sharp);
  const vips = packageInfo(vipsName, EXPECTED.nativeVips);
  const nativeEntry = localFile(root, load.resolve(nativeName + "/sharp.node"));
  const vipsBinary = localFile(root, load.resolve(vipsName + "/binary"));
  if (!nativeEntry.startsWith(native.dir + path.sep) || !vipsBinary.startsWith(vips.dir + path.sep)) fail("native_resolution_invalid");
  const loaded = Object.entries(require.cache).filter(([file, mod]) => file.endsWith(".node") && mod.exports === binding);
  if (loaded.length !== 1 || !localFile(root, loaded[0][0]).startsWith(native.dir + path.sep) ||
      require.cache[nativeEntry]?.exports !== binding) fail("native_binding_not_prebuilt");
  const nativeVersion = binding.libvipsVersion();
  if (nativeVersion.semver !== EXPECTED.vips || nativeVersion.isGlobal !== false || nativeVersion.isWasm !== false ||
      sharp.versions.sharp !== EXPECTED.sharp || sharp.versions.vips !== EXPECTED.vips) fail("native_version_mismatch");
  // Inspect only shared-library paths; never serialize the process report or environment.
  const vipsLibraries = process.report.getReport().sharedObjects.filter(file => /^libvips(?:-|\.)/.test(path.basename(file)));
  if (vipsLibraries.length !== 1 || fs.realpathSync(vipsLibraries[0]) !== vipsBinary) fail("libvips_not_from_locked_package");
  const imagePackages = ["sharp", nativeName, vipsName, "@img/colour", "detect-libc", "semver"];
  const prefixes = imagePackages.map(name => path.join(root, "node_modules", name) + path.sep);
  const imageFiles = Object.keys(require.cache).filter(file => prefixes.some(prefix => file.startsWith(prefix)));
  for (const name of imagePackages) {
    if (!checkedPackages.has(name)) packageInfo(name, lock.packages["node_modules/" + name]?.version);
    imageFiles.push(path.join(root, "node_modules", name, "package.json"));
  }
  imageFiles.push(nativeEntry, loaded[0][0], vipsBinary, load.resolve(vipsName + "/versions"));
  const requiredFiles = [...new Set(imageFiles.map(file => relativeFile(root, file)))].sort();
  return {
    root, requiredFiles,
    report: { format: FORMAT, status: "PASS", platform, versions: {
      node: process.versions.node, next: EXPECTED.next, eslintConfigNext: EXPECTED.next,
      sharp: sharp.versions.sharp, libvips: nativeVersion.semver,
      nativePackage: nativeName, nativeVersion: native.pkg.version,
      libvipsPackage: vipsName, libvipsPackageVersion: vips.pkg.version,
    } },
  };
}

function runGate(format, inspect) {
  try { process.stdout.write(JSON.stringify(inspect()) + "\n"); }
  catch (error) {
    process.stdout.write(JSON.stringify({ format, status: "FAIL", code: error.gateCode || "check_incomplete" }) + "\n");
    process.exitCode = 1;
  }
}

module.exports = { EXPECTED, inspectRuntime, localFile, readJson, relativeFile, fail, runGate };
if (require.main === module) runGate(FORMAT, () => inspectRuntime().report);
