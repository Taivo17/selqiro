# Upload capacity V1

Status: corrected preflight candidate for `selqiro-uleslaadimise-ruum-20261108-r2`, 2026-11-08.
This change follows the validated successful horse r2 installation at
`6bb438519570faa0e42f56e0670e32965cfd62fb`. Development performed no live database,
Storage or deployment operation. Local validation and final delivery evidence
are distinct from the next Mac installation and Production acceptance.

## Observed preflight stop and r2 correction

The returned first-capacity-package report (SHA-256
`bd8a76d4e3c3d73763ef8acd669dec2ee9d13af89726962c371baba93e3588da`)
records a `DATABASE_PRECONDITIONS_NOT_MATCHED` stop at `baseline_verified`.
SQL application, source replacement, build, commit and push had not begun.
The successful horse-r2 baseline and existing journals remain intact.

The capacity dependency aggregate checks all functions in four private schemas.
Its fixture omitted seventeen private functions from the retained hosted release.
Restoring their exact source definitions and original owner/ACL statements
reproduces the observed existing-function fingerprint
`93b95bd4c438853375365a1480e4fd08dbdddb759d16995f9bbdff15dc240b0e`
and dependency fingerprint
`bd0d02ea9d228af46cf3f6a016bc985a4b7edffffa7c157e94c389440194fa38`.
The absent-capability fingerprint remains
`d043db1cd2e5ab796ad82e82c1281f04670adf36f0861be198befe9012f7b7d1`.

R2 corrects this disposable fixture and its generated installation guards;
it does not narrow the checked scope or permit authority drift. The five
application runtime files and three capacity SQL modules retain the initial
candidate's exact bytes. Prior runtime/build validation is retained evidence;
fresh fixture/installation/package validation is recorded separately. This is
still a prepared candidate, not a successful Mac installation or new Ready.

## Product decision and observed failure

The user intends to allow several hundred listings per account. The exact
product limit has not been decided; there is no agreed permanent 300 MiB account
storage allowance. The old reservation calculation nevertheless accumulated
already published gallery WEB objects with unfinished upload work.

The validated read-only account report observed 259 MiB of reservations:
seven pending published SOURCE objects at 25 MiB each, plus 21 published WEB
objects at 4 MiB each. The user selected two new photos. Every new photo reserves
25 MiB for SOURCE and 4 MiB for WEB, so the old check calculated
`259 + 2 × 29 = 317 MiB`, above its 300 MiB threshold. These values are reservation
budgets, not a fresh measurement of physical file sizes or a provider billing
limit. The report contained no open attempts or charged terminal objects.

## One transient counter

`listing_publication_private.pending_upload_reserved_bytes_v1(user)` is the
shared account-level counter used by the ordinary/photo-addition allocator and
horse preparation. It counts all original-actor reservations that are not
already fully deleted, except a WEB object proven to be part of a committed
canonical published gallery.

| Object state | Transient budget treatment |
| --- | --- |
| Open SOURCE or WEB, or unattached WEB | Charged |
| Published SOURCE awaiting accepted physical deletion | Charged |
| Published WEB with exact ready/canonical gallery membership and no cleanup row | Excluded |
| Retired WEB or cancelled/expired unfinished object | Charged until the existing deletion proof accepts release |
| Fully deleted object according to the existing provider-aware ledger predicate | Excluded |

`upload_object_is_published_web_v1` verifies immutable attempt/slot paths, ready
image facts and canonical content membership. For ordinary listings this includes
original and attached photo-addition origins; for horses it includes the command,
publication event and exact horse gallery/image binding. Temporary public
visibility or a different selected identity does not itself reclassify a gallery.
A removed image is not considered an active published WEB object.

The same observed account would therefore have 175 MiB of unfinished work.
The two new photos fit at `175 + 58 = 233 MiB`, before any SOURCE cleanup.
Existing object reservations and deletion receipts are not rewritten to achieve
this result. The optimized counter retains the existing generic fallback for
accepted legacy/auxiliary deletion proofs, so a faster hosted SOURCE check does
not recharge objects whose cleanup was already accepted. The 300 MiB threshold
remains a bound on unfinished work, not on how many published listings the
account may own.

A prepare with no new photos skips only this transient bytes check, because it
allocates no image objects. Actor, policy, revision, idempotency and other prepare
checks remain in force. The separate rollout guards of three open attempts and
20 new attempts in a rolling 24 hours are unchanged. They are not the future
published-listing allowance; their product policy requires a separate decision.

## Bounded account SOURCE completion

The new service-only RPCs are:

- `claim_listing_account_source_cleanup_v1(expected_user, expected_identity)`;
- `record_listing_account_source_cleanup_v1(expected_user, expected_identity, object, work_key, result)`.

Each RPC locks and rechecks the real current actor/active identity through the
existing service actor boundary. Selection is restricted to SOURCE objects
originally uploaded by that same actor. A different historical identity is
eligible only while the actor still owns its active private identity or is an
active member of its active business identity. Target identity and membership
are locked explicitly; the profile's selected identity is never changed.

A claim requires a published SOURCE queue entry, exact immutable path, verified
completed multipart session and original size/hash, no conflicting provider
version or unresolved multipart writer, and a still attached verified WEB image
with its exact provider object/version. Open, terminal and WEB cleanup are not
selected by this capability. Claims retain existing work keys, 60-second leases,
retry backoff and maximum-attempt behavior.

`createAccountSourceCompletion` copies its two-field scope before its first
await and independently verifies the bearer user through Auth. The server passes
only the copied user/current identity to the claim and recorder. A SOURCE-only
path check precedes the unchanged shared `createCleanupOne` worker, which also
serves separate WEB cleanup capabilities elsewhere.

The unchanged worker deletes only the exact claimed private path, performs a
fresh non-cached Storage readback, and requests a bound durable deletion record.
Physical deletion without a matching record response does not increase the
confirmed completion count. The SQL recorder independently requires the existing
provider-aware SOURCE absence proof; an issued result may still be recorded
after gallery removal. A mismatched lease/work key, revoked access, lost reply or
uncertain readback remains recoverable queued work, not invented success.

One pass ends after 20 confirmed objects, 25 seconds, an abort or the first
unconfirmed result. Errors do not expose service credentials or provider details.
This is a bounded event-triggered pass, not a permanent general cleanup service.

## Prepare recovery and response scheduling

Ordinary prepare, one-photo addition prepare and horse prepare use the same
narrow recovery rule: only the exact structured
`publication_retained_bytes_limit` allocator refusal can start a completion pass.
If at least one SOURCE deletion is durably confirmed, the handler retries the
same captured prepare arguments and request key once. A second refusal, unknown
response or timeout is not retried again. SQL rechecks capacity and all command
conditions in the retry transaction.

A valid ordinary publication or photo append schedules account completion after
the committed response. A validated horse publish/status receipt schedules its
existing horse cleanup first, then the account SOURCE pass. Existing horse
retired-WEB cleanup is therefore preserved. Background work uses its own abort
controller rather than the client's request signal and cannot replace or undo
the publication acknowledgement. Both routes retain `maxDuration = 120`; the
horse callback has two separately bounded passes of up to 25 seconds each.

## Installation and verification boundary

The guarded SQL repair is `supabase/repairs/20261108_upload_capacity/`. It adds
eight functions (six private helpers and two public RPCs) and replaces only the two active allocation
function definitions. It does not bulk-delete Storage objects, reset queue rows,
change account membership or rewrite old reservations. Exact dependencies,
permissions and relational contracts are checked before and after application.

The source package requires the successful horse r2 receipt and the exact
1165-file source tree at the recorded commit. It performs guarded application,
source backup/update, a local production build, a limited commit and ordinary
push through the established updater. See
`../continuity/HOSTED_PORTAL.md` for the single current command.

The retained first-candidate evidence covers 31 worker tests and 36 handler
tests using synthetic external responses.
They verify actor/scope binding, SOURCE-only selection, count/deadline bounds,
unknown-result retention, one identical retry and post-response behavior.
198 relevant existing runtime regressions and TypeScript also passed. Focused
ESLint passed for all five changed runtime files. `npm run build -- --webpack`
completed with exit 0 in 28.29 seconds using synthetic build placeholders, without
production credentials. The initial guard generation, 10 installation drift/rollback cases
and 20 updater cases using temporary Git repositories also passed; that initial
fixture omitted the retained functions described above and therefore did not
establish recognition of the production baseline. All eight SQL
behavior scenarios passed in disposable PostgreSQL/WASM, including 300 historical
listings and preservation of an accepted legacy SOURCE deletion receipt. This
establishes those fixture behaviors, not production latency or native concurrent
scheduling. The corrected r2 fixture/installation checks and exact composed-package
evidence belong to the delivered package's validation report. None of these local results proves a live Storage operation
or Production Ready. The focused user acceptance is to resume the preserved horse
request with the same two source photos and verify both in its public detail.

## Remaining work

The report had zero charged terminal objects; it does not establish terminal
cleanup readiness. Abandoned/cancelled/expired uploads and a persistent general
cleanup service remain separate work. The exact permanent account/listing quota
and rollout-rate policy are undecided. Services follow next using canonical
`services` UUIDs, Publish and My Area Edit/Save; jobs follow the same interaction
model later. Existing EN/ET and the accepted single 9-second ordinary-photo
observation are retained without claiming a universal latency guarantee.
