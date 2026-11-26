# Job writes: account availability fence v1

This append-only release adds account admission to new job commands. It changes
`jobs_private.mutate(uuid,uuid,uuid,text,jsonb)` and adds the private helper
`jobs_private.require_available_accounts_v1(uuid,uuid)`. The four existing public
RPCs, their arguments and their permissions stay unchanged.

## Resulting behaviour

The existing actor and identity authority runs first. A completed request with
the same actor, identity, operation, key and payload returns its stored receipt
as before. A different payload with the same key still fails as a conflict.

For a new request, the writer resolves canonical ownership from the locked
identity: `identities.user_id` for a private identity and
`business_accounts.owner_user_id` for a business identity. Both the acting
account and canonical owner must have an available Auth row and an active,
positive-revision lifecycle state. Actor and owner may be the same account.
The helper checks that account once.

An unavailable account raises SQLSTATE `42501` with
`job_account_unavailable`, before any policy acceptance, job mutation or receipt
insert. The check also applies to a new request key whose requested change would
otherwise be a no-op. Existing client handling already maps `42501` to its
forbidden state; no client change is part of this release.

Covered entry points:

| Existing RPC | Operation |
| --- | --- |
| `save_my_job_v1` | Create or edit a job |
| `publish_my_job_v1` | First publication |
| `set_my_job_status_v1` | Change publication status |
| `renew_my_job_activity_v1` | Renew activity deadline |

The existing `jobs_private.require_actor` and shared listing actor guard remain
byte-identical. This deliberately avoids altering other domains or owner reads.
No account, job, receipt, message, policy-acceptance or file row is migrated. No
existing table, policy, role membership or ACL is changed. The new helper is
owned by `postgres` and is not executable by application roles.

## Lock order and closure boundary

The existing authority retains profile, identity and membership locks; for a
business identity it also retains `business_accounts FOR SHARE`, so the
canonical ownership link cannot change during the command. The new helper sorts
the distinct account UUIDs and, for each account, takes `auth.users FOR SHARE`
followed by `account_lifecycle_private.account_states FOR SHARE`. Locks last to
the caller's transaction end, including its job and receipt writes.

A future closure implementation must commit its Auth/state transition before
changing profiles, identities, content or conversations in a separate
transaction. Combining state locks and a later profile lock would invert the
existing writer's profile-to-account order. This release does not implement
closure, remove the active-only foundation constraint, or claim a complete
account lifecycle.

The isolated tests exercise both real orders with separate database sessions:
closure first makes the new writer wait and then reject; writer first makes
closure wait until the job and receipt commit. The closer only locks Auth and
changes lifecycle state. It does not mutate a profile to manufacture contention.

## Catalog contract and execution

The baseline comes from accepted source/catalog pins available at commit
`c66a39b96c8d204382413a7ab652e66898782f18`. The old job mutation and its dependencies
were recorded in the accepted job repair catalog. Their current production
state has **not** been freshly observed during this preparation. A fresh exact
production preflight is required before this release can be applied.

`expected-contract.json` pins:

- The previous mutation body and function metadata, including arguments,
  result, security mode, owner, configuration and ACL.
- Twenty-five existing authority, policy, normalization, owner-read and public
  writer dependencies, with their exact bodies and metadata.
- Job schema and job/category/receipt relation structure, constraints, indexes,
  triggers, policies and ACLs.
- The accepted account foundation, Auth structure, account read predicate,
  contact write helper, `auth.uid()` and canonical identity structure.

Catalog queries read metadata only. They do not select account or content rows.
An unexpected body, dependency, permission, overload or structure yields an
unknown preflight result or aborts the guarded apply. The function catalog bound
includes all expected functions plus one unexpected function, so a changed
catalog cannot be accepted by silently truncating the expected set.

Use the reviewed updater's bounded SQL transport and execute these complete
files. The fragments are review material, not separate installation steps.

1. `preflight.sql`: a read-only transaction recognizes exact `before` or `after`
   metadata. Only a trusted `before` authorizes a new apply.
2. `apply.sql`: one schema transaction takes the release advisory lock and
   relevant relation locks, checks exact `before`, creates the helper, replaces
   the mutation, checks exact `after`, then commits. A fresh read-only snapshot
   rechecks `after` and emits the apply receipt **after COMMIT**.
3. `verify.sql`: a separate connection independently checks the committed
   `after` state in a read-only transaction.

Do not infer a commit from an empty response, command exit status alone, or a
later `after` observation without the required acknowledgment. Do not rerun an
apply to repair an unknown state. Preserve the runner's recovery and receipt
rules. Apply intentionally rejects an already installed `after` state.

## Strict runner interface

`sql_contract.py` accepts only the bounded UTF-8 JSON envelope
`[{"result": {...}}]`, at most 8192 bytes, with exactly the required keys. It
rejects duplicate keys, non-JSON constants, invalid booleans, extra rows/fields,
stage mismatch and fingerprints inconsistent with the claimed state.

The interface is `read_result(raw_bytes, stage)`, `trusted(report, state=None)`
and `unchanged_contract(current, original)`. The last function raises on drift.
An `unknown` result is never trusted. Apply and verify must both identify the
exact installed state; all privacy flags must say that account rows were not
read or exported. SQL entry files are each below the runner's 512 KiB limit.

## Isolated evidence and reproduction

`proof/native-report.json` records 39 passing cases on real PostgreSQL 17.6.
These include private and business writers, an active business member with a
different canonical owner, missing/invalid/deleted/banned accounts, all four
operations, same-key replay, denied commands without receipts, transactional
rollback, canonical-owner changes and actual row-lock contention. Metadata
before and after confirms preservation of the tested non-target catalog.

The fixture uses real accepted authority, policy and job function bodies.
`auth.uid()` is a synthetic JWT-setting reader; the unrelated hosted Storage
readiness dependency returns true; identity/Auth/policy relations contain only
minimal synthetic data. These substitutions are listed in
`proof/fixture-provenance.json`. Transaction tests replace only the expected
fixture BASE facts; the production BEFORE/AFTER target body and ACL constants
remain unchanged. A separate case proves that the unmodified production
preflight rejects the synthetic BASE. This evidence does not substitute for
production preflight or actual user-path acceptance after deployment.

To reproduce in an isolated workspace, provide the accepted base repository as
`SELQIRO_JOB_WRITE_BASE`. Run `python3 tests/build_fixture.py` from this release
directory. This regenerates the pinned release and synthetic fixture. Then run
`node tests/native.mjs` with `SELQIRO_TEST_RUNTIME` pointing at a directory that
provides `pg` 8.16.3 and `@embedded-postgres/linux-x64` 17.6.0-beta.15. Optionally
set `SELQIRO_PG_BIN` to the directory containing PostgreSQL 17.6's `postgres`,
`initdb` and `pg_ctl` executables.

The native harness creates a disposable cluster under `native-runtime/`, binds
only loopback TCP on port 57439, and stops it after testing. Its database and
roles contain synthetic data only. Runtime files and failed intermediate
reports are not part of the release payload. The production updater does not
run this isolated preparation suite on the user's computer.
