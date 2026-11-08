# Shared marketplace foundation

Status: implementation checkpoint, 2026-11-08. The user's latest screenshots
confirm canonical horse publication with two photos, public discovery and My
Area. The new horse parity candidate adds the shared viewer, protected owner
thumbnail and 90-day owner lifecycle; its local evidence and installation status
are recorded in `docs/continuity/CURRENT_STATE.json`. Services follow this parity
acceptance. See `horse-owner-lifecycle-v1.md` and `horse-publication-v1.md`.

## Decision

Ordinary listings, horse listings and services share reliable account/identity
checks, confirmed saves, managed photos, gallery membership, cleanup, contact,
language preference and common owner/public components. User interaction is
simple: enter fields and photos, Publish, then My Area → Edit → Save changes.
A private recovery attempt may exist internally; users do not need a separate
mandatory Save draft step. Jobs should follow the same interaction later.

Each domain retains one canonical source: `public.listings`,
`public.horse_offers` and `public.services`, with its existing ID and ownership.
Horses and services must not be copied into ordinary listings. Shared lists are
read-only projections keyed by `(content_type, content_id)`.

Reuse the tested primitives behind explicit domain adapters. Numeric listing
RPCs cannot accept horse/service UUIDs. Share the mechanisms that are actually
common and retain domain-specific validation instead of adding a generic write
framework that hides these differences.

## Current source capability

| Area | Implemented in this source | Remaining boundary |
| --- | --- | --- |
| Ordinary listings | Controlled publication, managed images, primary/add/remove, exact readback and cleanup | Existing accepted behavior is retained; general background cleanup remains separate |
| Horse create and edit | Five types, exact policies, one Publish, private resumable attempt, revision-checked atomic published Save, managed ordered gallery | Publication observed by user; parity candidate preserves paused/sold/expired edits and finite 90-day activity |
| Horse public and contact | Canonical detail, typed mixed discovery, profile cards, permitted public media, current shared messaging | Parity candidate adds explicit status/renewal; archive/delete remain outside this change |
| Shared owner list | Canonical listing/horse projection, authenticated thumbnails, shared status/renew/edit controls and image/title links | Service variant is not yet connected |
| Service owner management | Existing draft create/edit, categories, images, primary image and status actions | Must align user flow, revision/finality and managed media with the confirmed-save foundation |
| Service public profile | Actual published service reads and profile gallery | `/v2/services` still contains examples; `/v2/service/[id]` is an owner preview |
| Live service availability | Product blueprint and discovery examples | No complete Quick Update or temporary-location write/read/expiry flow |

### Implementation evidence

Horse creation and published editing now use
`src/entities/horse-offer/model/horsePublicationSession.ts`,
`src/features/horse-publication/` and the separate
`src/server/horse-publication/` adapter. Their current SQL contracts are in
`supabase/repairs/20261108_horse_publication/`. The old private draft modules
remain compatibility code; they are not the mandatory create action.

The shared owner projection already reads canonical listings and horses. The
new public `search_public_marketplace_v1` applies common filtering/counts to a
typed union. Public horse detail/profile links and current conversation cards
preserve UUID identity; no shadow listing or second inbox is created.

Service APIs remain in `src/entities/service/api/`. `save_my_service_v2` and
`set_my_service_status_v2` use active-identity ownership but lack the new expected
edit revision contract. The existing service image RPCs are draft-bound with a
ten-image limit and do not yet use the managed source/verified-web journey.
Existing UI disabling is not a substitute for authoritative mutation checks.

## Domain differences

Horse `sale`, `free_transfer`, `lease`, `co_rider` and `wanted` retain distinct
semantics. Wanted has buyer budget/search area and preferences; free transfer
has no invented amount; recurring fees have an explicit period. The pilot is
Estonia/EUR. Exact policy version/hash and account acceptance remain binding.
The original accepted policy text remains Estonian. Exact private location is
not included in public detail/search.

Services retain `fixed`, `from`, `hourly` and `contact` pricing, and existing
`draft`, `published`, `archived` statuses. Price remains optional; contact
pricing must not acquire an invented amount. Blueprint price ranges have no
current field and require a separate contract decision. Accessible private and
business identities remain supported. Identity-owned shop categories and
global service taxonomy are different structures; translations do not rewrite
codes or user-created category names.

Service operating area, availability and optional temporary location are not
product inventory or a horse's location. Public location is approximate by
default. Exact business location requires an explicit owner-controlled choice;
private homes and live worker GPS coordinates are not exposed by default.

## Ordered next work

1. Install and accept the new horse gallery/lifecycle parity package once using
   the focused journey in `docs/continuity/HOSTED_PORTAL.md`. Keep the accepted
   publication and upload-capacity releases intact; do not replay old installers.
2. Complete services on the same user workflow: one Publish, later My Area
   Edit/Save, canonical service UUID, revision/operation reconciliation,
   managed images, real discovery, public detail and current contact routing.
   Preserve existing services and galleries while adapting their contracts.
3. Add the small launch availability model: one active Quick Update and one
   temporary service location, with authoritative expiry/replacement and
   approximate public location. Multiple units and staff roles remain later
   work under `docs/architecture/live_services.md`.
4. Add jobs later with the same creation/editing interaction and explicit
   job-specific fields. Do not introduce another mandatory draft workflow.

For each domain, the owner action, authoritative result and public view must
agree. A success notification alone is not publication or gallery confirmation.
