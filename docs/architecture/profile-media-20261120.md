# Profile images, logos and optional cover fitting

Prepared on 20 November 2026 against accepted source `ab5d1d8`. This document describes the implementation candidate. It does not certify that the new package has run on the owner's Mac or reached production.

## Evidence and existing behavior

The accepted editor receipt confirms source, build, SQL verification and push for `ab5d1d8`; the matching user screenshot separately confirms Ready / Production. A subsequent read-only collection at 21:46 Tallinn verified the same complete 1,917-file source tree, index and remote head. The returned PostgreSQL 17.6 catalog includes 19 Storage policies, 14 helper routines and 11 triggers. No user profile rows, images, messages or Storage object rows were collected.

The existing `identity-media` bucket is public, permits JPEG/PNG/WebP and has a 5 MiB file limit. Its client mutation policies authorize the first path segment matching `auth.uid()::text`. New managed images therefore use a fixed, non-user namespace:

`managed-profile-v1/<identity UUID>/<asset UUID>.webp`

The browser cannot satisfy a user-UUID first-segment rule for this prefix. New objects are immutable: upload does not use upsert and paths are never reassigned. Existing Storage policies and bucket configuration are preserved.

## User experience

The existing Minu profiil text and location editor gains a separate image section. An individual can select a profile picture; a business can select a logo. The cover is independently optional. Selection creates a local preview; a successful explicit save is required before replacing the public image. Cancelling preserves the saved image. A failed transfer does not remove the current image.

Cover fitting is optional. Dragging, a bounded zoom control and accessible position controls use normalized coordinates. Reset restores a centered, unzoomed fit. Cancel closes fitting without committing changes. The public cover and preview use the same renderer and position calculation. Different container aspect ratios can show different rectangles while keeping the chosen focus; identical pixel crops across every screen width are not promised.

The shared avatar renderer uses initials if there is no image or an image fails to load. The public profile, header/profile selector and conversations receive the same canonical avatar. Where the peer's public profile remains available, its name and avatar link to that profile. Existing closed messaging payloads keep their original field shape.

## Validation and authority

The browser decodes bounded JPEG/PNG/WebP input with the existing local image primitives, applies orientation, reduces dimensions and prepares a bounded WebP derivative. The original local file is not retained by this feature. The Node server independently decodes the prepared input with Sharp, rejects unsupported/animated or oversized input, normalizes dimensions and orientation, encodes WebP and checks that metadata is absent. Browser MIME or filename alone is never accepted as proof of a valid image.

The API checks the configured origin, actual authenticated user and exact expected identity. It reuses the configured project credentials but does not depend on listing-publication pilot membership or enabled status. Private profile-media RPCs enforce the actual profile owner's authority. The server key remains server-side.

The new `profile_media_private` schema contains a bounded upload registry and the current per-identity media selection. Each upload is registered before Storage writes. Server-only confirmation records the derivative's SHA256, byte size and dimensions after exact-object readback. An authenticated final save can adopt only an eligible, verified image belonging to that user, identity and slot. It again locks and checks the active identity, owner and current media revision. A missing or stale revision cannot silently overwrite a concurrent change.

Media has its own revision. Existing text/location snapshots and `profile_revision` are left intact, so a media save does not overwrite a description draft or introduce a false text conflict. A successful media change updates the shared local media revision. Conflicts require an explicit refresh/review; a network timeout is an uncertain result, not an automatic retry instruction.

## Canonical reads and compatibility

One internal resolver determines the current avatar and cover. Before a slot is first managed, compatible legacy display values can remain visible. Once the slot is explicitly set or removed, its managed state is authoritative. In particular, removal returns no image and cannot revive a fallback URL from another old profile field.

Existing public profile, chooser, active-identity and conversation projection functions are updated without changing their return signatures. Cover dimensions and fitting coordinates come from a separate public media RPC. Peer-profile navigation also uses a separately validated public lookup instead of adding keys to the existing closed conversation identity card.

## Replacement, removal and cleanup

Only the new managed registry participates in cleanup. Replaced or removed assets become unavailable for adoption. New uploads can be adopted for one hour; retries stop after 55 minutes and unused-upload cleanup starts after 65 minutes, leaving a grace period around the 55-second whole-request deadline. The cleanup worker claims a small batch of exact registered keys and uses the Storage API. It never deletes SQL Storage rows directly, never deletes a prefix recursively and never deletes arbitrary URLs or unregistered legacy files.

Successful public-reference removal is independent of the background cleanup result. Uncertain cleanup remains eligible for a later retry. A current-key absence check confirms the API-visible outcome, not destruction of every historical version, browser cache or backup. An already accepted remote upload can theoretically complete after a client abort; the timing grace handles the bounded in-process race but does not promise universal erasure. The immutable registry remains available for later reconciliation. The original collection did not include the bucket's actual versioning/lifecycle values. Account-wide final erasure and retention policies remain separate work.

## Delivery and verification boundary

The downloadable installer is bound to the exact accepted source inventory, the original successful editor journal and the latest collector result. It performs fresh source/index/remote and database checks. After local checks and a Next/TypeScript build, it applies one reviewed SQL transaction; a separately verified result precedes commit and push. Uncertain SQL outcomes are read back and are not blindly replayed.

The package includes focused synthetic tests and their input hashes. These check the new owner/identity boundary, media revision conflicts, malformed images and responses, immutable Storage paths, canonical removal, cleanup claims, and cover fitting. Local compilation and synthetic component/DOM tests do not prove a successful production upload. Interactive Chromium verification could not start because this execution environment refused its socket creation; no pixel-layout or live-browser success is claimed. The actual Mac result and matching Vercel deployment must be accepted separately.

## Scope kept separate

This release does not change registration choices, company ownership/transfer, general account deletion, listing/service publication, advertising prices, paid promotion or AI availability. It does not bulk-delete existing profile images. AI stays disabled. Broader launch security review and dependency updates remain outstanding tasks.
