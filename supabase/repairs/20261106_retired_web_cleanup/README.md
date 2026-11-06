# Retired WEB cleanup — 2026-11-06

This candidate completes one already removed, non-primary gallery photo through
hosted Storage and releases that exact WEB reservation only after authoritative
metadata absence. It follows the accepted `20261104_listing_photo_removal`
capability. Installation itself performs no cleanup or Storage operation.

## Scope

The accepted photo-removal RPC removes public gallery membership and retains the
original slot, immutable WEB intent, publication receipt and a cleanup row with
reason `published_image_removed`. This repair supplies the missing narrow hosted
completion path for that row. It does not introduce another ledger, role, table,
queue, bucket, membership rule or deletion endpoint for active images.

Exactly five functions are added:

| Function | Caller | Purpose |
| --- | --- | --- |
| `claim_listing_retired_web_cleanup_v1` | `service_role` | Claim one eligible retired WEB with the existing fresh lease. |
| `record_listing_retired_web_cleanup_v1` | `service_role` | Record the exact lease result; verify deletion before accepting it. |
| `get_my_listing_retired_web_cleanup_v1` | `authenticated` | Read the current actor's exact attempt/request status without cleanup. |
| `hosted_retired_web_deleted_v1` | Existing final writer only | Recognize durable retired-WEB deletion proof. |
| `lock_retired_web_cleanup_context_v1` | Existing final writer only | Share the actor/attempt/publication and current gallery checks. |

The existing `multipart_object_fully_deleted(uuid)` receives one additional OR
alternative. Its accepted completed-SOURCE and previous alternatives remain.
All other retained functions, their permissions, table structures, triggers,
policies and settings must be unchanged across installation.

The three public RPCs require these UUID arguments:

```
p_expected_user_id
p_expected_identity_id
p_attempt_id
p_request_key
```

The recorder additionally requires `p_object_id`, `p_work_key` (UUIDs) and
`p_result` (the existing cleanup result vocabulary). Claim returns the accepted
seven-field cleanup task or literal SQL NULL. Record returns the accepted
three-field object/work/state result. No arbitrary caller-supplied bucket or path
is accepted.

The separate owner read returns exactly:

```json
{
  "schema_version": 1,
  "attempt_id": "<uuid>",
  "request_key": "<uuid>",
  "files_remaining": 1,
  "needs_attention": 0,
  "reserved_bytes": 4194304
}
```

Counts and bytes are derived from existing exact retired-WEB cleanup/object rows.
`needs_attention` is a count bounded by `files_remaining`. The read reports zero
only for an authorized scope with no unresolved retired WEB rows. Invalid scope
or access fails. It neither claims nor mutates cleanup. Gallery corruption does
not make the separate read or existing owner management unavailable.

## Eligibility and proof

Claim requires the existing actor lock and exact attempt/request/identity.
For a published listing it checks the complete accepted gallery under the bound
actor JWT, including the absence of membership for each protected retirement.
Public RLS is never used under an unbound service JWT as proof of absence.

Only `kind='web'`, `dispatch_key IS NULL`, exact original bucket/path and exact
reason `published_image_removed` are eligible. The original ready WEB receipt
must match its immutable slot/source hash and size. Its completed, verified
`supabase-s3-session-v1` session must have known Storage object ID/version and
matching observed WEB hash/bytes, with no diagnostic before first acceptance.
Conflicting Storage versions, unfinished uploads and multipart parts prevent
claim. Already absent metadata is permitted on a retry only with the same
immutable completed-session lineage.

The worker continues to use the existing bounded Storage transport. The SQL
implementation never deletes from Storage tables. A provider ACK alone cannot
release quota: the recorder requires no object at the exact bucket/path and no
upload/part matching either the original upload ID or the bucket/path. If proof
fails, the recorder transaction rolls back, leaving the lease and reservation
uncompleted. Network/timeout/Storage/response uncertainty retains the existing
retry/backoff/attention rules and reservation.

Once accepted, the durable predicate depends on protected retirement,
publication and WEB/session lineage plus that WEB's own current metadata
absence. It does not depend on current public RLS, current publication state,
current SOURCE absence or later diagnostic flags. Later content deletion and
unrelated SOURCE diagnostics therefore cannot recharge the completed WEB.
Actual reappearance of that WEB's object/upload/part metadata invalidates its
absence proof and continues to be visible to existing accounting.

## Preserved behavior and races

- The public photo is already absent before cleanup becomes eligible. A current
  primary or another active photo cannot be selected by the new claim.
- The existing strict gallery validator is unchanged. It already accepts an
  exact retired WEB using retained ready intent and retirement lineage after
  the physical object is absent.
- A new primary selection after cleanup remains available for active photos.
- Whole-listing deletion preserves existing retirement reasons. If it commits
  after dispatch, the exact retired target may still record the result using
  the retained `attempt.deleted` / `publication.deleting` lineage. Claim may also
  resume that prior retired target after whole-listing deletion; newly terminal
  objects with reason `terminal_delete` are outside this capability.
- The accepted SOURCE worker and owner receipt are unchanged. The SOURCE claim
  returns NULL for a terminal attempt, allowing the runtime's SOURCE-first,
  retired-WEB-second fallback. A pass still dispatches at most one deletion.
- `final_receipt.files_remaining` remains SOURCE-only while published. The
  separate owner read supplies WEB pending status, including when SOURCE is zero.
- Generic cleanup APIs remain closed and readiness `cleanup_mode` remains `held`.
  This repair does not fabricate multipart auxiliary receipts or enable generic
  terminal-object cleanup.
- Logical Storage absence does not attest to provider-internal disk erasure.

## Installation contract

`tests/build-guards.mjs` composes retained declarations in a disposable PGlite
instance from the source hashes in `source-pins.json`. It produces `preflight.sql`,
`apply.sql`, `verify.sql` and exact before/after catalog fingerprints.

The report kind is `listing-retired-web-cleanup-v1`. It retains the existing
nine guard keys and three invariant keys used by the installer parser.
Only the exact accepted absent state may apply. Unknown functions/overloads,
permissions, prior declaration drift, disabled guards or a wrong hosted instance
are refused. Applying an already applied repair is refused. The transaction
checks unchanged existing function/authority/structure fingerprints and exact
new capability; failure rolls back the whole install. The unchanged cleanup
reason constraint is pinned as well as included in the structure invariant.

Run this repair's `preflight.sql` first, then its `apply.sql` only for a recognized
absent state, and `verify.sql` to confirm the installed state. The delivery runner
handles those steps. Do not run the old repair installers or broaden their
permissions to obtain an accepted state.

## Focused verification

Current-body isolated results:

- `tests/runtime-result.json`: 22 passing groups covering exact authority and
  scope, read-only projection, SOURCE-counter separation, first-write proof,
  metadata/version/parts uncertainty, leases and retries, idempotency, 4 MiB
  release, active gallery preservation, member revocation and whole-delete
  interleavings, and durable accounting after later diagnostics.
- `tests/installation-result.json`: 14 passing groups covering absent/applied
  recognition, prior contracts and ACLs, unknown overloads/procedures, trigger and
  instance guards, atomic rollback, unchanged invariants, repeated verification
  and post-install drift refusal.
- The initial test-harness syntax failure and the first owner-read authority
  failure are retained as `tests/runtime-initial-*-failure.json`. The read was
  corrected to use the existing `require_managed_image_actor_v1` wrapper, with
  no new privileges. Both current result files identify the final `changes.sql`
  SHA-256.

The tests reuse accepted fixture declarations; they do not rerun old suites.
Synthetic provider metadata is changed only inside isolated tests. PostgreSQL
runs as PGlite/WASM; no native simultaneous-session race, live database,
actual hosted Storage deletion or production deployment is claimed.

To reproduce with the existing local PGlite toolchain:

```sh
export SELQIRO_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js
node supabase/repairs/20261106_retired_web_cleanup/tests/build-guards.mjs
node supabase/repairs/20261106_retired_web_cleanup/tests/installation.mjs
node supabase/repairs/20261106_retired_web_cleanup/tests/runtime.mjs
```
