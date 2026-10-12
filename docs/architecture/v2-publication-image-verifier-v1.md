# V2 publication image verifier v1 — dormant server module

Date: 2026-10-12. Source parent/base: `c8da6f1d3e850ad35da9bf30ea76c8212b964696`.
Status: Mac native/source evidence reviewed; NOT a publication endpoint or deployment approval.

## Current evidence and narrow scope

The ordinary fields at c8da6f1 are committed/pushed and user-accepted in Vercel
Ready/Production. The subsequent Storage context is already collected and reviewed.
Do not repeat those completed steps. The source selection is 463 base / 481 result
files, not the complete checkout. Only the dormant image decoder, declarations,
tests/fixtures and documentation are added. No route imports it. Upload and
publication remain disabled; price, identity, policy, horse, search and owner
modules, all 23 migrations, package.json and package-lock.json stay unchanged.

Actual Mac run on 12 October 19:17 (+03): Node 24.16.0, Sharp 0.34.5 matching the
lock, libvips 8.17.3 and TypeScript 5.9.3; all 119 TAP cases passed without failures,
skips, cancellations or TODOs. The exact installer recorded successful npm run
build exit. Its private raw log was intentionally excluded and was not separately
read. Evidence: image-verification-source-20261012-191732-ga_qx0vo.zip, SHA-256
811e98e82e2528b0a99e3da6b9f93aa9b8960ba0d3ae17a3ed0df217e17fcd18.
All 490 archive files, 489 manifest hashes, 481 source triples and the 24-path
staged overlay were independently reconciled. Preparation on Linux Node 22.16.0 /
Sharp 0.34.1 / libvips 8.16.1 is older, separate evidence, not the Mac runtime.

The recorded 16:17:55 UTC Git state was c8da6f1 with 24 staged paths, no unstaged
changes and no commit/push. It is not a fresh live observation. A separate source-
only finisher updates seven documents and finishes exactly those same 24 paths,
preserving tested code/test/fixture bytes. Its own result must establish commit,
push and fresh clean/remote status. No image/application/SQL tests or build are
replayed merely for these documentation amendments. The handoff renderer is checked.

This source completion makes no database/Storage request or schema change. Push
can trigger the existing deployment automation; Ready status, native packaging,
HTTP uploads/expiry, cloud load and the end-to-end user journey remain unverified.
Existing accounts/listings/images/journals are not authorized deletion fixtures.

## Interface and authority

`src/server/listing-publication/images/sanitize.cjs` exports
`sanitizeListingImage(Buffer)` and the closed `PublicationImageError` code union.
`sanitize.d.cts` is checked using the actual strict TypeScript compiler.
The caller supplies bytes downloaded server-side from an authorized exact object;
filename, MIME, path and a client claim of being checked are not accepted as proof.
The result gives only image bytes, dimensions, format, recipe/engine and hashes.
It does NOT grant upload rights, mark a slot ready, create a listing or clean up.
The returned Buffer remains mutable: rehash the bytes actually uploaded and bind
that hash to the immutable sanitized object before recording readiness in the DB.

## Bounded recipe, not inferred deployment settings

| Limit | This module's enforced value |
| --- | --- |
| Original bytes | 25 MiB (26,214,400 bytes), matching the current V2 preview |
| Input formats | JPEG, PNG and WebP; true signatures plus full native decode |
| Input image | at most 40,000,000 pixels; each edge at most 16,384 pixels |
| PNG/WebP structure | bounded to 4,096 chunks; animated/APNG/WebP animation rejected |
| Public-format candidate | static WebP, inside 2,048 × 2,048, no enlargement |
| WebP | quality 82, effort 4, sRGB, maximum 4 MiB encoded output |
| Native operation timeout | 6 seconds; this alone is not a whole-request timeout |
| Parent subprocess deadline | 12 seconds, then SIGKILL; busy until process close |
| Framed header / stderr cap | 2,048 / 16,384 bytes; raw stderr never retained |
| Parallelism | one job per importing Node process, NOT a global/account quota |

EXIF orientation is applied before resizing. The normal encoder metadata-stripping
path is used; the actual output is checked for absent EXIF, GPS-bearing EXIF, ICC,
IPTC, XMP, comments and orientation metadata. Pixels may still contain visible
private information: this is NOT visual redaction, malware certification or a
promise that every device's photo will work. JPEG trailing material is not copied
into the output. Malformed or warning-producing decoding fails closed.

The child has only LANG, TZ and UV_THREADPOOL_SIZE in its environment. No shell,
Storage/DB credential, NODE_OPTIONS or NODE_PATH is passed. stdout is a size-bound
binary protocol; decoder failures return fixed codes, not source metadata or
native diagnostic text. Real process termination is stronger than rejecting a
Promise while native work continues. Nevertheless this is NOT an OS sandbox or
hard resident-memory limit: process memory, concurrency across function instances,
native dependency patching and Vercel packaging need integration verification.

## Actual tests, separated from simulations

- Real native decoding and child processes: synthetic JPEG/PNG/WebP fixtures,
  alpha, resizing and no enlargement, corrupted/truncated input, size limits,
  output hashes, immutable input snapshot, native warnings and single-process busy.
- Eight EXIF orientation values: check actual quadrant pixel positions as well as
  dimensions. Real EXIF GPS/ICC and PNG text/XMP-bearing cases lose metadata.
- Actual 12-second parent deadline and process death use the unchanged supervisor
  with an intentionally hung SYNTHETIC worker; this is not a native exploit test.
- Synthetic child pipes/events/clock test protocol, bounded output, errors and
  races deterministically. The separate TypeScript case is a real compiler run.
- Fixtures are generated, never copied from user photos. Their generator is
  provenance, not a build step or new runtime dependency. Fixture hashes are stored.

No real Storage request, signed-token expiry test, browser upload, SQL/RLS test,
account/identity switch, public listing view, deletion or production action was run.
A green module test/build must not be relabelled full publication acceptance.

## Integration decisions that remain before enabling publication

1. Private durable attempt/slot ownership, expected active identity and idempotent
   request key must be checked and persisted before issuing any upload capability.
   Use the existing price normalizer and policy/identity contracts, not new copies.
2. Browser originals go directly to a NEW private bucket with a deliberately chosen
   size limit. The saved public listing-images bucket is 10 MiB; this module's
   25 MiB does not change that bucket or bypass its policy. Old public links survive.
3. For the examined Supabase createSignedUploadUrl interface, documentation says
   two-hour validity and no further authentication for the bearer. Client logout,
   route closure or a five-minute attempt timer cannot revoke that capability.
   Exact expiry, no-upsert/replay behavior and late upload settlement require real
   API integration. Retain exact paths beyond the latest issued capability plus
   verified settling margin; do not mark cleanup complete merely after an early
   404. A cleanup tombstone must still cover a late object.
4. Re-encode to a separate immutable server-owned key, never the original key.
   The ready DB record must identify the actual object and digest. No client
   overwrite/delete policy may mutate it after verification. Losing a network
   response is not proof that either storage or DB writing failed.
5. Final publication rechecks actor/current identity, current accepted policy,
   exact price and all selected immutable ready images in one defined contract.
   Never insert private content into broadly readable listings as a mere draft.
   The existing closed creator's early active row cannot be wired unchanged.
6. Exact cleanup tasks must survive cancellation, expiration and terminal deletion,
   protect live/published images and run through the Storage API. Never delete
   storage.objects metadata via SQL. Persist file references before deleting their
   source rows. Deleted request receipts must never recreate content on replay.
7. Add an explicit Sharp runtime dependency/packaging contract before importing
   this module into a deployed endpoint. Verify the child worker and native assets
   in actual Vercel output, function deadlines/memory, bounded download, account
   quotas and durable retries. The existing transitive dependency is sufficient
   only for this dormant source/test stage, not a deployment promise.

## Whole journey: blockers versus later conveniences

Before enabling: coherent price/currency/images/identity/visibility in anonymous
search, detail, profile and owner views; seller contact using existing messaging;
real buyer/owner/anonymous sessions; owner management and terminal deletion;
uncertain response recovery without duplicate creation; V1 writers cannot damage
V2 content. Use only specifically authorized NEW fixtures for deletion tests.
All existing accounts/listings/images/journals must remain untouched.

Minimal operations evidence: failed attempts, pending cleanup age, bytes and safe
error codes; do not copy private contents into logs. Full phone/navigation/onboarding
acceptance belongs to launch. Currency memory, AI, Energy, payments and richer
search are not prerequisites for this publication connection. A general workflow
engine and V1 complete compatibility are explicitly out of scope.

## Primary interface references, consulted 2026-10-12

- https://sharp.pixelplumbing.com/api-output/ (metadata defaults; native timeout)
- https://sharp.pixelplumbing.com/api-operation/ (auto-orientation)
- https://sharp.pixelplumbing.com/api-constructor/ (decoder and pixel limits)
- https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
- https://supabase.com/docs/guides/storage/management/delete-objects

Current user-approved requirements: external
`selqiro-20261012-kinnitatud-v2-avaldamisnouded(1).md`.
