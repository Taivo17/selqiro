# Horse listing lifecycle parity

This repair keeps `public.horse_offers` as the canonical horse identity and reuses its existing edit revision, gallery, publication event, owner identity checks and image pipeline. It changes five installed function definitions and adds seven functions. It creates no tables, roles, policies or triggers and performs no bulk update of existing offers.

## Behavior

- A new horse publication stores an activity deadline exactly `2160 hours` after the first publication time. Session timezone and daylight saving changes do not alter that duration.
- An older published offer with a null deadline uses its original `published_at + 2160 hours`. Missing or nonfinite effective deadlines do not grant public visibility. Existing rows are not renewed during installation.
- The owner sees the same three choices as ordinary listings: active (`published`), paused (`paused`) and sold (`closed`). A status change updates the corresponding state timestamps and edit revision, without extending activity.
- Explicit renewal of an active-status offer uses server time plus 90 × 24 hours. A longer existing period is preserved. Paused or sold offers must first be set active; that status change alone never extends an expired period.
- Content and photo edits to active, paused or sold offers preserve their lifecycle state and deadline. An expired edit stays expired. Preparing an edit before a later status change or renewal does not permit it to overwrite that action: the existing revision comparison rejects the stale publication.
- Public detail, marketplace search, identity-filtered profile results, media bindings and new seller contact use the same public predicate. Paused, sold and expired offers are excluded. Protected owner media remains available for management.
- Canonical publication proof is distinct from present public visibility. Completing an edit while paused, sold or expired closes its attempt normally and preserves eligibility for verified source-file cleanup. The shared completed-source worker still deletes only exact proven source objects, never the live web gallery.

## Owner action contract

The existing horse publication HTTP boundary adds three actions:

| Action | Database function | Purpose |
| --- | --- | --- |
| `owner-activity` | `get_my_horse_offer_lifecycle_v1` | Read a fresh identity-bound lifecycle snapshot. |
| `owner-set-status` | `set_my_horse_offer_status_v1` | Compare the exact source status, deadline and edit revision, then select active, paused or sold. |
| `owner-renew` | `renew_my_horse_offer_activity_v1` | Compare the same fields, then explicitly extend an active-status offer. |

The read and acknowledgement contain exactly ten fields: `schema_version`, `content_type`, `content_id`, `actor_user_id`, `identity_id`, `source_status`, `status`, `active_until`, `edit_revision`, `changed`. Timestamps retain microsecond precision. Every mutation binds the fresh edit revision and exact effective deadline. A successful HTTP status alone is insufficient; the transport verifies the returned actor, offer, source state, revision increment and deadline semantics. Uncertain mutations are not automatically replayed.

Only `authenticated` receives EXECUTE on the three owner RPCs. Existing active-identity and membership checks run inside the database transaction. Private helpers remain inaccessible to browser roles. The existing final writer receives EXECUTE only on the new canonical-publication proof helper needed to close an attempt.

## Installation boundary

`preflight.sql` and `verify.sql` return report kind `horse-lifecycle-v1`. `apply.sql` checks the complete known catalog in a transaction, acquires the scoped advisory lock, applies only the three modules when absent, and verifies the installed catalog and unchanged invariants before committing. An already verified installation is a no-op. Partial installation, unrelated private functions, function body/settings/ACL drift, role changes and policy changes are rejected.

The disposable fixture starts from the accepted upload-capacity-r2 capability `7b2ae16eb51a93d31d7542463eeb895f5116850332bb0e56a2b74c49827fc79b`. It restores the seventeen retained private release functions using the corrected capacity fixture before accepting that baseline. The guard generator records source provenance and preserves unrelated installed functions, existing function authority, canonical structures, RLS, triggers, roles and hosted context.

Do not run the module files individually against a hosted project. Use the composed updater, which also verifies the exact project source and prior successful receipt. The generated preflight is the final authority on whether the remote catalog matches this repair.

## Evidence

`runtime-result.json` records nine behavior scenarios, including real SQL publication/gallery flows, all five horse offer types, exact deadline and revision CAS, public revocation, protected owner media, stale edits, nonpublic edits, legacy deadlines and source cleanup. `installation-result.json` records twelve known-state, replay, drift, ACL and atomic rollback scenarios. `tests/horse-lifecycle-transport.test.cjs` adds focused mocked HTTP tests alongside the retained horse publication transport suite.

These checks use disposable PostgreSQL/WASM and synthetic provider metadata. They do not claim native simultaneous transaction scheduling, live Storage HTTP, a remote migration, a Mac updater run or a Vercel deployment. The user’s hosted source and runtime are checked by the updater and subsequent deployment verification.
