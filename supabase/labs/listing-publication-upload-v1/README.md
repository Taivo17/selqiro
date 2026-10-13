# V2 private source upload issuance — dormant integration candidate

Prepared 2026-10-13 against b3264d136871bb5126b418cc78662cfd29f9f3d5.
This is NOT an applied migration or an open API. Existing 18 private-attempt files,
price/identity/policy modules, image verifier and all 23 migrations are unchanged.

## Implemented in this candidate

The actual HTTP adapters compose Auth get-user, a user-context reservation, a trusted
service one-winner signing claim, one private Storage signing POST, a durable receipt
and a final user-context read. Browser code PUTs exact source bytes straight to the
server-selected private object, without service credentials or Vercel image proxying.
A successful source upload returns only `upload_acknowledged_needs_verification`.
It does not mark an image verified, create an image row or publish a listing.

The service claim reuses the existing account/active-identity locks and policy checks.
It adopts the already Auth-verified actor only under the actual SQL service role; a
browser JWT-body `role` assertion does not qualify. Both auth GUCs are restored. This
trusted role composition needs an actual PostgREST/auth integration acceptance before
opening grants. All function/table/schema API access remains revoked in the lab.

Claim state is reserved -> signing -> recorded, never a replaceable lease. A lost
signing or claim response leaves an uncertain slot: a retry must not mint a new URL.
A lost acknowledgement AFTER the token was durably recorded can recover that exact
same token through a new authorized read. A late response may still be recorded after
cancel/expiry/identity change for bookkeeping, but those changes prevent releasing it.
No remote request is made inside an SQL transaction.

The short-lived upload token is a BEARER SECRET in a private, non-API-readable table.
It must never enter application logs, analytics, URLs in diagnostics or public rows.
One bounded SQL operation erases only an expired token, retaining hash/IDs/time/claim.
No scheduled purge worker or production retention configuration is included yet.
Receipt time is the provider token's exact iat/exp; body decoding checks consistency
only, NOT JWT signature/authentication. The provider verifies the signature; Auth
get-user verifies the user. Only the trusted service can attest a signing response.

## Fixed candidate bounds, not production settings

Source up to 25 MiB, existing per-slot/account quotas unchanged; 10 second RPC budget,
120 second browser PUT deadline, bounded 16 KiB response (Auth 64 KiB), 4096-char token.
One service send window of 30 seconds, provider lifetime expected exactly 7200 seconds,
60-second explicit clock tolerance. Timeout/abort/404 NEVER implies remote rollback.

The existing source object cleanup remains blocked_write_settlement after dispatch.
Expiry or secret erasure DOES NOT release storage quota, delete a file, prove that an
in-flight request ended, or complete cleanup. Existing objects are not modified by
this source package. A stolen already-issued capability cannot be revoked merely by
logout or closing the form. The actual provider write-settlement boundary remains a
mandatory integration/cleanup prerequisite.

## New tests only

108 new TypeScript/Node cases passed in preparation on Node22.16.0 / TypeScript5.8.3.
They include real loopback TCP/HTTP and actual fetch/streams/abort, with synthetic
Auth/PostgREST/Storage responses and bytes. This is NOT a Supabase cloud/CORS test.

New SQL is not executed in the preparation container. The new test-only Mac runner
loads exact existing declarations into a NEW isolated PG17.6 helper, then plans:
89 rollback assertions + 24 assertions in 8 two-connection schedules + 4 expected
READ-COMMITTED-only rejections = 117 NEW SQL checks. These are NOT the prior 195 SQL
suite or prior 109 command/119 native tests. Only the new 108 transport tests run.
The helper uses existing pinned image, no network/binds, readonly root, tmpfs and
verified exec-file transport. It never connects to the user's existing database.

## Still required before enabling the same V2 flow

Real private bucket/ACL/CORS/max-size and trusted RPC role integration; actual provider
signing/expiry/no-upsert contract and uncertain late writes; immutable sanitized WEB
object persistence and content/hash verification; final transactional publication;
bounded durable cleanup/reconciliation worker, terminal listing deletion, account/
identity deletion and messages consistency; narrow legacy unsafe-writer closure.
The current 25 MiB standard-upload route needs actual full-size/mobile reliability
acceptance; Supabase recommends resumable uploads above 6 MiB. Do not claim a 100-byte
loopback test proves that boundary or silently introduce a TUS dependency.

The existing sanitizer is intentionally not rerun or changed here; its Buffer output
must later be copied/rehashed at immutable persistence. No raw source is publicly served.
Seller/buyer/anonymous journeys (create -> find -> detail/profile -> messages -> manage
-> delete) remain unaccepted. Existing data/journals must not be deleted for testing.
No general workflow engine, Energy/payments/AI or full V1 compatibility layer is added.

## Primary interface references checked 2026-10-13

- https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
  Signed upload capability is documented as usable for two hours without further auth.
- https://raw.githubusercontent.com/supabase/supabase-js/v2.103.0/packages/core/storage-js/src/packages/StorageFileApi.ts
  Version matches repository lock. POST sign and PUT upload/sign wire paths; no-upsert.
- https://github.com/supabase/storage/blob/master/src/http/routes/object/uploadSignedObject.ts
  Current upstream checks signature before upload body handling, not evidence of the
  user's deployed Storage version or an upper bound on in-flight writes.
- https://supabase.com/docs/guides/storage/uploads/standard-uploads
- https://www.postgresql.org/docs/17/functions-info.html
- https://www.postgresql.org/docs/17/sql-set-role.html

No live Mac, GitHub, Supabase, Storage or Vercel observation is made by this preparation.
