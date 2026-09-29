<!-- SELQIRO_LISTING_RENEWAL_PRODUCTION_DOCUMENTED_20260929 -->
# Current status — 29 September 2026: server applied, client not connected

This current section supersedes historical candidate / not-deployed / next-apply
statements below. The original contract and test history remain intact.

## Verified production checkpoint (28 September, not a new live observation)

Source: `d1f6bae1ea57ba78bec87f025c4d5df1d6e7ecef`, clean and remote-equal at the
end of the user's 21:14:55–21:16:51 (+03) rollout. Subject:
`Add explicit owner listing activity renewal contract`.
Project `vyjletlmwoiwxsnsunlm`; migration
`20260928160000_add_owner_listing_activity_renewal.sql` is APPLIED_VERIFIED.
Immutable migration SHA-256:
`0bfc32ce5a3eb9dfa7ac9d3a1328a9567ad9ff3c1c6b35eec04e12e92f1fec61`.

Evidence ZIP: `listing-renewal-production-rollout-20260928-211455-2k5t_ztu.zip`.
SHA-256: `db5c1f987c37197d49f9e0c713e95b7b9c86e8874bc4d826f14d352f8d0a0947`.
Result: `PASS_LISTING_RENEWAL_PRODUCTION_APPLIED_VERIFIED`. One explicitly
approved CLI dispatch, exit 0; two post observations, history 23/23, exact stored
migration SQL and no pending post-dry-run migration. Journal chain:
APPLY_INTENT -> APPLY_RESULT -> COMPLETE. Preserve it; never replay this apply.

`renew_my_listing_activity_v1(text,timestamptz)` matches the committed function
body, signature/result, settings and comment. Owner is postgres. Explicit grants
are postgres/authenticated/service_role, not PUBLIC/anon; saved effective checks
agree. Execution still requires an authenticated user and authorized active identity.
The rollout verified existing public DDL unchanged apart from six function-related
statements; 1354 prior statement fingerprints remain. Invariant SHA-256:
`842bd33392e6115932e0d665d4276ed48f0ca1b0dd7ba9cb236ac914f8f21562`.

Offline review checked 87 archive files/86 hashes/CRC, nested manifests, the executed
runner against the prepared script, 295 selected source hashes, 23 migration Git
blobs, four saved metadata responses/history and copied journal linkage. Full raw
schema dumps remain private on the Mac; offline comparison used the saved statement
fingerprints, not the unavailable raw dump bytes. These are schema-only snapshots,
not application-data backups. Later ChatGPT failure was not a failed database apply.

## Not performed and remaining boundary

No renewal RPC invocation, application-row reads/writes or listing deadline changes
in rollout. No original local DB change, source edit, build, SQL replay, browser
or deployment verification. Earlier 74 isolated-PG17.6 assertions and helper
rollback/cleanup remain prior evidence; not full Supabase, HTTP, concurrent-connection
or load tests. Existing broad listing SELECT policies and legacy direct writers
are unchanged separate launch issues, not closed by this additive endpoint.

This docs-only checkpoint changes five existing documents, not the applied SQL,
fixture/tests or application. Read its returned result for actual build/commit/push
and new commit SHA. Do not infer execution from prepared documentation.

## One next implementation after reviewed documentation completion

Typed entity API, feature hook and compact owner confirmation UI: Aegunud /
Uuenda kuulutust, exact original deadline CAS, server UTC 90 days, free single-listing
confirmation, one in-flight action, identity/stale-response protection and refreshed
owner state. A lost response is uncertain; refresh before a fresh confirmation,
never retry blindly. Do not rewrite the timestamp through a precision-losing Date
serialization. Keep NULL/longer-deadline no-ops and paused/sold actions separate.
Preserve original ID/content/created_at/images/category/Energy/creation-order ranking.
No persisted expired status or complete counts derived from partial-page filtering;
inspect existing owner query/pagination before implementing those controls.
No bulk renewal, new horse behavior, automatic content-edit renewal, public search
expiry relaxation, or speculative future features. Build and targeted desktop/mobile
browser tests precede a separate client source finish. Never rerun completed SQL,
preflight/apply/finish scripts or modify any live operation journal.

---

# Owner listing activity renewal v1

Base: `ea4063b6b1f0ef3e390d9193cab48a5701f205a7`.
Candidate migration: `20260928160000_add_owner_listing_activity_renewal.sql`.
This is a server-only candidate, not a deployed renewal UI.

## Audited cause, not a search regression

The 28 September source collector preserves clean main/local origin-main at ea4063b.
It ran no network, SQL, build or writes. Its 27 September saved public schema is
historical DDL, not a new production observation. V2 `updateListingStatus` only
updates status; `updateListingBasics` updates content/search text, not active_until.
`MyAreaListingsSection` derives its green selector from raw status independently
of its days-left message. Public search correctly requires active status and a
future deadline (with the existing legacy NULL exception).
The selected actual schema has no ordinary-listing renewal RPC and its only
listing trigger recomputes the search vector. The listings table has active_until
but not the showcase-only updated_at/last_confirmed_at/published_at fields.
Do not invent those fields or claim showcase lifecycle already applies to listings.

## Minimal mutation contract

`renew_my_listing_activity_v1(p_listing_id text, p_expected_active_until timestamptz)`
returns one row with listing_id as exact decimal text, status, active_until, changed.
Both arguments are required. The expected deadline is a precondition, never the
new deadline. Accept only a canonical positive bigint ID, at most 19 digits.

Authority: authenticated auth.uid; lock that actor's profile before the listing;
check the current active identity via the unchanged
current_user_has_identity_access helper; lock only a listing belonging to it.
A listing of another identity, even of the same account, is forbidden. A legacy
NULL identity is not adopted via user_id. Business access follows the existing
active-membership helper; this adds no new membership/role policy.

Only stored exact status `active` is accepted. Paused, sold, draft, archived,
unknown and NULL status fail without a write. This endpoint cannot change status.
An expired active listing becomes publicly time-eligible only after this explicit
confirmation. Existing search/profile visibility predicates are not weakened.

A matching finite previous deadline is required under the row lock. A mismatch
returns SQLSTATE 40001 / listing_activity_conflict. Retain the user's context and
reload the owner row before any fresh confirmation. Do not auto-retry with a new
expected deadline. This is compare-and-set on the deadline, not a content revision
or a full operation-ID idempotency ledger. Replaying an old successful request
cannot extend the period again, but returns a conflict rather than its first result.

New deadline: database clock at execution + 90 * 24 hours, function time zone UTC.
Never use the browser clock or accept a duration/new-date parameter. A longer
existing finite deadline is a no-op. A legacy NULL deadline is also a no-op:
currently it means no expiry to public reads; do not silently shorten that policy.
Infinities are refused. Earlier renewal of an expiring active listing is supported
by the server for a future explicit confirmation UI.

Only active_until is assigned. ID, identity, creator/actor metadata, created_at,
all content, images, category relations, boosts and Energy remain untouched.
The existing search-vector trigger still executes normally on real updates;
there is no trigger bypass. Canonical content is not duplicated, reordered or
rewritten. A renewal does not make the original creation order newer.
There is no charge, Premium condition or Energy movement.

Function settings fix search_path, UTC and a 2-second lock wait. They restore on
return/error; no global/server-role settings are changed. Migration has scoped
2-second lock and 15-second statement bounds. No new index or data backfill.
PUBLIC and anon cannot execute; authenticated/service_role can execute but still
need an actual user and authorized active identity. Existing table grants/RLS and
legacy V1 writers are not altered. This is not system-wide legacy writer retirement.
The old broad listing SELECT policy is an independent privacy boundary to review
before launch; this endpoint does not claim to fix it.

## Owner UI next, after separate production rollout

Show expired active ordinary listings as `Aegunud`, not green `active`.
Offer `Uuenda kuulutust` with the compact confirmation:
`Kinnitan, et pakkumine on alles. Kuulutus on uuesti nähtav 90 päeva.`
The UI sends the original deadline exactly as received, uses one in-flight action,
checks active identity and stale responses, and refreshes from the returned deadline.
Keep paused/sold actions visibly separate; status selection alone is not renewal.
Use `Aktiivne`, `Peatatud`, `Müüdud`, `Aegunud` presentation labels without inventing
a new persisted status value. Active/expired owner filters must agree with the
server and pagination; do not filter a partial page and call its count complete.
Missing expiry retains its separate legacy meaning. Horse rows keep their current
contracts. Editing already expired content is not implicit publication.

The broader earlier policy for substantive edits to still-active content remains
a later implementation boundary for ordinary listings; do not add automatic edit,
gallery or category triggers merely to fix explicit expired renewal.

## Evidence and limits

Runner creates only a new pinned, networkless, no-host-mount disposable PG17.6
helper using the already cached image and known binary paths. It never connects
to or modifies the original local Supabase database/container or production.
Fixture: seven selected actual table CREATE definitions, selected keys, exact
current identity-access helper and listing search-vector trigger, synthetic auth
and restrictive fixture privileges. This is not a complete Supabase installation
or production-ACL/HTTP/load test. No application data or keys are copied.
The suite covers auth/identity/business access, expired renewal, rejected states,
NULL/infinite deadlines, exact bigint IDs, server UTC time, stale deadline replay,
no shortening, untouched columns/relations and rollback. Sequential stale-call
tests are not independent-connection race tests; do not claim the latter.
Before/after catalog, grants, constraints, indexes, triggers and empty-table hashes
must match after outer rollback. The disposable helper alone is removed.
Only after tests and cleanup pass does the runner write eight source/test/docs
files, run the existing build and stage exactly those eight paths. No commit/push.

Read actual SQL_PASS, rollback, cleanup and build results from the returned ZIP;
preparation alone does not mean that the Mac SQL/build has run.
Then review, source checkpoint, separate fresh production preflight and approved
additive apply, post-verification, then typed client/UI. Never rerun an old apply
or modify a production-applied migration. No bulk renewal of existing listings.

## Confirmed product scope

28 September user screenshots show ea4063b Ready / Production and successful
anonymous keyword/category/location search. The user's search acceptance stands;
expiry is a newly discovered management gap, not a reason to weaken public filters
or replay the completed search rollout. Exact multi-page browsing and load remain
outside this visual evidence. Launch focus stays listings/services/contact/management;
future knowledge/news/commerce modules remain deferred, with extension boundaries only.

## 28 September test-comparator correction (v2, not a production change)

The actual 18:32 v1 run stopped after 48 passing assertions with
`RENEWAL_ASSERT_FAILED: all_other_listing_columns_preserved` (psql exit 3).
It captured JSON snapshots before switching the test caller to Pacific/Auckland,
then compared them with new JSON in that different zone. Timestamp formatting
therefore made unchanged values compare unequal. This is a source-level test
defect; the old run is NOT a full SQL pass. It exported no per-column row diff.

The v2 suite uses a test-only UTC snapshot function for BOTH sides of all listing
and related-row comparisons. No timestamp or content column is ignored. Five
new assertions reproduce the raw timestamp representation difference before
renewal, verify matching instants/canonical rows, and require actual timestamp
and title differences to remain detectable. All 69 original assertion labels
remain; 74 total are required. The full v2 SQL run, not this preparation, must
prove the corrected comparison and all remaining assertions.

The production-candidate migration and seven-table fixture remain byte-for-byte
identical. No permission, duration, status, renewal writer or UI change is made
by this correction. Only the SQL test/comparator, external runner diagnostics
and five candidate documents differ.

The 18:32 failure had matching before/after catalog/ACL/seven-empty-table
snapshots and confirmed helper removal; repository HEAD/index/worktree stayed
clean at ea4063b with all 291 source hashes unchanged. No build, source writes,
staging, commit/push, original DB connection or production command occurred.
Do not rerun the v1 installer. The v2 runner first verifies the exact failed ZIP
and its embedded collector, then runs only in a NEW isolated helper. It writes
the eight candidate source/test/docs paths only after all 74 checks, rollback
and helper cleanup pass; the existing build then precedes exact staging.

Read the returned v2 result before claiming SQL/build PASS. Full Supabase ACL,
HTTP authorization, concurrent races, production and browser behavior remain
separate validation boundaries. No source finish or production action yet.


<!-- SELQIRO_LISTING_RENEWAL_SOURCE_ACCEPTED_20260928 -->
## 2026-09-28 — Explicit ordinary-listing renewal: reviewed local PASS and source checkpoint

The corrected user run ended at 19:16:05 +03:00. Evidence:
`listing-renewal-local-20260928-191538-045yg193.zip`, SHA-256
`bf79b02f6285553dd472e4109d7e710132f64de3be920235699291acf415a700`.
Review checked all 376 archive files / 375 manifest hashes and CRC, all 295
source size/blob/SHA triples, the exact runner and eight candidate payloads.
A real temporary Git index reconstructed the staged patch against the exported
base and matched all 295 selected final sources. No new remote observation was
made during that local run or this off-device evidence review.

Real isolated PostgreSQL 17.6 evidence: all 74 uniquely labelled checks passed
in the expected order with exit 0 and the exact final PASS marker. Before/after
catalog, ACL, constraints, triggers and seven-empty-table snapshots match.
The same networkless helper was removed and its absence checked before source
writes/build/staging. The user's Selqiro build passed. The original local
application database and production were not contacted; no persistent renewal
schema was installed there. This supersedes the earlier pending v2 test state,
not the historical fact that v1 stopped after 48 checks.

The UTC comparison correction is proven by the full 74-check run: raw timestamp
text differs across the tested zones; canonical snapshots match; changing a
creation timestamp or title is still detected. No preservation column was
excluded except the intentionally modified active_until. Renewal migration and
fixture remain byte-identical to the v1 candidate. Do not rerun either installer.

Source-only finish: commit `Add explicit owner listing activity renewal contract`
from base `ea4063b6b1f0ef3e390d9193cab48a5701f205a7`. Only the eight reviewed paths
belong in that commit. This finisher adds five documentation entries, preserves
the migration/test/fixture and application bytes, requires a fresh build and
explicit COMMIT PUSH, then verifies the scoped child commit, remote equality and
clean worktree. Actual completion/new SHA belong to its result, not this planned
entry. No SQL/test replay, Docker, Supabase, apply or UI connection occurs here.
Normal configured Git hooks/CI may run; deployment is not verified by this step.

Renewal remains free, single-listing and explicit: matching prior deadline,
server-resolved active identity, exact stored active status, server UTC 90 days,
no content/status/creation-order/image/category/Energy changes or duplicate.
Legacy NULL and a longer deadline remain no-ops; stale repeat requests conflict.
This is deadline compare-and-set, not general content revision or a durable
operation-ID ledger. Existing direct writers and broad SELECT policies are not
retired or fixed here. Synthetic auth and restrictive fixture ACL are not full
Supabase/HTTP permissions, parallel-connection race or performance evidence.

Next, only after the source-finish result is reviewed: fresh read-only production
preflight for the new commit and `20260928160000`. Check dependencies, actual
function/role privileges, listing triggers, existing schema and migration history;
no APPLY in that preflight. Separately approved additive rollout and verification
must precede the typed owner renewal UI. Preserve working public search and its
expiry exclusion. The present Minu ala raw-active/expired presentation discrepancy
remains until the later Aegunud / Uuenda kuulutust client patch.
