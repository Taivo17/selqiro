# Service return navigation v1

Prepared: 2026-11-09. Deployment and user acceptance are recorded only in
`docs/continuity/CURRENT_STATE.json`; this architecture is not deployment proof.

## User contract

Opening a service from a public profile or public service discovery must allow
Browser Back to return to the originating card. Keep the profile's expanded
services section or horizontal preview position, and keep discovery filters
and the relevant loaded results. Browser Forward followed by Back must work
again. The detail's visible back link uses the same validated origin; a direct
open without an origin falls back to `/v2/services` with normal top navigation.

Cards retain a compact two-line description. Full stored text is rendered in
the detail with whitespace preserved. Navigation does not change descriptions,
photos, service ordering or publication state.

## Modules and ownership

`src/features/service-navigation/model/serviceReturnContext.ts` owns the typed,
validated UI snapshot and the source/detail roles attached to browser history
entries. `useServiceReturnSnapshot.ts` reads it on mount and `popstate`, with a
visit counter so a cached route can restore again. `useServiceReturnRestoration.ts`
owns bounded scroll alignment. `ServiceReturnBackLink.tsx` renders the safe
source link and sets an explicit-return intent without guessing `history.length`.

`serviceDiscoveryLocation.ts` reads/writes existing filter values in the URL.
`useServiceDiscoveryView.ts` composes those filters, public search and restoration.
`usePublicServiceSearch.ts` owns abortable current-request state and pagination;
`readPublicServiceWindow.ts` owns bounded fresh reads for a restored window.

`usePublicProfileServiceView.ts` composes profile data, expansion and horizontal
position. `PublicProfileServiceCard.tsx` contains the small card/link presentation.
Route files remain thin; data access and all existing server authorization stay
in their existing entity/HTTP/database boundaries.

## History and data boundary

Each source and detail history entry receives a versioned role and snapshot.
The snapshot contains a random visit token, canonical service UUID, validated
same-origin source URL, timestamp, card viewport position, document scroll,
loaded/target page offsets and optional profile UI state. It contains no service
record, description, photo, owner record or credentials. Next's own history
state is preserved when attaching metadata.

A 30-second same-tab handoff connects a source click to its exact detail, or
an explicit return link to its exact source. Memory is primary fallback when
sessionStorage is blocked. Persisted UI snapshots expire after two hours and
are validated again at use. An absent, malformed, expired or mismatched snapshot
leaves ordinary navigation available; it never grants data access.

Only unmodified primary-button navigation records a return. New-tab and modified
clicks retain normal browser behavior. Explicit returns use validated internal
URLs. Sources are restricted to `/v2/services` or one `/v2/profile/[slug]` route;
external URLs, credentials, control characters and encoded path separators are
rejected. Details are bound to the exact canonical service UUID route.

Search values live in the URL so hydration, reload and Back see the same query.
Changing a filter replaces the current source URL and clears its old return
metadata. It does not create a new history entry for each character.

## Fresh results and bounded restoration

Service records always come from the existing public reader. No result cache in
history becomes a second data authority. Normal restoration re-reads the prior
loaded range in pages of 24, with at most eight automatic reads. A deeper source
restores the clicked page directly, using its saved offset. The user can reach
earlier results with the localized previous-results action and later results
with the existing more-results action. This limits automatic work; it is not
a service-count or participation quota.

Request generations and AbortController discard obsolete query/route responses.
Pagination deduplicates by canonical UUID and records each displayed card's
origin page. Deleted, newly hidden or newly inserted services are handled using
fresh public results; stale content is not revived for a scroll target.

Restoration waits for the expected section and fetched rows. It anchors the
clicked card at its previous viewport position, falling back to saved scroll
when that card is absent. A bounded observer and retry window handle delayed
content above the services section. Wheel, touch, pointer or keyboard input
ends automatic alignment so user navigation takes priority. Cleanup releases
observers, timers and the temporary manual scroll-restoration mode.

## Coexistence with marketplace listings

The profile has one expanded section. A false update from the listings hook
may collapse only the listings section; a false services update may collapse
only services. This avoids a mount effect closing the other restored section.

A service click clears the older one-shot listing return context. A later
listing/horse click clears a service source snapshot on that same history entry.
The established listing return module and listing/horse URLs retain their
existing contracts. This avoids two independent restorers owning one source
entry without merging service records into marketplace listings.

## Validation scope

The exact final source/build/browser/installer evidence is in the release's
`kontrollid` directory and `docs/continuity/SERVICE_RETURN_NAVIGATION_20261109.md`.
Browser fixtures run real React feature modules, layout and native history in
Chromium; API/auth and the Next Link/router boundary are synthetic. They are
not a live Supabase, full Next router or user account acceptance claim. The
fresh Next production build separately compiles/types all current app inputs.

The source-only Mac updater binds the prior r2 receipt to its complete Git tree
before file writes, then performs guarded backup/build/commit/non-force push.
It contains no database execution module or SQL payload. A real deployment and
the two requested Browser Back journeys remain the final user-side boundary.
