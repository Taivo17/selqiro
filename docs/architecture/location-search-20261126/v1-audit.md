# V1 location discovery audit

**Source:** `work/account-job-write-20261125/source`, accepted commit `2b3407fee17f4d19594ce45647a1739b26249835`. Audit date: 2026-11-26. This was static, read-only inspection. No source changes, database operations, geocoder requests, or live production verification were performed. `audit.json` contains structured findings and exact file hashes.

## What V1 actually did

The user's recollection matches the **SQL nearest-first concept**. `get_marketplace_listings_nearby` accepts a center point, calculates spherical distance in kilometres, sorts all eligible listings by that distance, then applies a 30-row page. There is **no radius cutoff and no country/city restriction**. Following pages therefore return the next nearest listings globally. No series of 5/10/25/50 km searches is implemented. Rows without coordinates sort after all rows with coordinates. The secondary order is newest publication time.

Evidence: `supabase/repairs/20261113_provider_controls/10_legacy_search.sql:96–139`; `src/entities/listing/model/legacyDiscoveryTypes.ts:30`. The baseline contains the earlier equivalent function at `supabase/migrations/20260722173530_baseline_20260722.sql:1379–1447`. The November 13 repair is the most recent explicit legacy nearby-function body found in the inspected source.

The complete **UI path does not reliably preserve that promise**. Its city field is free text. It geocodes using the active identity's country, or Estonia when absent. If geocoding fails, it silently uses the identity's home coordinates, while the visible label remains the newly typed city. Typing Tokyo while the home country is Estonia is therefore not a verified worldwide path. Moreover, the client places matching city names ahead of physically nearer listings after receiving each page.

Evidence: `app/page.tsx:235–245,334–378,458–484`; `src/entities/listing/api/legacyDiscoveryMarketplace.ts:36–47`; `app/api/location/geocode/route.ts:37–48`.

## Concrete issues to fix when reusing the idea

| Issue | Source evidence | Consequence |
|---|---|---|
| Keyword/category/price/condition/location filters run in the browser after pagination | `app/page.tsx:247–327`; `legacyDiscoveryMarketplace.ts:44–47` | Relevant nearby rows can remain behind pages of nonmatching records. Move filters before ordering and pagination. |
| Same-city string priority overrides distance | `app/page.tsx:352–377` | Administrative city boundaries and duplicate names can distort nearest-first ordering. Use one authoritative geographic sort. |
| Zero coordinates use truthiness | `app/sell/page.tsx:569–570`; `app/my-page/hooks/useLocation.ts:64–71`; `app/api/location/geocode/route.ts:28`; `app/page.tsx:326` | Valid equator/prime-meridian positions become null or take the wrong branch. Validate finite numbers and ranges. |
| Offset paging lacks a unique final order and append deduplication | `10_legacy_search.sql:129–139`; `legacyDiscoveryPager.ts:37–40` | Catalogue changes and ties can duplicate or skip results. A stable ordering/cursor contract is needed. |
| Failed center lookup silently changes the actual center | `legacyDiscoveryMarketplace.ts:40–43` | The user can see “Tokyo” while searching around their home. Require a selected place or display an explicit lookup failure. |
| Unknown coordinates are last globally | `10_legacy_search.sql:129–136` | Such rows cannot honestly be presented as “nearby”; they may appear only after every located result. Label their distance as unknown. |

These are code-derived risks; no live reproduction or dataset benchmark was run. Baseline `idx_listings_coords` is a simple btree on latitude/longitude (`20260722173530_baseline_20260722.sql:5062`). The audited SQL computes and sorts distances; it does not express a spatial nearest-neighbor index operation.

## Existing selector and geocoder

`app/components/LocationAutocomplete.tsx:20–41` already defines a useful selected-place shape: visible name, country, city, region, coordinates, provider, and provider place ID. It shows disambiguating names and has 350 ms debounce, cancellation and stale-response guards (`:143–242,280–282`). Reuse the structured-place concept and request lifecycle.

It is not ready to copy unchanged for global search. Its default country is Estonia (`:119–127`). Its locality normalization strips every character outside ASCII a–z/0–9 (`:56–63`), so Japanese and other scripts disappear from locality matching/deduplication. The locality dedupe key omits country/provider identity (`:85–112`). The marketplace center field does not use this component at all.

Both API routes call Nominatim. `/api/location/geocode` attempts a country/city cache lookup, then automatically chooses a matching result or the first result (`app/api/location/geocode/route.ts:21–28,60–105`). A country/city text key cannot distinguish same-named localities within the same country. `/api/location/search` calls the provider and inserts the returned candidates into `location_search_cache`, but never reads that table (`app/api/location/search/route.ts:23–37,84–104`). That write-only path does not reduce repeated external requests. Neither route contains an explicit server rate limiter or request timeout; cache write failures are ignored. Both use the anonymous Supabase client (`lib/supabase.ts:1–6`). Cache permissions/effectiveness and current provider usage terms require separate verification; they were not established by this audit.

## Location storage and privacy

The legacy seller writes country/city and a selected or geocoded center into `listing_lat/listing_lng` (`app/sell/page.tsx:533–570`). The active-identity location is obtained via `get_marketplace_identity_location` and supplies the default center (`legacyDiscoveryMarketplace.ts:6–17`; baseline SQL `:1295–1309`). The legacy location card has only six selectable countries (`app/my-page/components/LocationCard.tsx:53–65`). No automatic GPS lookup or URL/local-storage persistence was found in the inspected V1 discovery path. Cards display city/country, not the RPC's distance value (`app/page.tsx:650–654`).

`docs/architecture/location_privacy.md` already gives appropriate product guidance: private users publish approximate areas; businesses may publish a business address; mobile providers may have service areas; approximate points need approximate distance wording. These are guidance, not proof of enforcement. The legacy nearby RPC returns raw listing coordinates and has no precision-aware policy in its body (`10_legacy_search.sql:89–110`). A new public reader should calculate from deliberately public locations and return explicit distance precision. No production privacy exposure was established by this inspection.

## Reuse boundary

Reuse the **chosen coordinate center → filtered eligible rows → nearest first → next page** concept. Keep the current active-identity scope/cancellation patterns (`legacyDiscoveryPager.ts:12–58`; `useLegacyDiscoveryPager.ts:12–21`) and the latest accepted availability/visibility gates. Do not restore the old SQL body wholesale: its provider/block checks predate newer availability contracts.

The transitional product reader accepts coordinates, but its V2 branch currently forwards only limit/offset (`src/entities/listing/api/getProductListings.ts:20–43`), and the discovery caller supplies no center (`src/features/product-discovery/model/useProductDiscoveryListings.ts:31`). This is an integration gap for the separate V2 audit.

No equivalent V1 service-coverage or job-location search was found. A provider's base point is not evidence that the provider serves the requested location. The old algorithm also measures straight-line spherical distance, not driving distance, travel time, current availability or ability to handle a job. These distinctions must be explicit in the new shared location contract.
