# V2 single WEB write completion — dormant candidate

2026-10-14. Base: `b05c98dca11e008e99114e85679e024403fa49e2`.

This is the first narrow part of the remaining external-write finality work, NOT a
complete SOURCE/WEB deletion protocol. No production migration, API route, bucket
change, timer/worker schedule or UI activation is included. Upload/publication stays
closed. Existing data and operation journals must not be deleted.

## Contract

The unchanged prepare RPC grants one WEB send. Only that branch of the verifier
performs a POST. Its complete HTTP 200 JSON response must contain exactly a nonzero
UUID `Id` and the exact server-assigned bucket/path `Key`. Before any readback/ready
receipt, the server records those bound facts plus the already persisted intent's
hash/size. This internal RPC is not a browser-facing completion callback. Replays,
404, expiry, a timeout, success status without a full valid body, or later ready
readback never create this completion record. A saved completion with a lost RPC
reply remains durable; without a saved completion the WEB target remains blocked.

The SQL locks the attempt before cleanup, as cancellation does. Prepared WEB
intent/claim fields are immutable and read without an additional UPDATE privilege.
A late completion may be recorded after cancellation/deletion or a current-user/
identity change: it checks the ORIGINAL bound actor/identity, and requires actual
server authority, but does not reacquire permission to publish or reopen the attempt.
The completion row is immutable. It can release only its own blocked WEB cleanup
row without changing path, reason, count, retry, or any other field. Existing lease,
backoff and cleanup API code are reused. Active and published WEB files remain
ineligible. A stale completion never requeues a deleted cleanup row.

## Authority and provider assumptions — required before deployment

The service role is trusted to report its OWN full POST acknowledgement honestly.
The returned provider ID is not a cryptographic provider attestation. The proposal
relies on there being exactly one permitted dispatch and no automatic middleware/
proxy retry or independent privileged writer which can reuse this WEB path.
That operational/exclusive-writer boundary has NOT been validated in the actual
cloud. The actual Storage service version and success response contract must be
checked in a separately approved integration test before enabling this code.
The retained existing schema/API ACLs do not by themselves prove these assumptions.

Upstream reference, consulted 2026-10-14 (master is moving, NOT the user's deployed
version): Supabase Storage `createObject.ts` awaits `uploadFromRequest` and replies
with `{Id, Key}`; uploader completion awaits the backend and metadata transaction.
https://github.com/supabase/storage/blob/master/src/http/routes/object/createObject.ts
https://github.com/supabase/storage/blob/master/src/storage/uploader.ts
A signed SOURCE upload URL is reusable within its validity window. Its successful
request does not establish finality for every other use of the same URL:
https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
Storage SQL metadata is not a substitute for deleting actual objects via the API:
https://supabase.com/docs/guides/storage/schema/design

## Still unresolved

All issued SOURCE objects and WEB writes without this complete persisted
acknowledgement stay `blocked_write_settlement`. No blanket deadline or polling
unblock is added. Thus ordinary listing content can be removed while SOURCE files
remain pending; this candidate must NOT report full terminal deletion. Handling
unacknowledged/late writes and tightening exclusive privileged access remain
launch blockers, as do real Storage/CORS/mobile/volume/native-cloud checks, account/
identity/message consistency, route/form connection, and seller/buyer/anonymous
end-to-end acceptance. No generic engine or full V1 compatibility layer is added.

## New tests only

`tests/listing-publication-web-completion.test.cjs` exercises real loopback HTTP with
synthetic Auth/REST/Storage and a synthetic sanitizer, using the project ES2017 /
strict / lib settings. No old native worker tests or old Node suites run.
34 NEW Node cases include three checks of the adapted previous WEB test fixture.
That existing fixture now models the full provider acknowledgement and completion
RPC; its original 85 test bodies are not replayed, and no new 85-suite PASS is claimed.
New SQL: 44 rollback assertions, four two-connection schedules (12 assertions), and
two isolation rejections = 58. Old schema/SQL helper declarations are dependencies,
not an old suite replay. SQL tests require a NEW isolated PostgreSQL 17.6 fixture.
Preparation-time SQL status: NOT_RUN / NOT_COMPILED against PostgreSQL here.
Only the actual new run result can establish SQL PASS. The test runner never writes
to the repository and never contacts the user's existing database or real Storage.
