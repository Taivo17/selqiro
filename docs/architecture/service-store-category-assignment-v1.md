<!-- SELQIRO_SERVICE_STORE_CATEGORIES_ACCEPTED_20261111 -->
## Installation and visible acceptance — 2026-11-11

The completed Mac receipt records database verification, build and push at
commit `1b0c5ba867e5f466e75f63aee78521d37cf8164f`. The user accepted saving ANTIIK on a
service, finding/opening that service through the public profile filter and
showing only categories with active content in the public profile sections.
Exact Vercel Ready/deployment evidence remains READY_NOT_CHECKED. This does
not add fresh acceptance of expiry, deletion or browser-back behavior.
See `../continuity/SERVICE_STORE_CATEGORIES_ACCEPTED_20261111.md`.
The original architecture below is retained unchanged. This acceptance docs
delta has not yet been applied to the Mac repository.

---

# Service assignment to own-shop categories

Prepared: 2026-11-11 Europe/Tallinn. Installation and user acceptance are
separate evidence in `../continuity/CURRENT_STATE.json`.

## Scope and canonical data

The service editor lets an authorized owner select and save the service's own
shop categories independently. The same service can then be found through the
public profile's services filter. `services.id` remains the canonical UUID;
no `listings` copy, new account, new taxonomy or second shop tree is created.

`service_store_categories(service_id, store_category_id)` is the only new
association table. Its composite primary key prevents duplicate links; the
reverse category index supports category filtering/removal. Its foreign keys
delete links when a referenced parent is removed; deleting a link cannot
delete a service, category or photo. This release does not delete user content.

The existing identity-owned `store_categories` tree is shared with ordinary
listings and horse offers. Selecting a child does not silently add an explicit
parent link. Selecting zero categories clears the service's assignments only.
My Area management and owner selectors retain every owned category, including
empty ones. Platform-wide service taxonomy remains independent.

## Database authority

The additive repair is `supabase/repairs/20261111_service_store_categories/`.
No new direct browser writes are granted on the association table. RLS is
enabled and public roles have no table privileges. Two authenticated RPCs
provide owner access:

- `get_my_service_store_categories_v1(uuid, uuid)` returns the service UUID,
  verified identity UUID and explicit category UUIDs.
- `set_my_service_store_categories_v1(uuid, uuid, uuid[])` validates and
  atomically replaces the full set, returning the canonical set and count.

Both require the authenticated user, the stored active identity, an active
identity, and private-owner or active-business-member access. The service must
belong to that identity. Client-supplied identity IDs never establish authority.
The existing `current_user_has_identity_access` check also remains in force.

The transaction uses read committed isolation and the existing lock order:
profile, identity, active membership when relevant, service, then categories in
UUID order. Every selected category is locked and verified to belong to the
same identity before any link changes. Null/invalid arrays and foreign or
missing categories fail the entire operation. Unchanged links are retained.

The RPCs do not write service title, description, price, category, images,
publication confirmation, status, timestamps or validity. This does not claim
a universal invariant for future identity transfer or privileged SQL writers.

## Independent client operation

The service editor composes a separate category card. Its draft, loading,
save/error state and confirmation receipt are independent of the main service
form and photo workflow. A category save cannot publish the service, save an
unrelated text draft or discard a chosen photo.

The small shared assignment client retains the existing horse API contract
and verifies actor/session context before and after the request. Replies are
validated against the requested service/identity/category set. Stale results
from a previous identity are ignored. An uncertain write result blocks another
write until an explicit read reconciles the saved selection; no automatic
write retry is introduced. Failed reads preserve the local draft.

Unsaved category changes participate in the editor's leave/browser-unload
warning. Main-form reload preserves the independent category draft.
Managing the tree opens the existing My Area management view in a clearly
labelled separate tab. English is the primary/fallback interface language and
Estonian is supported. Category names and service content are not translated.

## Public service results and categories

`get_public_profile_services_v2(text, uuid, integer, integer)` is a versioned,
read-only projection. It resolves one unambiguous active profile identity,
uses the existing service publication and viewer-visibility checks, applies
the selected category subtree, then computes the true total and page.
Ordering remains `created_at DESC, id ASC`. Gallery output retains at most ten
images per service. The old service v1 reader remains unchanged for old clients.

The requested page size is bounded to 1–60; the client uses 24. The offset
window is bounded to 100,000 and explicitly reported in the response. These
are technical pagination bounds, not a permanent per-provider service limit.
The old first-80-only profile request is replaced by real page traversal.

`get_public_profile_store_categories_v2(text, text, integer, integer)` returns
contextual categories for `marketplace` or `services`. A category appears only
if eligible content is assigned to it or a descendant. Necessary same-owner
ancestors remain visible. The query considers the whole section before result
paging, not only the currently rendered cards. Category pages have their own
explicit total and bounded continuation.

For marketplace, eligibility matches the existing ordinary/horse profile v2
reader, including active identity, publication, expiry and viewer blocks as
applicable. For services it matches the existing service public/viewer helpers.
The new category endpoint does not invent service expiry; that lifecycle is
still a separate implementation. A category used only for a listing does not
appear in the services filter, and vice versa. A matching object appears once.

The public profile's expanded services section uses **All services / Kõik
teenused**, the shared two-level filter and pagination. The expanded listings
section uses the same contextual eligibility rule for its own filter. Owner
management and owner assignment loading do not use this public endpoint.

## Navigation and changing data

Service return context includes the originating profile, expanded state,
selected category/root, result offset and scroll position. Browser Back must
restore the user's place after the service detail opens. A vanished category
or out-of-range page is handled explicitly rather than leaving a stale filter
or silently treating the first loaded page as the entire result.

Public profile requests are scoped to the viewed profile and current viewer.
The active owner identity must not redefine a public seller's scope. Result
counts, category eligibility and cards follow the same database predicates;
separate HTTP reads are not claimed to be one atomic database snapshot.

## Installation and evidence boundary

The repair checks exact retained dependencies and the new object's absence or
exact installed definition. Unknown/conflicting definitions fail closed.
The existing service v1 and marketplace v1/v2 functions, horse assignment
capability, parent/media effects and unrelated authorities are pinned.
Applying the additive SQL is followed by a separate verify before client files
are applied. An unknown apply outcome is reconciled by reading, not replayed.

Local disposable PostgreSQL-WASM tests exercise authority, atomic sets,
category visibility, more-than-80 service paging, and category removal while
preserving canonical content/photos. They do not prove production data or
native multi-session lock timing. Client and browser evidence must name the
exact final runtime inputs and synthetic boundaries. The current checkpoint
and release report hold the actual results, not this design document.

## Separate follow-up work

The 365-day service lifecycle, temporary viewer-only provider hiding,
duplicate-service guidance and profile-first business jobs are defined in
`public-discovery-controls-v1.md`. They are not part of this category release.
Existing photo cleanup and public-launch gates, Energy/payment core and
privacy requirements remain in scope for the platform.
