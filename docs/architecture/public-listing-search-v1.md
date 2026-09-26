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
