# Published listing photo removal v1

Implemented: 2026-11-04. User acceptance recorded: 2026-11-05. Current installation
and production evidence are tracked in `docs/continuity/CURRENT_STATE.json`;
this module document defines the retained behavior and limits.

## Goal and deliberately small scope

Allow the owner to remove one non-primary photo from an already published,
managed listing. At least one photo remains. To remove the current primary,
the owner first selects another existing photo as primary.

The selected photo disappears from the active gallery and its public and owner
media routes stop serving it. Remaining photos keep their original URLs and
ordinals. No listing, identity, message text or other photo is removed.

This step does not upload replacements or add new photos. Physical deletion of
the retired WEB object is a following bounded capability. Its reservation stays
charged until the existing accounting predicate accepts genuine deletion proof.

## Reuse and one source of truth

The existing `public.listing_images` rows are the active gallery. The existing
private cleanup ledger retains the exact removed WEB object's identity and
path with reason `published_image_removed`. This is also its durable retirement
record; no parallel membership table, queue, balance or workflow engine is added.

`managed_image_presentations_v1.revision` remains the one version for both
primary selection and membership changes. Initial publication slots, upload
receipts, hashes and final publication identity remain immutable.

An original slot is valid only when it has exactly one active public image row,
or an exact retirement record and no active row. Every original slot must be
accounted for. Arbitrary missing rows, extra rows, renamed URLs or a cleanup
record for an active WEB object remain invalid.

## Server command

`remove_my_managed_listing_image_v1` accepts the same actor, identity, listing,
attempt, expected revision and original ordinal fields as primary selection.
It uses the existing final-writer role and authorization helpers.

Within one transaction it:

1. Locks and verifies the authenticated actor, active identity and current
   private-owner or active-business-member access.
2. Locks the published attempt, publication, listing and its gallery in the
   existing order. Deleted or unrelated listings cannot enter this operation.
3. Validates the entire current gallery and exact expected presentation revision.
4. Requires a current non-primary target, at least two active photos and accepted
   completed-SOURCE deletion proof for that target slot.
5. Adds the exact WEB object to the existing cleanup ledger, removes exactly one
   public image row and advances the presentation revision exactly once.
6. Revalidates and returns the remaining gallery. Other URLs and the primary
   flag are unchanged.

Any failure rolls back all of these database effects. A stale revision is a
conflict, even if a repeated command appears harmless. An uncertain HTTP result
does not trigger a repeated write; the caller reads the current authoritative
gallery before permitting another photo action.

The SOURCE precondition prevents retiring the WEB reference while the accepted
SOURCE cleanup still needs it. The current test UI offers removal after the
owner receipt reports no remaining SOURCE files. The SQL boundary checks the
target's own durable proof, so other slots can still complete SOURCE cleanup.

## Read and privacy boundaries

The existing public and owner media binding RPCs must find the exact current
`listing_images` membership and must not find a WEB cleanup record. Old URLs
therefore stop serving the retired photo after the transaction commits.

The existing media handler rechecks the binding after Storage I/O. A binding
revoked during that I/O cannot authorize a new successful response. This cannot
recall bytes already delivered to a browser; HTTP responses remain private and
non-cacheable under the existing media contract.

The managed owner-status read lists current gallery members rather than
reconstructing all initial publication slots. Public discovery and detail already
read the active public image rows. Message history is not rewritten; existing
V2 listing-card image failures use their normal fallback.

Owner status remains independent of the strict gallery mutation validator. It
projects only exact current members through immutable slots, while receipt and
activity remain readable if a gallery row is malformed. The separate gallery
read refuses photo changes in that case; basic editing and the authorized
whole-listing removal path do not become dependent on perfect gallery data.

## Client and UI

The existing entity model, authenticated journey transport, owner hook and image
picker are extended. Original ordinals are unique, ordered identifiers in the
range 0–9; a valid active gallery may contain gaps such as `[0, 2]`.
Array position is never used as an original ordinal.

Removal confirmation is bound to the displayed actor, identity, listing,
attempt, gallery revision and target. Fallback previews cannot initiate writes.
No photo is optimistically hidden. A validated acknowledgement and fresh read
must confirm the resulting membership before displaying success.

Photo removal shares the hook's synchronous lock with primary selection,
SOURCE cleanup and whole-listing removal. This is an owner-action lock, not a
claim that the independent basics editor has a global lock. Same-owner refresh
keeps the mounted basics editor and unsaved input. Server locks and revision
checks protect overlapping writes from other tabs or sessions.

## Cleanup and rollout

The new reason does not create a deletion receipt and does not release WEB
quota. The generic cleanup RPCs remain closed. No Storage operation runs in the
installer or in this photo-removal command. Later whole-listing removal keeps
the existing retirement record and its exact object path.

`final_receipt.files_remaining` keeps its published SOURCE meaning; removed WEB
files are not silently added to that counter. The accepted SOURCE cleanup keeps
working for the remaining active slots through the revised gallery validator.

Install the guarded SQL before deploying the new client. Existing publication,
primary selection and SOURCE cleanup continue to work before any photo is
removed. An old tab that cannot parse sparse membership must reload; it must
not receive an invented contiguous gallery or overwrite a newer revision.

The user's public-launch UX decision remains: technical cleanup may stay visible
during testing, but before public access it must finish without user clicks or
an open owner page and its counter/buttons must disappear from ordinary views.
This step neither hides the panel nor claims that automatic cleanup is ready.

## Validation boundaries

Focused SQL checks cover permission and identity changes, sparse membership,
revision conflicts, atomic rollback, both old-URL bindings, retained SOURCE and
WEB accounting, later listing removal and installation guards. Model/transport
checks cover malformed acknowledgements, context loss and no automatic resend.

Build and browser checks cover the actual owner components, confirmation,
remaining primary, draft preservation, unknown outcomes and narrow screens.
Synthetic service fixtures are labelled as such. Exact results belong in the
current handoff's `kontrollid/foto-eemaldamine-20261104/` directory.

Neither prepared source nor local fixtures prove a Mac commit, database change,
GitHub push, Vercel deployment or real use. The new updater checks actual Git,
HEAD, the complete index/worktree, source hashes and approved remote before Mac
or database writes; the last known R3 hash is only an ancestry anchor.

## User acceptance — 2026-11-05

The user supplied a successful updater terminal result, matching Vercel
Ready/Production row and owner/discovery screenshots. One non-primary photo was
removed from listing 201 (three photos to two); a remaining photo was then saved
as primary and shown on the discovery card. The exact commit and observations
belong to CURRENT_STATE and the dated acceptance evidence, not a second status
record here. The initial unextracted-ZIP missing-file error preceded execution;
the later successful run resolves it without any installer change or replay.

The screenshots do not prove physical WEB deletion, quota release, an anonymous
read or a direct request to the retired URL. The retained local tests cover the
implemented media-binding contract. This release deliberately leaves retired
WEB objects private and charged. The next bounded capability should finish one
eligible retired WEB object through the existing cleanup ledger and transport,
then release its reservation only after authoritative absence is established.

## Bounded follow-up — 2026-11-06

The [retired WEB cleanup contract](hosted-retired-web-cleanup-v1.md) now defines
that separate prepared capability. The accepted photo-removal command remains
unchanged: it revokes gallery membership and queues the exact WEB object. A
separate explicit worker and authoritative absence proof finish its deletion
and release its reservation. The original acceptance evidence above remains
historical; CURRENT_STATE holds the new capability's actual delivery state.
