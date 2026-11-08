# Saved horse confirmations and idle gallery controls

Date: 2026-11-08. User acceptance establishes that the previous horse gallery,
owner-thumbnail/link and lifecycle changes work in the browser. This repair
finishes two requested interactions. It does not repeat or reopen accepted
status, public visibility, editing or expiry behavior.

## Gallery navigation

The shared `PublicPhotoGallery` restores the previous ordinary-listing timeout:
3000 ms of inactivity hides previous/next arrows. Pointer entry/movement, touch,
image selection and keyboard navigation reveal them and restart the interval.
Inline and enlarged views have separate timer lifetimes. Keyboard-visible focus
on an arrow keeps it visible; leaving it starts another interval. Enlarge, Close,
thumbnail and counter controls remain available. Reduced-motion users get no
fade transition. Disposed or superseded timers cannot hide newer activity.

## One saved factual confirmation per applicable listing and person

The source is the existing immutable `horse_offer_publication_events` record,
not a browser flag or a freshly checked checkbox. The authorized owner read adds
`saved_confirmation` to the same locked content/revision snapshot. The descriptor
binds the canonical offer UUID, identity, original confirming user, immutable
offer type, original publication event and original timestamp.

A missing descriptor leaves the existing explicit-confirmation form in place.
A malformed or foreign descriptor rejects the owner read. The editor rechecks
its current actor and offer type before displaying a compact saved-confirmation
message and optional readable statement details. It does not synthesize a fresh
set of affirmative booleans.

The prepare command accepts either the existing explicit factual map or the
exact singleton `{reusePublicationEventId: UUID}`. Reuse is allowed only for an
existing offer. Its exact reference is captured before the async operation and
preserved in the same durable intent on recovery. New offers still require the
existing explicit statements.

The database resolves the reference to actual original evidence under the
canonical offer/identity/revision checks. A repeated edit refers directly to the
original event, not a growing chain. The final write independently rechecks the
source and records `reused_from_publication_event_id` alongside the preserved
facts. Original events and timestamps are not rewritten. Published, paused and
sold editing retain the existing lifecycle behavior and finite deadline.

Current policy-version acceptance remains separate. A saved factual statement
cannot accept a new policy document or bypass the existing exact-version,
hash, actor and identity checks at preparation and publication. A different
confirming user, missing proof or inapplicable offer type requires explicit
statements; no account-wide assumed acceptance is introduced.

## Installation and evidence boundary

The new SQL repair is `supabase/repairs/20261108_horse_confirmation_reuse/`.
It adds one private lookup helper and replaces the owner snapshot, prepare and
publish functions. No table, role, policy or trigger is added and existing rows
are not bulk rewritten. Owner snapshot row-lock waits are bounded. The new
helper is not executable by clients or service_role.

The updater independently verifies the previous parity receipt and all 1226
source files, then its capacity-r2 ancestor receipt, tree, subject and exact
scope. Receipts only locate commits; they are not substitutes for Git-object
verification. Old source releases, applied SQL and journals remain unchanged.
A fresh repair preflight/apply/verification and separate resume journal bound
the new operation. No live database, Storage or deployment is touched while
preparing and testing the package.

Local checks use actual source with synthetic clocks/auth/HTTP boundaries,
PGlite and temporary Git repositories. They do not replace a production
browser, the user's Mac, native multi-connection concurrency or Vercel Ready.
The two short new user checks are in `docs/continuity/HOSTED_PORTAL.md`.
Services remain the next domain and use the same Publish / My Area Edit–Save
flow, keeping their canonical UUIDs and domain fields.
