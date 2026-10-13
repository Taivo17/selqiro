# V2 verified WEB image: dormant candidate, not a migration

Base: 33b485b. This new connection uses the existing private attempt, upload grant,
Auth/identity/policy locks and existing `sanitizeListingImage` worker. No route,
UI, grant, bucket or live publication is enabled. The repository is unchanged.

## Exact flow

Auth GET -> one persistent per-slot native claim -> bounded authenticated source GET
-> exact source bytes/hash -> existing sanitizer -> own copied output bytes/hash
-> acknowledged DB write intent -> ONE Storage POST (`x-upsert:false`)
-> bounded authenticated full WEB GET -> actual bytes/hash comparison
-> guarded persistent ready receipt. Final publication must consult this DB receipt,
not a client-provided flag, Storage ETag, HTTP upload acknowledgement or metadata.

Replay never reprocesses or resends a WEB write. A prepared row can be reconciled by
reading the exact object, including after a lost POST or ready-record response.
A lost processing/prepare acknowledgement can leave an unresolved slot. There is no
lease takeover or automatic retry. This conservative availability limit must be
represented truthfully in the future UI; cancellation/expiry retain cleanup lineage.

Limits: source <=25 MiB, WEB <=4 MiB, output edge <=2048, existing native recipe and
12-second supervisor unchanged; one binary/native operation per Node process;
source/readback/POST each <=30s, processing intent <=120s and send-start window <=30s.
These windows do NOT prove a remote write finished or was revoked. Cross-process
cost/quota limits still rely on the existing attempt contract and need cloud acceptance.

## Necessary cancellation correction

The old lab's cleanup state depended only on SOURCE dispatch. A started WEB write
would otherwise appear `pending` and could arrive after an early cleanup.
`02_close_write_fence.sql` replaces only the two dependent lab function bodies,
using a shared exact-object predicate, and guards cleanup INSERT. Once WEB intent
is prepared, cancellation/expiry retain `blocked_write_settlement`, even after an
upload acknowledgement or a ready receipt. No Storage file is deleted or quota released.
Existing 01..05 source files are not edited; this is an explicit later lab composition.

## What this does NOT prove

The new code makes its canonical WEB path write-once; every subsequent call only reads.
It does not remove the provider service key's general Storage privileges. Before opening,
prove exclusive authorized writers for this prefix and prohibit replacement/deletion
outside the durable cleanup contract. RLS alone does not restrict a service key.
No production Storage schema/trigger/policy is guessed or changed by this package.
A hash/readback observation is not protection against an unrelated later privileged writer.

All WEB bytes remain private. Final public delivery, final publication, actual bounded
cleanup, terminal deletion, account/identity/message consistency and the full
seller/buyer/anonymous journey remain required in the SAME V2 work, not optional polish.
No existing accounts/listings/images/journals may be deleted. No general workflow
engine, full V1 layer, Energy, payments, AI or search extras are added.

## Tests and execution boundary

The new Node suite includes four actual existing-worker connection tests using stored
synthetic fixtures, plus contract/HTTP/failure tests. Local HTTP Auth/REST/Storage is a
synthetic model, not real Supabase. Native runtime versions are recorded per run.
The old 119 native, 108 upload, 195 SQL and 109 command suites are NOT executed.

SQL test files are NEW: exact rollback labels, eight two-connection schedules, eight
READ COMMITTED boundary rejections. Existing fixture/attempt/upload SQL is used only
as dependency declarations. The runner reconstructs the whole synthetic helper schema
between schedules; it does not disable immutable triggers or add runtime bypass flags.
Tests use real SQL roles with temporary grants inside rollback cases, not production ACLs.
SQL compile/execution status is NOT_RUN at preparation; only the user's future helper
result can establish its actual PASS. See the external preparation report for Node results.

Source candidates are not installed, staged, committed or applied. Only the NEW test
runner may run in its exclusively created network-none helper, after fresh local Git
and source checks. It never contacts the original local DB or a cloud service.
