<!-- SELQIRO_OWNER_LISTING_RENEWAL_BROWSER_ACCEPTED_20260929 -->
## 2026-09-29 — Client accepted for source completion, deployment separate

The original planned 19-file client package is installed and browser accepted.
Preserve its 14 application/test files byte-for-byte during source finishing.
This operation updates only five documentation prefixes and commits the existing
package after a fresh build and explicit COMMIT PUSH. The returned finisher result
is authoritative for the actual new commit/push and clean state; no future hash
or successful deployment is implied by this entry.

Actual Mac installer 29 Sep 14:23-14:24 (+03): 483 client checks and full build PASS;
19 exact paths staged, no unstaged changes, HEAD remains
`08cdf0928910cb54fea616575a14ffe5e68d046b`. Remote equality referred to that base,
not a new client commit or deployment. Evidence:
`owner-listing-renewal-client-20260929-142334-uk14p449.zip`, SHA-256
`93ff7d959346319c9ab8559c05e446c4d16bf942eed3dd1aae1fd83defee9edc`.
Offline review checked all 338 entries/337 manifest hashes/CRC, 305 source triples,
14 exact client/test payloads, five historical-byte-preserving doc additions,
23 unchanged migrations and the staged patch in a real temporary Git index.

Browser basis: the user reports "testides on korras". Supplied desktop screenshots
show elapsed deadlines labelled Aegunud; one flatbed listing changes to Aktiivne
with a 28 December deadline and appears after the earlier three search cards.
Other expired items remain expired. Wanted owner list/detail budget and coarse
search area are retained. This supports the targeted visible flow, not independent
row-ID/created_at verification or every cancel/identity/mobile/error scenario.
No raw application rows were exported to prove those extra points.

Keep all established server/client invariants: same listing, free explicit renewal,
UTC90-day deadline, precise expected-deadline CAS, no status reactivation or ranking
bump, no shortening longer/NULL deadlines, typed acknowledgement, synchronous shared
status/renew lock, account/identity generation checks and read-before-new-consent
on uncertain outcomes. A network abort does not prove rollback. No automatic retry.

The prior server rollout did not invoke renewal. The later user-confirmed browser
renewal is an intentional real write to the configured DB. The finisher makes no
RPC call, runs no SQL and touches no live journal. The 23 applied migrations remain
immutable. Full HTTP authorization, representative volume/concurrency, broad SELECT
policies and legacy direct writers remain separate release validation boundaries.

Next after reviewed source completion: verify that exact active frontend deployment,
then read-only owner/search checks with already-existing content. No additional
renewal write, new collection, schema migration or unrelated polish in this finish.

---

<!-- SELQIRO_OWNER_LISTING_RENEWAL_CLIENT_20260929 -->
## 2026-09-29 — Ordinary-listing activity client candidate

Confirmed source base: `08cdf0928910cb54fea616575a14ffe5e68d046b` —
`Document listing renewal production rollout`, parent `d1f6bae`.
User docs run ended 29 Sep 12:59:46 (+03): real build PASS, exactly five documents /
249 additions committed and pushed, worktree clean and remote main equal in that run.
Evidence `listing-renewal-rollout-docs-20260929-125918-y0t9awlp.zip`, SHA-256
`2eca7bd7ab27dfc25a3347d3fb3ed8efe9da2b6ee826e6b45b5c96299800d661`.
Offline review checked 320 files/319 manifest hashes/CRC, 295 source triples,
23 unchanged migrations, five exact historical-byte-preserving doc prefixes,
copied production/preflight/source manifests and real temporary Git-index patch
reconstruction. That review is not a new Mac/GitHub/DB observation.

This next package is CLIENT-ONLY and not proof of installation or deployment.
It adds typed ordinary-listing deadline presentation and explicit free renewal
through the existing `renew_my_listing_activity_v1`. Original deadline strings
retain microseconds/timezone for CAS; finite input/one-row response checks reject
invalid or inconsistent acknowledgements. No client-supplied new deadline, duration,
identity, status, content, ranking, image/category or Energy mutation is added.
Historical NULL or >=90-day remaining periods do not offer the renewal button.
Server still owns time, authorization, unchanged-longer/null and stale-conflict rules.

My Area derives Aegunud from active status + elapsed deadline, not days-left rounding.
The existing active filter becomes “Aktiivsed ja aegunud”: its backend predicate is
unchanged, and expired records are NOT removed from a partial returned batch.
No expired-only filter or new persisted status is invented. Loaded counts are labelled
as loaded; at 500 show the first-batch limit rather than a complete total.
A local 30-second display clock makes no network requests and never renews anything.

One mounted list session owns read/confirmation/mutation state, synchronous single-
in-flight protection, before/after actor checks and generation-based stale suppression.
No per-card context/detail reads. Auth callbacks only invalidate synchronously; reads
are deferred out of that callback. Identity changes, logout, filter change and cleanup
invalidate old responses/confirmation. A server acknowledgement is distinct from
refresh failure. Conflict/unknown outcome blocks another write until refreshed data
and a new explicit confirmation. Aborting fetch is NOT a rollback guarantee.
No automatic write retry, effect-triggered renewal or bulk operation.

Status changes remain the existing separate API. The shared client gate prevents
status/renewal overlap in this list; no existing status database contract is changed.
A successful operation reloads canonical owner rows. Same-identity/same-filter refresh
keeps the local expanded view. Horse/wanted rows, editors, public search and all
applied SQL remain intact. This is not a global legacy-writer or SELECT-policy repair.

Validation target: 483 client assertions across seven explicit suites, TAP reporter,
serial suite execution (`--test-concurrency=1`), zero failures/skips/cancels/todos,
then the real project build. Preparation uses actual modules with synthetic transport,
clock/hooks/JSX; NOT real React DOM, Mac Next build, production HTTP or a browser test.
Serial execution avoids CPU contention in existing 1.5-second VM fixture limits;
no assertion or old VM timeout was removed. The returned installer ZIP determines
actual Mac test/build/staging success. No commit/push in the installer.

Next: run only the new client installer, review its ZIP and targeted local browser
checks (expired badge, cancel with no write, one deliberately chosen real renewal,
reload/search visibility, paused/sold, filters, wanted/horse and narrow layout).
A browser confirmation DOES change that one existing listing's deadline in its
configured database. Do not create arbitrary fixtures or renew all listings.
After accepted browser evidence, prepare a separate scoped finish and verify the
actual frontend deployment. Do not replay old scripts or edit COMPLETE journals.

---

### Exact client module boundary

Entity: listingActivity (finite timestamp/expiry display), listingRenewal (input,
response and safe errors), getListingActivityActor (authenticated profile context),
renewMyListingActivity (two-argument RPC and bounded 20-second fetch wait).
Feature: ownerListingActivitySession + useMyAreaListings, extracted MyAreaListingRow
and native ListingRenewalConfirmation dialog. Pure filters type and display clock
stay separate. MyAreaListingsSection only composes controls, rows and feedback.
The owner mapper rejects missing/non-string deadlines instead of coercing them to
unlimited NULL; strings are preserved byte-for-byte. Existing wanted-summary data,
budget/currency/location formatting and canonical content keys are unchanged.

Ownership reads are usability/stale-context checks, not a new authorization layer.
The RPC still locks the authenticated profile then its owned listing. It has no
new expected-actor parameter, durable operation ID or system-wide writer fence.
Sequential fake-transport tests do not prove HTTP, multi-session or load behavior.
The client still permits explicit separate status changes via the existing endpoint;
that operation does not extend active_until. No copied general listing is created.

---

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
