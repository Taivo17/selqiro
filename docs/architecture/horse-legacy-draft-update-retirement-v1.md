# Legacy horse draft updates — retirement candidate v1

Base: `86e62d6e2ceff7b3dcefd164c9ac596c998f9cab` (current compatible client).
Candidate migration: `20260916200000_retire_legacy_horse_draft_updates.sql`.
This is local validation/source preparation, NOT an approved production rollout.

## Scope and compatibility

Keep the existing 37-argument `save_my_horse_offer_draft_v1` signature, defaults,
SETOF result, authorization and all first-create normalization/validation/INSERT.
After the existing authentication check, a non-null `p_offer_id` raises SQLSTATE
55000 / `horse_offer_legacy_update_disabled` before active-identity resolution
or target-row access. There is no UPDATE branch and no create-on-refusal fallback.
PostgreSQL input conversion and existing declaration initializers may reject
malformed input earlier; this does not permit target access or any write.

First create (null ID) remains compatible with the deployed client. The returned
initial revision still belongs to that same write. Subsequent saves continue to
use the unchanged `update_my_horse_offer_draft_v1` with matching decimal-text
revision and a closed scalar patch. Existing drafts require no conversion/deletion.
A stale legacy browser must use the current client; refusing it must not create
another offer or reset status, details, location, lifecycle or revision.

The migration uses CREATE OR REPLACE with an exact previous-body guard. It
compares OID, argument/default representation, owner, ACL, search_path and all
other pg_proc metadata before/after. Default expressions are compared in canonical
SQL form, not their internal parse-tree source offsets. Only prosrc and the function
comment change. No new public helper, privilege widening or drop/recreate is used.
The full legacy validation/INSERT is deliberately retained instead of undertaking
an unrelated large SQL refactor. Applied migrations remain immutable.

## Local validation package

The runner accepts only the checked 83-source / 18-migration base and the observed
healthy local Docker target. It never calls Supabase CLI or uses a TCP/database URL.
It checks the actual local legacy/read bodies and the revision-layer state.
If revision is absent, its exact already-reviewed migration is loaded inside the
same outer rollback transaction. Partial or different revision layers fail closed.
A present matching revision layer is used without reinstalling it.

Within one outer transaction:
1. Run the historical legacy-save, owner-read and draft-update suites BEFORE
   retirement, each within a savepoint that is rolled back.
2. The BEFORE fixture file captures 10 successful first creations (minimal/full
   variants for all five types), 12 invalid-create results and function metadata.
3. Apply the candidate without its outer BEGIN/COMMIT; compare first-create rows
   again, excluding only their random IDs. The same actor and transaction preserve
   timestamps. Test current create/CAS continuity and old-ID refusal before/after CAS.
4. Check own/foreign/nonexistent IDs, incomplete payloads, reachable non-public
   statuses, authentication/privileges and untouched rows/side-table counts.
5. Run the new post-retirement update regression, derived from the existing suite.
   Only the obsolete legacy-success block becomes a trusted-write invalidation
   test; no-op, conflicts, bigint, branch, shape and preservation coverage remains.
6. Roll back everything and compare local public catalog, selected table row hashes,
   counts, base function bodies and revision-layer presence with the initial snapshot.

The BEFORE/AFTER SQL files are runner-managed fragments, not standalone commits.
Historical test files are unchanged. Their old update-success expectations are
not mislabeled as post-retirement behavior. Fixed historical fixture IDs are
checked absent before testing. Newly added fixtures use random IDs.
No production table rows or existing local test listings are deleted. The runner
never resets the database or restores an unexpected user change automatically.
Sequence allocation/caches and database statistics are not transactional rollback
guarantees and are not included in the catalog/row equality claim.

After SQL success the existing 57 Node tests run with explicit TAP, then the real
project build runs. Only after these pass are four checkpoint docs updated and
nine candidate files staged. Actual SQL/build outcomes live in the user's result
ZIP; source creation and preparation checks are not execution evidence.

## Cutover and remaining security boundaries — still required

This candidate removes NEW legacy updates after deployment; replacing a definition
alone does not prove that every already-running invocation of its old body ended.
Do not claim global lost-update protection or enable the owner editor from these
sequential rollback tests. No two-connection cutover/drain test is part of this
runner. Before production apply, prepare a separate bounded cutover validation
with at least two real connections, covering a legacy invocation paused before
its horse-row lock as well as one already holding it. Establish how to quiesce/drain
old invocations before reopening writes; a single horse-table lock is not assumed
to cover every earlier point in the function. Do not kill arbitrary backends.
Commit/review of this candidate is not permission to execute it on production.

First creation still lacks atomic expected identity and durable idempotency.
These need their own compatible server/client contract. This retirement does not
solve cross-tab identity races or response loss followed by remount. No publication,
image/Storage, Energy, status lifecycle, category assignment or owner-editor UI
is added. Optional save-later/publish-first and canonical horse_offers remain.

## Evidence context

15 Sep client completion: real 57 tests/build, 27-file commit/push, clean main at
86e62d6. User confirmed wanted persistence, A→B→A isolation and narrow layout.
16 Sep screenshots show Vercel Ready/Production at 86e62d6 and the updated form on
selqiro.vercel.app/v2/sell. This is coherent visual deployment evidence, not an API
alias proof or a new production mutation/concurrency test. Do not repeat these
manual checks or completed runners. Preserve their existing result ZIPs.

User reports the three existing accounts are their own and disposable test listings
may be cleaned later. This is NOT deletion authorization in this package; retain
accounts/identities and representative fixtures. Do not conflate account and identity.

Technical reference: PostgreSQL 17 CREATE FUNCTION (CREATE OR REPLACE retains owner
and permissions, while other attributes follow the definition):
https://www.postgresql.org/docs/17/sql-createfunction.html


<!-- SELQIRO_LEGACY_CUTOVER_LOCAL_PASS_20260916 -->
## 2026-09-16 — local legacy-update cutover evidence and source checkpoint

The real user run `horse-legacy-cutover-local-20260916-220202-jlzrwn9t`
passed at 22:02 (+03:00), using PostgreSQL 17.6 and multiple persistent psql
connections in ONE empty, marked, disposable local database. Its result ZIP SHA-256:
`4b3a73556c8330b6d1b4838397ea2e6601c8d647b4acc06c592065e04a049d51`.
Executed external runner `horse-legacy-cutover-local-v2-capabilities` SHA-256:
`17ae0502d576e747211b150af98d1d9cef5b8e6b2e8e81ded1efae06e6de3196`.
All 51 manifest entries match; its 40 assertion labels include six synthetic
observer-input faults, not 40 distinct full production end-to-end tests.

The exact horse SQL and retirement candidate were exercised. Auth/identity/policy
dependencies were an explicit synthetic fixture, not a cloned Supabase application.
An invocation started before replacement can still finish its OLD body. The early
negative control reproduced a late legacy overwrite of newer SYNTHETIC content.
Bounded waiting stayed closed until old active AND idle-in-transaction work ended;
it did not kill sessions. A genuinely later transaction did not prolong that wait.
Prepared SQL callers used the replacement and refused old-ID updates. Two concurrent
same-revision CAS writes produced one success and one 40001 conflict; revision
advanced once and preserved the winner. Real tracking stayed ON. Live observation
of an owned idle transaction passed; malformed/hidden/disabled/prepared observation
inputs were synthetic fault injection, NOT a live tracking-off or two-phase test.

Only this run's database was removed. Before/after original database catalog,
selected row hashes/counts and database-list hash matched. No original application
schema/data changes, permission grants, tracking changes or production commands.
The earlier full local rollback/regression, 57 TAP Node tests (fake API transport)
and real build remain the 20:37-20:38 evidence, not rerun by the cutover experiment.
The nine-file staged source package and base 86e62d6 stayed unchanged in the test.

Checkpoint completion adds only this evidence to five existing documents and does
not edit the tested migration or SQL tests. Its actual commit/build/push state must
be read from its result report and current Git, not assumed from this document.
The new migration `20260916200000` is NOT production-applied by source completion.
The production-applied `20260913190000` remains immutable. Owner editor stays read-only.

Next after reviewed source commit/push: design the bounded production write-pause /
old-transaction-drain protocol and perform a separate read-only production preflight.
Replace-then-drain is NOT an ingress pause and did not prevent the negative-control
overwrite during draining. These local tests are not approval of an online lossless
production cutover; no APPLY until that separate contract, fresh checks and consent.
First-create atomic expected identity and durable idempotency remain open separately.
No publication, images, Energy, lifecycle, category, or UI unlocking is included.
Do not rerun completed local/diagnostic/cutover runners or delete their attempt journal.
