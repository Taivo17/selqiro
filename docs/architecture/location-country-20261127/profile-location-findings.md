# Focused audit: country boundary, identity defaults, and temporary service location

Date: 2026-11-27. Source-only audit; no database, production application, or live geocoder calls were made.

Source root: `work/job-search-implementation-20261126/source`. Parent-provided provenance: exact prepared source corresponding to newly reported deployed commit `7c53643012545c7dfa99ba976e6f2613e3c3a201`. This audit does not independently assert deployment or current database state. Source paths below are relative to that root.

This is a narrow addition to `docs/architecture/location-search-20261126/v2-audit.md`, not another broad nearest-search audit. No application source, historical report, publication receipt, or old listing was changed.

## 1. Current user decisions override the older plan

- A selected country is the hard search boundary. A selected center must belong to that country. Worldwide searching is deferred.
- The center controls distance ordering, not a strict city-name equality filter. Exhausting nearby results expands to progressively farther eligible results inside the selected country only.
- Both country and place fields offer matching suggestions while typing. A locality selection must produce a structured, validated place, not only free text.
- An active identity's saved country/place supplies defaults for a **new** offer. The publisher can override them on that offer. Changing a profile default must never move existing offers.
- The current search center is separate from the publisher's saved default location. Searching Finland must not silently change an Estonian profile or its subsequent offer location.
- A service may have a manually entered, time-bounded temporary location. One active location per service is sufficient. Its base location remains intact.
- Exact public addresses/points are available only to a business identity, by explicit choice. A private identity may still offer the service, with a locality/area-level public location. No tracking is required.
- Old listings may be left out of the new proximity feature. There is no automatic geocoding or backfill of old listings in this work.

Older architecture allowing worldwide widening or proposing inferred old-location backfill must be marked superseded in the canonical project state. It should remain historical evidence, not active implementation guidance.

## 2. The remembered V1 default-location behavior exists in source

| Finding | Evidence | Consequence |
|---|---|---|
| V1 held a saved home country/city and selected coordinates. | `app/my-page/hooks/useLocation.ts:41–72`. The hook submits country, city, latitude, longitude to `update_my_active_identity_location`. | The user is remembering a real flow, not merely an old idea. |
| New ordinary listings copied active-identity country/city. | `app/sell/page.tsx:315–357`; `get_my_active_identity_profile_details`, then `setCountry(identityProfile?.country || "Estonia")` and `setCity(...)`. | Reuse the one-time default-copy principle, but implement it through current V2 actor and command contracts. |
| Listing creation used the selected place or a fresh geocode and wrote its own country/city/coords. | `app/sell/page.tsx:530–570`. | This was a draft copy, not a live database relationship that moved all ads when the profile changed. |
| V1's profile location country selector contained only six named countries. | `app/my-page/components/LocationCard.tsx:54–80`. | It is not an adequate international country typeahead. |
| Zero-valued valid coordinates were converted to null. | `app/my-page/hooks/useLocation.ts:69–70`, `app/sell/page.tsx:569–570`, both use `|| null`. | New location validation must treat numeric zero as valid and distinguish it from missing/invalid values. |

The legacy write cannot simply be re-enabled. The later profile-editor release explicitly revokes client execution of `update_my_active_identity_location` and the older profile save RPC: `supabase/repairs/20261120_profile_editor/apply.sql:723–726`. Old source is a behavioral reference, not a safe current write path.

## 3. Current V2 identity and default-location gaps

### Profile editor

Current V2 location fields are plain text country/city plus visibility. Exact address is offered only for businesses: `src/features/profile-editor/components/ProfileEditorPage.tsx:109–127`.

The profile model is deliberately a closed, seven-field text payload: `src/features/profile-editor/model/profileEditor.ts:5–19,42–56,59–89`. It has no country-code identity, place ID, locality centroid, geocoder provenance, or selected-place revision. Its parser rejects extra fields and private exact/address output. Adding unrecognized location fields to the existing RPC response would break the current parser.

Owner binding is explicit. `useProfileEditor.ts:19–58` keys the session by user and active identity, retires it on identity change, aborts stale work, and revalidates the actor before a save. The server owner lock in `supabase/repairs/20261120_profile_editor/apply.sql:504–544` checks:

- authenticated expected user and expected active identity;
- active identity status;
- private identity ownership;
- business ownership, active business, and active membership for business profile editing.

The server uses `profile_revision` for optimistic concurrency (`apply.sql:489–502,654–658`). Its exact seven-key allowlist is at `596–600`. Private exact/address data is rejected at `648–652`.

The existing save deliberately clears old coordinates when country/city/address changes and on every explicit private profile save; it performs no geocoding (`apply.sql:661–668`). Therefore a new locality center cannot be assumed to exist just because country/city text is present. Reusing raw historical profile coordinates for a new public nearby search would defeat this deliberate separation.

The retained authenticated identity-details RPC returns country/city/lat/lng only for the active identity and permitted user: `supabase/repairs/20261120_profile_read_privacy/apply.sql:298–308`. This is not the current V2 editor's normalized location contract. It also lacks the expected-actor arguments used by current commands.

Public profile projection exposes address and coordinates only for business + `location_visibility='exact'`; city/country only for city/exact visibility: `supabase/repairs/20261120_profile_media/apply.sql:1147–1180`. Later public account-availability fences remain an additional prerequisite; this audit does not replace them.

### New-offer defaults are not currently consistent

| Active V2 flow | Current initialization | Source |
|---|---|---|
| Ordinary listing | Empty country and city; text inputs/datalist. | `src/features/listing-create/model/ordinaryListingFields.ts:24–26`; `model/listingCreateDraft.ts:13–24`; `components/OrdinaryListingLocationFields.tsx:16–24`. |
| Service | New form hardcodes country `Estonia`, empty city/location. Existing service uses its own snapshot. | `src/features/service-editor/model/serviceEditorForm.ts:10–16`; `components/ServiceEditor.tsx:25–41`. |
| Job / task | Empty country code, city, location label; an existing/pending command restores its own content. | `src/features/jobs/model/jobForm.ts:5–8`; `components/JobEditorForm.tsx:18–25`. |
| Horse offer | Empty locality/region with the existing Estonia market constant. | `src/features/listing-create/model/horseOfferLocationFields.ts:11–24,38–54,77–88`. |

None of these inspected V2 initializers copy a normalized active-identity location. Profile default adoption must happen only once for a pristine new draft, never on every profile refetch. Restored/pending commands and edited drafts take precedence. Actor changes must retire or rebind the draft instead of copying one identity's location into another identity's offer. The existing horse market limit is a separate product constraint and must not be silently broadened by a shared location selector.

Recommended contract: saved identity default contains country + a validated locality/area selection. A new draft receives an independent copy with visible origin, such as “Asukoht sinu profiilist”; an offer-specific change never edits the profile. Business exact address publication remains an explicit choice. A hidden profile's private location must not become a public exact address through this defaulting mechanism.

## 4. Existing autocomplete is not a general hard-country solution

The shared component already has useful interaction behavior: minimum two typed characters, 350 ms debounce, cancellation, and request-generation protection (`app/components/LocationAutocomplete.tsx:143–221`). Selection cancels pending requests (`236–242`). The structured result type already has country code, region, coordinates, provider ID, and place type (`20–31`). These concepts can be retained.

However, the current server route has decisive gaps:

1. `app/api/location/search/route.ts:23–31` calls the public Nominatim endpoint, appends the country to a free-text query, and sets `countrycodes=ee` **only** for Estonia. Finland or Japan is a query hint, not a hard restriction.
2. Returned `address.country_code` is copied into the response without checking that it matches the selected country (`49–82`). Missing country labels are even filled from the request (`63`). A hard boundary needs validated codes, not a fallback display label.
3. Each successful request inserts all suggestions/raw payloads into `location_search_cache` (`84–98`). The route's name does not mean it is read-only, nor does the code read its cache first. No request to this API was made during this audit.
4. Locality ranking normalizes to ASCII `[a-z0-9]` (`LocationAutocomplete.tsx:56–62`). Japanese/Cyrillic and other scripts can collapse to empty strings. It cannot be carried into a Tokyo/global-by-country experience unchanged.
5. The local locality filter is client-side (`43–54,85–112,192–197`); it is not the final privacy or country validation boundary.

Country inputs are also inconsistent. `lib/geography/countries.ts:1–52` contains 22 example countries. Jobs use that select plus a manual two-letter code input (`src/features/jobs/components/JobCountryField.tsx:8–22`); ordinary listings use a free-text datalist (`OrdinaryListingLocationFields.tsx:16–21`). A complete supported-country catalog with localized names/aliases and stable ISO codes should replace these as a shared selector, without using a geocoder for country-name keystrokes.

The prior general audit already identified that the public Nominatim service is unsuitable for autocomplete under its usage policy. That external fact was not re-researched here. The next stage must select an autocomplete-permitted place source, taking account of storage/caching terms, before enabling live typeahead calls. No provider subscription, payment, credentials, or live data call is authorized by this audit.

### Proposed country/place invariants

- Require a selected supported ISO country code. Suggested display names are not the stored identity.
- Filter place suggestions by that country at the provider/API boundary; validate every returned and submitted selection against it server-side.
- Changing country clears the selected place and pending place request. A typed label does not retain stale coordinates.
- Select a particular locality/region from suggestions; do not silently geocode the first ambiguous match when the user presses Search.
- Country-only search is valid, but its result ordering must not claim “nearest” without a center.
- Once a center is chosen, enforce country eligibility **before** distance ordering and pagination. An empty country result never falls back across a border.
- Use Unicode-safe name matching, with localized aliases where available. Show administrative region and country to distinguish similarly named places.
- Use only the effective public point at its declared precision for ranking and distance. Approximate results should not display false street-level accuracy or be computed from an undisclosed private exact point.

## 5. Temporary services are documented, not implemented

`docs/architecture/live_services.md:39–46` already proposes one active temporary location per service. The exact Järvamaa → Tallinn/Gonsiori example exists at `107–130`. Expiration is listed at `262–273`, but no complete current start/end/timezone contract is defined. It is a launch/future architecture document, not evidence of working functionality.

A focused scan of `app/`, `src/`, and `supabase/` for temporary-location identifiers found no runtime service temporary-location implementation. Current service form/content accepts country, city, and a generic location label only (`ServiceFields.tsx:89–95`; `serviceEditorForm.ts:23–38`). It has no location start/end time, public precision, coverage, or temporary point. The generic location text is not a structured exact-address authorization check; that must be enforced in the new server contract rather than assumed from the current UI.

### Publication integrity affects how it can be added

Service publication content is tightly defined: `supabase/repairs/20261108_service_publication/02_content.sql:1–20,38–41`. Published status is bound to an immutable content snapshot and hash; equality with current content is part of finality (`55–76`). Events are immutable (`changes.sql:43–55`). Updating a service row increments its edit revision (`57–71`). Prepare and final write compare revisions (`317–322,398`, with final content/event update at `432–448`).

Consequences:

- Adding a dynamic temporary location to the historical `content_snapshot` shape can make existing publication receipts stop matching, even when the service itself was not intentionally edited.
- Updating the base service row on every temporary movement can unnecessarily conflict with open service edits or prepared publication commands.
- An additive temporary-location record with its **own** revision/validity is the simplest candidate. Its writes still need current actor/ownership/availability checks. Reads still require the base service to satisfy current publication finality, active period, account status, visibility, and blocking rules.
- An overlay must never re-publish a withdrawn service, prolong the service's publication validity, or bypass a current-content check. A location update is not a service renewal.
- This is a proposed contract, not a schema chosen against a fresh live catalog. That catalog check is still needed before any migration.

### Minimal temporary-location behavior

Use one manually entered record per service: selected place, precision, start, expiry, revision. A new saved location replaces the previous one rather than appearing as a second service. Keep base location separately and return to it on expiry; show that it is the base location, not a freshly verified “available now” claim.

Recommended public wording: “Ajutiselt Tallinnas kuni täna 18.00” or “Tallinn, Gonsiori tänav · 15.00–18.00” when exact business publication has been chosen. A scheduled 15.00 start must display “alates 15.00” before the start and must not rank as a current nearby provider yet. This is a reported service availability window, not live GPS or guaranteed arrival time.

Store absolute start/end instants and the intended IANA time zone; render the selected place's zone explicitly if it differs from the viewer's zone. Validate ambiguous/nonexistent daylight-saving times rather than interpreting them silently. A server read must apply `start <= now < end`; expiry cannot depend solely on a browser timer or cleanup job. Require expiry and provide explicit early cancellation. A practical default such as “today until 18:00” can be offered, but the maximum duration is a later product choice, not an existing agreement.

The point and service coverage are different. A tow truck based in Järvamaa and temporarily available in Tallinn should not be excluded merely because an old base-area coverage field remains Järvamaa. Conversely, a nearby provider is not automatically willing to serve every request. The temporary-location stage should explicitly define current availability area/coverage or use an honest “Ask availability” flow. It should not promise arrival time from straight-line distance.

The selected country must match the **effective offer point**, not the company's registration country. A business registered elsewhere can still be genuinely serving the selected country when its active offer permits that. The search boundary does not mean filtering by owner nationality or business registration country. A temporary point must not automatically grant cross-border service coverage; service reach must be explicit, separately applicable, and compatible with current market rules.

Private service providers remain eligible, with a locality/area centroid and coarse distance. Do not accept or persist private precise coordinates in a supposedly approximate record and merely round their displayed distance; repeated queries can still expose the underlying point. Business exact points are optional; company status alone is not consent to publish an address.

## 6. No backfill: operational meaning

New structured location becomes eligible for proximity search only after it has been explicitly selected and saved through the new contract. Old offers with only unverified country/city text or old raw coordinates do not receive inferred points and are not migrated automatically.

Their detail pages, owner management, and existing publication status remain intact. A country-only or legacy discovery view may still show them honestly without distance, depending on its existing filters; the new nearest-only query must not inject them at distance zero or mix them into a sorted page. The UI must not claim that there are no offers anywhere merely because none have a validated search point.

Profile changes do not move existing offers. Later, a user may deliberately add a new validated location while editing an old offer, but adding that upgrade path is optional follow-up work, not a hidden backfill requirement in the first release.

No row export of old offer locations is required to design this no-backfill release. A bounded schema/function/permission/extension catalog check is enough for the next technical inspection; it should not expand into collecting historical addresses.

## 7. Bounded first implementation stage

Keep a single active stage: **shared country/place selection and saved active-identity locality default**. The concrete preparatory step is a bounded read-only current catalog check for profile/identity location storage, permissions, revision helpers, geospatial extension availability, and current publication helpers. Pair it with a source/provider decision that supports typeahead and storage. This audit does not execute that check.

That first implementation stage should deliver:

1. One normalized country/place/precision contract and shared typeahead behavior.
2. Country-restricted, server-validated place selection; Unicode-safe matching and stale-request handling.
3. Saved default locality per active identity with current owner/actor checks and its own coherent revision behavior.
4. Existing private/public exact-address rules preserved; no private exact coordinate collection.
5. A documented adapter interface for pristine new drafts, without connecting every offer family in the same deployment.

Finish and verify that stage before moving to **new-offer persistence**, followed by **country-bounded nearest search**, followed by **temporary service location**. Each stage can connect ordinary listings, jobs/tasks, and services through their existing contracts without opening the next stage before acceptance. Only one implementation packet should be active at a time. Horse-specific market rules require their own compatible adapter, not an automatic global expansion.

Acceptance cases for the foundation: Estonia/Valga rejects a Latvian selection; Finland/Helsinki accepts only Finnish suggestions; changing country removes stale center; Tokyo/東京 remains searchable; a zero-valued latitude or longitude is not treated as missing, while the selected record must still pass country/place validation; another identity's delayed response cannot overwrite the current identity; a manual draft override survives profile refetch; a private exact-address submission is rejected by the server. Nearest ordering, temporary expiry, and offer publication integration are gates for their respective later stages.

### Narrow blockers for ASUKOHT-1

- The current normalized place/default database contract is absent in inspected V2 source. A fresh, bounded catalog check must establish the current profile revision, ownership helpers, and permitted additive storage path before preparing a migration; retained SQL releases are not a live catalog substitute.
- The existing public-Nominatim route cannot serve as the production typeahead backend. Choose an autocomplete-permitted data source and verify its storage/caching terms. Any paid subscription or external credentials remain a separate concrete decision if required; do not choose them silently.
- The existing country list is a small example catalog and the current profile editor has exact-key response/input parsers. The new shared selector needs a complete supported-country catalog, and its versioned/additive owner contract must preserve the old parser until the coordinated client is deployed.

These are foundation dependencies. Service coverage, fleet logic, global cross-country searching, old-listing conversion, and temporary-location scheduling are not blockers to defining and delivering the first phase.

## Handoff for the parent

- The user's V1 profile-default memory is source-confirmed, but its legacy writer is now explicitly revoked.
- Current V2 profiles preserve the desired private/business boundary but lack a normalized place/default contract; current new-offer defaults are inconsistent.
- Current autocomplete does **not** enforce arbitrary selected-country boundaries and has an international-script matching defect.
- Temporary service location exists as architecture only. Dynamic location must not invalidate immutable publication receipts or renew a service.
- No backfill simplifies the first release substantially. It does not justify using raw old coordinates or reporting old ads as absent everywhere.
- Supersede the older global-widening/backfill decisions in the single canonical state and generated handoff. Keep implementation work focused on the foundation stage first.
