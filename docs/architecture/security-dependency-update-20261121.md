# Security dependency update — 2026-11-21

## Accepted base and bounded change

The exact accepted base is `fb36c3bd932501121fe3c67a667724bd47ea8244`, tree `bb5cdd87bf94ba2ada7fe97f45c54a734d538e07`, 1968 tracked files. The accepted Mac receipt is SHA-256 `a13a2e78cd048c9e3fb2acc3209b624a28c026ba4dbc577ba854c7ec8b6033a0`. Matching deployment/UI evidence was supplied by the user. The assistant did not freshly fetch the live remote or access the Mac.

Direct changes are exactly Next 16.2.1 → 16.4.6, eslint-config-next 16.2.1 → 16.4.6, and Sharp 0.34.5 → 0.35.5. All other 14 direct declarations and locked versions stay unchanged. Targeted compatible lock updates additionally move ws 8.20.0 → 8.23.0, source-map-js 1.2.1 → 1.2.4, and zod 4.3.6 → 4.6.7. No broad `npm audit fix`, major lint migration, React upgrade, or new image service is included.

Sharp's prebuilt native package is 0.35.5; its libvips package is 1.3.4, with libvips 8.18.7 and librsvg 2.63.2. Sharp 0.35.5 uses `dist/*.cjs`/`*.mjs` and a platform wrapper pointing at a versioned `.node` binary; legacy assumptions about `sharp/lib/sharp.js` must not be used for proof.

The change adds local runtime/packaging verification scripts. It preserves application business logic, all user data, Auth, SQL/RLS/RPC authority, Storage policies and previously accepted media behavior. The first real build exposed Sharp namespace type incompatibilities; two imageCodec.ts files now import the Sharp and SharpOptions types directly. No runtime processing rule changed. The second real build showed that horse-publication and service-publication NFTs lacked the three existing isolated worker files and the Sharp native closure. next.config.ts now applies the unchanged publication include list to all three publication route families. The final build and all five real NFT checks passed. The initial failed type-check log and intermediate build results remain in the evidence; the intermediate missing-file observation was made from actual NFT files but their old bytes were not separately archived.

## Final local results

The exact final package-lock SHA-256 is `881953199f41d902987b85866c1d12a67e856f582a7e826dbcbc305f99e6696d`. The actual clean install succeeded without lock drift. `native-3` loaded Linux x64 Next 16.4.6, Sharp/native 0.35.5 and libvips 8.18.7; `tests-3` passed all 140 required tests with no failures or omissions; `build-3` passed the default Turbopack production build and TypeScript check; `traces-2` passed all five real route NFTs, including each publication worker and native closure. These are actual local application results, separate from the updater's 23 offline fixtures and the verifier's 18 additional filesystem fixtures. Mac execution and production deployment remain pending.

## Evidence required before issuing and publishing

1. A clean install from the exact lock, scripts disabled and dev/optional components included. The lock must not change. Registry metadata, tarball integrity, installed versions and preserved direct dependencies are recorded.
2. Real loading of Next, Sharp, the prebuilt native module and the packaged libvips. Global/WASM fallback is refused. Next must resolve the same patched Sharp.
3. The existing five image suites: contract, native decode, isolated worker/process limits, profile media server and message images. Required TAP output is 140 named tests, zero failures, skips, cancellations or TODOs. Tests use synthetic inputs; Auth/RPC/Storage are substituted.
4. A full Next/TypeScript production build of the current candidate with no source drift. The actual compiler command and output are recorded, not inferred from a process exit alone.
5. The real Next NFTs for profile-media, message-images, publication, horse-publication and service-publication must include the corresponding complete Sharp/native/libvips closure. The three publication routes must also contain sanitize.cjs, worker.cjs and image-contract.cjs. A build success alone is insufficient evidence of those dynamically loaded files.

The local Linux run does not execute Darwin native code. The Mac updater performs its own platform-bound native check and the same current-source tests/build/tracing before commit/push. Its recorded stages are reusable only when their exact output, installed inputs, executable identities, source/index and prior receipt remain unchanged. Interrupted/uncertain stages stop. There is no replay of prior releases, SQL, Supabase CLI or production storage operations.

## Security findings and limits

Next and Sharp vendor advisories motivated this update. An advisory's package/version match alone does not prove a reachable Selqiro attack. For example, SVG optimizer issues have configuration/runtime conditions; absence of a UI file format choice alone is not proof that a native parser cannot see untrusted bytes. The existing bounds, ownership checks and isolated listing worker remain material controls.

A read-only npm audit also found existing transitive dependencies. Three compatible packages with production-lock paths are fixed in this lock. The final audit reports 10 affected package names (8 moderate and 2 high), all marked dev:true. These include brace-expansion/js-yaml and consumers of minimatch; they require a separate targeted development-tool maintenance step. A package audit count is not a count of demonstrated reachable application exploits. Do not label this release a complete security audit or all dependencies vulnerability-free. The authoritative final audit JSON is included in the sealed package evidence.

## Sources checked 2026-11-21

- https://github.com/vercel/next.js/releases/tag/v16.4.6
- https://github.com/vercel/next.js/releases/tag/v16.4.5
- https://github.com/vercel/next.js/security/advisories/GHSA-q4gf-8mx6-v5v3
- https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw
- https://github.com/lovell/sharp/releases/tag/v0.35.5
- https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj
- https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w
- Exact target versions/integrities were also read from registry.npmjs.org and verified against the lock and downloaded tarballs.
