# V2 location readiness audit — 2026-11-26

## Scope and evidence boundary

Read-only audit of `/workspace/scratch/de90fa9e1734/work/account-job-write-20261125/source`, accepted source bytes for commit `2b3407fee17f4d19594ce45647a1739b26249835`. No application files were modified; no production query, migration, or network test was run. “Active” below means the integrated V2 caller and latest relevant SQL definition retained in this accepted source, not a fresh observation of hosted database state. Embedded earlier acceptance/pending notes do not override the user's latest acceptance.

## Decision

The desired search is **selected center + eligible results ordered by increasing distance, across successive pages**, without an implicit city/country restriction. It is not an exact city filter and it cannot be implemented correctly by sorting the first 24 newest results in the browser. V2 currently lacks both the search contract and the reliable per-offer public location data needed for it.

A common place picker is useful, but it must feed three related meanings: the item's collection location, the service provider's ability to serve the customer's location, and the job/task's actual worksite. The seller's profile address is not a safe universal substitute.

## Current active paths

| Domain | Active caller and RPC | Current geographic behavior | Current pagination |
|---|---|---|---|
| Listings plus horses | `src/entities/listing/api/searchPublicListings.ts:13–18`; integrated branch calls `search_public_marketplace_v1` | `p_location_query` is a city/country substring. No center or distance. | Newest `created_at`, then content type/IDs, LIMIT/OFFSET; 24 per UI page. |
| Ordinary-only compatibility | Same client nonintegrated branch calls `search_public_listings_v1`; `search_public_listings_v2` also remains an explicit server contract | Same city/country substring. | Newest date/ID, LIMIT/OFFSET. |
| Services | `src/entities/service/api/getPublicService.ts:12–21` calls `search_public_services_v1` | Optional exact case-insensitive city/country equality. Current V2 UI passes country null and a free-text city. | Published date, created date, ID; LIMIT/OFFSET. |
| Jobs/tasks | `src/entities/job/api/jobClient.ts:87–88` calls `search_public_jobs_v1` | Optional exact country code and case-insensitive city equality. | Keyset cursor `{published_at,id}`. |

Canonical SQL definitions to extend/replace deliberately:

- Combined marketplace: `supabase/releases/account-horse-read-fence-v1/search-marketplace.sql:2–91`. Ordinary city match is line 52; horse city match lines 79–80; ordering lines 83–91. This definition includes both the listing and horse account fences. Do not substitute the earlier `account-listing-read-fence-v1/search-marketplace.sql` and lose the horse fence.
- Ordinary contracts: `supabase/releases/account-listing-read-fence-v1/search-ordinary-v1.sql` and `search-ordinary-v2.sql`. V2 ordinary location predicate is line 68, ordering lines 78–81.
- Services: `supabase/repairs/20261113_provider_controls/08_search_services.sql:1–23`. The later account release updates the helper, not the search body: `supabase/releases/account-service-read-fence-v1/visible-to-viewer.sql:2–12`.
- Jobs: `supabase/repairs/20261121_personal_jobs/04_reads.sql:27–62`. The later account release updates `jobs_private.visible_to_viewer`: `supabase/releases/account-job-read-fence-v1/visible-to-viewer.sql:1–12`.

The current listing URL/parser expressly rejects `radius` and any sort other than `newest`: `src/entities/listing/model/publicSearch.ts:57–71`. Its location value and cache key are plain text (`:12–19`, `:53–55`, `:73–82`). Services have a separate city URL state (`src/features/service-navigation/model/serviceDiscoveryLocation.ts`), and jobs another (`src/features/jobs/model/jobSearchUrl.ts:3–18`). A shared selected-center state needs intentional integration into all three; changing only a control would leave request, URL, return-navigation, and cached results inconsistent.

## Publication and editing readiness

### Ordinary listings

New integrated V2 creation deliberately emits null coordinates:

- `src/entities/listing/model/listingCreationInput.ts:10`: latitude/longitude are typed as `null`.
- `src/features/listing-create/model/ordinaryListingInput.ts:67`: both values are null.
- `src/features/listing-create/components/OrdinaryListingLocationFields.tsx:19–29`: country/city are free text.
- Database publication guards explicitly reject non-null coordinates: `supabase/releases/listing-publication-hosted-preview-v1/20_publication_core.sql:260–261,1561–1562`; multipart path `30_multipart_and_journey.sql:600–601`.

There is an older editor with `LocationAutocomplete`, latitude/longitude, and a geocode fallback, but it is **not the integrated managed publication editor**. `src/features/listing-edit/components/ListingEditPage.tsx:22` chooses `IntegratedListingEditPage` when integration is enabled. That page edits basics/price, photos, and store categories, with no location control. Its command contract contains basics plus optional price only (`src/entities/listing/model/listingEditCommand.ts:6–8,33–40`). The retained legacy location card cannot simply be mounted into the managed editor without an owner-command/revision/publication contract.

Required meaning: the place where the item is available for collection, with an optional distinct delivery capability in a later slice. A business's office and a private seller's home are not automatically the item's location.

### Services

The active editor uses free-text country, city, and location label (`src/features/service-editor/components/ServiceFields.tsx:89–95`). The exact content contract has no coordinates, place identity, operating radius, or service mode (`src/entities/service/model/servicePublication.ts:5–10,42,57–75`). Active transport is `servicePublicationClient.ts` through `/api/v2/service-publication/...`.

The underlying table has legacy `service_lat`/`service_lng`. Managed creation omits them, while managed updates deliberately preserve them. Evidence:

- Normalization mapping only accepts the text fields: `supabase/repairs/20261108_service_publication/02_content.sql:1–20`.
- Creation/update SQL: `supabase/repairs/20261108_service_publication/changes.sql:335–337,440`.
- Runtime preservation assertion: `supabase/repairs/20261108_service_publication/tests/runtime-case.mjs:50–61`.

**Backfill hazard:** an old coordinate pair may now disagree with updated city/location text. Non-null is not proof that coordinates are current. Coordinate provenance and the source location/revision must be checked.

For a tow truck or snow removal, use service coverage at the user's selected location. Nearest office alone does not mean the provider can serve the user. The smallest useful service distinction is `at_provider` / `at_customer` / `remote`, with an operating area for `at_customer`. A provider's base point remains useful for approximate ordering among providers who serve the area. Avoid a fictitious live-vehicle location or a promise of current availability.

### Jobs and tasks

Jobs have `country_code`, `city`, `location_label`, and `workplace_type` only. Source schema: `supabase/repairs/20261116_jobs_public/01_state.sql:23–51`; current TS contract: `src/entities/job/model/types.ts:11–16,35–39`. The exact content-key list (`src/entities/job/model/jobContent.ts:3`) also lacks coordinates. `JobFields.tsx:30–38` is text country/city/label plus on-site/remote/hybrid.

Task vs employment already exists in storage as `employment_type='task'`; other values and null represent employment. November 21 extends constraints for task and whole-task pay (`supabase/repairs/20261121_personal_jobs/01_authority.sql:27–35`). There is no separate geo route or pickup/drop-off structure.

Required meaning:

- Employment: actual workplace; hybrid can use its office/worksite point.
- Task: the place where the work must be done (yard to clear, fence to repair).
- Transport request: pickup point first, with destination as a separate optional field when route search is introduced. A single vague city cannot represent both ends.
- Remote work: explicit remote eligibility; do not display fabricated “nearby” distances to an employer office. Country restrictions for remote work are separate from distance.

### Horses in the shared marketplace

Current horse creation shows a locality autocomplete, but preserves only city/region, discarding returned coordinates (`src/features/listing-create/components/HorseOfferLocationFields.tsx:115–177`). Both branches emit null exact fields (`src/features/listing-create/model/horseOfferDraftSave.ts:361–363,466–468`). Managed normalization rejects non-null private location fields (`supabase/repairs/20261108_horse_publication/02_commands_prepare.sql:36`). Old private exact locations are protected from accidental editing (`src/features/horse-offer-edit/model/ownerHorseDraftForm.ts:15`; `OwnerHorseOfferEditFields.tsx:50–54`).

Horse market/location country is currently explicitly EE (`src/features/listing-create/model/horseOfferLocationFields.ts:11–24`). A globally selectable search center must not accidentally change publication market/policy eligibility. “Wanted” offers describe a desired search area rather than the location of a horse; use that area's semantics and label it honestly.

## Storage and indexes

- Legacy listing columns: `listing_lat`, `listing_lng` in baseline `supabase/migrations/20260722173530_baseline_20260722.sql:4500–4501`.
- Legacy service columns/constraints: same baseline `:2373–2374,2382,2387,2389`.
- The old baseline defines `idx_listings_coords` as a **B-tree** coordinate-pair index (`:5062`), not a spherical nearest-neighbor index. Do not claim this index is installed now just from the old baseline.
- The November 16 recorded catalogue snapshot (`supabase/repairs/20261116_jobs_public/catalog-pins.json`, `after_facts.existing_relations`) records only `listings_pkey` for listings; services have identity/status ordering, primary key, and a B-tree `(country,city,category,subcategory,created_at DESC)` discovery index. Horse indexes cover market/type/city/date and text search. This is saved evidence, not a new production probe.
- The accepted latest job write release pins all job indexes in `supabase/releases/account-job-write-fence-v1/expected-contract.json`, JSON pointer `/base/tables/2/indexes`: owner/date, profile/date, public/date, primary key, and GIN keyword search. No geographic index or coordinate columns.
- No spatial geography/GiST implementation was found in relevant V2 SQL definitions. Actual extension availability and complete hosted index state remain a bounded read-only preflight requirement before choosing a migration.

## Visibility and privacy that must survive

Apply geographic filtering/order **after defining eligible candidates and before pagination**, while retaining:

- Published/active status and activity expiry.
- Managed publication finality / current content and gallery membership.
- Active identity and relevant business status.
- Canonical owner account availability.
- Bilateral account blocks and viewer-hidden providers.
- Existing category, keyword, employment, and other explicit filters.

Key current helpers: service activity visibility `supabase/repairs/20261111_service_activity/01_state.sql:54–61`; jobs visibility `supabase/repairs/20261121_personal_jobs/03_visibility.sql:1–9`; horse visibility `supabase/repairs/20261108_horse_lifecycle/01_lifecycle_core.sql:26–32`, plus account helpers listed above. New location joins must not create a broad direct table read or return raw owner/private rows.

Public projections currently omit raw listing/service/horse coordinates. Profile masking distinguishes private/city and opted-in business exact locations (`supabase/repairs/20261120_profile_media/apply.sql:1151–1175`). The intended privacy policy is already written in `docs/architecture/location_privacy.md`: private sellers default to city/area, businesses may choose public exact location, services have operating-area semantics, approximate distances must be described as approximate.

Use a deliberately public search point/area with precision metadata. Merely rounding a displayed distance while sorting on a private home point can still reveal that point through repeated probes. Null must not turn into `(0,0)`. A geocoded city centroid must be marked as a locality approximation, not an exact item/worksite address. Records without an adequate location should remain discoverable in a clearly separate “location unspecified” path, not be mixed into nearby results as zero distance.

## Existing place APIs are not ready to reuse unchanged

`app/api/location/search/route.ts:24–35` calls the public Nominatim search endpoint with a query/country string; only Estonia has a country-code special case. It writes cache rows on every result and returns provider raw data (`:84–100`). `app/api/location/geocode/route.ts:22–29` uses country/city cache matching and checks cached latitude/longitude by truthiness (zero is a valid coordinate). It falls back to the first result if name matching fails (`:64–87`), which is unsafe for ambiguous global places. It requests no address details but then examines `row.address`.

A shared successor should provide a bounded normalized place result: provider ID, display label, ISO country, locality/admin context, finite in-range point, precision/provenance; require an explicit selection for ambiguous locations. Keep a chosen center until the user changes it. Distinguish optional geographic bias from an explicit hard country restriction. Parent's V1 audit/provider-policy review should decide what can be reused.

## Minimum new contract

1. **Selected search center:** stable place key, label, country/admin context, finite latitude/longitude, precision/source. Optional device location is explicit and ephemeral; do not put exact private GPS into a public share URL by accident.
2. **Offer search location:** content type/ID, public point or area, precision, source place, verified/derived state, source content revision/fingerprint. Changing location text must replace or invalidate its derived point.
3. **Search input:** center separate from explicit country/city constraints; `nearest` default when a center exists; optional hard maximum distance must never silently expand. Existing filters retain their meaning.
4. **Search output:** safe area label, approximate distance when meaningful, result source type, cursor/has-more. Never imply a map route or drive time from straight-line distance.
5. **Pagination:** a stable geographic ordering/cursor bound to the chosen center, all active filters, and audience context. Stable tie-breakers are required. A nearest page cannot reuse the existing jobs date-only cursor or the marketplace's newest offset semantics unmodified.
6. **Service coverage:** mode and operating radius/area; unknown coverage explicitly distinguished. Route/multi-worksite and time availability can follow later without overloading the point field.

## Smallest safe integration sequence

1. Confirm the UX and normalized center/precision contract, then capture a bounded read-only catalogue/data-readiness report: available coordinate pairs, missing/ambiguous localities, stale-coordinate candidates, actual spatial capabilities. No broad account module work is needed.
2. Introduce additive location metadata plus indexes and owner write/read contracts. Prefer a derived sidecar keyed to content and source revision if that preserves existing publication snapshots; otherwise version the publication content contracts intentionally. Service/horse finality compares saved content snapshots, so a naive snapshot shape change can make current published content unavailable.
3. Add place selection to each active publication/editor path and invalidate stale points on location changes. New records should not continue creating an unlocatable backlog while search is being added. Backfill only confident city+country matches as approximate locality points. Queue ambiguity for the owner to resolve; do not silently use the first geocoder result or an unrelated profile address.
4. Add versioned server nearest-first reads for the combined marketplace, services, and jobs, preserving the current visibility predicates. Verify full eligible-set ordering and cross-page behavior, not client-only sorting. Reuse one spherical distance convention worldwide; handle longitude wrap, poles, equal distances, and valid zero coordinates.
5. Wire one selected center into all three search UIs and their URLs/return state. Center selection removes the implicit city-name equality. Country/radius stay explicit controls. Keep remote jobs and unspecified locations understandable. Preserve a user's chosen center while moving between tabs.
6. Meaningful acceptance cases: Paide with no exact-city results still shows surrounding locations in order; Tokyo and international/dateline cases behave identically; a strict radius is respected; pages contain no duplicate/skipped ties; hidden/blocked/inactive/expired content stays excluded; private exact points never enter public results; changing an offer's city invalidates the old point; towing/snow services outside coverage are not represented as available nearby.

The immediate work-search intent split can be delivered independently against the existing `employment_type='task'` distinction. A truthful global nearest-first location feature requires the additional data and server slices above.
