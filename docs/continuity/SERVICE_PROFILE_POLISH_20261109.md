# Service photos and profile lists — 2026-11-09

This is a prepared source and delivery checkpoint. The current action is in
`CURRENT_STATE.json`; `HOSTED_PORTAL.md` contains the only current command.

## 2026-11-09 r2 continuation after the read-only diagnostic

The first delivery stopped before writes. Its exact report and the successful
19:33 read-only diagnostic are accepted. Two local fixture reconstruction errors
are now identified: retained PUBLIC EXECUTE on the category trigger helpers and
the original BETWEEN form of the category-name constraint. The complete
observed dependency fingerprint is reproduced from those source declarations;
production category tables and permissions are not changed to fit a fixture.

The r2 runtime application and all three reader change definitions are unchanged.
The verification below belongs to the original prepared patch; r2 reuses it by
hash and adds focused guard/report-path verification. Current installation
instructions are only in HOSTED_PORTAL.md. The diagnostic need not be repeated.
Details: SERVICE_PROFILE_STRUCTURE_DIAGNOSTIC_20261109.md and r2 kontrollid/.

## Accepted base and evidence boundary

The user's complete r2 report binds release
`9bf190a954c1d90e6c86e2f313d785bf4cfc9a8a13827c48dccd92bac2742ec2`
to commit `b05ed3047a25bc1504403ec70e98ae0ff7757bec`, parent
`78209e8ed0c7330b117d7db070b733eda5aa1723`, and the existing `/Users/taivo/selqiro`.
The report SHA-256 is
`517fb67df34bf21c6cdaa6856b2ad00487821c5f774fec33665a03ecd6f69202`.
It records database verified, build passed and push verified. It does not
record a verified Vercel Ready result; raw build and SQL stderr logs were not
supplied. The run ended at 2026-11-08 22:12:32 Europe/Tallinn.

All 1326 final sources were recovered by exact content hashes from retained
archives. Their Git tree is `4dd48a37bb2df4de686a6b930b951e9af115f63c`.
This reconstruction is an assistant-local source copy, not a new observation
of the user's live worktree, database or deployment.

The user accepted service text publication/editing and pause/edit/resume.
The outstanding photo observation was a selected file leaving the form at
0/10 in both create and edit. Accepted horse editing and gallery tests stand.

## Cause and bounded change

Returning from the native file chooser triggers window focus. The existing
owner hook starts a soft actor refresh: `ready` is temporarily false while
its established actor remains active. The old editor used `ready` to disable
the whole fieldset and reject both file callbacks, discarding the selection.

The editor now permits local draft changes during this soft recheck. Live
`canAct()` fencing still rejects a hard session or identity change before
React renders it. Publication and saving still require readiness, policy
consent and the current server-authorized owner context. File references are
copied before resetting the input, including early rejection paths, so the
same file may be selected again. No server, SQL writer, image capacity or
file validation rule is relaxed.

Both service list readers sort by `created_at DESC, id ASC` before the page
limit. Text edits, old manual sort values and reactivation do not move an old
service to the top. The UI removes a conflicting `display: block` declaration
so the existing two-line clamp works. Full descriptions remain in storage
and the service detail.

The public profile reads one typed union of ordinary listings and horse
offers. Preview is four cards; expanded pages contain up to 24 cards. The
server counts and pages after both domains' visibility checks. IDs, route
families, the selected shop category, page offset and return position remain
explicit. See `../architecture/profile-marketplace-feed-v1.md`.

## Owner-defined shop categories: actual audit

| Area | Present state |
| --- | --- |
| Category management | `StoreCategoryManagementCard` exists in My Area |
| Ordinary listing relationships | `listing_store_categories` exists; the public profile filter includes the seller's category descendants |
| Current managed-photo edit route | `IntegratedListingEditPage` does not render the assignment card |
| Older ordinary edit route | `ExistingListingEditPage` renders `ListingStoreCategoryAssignmentCard` |
| Horse and service assignment | No corresponding owner-category relationship in the publication models |

This update preserves the existing ordinary-listing public filter. Choosing
a shop category does not manufacture a horse/service relationship. Category
assignment in the current ordinary editor is the next concrete integration;
horse/service assignment needs an explicit domain contract first. This audit
is not a claim that a complete storefront taxonomy has been implemented.

## Original prepared source verification, reused by hash in r2

- Production Next.js/TypeScript build: PASS, 29.838 seconds, Node 24.22.1.
  All 557 runtime inputs remained unchanged. Configuration values were
  synthetic. The first attempt compiled and typechecked but page collection
  needed a synthetic OpenAI constructor key; only that environment changed.
- Photo regression: 7/7 PASS using the real editor, owner hook, gallery and
  identity/session event path. The unchanged base failed five of these seven.
- Unified profile regression: 13/13 PASS using ReactDOM and jsdom, including
  stale-request fencing, retry, filter/page context and canonical routes.
- SQL: 44 runtime checks and 16 installation/drift/rollback checks PASS.
  88 owner services and 88 combined listings cover multiple pages. The review
  binds 71 source pins and confirms all 507 prior Supabase files unchanged.
- Real Chromium 153.0.8010.0: 14/14 cases PASS, English/Estonian, create/edit,
  390/1365 px. Actual components, files/blobs and production CSS were exercised
  with synthetic Auth/API and controlled focus timing; no external network
  request occurred. All 12 description measurements were 48 px at 24 px line
  height, including My Area, profile preview and expanded service list.
- Delivery regression: 15/15 PASS in disposable local Git repositories,
  including exact prior receipt binding, guarded source/index/remote checks,
  backup, scoped commit/push, repeat no-op, uncertain SQL reconciliation,
  failed build, journal lock and report-write failure. The database/build
  boundaries are synthetic in this delivery test; their real checks are above.
  Final package hash binding and the narrow final-package integration receipt
  are retained in `kontrollid/`.

The SQL environment is PostgreSQL/WASM, not native concurrent connections or
live PostgREST. React API/Auth boundaries are synthetic. The complete build is
assistant-local. See the final package's `kontrollid/` evidence and
`supabase/repairs/20261109_service_profile_polish/service-profile-polish-review.json`.

The four previously recorded public-profile-offerings error-text expectations
remain separate test debt (21/25 in both old base and prior candidate). No old
installation or broad test suite was rerun in this change.

## Delivery and remaining boundaries

The new SQL changes only three read functions in one guarded transaction.
Preflight binds the retained dependency/authority catalog and exact before or
after reader definitions and ACLs. Unknown drift is a stop, not an implicit
repair. Existing service, listing, image and shop-category rows are unchanged.

The installer validates the exact previous success receipt and full Git tree,
fresh complete index/source/branch/approved remote, preserves backups and old
journals, verifies SQL outcome, builds with existing locked dependencies, then
commits only the manifest scope and pushes normally. Ambiguous SQL outcomes
are read-reconciled; uncertain writes/commits/pushes are not blindly repeated.
A report-write failure retains the last durable record and names its path.

This package does not perform Storage deletion or deploy by itself. A verified
push is followed by the user's observation of the same commit's Vercel
Ready/Production result and the narrow usage test in HOSTED_PORTAL.md.

General automatic cleanup, removal of technical test controls before public
launch, secure identity switching, category integration, and later Energy,
payment core and limited AI work retain their existing scope and priority.
