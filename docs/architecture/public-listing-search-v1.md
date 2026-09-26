<!-- SELQIRO_PUBLIC_DETAIL_KEYWORDS_SOURCE_ACCEPTED_20260926 -->
## 2026-09-26 — public detail keywords: real isolated test accepted

Base: `4eb7333e508ef8e6bec472698df4d156298e5b95`
(`Add public listing search read foundation`). The reviewed local run ended at
2026-09-26 18:56:33 +03:00. Evidence:
`public-listing-detail-keywords-local-20260926-185525-oeibgkr3.zip`, SHA-256
`800495c6f3843da974b5269357c60e93a61fae25691191674ecc39ee5914a7ad`.

All 261 expected SQL assertions passed on real PostgreSQL 17.6 in a NEW networkless
helper using the reviewed five-table synthetic fixture and restrictive grants.
The whole test batch matches both exact migrations and ONLY the new detail suite;
the earlier 66 checks were preserved, not rerun. Helper catalog/privileges and all
five empty tables matched before/after rollback; the same verified helper was
removed. The original local application DB and production were not contacted.
The actual Selqiro build passed. HEAD stayed `4eb7333`; eight exact files were
staged, with no unstaged changes, no commit/push and no fresh remote query.

Review verified 66 archive entries / 65 manifest hashes and CRC, the exact supplied
runner, eight payloads, five byte-preserving documentation additions, 252 source
baseline hashes and 255 final source hashes. A real temporary Git index reproduced
the exact staged patch and all available source bytes. This was artifact review,
not another SQL/build/browser/production run.

The new source keeps named category fields as free text and indexes only approved
top-level string/number values at 163 exact category paths (312 distinct keys,
maximum 19 keys per path). Arrays, booleans, nested JSON, unknown fields, private
location/coordinates, raw AI and configured identifier/document exclusions are
not searched through details. No category names or key names are injected.
`Audi A4 automaat` cross-field AND, numeric text, all allowed paths, negative
privacy/shape cases, existing public visibility/blocks/counts/pagination, fixture
writer index maintenance and planner usability passed in the isolated suite.
No translation, synonyms, prefix/typo matching, unit conversion or numeric ranges
are claimed. Index text windows remain 4096 title / 32768 description / 1024 per
allowed detail value; source texts are not rewritten.

The completion runner amends only five documents, verifies the exact eight-path
scope and all 22 migration files, requires a fresh passing build, and gates
commit/push with `COMMIT PUSH`. The SQL migration, SQL test and allowlist JSON are
preserved byte-for-byte. Actual commit/hash/push status comes from its returned
result, not this document's preparation. Normal Git hooks/CI can run; deployment
is not certified by a source push.

Next after reviewed source completion: a separate READ-ONLY production preflight
for `20260926120000` and `20260926180000`. Verify actual history/schema, effective
roles/grants, default grants, public-source compatibility, bounded-text coverage,
existing index dependencies, table size and lock-safe index rollout. Use minimized
metadata/aggregate observations; do not export listing/user text or execute test
writes. Do not APPLY automatically or repair history. Ordinary transactional
CREATE INDEX can block writes; actual table/lock findings determine the later
explicitly approved rollout. Do not change the frozen immutable helper without a
new function/index version or an explicitly controlled rebuild. Exact counts,
large offsets and broad matches remain cost limits; no load, HTTP or production
role-inheritance test is claimed by 261 correctness assertions.

The typed search client and compact open/close filters are NOT connected yet.
Ordinary listing search is this contract's scope; it does not publish or add horses
to public results. The existing owner horse editor, wanted list/detail, publication
boundaries, images, Energy and routes stay unchanged. Preserve all completed
operation journals. Do not rerun completed installers, SQL suites, APPLY or finish
scripts. If a runner stops, review its ZIP before retrying; do not reset/restore.

---


<!-- SELQIRO_PUBLIC_DETAIL_KEYWORD_EXTENSION_20260926 -->
## 2026-09-26 — bounded public-detail keyword search candidate

Base source checkpoint: `4eb7333e508ef8e6bec472698df4d156298e5b95`,
`Add public listing search read foundation`. The source-finish evidence from 17:51
passed build, exact eight-path commit/push and final clean/remote equality checks.
All 281 archive manifest hashes and all 252 exported source hashes were reviewed.
That source finish did not run SQL or apply the search foundation to production.

### This candidate, not a deployed capability

The separately dated migration
`20260926180000_add_public_listing_detail_keywords.sql` follows the unchanged
`20260926120000_add_public_listing_search.sql`. It adds a pure frozen immutable
`public_listing_search_document_v1` helper and an active-listing GIN expression
index, then updates only the keyword source and query-local planning configuration
of `search_public_listings_v1`. Its card shape, ordinary-listing scope, public
eligibility, account-block semantics, category/condition/public city-country
filters, counts and newest-first pagination remain the existing contract.

The existing category fields remain free text. Category selection remains separate
from listing purpose. There are no new dropdowns, UI controls, save paths, horse
publication, images, Energy changes, bookings or marketplace transactions.

### Reviewed searchable content

The frozen registry in
`supabase/tests/fixtures/public_listing_detail_search_v1_allowlist.json` records
163 exact category paths and 312 distinct allowed keys from the reviewed
`lib/categories.ts` and `lib/categoryFields.ts`. It follows the existing create
form's `getCategoryFields(detailCategory || subcategory)` selection, but validates
the full parent path. Unknown, incomplete or inconsistent paths contribute no
detail text; public title/description still work. No category names or field names
are injected as keyword values. This includes ordinary equipment/supplies paths,
not live horses or other live-animal offers.

Only top-level strings and numbers at allowed keys contribute. Arrays, nested
objects, boolean values and nulls are not reinterpreted. No recursive details JSON,
old search_text/search_vector, raw AI, private coordinates/location or unknown
keys are used. The helper reads no tables and only transforms supplied arguments;
its explicit anon/authenticated/service execution grants expose no stored data.
Existing table grants and RLS are unchanged by the migration.

Configured exclusions are intentional, not a statement that all these fields were
previously private: VIN, serial/IMEI/registration/marking identifiers, document
references, online-account text, the district field and legacy listing_type remain
outside the new detail-keyword scope. CamelCase legacy aliases and duplicated
standalone vehicle columns are not guessed. Words explicitly published in the
title/description remain searchable regardless of these detail-key exclusions.

Search stays `simple` + plain-word AND, not stemming, translation, typo correction,
prefix matching, numeric ranges, unit conversion or a synonym service. For example,
`Audi A4 automaat` can match values across title, description and allowed detail
keys when those words actually exist; `automatic` is not silently translated.

### Bounded indexing and scale limits

The index document includes at most the first 4,096 characters of the title,
32,768 of the description and 1,024 of each allowed detail value. The largest
reviewed field set contains 19 keys. Original saved strings are never truncated or
rewritten. Existing unusually long content outside these windows is not matched;
review that compatibility boundary before production rollout. These limits keep
index work bounded without adding a new rejection rule to ordinary writers.

GIN uses the identical helper expression and an immutable `status='active'`
predicate. Expiry, active identity/profile and block visibility stay in the query.
`force_custom_plan` is scoped to the search function so optional inputs are planned
using the current call's values, and is restored on return. This is not a global
PostgreSQL tuning change or a promise that every query selects the index.

Changing the frozen helper/registry later requires a versioned replacement index or
an explicitly controlled rebuild; replacing an immutable helper in place without
rebuilding its dependent index is forbidden. The current migration uses ordinary
transactional CREATE INDEX; it can block writes in a future rollout. A separate
production preflight must assess actual table size/locks, data compatibility,
permissions and both pending migrations. No production command exists here.

The new suite tests 261 assertions, including all 163 registry paths, hidden-field
negative cases, malformed shapes, cross-field AND, representative categories,
blocks/counts/pagination, expression-index maintenance by a fixture writer, and
planner usability with a test-local disabled sequential scan. That plan check is
not a latency benchmark or proof of the actual production RPC plan. Exact counts,
large offsets and broad result sets remain cost risks. Representative-volume query
plans/timings, concurrency and HTTP/role integration remain release checks before
claiming launch readiness or millions of concurrent searches.

### Execution boundary and next action

The new runner only uses a fresh networkless helper with the already-reviewed
PostgreSQL 17.6 image. It does not connect to the original local DB or production,
copy account/listing data, read real keys, install/pull packages, access operation
journals, change the UI, commit or push. It initializes the existing five-table synthetic
fixture in the new helper. It then loads both source migrations and only the new
extension suite inside one outer rollback transaction, and compares the helper
catalog/privileges/empty rows after rollback. The earlier 66-assertion test is preserved, not replayed.
Only verified helper cleanup permits the eight source/test/document writes,
fresh build and exact staging. Inspect the returned result for actual PASS/FAIL;
preparation checks are not the user's Docker/SQL/build run.

Next after a reviewed local PASS: separately finish this exact source checkpoint;
then perform an approved production preflight/rollout before connecting the typed
client and compact open/close mobile filters. Do not repeat completed finish/apply
scripts or expose unsupported UI promises. The existing owner editor and wanted
list/detail remain working, not reverted to read-only.
<!-- SELQIRO_PUBLIC_SEARCH_SOURCE_ACCEPTED_MVP_20260926 -->
# Public listing search v1 — accepted local source boundary, 2026-09-26

The original candidate below is retained as historical exact scope. Its isolated
66-assertion SQL suite, catalog/ACL/five-table rollback, owned-helper removal and
build passed on the user's Mac at 16:19:20 +03 on 26 September. Evidence:
`public-listing-search-local-20260926-161832-ol_3bwuc.zip`, SHA-256
`2b52361f6376f45fcfa0d7563bef76cbcf426edb23daf7de078d98b25ef8cbb2`.
This is not full Supabase/production HTTP/role-inheritance or load-test evidence.
Source completion preserves the migration and both SQL test/fixture bytes and
changes only five documents in the existing eight-path scope. Consult its result
for actual build/commit/push; no migration is applied or UI connected by finishing.

## Current approved follow-up (supersedes the old Next sequence below)

Finish/review the source checkpoint, then add category-aware PUBLIC scalar detail
values to keyword search as one separately tested bounded extension. The user
approved keeping present named free-text category inputs and deferring exhaustive
attribute dropdowns and per-category filter construction. Input shape and search
UI are separate choices; existing data must not be rewritten or guessed.

Current v1 deliberately searches ONLY title/description; the no-gearbox-detail-match
test remains true. Do not claim make/model or every additional field is searchable.
Before expansion, review active `lib/categoryFields.ts`, the category path,
persistence and public presentation. Define explicit allowed key/type/length and
category applicability; exclude private/unknown keys, exact location, internal or
AI payloads, and ensure match/count cannot disclose them. Reconcile the index
expression with that exact public document rather than old `details::text`.
Add tests for cross-field keyword matches, unknown/private data, wrong category,
malformed scalar/container values, unchanged rows, public eligibility/blocks and
pagination. This is not implementing all category-specific numeric/range filters.

Plan query/index cost before public exposure. The 66 checks certify correctness
only in their fixture, not public-traffic readiness. The current computed vector
and exact materialized count can require substantial work; measure real plans and
representative volume separately. Keep a small modular search foundation, no
unjustified external engine or ranking complexity. UI help may describe supported
keywords only after implementation; words do not imply ranges, typo, synonym or
prefix behavior. General price/currency, proximity and purpose filters still need
their own authoritative contracts. Production preflight/approval and client/browser
QA remain separately controlled. No helper test or old APPLY should be replayed.

---

# Public ordinary-listing search v1 — source candidate

Base: `2fd7145f03cb333fec315b520b3b9cba97e54540`.
Migration: `20260926120000_add_public_listing_search.sql`.
Status: isolated local validation candidate; not production-applied, not connected to UI.

## Audited reason

`useProductDiscoveryListings` currently requests `getProductListings({limit:30,offset:0})`.
The two marketplace RPCs have pagination/optional center inputs, not query/category inputs.
V1 `app/page.tsx:loadMarketplace` builds a filtered `query` but dispatches a different,
unfiltered RPC. Its later in-browser filtering cannot establish complete search results.
Do not reuse that control flow or filter an already limited page as portal-wide search.

The existing category source is `lib/categories.ts` (`CATEGORY_TREE`). Root/subcategory
are `listings.category/subcategory`; the optional third level is `details.detailCategory`.
V1 chooses fields through `getCategoryFields(detailCategory || subcategory)` from
`lib/categoryFields.ts`. `lib/category-fields.ts` is not the same active definitions file.
Car `gearbox` is a free text field; motorcycle `transmission` is a different key.
Do not present an automatic/manual selector as reliable until shared canonical values
and explicit legacy-value handling exist. No original data is rewritten in this step.

## Input

`search_public_listings_v1(p_search_query text='', p_category text=null,
p_subcategory text=null, p_detail_category text=null, p_condition text=null,
p_location_query text='', p_result_limit integer=24, p_result_offset integer=0)`.

All supplied criteria are intersected **before** sorting/count/pagination. Text is
trimmed; null/empty means no criterion. Search is PostgreSQL `simple` plain full-text
AND across public title and description only. It is case-insensitive word matching,
not substring/prefix/fuzzy/AI matching. Nonempty punctuation-only input returns zero
matches, not a silent unfiltered feed. Search and location text are limited to 160 characters.
Location is literal case-insensitive substring of `city + country`, never raw location
or coordinates. `%` and `_` are literal characters, not wildcard patterns. There is no
country-alias conversion or proximity/radius interpretation in this contract.

Category codes use the existing lower-case/underscore code format. A child requires
its parent. Unknown/mismatched literal paths match nothing; they do not drop filters.
The function is not a second mutable taxonomy or a taxonomy-write validator. The UI
must use the existing category tree. Condition is `new`, `used`, `damaged`, or null.
Limit is 1–60; offset is 0–100000. Invalid inputs raise SQLSTATE `22023`.

## Public eligibility and data minimization

Only `listings.status='active'` and `(active_until is null or active_until > now())`.
Null expiry preserves the current public RPC's legacy rule; it is not a new lifecycle
policy. The listing must have an active identity and an identity profile. Identity-less
legacy rows are not newly exposed. Active-identity ownership never admits drafts.
Both existing account-block directions are applied against `listings.user_id` and
server `auth.uid()` before total/count/page. No client-supplied user/identity override.
This mirrors the existing account block meaning; it does not invent business/member
or identity-level blocking rules.

The new stable definer function has a fixed search_path, schema-qualified tables,
explicit owner/grants, no dynamic SQL and no writes. Anon/authenticated/service_role
can execute; PUBLIC is revoked. No table grants or old functions/policies change.
This minimizes **this endpoint** only. Existing legacy direct-table privileges and
older endpoint exposure are not certified or repaired by this migration.

Return: one JSON object with `schema_version=1`, `content_scope='ordinary_listings'`,
`sort='newest'`, `items`, decimal-text `total_count`, `result_limit`, `result_offset`,
`has_more`, `next_offset`, `window_limit_reached`. Empty pages still carry real total.
Count/items share one SQL snapshot. Order is `created_at desc, id desc`. Offset pages
across separate requests are not a durable database snapshot; concurrent insertion,
removal or expiry can move page boundaries. Future client de-duplicates by content ID.
When the bounded offset window is exhausted, the client must ask to narrow search;
it must not mistake null next_offset for the complete total being loaded.

Cards contain only content type/string ID, title, up-to-280-character description
preview, original price text, finite nonnegative numeric-price text when present,
null currency, category path, condition, public city/country, selected image URL,
public seller name/slug/avatar/type and created timestamp. Image selection is stable
(primary, sort order, created time, UUID; NULLs last). No exact location/coordinates,
account/identity IDs, arbitrary details, search vector/text, AI data or Premium ranking.
Existing search_vector includes raw location and arbitrary details and is deliberately
not reused, including for match/count inference.

## Deliberate first-stage limits

No horse public read/publication, generic purchase/rental intent, service search,
price filter/order, distance sorting, automatic geographic expansion, field-specific
gearbox/brand/model filter, AI call, Energy use, write, or UI change. Public `listings`
has no canonical currency column in the reviewed source. Existing numeric price is
not proof of EUR; no cross-currency comparison or guessed currency is introduced.
Original price text remains available for honest display. A future currency-aware
price contract must precede price filters and price ordering.

This function searches public title/description rather than every category attribute.
It uses a computed public text vector with no new index/backfill. Production volume,
query plans, endpoint timeouts and abuse controls must be checked before rollout/UI
launch; correctness tests are not a performance benchmark. A public-text-only index
can be an independently reviewed addition; the existing overbroad index is not reused.

## Validation boundary

`supabase/tests/fixtures/public_listing_search_v1_fixture.sql` is an isolated harness:
five exact baseline CREATE TABLE declarations, synthetic session auth.uid(), minimal
keys and deliberately restrictive test grants/RLS. It is NOT a complete Supabase
schema, real Auth/HTTP environment or proof of production role inheritance. Do not
execute the fixture in an application database. No user rows, keys or schema dumps
are copied. The supplied runner uses only a new networkless helper with the already
observed pinned PostgreSQL 17.6 image. Original local DB and production are not contacted.

The candidate migration and 66 assertions run in one rolled-back helper transaction.
Assertions cover an old match beyond the first 30, count/paging, paths, condition,
public text/location boundaries, both block directions, role permissions, unknown
inputs, original money, deterministic image selection and unchanged synthetic rows.
Pre/post helper catalog/rows must match. Only the helper created by this run may be
removed, after verifying its exact ID, random ownership token and isolation settings.
A successful isolated run precedes candidate file creation, build and exact staging.
No automatic commit/push or production apply. Review the returned ZIP before proceeding.

## Approved UX retained for the later client

Compact sticky search text + Filtrid; mobile near-full-height and desktop side panel,
closed initially. No competing floating button over the mobile Lisa navigation.
Selections apply automatically; X and Vaata tulemusi close without reverting them.
Debounce text/numbers; no request on open/close alone. Preserve position if query is
unchanged; after changed query and close, align to results start. Restore query,
filters, pagination context and card position when returning from detail. Existing
return-context code must not consume restoration before the needed page is loaded.
Visible removable chips; Eemalda täpsustused keeps search text and chosen category.
Only server-supported filters; no mock matches/counts. Focus, Escape, backdrop scroll
lock, keyboard, large text and touch targets require actual browser verification.

Listing purpose remains separate from category: Müün / Soovin osta / Annan rendile /
Soovin rentida, with üürile/üürida in property context and supported country/category
capabilities only. Avoid ambiguous Rendin. Global taxonomy remains separate from
identity store_categories. Manual category selection must work without AI. Seller
price vs buyer budget, actual place vs wanted search area and controlled horse rules
stay separate. Launch is publish/find/contact/agree, not checkout/deposits/booking.

## Next sequence

Review this actual isolated result -> source checkpoint -> separate read-only production
preflight and approved additive rollout -> typed client and compact panel using only
verified capabilities. Later normalized attributes, money/location contracts and
purpose writes remain explicit scoped work, not silent reinterpretation of old rows.
