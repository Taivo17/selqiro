# Horse galleries and owner lifecycle parity

Date: 2026-11-08. The user has now accepted this release in the browser:
gallery enlargement/switching, owner thumbnails and image/title links, public
hiding while paused, saved paused edits, reactivation with the previous expiry,
and explicit 90-day renewal. This does not infer a new Git commit from a
screenshot. The next repair is documented in `horse-confirmation-reuse-v1.md`;
it restores idle arrow hiding and reuses saved per-offer factual confirmations.

## Product contract

Horse offers remain canonical UUID rows in `public.horse_offers`; no ordinary
listing copy is introduced. Active published horses use the same owner-facing
Active / Paused / Sold, expiry presentation, explicit renewal and edit pattern
as ordinary listings. Underlying horse statuses retain their canonical meaning:
published corresponds to active, paused to paused, and closed to sold.

First publication stores a server-generated deadline 90 days from publication.
For existing published rows with no stored deadline, the effective deadline is
the original publication timestamp plus 90 days. Reads enforce this rule without
a bulk rewrite or blanket renewal. Public detail, media, search, profile and new
contact must all agree on public eligibility.

Status changes do not extend activity. Content/photo saves preserve the current
source status and deadline. Expired content is retained for its authorized owner.
Renewal is explicit, confirms the offer remains available and targets the same
canonical row. Server authorization, active identity, source revision, source
status and exact prior deadline protect the operation from stale tabs and
identity changes. An uncertain result is reconciled by reading; no blind retry.

## Shared presentation

Both public listing kinds use one photo viewer. It supports thumbnail selection,
previous/next buttons, touch navigation, keyboard navigation and an enlarged
view with Escape/close and focus return. Image URLs continue to come from the
existing validated public read models. Opening a large view does not create an
upload, edit a gallery or bypass publication/media authorization.

My Area accepts validated horse-media references using their own content type
and loads private owner thumbnails through the existing authenticated image
mechanism. A previously decoded image must not survive an actor change. Public
and owner URLs are not arbitrary provider or signed URLs supplied by the client.
The image and title share one destination: the active public detail when
available, otherwise the authorized owner editing flow. Retry buttons remain
outside anchors. The redundant right-hand public-view link is removed.

## Rollout and evidence boundary

The guarded package starts from the exact 1193-file upload-capacity r2 source.
Its successful private receipt locates the resulting commit, which is then
independently checked against the known parent `6bb4385`, commit subject,
changed paths, every source blob and current repository/index/remote state.
The unknown new commit is never guessed from screenshots.

The new SQL repair is separate from already applied horse and capacity releases.
It builds on the corrected retained-function fixture. Preflight checks the
existing provider catalog and invariants; apply is a single transaction and
verification is a separate authoritative read. Existing journals and older
issued ZIPs remain unchanged.

The delivery report records the final local SQL, client/server regression,
typecheck/build, and exact package tests with their limits. Synthetic auth,
Storage responses and PGlite do not prove a production browser flow or native
multi-connection race behavior. Mac installation, Vercel Ready and user browser
acceptance follow the supplied installer command.

Services subsequently reuse the same publish and My Area edit pattern, keeping
`services` canonical UUIDs and service-specific fields. No mandatory standalone
draft-saving step is introduced. Jobs follow later.
