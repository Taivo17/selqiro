# Shared marketplace foundation

Status: implementation checkpoint, 2026-11-09. The user accepted horse gallery,
owner thumbnail and links, pause/edit/resume, explicit 90-day renewal, idle
arrows, factual-confirmation reuse, immediate edit entry and consecutive saves.
The current source adds the service adapter and real service discovery/detail.
The prior service installation is verified by the b05ed30 r2 report; service
text and lifecycle behavior are user accepted. The prepared photo-selection
and profile-list correction has its own pending installation boundary in
`docs/continuity/CURRENT_STATE.json`. See `service-publication-v1.md`.

## Decision

Ordinary listings, horse listings and services share account/identity checks,
confirmed saves, managed photos, gallery membership, cleanup, contact, language
preference and owner/public components. Interaction is simple: enter fields
and photos, Publish, then My Area → Edit → Save changes. A private recovery
attempt may exist internally; a separate mandatory Save draft action is not
part of the user flow. After a verified save, editing can continue directly.
Jobs should follow the same interaction later.

Each domain retains one canonical source: `public.listings`,
`public.horse_offers` and `public.services`, with its existing ID and ownership.
Horses and services must not be copied into ordinary listings. Shared
projections are typed by content kind and ID.

Reuse the tested primitives behind explicit domain adapters. Numeric listing
RPCs cannot accept horse/service UUIDs. Share the common mechanisms and retain
domain-specific validation rather than a generic write framework that hides
these differences.

## Current source capability

| Area | Implemented in this source | Evidence or remaining boundary |
| --- | --- | --- |
| Ordinary listings | Controlled publication, managed images, primary/add/remove, exact readback and cleanup | Accepted behavior retained; general background cleanup remains separate |
| Horse create and edit | Five types, exact policies, one Publish, resumable attempt, revision-checked Save, ordered gallery and immediate repeat editing | User accepted direct entry, repeated save and public result |
| Horse public and owner | Canonical discovery/detail/profile/contact, thumbnail and links, Active/Paused/Sold and explicit 90-day renewal | User accepted; archive/delete remain separate |
| Service create and edit | Canonical UUID, one Publish, current owner revision, same-form repeat Save, managed new photos and preserved legacy gallery | Text/lifecycle accepted; prepared photo-selection correction awaits new installation |
| Service owner management | Identity-scoped list, thumbnails and links, Edit, Active/Paused, existing draft continuation | No new service expiry policy or permanent count limit |
| Service public and contact | Real keyword/category/area discovery, canonical detail/profile, common gallery and typed inbox context | No demo cards; local validation does not claim production rollout |
| Live service availability | Product blueprint | Quick Update and temporary-location write/read/expiry remain separate |

## Shared publication boundary

The horse implementation remains in `src/entities/horse-offer/`,
`src/features/horse-publication/` and `src/server/horse-publication/`.
The service adapter is in `src/entities/service/`,
`src/features/service-editor/` and `src/server/service-publication/`, with new
SQL confined to `supabase/repairs/20261108_service_publication/`.

A request key identifies one operation. Retries reconcile the same operation;
a confirmed subsequent save uses a new key and current revision. The UI adopts
verified content and ordered gallery before retiring a terminal journal. An
unknown outcome remains recoverable. An identity change or stale revision
cannot transfer ownership or silently replace unsaved local content.

The established binary source/verified-web lifecycle is shared through
explicit domain bindings. Final membership, public status and hash/length
checks remain authoritative. No client image URL or success toast alone proves
publication. Existing services and legacy photos remain representable, while
new uploads use managed private media.

Public media routes and contact cards must keep the content type: listing
numeric ID, horse UUID and service UUID are not interchangeable. Contact reuses
the current inbox with an authoritative recipient. Changing the current
subject clears the other domain's current context without altering historical
message snapshots.

## Domain differences

Horse sale, free transfer, lease, co-rider and wanted retain distinct semantics.
Wanted has buyer budget/search area and preferences; free transfer has no
invented amount; recurring fees have an explicit period. The pilot remains
Estonia/EUR. Exact policy version/hash and account acceptance remain binding.
The original accepted policy text remains Estonian. Horse factual declarations
remain horse-specific and are not copied into services.

Services retain fixed/from/hourly/contact pricing and draft/published/archived
status. Price remains optional; contact pricing never invents an amount.
Blueprint price ranges have no current field and require a separate decision.
Accessible private/business identities remain supported. The existing service
category pair may be preserved during editing even if retired; new or changed
pairs must be valid and active. Shop taxonomy and global service taxonomy are
different structures. Translations do not rewrite their codes or user content.

Service operating area and optional future temporary location are not product
inventory or a horse's location. Public location is approximate/descriptive;
private homes or live worker GPS coordinates are not exposed by default.
This release adds no service expiry period and no new account-wide count cap.

## Ordered next work

1. Install and accept the service publication/editing candidate using
   `docs/continuity/HOSTED_PORTAL.md`. Keep accepted horse/gallery/capacity
   behavior and all previous reports; do not replay old installers.
2. Complete the small launch availability model: one active Quick Update and
   one temporary service location with authoritative expiry/replacement and
   approximate public location. Fleet and staff remain later work under
   `docs/architecture/live_services.md`.
3. Add jobs with the same creation/editing interaction and explicit job fields.
   Do not introduce another mandatory draft workflow.

For every domain, the owner action, authoritative result and public view must
agree. A successful transport response is not a confirmed publication.

## One public profile marketplace projection — 2026-11-09

The profile now uses one read-only, paginated projection over canonical
ordinary listings and horse offers. Each type retains its own ID, route and
visibility contract. Services stay in the service section. No domain rows are
copied and a shop-category filter does not imply a horse/service relationship.
See `profile-marketplace-feed-v1.md` for the server and return-navigation
contract, and the dated continuity review for the category-integration audit.


<!-- SELQIRO_SERVICE_CATEGORY_POLICY_20261111 -->
## 2026-11-11 — contextual categories and profile-first jobs

The current service own-category step keeps canonical UUID services and the
shared identity-owned category tree. Public listing/service category choices
contain eligible content and required ancestors; owner management keeps all
categories. See `service-store-category-assignment-v1.md` and CURRENT_STATE for
implementation and installation boundaries.

The user's later jobs direction is a public company-profile/detail first
release, with general portal job discovery opened later. Collect global job
taxonomy and future search fields from the start, and use a separate server
discovery capability rather than treating a hidden menu as authorization.
The desired activity periods are services 365 days and jobs one month.
Temporary viewer-only provider hiding remains separate from user_blocks.
See `public-discovery-controls-v1.md`; these follow-ups are not runtime changes
in the category package. Energy/payment and public-launch gates retain priority.
