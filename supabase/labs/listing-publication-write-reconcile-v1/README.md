# Private write reconciliation v1 — dormant candidate

This lab is NOT a production migration, public API, complete Storage integration,
or proof that every previously issued upload can now be cleaned. No app route,
bucket change, scheduled worker, sign/upload/delete call or publication enablement
is supplied. Preserve existing data and journals.

## Two narrowly eligible cases

1. A closed attempt with a persisted SOURCE reservation whose signing claim never
   started (`reserved`, no claim). Existing claim-sign and cancellation serialize
   through the attempt lock. The reconciler holds that same attempt while recording
   the immutable never-signed proof. Missing grant, `signing`, `recorded`, token
   expiry, browser assertion, logout or 404 are NOT proof. This does not revoke an
   issued signed SOURCE capability.
2. A closed attempt with one previously prepared single WEB write and an unknown
   POST response. Claim reads an exact committed PRIMARY `storage.objects` row,
   including nonzero UUID object ID/version and unique bucket/path. The worker reads
   all protected object bytes and validates the intent hash/size. Record checks the
   same primary row/version again and adds a distinct immutable settlement. It does
   not fabricate a HTTP200/Id/Key acknowledgement and never makes an image ready.

This second case is CONDITIONAL on accepted deployed-provider write-before-metadata
ordering, exclusive immutable paths and no hidden upstream POST retries. Current
public provider source is research evidence, not the user's deployed-version proof.
Metadata alone, custom metadata, ETag, HEAD, read readiness, timeout and 404 never
settle an object. A changed/missing/unsupported primary generation remains blocked.
All issued SOURCE grants and unobserved WEB writes remain launch blockers.

## Reuse and bounded operation

`reconcileWriteOne.ts` uses existing service config, HTTP, byte reader, hash and
contract validation. One claim, at most one WEB GET (4 MiB bound / existing30s), one
record. No sign, upload, delete, publish or automatic retry. The database retains a
60s CAS lease and at most eight attempts; retry waits start30s and double, cap3600s.
Missing/transport evidence waits, mismatches and exhausted jobs remain visible as
`needs_attention`. A new invocation can reclaim an expired lease with a new key;
old keys cannot record. It never re-pins a previously pinned primary generation.

An immutable successful settlement can release only the exact closed target from
`blocked_write_settlement` to `pending`. Existing `cleanupOne.ts` / cleanup RPCs
remain unchanged and perform their normal separate delete/readback/record operation.
Published/open attempts cannot be claimed. Already completed cleanup is not requeued.
A deleted listing with an issued SOURCE still reports deleting/files_remaining.

## Authority and fixture boundary

Two new internal SECURITY DEFINER RPCs are owned by the existing dedicated final
writer; public/anon/authenticated/service_role EXECUTE is revoked. New tables force
RLS with no API table access. The final writer gains ONLY a filtered SELECT of four
primary Storage columns for known private WEB paths, no Storage INSERT/UPDATE/DELETE.
Deployment must review this new read separately; helper privileges do not establish
production grants. Only synthetic tests temporarily grant the two RPCs to service_role,
then roll back. Test helpers remain inaccessible to that role.

`storage-fixture.sql` creates a tiny synthetic provider metadata relation ONLY in
this new isolated disposable database. It is not a copy of the real Storage schema.
The SQL gate rejects any database except selqiro_publication_attempt_fixture and any
setup user except postgres. Existing declarations and helper definitions are reused;
no previous suite is re-executed. No auth/network/provider equivalence is claimed.

## New tests (preparation)

48 Node/HTTP tests plus strict ES2017 compile were actually run in the assistant
Node22.16.0/TypeScript5.8.3 environment. Local HTTP/bytes are real; Auth/REST/Storage
responses and provider mutation are synthetic. Native image processing is absent.
Two explicit counterexamples model repeated signed capability and late admitted
writes; they are logic fixtures, NOT empirical Supabase behavior tests.

Planned SQL:64 rollback +15 assertions in5 two-connection schedules +4 expected
isolation rejections =83. SQL has not yet been compiled/executed in real PostgreSQL
in preparation. Short test leases exercise real trigger transitions, never disable
triggers or inject a production clock. The Mac test runner uses ONLY its own new
networkless PG17.6 helper; real Storage/original local DB/production are untouched.
Do not apply this SQL manually. Whole seller/buyer/anonymous journey remains unaccepted.
