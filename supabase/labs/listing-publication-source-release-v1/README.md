# Recorded SOURCE grant: durable release intent and safe non-release evidence

Dormant V2 integration candidate, based on source commit 5725171. No migration,
public API grant, Storage operation, deployment or publication enablement.
This is part of the existing publication flow, not a general workflow platform.

## Contract

A grant recorded in SQL is not necessarily exposed to the browser. For NEW grants
observed at their reserved INSERT, an immutable coverage marker records that the
release protocol was present from birth. Historical grants receive NO backfill:
absence of an intent without coverage is UNKNOWN, never proof of non-release.

The existing issuer still verifies Auth, account, active identity and the exact
attempt/slot/dispatch binding. It still waits for the signing claim and for the
record RPC before continuing. Its secret-returning getter now requires the actual
service role, records one immutable MAY-HAVE-BEEN-RELEASED intent, and returns its
random release ID only to the trusted server. A second, separate HTTP RPC must
observe that same intent, hash and context before the issuer returns the token.
The confirmation does not insert an intent. This prevents a rolled-back first
RPC from releasing a token with no durable witness. Intent recorded_at is the
statement's observation time, NOT a timestamp of transaction commit or delivery.

The issuer never exposes the internal release ID, forwards browser Prefer/role
headers, automatically repeats a failed request, or re-signs an existing grant.
Missing/malformed confirmation, cancellation, expired grant, changed identity,
changed policy and uncertain acknowledgement produce a failure/reconcile result,
not a token. Old authenticated/anonymous direct getter calls fail by actual SQL
role even if EXECUTE is accidentally granted. The secret RPC's existing postgres
owner is retained; this is NOT proof that production service authority is narrow.

After a terminal attempt, a covered recorded grant with NO release intent can
acquire immutable source_recorded_no_release evidence under the same attempt lock.
Only its bound blocked cleanup row can become pending. Existing cleanupOne performs
actual file removal later. Quota remains reserved until that cleanup is confirmed.
A get which loses its response after commit still leaves an intent: conservatively
blocked, even if the browser did not receive it. An uncovered historical grant,
any committed intent, and inadequate WEB evidence remain blocked after expiry or
secret purge. This is NOT revocation of a released signed URL or provider quiescence.

## Scope and compatibility

One existing application file is replaced: issuePrivateUpload.ts. Nine paths are
new: settlement worker, this README, lab SQL, one Node suite and five SQL test files.
Existing pricing, identity, policy, image verifier, final publication, old cleaner,
previous no-release/write-reconcile witnesses and migrations are preserved.
Only two existing cleanup-eligibility functions gain a proof alternative.

The new issuer and revised getter are a matched contract. Deploying only one side
fails closed; no V1 compatibility layer is added. No new route invokes these modules.
The launch remains closed until exclusive service routing, no secret logging or
bypass writer, real Auth/PostgREST transactions, private Storage HTTP/CORS/large and
mobile uploads, native cloud image processing and the full seller/buyer/anonymous
journey are accepted. Existing accounts, listings, images and journals are retained.

## New tests, not a claim of production readiness

52 new Node/loopback tests use actual issuer/cleaner code and synthetic Auth, RPC,
Storage and transaction outcomes. No native image worker or real Storage is called.
The SQL suite plans 87 assertions: 66 rollback checks, 15 checks in five schedules
(four lock waits, one same-account different-attempt skip) and six isolation
rejections. The rollback suite tests loss of an uncommitted intent and denial of
confirmation. Its service-role pair is a ROLE check within one transaction, not
an HTTP commit-boundary test. HTTP durability is modeled here and needs real
PostgREST acceptance before launch. Historical test suites are not rerun.

This candidate is prepared for an isolated PostgreSQL helper test. An external
result package records whether the actual Mac test ran and passed. This README
alone never means SQL compiled or production integration passed.
