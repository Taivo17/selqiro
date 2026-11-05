# Listing Edit feature

Private route: `/v2/my-area/listings/[id]/edit`.

The managed publication path composes `IntegratedListingEditPage`, the existing
basics/price edit session, `useManagedListing` and `ManagedListingImagePicker`.
It supports saved basic fields, current gallery/primary selection and the
bounded listing lifecycle. Authorization remains in server/database contracts.

The 2026-11-04 photo-removal candidate adds removal of one non-primary photo
after SOURCE cleanup, while at least one photo remains. It reuses the gallery
revision, authenticated transport and existing owner-action lock. Confirmation
belongs to the displayed actor, identity, listing, attempt, revision and original
photo ordinal. Remaining URLs are never renumbered. Unknown results require a
read-only refresh before another photo action.

The older `ListingEditPage` and its image hooks are a separate retained entry
path; they are not copied into the managed publication workflow. Do not call
legacy Storage/image mutation helpers for managed publication slots.

Relevant contracts:

- `docs/architecture/listing-edit-client-v1.md` — basic edit session.
- `docs/architecture/published-listing-photo-removal-v1.md` — active membership,
  media revocation, held WEB cleanup and exact scope.
- `docs/architecture/hosted-completed-source-cleanup-v1.md` — accepted SOURCE
  cleanup and the public-launch UX requirement.
- `docs/continuity/CURRENT_STATE.json` — prepared versus installed/accepted state.

New-photo upload/replacement and physical cleanup of retired WEB objects remain
subsequent bounded capabilities. The cleanup diagnostics may stay visible while
testing; reliable automatic cleanup and ordinary-user UI simplification are
required before public launch.
