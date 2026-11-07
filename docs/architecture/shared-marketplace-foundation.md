# Shared marketplace foundation

Status: implementation audit and agreed direction, 2026-11-07. The EN/ET release changes interface copy and display formatting. The domain connections described below are **designed, not implemented by that release**.

## Decision

Ordinary listings, horse listings and services should share the mechanisms that make publishing reliable: account and active-identity checks, draft ownership, confirmed saves, managed image preparation and publication, gallery membership, cleanup, contact routing, language preference and common owner/public UI components. Domain-specific rules remain explicit.

Keep one canonical source for each domain: `public.listings`, `public.horse_offers` and `public.services`. Keep existing IDs and ownership. A horse or service must not also be inserted as a shadow ordinary listing. Shared discovery and owner lists use a read-only projection keyed by `(content_type, content_id)`; they are not a second writable source of truth.

Use the tested listing primitives behind small explicit horse and service adapters. Existing ordinary-listing RPCs and media receipts assume numeric listing IDs and listing-specific contracts. Passing horse/service UUIDs into those operations is not a valid integration. Expand only the contracts needed for each next complete flow; avoid a new generic write framework.

## What this source already implements

| Area | Current source capability | Remaining connection |
| --- | --- | --- |
| Ordinary listings | Controlled publication, managed source/web images, primary image, add/remove photo, confirmation/readback and cleanup | The shared implementation is a reference; each new domain needs its own valid identity, content and receipt bindings |
| Horse creation | Five offer types, horse/wanted fields, private draft save, active identity, optional policy acceptance | Selected images are preview only; ordinary publication action is explicitly excluded for horse mode |
| Horse editing | Atomic owner snapshot and revision-checked draft update; private location constraints; read-only image order | Published lifecycle, image mutation and full publication are not connected |
| Shared owner list | Canonical listing/horse projection with typed content ID and source status | No service variant is present in the current marketplace projection contract |
| Service owner management | Real draft create/edit, category selection, images, main image, archive/restore/publish actions | Revision/operation contracts and the managed-media journey are not aligned with ordinary listings |
| Service public profile | Real published service reads and gallery on public profiles | `/v2/services` discovery still uses example arrays; `/v2/service/[id]` is an owner-only preview |
| Live service updates | Product blueprint and discovery examples | No implemented end-to-end Quick Update or temporary-location write/read/expiry contract was found in this source |

### Evidence in the repository

- `src/features/listing-create/components/ListingCreateIdentityForm.tsx` renders horse fields/draft/policy components and restricts `OrdinaryPublicationAction` to non-horse mode.
- `src/entities/horse-offer/api/saveMyHorseOfferDraft.ts`, `updateMyHorseOfferDraft.ts` and `getMyHorseOfferEditSnapshot.ts` implement the draft boundary. `src/features/horse-offer-edit/model/ownerHorseDraftSession.ts` retains unsaved input and reconciles revisions.
- `src/features/horse-offer-edit/components/OwnerHorseOfferEditImages.tsx` is deliberately read-only.
- `supabase/migrations/20260830170000_add_ee_horse_offer_foundation.sql` contains horse, image and policy/publication foundations. Schema presence does not establish a complete live publication flow.
- `supabase/migrations/20260911203000_add_marketplace_item_projection_foundation.sql` explicitly defines the internal read-only `UNION ALL` over canonical listings and horse offers. `src/entities/marketplace-item/model/types.ts` currently admits `listing` and `horse_offer` only.
- `src/entities/service/model/types.ts`, `src/entities/service/api/saveMyService.ts`, `setMyServiceStatus.ts` and `src/features/service-management/model/useMyServices.ts` define the real service owner flow.
- `supabase/migrations/20260722173530_baseline_20260722.sql` defines `save_my_service_v2` and `set_my_service_status_v2`. Ownership uses the active identity and its access check. This contract has no expected-edit-revision parameter. The client permits editing only a draft and cycles draft → published → archived → draft; these restrictions must be reviewed and enforced at the authoritative write boundary, not assumed from disabled UI controls.
- `src/entities/service/api/serviceImages.ts`, `supabase/migrations/20260805150000_add_service_image_rpcs.sql` and `app/api/v2/service-images/delete/route.ts` use the older service image path. The image RPCs enforce draft/parent checks and a ten-image limit. This is not yet the ordinary managed private-source/verified-web-image journey.
- `src/entities/service/api/getPublicServices.ts` and the public-profile feature implement actual public-profile service reads. `components/v2/services/V2ServicesPage.tsx` contains the discovery examples. `src/features/service-detail/components/ServiceDetailPage.tsx` requires the active owner identity.

This is a source audit, not a fresh production database inspection. Database deployment state and live grants must be checked against the chosen contract before a domain release.

## Differences that must remain explicit

### Horses

Retain `sale`, `free_transfer`, `lease`, `co_rider` and `wanted` as distinct types. A wanted listing carries a buyer budget and search area; neither is a seller price nor a particular horse's actual location. Free transfer carries no invented price. Lease/co-rider fees retain their payment period. Horse characteristics, publisher disclosures and factual confirmations must stay attached to the correct branch.

The current pilot is Estonia/EUR. Preserve exact policy versions, hashes and account-bound acceptances; the accepted original policy body remains Estonian in the language release. Localized interface labels are not substituted for the accepted document. Preserve private exact-location data and publish only the permitted locality/region representation.

### Services

The current service model supports `fixed`, `from`, `hourly` and `contact` pricing, with `draft`, `published` and `archived` statuses. Service price is optional at the product level; an agreed/contact price must not acquire an invented amount. A price range appears in the product blueprint but has no corresponding field in the audited service type. Adding it requires an explicit contract decision.

The current owner APIs support accessible private and business identities. The older blueprint's sentence that a service belongs to a business does not override this implementation or the agreed private/business requirement. Use the universal identity/profile header and contact foundation.

Service availability, operating area and an optional temporary location are not ordinary product inventory or a horse's location. Public location defaults to approximate. Any exact business location must be an explicit owner-controlled choice; do not expose private home or live worker GPS coordinates by default.

Shop categories remain the active identity's own structure. Service category codes remain the global service taxonomy. Display translations do not rewrite either set of identifiers or user-entered category names.

## Ordered implementation after EN/ET

1. **Complete the horse listing flow.** Bind managed image sessions to the canonical horse UUID and active identity. Add confirmed publication with required policy/factual-confirmation checks and immutable publication evidence. Connect public detail, discovery/profile projection and contact using typed content references. Complete owner status/media actions with revision and actor checks. Verify wanted/free/lease/co-rider differences, idempotent retries, membership, private-location protection and retained drafts. Do not create ordinary-listing copies.
2. **Complete services on the same operational foundation.** Connect real service discovery and public service detail/contact. Add revision and confirmed-operation contracts where missing. Adapt managed images and cleanup while preserving existing service IDs and galleries. Align server mutation rules with supported owner actions. Reuse common fields and UI, while retaining optional service price, service taxonomy and operating-area semantics.
3. **Add the small launch availability model.** One active Quick Update and one active temporary service location, with expiry and an explicit replacement rule. Keep the update as part of the profile update system; use temporary location only in relevant service discovery. Implement owner access, authoritative expiry/read filters and approximate public location before exposing the controls.
4. **Leave multiple mobile units for a later release.** The architecture in `docs/architecture/live_services.md` describes future units, staff roles and compact availability summaries. It is not required to finish the initial service flow and is not implemented by this language release.

For each domain, completion means the owner action, authoritative result and public view agree. A success notice alone is not a publication or gallery-membership confirmation.
