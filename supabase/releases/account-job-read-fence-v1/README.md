# Account job read fence v1

Prepared from accepted commit `a9d86e63ab667545598da8e40ee2a2d0c7365df3`,
tree `e5e7d7d2253c7c89ff09bbd84d3e501674c2de90`, 2,227 tracked files.
This release changes exactly two function bodies. Preparation, isolated SQL
proof, a future Mac run, real schema application, commit/push, deployment and
user acceptance remain separate evidence stages.

## Scope

| Function | Change |
| --- | --- |
| `jobs_private.visible_to_viewer(uuid)` | Require the canonical owner's existing `account_lifecycle_private.account_is_available(uuid)` alongside the unchanged owner and bilateral block conditions. |
| `public.get_public_profile_jobs_v1(text,integer,jsonb)` | After unique active slug resolution, check the canonical owner's account; set `identity_value=NULL` when unavailable before selecting jobs. |

Private ownership uses `identities.user_id`. Business ownership uses
`business_accounts.owner_user_id`. Job creator, legacy business identity user,
business member and viewer identity cannot substitute for that owner. Missing
owner, Auth user, account state, invalid revision, deleted Auth user or a future
ban denies account availability through the unchanged account helper.

The profile content CTE, pagination and return tail remain byte-identical. An
unavailable owner gives the established wrapper with `identity_id:null`,
`items:[]`, `has_more:false`, `next_cursor:null`, the requested slug/limit and
`read_at`. No private account reason is exported. Slug ambiguity is resolved
before account eligibility. An otherwise available profile blocked by the
viewer retains its previous identity plus empty items behavior.

Detail and search inherit the restriction from their existing shared helper
call. The actual detail/search definitions, `jobs_private.is_public`, public
fields, cursor parser, search document, category dictionary, owner read-lock
repair, contact, actors, writers and ACL remain unchanged. Provider hiding
continues to affect discovery only; bilateral blocks still affect detail,
search and profile items. The exact salary strings, publication status,
expiration and stable `published_at,id` cursor remain as before.

`account_states` still permits only `active`. This release does not activate
account closing, restoring or deletion, change registration/email behavior,
rewrite content/receipts/messages, or finish account lifecycle enforcement.
Writes, contacts, media and sessions require their own bounded follow-up work.

## Exact catalog contract

`catalog-query.sql` reads catalog metadata only. It retains the complete prior
service base and service after-state as exact nested invariants. Those preserve
the previously accepted account, profile, ordinary listing, horse and profile
marketplace gates. No prior target is relocated in this module.

The job scope adds the two targets, thirteen unchanged source-derived function
dependencies, the exact `public.jobs` and `jobs_private.categories` table facts,
and `jobs_private` schema authority. Function metadata includes full signature,
argument names, return type, owner, language, volatility, security-definer,
strictness, parallel/leakproof flags, defaults, execution settings, body hash and
ACL grantor/grantee/privilege/grantability. Table facts include all live columns,
defaults, constraints, indexes, RLS, policies, triggers and ACL. Same-name
unexpected overloads alter the observed dependency set and fail the contract.

The selected job facts are compared exactly to
`supabase/repairs/20261122_job_owner_read_lock/catalog-pins.json`, whose accepted
job-after fingerprint is
`0be7544243260b409badb5a5f09dee9308663d089236acdfdef421b34b1173ef`.
All fifteen function facts and both table facts match that source basis in native
PostgreSQL 17.6. The new two-target after-state differs only in each body hash.
The previous service receipt does **not** prove the current live job catalog.
The future Mac updater must obtain a fresh exact matching preflight before
applying this module; no unknown catalog is accepted.

The account helper/actor/media dependencies already retained by earlier nested
bases stay authoritative. This bounded catalog is not a complete database dump,
and does not inventory every unrelated writer or comment. No source/runtime
catalog observation here is presented as a live Supabase observation.

Format: `selqiro-account-job-read-fence-20261124-v1`.

| Pin | SHA-256 |
| --- | --- |
| Base | `4068bf5b98264d93cc16e36debd840fcedb703da181650ccd38960927643a982` |
| Before | `a37b43d94c4efba55b9269b25500db8b81943f3eeb7f7ef8f4d73f3e07087bf1` |
| After | `d46f912a58c7101528f25ee2801aaf0c76c449e6f4bb59c3f763cdf58986807f` |

Preflight is 132,611 bytes, apply 401,601 bytes and verify 265,193 bytes. Each
retains the 524,288-byte transport ceiling.

## Transaction and receipt boundary

Preflight runs read-only. Apply obtains its transaction advisory lock, guards
exact before-state, replaces the two bodies, guards exact after-state, requests
PostgREST schema reload and commits. Its acknowledgment is a fresh catalog read
**after COMMIT**, in a new read-only transaction. An independent verify runs a
separate read-only after-state check. Second apply is refused. If a transport
result is uncertain, read-only reconciliation is required before any further
write decision.

The strict standalone Python parser accepts one CLI envelope
`[{"result":{...}}]`, exactly the known fields, bounded bytes, proper types,
matching stage and fingerprints. Duplicate keys, extra fields, wrong stages,
unknown before/after combinations and malformed envelopes are rejected.
`account_rows_read` and `account_rows_exported` are false for installer receipts;
application availability checks are separate and necessarily inspect the
requested canonical owner's eligibility. Receipt hashes are not digital
signatures; the runner separately preserves command and output provenance.

## Native proof

The current focused successful run is `sql/tests/runtime02` with report under
`sql/tests/runtime02-proof`. PostgreSQL 17.6 / Node v24.22.3 passed **60 named
cases, zero failures**. Internal assertions are not counted as separate cases.
No earlier broad suite was rerun.

Coverage includes private/business owners, missing Auth/state, invalid state
and revision, banned/deleted users, missing/unknown ownership, legacy creator
and member nonfallback, anonymous/authenticated/owner/absent actor reads,
private table denial, both block directions, discovery-only hiding, unique/
missing/ambiguous slug, invalid input/cursor, search filters, stable pagination,
pre-limit account filtering, published/draft/paused/closed/expired jobs and
read-only transactions. Ban end equality is inclusive; job expiry equality is
exclusive, verified in same-statement boundary blocks. Static categories are
unaffected by owner availability.

The active old/new full JSON matches except `read_at`, the expected wall clock
of separate statements. This is not mislabeled byte equality of changing
clock fields. The wire proof contains 22 actual synthetic native responses with
valid caller request identities even when the returned profile identity is
null. Client parser checks consume those responses separately.

The exact apply and separate verify receipts are reparsed using the delivered
Python module. Synthetic rows and request/contact receipts remain unchanged
across installation and all rollback-scoped cases. Thirteen focused metadata,
ACL, index, constraint or overload drifts make preflight unknown and verify fail.
An injected exception between replacements rolls the first replacement back;
no successful acknowledgment is returned. Drift before apply also preserves
both original targets. The successful cluster stopped with no postmaster PID.

Two preceding **fixture compilation** failures are retained in
`runtime-prepare01` and `runtime-prepare02`: the first lacked the baseline
business name column; the second attempted retained contact-owner restoration
without the fixture superuser. `runtime-prepare03` compiled successfully.
Those fixture corrections did not change the two proposed target bodies.
The first native run and wire (`runtime` / `runtime-proof`) are also retained.
Its direct synthetic numeric insert used `2000.50`; the unchanged client parser
correctly rejected that noncanonical money string. Accepted job writes first
normalize it through `normalize_listing_price_v1` to `2000.5`. Only the synthetic
seed/assertion changed, and runtime02 verifies that exact native normalizer output
before comparing the job salary. The first fixture sources and delivery map are
retained under `runtime01-source`; no production target or client parser changed.
All owned preparation clusters have stop/status proofs; existing clusters and
live services were not touched.

## Fixture and scale limits

These tests compile actual accepted functions on an isolated native PostgreSQL
server. Shared retained setup declarations, exact source fragments and the
complete inherited input closure are hash-pinned. The fixture uses minimal
support relations for nonexecuted writer/member/contact declarations and a
synthetic business-name default to permit the inherited account builders.
These support tables do not claim full writer or conversation integration.
Invalid state/revision/orphan-Auth tests relax only local fixture constraints
inside rolled-back transactions; production constraints are not loosened.

Native setup and receipts prove this bounded SQL behavior. They do not prove
Mac process handling, network execution, HTTP/Storage cache invalidation, email
or browser behavior. Sharing uses the same public job read for fresh requests;
this does not promise immediate deletion from external caches or old image URLs.

Root preparation owns a separate bounded performance experiment. This SQL
proof makes no production scale guarantee. The per-candidate account check
remains inside the existing visibility helper; a page limit alone does not
bound all candidates or account checks. Performance findings belong with the
separately captured candidate counts, owner counts and actual plans.
