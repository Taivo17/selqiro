# Account block removal with an observed row version

This repair closes old removal paths after the replacement client is deployed.
It keeps the existing public provider-control RPC signatures and account-wide
block semantics. The installer changes catalog authority only. It does not
delete or update any account block, conversation, message, hide preference,
profile, listing, image, or Storage object.

## Rollout contract

The source updater must first obtain the fresh metadata preflight. It can then
apply, build, commit, and push the new client. The SQL write is permitted only
after the exact new deployment's public capability marker has been verified.
Immediately before that write, run a fresh preflight again. Record one apply
intent, perform at most one apply for that intent, and independently verify.
An unknown outcome requires readback; it is not permission to replay a write.

The new client already works with the previous server: it reads the current
own block row through get_my_provider_control_v1 and confirms removal with
the existing blocked_account target, target token, block ID, and creation
time. Conversation GET resolves the actual saved peer account, including a
business member; it does not substitute a business owner's profile account.
A missing or replaced observed row requires a new user decision.

After server closure, an old unversioned thread-removal call is refused.
Creating a block remains idempotent. A reverse block remains the other
account's property. Message history and temporary hide preferences remain.

## Exact runtime changes

| File | Change |
| --- | --- |
| 01_legacy_block_guard.sql | Keeps the legacy thread true branch. Its false branch raises SQLSTATE42501 instead of deleting an account pair. |
| 02_browser_permissions.sql | Removes PUBLIC/anon/authenticated table INSERT, UPDATE, DELETE, TRUNCATE and TRIGGER; removes column INSERT/UPDATE; grants authenticated INSERT only for blocker_id and blocked_id. Removes those roles' sequence UPDATE/setval privilege. Existing SELECT and sequence USAGE/SELECT remain. |
| 03_cas_delete_authority.sql | Adds one private writer role, an own-row SELECT policy, an own-row DELETE policy, a narrow CAS-delete helper, and an invoker BEFORE DELETE trigger. |
| 04_cas_setter.sql | Reproduces the accepted public setter with exactly one runtime replacement: its already validated DELETE delegates to the private CAS helper and receives its boolean result. The public signature, owner, ACL, target resolution, hide paths and block-creation paths remain. |

selqiro_block_removal_writer_v1 is NOLOGIN, NOINHERIT, NOSUPERUSER,
NOCREATEDB, NOCREATEROLE, NOREPLICATION and NOBYPASSRLS. It receives only
the necessary schema USAGE, auth.uid EXECUTE, and account-block SELECT/DELETE
authority. Its table policies limit it to blocker_id = auth.uid(). The helper
also checks the authenticated actor, the resolved peer, and the exact ID and
creation time. Failure to delete that exact own row raises SQLSTATE40001.

The helper has no PUBLIC/anon/authenticated/service_role EXECUTE grant.
The existing postgres-owned provider setter can call it. The trigger runs
as SECURITY INVOKER, so it sees the actual DELETE executor. A caller-set flag
does not authorize removal.

The owner-transfer sequence temporarily grants postgres SET access and the
new owner schema CREATE. EXECUTE for postgres is granted after ALTER OWNER,
while acting as the new owner. The temporary SET/INHERIT membership and
schema CREATE are then removed. PostgreSQL's automatic creator ADMIN-only
membership remains, pinned exactly as grantor supabase_admin, member
postgres, admin=true, inherit=false, set=false. It is not API-role membership
or runtime SET ROLE permission. A different hosted membership is rejected.

## Already-running old calls

The apply transaction takes SHARE ROW EXCLUSIVE on public.user_blocks before
the catalog transition. Existing writers already holding a conflicting table
lock finish before that barrier; their earlier effects are not undone.
An old function body waiting elsewhere can continue later, but its eventual
DELETE must pass the newly installed table trigger. A JWT-context DELETE
executing as postgres through the old definer is refused. Existing running
functions are not claimed to have changed their already selected bodies.

The local adversarial check executes the exact retained old set_block body,
owned by postgres, after the trigger exists. The observed failure stack
includes guard_account_block_delete_v1 and the row remains. This proves the
DELETE authority boundary in a PostgreSQL engine. It is not a test of a live
two-session deployment, Supabase transport, or production lock contention.

Lock waits are bounded by 3 seconds for the installer; application helpers
retain their 2-second lock timeout. Server statement timeouts are 20 seconds
for read-only reports and 45 seconds for apply statements. They are
per-statement limits, not the runner's whole-process deadline. No session is
terminated and no account row is rewritten during installation.

## Trusted maintenance boundary

The trigger's maintenance exception requires current_user postgres or
service_role, auth.uid() NULL, and empty or missing values for each of:

- request.jwt.claims
- request.jwt.claim.sub
- request.jwt.claim.role

A nonempty JSON JWT context, malformed JSON text, a legacy sub, or a legacy
role-only context does not qualify. There is no bypass setting.

Existing trusted service_role UPDATE, TRUNCATE and sequence maintenance
rights are retained. This repair is not a general removal of privileged
service credentials. It closes ordinary browser/account authority and the
old JWT-context postgres-definer DELETE route. It must not be described as
a prohibition on every possible privileged service-role write.

## Metadata report

preflight.sql and verify.sql are identical read-only transactions. They use
a flat, materialized catalog reader with local jit=off. They read catalog
facts and the known hosted-settings singleton, not account block, message,
conversation, or identity rows. No query texts or secrets are returned.

The report has exactly 12 fields: schema_version, kind, state, recognized,
ready_to_apply, dependencies_ok, capability_absent, capability_present,
fingerprints, invariants, hosted_context, guards. kind is
block-removal-cas-v1 and schema_version is 1. State is absent, applied, or
unknown. Only exact before/after capability fingerprints are recognized.

The nine guards are:

| Guard | Scope |
| --- | --- |
| installer | postgres with CREATEROLE or superuser, schema CREATE authority, READ COMMITTED |
| hosted_context_ready | Exact project/release/instance, enabled and ready singleton, storage authority version |
| actor_roles | API roles exist, ordinary roles are not elevated, private schemas are closed, no ordinary-role memberships |
| account_block_structure | Exact block columns/defaults, baseline constraints and two foreign keys, ready indexes, rules, retained triggers and sequence metadata |
| account_block_policies | Every retained block policy, including existing own-row/browser and contact-writer policies |
| provider_cas_authority | Retained resolver, ownership, locking, snapshot and GET/LIST functions with complete authority facts |
| messaging_guards | Exact thread, sender/peer and bilateral-block helpers plus existing send entrypoints and their authority |
| entrypoint_authority | Retained public thread block, legacy create-only store block and conversation restore functions |
| block_writer_inventory | Reviewed relevant definer writers/callers and dependent block-reading views |

The capability pin includes complete before/after facts for both replaced
functions, the new role/functions/policies/trigger, block table/column ACL,
sequence ACL, effective privileges, and new schema/auth.uid grants.
The final role cannot be selected by browser roles or postgres at runtime.

The three invariant hashes cover retained relevant functions, retained
authority, and immutable structures. Their exclusions are the exact changed
capability objects above. The apply gate compares their before/after values;
it does not assume that unrelated native schema facts equal a focused
fixture. The two real baseline user_blocks foreign keys are explicitly
restored in the local fixture before its complete structure pin is derived.

hosted_context.cleanup_mode = held is a derived retained-contract label,
kept for envelope compatibility. It is not a fresh observation of cleanup
work or Storage state. The other hosted fields are read from the existing
settings singleton. The updater performs no cleanup or Storage operation.

The old provider-controls verifier is historical after this repair. It
correctly returns unknown because its function/authority contract has
changed. Do not edit that released verifier to make it pass. Use this
repair's fresh verifier and preserve the old proof as dated evidence.

## Generation and validation

tests/build-guards.mjs reproduces the one-site setter transformation,
catalog/source pins, changes.sql, preflight/apply/verify, and before/after
examples. The generated SQL compares single-row JSON snapshots with
SELECT INTO STRICT. Predicates use IS NOT TRUE, so NULL cannot approve
a transition. Unknown before state, cardinality mismatch, or failed final
catalog proof aborts the same transaction.

The targeted local checks are:

- runtime-result.json: the actual new RPC and old-body refusal paths,
  generation forgery closure, reverse block/history/hide preservation,
  actual business-thread peer, and maintenance-context boundary.
- installation-result.json: exact report contracts, authority tampering,
  strict cardinality/NULL failure, and transaction rollback after new DDL.
- guard-generation-result.json: reproducible source and module pins,
  expected catalog transition, independent readback, and application-row
  preservation.

The fixture's installer is NOSUPERUSER postgres with CREATEROLE. Validation
uses disposable PostgreSQL/WASM, retained setup declarations and synthetic
accounts. It does not rerun earlier suites or contact a live service. No
local result proves a deployed browser route, a real cloud write, or a
multi-session cutover.

Relevant PostgreSQL17 authority rules:
https://www.postgresql.org/docs/17/sql-alterfunction.html
https://www.postgresql.org/docs/17/sql-grant.html
https://www.postgresql.org/docs/17/ddl-priv.html
