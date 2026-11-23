# Account state foundation, 22 November 2026

## Scope

This additive candidate creates one private account-state row for each Auth account.
The only permitted state is `active`. It introduces no closure, restoration or erase
mutation and no public profile/content change. Email confirmation, SMTP and the
separate registration preparation are unchanged.

The accepted source is commit `034211d2ee3dfadd4ba791977c98e310754e4d94`. The
returned live catalog report was observed on 22 November at 19:58:48 UTC and has
SHA-256 `9bd1e79598711cf3f0e6af48239c81dc9d7080922aa184ad64763ae74da691e4`.
`source-pins.json` contains only the metadata required to preserve the eleven known
actor functions, two existing bound triggers, and the Auth account key/column
shapes. All eleven function bodies were matched to inventory-verified source.
This scope is not a complete closure or erasure dependency graph.

## New objects

- Private schema `account_lifecycle_private`, owned by `postgres`.
- Private table `account_states(account_user_id, state, revision, initialized_at)`.
  The Auth foreign key is `ON DELETE RESTRICT`. Revision is a positive bigint.
  RLS is enabled with no client policy or client table/schema grants.
- Internal `initialize_account_state()` trigger function, SECURITY DEFINER with
  fixed `pg_catalog` search path. It inserts once and uses `ON CONFLICT DO NOTHING`;
  it never resets an existing state or revision.
- Auth `AFTER INSERT` trigger `initialize_account_state`.
- Public read RPC `get_my_account_state_v1(p_expected_user_id uuid)`.

The additive table prevents a direct Auth delete from bypassing later lifecycle
handling. The database owner can still administer the database; this is not a
claim that a superuser cannot override its own schema. No deletion feature is
exposed by this foundation.

## RPC contract

The getter is SECURITY DEFINER, STABLE, owned by `postgres`, and uses a fixed
`pg_catalog` search path. Only `authenticated` receives EXECUTE. PUBLIC, `anon`
and `service_role` do not. Its actor comes from the exact observed `auth.uid()`;
it checks the authenticated JWT role directly from PostgREST settings without
adding an unreviewed `auth.role()` dependency. Expected actor mismatch is rejected.
The actual Auth row must exist, must not be deleted and must not currently be
banned. A missing lifecycle row is an error, never an implicit active state.

Exactly seven keys are returned:

```json
{
  "schema_version": 1,
  "actor_user_id": "the current account UUID",
  "scope": "account",
  "state": "active",
  "revision": "1",
  "account_created_at": "2026-11-21T10:11:12.123456Z",
  "read_at": "2026-11-22T20:00:00.000000Z"
}
```

`account_created_at` is the original `auth.users.created_at`, and may be null for
legacy rows. It is not the lifecycle initialization timestamp. UTC timestamps use
six fractional digits. Revision is a canonical positive decimal string within
PostgreSQL bigint range. No profile, identity, business member, media or Energy
lookup is performed. No row lock or mutation occurs in the getter. Neither email
confirmation nor a completed profile is a prerequisite for this read.

Stable SQLSTATE `P0001` message codes are `ACCOUNT_AUTH_REQUIRED`,
`ACCOUNT_ACTOR_MISMATCH`, `ACCOUNT_UNAVAILABLE`, and `ACCOUNT_STATE_UNAVAILABLE`.
Revoked callers can receive SQLSTATE `42501` before the function runs. The client
must show its own bounded text and must not display raw SQL error details.

## Installation protocol

`preflight.sql` is read-only and reads catalog metadata only. It recognizes the
exact observed before state, the exact new after state, or explicit unknown drift.
It checks that the actual `postgres` role has Auth SELECT, TRIGGER and REFERENCES
privileges. Linked-project and explicit CLI project guards belong to the runner;
a constant SQL string is not treated as proof of project identity.

`apply.sql` is single-use. It repeats the before guard in a write transaction,
uses a transaction-scoped advisory lock, and takes a bounded Auth table lock. It
creates the trigger before initializing existing Auth accounts. More than 1000
Auth accounts abort the whole installation. Existing Auth/profile/content rows
are never updated. The only row writes are to the new private state table. The
transaction requests a PostgREST schema reload with NOTIFY; actual HTTP/RPC cache
readiness still needs the deployed portal check.

An after guard and bounded initialization check run before commit. The receipt is
produced only after COMMIT, in a new read-only transaction that repeats the after
and initialization checks. A lost or malformed apply response remains an uncertain
acknowledgement; the runner must use independent verification and must never
repeat apply automatically.

`verify.sql` independently verifies the new schema and bounded initialization in
a read-only transaction. Apply and verify internally read Auth account IDs to
initialize/check their matching state rows. Those IDs, counts and all user content
are excluded from the receipts. Metadata reads cap the own schema arrays and fail
closed on extras. Statement timeout is 20 seconds, lock timeout 2 seconds, and
idle transaction timeout 15 seconds. Read-only transactions end with ROLLBACK.

The target guard pins full new function and Auth-trigger definitions, owners,
function grants, configuration, table columns including generated/identity flags,
constraints, RLS, index count and absence of unexpected private table triggers or
policies. It checks private schema/table/column grants, including inherited grants
for named client roles. Existing actor definitions/configurations and protected
triggers must stay exact.

## Receipt and parser

All three files emit one CLI row `[{"result": {...}}]`. The strict Python 3.9+
parser is `selqiro_state_sql_contract.py`. `receipt-pins.json` carries the exact
base/before/after fingerprints, independently matched to native PostgreSQL JSONB
serialization in the isolated test. Unknown keys, duplicate keys, wrong wrappers,
non-JSON constants, inconsistent stages/flags and outputs above 8192 bytes fail.

`read_only` describes the complete file's behavior: false for apply, even though
its final receipt is gathered in a read-only transaction. `initialization_verified`
is false for metadata-only preflight and true only for successful apply/verify.
`unchanged_contract()` raises on a base mismatch; it is not a boolean that can be
silently ignored.

## Evidence and limits

The final isolated native PostgreSQL 17.6 suite covers 15 cases. It uses a fresh
loopback cluster, a non-superuser `postgres` role with the required Auth rights,
a real non-superuser `supabase_auth_admin` fixture role, and a PostgREST-style
`authenticator` role. It checks concurrent account creation around installation,
the >1000 rollback bound, inherited grant removal, Auth-trigger failure rollback,
missing-state behavior, no-profile reads, ban/deletion/authorization checks,
idempotent initialization, row-lock-free reading, direct Auth delete restriction,
reapplication refusal and schema drift. The strict parser has 23 passing checks.

No live database, real Auth account, SMTP service, Mac runner or public portal was
changed by these tests. Preparation proof is in `../sql-tests/proof`; the cluster
was stopped and its PID file absence was verified. Builders and fixture sources
are preparation tools, not commands for the user's Mac. Do not silently edit an
issued package or a previously accepted source snapshot.
