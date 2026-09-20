# Owner horse draft editor client v1

Base: `8914dc1`, 2026-09-19. This is a client package, not a database migration.
Canonical data remains `horse_offers`. Editor update never creates a generic
listing or a replacement horse offer. Creation remains `/v2/sell`.

## Data boundary

`getMyHorseOfferEditSnapshot(id)` calls `get_my_horse_offer_edit_snapshot_v1(id)`
once per read. It validates 0/1 row cardinality, owner detail, same requested
content/offer ID, identity UUID and decimal-string revision. Detail+revision are
one object. Never fetch a newer revision and pair it with stale input.

`ownerHorseDraftForm` accepts recognized EE/EUR schema-version-1 branch shapes.
Unknown wanted/recurring structures have no editable fallback. Optional unknown
metadata is preserved. Existing display hydration is reused only after shape
validation; wanted sex `unknown` is retained and labeled explicitly in shared UI.
The original owner snapshot, its form baseline and local input remain separate.

`buildOwnerHorseDraftChanges` projects active scalar form values and compares the
same hydrated baseline. Only changed leaves are parsed and sent; no raw details,
private address/coordinates, images, status/type, policy or Energy input exists.
Price/budget mode changes include the amount required to maintain that pair.
Optional clearing is null; omission preserves. Birth year/height/money enforce
server-compatible ranges and decimal precision. Server normalization is authoritative.
City/region changes are disabled and refused when a precise private location exists.

## Session

One `OwnerHorseDraftSession` belongs to a mounted authenticated user plus existing
UUID. Dependencies are actor, atomic read and update only. Immutable cached state
is subscribed through `useSyncExternalStore`; it is not a global/durable cache.
`OwnerHorseOfferEditPage` keys the editor by user ID and UUID. Effect cleanup
invalidates in-flight reads, and auth change closes and purges the session.

| Situation | Behavior |
| --- | --- |
| Initial read | Actor checks surround one atomic snapshot read. Stale/foreign results are ignored/refused. |
| Draft, valid shape | Editable permitted scalar inputs, fixed offer type. |
| Any other status | Read-only, no status change or draft recreation. |
| Save | Lock before actor await; copy scalar patch; exactly one update dispatch. |
| Save acknowledged | Reread atomic snapshot; data and revision replace together. |
| Canonical no-op | Same revision accepted, normalized server values reread. |
| Newer snapshot after ACK | Adopt entire newer snapshot and explicitly explain it. |
| ACK + failed read | Keep input and ACK; next action retries READ only. |
| Conflict / unknown result | Keep local input and baseline; refuse another write. Explicit discard/reload only. |
| Known validation rejection | No automatic retry; an explicit retry uses same loaded revision. |
| Identity A→B→A | Hide/block under B; preserve in-memory input; A return does not rebase revision. |
| Logout / other user / other route UUID | Old form removed; late responses cannot populate the new form. |

A dispatched write can still commit after an identity event or component detach.
A valid late ACK is retained (unless the account session is closed); it is never
labeled rolled back merely because UI context changed. Read retry reconciles it.
Client actor checks do not replace server ownership/revision checks or provide
an atomic cross-tab identity lock.

## Navigation and user surface

Only `/v2/my-area/horse-offers/<uuid>/edit` opts out of the existing identity
switcher's full reload. Other owner/energy/detail routes retain it. Existing
`/v2/sell` behavior is not rewritten. Owner detail labels a draft link `Muuda mustandit`.
My Area rows/search/view-all/return-scroll are unchanged in this package.

Visible Back, reset and discard/reload require confirmation before dropping input.
Refresh/close uses beforeunload when unsettled; browser support varies. Native SPA
Back or other links outside this feature are not a complete navigation-blocking
contract. No private form localStorage/sessionStorage, automatic cloud draft save
or analytics payload is introduced. Existing saved-image metadata is view-only.

## Validation and release

Installer requires exact 8914dc1 sources and 19 applied migration file guards;
previous completed rollout proof is read from the actual docs result ZIP. No DB
commands, packages, journal edits, commit/push or deploy are performed.
After exact file writes it runs 129 Node checks with explicit TAP and npm build,
then updates four docs and stages exactly 20 package paths. Failure preserves work
and external backups. Do not run a new patch over an unexplained failure.

Tests: 57 create regressions (one superseded static read-only assumption updated)
and 72 editor checks. Actual selected TS modules run with fake API responses;
strict core typing uses a fake transport declaration; UI tests are static and
transpilation checks, not React rendering or real authentication/SQL/browser tests.

Before commit/push: test an existing sale and wanted draft, same-ID persistence
including refresh, two-tab revision conflict, this editor's A→B→A behavior,
read-only non-drafts if available, existing image display, narrow view and ordinary
listing/create regressions. Browser save uses the configured real database.
No test should publish, modify Energy or use SQL to manufacture production fixtures.

First-create expected-identity/idempotency, images, publication, lifecycle,
store-category assignment and launch QA remain separately controlled work.


<!-- SELQIRO_OWNER_HORSE_VIEW_CORRECTION_20260919 -->
## Browser-discovered presentation and shell boundary

The 19 September browser test revealed that the owner detail page read seller
fields for wanted, and the horse wrappers lacked V2Shell. The pure ownerPresentation
model fixes detail semantics without touching update payloads or sessions. Wrappers
now compose the existing V2Shell once. Main landmarks belong to that shell; child
owner pages use div. Other routes/reload policy remain unchanged.

The current marketplace-item list projection/RPC omits wanted budget/search-area
entirely. Explicit detail-only list labels are an interim correctness measure, NOT
a completed list-data feature. A separate additive/minimized owner-read contract
is required to display actual values in list rows. Never use per-row detail fetches,
raw private tables, cached editor data or seller-field copies as a substitute.

New read-view tests exercise actual TS/TSX via synthetic data/hooks and a JSX element
interpreter, not React rendering. Header A-B-A and narrow browser validation remains
mandatory. The write-only CAS tests and save/auth session are unchanged.
