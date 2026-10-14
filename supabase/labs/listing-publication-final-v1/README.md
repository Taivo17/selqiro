# V2 final publication / terminal content deletion / bounded cleanup candidate

2026-10-13. Dormant fixture-only candidate on source base
`9f3961defbc797518995947bb21196d3208b94b9`. Not a production migration, route,
worker schedule or permission grant to an application role. No existing source
file is edited by this candidate. Mac SQL execution: **NOT_RUN at preparation**.
Later accepted runner evidence, not this preparation-time field, records execution.

## Exact composition

Load only in a fresh disposable PostgreSQL 17.6 helper named
`selqiro_publication_attempt_fixture`: existing attempt fixture, new exact-source
price/message fixture extension, existing attempt/upload/WEB declarations, seed,
then 01 through 07. The delivered test-only runner owns this recipe, network-none
helper, strict source guard, test copy, rollback, concurrency schedules and cleanup.
Do not run these SQL files manually against any existing database.

Existing price/category/basic/detail/location normalizers, actor/member locking,
versioned policy acceptance, immutable attempts, upload grants and WEB receipts are
reused. The price guard changes only structured INSERT permission and authorized
terminal DELETE; its price UPDATE and TRUNCATE branches stay exact. Existing creation
field mapping is copied byte-for-byte; tests/derivation.json records its source.

## Publication

The authenticated caller presents the original attempt/request and expected price.
A new request key is required when the form snapshot or image selection changes.
The SQL final confirmation binds canonical attempt intent, price and every selected
slot's immutable ready receipt. `publish_my_listing_v1` rechecks the actor, active
identity, membership, current accepted policy, normalized input and all selected
images in the same transaction as the listing/image rows. It also checks policy
wall time again after row/image insertion. No Storage call is made in the transaction.

A narrow NOLOGIN/NOBYPASSRLS SQL writer composes the existing public listing and
image shape. The whole transaction becomes visible at commit, not between insertion
steps. Publication starts the 90-day activity period once. A replay returns the
same publication outcome and never renews, creates another listing or resurrects
removed content. The private input payload is cleared; UUID/hash/object lineage and
minimal outcome tombstone remain. Zero images are accepted by the existing attempt
contract; every chosen image, when present, must be ready.

Stable `/api/v2/listing-media/{attempt}/{ordinal}` values point to a **dormant handler**.
The handler serves only the exact verified WEB object for an active, nonexpired
listing and active identity, checks actual bytes/hash, rechecks availability after
Storage I/O, and returns no-store/nosniff responses. It never serves SOURCE or leaks
a private Storage URL. No Next route is installed here. Previously delivered images
cannot be recalled from a viewer; do not promise otherwise.

## Terminal content deletion and messages

`delete_my_published_listing_v1` requires current account/identity access, but not
acceptance of new terms. Active shared-business members may remove their identity's
listing; only the original actor can replay its original publication request.
Before any content is removed, every exact object is retained in durable cleanup.
Then listing/image rows and automatic listing snapshots on linked conversations
and messages are removed atomically. Message text, chat-owned attachments and
participants survive the existing SET NULL listing references. At most 500 linked
messages and 500 conversations are handled in this transaction; a larger case
fails without partially deleting the listing and needs a later bounded orchestration.
Unanticipated foreign keys fail the transaction rather than triggering eager file
removal. Account/identity erasure is still RESTRICTed by retained attempt lineage;
its consent/retention/rekey integration is a separate launch gate in the same V2 work.

An outcome says `content_deleted=true` and `state=deleting` until **all** exact objects
have acknowledged deletion. `deleted` is not inferred from a missing listing.
The original attempt/request tombstone cannot be deleted, rewritten or replayed
into new content. Existing managed image edits/removal and ownership replacement
are refused. Direct legacy API-role writes fail closed at the classifier ACL;
this is not a promise of full V1 compatibility or full live writer integration.

## What cleanup can and cannot do now

One worker invocation claims **one** exact eligible object, with a persisted unique
lease key, 60-second lease, eight-claim maximum and exponential backoff capped at
one hour. It uses one Storage DELETE request, then authenticated absence readback,
then one acknowledgement. Lost replies do not cause an immediate retry or a second
object claim. A stale acknowledgement cannot complete another lease. Fixed error
categories, counts, pending age and reserved bytes are available without copying
private payloads, tokens or raw errors into management output.

Crucially, eligibility is limited to immutable abandoned objects with **no issued
SOURCE dispatch and no prepared WEB write**. A 404 is meaningful only after that
persisted eligible claim and DELETE. Time passing, expiry, a successful WEB receipt,
404 or timeout do **not** settle a previously dispatched external write. Such targets
remain `blocked_write_settlement`, including files from a normal image publication.
There is deliberately **no fake unblocking operation**. Actual late-write settlement
and its trusted provider/writer integration must be completed before publication
opens. This candidate does not yet make normal uploaded files fully deletable.

Confirmed deleted reservations alone stop counting against the existing account
budget; object/request lineage is not reused or erased. Lease exhaustion transitions
are implemented, but the short suite does not wait through eight 60-second leases
or an hour of backoff. Keep this distinction from tests that actually execute.

## Evidence and launch boundary

New Node/HTTP tests use real loopback HTTP with synthetic Auth/REST/Storage responses,
not live cloud services. No native image tests or old suites are rerun. New SQL tests
exercise final transaction, replay, terminal state, role boundaries, snapshot retention,
cleanup eligibility and two-connection ordering, only in the new helper. Source
fragment equality and helper/runner tests are not SQL compilation evidence.

Publication/upload stay disabled. Actual Storage HTTP/CORS/large-mobile upload,
late/uncertain writes, exclusive privileged WEB writer scope, native cloud invocation,
price/live-schema role integration, route/UI wiring, account/identity/message retention,
and seller → buyer → anonymous complete journey are launch gates, not convenience
features. No existing account/listing/image/journal may be deleted by this work.
