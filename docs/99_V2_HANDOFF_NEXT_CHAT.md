<!-- SELQIRO_LEGACY_CUTOVER_SOURCE_FINISH_20260916 -->
# Selqiro — current handoff: legacy retirement source completion

Read this CURRENT section before historical next tasks below. Evidence dates are
16 September 2026 (+03:00). This document cannot contain its own future commit hash.

## Actual source and test state

Base: `86e62d6e2ceff7b3dcefd164c9ac596c998f9cab` on main, compatible repeat-save client.
The nine-file legacy-retirement package passed real local SQL rollback/regression,
57 explicit-TAP Node tests (fake API transport), and build at 20:37-20:38. It was
staged, not committed. At 22:02 the separately executed real multi-connection
cutover experiment passed with the same staged bytes. Its disposable test database
was removed; original app database and database catalog checks matched. No new
production SQL or fresh remote Git check occurred in either local test run.

Reviewed evidence:
- `horse-legacy-retirement-local-20260916-203753-9ezi23ko.zip` SHA-256
  `280d09f0ac234cc5abf20a107f9e5092cced764790fb7b1268b913a43c700558`;
- `horse-legacy-cutover-local-20260916-220202-jlzrwn9t.zip` SHA-256
  `4b3a73556c8330b6d1b4838397ea2e6601c8d647b4acc06c592065e04a049d51`.

Source finisher amends only these four usual docs plus the existing retirement
contract. The migration and three SQL test files are unchanged. Final scope stays
NINE paths. Read the latest `horse-legacy-retirement-finish-*` result for actual
build/commit/push/clean state. Do not infer execution merely from this planned text.
Expected commit message: `Retire legacy horse draft updates after local validation`.
If stopped, review exact staged/unstaged state; no reset, deletion or broad restaging.

## One next task AFTER reviewed committed/pushed source

Design the controlled production cutover/write-pause and bounded old-transaction
drain contract, then do its separate read-only preflight against the exact committed
source. Do NOT apply from the source completion. The existing production CLI pin
and environment notes below remain applicable, but connection/permissions/state
must be freshly verified before any production rollout.

Important finding: an already running old function can finish after replacement.
In the negative control it overwrote newer SYNTHETIC content while drain was pending.
Replace→drain alone is not an ingress pause and is not a no-loss online-cutover proof.
The local experiment used exact horse functions but synthetic auth/identity/policy
fixture dependencies. It tested old calls before a row lock and waiting on a row
lock, idle transactions, cached SQL and a true two-writer CAS race. Tracking stayed
ON. Six deliberately corrupted observer responses were synthetic only; no live
tracking-off connection or prepared two-phase transaction was created.

Production `20260913190000` remains previously applied (14 Sep); never edit it.
Candidate `20260916200000` is NOT production-applied by this source finisher.
No persistent local revision/retirement installation was added to the original
postgres app database. Owner editor remains read-only. First-create atomic expected
identity and durable idempotency remain separate launch risks. Publication, images,
Energy, lifecycle, categories and My Area Back/scroll are not changed. Client
86e62d6 Ready/Production and live-domain rendering remain accepted user visual proof;
prior identity A→B→A, wanted and narrow browser checks need not be repeated now.

## Verified environment and do-not-rerun boundary

Mac arm64; Python 3.9.6; Node v24.16.0. Use explicit TAP for Node summaries. Stop dev
before build. The local PostgreSQL postgres role OID is text `"16384"`; it can create
a test DB and read stats but cannot SET track_activities. No grant/elevation is needed.
Local target remains existing healthy supabase_db_selqiro, project selqiro,
public.ecr.aws/supabase/postgres:17.6.1.104; pin its local Unix Docker socket and ID.
No guessed config.toml, init/reset, latest package install or production URL fallback.
Keep `~/Downloads/selqiro-recovery/horse-legacy-cutover-86e62d6-attempt.json` and all
result ZIPs. Successful cutover journal state is COMPLETE; do not delete to rerun.
Completed retirement-local, cutover v1/v2, capabilities diagnostics, client
finishers/installers/collectors and earlier production scripts are not next actions.
Project DNA, privacy, optional save-later/publish-first and Energy participation
principles remain unchanged. Test listings/accounts/identities are NOT deleted.

---
## Historical entries below — superseded next-task instructions

<!-- SELQIRO_HORSE_LEGACY_RETIREMENT_LOCAL_20260916 -->
# Selqiro — current handoff, 2026-09-16 legacy writer local candidate

Read this section before historical next-task entries below.

## Verified baseline

Source `86e62d6e2ceff7b3dcefd164c9ac596c998f9cab`, main, committed/pushed and clean
in the user's 15 Sep completion. 57 tests/build passed then; A→B→A, wanted and narrow
manual evidence is accepted. 16 Sep Vercel/listing screenshots confirm Ready/Production
and updated real-domain rendering (not an API alias proof). Do not repeat completed
client, copy, inspector, preflight, apply or commit runners.

Production `20260913190000` was applied on 14 Sep; never edit it. Local revision-layer
installation is not assumed: earlier local migrations were rollback tests.

## Current local candidate and evidence boundary

The new runner prepares nine files at this source base: retirement migration,
BEFORE/AFTER compatibility fragments, post-retirement update regression, architecture
contract and four usual docs. This section is written after the user's actual local
SQL rollback checks, 57 explicit-TAP Node tests and build pass. Read result.txt and
source-manifest.json for actual time/scope. Files are staged, NOT automatically
committed/pushed. No production application, persistent local migration or UI change.
Owner editor remains read-only. User test listings/accounts/identities remain intact.

## One exact next action

Review the local result ZIP and candidate. Before production authorization, complete
and review the two-connection bounded cutover/drain validation for already-started
old invocations. Do not treat sequential rollback success as completion of that step.
The new function rejects non-null p_offer_id; null-ID create stays compatible. The
new CAS writer, snapshot and revision trigger are unchanged. No global lost-update
claim until the old in-flight boundary is resolved. Then source commit and separately
approved fresh production preflight/apply follow; never apply directly from this note.

First-create expected identity and durable idempotency are open, separate contracts.
No owner editor, publication, Storage, Energy, lifecycle, categories or Back/scroll
work is included. The remaining future-tense content-type helper is deferred UI copy.

## Environment and workflow

Project ~/selqiro; observed Mac arm64, Python 3.9.6, Node v24.16.0. Explicit TAP avoids
the earlier default reporter mismatch. Stop dev before build. No package installation.
No supabase/config.toml is required. Local Docker target must freshly match
supabase_db_selqiro, project label selqiro and image public.ecr.aws/supabase/postgres:17.6.1.104,
using a pinned absolute Unix socket and full container ID. No remote DB URL or CLI in
this local runner. Existing pinned production CLI 2.117.0 details remain below.
No reset, automatic restore or deletion of user edits. Keep output ZIP and attempt journals.
Documentation/handoff are part of each coherent checkpoint. Preserve Project DNA,
publish-first optional saving, equal participation/Energy and privacy.

---
## Historical entries — superseded next tasks follow

<!-- SELQIRO_REPEAT_SAVE_BROWSER_COPY_20260915 -->
# Selqiro — current handoff, 2026-09-15 repeat-save completion

Read this section before older entries. Project DNA and the verified environment
below remain. Do not return to old CLI/preflight/local-repair or owner-read work.

## Current evidence, not assumed completion

Base commit: `4a910a9c72ca8d244a71c304789b6fb930eee6bd`, previously pushed.
The 2026-09-14 22:10 installer produced 23 staged files, not a commit. Its real
build and 53 Node checks passed; API transport was fake, not browser integration.
The user subsequently confirmed wanted persistence and narrow layout; on 15.09
at 21:05 the A→B→A identity test was confirmed. B's save action is disabled with
a context warning, A's is enabled again, and the user reports preservation. The
screenshots are not independent UUID/count verification or a full concurrency test.

The completion adds text-only changes in four shared components and four copy
regression tests, plus these documentation notes. Total planned client checkpoint:
27 changed files. Save/auth/session/RPC code is identical to the installed version.
Read result.txt/git-head.txt from the completion ZIP for its actual build, browser
confirmation, commit, push and clean state. This document cannot contain its own
future commit hash. Do not assume a prepared completion script has run.

Production migration `20260913190000` was applied and verified on 14.09 at 20:08–20:11.
This client/copy completion has NO database or migration commands. Local persistent
schema was not advanced by the earlier rollback tests. Owner editor stays read-only;
refresh of /v2/sell does not resume a draft's in-memory session. Images are not saved.

## One next task

When the completion ZIP confirms commit/push and a clean tree, verify the deployment
of that exact client commit before designing the separately controlled server legacy
update retirement. If completion is stopped, review its last result first; do not
start a new feature or blindly repeat an earlier installer. Existing source is in
the result ZIP, so request only genuinely missing context.

Remaining boundaries: old server clients can still write without CAS; first creation
has no atomic expected-identity input or durable idempotency. No global lost-update
or duplicate-creation guarantee. Conflict/ambiguous responses keep user input but
must not fetch a new revision just to resend stale input. Publication, image/Storage,
status lifecycle, store categories, Energy and My Area Back/scroll are separate.

## Do not rerun / testing limits

Do not rerun the completed client installer, collectors, rollout, preflight, CLI,
SQL repair or earlier commit scripts. Keep the production attempt journal and the
applied migration immutable. This latest text correction is not new proof of server
isolation, other offer-type browser branches, logout integration or deployment.
Final small copy/ordinary-view checks are user confirmations recorded by the runner;
no new draft write is required for that check. Preserve necessary unsaved input
before refreshing or stopping a browser session.

---
## Earlier checkpoint entries — historical state follows

<!-- SELQIRO_HORSE_DRAFT_REPEAT_SAVE_CLIENT_V1 -->
# Selqiro — current client checkpoint, prepared 2026-09-14

Read this section before older next-task entries. Source base is pushed commit
4a910a9c72ca8d244a71c304789b6fb930eee6bd. This client installer's actual Git state,
tests and build are in result.txt and source-manifest.txt in its result ZIP. A
source change or staged patch is NOT a new commit or deployed client.

## One next action

Review the client installer's result and complete manual browser checks for sale
and wanted first/repeat saves, same UUID, persisted values, identity blocking,
type lock, image-local-only wording and narrow/ordinary-listing regression. Then
finish the scoped documentation/test confirmation and commit/push. No owner editor
exposure and no new SQL now. After deployment is verified, separately design and
test legacy-update retirement and first-create identity/idempotency safeguards.

## Current boundary

The shared /v2/sell page now composes an authenticated-user-keyed form. First save
uses the legacy RPC for creation only. Subsequent saves use the installed revision
RPC with changed scalar fields. The exact submitted baseline is paired with the
same write's revision; no silent conflict-token refresh. Same-user identity changes
preserve input; wrong context blocks saving. Unknown create/update outcomes and
conflicts block further same-form mutations. Other offer types need a new form.
This session cannot resume after navigation and is NOT durable idempotency.

Production 20260913190000 was applied and structurally verified at 20:08–20:11 on
2026-09-14; 18 histories aligned and final dry-run was clear. Do NOT rerun it or
edit that migration. Last source collection at 20:53 had 71 exact files, clean
4a910a9 and no missing imports. Collection was not a fresh remote/database check.
The owner editor remains read-only. Old loaded clients still have an unsafe legacy
update endpoint until a separate server restriction. First creation still has a
cross-tab identity race and response-loss/remount risk: client prechecks cannot
close those server-contract gaps. No global lost-update safety claim.

The installer runs only Node unit/contract checks and npm run build, not SQL or
authenticated RPC tests. Fake-transport and static UI checks are not React/browser
verification. The user must verify browser behavior before commit. The installer
does not start a browser/dev server or make database calls; manual save tests are
real private-draft writes on the app's configured Supabase project. Do not test
on valuable content and do not publish, change policies, charge Energy or upload.

Relevant modules: src/entities/horse-offer/api/ and model/draft*.ts;
src/features/listing-create/model/horseDraft*.ts and useHorseOfferDraftSave.ts;
ListingCreatePage/Form/TextFields/ImageFields and HorseOfferDraftSaveAction.
Contract: docs/architecture/horse-draft-repeat-save-client-v1.md.

## Environment and retained evidence

Mac project ~/selqiro, Python 3.9.6, Node v24.16.0. Stop npm run dev before build.
No dependency changes/install, Docker or Supabase CLI are needed for this client
patch. Verified native CLI 2.117.0 and local Docker details remain in the previous
checkpoint below; do not rediscover/reinstall them. No repository config.toml is
required. Keep prior result ZIPs and the production attempt journal.

Preserve Project DNA, simple publish-first UX, equal participation/Energy, privacy,
canonical horse_offers and source audit/build/browser/scoped commit workflow.
My Area Back/scroll, public horse publishing/lifecycle, images and categories remain
separate work. Completed collection/CLI/SQL/preflight/apply/docs scripts must not
be rerun. Do not add another patch on top of a failed build.

---
## Previous checkpoints (historical evidence; not the current next action)

<!-- SELQIRO_HORSE_DRAFT_UPDATE_PRODUCTION_20260914 -->
# Selqiro — current handoff, 2026-09-14 production rollout

Read this current section before the historical entries below. Older “next task”
and “not applied” statements do not override this checkpoint. Project DNA,
publish-first creation, equal participation/Energy and privacy decisions remain.

## Verified state and evidence boundary

- Source: `fae9914cca81cc1d21733274f5887e4e14bd2d05`, pushed to `origin/main`.
- At the user's 20:08–20:11 rollout: worktree clean, remote equal, no source/docs
  changes or new commit. This documentation checkpoint follows that source;
  obtain its own commit hash/push result from Git and the documentation runner ZIP.
- Production: `20260913190000` applied to `vyjletlmwoiwxsnsunlm`; all 18 migration
  versions paired after apply; final dry-run has no pending migrations.
- New revision column/check/trigger and four function contracts/explicit grants
  verified; other compared public DDL and existing save/read bodies preserved.
- Local tests/build: real 09:32 run passed all three rollback suites (64 new-suite
  assertions) and build. Test migration/fixtures were rolled back locally.
- Browser: previous user-confirmed wide/narrow read-only form test; wanted had no
  draft and remains browser-untested. No new runtime RPC or deployment verification.
- Current owner edit route `/v2/my-area/horse-offers/[id]/edit` is still read-only.
  Schema installation is not permission to expose saving or publication.

Rollout evidence: `horse-draft-production-rollout-20260914-200826-q4ulosn_.zip`.
SHA-256: `9599e642a855c6c2bbc746947eca91ebbe2c977c8f444a501a8238b9dde0a420`.
Private schema copies are under `~/Downloads/selqiro-recovery/horse-draft-production-rollout-20260914-200826-q4ulosn_/`:
`pre-public-schema.sql` and `post-public-schema.sql`. They are NOT data backups.
The shared ZIP contains schema reports/hashes, not full schema or application rows.

## One next development task (after this documentation commit is confirmed)

Resolve the legacy repeat-save transition before exposing owner editing. Inspect
current `useHorseOfferDraftSave.ts`, `horseOfferDraftSave.ts`,
`saveMyHorseOfferDraft.ts`, their type/caller contracts and both save/update SQL
contracts. Design one safe first-create and revision-checked repeat-save contract,
preserving stored values and valid user actions without silently changing offer type.
Any server restriction needs its own local tests and controlled production rollout.
Do not break the existing creation flow by restricting the legacy endpoint before
the compatible client path exists. Do not treat this note as an approved SQL design.

The legacy `save_my_horse_offer_draft_v1` still accepts draft/rejected updates and
has no expected revision. Its writes now increment revision but can still overwrite
newer content when a stale legacy session writes last. No global lost-update claim.
The new writer is exact-draft, existing-ID and closed-patch only. Use one atomic
snapshot, preserve revision as decimal text, retain user input on conflicts and
never automatically fetch a new revision just to retry the same old form.

Relevant source roots: `src/entities/horse-offer/`,
`src/features/listing-create/`, `src/features/horse-offer-edit/` and
`docs/architecture/horse-offer-draft-update-v1.md`. The result ZIP exports selected
current source; request only missing files, not another whole-chat recollection.
Publication, images/Storage deletion, lifecycle, categories, Energy and My Area
`Vaata kõiki`/Back/scroll restoration remain separate. `horse_offers` stays canonical;
no duplicate generic listing. “Salvesta hilisemaks” stays optional.

## Verified environment — do not rediscover or guess

Mac: Darwin arm64; observed Python 3.9.6 and Node v24.16.0. Project `~/selqiro`.
No repository `supabase/config.toml`: absence is valid; do not run init/reset.
Linked project comes from the existing `.temp/project-ref`, checked against the
exact production project above. Do not export credentials or connection strings.
Supabase is not on PATH. Verified existing CLI runtime is 2.117.0, invoked at
`~/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase`;
matching `bin/supabase-go` is pinned. `cli-pin.json` in the rollout evidence contains
all five exact hashes. No npm/npx/latest installation is needed; cache changes
require a new check, not blind reuse. This is snapshot pinning, not vendor signing.
Local database: `supabase_db_selqiro`, project label `selqiro`, image
`public.ecr.aws/supabase/postgres:17.6.1.104`; use only a verified local Unix socket
and exact container ID for future local SQL tests. Healthy status must be rechecked.

Do NOT rerun completed apply, preflight, CLI-inspector, local-repair or source-commit
runners. Do NOT remove the production attempt journal to bypass its protection.
Never edit the now applied `20260913190000` migration. Preserve the current handoff
and a short result ZIP at each coherent checkpoint; distinguish prepared scripts
from actual executions, and local tests from production/browser/deploy evidence.

---
## Historical entries — earlier next tasks and states are not current

# Selqiro V2 handoff järgmise vestluse jaoks

Viimane stabiilne seis:
- V2 avalik profiil töötab.
- Avaliku profiili kuulutused on horisontaalselt scrollitavad ja leht jääb paika.
- V2 Minu ala kuvab aktiivse identiteedi dashboardi.
- V2 Minu ala "Sinu kuulutused" on ühendatud päris andmetega.
- My Area kuulutuse rida:
  - pilt/tekst avab avaliku kuulutuse
  - "Muuda" avab edit-vaate
  - status active/paused/sold on muudetav otse Minu alas
- Paused/sold ei ilmu avalikul profiilil teistele, kuid omanik saab neid Minu alas hallata.
- V2 kuulutuse edit-vaade olemas:
  - põhiandmeid saab muuta
  - status ei muutu edit-vaates
  - pildid:
    - saab lisada mitu pilti
    - saab kustutada
    - saab muuta esimeseks
    - ühe allesoleva pildi kustutamine on keelatud
- V2 kuulutuse detailvaade:
  - pildi osa mobiilis ja desktopis testitud
  - lightbox toetab nooli, swipe'i ja noolede auto-hide käitumist
- V2 toodete vaates:
  - pilt ja tekst avavad kuulutuse
  - "Ava kuulutus" pole enam põhitegevus
  - desktop pildicrop on kompromissina paika jäetud
- V2 Minu ala kuulutuste otsing/filtrid töötavad:
  - otsingusõna
  - status all/active/paused/sold
  - store_categories rubriigid, kui olemas
  - "Vaata kõiki (N)" / "Näita vähem"
  - filtrite tühjendamine

Olulised failid:
- app/v2/my-area/page.tsx
- components/v2/my-area/V2MyAreaPage.tsx
- src/features/my-area/components/MyAreaListingsSection.tsx
- src/features/my-area/model/useMyAreaListings.ts
- src/features/my-area/model/useMyAreaStoreCategories.ts
- src/entities/listing/api/getMyIdentityListings.ts
- app/v2/my-area/listings/[id]/edit/page.tsx
- components/v2/my-area/V2ListingEditPage.tsx
- src/features/listing-edit/components/ListingEditPage.tsx
- src/entities/listing/api/updateListingBasics.ts
- src/entities/listing/api/updateListingStatus.ts
- src/entities/listing/api/uploadListingImage.ts
- src/entities/listing/api/deleteListingImage.ts
- src/entities/listing/api/setListingPrimaryImage.ts
- src/features/listing-detail/components/ListingDetailPage.tsx
- src/features/product-discovery/components/ProductListingCard.tsx

Järgmine loogiline töö:
1. V2 rubriikide haldus Minu alas:
   - lisa rubriik
   - muuda rubriiki
   - kustuta rubriik
   - rubriikide järjekord hiljem
2. V2 kuulutuse edit-vaates rubriigi määramine:
   - vali üks või mitu oma rubriiki
   - salvesta listing_store_categories seos
3. Avaliku profiili V2 poolel rubriikide filter:
   - avalikul profiilil saab vaadata kuulutusi rubriigi järgi
   - paused/sold jäävad avalikult peitu
4. Sama loogika hiljem teenustele, tootenäidistele ja uuendustele.

Oluline otsus:
- Rubriikide haldus on eraldi suurem moodul.
- Seda ei tasu teha vana pika vestluse lõpus.
- Uus vestlus peaks alustama V2 rubriikide haldusest.

Kontroll enne töö alustamist:
npm run build
git status --short

---

## 2026-07-13 store category hierarchy checkpoint

Completed:

- `store_categories.parent_id` added
- self-referencing foreign key uses `ON DELETE RESTRICT`
- hierarchy index added
- same-identity validation added
- self-parent and recursive cycles blocked
- existing 13 categories remain root categories
- rollback test completed with no test data left behind

Architecture decision:

- V2 UI supports root + child categories
- database remains extensible to deeper levels later
- store categories remain separate from the global marketplace category tree

Next step:

- update the V2 store category type/loading layer to include `parent_id`
- display the existing root categories in a dedicated My Area management card
- do not add create/edit/delete in the same first UI step

---

## 2026-07-13 store category name integrity checkpoint

Completed:

- `store_categories.identity_id` is now required
- names are normalized before write
- name length is limited to 1–60 characters
- root sibling names are unique within an identity
- child sibling names are unique within an identity and parent
- same names remain allowed for different identities and different parents
- production migration and rollback test completed successfully
- existing 13 categories remain intact

Next exact step:

- add V2 root category creation
- create with `parent_id = null`
- show a 60-character UI limit and counter
- refresh the management card and listing category filters after creation
- do not add child creation, rename or delete in the same step

---

## 2026-07-14 secure store root category RPC checkpoint

Completed:

- secure root-category creation RPC added
- client supplies only the category name
- active identity is resolved in the database
- private ownership and business membership are validated
- anonymous execution is disabled
- store category RLS now also validates identity access
- own active-identity legacy direct writes remain functional
- cross-identity direct writes are blocked
- RPC and RLS rollback tests completed with no test rows remaining

Known follow-up:

- the current V2 `setActiveIdentity` client API needs a secure RPC before
  a final V2 identity switcher is exposed

Next exact step:

- create store-category entity API for root creation
- extend the My Area category hook with a create action
- add a compact `Lisa ülemrubriik` form
- UI maximum length is 60 characters
- show a character counter
- refresh both category management and listing category filters after success
- do not add child creation, rename or delete in the same step

---

## 2026-07-14 V2 root category creation checkpoint

Completed:

- V2 root-category creation entity API added
- My Area store-category hook now supports root creation
- compact root-category form added
- 60-character input limit and counter added
- empty input is disabled
- saving, success and error states added
- duplicate root names show a clear error
- management card refreshes after creation
- listing category filters refresh after creation
- no manual page refresh is needed
- active-identity isolation was browser-tested

Browser test:

- „Aiasaadused” was created for Taivo Garaaž
- Taivo Garaaž root count changed from 6 to 7
- duplicate „Aiasaadused” was rejected
- Milline Vedu remained at 2 root categories
- no category leaked between identities

Next exact step:

- add direct child-category creation
- each root card gets a compact „Lisa alamrubriik” action
- child RPC receives parent ID and name
- database verifies parent belongs to the active accessible identity
- V2 UI remains limited to two levels
- do not add rename or delete in the same step

---

## 2026-07-14 secure child category RPC checkpoint

Completed:

- secure child-category RPC added
- authenticated execution enabled
- anonymous execution disabled
- parent existence is validated
- parent must belong to the active identity
- parent must be a root category
- third-level creation is blocked by the V2 RPC
- sibling sort order is calculated server-side
- duplicate sibling names are blocked
- same child name under different roots remains allowed
- cross-identity parent usage is blocked
- rollback test completed with no remaining test rows

Next exact step:

- add child-category entity API
- extend `useMyAreaStoreCategories` with child creation
- add a compact „Lisa alamrubriik” action to each root card
- open the form only for the selected root
- use the same 60-character limit and counter
- refresh management hierarchy and listing filters after success
- do not add rename or delete in the same step

---

## 2026-07-14 V2 child category creation UI checkpoint

Completed:

- child-category entity API added
- My Area hook supports child creation
- compact per-root child creation form added
- only one form opens at a time
- 60-character validation and counter added
- duplicate sibling names show a clear error
- successful child creation refreshes hierarchy and listing filters
- V2 UI does not expose third-level creation

Browser-tested:

- SÕIDUAUTOD, VEOAUTOD and MAASTURID were added under AUTOD MÜÜGIKS
- duplicate child creation was rejected
- hierarchy updated without manual page refresh

Next exact work:

1. make listing category filtering hierarchy-aware in the database
2. root selection must include the root and descendants
3. replace the flat My Area category pills with a compact hierarchical filter
4. later reuse the same filter foundation on the public profile

---

## 2026-07-15 hierarchical store-category listing filter checkpoint

Completed:

- recursive category-scope helper added
- `get_my_identity_listings` category filter is now hierarchical
- RPC signature remains unchanged
- root category selection includes descendant-assigned listings
- child category selection narrows to the child scope
- unrelated category branches do not match
- active identity access is checked inside the listings RPC
- no duplicate parent listing-category link is required
- rollback test completed with no remaining test data

Next exact step:

- create a reusable hierarchical store-category filter component
- replace flat category pills in `MyAreaListingsSection`
- initially show `Kõik rubriigid` and root categories
- selecting a root selects its full branch and opens direct children
- selecting a child narrows to that child
- only one root group is expanded at a time
- selected child keeps its root expanded
- clearing filters resets category selection and expanded group
- do not modify the listings hook or entity API in this UI step
- later reuse the same filter foundation on the public profile

---

## 2026-07-17 My Area hierarchical category filter checkpoint

Completed:

- reusable hierarchical category filter component added
- flat My Area category pill list removed
- initial filter state shows roots only
- selecting a root opens direct children
- root selection filters the complete descendant branch
- child selection narrows to the child scope
- selected child keeps its root open
- only one root branch is expanded
- all-categories and clear-filters close the hierarchy
- listing hook and entity API contracts remain unchanged
- build and browser tests completed

Recovery note:

- during development, stale Next.js Fast Refresh state caused:
  - useEffect dependency-size warning
  - repeated Failed to fetch messages
- source code was not the cause
- stopping dev, deleting `.next`, building and restarting dev resolved it
- do not run `npm run build` while `npm run dev` is using the same `.next`
  directory

Important current files:

- `src/features/store-category-filter/components/StoreCategoryHierarchyFilter.tsx`
- `src/features/my-area/components/MyAreaListingsSection.tsx`
- `src/features/my-area/model/useMyAreaListings.ts`
- `src/entities/listing/api/getMyIdentityListings.ts`
- `supabase/migrations/20260714140000_add_hierarchical_store_category_filter.sql`

Next exact step:

- add secure store-category rename RPC
- rename may apply to a root or child
- category must belong to the authenticated user's active identity
- renaming must not change `parent_id`
- use the existing 60-character normalization and uniqueness rules
- add rename entity API and one inline rename UI
- do not add delete in the same step

---

## 2026-07-17 secure store-category rename RPC checkpoint

Completed:

- secure category rename RPC added
- root and child categories are supported
- active identity ownership is validated
- anonymous execution is disabled
- only the category name is changed
- hierarchy position and sort order remain unchanged
- normalization and sibling uniqueness are enforced
- rollback test completed with no remaining test data

Current UI status:

- category rename buttons and inline editor are not implemented yet

Next exact step:

- add store-category rename entity API
- extend `useMyAreaStoreCategories` with rename state/action
- add a compact `Muuda nime` action to root and child cards
- allow only one active inline editor
- use the existing 60-character limit and counter
- refresh hierarchy and listing filters after success
- do not add delete in the same step

---

## 2026-07-17 V2 store-category rename UI checkpoint

Completed:

- root rename UI added
- child rename UI added
- shared inline rename control added
- only one category can be edited at once
- 60-character limit and counter added
- cancel, saving, success and error states added
- hierarchy position remains unchanged
- category management and listing filters refresh after rename
- build and browser tests completed

Next exact step:

- add secure category deletion RPC
- child categories may be deleted
- roots may be deleted only when they have no children
- listings must remain intact
- only listing/category links are removed
- deletion must be restricted to the active accessible identity
- selected deleted filters must reset to all categories
- do not add automatic cascading child deletion

---

## 2026-07-17 secure store-category delete RPC checkpoint

Completed:

- secure store-category delete RPC added
- child deletion is supported
- childless root deletion is supported
- roots with children are protected
- automatic cascading child deletion is not allowed
- listings remain intact
- only listing/category links are removed
- removed relation count is returned
- active identity access is validated
- anonymous and cross-identity deletion are blocked
- rollback test completed with no remaining test categories or relations

Current UI status:

- category delete buttons and confirmation UI are not implemented yet

Next exact step:

- add `deleteMyStoreCategory` entity API
- extend `useMyAreaStoreCategories` with deletion state/action
- add a compact delete action to root and child controls
- disable root deletion while it has children
- require an explicit confirmation step
- explain that listings remain but category links are removed
- after success, refresh management hierarchy and listing filters
- reset a deleted selected filter to `Kõik rubriigid`

---

## 2026-07-17 V2 store-category delete UI checkpoint

Completed:

- delete entity API added
- category hook supports deletion
- shared delete confirmation control added
- child categories can be deleted
- childless roots can be deleted
- roots with children show a disabled delete action and explanation
- deletion requires explicit confirmation
- listings remain intact
- removed listing-link count is shown after success
- management hierarchy refreshes automatically
- listing category filters refresh automatically
- stale deleted category selection resets to „Kõik rubriigid”
- build and browser tests completed

V2 store-category management now supports:

- root creation
- direct child creation
- root and child rename
- safe root and child deletion
- two-level management UI
- recursive database hierarchy filtering
- hierarchical My Area listing filter

Not implemented yet:

- drag-and-drop or manual ordering
- moving a child between roots
- deeper-than-two-level management UI
- public profile category filtering

Next exact step:

- add store-category assignment to the V2 listing edit page
- load categories for the active identity
- show roots and children hierarchically
- allow selecting one or more categories
- store only explicit `listing_store_categories` links
- do not add duplicate parent links for child selections
- validate category ownership in the database
- save category relations separately from listing basic fields

---

## 2026-07-18 secure listing store-category assignment RPC checkpoint

Completed:

- secure listing/category assignment RPC added
- complete explicit assignment set is replaced atomically
- empty array removes all category links
- duplicate and null IDs are normalized
- active identity access is verified
- listing identity ownership is verified
- every category identity is verified
- failed validation preserves existing relations
- child assignment does not add a duplicate parent link
- rollback test completed with no remaining test categories or relations

Current UI status:

- listing edit does not yet show or save store-category assignments

Next exact step:

- add entity API for loading a listing's current category IDs
- add entity API for calling `set_my_listing_store_categories_v2`
- add a dedicated listing-category assignment hook
- create a hierarchical multi-select component
- show roots with their direct children
- allow selecting one or more explicit categories
- show unsaved-change state
- save categories separately from listing basic fields
- allow saving an empty selection
- reload current assignment after success

---

## 2026-07-18 listing category assignment client checkpoint

Completed:

- current listing category IDs can be loaded
- assignments can be saved through the secure RPC
- independent assignment state hook added
- dirty, clear, reset, saving, success and error states exist
- read-only assignment card added to the listing edit view
- child assignment path display verified in browser
- no duplicate parent relation was shown
- build completed successfully

Current UI status:

- existing assignments are visible
- category selection and assignment saving are not yet exposed

Next exact step:

- replace the read-only content with a hierarchical multi-select
- show root categories with direct children
- allow multiple explicit selections
- do not auto-select a parent when a child is selected
- add separate `Salvesta rubriigid` and `Taasta` actions
- allow clearing all assignments
- show dirty, saving, success and error states
- keep listing basics save unchanged

---

## 2026-07-18 V2 listing store-category assignment UI checkpoint

Completed:

- hierarchical listing category selector added
- roots and direct children are grouped together
- root and child selections are independent
- multiple explicit categories can be selected
- current saved selections load automatically
- dirty state is visible
- clear and restore actions work
- category assignment has its own save action
- empty assignment is supported
- save uses the secure atomic RPC
- refresh preserves the saved assignment
- listing basics and images remain unchanged
- My Area hierarchical filters use the saved relations correctly
- build and browser tests completed

V2 owner store-category functionality now supports:

- root creation
- child creation
- rename
- safe deletion
- hierarchical owner listing filtering
- listing assignment from the edit view

Next exact step:

- add hierarchical store-category filtering to the V2 public profile
- initially show root categories
- expand a root to show its direct children
- selecting a root must show listings from the full descendant branch
- selecting a child must narrow results to that child
- public viewers must see only active and publicly valid listings
- paused and sold listings must remain hidden from other viewers
- preserve relevance and public-profile layout

---

## 2026-07-19 V2 public profile category filter checkpoint

Completed:

- public store categories load by the viewed profile identity
- public category data does not depend on the viewer active identity
- recursive category branch scope added
- public listing query supports category relation filtering
- existing active and expiration visibility rules remain enforced
- compact public category filter added
- only root categories are visible initially
- selecting a root opens its direct children and applies the full branch filter
- selecting a child narrows the result
- selecting another root closes the previous branch
- all-listings clears the filter and closes the branch
- stale selection and profile changes reset safely
- request-loop protection uses a stable scope key
- build and browser tests completed

V2 store-category functionality now supports:

- owner root creation
- owner child creation
- owner rename
- owner safe deletion
- owner My Area hierarchical filtering
- listing category assignment from the edit view
- public profile hierarchical filtering

Next exact step:

- add the V2 identity switcher to the site header
- load all private and business identities accessible to the signed-in user
- show the current active identity
- switch through the existing active-identity API
- refresh every identity-scoped V2 owner module after switching
- do not let identity switching alter an already viewed public profile
- preserve public-profile identity isolation

---

## 2026-07-20 V2 identity switcher checkpoint

Completed:

- secure active-identity switch RPC
- direct profile-write validation trigger
- authenticated and anonymous privileges verified
- private and business identity rollback tests completed
- foreign and null identity selection blocked
- original identity restored after rollback test
- V2 identity entity API moved to secure RPC
- V2 header identity dropdown added
- loading, active and error states added
- identity-scoped owner routes reload after switching
- public profile route and viewed identity remain isolated
- listing read and write ownership rules aligned
- legacy user ownership applies only when `identity_id` is null
- wrong active identity immediately shows forbidden edit state
- redundant identity-profile slug lookup removed
- recursive `business_members` warning removed
- build and browser tests completed successfully

Current checkpoint files:

- `supabase/migrations/20260720170000_add_secure_active_identity_switch.sql`
- `src/entities/identity/api/getMyIdentities.ts`
- `src/entities/identity/api/setActiveIdentity.ts`
- `src/entities/listing/api/getEditableListingById.ts`
- `src/entities/listing/api/getListingById.ts`
- `src/features/v2-shell/model/useV2IdentitySwitcher.ts`
- `src/features/v2-shell/components/V2IdentityBadge.tsx`

Next exact step:

- extend the V2 listing edit view with location editing and Selqiro global category editing
- keep global category separate from owner-defined store categories
- validate identity-first ownership before loading and saving
- make location and global-category writes use a secure server/database boundary
- preserve existing listing store-category assignments
- do not weaken public listing visibility or active-identity isolation

## 2026-07-28 — Product-showcase lifecycle production checkpoint

Completed:

- product-showcase image management checkpoint was already committed as `f45e1af`;
- migration `20260726150000_add_product_showcase_activity_lifecycle.sql` was created;
- local reset, structural checks, behavior tests and RLS tests passed;
- application build passed;
- linked dry-run passed;
- the migration was applied successfully to production;
- local and remote migration histories both contain `20260726150000`;
- production schema dump confirmed every expected field, function, trigger, constraint, index and policy.

Important:

- never edit `20260726150000_add_product_showcase_activity_lifecycle.sql` after its production application;
- any database correction must use a new migration;
- the migration file and this documentation checkpoint still need to be committed and pushed to GitHub;
- the public Storage bucket remains a known future security boundary.

Next safe actions:

1. run `git diff --check`;
2. review the staged scope;
3. commit and push the lifecycle migration plus documentation;
4. verify a clean Git status;
5. begin the isolated owner-UI patch for expiry labels, warnings and explicit activity confirmation.

## 2026-07-30 – Product-showcase deletion production checkpoint

Completed and pushed to the linked production database:

- migration `20260729183000_add_product_showcase_delete_rpcs.sql`;
- archived-only permanent-deletion preparation;
- idempotent UUID deletion lock;
- showcase and gallery mutation guards;
- Storage upload guard;
- complete Storage cleanup manifest;
- safe cancellation before cleanup;
- mandatory completion after partial cleanup;
- final showcase and image-row deletion.

Validation completed:

- local reset;
- structural checks;
- database behavior checks;
- real local Storage API test, including a path belonging to another uploader;
- application build;
- production dry-run and push;
- production schema-dump object verification.

Next isolated patch:

1. add a trusted Next.js server endpoint for the complete deletion orchestration;
2. authenticate the requesting user on the server;
3. call the preparation RPC using the user's session;
4. delete all returned Storage paths using the server-only service/secret client;
5. call the final deletion RPC with the database-issued UUID token;
6. expose the workflow to the owner hook;
7. show `Kustuta jäädavalt` only for archived showcases with a strong confirmation step.

Do not call the three deletion RPCs directly from a browser workflow that would require exposing a privileged Storage key.

## 2026-07-30 – Product-showcase server deletion API checkpoint

Completed:

- trusted route `POST /api/product-showcases/delete`;
- server-side access-token verification;
- user-JWT-scoped preparation and finalization RPC calls;
- server-only service-role Storage removal;
- strict database-manifest path validation;
- bounded Storage delete batches;
- non-cacheable structured responses with request IDs;
- retry-safe handling of partial and concurrent deletion states.

Validation passed:

- application production build;
- route registration;
- client-bundle service-key marker check;
- missing-auth, malformed JSON, missing-ID, invalid-UUID and invalid-token tests;
- real local Auth-user E2E test;
- draft deletion rejection;
- archived showcase deletion;
- registered and cross-uploader orphan Storage cleanup;
- database row deletion;
- complete test-fixture cleanup.

Next isolated patch:

1. add a browser API wrapper that obtains the current access token;
2. expose `deleteShowcase` and `deletingShowcaseId` from `useMyProductShowcases`;
3. remove the deleted item from local state after success;
4. show `Kustuta jäädavalt` only for archived showcases;
5. require an explicit destructive confirmation;
6. disable all card actions while deletion is running;
7. browser-test success, cancellation and retryable error states.

## 2026-07-31 – Product-showcase permanent deletion UI checkpoint

Completed:

- browser API-wrapper for the trusted permanent-delete route;
- authenticated Bearer-token forwarding;
- management-hook deletion state and mutual operation locking;
- immediate local removal after successful deletion;
- archived-only `Kustuta jäädavalt` control;
- exact-title destructive confirmation;
- safe cancellation;
- inline deletion error handling;
- immediate owner count and success-message updates.

Validated in the browser:

- no delete control for published or draft showcases;
- delete control visible for archived showcases;
- confirmation opens correctly;
- wrong title cannot start deletion;
- cancellation performs no mutation;
- real archived showcase deletion succeeds;
- the card disappears immediately;
- the deleted showcase remains absent after reload.

The product-showcase deletion flow is now complete across:

- database locking and deletion RPCs;
- Storage cleanup protection;
- trusted server orchestration;
- authenticated browser API;
- owner management UI.

Next isolated product-showcase patch:

1. load published and currently active product showcases for a real public profile;
2. load their ordered gallery images;
3. render the compact and expanded public-profile showcase section;
4. exclude draft, archived, invalid and expired content;
5. test both anonymous and authenticated public-profile views;
6. preserve the existing public-profile category and expanded-view state boundaries.

## 2026-08-01 – Public-profile product-showcase checkpoint

Completed:

- dedicated public product-showcase and image model;
- active published showcase query;
- one batched gallery query;
- public-field minimization;
- public-profile loading hook;
- removal of the former empty showcase placeholder;
- compact horizontal showcase preview;
- responsive expanded showcase grid;
- selectable gallery thumbnails;
- fullscreen gallery with keyboard and pointer navigation;
- three-second inactivity hiding for gallery arrows;
- long-description `Vaata rohkem / Näita vähem` behavior;
- desktop, narrow viewport, authenticated and anonymous browser validation;
- successful production build.

The product-showcase feature is now complete across:

- owner creation and editing;
- Storage-backed image management;
- publication activity lifecycle;
- secure permanent deletion;
- active public-profile visibility;
- interactive public gallery browsing.

Recommended next isolated feature patch:

1. inspect the remaining placeholder service section on the public profile;
2. define a minimal public service read model;
3. connect only valid active services without changing the completed product-showcase boundary;
4. preserve the existing public-profile responsive and privacy rules.

## 2026-08-01 – Listing return-navigation checkpoint

Completed and browser-tested:

- shared tab-local listing return context;
- source history-token validation;
- products-page card marker and return-context capture;
- asynchronous products-page position restoration;
- detail-page contextual back action;
- direct-entry fallback to `/v2/products`;
- successful production build;
- browser back and visible „Tagasi toodete juurde” action both restore the products browsing position.

Current next patch:

1. connect public-profile listing cards to the same return-context foundation;
2. store and restore public-profile `Vaata kõiki`, selected store category and expanded category branch;
3. preserve the compact horizontal listing row's `scrollLeft`;
4. confirm that the detail action changes to „Tagasi profiilile” for this source;
5. browser-test both compact and expanded public-profile listing flows before commit.

## 2026-08-01 – Public-profile listing return checkpoint

Completed and browser-tested:

- public-profile listing cards use the shared listing return context;
- the detail action becomes „Tagasi profiilile” for this source;
- browser back and the visible detail action restore the previous profile position;
- expanded „Vaata kõiki” state is restored;
- selected store root or child category is restored;
- the expanded root branch is restored;
- compact horizontal listing-row position is restored;
- category request settlement is guarded by `resolvedScopeKey`;
- filtered, unfiltered and compact return flows pass manual testing;
- production build passes.

Recommended next isolated patches:

1. coordinate public-profile expanded sections so opening listings compacts product showcases and opening product showcases compacts listings;
2. defer the full store-category controls until the user opens „Vaata kõiki” on mobile;
3. add left/right touch swipe to public product-showcase galleries;
4. browser-test narrow mobile layouts before each checkpoint.

## 2026-08-02 – Public-profile exclusive expanded sections checkpoint

Completed and browser-tested:

- one shared expanded-section state on the public profile;
- product showcases and listings can no longer remain expanded together;
- opening either large section compacts the other;
- store-category controls remain hidden in compact listings mode;
- compacting listings clears the hidden category filter;
- listing-return restoration can still reopen the listings section and restore its saved UI state;
- desktop and narrow mobile interaction tests pass;
- production build passes.

Recommended next isolated patch:

1. add horizontal touch swipe to public product-showcase card galleries and the full-screen lightbox;
2. preserve thumbnail, keyboard and arrow-button navigation;
3. keep the existing three-second arrow auto-hide behavior;
4. browser-test touch behavior at a narrow mobile width before checkpointing.

## 2026-08-02 – Public showcase touch swipe mobile verification checkpoint

Implemented, pushed and verified on a real phone:

- horizontal swipe on expanded public showcase card galleries;
- horizontal swipe inside the full-screen lightbox;
- vertical page scrolling preserved with `pan-y`;
- compact horizontal showcase row remains independently scrollable;
- accidental lightbox opening after a card swipe is suppressed;
- existing thumbnails, buttons, keyboard controls and three-second arrow auto-hide are preserved;
- production build passes.

Real-device verification on the Vercel deployment confirmed:

- left and right swipe works on an expanded multi-image showcase card;
- left and right swipe works in the full-screen lightbox;
- vertical scrolling does not change the selected image;
- a normal tap still opens the lightbox;
- compact-row horizontal scrolling remains natural;
- existing arrow controls still hide after roughly three seconds.

The public showcase touch-swipe checkpoint is complete. The next feature patch may start from commit `2eab36b` plus this documentation confirmation commit.

## 2026-08-02 – Public showcase gallery extraction checkpoint

Completed and browser-tested:

- extracted `PublicProfileProductShowcaseGallery.tsx`;
- retained the section data and card-content boundary in `PublicProfileProductShowcasesSection.tsx`;
- preserved compact and expanded layouts;
- preserved thumbnails, full-screen lightbox, keyboard controls and Escape;
- preserved touch swipe and vertical scrolling;
- preserved the roughly three-second arrow auto-hide;
- preserved long-description „Vaata rohkem” behavior;
- preserved the mutually exclusive public-profile section expansion;
- production build passes.

Recommended next architecture patch:

1. extract the long-description measurement and toggle UI into a small focused component;
2. keep card layout and data mapping in the section;
3. avoid changing visual behavior during the extraction;
4. browser-test long, short and empty descriptions before checkpointing.

## 2026-08-02 – Public showcase description extraction checkpoint

Completed and browser-tested:

- extracted `PublicProfileProductShowcaseDescription.tsx`;
- moved overflow measurement, `ResizeObserver`, line clamping and expand/collapse state into the new component;
- retained data loading, layout and card composition in `PublicProfileProductShowcasesSection.tsx`;
- preserved short, long and empty-description behavior;
- preserved mobile responsiveness;
- preserved the separated gallery, lightbox, keyboard and touch-swipe behavior;
- preserved mutually exclusive public-profile section expansion;
- production build passes.

The focused public-profile architecture sprint is complete after extracting both the gallery and description responsibilities.

Recommended next isolated feature track:

1. begin the real V2 services foundation;
2. inspect the existing `services` schema and current placeholder UI before coding;
3. implement service display/load first;
4. then add create, edit, status lifecycle, images and public-profile integration in separate testable patches.

## 2026-08-02 – V2 service display foundation checkpoint

Completed and browser-tested:

- added the V2 `Service` entity model;
- added active-identity-scoped service loading;
- added a stale-request-safe `useMyServices` hook;
- replaced the My Area service mock list with `MyServicesSection`;
- added service status and price presentation;
- added loading, error, missing-identity and empty-list states;
- added compact preview and „Vaata kõiki / Näita vähem” behavior;
- removed the misleading static service count from the sidebar;
- retained listings, store categories and product showcases unchanged;
- production build passes;
- manual browser check confirms the correct zero-service empty state.

Recommended next isolated patch:

1. add service create/update input types and a `saveMyService` entity API wrapper around `save_my_service_v2`;
2. extend `useMyServices` with a guarded save mutation;
3. add only the first create-form UI in My Area;
4. keep status changes, images, deletion and public-profile services for later patches;
5. test creation under one active identity and verify another identity cannot see the draft.

## 2026-08-03 – Service category foundation checkpoint

Completed and production-applied:

- added `public.service_categories`;
- seeded 11 roots and 54 direct children;
- added stable category codes and localized labels;
- added public read-only RLS;
- added root/child validation helpers;
- added a `services` category-pair validation trigger;
- verified valid, root-only, mismatched, unknown and empty category cases locally;
- verified the migration in linked production history;
- verified the production schema after push;
- production build passes.

Next isolated patch:

1. add a `ServiceCategory` entity model;
2. add a public read API for active categories;
3. add a loading hook;
4. add a reusable two-level selector;
5. show the selector in My Area without service mutation;
6. only after selector verification, connect `save_my_service_v2` and create the first draft service form.

## 2026-08-03 – Service category selector checkpoint

Completed and browser-tested:

- added the global service-category entity model;
- added active-category read API;
- added stale-request-safe category loading hook;
- added reusable two-level `ServiceCategorySelector`;
- connected a read-only selector preview to My Area services;
- verified root selection, child selection and current-selection label;
- verified root change clears the old child;
- verified `Transport ja autoabi → Puksiirabi`;
- kept the patch free of service and taxonomy mutations;
- production build passes.

Next isolated patch:

1. add `SaveServiceInput` and a `saveMyService` wrapper around `save_my_service_v2`;
2. extend `useMyServices` with a guarded create mutation;
3. replace the read-only preview with the first service draft form;
4. require a root category in the UI while keeping the database compatible with older incomplete drafts;
5. create only drafts;
6. leave edit, status changes, images, deletion and public-profile services for later patches;
7. browser-test persistence and active-identity isolation before commit.

## 2026-08-04 – Service draft creation checkpoint

Completed and browser-tested:

- added service save input and shared field limits;
- added `saveMyService` RPC wrapper;
- added guarded `useMyServices.saveService`;
- replaced the category preview with the first real service draft form;
- required a root category in the create UI;
- supported optional child category and four price types;
- created a draft under the active identity;
- immediately updated counters and the owner list;
- displayed localized category labels, location and price;
- kept images, editing, lifecycle, deletion and public services outside this patch;
- production build passes.

Next isolated service patch:

1. add editing for an existing service draft;
2. reuse the same validated fields and category selector;
3. lock the form to one service operation at a time;
4. verify active-identity isolation and persistence;
5. leave publish/archive controls for the following lifecycle patch.

## 2026-08-04 – My Area showcase card layout fix

Completed and browser-tested:

- stopped a long showcase description from stretching the management image;
- fixed desktop media height at 140 px;
- top-aligned the media and content columns;
- clamped the management description to four lines;
- retained the full text in the existing edit form;
- production build passes.

## 2026-08-04 – Service draft editing checkpoint

Completed and browser-tested:

- added a draft-only „Muuda” action;
- reused the create form for prefilled editing;
- submitted the existing service ID through `save_my_service_v2`;
- guarded active-identity ownership and draft status before and after the write;
- prevented parallel create/edit writes;
- added cancel and immediate local card refresh;
- preserved image and coordinate fields outside the current form;
- kept lifecycle, images, deletion and public services outside this patch;
- production build passes.

Manual testing covered draft editing and persistence. Published and archived services could not yet be tested because service lifecycle controls do not exist.

Next isolated service patch:

1. add the service lifecycle mutation around `set_my_service_status_v2`;
2. add Draft → Publish and Published → Archive controls;
3. add Archived → Draft restoration;
4. keep deletion, images and public-profile rendering separate;
5. verify public read behavior only after lifecycle controls are complete.

## 2026-08-05 – Service lifecycle checkpoint

Completed and browser-tested:

- added `setMyServiceStatus` around `set_my_service_status_v2`;
- added guarded `changeStatus` to `useMyServices`;
- implemented Draft → Publish;
- implemented Published → Archive;
- implemented Archived → Draft restoration;
- prevented parallel create, edit and status operations;
- updated cards and counters without reload;
- kept the edit action draft-only;
- added lifecycle success, error and busy feedback;
- verified all three transitions and persistence after refresh;
- production build passes;
- no migration was required.

Next isolated service patch:

1. add the public-profile service read model and API;
2. load only `published` services for the profile identity;
3. replace the empty public-profile service placeholder with a responsive section;
4. display category, subcategory, description preview, price and privacy-safe location;
5. coordinate service expansion with the existing product-showcase and listing sections;
6. keep service images, deletion and global service discovery separate.

## 2026-08-05 – Service image foundation checkpoint

Completed and production-applied:

- added `public.service_images`;
- added service, identity and uploader ownership fields;
- added deterministic ordering and a single-primary constraint;
- added cross-identity integrity validation;
- added public-published and owner-identity read policies;
- removed ordinary direct table writes;
- added the `service-images` public bucket;
- configured 10 MB and JPEG/PNG/WEBP limits;
- added active-identity draft-only Storage upload, list and delete policies;
- verified local schema, RLS, bucket and privilege behavior;
- verified linked production migration history, public/storage schema and bucket settings;
- production build passes.

Next isolated patch:

1. add `add_my_service_image_v2`;
2. enforce a server-side maximum of 10 images;
3. add `set_my_service_primary_image_v2`;
4. add `delete_my_service_image_v2`;
5. synchronize `services.image_url`;
6. allow deleting the last image because service images are optional;
7. reindex remaining rows and choose a deterministic fallback primary;
8. keep the browser upload UI for the following patch.

## 2026-08-05 – Service image RPC checkpoint

Completed and production-applied:

- added authenticated service-image registration;
- enforced active-identity ownership and draft-only mutation;
- enforced a server-side ten-image maximum;
- added deterministic primary-image selection and ordering;
- synchronized `services.image_url`;
- added deletion manifest output for Storage cleanup;
- allowed removal of the final optional image;
- verified RPC privileges and SECURITY DEFINER status;
- passed a local authenticated E2E test;
- verified linked production migration history and dumped production function definitions;
- production build passes.

Next isolated patch:

1. add the `ServiceImage` TypeScript model and row mapper;
2. load identity-owned service images in deterministic order;
3. upload JPG/PNG/WEBP files to `service-images`;
4. compensate by deleting the Storage object if registration fails;
5. set the primary image through the RPC;
6. delete the database row first and then remove the returned Storage object;
7. add a draft-only responsive `ServiceImageManager`;
8. update service cards locally without a page reload;
9. keep public-profile service rendering and service discovery separate.

## 2026-08-05 – Service-image data-layer checkpoint

Completed:

- added the service-image TypeScript model and row mapper;
- added deterministic image sorting;
- added image loading;
- added validated Storage upload and RPC registration;
- hardened pre-commit upload compensation;
- added primary-image mutation;
- added an authenticated server delete route;
- kept the service-role key server-only;
- prevented client-provided Storage paths;
- exposed Storage cleanup failure separately;
- production build passes.

Next isolated patch:

1. create a draft-only `ServiceImageManager`;
2. load images when the manager opens;
3. allow selecting multiple JPG/PNG/WEBP files within the remaining ten-image limit;
4. display responsive thumbnails and the current primary image;
5. set a primary image without reloading the page;
6. allow deleting the final optional image;
7. warn when database deletion succeeded but Storage cleanup failed;
8. update the parent service card's `imageUrl` immediately;
9. keep published and archived service cards read-only.

## 2026-08-05 – Service-image management checkpoint

Completed and browser-tested:

- added draft-only `ServiceImageManager`;
- added lazy image loading;
- added multi-file upload within the ten-image limit;
- added responsive thumbnails and primary-image preview;
- added primary-image mutation without a page reload;
- added ordinary, primary and final-image deletion;
- added explicit Storage cleanup warnings;
- synchronized service-card `imageUrl` locally;
- coordinated image-operation busy state with other service writes;
- compacted My Area service cards on narrow screens;
- compacted My Area product-showcase cards on narrow screens;
- preserved tablet and desktop layouts;
- production build passes;
- narrow mobile view was manually verified.

Next isolated patch:

1. expose published services on the public profile;
2. add a dedicated public-service entity API and hook;
3. render only publicly visible services;
4. use the same exclusive expanded-section coordination as product showcases and listings;
5. add responsive service cards and long-description handling;
6. keep service discovery `/v2/services` separate from profile-owned service presentation.

## 2026-08-05 – Mobile service-image picker deploy checkpoint

Prepared for production deployment:

- Android/Xiaomi was confirmed as the affected device;
- broadened the system gallery accept filter;
- delayed File input reset until processing completes;
- added same-file reselection support;
- added standard MIME inference from filename extensions;
- added best-effort HEIC/HEIF-to-JPEG preparation;
- generalized all user-facing wording away from iPhone-specific assumptions;
- production build passes.

After Vercel reports the new commit as Ready, retest on the Xiaomi phone:

1. open a draft service image manager;
2. choose a recent gallery photo;
3. press the gallery confirmation action;
4. verify the button changes to an upload state;
5. verify the image appears;
6. capture the visible error message if it still fails.

## 2026-08-08 – Public profile services checkpoint

Completed:

- public service model, API and hook;
- public service image loading and primary-image fallback;
- read-only public profile service cards;
- category, subcategory, location, description and price display;
- exclusive expanded-section coordination with showcases and listings;
- desktop and narrow-mobile browser tests;
- production build.

No database migration was needed.

Known follow-up:

1. add a dedicated `PublicProfileServiceGallery` modeled on the existing product-showcase gallery;
2. support previous/next navigation, image counter, keyboard controls, lightbox and mobile swipe;
3. preserve the current description component;
4. after gallery testing, align the preview image/card geometry of services and public listings to the product-showcase section;
5. keep `/v2/services` discovery work separate.

## 2026-08-08 – Public service gallery checkpoint

Completed and desktop-tested:

- added `PublicProfileServiceGallery.tsx`;
- connected it to `PublicProfileServicesSection.tsx`;
- added full-screen viewing for public service images;
- added multi-image counters and expanded thumbnails;
- added thumbnail, arrow and keyboard navigation;
- added mobile swipe in expanded cards and lightbox;
- preserved post-swipe click suppression;
- preserved the legacy `services.image_url` fallback;
- preserved product-showcase gallery behavior;
- kept existing compact and expanded media heights;
- production build passes.

This checkpoint does not include database or API
changes.

Immediate production validation after Vercel is
ready:

1. open the public profile on a phone;
2. expand the services section;
3. swipe a multi-image service card;
4. open the service lightbox;
5. swipe and close the lightbox;
6. confirm the product-showcase gallery still works.

After mobile validation, the next visual candidate is
a separate shared-media-geometry patch for product
showcases, services and public listings. Do not mix
that layout change into this gallery checkpoint.

## 2026-08-12 – My Area product showcase detail checkpoint

Completed and browser-tested:

- added `/v2/showcase/[id]`;
- added owner-only product-showcase detail loading;
- reused the existing product-showcase gallery;
- made My Area showcase image clickable;
- made title and category clickable;
- made short description clickable;
- kept every management action outside the links;
- made the detail route active-identity scoped;
- hid mobile bottom navigation on the detail route;
- added shared My Area owner-content return context;
- restored the same card to its previous viewport
  position after returning;
- verified production build;
- verified visible Back to My Area behavior.

No database, migration, RPC, RLS or Storage change is
part of this checkpoint.

Next recommended implementation:

1. create `/v2/service/[id]`;
2. add owner-scoped service detail loading;
3. make service image, title and short description
   clickable in My Area;
4. keep service management controls separate;
5. reuse `MyAreaContentType = "service"` and the
   existing return-state foundation;
6. browser-test before documentation and commit.

After service detail parity, return to the separate
public-profile card-geometry alignment task.

## 2026-08-13 – My Area service detail checkpoint

Completed and browser-tested:

- added `/v2/service/[id]`;
- added owner-only service detail loading;
- reused the existing service gallery;
- made the My Area service image clickable;
- made title, category and location metadata clickable;
- made the short description clickable;
- kept price and every management action outside
  the links;
- made the detail route active-identity scoped;
- hid mobile bottom navigation on the detail route;
- reused the shared My Area return context;
- restored the same service card to its previous
  viewport position;
- reopened the complete service list when returning
  to a card beyond the three-card preview;
- verified production build and browser behavior.

No database, migration, RPC, RLS or Storage change is
part of this checkpoint.

Next recommended implementation:

1. align public-profile showcase, service and listing
   card image geometry and vertical rhythm;
2. keep all three content sections visually aligned
   on desktop;
3. preserve horizontal card browsing on narrow
   screens;
4. later implement the planned mobile profile
   accordion where only the first available content
   section is open.

## 2026-08-13 – Public profile card geometry checkpoint

Completed and locally browser-tested:

- aligned compact showcase, service and listing card
  widths to 250 px;
- aligned compact image heights;
- aligned expanded service and listing image heights
  to the showcase reference;
- aligned expanded grids to two columns;
- aligned the listings section shell with the other
  content sections;
- preserved narrow horizontal browsing;
- preserved service gallery behavior;
- preserved listing navigation, filtering and
  profile-return restoration;
- deliberately left the listing detail thumbnail
  strip unchanged;
- verified production build;
- verified desktop compact and expanded layouts;
- verified a narrow desktop viewport.

After deployment, verify the same public profile on
a real phone. The phone check should cover compact
horizontal browsing, partial next-card visibility,
expanded two-column behavior where applicable and
the absence of page-level horizontal overflow.

Next larger design work remains separate:

1. content-type color tones;
2. mobile public-profile accordion with only the
   first available section open;
3. denser mobile information packaging;
4. broader visual polish.

## 2026-08-13 – Public profile section tones checkpoint

Completed and locally browser-tested:

- added an indigo identity to product showcases;
- added a teal identity to services;
- added an amber identity to active listings;
- added a persistent top accent to each section;
- converted section-type labels to tinted pills;
- aligned section action buttons with each tone;
- retained white inner content cards;
- retained all shared card geometry;
- retained horizontal browsing and expanded grids;
- retained showcase and service galleries;
- retained listing category filters, navigation and
  profile-return restoration;
- retained the existing expanded-section state model.

Product decision:

- do not add a new accordion or separate section
  closing behavior now;
- keep the current section behavior;
- later reuse the same semantic content-type color
  system on marketplace/discovery surfaces.

After deployment, verify the public profile on a real
phone. Check section contrast, horizontal browsing,
buttons, galleries, listing filters and the absence of
page-level horizontal overflow.

The next design step should not automatically be an
accordion. First evaluate other compact mobile
information-packaging improvements or audit the
marketplace color-system reuse.

## 2026-08-14 – V2 product discovery colors checkpoint

Completed and locally browser-tested:

- changed product/listing discovery identity to amber;
- changed the related-services strip to teal;
- changed active product controls from black to amber;
- retained a mostly neutral product-page hero;
- retained white product, service and listing cards;
- retained functional status and error colors;
- retained live listing queries and bounded result
  loading;
- retained listing detail navigation and return-state
  restoration;
- verified production build;
- verified that products and services are visually
  distinct in desktop browser testing.

Current truth:

- `/v2/products` featured products are still local
  design data;
- its related-services strip is still local design
  data;
- its lower product-results section uses live
  marketplace listings;
- `/v2/services` is still a design-oriented page and
  needs a separate teal patch before functional data
  integration.

After deployment, verify `/v2/products` on a real
phone for contrast, filter states, horizontal
overflow, live listing opening and return position.

Next ordered work:

1. apply teal identity consistently to `/v2/services`;
2. checkpoint and phone-test the completed color
   system;
3. audit incomplete V2 functional surfaces;
4. start V2 AI-assisted listing creation as the first
   major functional milestone.

## 2026-08-14 – V2 semantic color system complete

Completed and locally browser-tested:

- public-profile showcases use indigo;
- public-profile services use teal;
- public-profile active listings use amber;
- `/v2/products` uses amber for products/listings;
- the related-services strip on `/v2/products` uses
  teal;
- `/v2/services` uses teal across hero, sections,
  cards and modal boundaries;
- white content cards and functional status colors
  remain separate;
- production builds pass.

Current functional truth:

- `/v2/products` is hybrid: live lower listing
  results plus local featured-product and
  related-service design arrays;
- `/v2/services` is still based on local design
  arrays and local modal state;
- the semantic color system is complete only at the
  presentation level.

After deployment, verify `/v2/services` on a real
phone for section contrast, active nearby state,
horizontal quick-update scrolling, modal behavior and
page-level horizontal overflow.

Next ordered work:

1. complete the phone test for service colors;
2. audit incomplete V2 routes, controls and data
   connections;
3. make V2 AI-assisted listing creation the first
   major functional milestone;
4. then connect real service discovery data in small,
   bounded and scalable steps.

## 2026-08-15 – V2 Leia navigation checkpoint

Completed and locally browser-tested:

- mobile `Turg` was renamed to `Leia`;
- the bag icon was replaced with a search icon;
- the five-slot mobile navigation geometry and
  safe-area handling remain intact;
- `Leia` is active on product and service discovery;
- home product and service actions now navigate;
- home jobs remains a disabled future action;
- products and services share a visible
  `Tooted / Teenused / Töö` selector;
- product active state is amber;
- service active state is teal;
- jobs is non-interactive and marked `Tulekul`;
- existing product results, service demo data,
  service modal and detail-route nav hiding remain
  intact;
- production build passes;
- wide and narrow local browser tests pass.

After deployment, verify on a real phone:

1. home product and service links;
2. bottom-nav Leia icon, label and active dot;
3. product/service switching;
4. jobs disabled state;
5. no page-level horizontal overflow;
6. existing product results and service modal.

Next ordered work:

1. close the production phone check;
2. audit incomplete V2 routes, controls and data
   connections;
3. make AI-assisted V2 listing creation the first
   major functional milestone;
4. connect other real discovery data in small,
   scalable steps.

## 2026-08-15 – V2 listing-create foundation checkpoint

Completed and locally browser-tested:

- added `/v2/sell`;
- added the `listing-create` feature boundary;
- added image-first local selection;
- added camera and gallery inputs;
- added a 10-image limit;
- added JPG, PNG and WEBP validation;
- added a 25 MB source-file limit;
- added local previews;
- added image ordering and removal;
- marked the first image as the future primary image;
- added optional title and description;
- added `empty / ai / user` field provenance;
- added a pure AI merge helper that protects user
  values;
- production build passes;
- narrow local browser testing passes.

Important current boundary:

- `/v2/sell` does not call AI yet;
- it does not upload images;
- it does not create a draft;
- it does not save or publish;
- mobile `Müü` still opens the working `/sell` route;
- legacy real publication was regression-tested and
  remains working.

Next ordered work:

1. prepare the first selected images for AI in the
   browser;
2. extend `/api/ai/analyze-listing` to accept optional
   title and description;
3. ask AI for a suggested description as well as
   title, category and dynamic fields;
4. merge AI output without overwriting user text;
5. render validated category suggestions;
6. checkpoint and test before adding database draft
   persistence.

## 2026-08-17 – Energy, ads and featured visibility decision

Documented product direction:

- marketplace participation remains free and equal;
- Energy unlocks optional capabilities;
- limited welcome Energy may demonstrate AI value;
- legacy Premium-based AI limits must not be carried
  into V2 AI-assisted listing analysis;
- Energy ledger work is required before the AI
  analysis patch is shipped.

Advertising V1:

- one campaign system;
- one compact top-ad slot;
- placement type `top_ad`;
- existing published Selqiro content only;
- existing primary image reused as a small thumbnail;
- no separate banner image;
- no timer rotation;
- a new ad may be selected on page open, return,
  refresh or market-context change;
- session-level shuffled queue / round-robin;
- no immediate repeat when alternatives exist;
- no sticky, overlay, autoplay, flashing or
  dismiss-required behavior.

Featured visibility:

- placement type `featured`;
- dedicated featured sections remain;
- promoted content remains eligible for organic
  results;
- one low-frequency insertion among organic results
  may be added later;
- the same relevance, category, location and status
  filters still apply;
- one object is rendered once per result list;
- badge:
  `Esiletõstetud · tasuline nähtavus`;
- deduplicate the same object against the top ad on
  the same page where possible.

Do not build a second standalone mid-page ad in V1.
Featured cards provide the in-content monetization.

No implementation was added in this checkpoint.

Next ordered work:

1. design and audit the minimal Energy ledger and
   wallet transaction boundary;
2. remove Premium-based AI daily-limit logic;
3. add limited welcome Energy;
4. charge V2 listing AI analysis through Energy;
5. continue V2 listing creation after the Energy
   checkpoint;
6. implement campaigns only after the Energy base is
   stable.

## 2026-08-17 – Energy wallet foundation checkpoint

Completed locally:

- added identity-scoped `energy_wallets`;
- added separate paid, bonus and reserved balances;
- added append-only `energy_ledger_entries`;
- added stable operation idempotency keys;
- blocked duplicate ledger event types;
- blocked more than one final commit/release event;
- blocked ledger updates and deletes;
- added wallet/identity consistency validation;
- added active-identity wallet summary RPC;
- added bounded owner-visible ledger history RPC;
- kept internal metadata out of owner history;
- denied authenticated direct table writes;
- production build passes;
- full local Supabase reset passes;
- SQL contract tests pass.

Current migration:

`supabase/migrations/20260817130000_add_energy_wallet_foundation.sql`

Important boundary:

- no welcome Energy yet;
- no wallet mutation RPC yet;
- no reserve / commit / release behavior yet;
- no AI charging yet;
- legacy Premium AI limits remain untouched;
- `/v2/energy` still shows placeholder data;
- production Supabase has not been migrated by this
  local checkpoint alone.

Next ordered work:

1. add a once-per-user welcome Energy entitlement;
2. grant it to the user's original private identity
   wallet;
3. lock wallet and append the bonus ledger event
   atomically;
4. expose the real wallet balance in `/v2/energy`;
5. add reserve / commit / release operations;
6. replace Premium AI limits with Energy;
7. continue V2 AI listing analysis.

## 2026-08-17 – Admin test Energy checkpoint

Completed locally:

- added
  `20260817150000_add_admin_test_energy_seed.sql`;
- grants each active admin user one 5000 bonus-Energy
  development seed;
- uses the wallet of the identity active on first
  application;
- revalidates private ownership or active business
  membership;
- uses a user-scoped operation key;
- blocks duplicate grants after identity changes;
- leaves paid Energy unchanged;
- appends one `bonus_grant` ledger event;
- seed function is service-role-only;
- authenticated and anon have no execute permission;
- SECURITY DEFINER contract verified;
- full local Supabase reset passes;
- SQL idempotency and authorization tests pass;
- production build passes.

Important boundary:

- migration is committed but not automatically applied
  to production Supabase by Git/Vercel;
- admin will see the real 5000 Energy only after
  production migrations are applied and `/v2/energy`
  is connected to real RPC data;
- `/v2/energy` still shows placeholder data;
- general welcome Energy does not exist yet;
- reserve / commit / release do not exist yet;
- AI charging does not exist yet;
- legacy Premium AI limits remain untouched.

Next ordered work:

1. apply the two Energy migrations to production
   Supabase through a controlled migration step;
2. connect `/v2/energy` to
   `get_my_energy_wallet_v2` and
   `get_my_energy_ledger_v2`;
3. verify the admin's 5000 bonus-Energy in production;
4. add general once-per-user welcome Energy;
5. add reserve / commit / release;
6. replace Premium AI limits with Energy;
7. continue V2 AI listing analysis.

## Handoff checkpoint — V2 päris Energy wallet (2026-08-18)

### Valmis

- Production Energy wallet ja admini ühekordne 5000 boonus-Energy seed on rakendatud ning kontrollitud.
- `/v2/energy` kuvab aktiivse identiteedi päris saadaoleva, boonus-, ostetud ja reserveeritud saldo ning ledger'i ajaloo.
- Minu ala mõlemad Energy kohad kuvavad sama aktiivse identiteedi päris walleti kogusaldot.
- Minu ala identiteedieelvaade ja avaliku profiili link järgivad aktiivset identiteeti.
- Brauseri Back probleem Energy ja avaliku profiili vaadetest Minu alasse naasmisel on lahendatud Next `Link` navigatsiooniga.
- Manuaalne arvutivaate test on kasutaja poolt kinnitatud.

### Teadlikult veel tegemata

- Energy ostmine ja makseintegratsioon.
- Tervitus-Energy tavakasutajale.
- Reserve / commit / release toimingud.
- AI kasutuse Energy-põhine arvestus.
- Admini Energy paranduse UI ja turvaline correction RPC.
- Reklaamide ja esiletõstmise Energy-kulu.

### Soovitatud järgmine tehniline samm

Ehita väikese eraldatud checkpoint'ina serveripoolne idempotentne Energy `reserve / commit / release` leping. Alles pärast selle testimist ühenda V2 kuulutuse AI analüüs Energy kuluga.

## Handoff checkpoint — Energy reservation operations (2026-08-18)

### Valmis lokaalselt

- Lisatud migratsioon `20260818130000_add_energy_reservation_operations.sql`.
- Service-role-only reserve / commit / release RPC-d on loodud.
- Reserve kasutab boonus-Energy't enne ostetud Energy't.
- Operation key on globaalselt idempotentne ning ühel toimingul võib olla ainult üks lõpptulemus.
- Commit ja release järgivad algset reserveeringut ka aktiivse identiteedi vahetamise järel.
- Authenticated roll ei saa mutatsiooni-RPC-sid otse käivitada.
- Kohalik `supabase db reset`, production build ja ulatuslik SQL lepingutest läbisid.

### Veel tegemata

- Migratsiooni production readiness audit.
- Migratsiooni production Supabase'i rakendamine ja read-only järelkontroll.
- Serveri TypeScript wrapper või API-route Energy mutation RPC-de kutsumiseks.
- V2 AI kuulutuse analüüsi ühendamine vooga `reserve → AI → commit/release`.
- Energy hinna ja feature contract'i keskne serverikonfiguratsioon.
- Kasutajale nähtavad poolelioleva reserveeringu ja tehnilise release'i teated.

### Järgmine samm

Tee esmalt read-only production migration audit. Kui audit leiab oodatult ainult Energy reservation operations migratsiooni, rakenda see eraldi kontrollitud db push'iga ja kinnita funktsioonide õigused ning remote migratsiooniajalugu.

## Handoff checkpoint — Energy reservation production rollout (2026-08-19)

### Productionis valmis

- Migratsioon `20260818130000_add_energy_reservation_operations.sql` on linked production Supabase projektis rakendatud.
- Remote ajalugu kinnitab `20260818130000 -> 20260818130000`.
- Järel-dry-run ei leidnud ühtegi ootel migratsiooni.
- Productionis on service-role-only reserve / commit / release Energy RPC-d.
- Git tööpuu jäi rollout'i järel puhtaks.
- Rollout ei muutnud kasutajate Energy saldosid ega käivitanud testreserveeringuid.

### See asendab varasema local-only staatuse

2026-08-18 Energy reservation operations handoff'i osa „Valmis lokaalselt” on nüüd production rollout'iga lõpule viidud.

### Järgmine eraldatud checkpoint

Ehita serveri TypeScript mutation wrapper ilma AI-route'i veel muutmata:

- server-only Supabase admin client;
- Bearer-tokeni valideerimine;
- tüübitud reserve/commit/release sisendid ja väljundid;
- keskne Energy feature/price contract;
- serveri loodud operation key;
- turvaline SQL vea kaardistus;
- wrapperi unit/contract testid või kontrollskript.

Alles pärast wrapperi build'i ja checkpoint'i ühenda `/api/ai/analyze-listing` vooga `reserve → OpenAI → commit/release`.

## Handoff checkpoint — server-only Energy mutation wrapper (2026-08-20)

### Valmis

- Loodud on `src/server/energy/` server-only kiht.
- Bearer-token kontrollitakse Supabase Auth kaudu.
- Service-role klient on kapseldatud eraldi admin client faili.
- Feature ja Energy hind lahendatakse serveris.
- Operation key luuakse serveris.
- Reserve / commit / release RPC vastused valideeritakse rangelt.
- SQL vead kaardistatakse ohututeks serverivigadeks.
- Typecheck, build ja Energy mudeli runtime-testid läbisid.

### Teadlikult veel tegemata

- `SELQIRO_ENERGY_COST_LISTING_AI_ANALYSIS` väärtust ei ole valitud.
- `/api/ai/analyze-listing` kasutab endiselt vana Premium/daily-limit loogikat.
- Wrapperit ei kutsuta veel ühestki route'ist ega client component'ist.
- Kasutaja Energy saldot ei ole selle checkpoint'i testidega muudetud.

### Järgmine eraldatud etapp

1. otsusta esimene testhind kuulutuse AI analüüsile;
2. lisa hind lokaalsesse serverikeskkonda ja hiljem deployment secret'ina;
3. refaktoreeri `/api/ai/analyze-listing` voogu:
   `verify actor → reserve → OpenAI → commit`;
4. vabasta reserveering ainult tehnilise ebaõnnestumise korral;
5. ära vabasta reserveeringut kasutaja sisendist või AI tulemuse sisulisest ebakindlusest tingitud tavapärase tulemuse korral;
6. eemalda vana Premium/daily-limit loogika alles samas kontrollitud route checkpoint'is.

## Handoff checkpoint — V2 listing create text-first layout (2026-08-20)

### Valmis

- `/v2/sell` samm 1 on pealkiri ja kirjeldus.
- Samm 2 on pildid.
- Esimene pilt on märgitud `Põhipilt · AI analüüsib`.
- Kasutajale öeldakse, et AI kasutab ainult esimest pilti ja see peaks olema võimalikult informatiivne.
- AI plokk näitab `AI analüüs · 25 Energy`.
- Desktop-, kitsas desktop- ja mobiililaadne vaade on visuaalselt kontrollitud.
- Typecheck, production build ja `/v2/sell` HTTP smoke test läbisid.

### Teadlikult veel tegemata

- AI nupp ei käivita veel päringut.
- `SELQIRO_ENERGY_COST_LISTING_AI_ANALYSIS=25` ei ole veel route checkpoint'is seadistatud.
- Vana Premium / daily-limit AI route on veel muutmata.
- Ühegi kasutaja Energy saldot ei ole muudetud.

### Järgmine eraldatud etapp

1. lisa lokaalsesse serverikeskkonda testhind 25;
2. saada AI-le ainult esimene / põhipilt;
3. lisa pealkiri ja kirjeldus request'i kontekstiks;
4. lisa stabiilne operation key;
5. ühenda `verify actor → reserve → OpenAI → commit | release`;
6. mõõda tokenid, providerikulu, kestus ja outcome sisemisse metadata'sse;
7. eemalda vana Premium / daily-limit loogika samas kontrollitud route checkpoint'is.

## Handoff checkpoint — V2 listing AI Energy route (2026-08-20)

### Valmis

- Versioneeritud `v2-energy-1` route haru.
- Bearer auth ja server-owned Energy feature/price.
- 25 Energy lokaalne testhind.
- Üks põhipilt, `low` detail, pealkiri ja kirjeldus kontekstina.
- Reserve / commit / release serverivoog.
- UUID v4 operation key ja request hash.
- Commit'itud tulemuse idempotentne taastamine.
- Aktiivse topeltpäringu ning aegunud reserveeringu käsitlus.
- Tokeni-, kestuse- ja providerikulu telemeetria sisemises ledger metadata's.
- Legacy `/sell` voog säilitatud.
- Typecheck, build, mudeli runtime-testid ja unauthenticated HTTP smoke-testid läbitud.

### Teadlikult veel tegemata

- `ListingCreatePage` ei saada veel AI request'i.
- Production/Vercel keskkonda ei ole veel lisatud `SELQIRO_ENERGY_COST_LISTING_AI_ANALYSIS=25`.
- Autenditud päris OpenAI + Energy katset ei ole tehtud.
- Vana Premium/daily-limit haru ei ole veel eemaldatud.
- AI tulemust ei kuvata veel V2 kategooria- ja detailväljade UI-s.

### Järgmine eraldatud etapp

1. lisa V2 browserile põhipildi säästlik ettevalmistus;
2. loo ühe nupuvajutuse kohta UUID v4 ja säilita see sama request'i retry jaoks;
3. saada header, Bearer-token, pealkiri, kirjeldus ja ainult esimene pilt;
4. kuva reserveerimise/analüüsi/edu/vea olek;
5. ühenda AI soovitus provenance-reegliga ainult tühja või AI-owned välja;
6. kuva kasutajale soovitatud kategooriatee kinnitamiseks ja muutmiseks;
7. tee kontrollitud autenditud lokaalne katse ning kinnita wallet 5000 → 4975, commit-event ja kulumetadata;
8. alles seejärel lisa production env ning tee Verceli test.

<!-- SELQIRO_LAUNCH_CATEGORIES_AND_EE_HORSE_POLICY_20260822 -->
## Järgmine eraldatud töö: Eesti hobusepakkumiste foundation

Praegune checkpoint sisaldab laiendatud launch-kategooriapuud ja ratsutamise/hobutarvete rubriike. Elushobuse kuulutusi see veel ei ava.

Järgmine samm peab algama read-only auditiga, mis kaardistab olemasoleva `listings` tabeli, staatused, asukoha väljad, RLS/RPC mustrid, pildid, detailvaate ja modereerimise. Pärast auditit otsustada, kas kasutada eraldi `horse_offers` tabelit või rangelt eristatud sisutüüpi koos oma serverilepinguga. Eelistus on eraldi domeen, et riigipoliitika, deklaratsioonid, modereerimine ja tulevased riigid ei saastaks tavakuulutuse lepingut.

Eesti V1 piir:
- tururiik EE;
- hobune asub Eestis;
- kasutaja IP/hetke asukohta ei kasutata;
- müük, tasuta üleandmine, rent, kaasratsaniku otsing ja hobuse otsing;
- puudub Selqiro makse, deposiit, oksjon ja piiriülene transpordivoog;
- müüja vastutab andmete ja dokumentide eest;
- Selqiro üldine eluslooma tapmise eesmärgiga sisu keeld kehtib kõikjal.

<!-- SELQIRO_PUBLICATION_POLICY_ACCEPTANCE_FOUNDATION_V1 -->
## Checkpoint: publication policy acceptance foundation

Expected commit subject: `Add publication policy acceptance foundation`

Completed locally before checkpoint:
- migration `20260822130000_add_publication_policy_acceptance_foundation.sql`;
- `marketplace-general-v1` and `ee-horse-v1`;
- versioned immutable policy documents;
- append-only, user-owned, idempotent acceptance history;
- reusable policy-status, acceptance and server-side require RPCs;
- local Supabase reset and transactional SQL contract tests;
- TypeScript typecheck, production build, `/sell` and `/v2/sell` smoke tests.

Important boundary:
- no `horse_offers` or `horse_offer_images` table yet;
- no horse-offer UI yet;
- no universal admin prepublication review;
- AI moderation remains off;
- production database has not been migrated.

Next isolated step:
1. create the corrected Estonia-only `horse_offers` and `horse_offer_images` foundation;
2. add per-offer factual confirmation snapshots and submission content hash;
3. publish low-risk offers immediately after deterministic checks and required-policy acceptance;
4. keep a risk-based hold/moderation path and post-publication notice-and-action flow;
5. test locally before documentation, checkpoint and any production rollout.

<!-- SELQIRO_EE_HORSE_OFFER_DATABASE_FOUNDATION_20260830 -->
## 2026-08-30 — Eesti hobusepakkumiste andmebaasivundament

Completed locally from checkpoint `b901aa6`:

- migration `20260830170000_add_ee_horse_offer_foundation.sql`;
- transactional test `20260830170000_ee_horse_offer_foundation_test.sql`;
- `horse_offers`, `horse_offer_images`, and `horse_offer_publication_events`;
- Estonia-only market/location constraints;
- separate versioned-policy acceptance evidence and per-offer factual-confirmation snapshots;
- explicit `publisher_confirms_age_18_or_over` confirmation key;
- SHA-256 content snapshot verification;
- immediate low-risk `published` and risk-based `held_for_review` data states;
- identity/image integrity, one-primary-image protection, search indexes, RLS and locked direct privileges.

Validation passed:

- `npm run build`;
- complete local Supabase reset;
- SQL structure, behavior, security, append-only and rollback checks.

Important boundaries:

- the user experience remains the shared `/v2/sell` listing form;
- a live-horse category will later reveal horse-specific fields and confirmations;
- no owner/public horse-offer RPCs yet;
- no horse image Storage bucket or upload flow yet;
- no horse-offer UI yet;
- production Supabase is unchanged;
- do not edit the migration after a future production application; corrections must use a new migration.

Next exact step:

1. review and commit/push the migration, test, and documentation;
2. run a separate linked production dry-run and controlled rollout;
3. verify remote migration history and schema objects;
4. only then add owner draft/read RPCs as the next isolated code patch.

<!-- SELQIRO_EE_HORSE_PRODUCTION_ROLLOUT_20260830 -->
## 2026-08-30 — EE horse-offer production foundation checkpoint

Completed:

- Git checkpoint `2693620 Add EE horse offer foundation` pushed to `origin/main`;
- application production build passed;
- local Supabase reset passed;
- transactional horse-offer SQL contract test passed;
- production public-schema backup created before rollout;
- publication-policy acceptance foundation applied to linked production;
- EE horse-offer foundation applied to linked production;
- local and remote migration histories aligned;
- linked dry-run reports the remote database is up to date;
- production schema dump confirmed all five expected foundation tables.

Production-confirmed tables:

- `publication_policy_documents`
- `user_publication_policy_acceptances`
- `horse_offers`
- `horse_offer_images`
- `horse_offer_publication_events`

Important boundary:

- no horse-offer UI is connected yet;
- do not edit the two production-applied migration files;
- no separate horse-listing creation route should be introduced;
- the user-facing flow remains the existing shared `/v2/sell` form;
- live-horse selection reveals horse fields and offer-type-specific confirmations before publication;
- the separate backend domain exists for policy, audit, security and future country expansion.

Next exact step:

1. inspect the current `app/v2/sell`, V2 sell wrapper, `src/features/listing-create`, category model and existing listing-create APIs;
2. document the smallest horse-mode integration boundary;
3. implement only typed horse-mode detection first;
4. keep saving, publication-policy acceptance, confirmations, images and final publication in later isolated patches.

<!-- SELQIRO_V2_LIVE_ANIMAL_CAPABILITY_20260830 -->
## 2026-08-30 — V2 shared live-animal capability checkpoint

Current Git base before this checkpoint:

- `224e584 Document EE horse production rollout`

Implemented and validated:

- one shared `/v2/sell` creation journey;
- typed `listing | horse_offer` content boundary;
- small live-animal capability registry by species and market country;
- only `horse + EE` enabled;
- ordinary listing remains the default;
- horse mode stays on the same route;
- selected-state explanation appears only in horse mode;
- switching back hides the horse-mode explanation;
- title and description remain intact across content-type switching;
- desktop and narrow-mobile layout checks passed;
- production build passed;
- no persistence, publication, policy acceptance or production-database change.

Important boundaries:

- do not expose dogs, cats or another market country yet;
- do not generalize the production `horse_offers` domain;
- do not copy the shared listing-create form for future animal species;
- capability visibility is client UX only; database policy and authorization
  remain authoritative.

Next exact step:

1. add typed horse offer types:
   `sale | free_transfer | lease | co_rider | wanted`;
2. render the selector only while the enabled `horse + EE` capability is active;
3. keep title and description state intact;
4. do not add horse fields, confirmations, persistence, images or publication
   in the same patch.

<!-- SELQIRO_V2_HORSE_OFFER_TYPE_SELECTOR_20260831 -->
## 2026-08-31 — V2 horse-offer type selector checkpoint

Base before this checkpoint:

- `6899ddb Add V2 live-animal offer capability`

Implemented and validated:

- typed `HorseOfferType` model;
- canonical values `sale | free_transfer | lease | co_rider | wanted`;
- separate `HorseOfferTypeSelector` component;
- selector visible only in enabled `horse + EE` mode;
- no silent default subtype;
- `wanted` marked as not requiring a specific horse;
- selected subtype restored after a temporary switch to ordinary listing;
- shared title and description preserved;
- static contract check passed;
- production build passed;
- all five choices, desktop layout and narrow-mobile layout were browser-tested;
- no new browser-console errors were observed.

Not included:

- horse fields;
- confirmations;
- policy acceptance;
- draft persistence;
- images;
- publication;
- database or production changes.

Next exact step:

1. define the first typed horse-field state;
2. add a small horse-fields component inside the shared `/v2/sell` form;
3. show concrete-horse identity fields only for
   `sale | free_transfer | lease | co_rider`;
4. give `wanted` a smaller search-criteria branch;
5. keep persistence, confirmations, images and publication outside that patch.

<!-- SELQIRO_V2_HORSE_BASIC_AI_TEXT_FLOW_20260831 -->
## 2026-08-31 — V2 horse basic fields, AI flow and neutral wording

Current Git base before this checkpoint:

- `8f9ea86 Add V2 horse offer type selector`

Implemented:

- first typed horse basic-field state;
- separate `HorseOfferBasicFields` component;
- concrete horse branch with six basic fields;
- smaller `wanted` branch with preferred sex and breed only;
- horse fields moved after shared text, image and optional AI stages;
- separate `ListingCreateAiAnalysisCard`;
- ordinary-listing and controlled-live-animal AI guidance modes;
- no duplicate global category selector for horse offers;
- isolated `listingCreateTextGuidance` model;
- neutral ordinary-listing examples;
- offer-type-specific horse examples;
- removal of BMW/E39/auto-part default wording;
- mode and offer-type switching preserve user-entered title and description.

Validated:

- static contract checks passed;
- production build passed;
- ordinary and horse guidance displayed correctly;
- horse sale fields displayed correctly;
- ordinary listing remained neutral;
- manual browser regression tests passed;
- no database or production mutation occurred.

Current uncommitted files before documentation:

- `src/features/listing-create/README.md`
- `src/features/listing-create/components/ListingCreateContentTypeSelector.tsx`
- `src/features/listing-create/components/ListingCreatePage.tsx`
- `src/features/listing-create/components/HorseOfferBasicFields.tsx`
- `src/features/listing-create/components/ListingCreateAiAnalysisCard.tsx`
- `src/features/listing-create/model/horseOfferFields.ts`
- `src/features/listing-create/model/listingCreateTextGuidance.ts`

Next exact step after commit:

1. add typed discipline, training-level and suitability fields;
2. provide a smaller preference-oriented branch for `wanted`;
3. keep health, behavior, price, location, confirmations, persistence, images
   and publication in later isolated patches.

<!-- SELQIRO_V2_HORSE_USE_FIELDS_20260901 -->
## 2026-09-01 — V2 horse use fields checkpoint

Current stable Git base before this checkpoint:

- `7281947 Add V2 horse basic fields and AI flow`

Implemented but not yet committed:

- `HorseOfferUseFieldState`;
- separate concrete-horse and `wanted` preference state branches;
- `HorseOfferUseFields`;
- discipline/use field;
- training-level field;
- suitability field;
- wanted-specific preference wording;
- `ListingCreatePage` composition after horse basic fields;
- layout correction for inline-label overflow and grid stretching;
- listing-create README update.

Current changed files:

- `src/features/listing-create/README.md`
- `src/features/listing-create/components/ListingCreatePage.tsx`
- `src/features/listing-create/components/HorseOfferUseFields.tsx`
- `src/features/listing-create/model/horseOfferUseFields.ts`

Validation completed:

- static contract check passed;
- layout contract check passed;
- production build passed after both implementation and layout correction;
- desktop concrete-horse branch tested;
- desktop wanted branch tested;
- narrow-mobile full flow tested;
- cards stack into one column without horizontal overflow;
- concrete and wanted local values remain separate;
- ordinary listing hides horse-only fields;
- title, description and image state remain outside the new module;
- no production/database mutation occurred.

Next exact step after documentation commit:

1. add typed health and behavior disclosure fields;
2. use seller-provided disclosure wording;
3. do not imply Selqiro verified health, behavior, ownership or documents;
4. keep price, location, confirmations, persistence and publication in later
   isolated patches.

<!-- SELQIRO_V2_HORSE_DISCLOSURE_FIELDS_20260901 -->
## 2026-09-01 — V2 horse health and behavior fields checkpoint

Stable Git base before this checkpoint:

- `eb9119f Add V2 horse use fields`

Implemented but not yet committed:

- `HorseOfferDisclosureFieldState`;
- separate concrete-horse and `wanted` preference state branches;
- `HorseOfferDisclosureFields`;
- seller-provided health notes;
- seller-provided behavior observations;
- wanted-specific health preferences;
- wanted-specific behavior preferences;
- explicit non-verification and veterinary-assessment wording;
- composition after `HorseOfferUseFields`;
- removal of the stale “health and behavior fields will be added later” note;
- listing-create README update.

Current changed files:

- `src/features/listing-create/README.md`
- `src/features/listing-create/components/HorseOfferDisclosureFields.tsx`
- `src/features/listing-create/components/HorseOfferUseFields.tsx`
- `src/features/listing-create/components/ListingCreatePage.tsx`
- `src/features/listing-create/model/horseOfferDisclosureFields.ts`

Validation completed:

- static contract check passed;
- production build passed before and after the stale-note correction;
- desktop concrete-horse branch tested;
- desktop wanted branch tested;
- narrow-mobile concrete-horse branch tested with entered text;
- local character counters and one-column stacking verified;
- concrete disclosures and wanted preferences remain separate;
- ordinary listing hides horse-only fields;
- no production/database mutation occurred.

Next exact work after documentation commit:

1. define offer-type-aware price and budget semantics;
2. keep `free_transfer` fixed to free;
3. do not copy seller-price semantics into `wanted`;
4. keep location, confirmations, persistence and publication in later isolated
   patches.

<!-- SELQIRO_V2_HORSE_PRICE_FIELDS_20260902 -->
## 2026-09-02 — V2 horse price and budget fields checkpoint

Stable Git base before this checkpoint:

- `7730d25 Add V2 horse disclosure fields`

Implemented but not yet committed:

- `HorseOfferPriceFieldState` and typed change reducer;
- separate sale, lease, co-rider and wanted commercial branches;
- sale fixed/from/contact modes;
- free transfer with no editable amount and a fixed free state;
- lease fee with period;
- co-rider fee with period;
- wanted maximum or flexible buyer budget;
- explicit wording that wanted budget is not a seller price;
- EE-pilot EUR UI contract;
- composition after health and behavior fields;
- listing-create README contract update.

Current changed code files:

- `src/features/listing-create/README.md`
- `src/features/listing-create/components/HorseOfferPriceFields.tsx`
- `src/features/listing-create/components/ListingCreatePage.tsx`
- `src/features/listing-create/model/horseOfferPriceFields.ts`

Validation completed:

- static model/component/form-order contract passed;
- production build passed;
- desktop sale, free-transfer, lease, co-rider and wanted branches tested;
- fixed/from/contact and maximum/flexible visibility tested;
- separate branch value preservation tested;
- narrow-mobile layout tested without observed horizontal overflow;
- no browser errors were observed;
- ordinary-listing and previous horse-field flow remained usable;
- no production/database mutation occurred.

Important persistence blocker:

- current horse database fields can represent sale and free-transfer price
  semantics;
- recurring lease/co-rider period and wanted buyer-budget meaning require an
  explicit reviewed database/RPC contract before this UI is connected;
- never overload wanted budget as seller price or encode period only in text.

Next exact work after this checkpoint is committed:

1. add typed local EE horse location state;
2. keep market country and horse actual-location country locked to EE;
3. collect privacy-safe city/region or approximate area information;
4. avoid requiring or publicly exposing an exact private address;
5. keep confirmations, persistence and publication in later isolated patches.

<!-- SELQIRO_V2_HORSE_LOCATION_FIELDS_20260902 -->
## 2026-09-02 V2 horse location UI checkpoint

Completed and browser-tested:

- a dedicated horse location module was added to the shared `/v2/sell` flow;
- concrete-horse offers show `Hobuse tegelik asukoht`;
- `wanted` shows `Kust hobust otsid?`;
- concrete and wanted location values stay in separate typed local branches;
- country is fixed to `Eesti / EE`;
- visible fields are city or municipality plus county or region;
- exact address and coordinates are not requested;
- the shared autocomplete now supports `all | locality` scopes;
- the horse form uses `locality` scope and excludes business, street,
  house-number and square results;
- old dropdown values are cleared immediately when the query changes;
- older requests are aborted and late stale responses are ignored;
- clearing the input cannot reopen an older result set;
- completed locality names return the correct suggestion after a short debounce
  and provider delay;
- incomplete prefixes may have no suggestion, which is accepted because manual
  entry remains available and wrong stale results are no longer displayed;
- desktop and narrow-mobile tests passed;
- production build passed;
- production and the database were not changed;
- no persistence, policy acceptance, factual confirmation or publication was
  added.

Checkpoint files:

- `app/components/LocationAutocomplete.tsx`
- `src/features/listing-create/model/horseOfferLocationFields.ts`
- `src/features/listing-create/components/HorseOfferLocationFields.tsx`
- `src/features/listing-create/components/ListingCreatePage.tsx`
- `src/features/listing-create/README.md`

Next exact step:

1. commit and push this location UI checkpoint;
2. begin with a read-only audit of:
   - publication-policy status and acceptance APIs;
   - the existing `ee-horse-v1` policy document contract;
   - offer-type-aware horse factual confirmations;
   - the boundary between reusable policy acceptance and per-offer facts;
3. only after the audit, add a small typed confirmation UI module;
4. keep draft persistence and publication outside that first confirmation UI
   patch.

<!-- SELQIRO_V2_HORSE_PUBLICATION_GATE_UI -->
## 2026-09-03 — V2 horse publication-gate UI checkpoint

Base checkpoint before this patch: `a24320f Add V2 horse location fields`.

Completed in the shared `/v2/sell` flow:

- added `src/features/listing-create/model/horseOfferPublicationGate.ts`;
- added `src/features/listing-create/components/HorseOfferPublicationGate.tsx`;
- composed the gate after `HorseOfferLocationFields`;
- added two policy requirement cards keyed by `marketplace-general` and
  `horse-offer-ee`;
- added four common factual confirmations for every horse offer;
- added three additional concrete-horse confirmations;
- kept `wanted` on the four-common-confirmation branch;
- added typed `0/7 … 7/7` and `0/4 … 4/4` local progress;
- reset confirmations whenever the horse offer type changes;
- preserved the same horse offer state while ordinary-listing mode temporarily
  hides the horse UI;
- documented the immutable publication-event contract in the listing-create
  README.

Browser-tested:

- concrete-horse unchecked and `7/7` completed states on desktop;
- `wanted` unchecked and `4/4` completed states on desktop and mobile;
- policy cards, wanted omission explanation and publication-not-connected
  wording;
- checkbox interaction and responsive stacking;
- offer-type reset and ordinary/horse mode state preservation;
- no page-level horizontal overflow or new console error observed.

Validation:

- static source and form-order contract passed;
- production build passed;
- no policy-status read, policy-acceptance write, horse save, publication
  mutation, migration or production change was added.

Next exact isolated step:

1. inspect the existing V2 entity/API patterns for small authenticated
   read-only hooks;
2. add a publication-policy status model and API wrapper around
   `get_my_required_publication_policy_status_v1`;
3. load the two required horse policies for `horse_offer`, country `EE`, locale
   `et-EE`;
4. render loading, accepted, not-accepted and retryable error states in the
   existing policy cards;
5. guard stale responses when active identity, authentication or horse mode
   changes;
6. do not add `accept_publication_policy_v1`, horse draft persistence, image
   upload or publication mutation in that checkpoint.

<!-- SELQIRO_V2_HORSE_AGGREGATE_CONFIRMATION_UI -->
## 2026-09-04 — V2 horse aggregate confirmation checkpoint

Base commit: `45502a1 Add V2 horse publication gate UI`.

Uncommitted checkpoint completed on top of that commit:

- replaced seven or four separate factual-confirmation checkboxes with exactly
  one aggregate checkbox;
- kept all seven concrete-horse statements separately visible;
- kept all four `wanted` statements separately visible;
- preserved seven stable internal confirmation keys and offer-type-aware key
  selection;
- checking or clearing the aggregate checkbox updates the complete required key
  set for the active offer type;
- preserved offer-type reset behavior;
- preserved ordinary-listing temporary-hide behavior;
- polished user-facing copy to remove technical-key and aggregate-state wording;
- kept both required policy cards separate from factual confirmations;
- kept policy status, acceptance, saving, publication and database mutations
  absent.

Browser validation confirmed by the user:

- narrow-mobile concrete-horse statement list remains readable;
- one aggregate checkbox fits without horizontal overflow;
- the checked state and completion message are clear;
- responsive stacking remains intact;
- the existing reset and branch behavior passed manual testing.

Validation:

- implementation result reports source, copy, static, build and scope checks as
  PASS;
- production build passes again during documentation;
- only the four expected listing-create files are modified before docs;
- final staged scope must contain those four files plus the four project docs.

Next exact isolated step after commit:

1. inspect current authenticated read-only entity/API patterns;
2. add a publication-policy status type and mapper;
3. wrap `get_my_required_publication_policy_status_v1` outside the UI component;
4. request status for `horse_offer`, `EE`, `et-EE`;
5. render loading, accepted, not-accepted and retryable error states in the two
   existing policy cards;
6. guard stale responses during auth, active-identity or horse-mode changes;
7. do not add `accept_publication_policy_v1`, horse draft persistence, image
   upload or publication mutation in that patch.

<!-- SELQIRO_V2_HORSE_POLICY_STATUS_READ_ONLY_2026_09_05 -->
## 2026-09-05 – V2 horse publication-policy read-only checkpoint

Last committed base before this patch:

- `17a6533 Simplify V2 horse publication confirmation`.

Implemented and browser-tested:

- required policy status is loaded in `/v2/sell` through `get_my_required_publication_policy_status_v1`;
- scope is `horse_offer / EE / et-EE`;
- the UI shows both active required policy documents, their exact versions and „Nõustutud” or „Nõustumata” state;
- loading, empty, error, stale-response and retry behavior are handled;
- the per-offer aggregate checkbox remains independent from versioned policy acceptance;
- concrete-horse offers retain seven internal factual confirmation keys;
- `wanted` retains the four common keys and omits ownership, identification and passport statements;
- desktop and mobile browser tests passed;
- no policy acceptance, horse save, publication or database mutation was added.

Expected uncommitted source scope for this checkpoint:

- `src/entities/publication-policy/**`;
- `src/features/listing-create/model/useHorseOfferPublicationPolicyStatus.ts`;
- `src/features/listing-create/components/HorseOfferPublicationGate.tsx`;
- `src/features/listing-create/README.md`;
- the four living project documents.

Next exact work:

1. begin with a read-only inspection of `accept_publication_policy_v1` and its current error/idempotency contract;
2. add a way to open/read the full active rule text;
3. add one explicit user action that accepts every currently missing required document using each document's exact ID, version and hash;
4. reload policy status after each successful acceptance and handle partial failure safely;
5. do not connect horse-offer saving, image upload, publication, Energy or a database migration in the same patch.

<!-- SELQIRO_V2_HORSE_POLICY_ACCEPTANCE_CONNECTED_V1 -->
## 2026-09-06 – V2 hobuse reeglistike nõustumise ühenduse checkpoint

Valmis ja kasutaja poolt desktopis ning mobiilis brauseriga kontrollitud:

- `/v2/sell` hobusevoog loeb kaks aktiivset nõutud reeglistikku serverist;
- mõlema reeglistiku täistekst on avatav nii enne kui ka pärast nõustumist;
- puuduva nõustumise korral on üks reeglistike koondlinnuke ja üks
  `Salvesta nõustumine` nupp;
- pakkumise faktiliste väidete koondlinnuke jääb reeglinõustumisest eraldi;
- iga puuduva aktiivse dokumendi kohta tehakse üks
  `accept_publication_policy_v1` RPC-kutse;
- kutsesse lähevad täpselt status-päringust saadud dokumendi ID, versioon ja sisu
  räsi;
- olekut värskendatakse pärast iga edu ja iga vea järel;
- muutunud dokumendi snapshot'i ei nõustuta vana kinnituse alusel;
- nõustumine salvestub autentitud kasutajakontole append-only ajaloona ning püsis
  pärast lehe värskendamist;
- konkreetse hobuse harul on seitse nähtavat faktilist väidet ja `wanted` harul
  neli, mõlemal üks eraldi koondlinnuke;
- testitud tavavoos ei leitud uut brauseriviga ega mobiili horisontaalset
  leheületust.

Checkpoint'i lähtekood:

- `src/entities/publication-policy/model/types.ts`;
- `src/entities/publication-policy/api/acceptPublicationPolicy.ts`;
- `src/features/listing-create/model/useHorseOfferPublicationPolicyStatus.ts`;
- `src/features/listing-create/components/HorseOfferPublicationGate.tsx`;
- `src/features/listing-create/README.md`.

Piir säilib:

- hobusepakkumist ei salvestata;
- pilte ei laadita üles;
- Energy't ei kasutata;
- muutumatut avaldamissündmust ei looda ja pakkumist ei avaldata;
- production-andmebaasi skeemi ei muudeta.

Järgmine täpne samm pärast selle checkpoint'i commit/push'i:

1. tee read-only audit olemasolevale `save_my_horse_offer_draft_v1` RPC-le;
2. kaardista praeguse ühise vormi iga haru ja väli serveri täpse sisendlepingu
   vastu;
3. kontrolli eraldi konkreetse hobuse ning `wanted` tähendusi, müügihinda vs
   ostueelarvet, rendi/kaasratsaniku perioodi ning tegelikku asukohta vs
   otsingupiirkonda;
4. otsusta auditi põhjal esimese väikese draft-save patch'i ulatus;
5. ära ühenda samasse patch'i pildi üleslaadimist ega avaldamismutatsiooni.

<!-- SELQIRO_EE_HORSE_OWNER_DRAFT_SAVE_RPC_V1 -->
## 2026-09-06 — EE horse-offer owner draft-save RPC local checkpoint

Completed locally and staged:

- migration `20260906150000_add_ee_horse_offer_owner_draft_save.sql`;
- rollback contract test `20260906150000_ee_horse_offer_owner_draft_save_test.sql`;
- authenticated `save_my_horse_offer_draft_v1`;
- active identity resolved and authorized in the database;
- Estonia/EUR and active horse-policy capability guards;
- separate concrete-horse and wanted payload contracts;
- validated sale, free-transfer, recurring fee and wanted-budget semantics;
- versioned server-built details payload;
- creation of a new draft and guarded update of the same identity's draft/rejected offer;
- rejected-to-draft reset with stale publication lifecycle fields cleared;
- no policy-acceptance requirement for private draft saving;
- no factual publication confirmations stored in drafts;
- no image, publication-event, publication or Energy mutation.

Validation passed:

- static migration contract;
- application production build;
- complete local Supabase reset;
- authenticated SQL behavior and authorization tests inside rollback transactions;
- exact two-file implementation scope before documentation.

Production status:

- unchanged;
- migration is not yet applied remotely;
- do not connect the browser draft-save flow until the linked production rollout is verified.

Next exact steps:

1. commit and push this six-file checkpoint;
2. run a separately controlled production preflight;
3. create a timestamped linked `public` schema backup;
4. confirm the linked dry-run contains only migration `20260906150000`;
5. apply and verify the migration;
6. document and commit the production rollout;
7. start with a read-only audit of the current listing-create state-to-RPC mapping before adding the client save action.


<!-- SELQIRO_EE_HORSE_OWNER_DRAFT_SAVE_PRODUCTION_ROLLOUT_V1 -->
## 2026-09-07 — EE horse owner draft-save production checkpoint

Completed:

- migration `20260906150000_add_ee_horse_offer_owner_draft_save.sql` was applied to linked production project `vyjletlmwoiwxsnsunlm`;
- `save_my_horse_offer_draft_v1` is present in the production schema;
- pre-push state was local-only;
- post-push migration history is local+remote;
- post-push dry-run has no pending migrations;
- production schema contract verification passed;
- Git worktree remained clean;
- no policy-acceptance, horse-draft-data test mutation, image, publication, Energy or client mutation was performed by the rollout verification.

Important:

- do not rerun the rollout as if the migration were pending;
- do not edit the applied migration;
- any database correction must be a new migration;
- V2 `/v2/sell` still does not save horse drafts;
- policy acceptance and per-offer confirmations remain separate from draft saving;
- images and publication remain separate later operations.

Evidence:

- rollout result: `/Users/taivo/Downloads/selqiro-recovery/v2-horse-owner-draft-save-production-rollout-20260907-110828/result.txt`;
- post-push production schema: `/Users/taivo/Downloads/selqiro-recovery/v2-horse-owner-draft-save-production-rollout-20260907-110828/production-public-after-horse-owner-draft-save.sql`.

Next exact step:

1. commit and push this documentation checkpoint;
2. begin a read-only audit of the shared `/v2/sell` state and entity/API boundaries;
3. define the typed client payload mapping for all five horse offer types;
4. connect only owner draft saving;
5. keep images, confirmations persistence, publication and Energy outside that first client patch.

<!-- SELQIRO_V2_HORSE_DRAFT_SAVE_CLIENT_CONTRACT_V1 -->
## 2026-09-07 — V2 hobuse mustandi typed kliendilepingu checkpoint

Stabiilne lähtepunkt enne checkpoint'i:

- `2891ef6 Document EE horse draft save production rollout`;
- `main` ja `origin/main` olid sünkroonis;
- productionis oli `save_my_horse_offer_draft_v1` juba rakendatud ja kontrollitud.

Selle checkpoint'iga lisati ja commit'iti:

- `src/entities/horse-offer/model/types.ts`;
- `src/entities/horse-offer/api/saveMyHorseOfferDraft.ts`;
- `src/features/listing-create/model/horseOfferDraftSave.ts`;
- typed kliendilepingu piirikirjeldus listing-create README-s;
- käesolevad neli checkpoint-dokumendi uuendust.

Valmis leping:

- vormisnapshot mapitakse serveri täpsesse parameetrikomplekti;
- konkreetse hobuse ja `wanted` harud ei leki teineteise payload'i;
- müüja hind, tasuta üleandmine, korduv tasu ja otsija eelarve säilitavad eri
  tähendused;
- rendi ja kaasratsaniku periood saadetakse eraldi struktureeritud väljana;
- tegelik asukoht ja otsingupiirkond jäävad eri harudesse;
- praegune UI saadab ainult Eesti linna/valla ning maakonna/piirkonna;
- täpne asukohatekst ja koordinaadid jäävad nulliks;
- brauser ei saada üldist `details` JSON-i;
- vastus peab olema täpselt üks `draft` rida ning tagastab järgmisteks salvestusteks
  kasutatava `offerId` väärtuse.

Piir säilib:

- `ListingCreatePage.tsx` ei muutunud;
- `Salvesta mustand` nuppu ega hook'i veel ei ole;
- hobusepilte ei laadita üles ega registreerita;
- reeglinõustumist ega faktilisi avaldamiskinnitusi mustandisse ei salvestata;
- review'd, avaldamist ega Energy't ei käivitata;
- andmebaasi ega productionit ei muudeta;
- production build läbis;
- nähtava UI puudumise tõttu ei olnud brauseritest selles checkpoint'is vajalik.

Järgmine täpne samm:

1. tee read-only ülevaade `ListingCreatePage` praegusest state'ist ja tegevusala
   paigutusest;
2. lisa väike feature-level horse draft-save mutation state;
3. lisa ainult hobuse aktiivses harus üks kasutaja vajutatav `Salvesta mustand`;
4. loo esimese vajutusega draft ja säilita tagastatud `offerId` lokaalses state'is;
5. järgmine vajutus peab uuendama sama drafti, mitte looma uut rida;
6. lisa ühe paralleelse kutse piirang ning saving/saved/error tagasiside;
7. testi eraldi concrete ja `wanted` haru, hinna/eelarve vead, korduva salvestuse
   sama ID ning aktiivse identiteedi serveripoolne piir;
8. ära ühenda samasse patch'i pilte, reeglinõustumist, kinnituste salvestust,
   review'd, avaldamist ega Energy't.

<!-- SELQIRO_V2_HORSE_OPTIONAL_DRAFT_SAVE_ACTION_V1 -->
## 2026-09-11 — valikulise hobuse mustandisalvestuse checkpoint

Lähtepunkt:

- commit `c6c9485 Add V2 horse draft save client contract`;
- `main` ja `origin/main` olid sünkroonis;
- productionis oli `save_my_horse_offer_draft_v1` juba rakendatud;
- typed payload mapper ja entity API olid olemas, kuid vorm ei kutsunud neid.

Selle checkpoint'iga on valmis:

- `HorseOfferDraftSaveAction`;
- `useHorseOfferDraftSave`;
- üks vormitaseme ühendus `ListingCreatePage` komponendis;
- asukoha järel ja reeglite/avaldamisvärava ees paiknev tegevus;
- esimese salvestuse create ja sama vormiseansi järgmiste salvestuste update;
- tagastatud `offerId` säilitamine ainult avatud vormiseansis;
- üks-paralleelpäring kaitse;
- `idle`, `saving`, `saved`, `error` olekud;
- vormirevisjoni põhine aegunud eduoleku kaitse;
- parandatud React hook-order: custom hook kutsutakse enne loading/login
  early-return'e;
- kompaktne publish-first UX: `Jätkad hiljem?`, `Valikuline`,
  `Salvesta hilisemaks` / `Salvesta muudatused`.

Kasutaja kinnitas desktopi ja mobiili brauseritestides:

- esimene salvestus õnnestus;
- salvestatud olek kuvati;
- vormi muutmine näitas salvestamata muudatust;
- teine salvestus töötas;
- mobiilirida jäi kompaktseks;
- React hook-order viga ei kordunud.

Oluline piir:

- mustand on valikuline kõrvaltegevus, mitte kohustuslik etapp;
- tulevane põhitegevus on `Avalda kuulutus`;
- pilte ei laadita üles;
- reeglinõustumist ega pakkumispõhiseid kinnitusi mustandisse ei salvestata;
- avaldamist ega Energy't ei käivitata;
- andmebaasi ja productionit selle source-checkpoint'iga ei muudeta.

Arhitektuuriline siht:

- hobuse lisamis- ja avaldamisleping jääb kontrollitud `horse_offers` domeeni;
- pärast avaldamist peab objekt kasutaja jaoks käituma nagu muu kuulutus;
- see peab jõudma ühisesse otsingusse, avalikule profiilile ja Minu ala
  haldusesse, kasutama ühist aktiivsusperioodi ning toetama identiteedi enda
  `store_categories` rubriike;
- seda ei tohi lahendada teise sõltumatu tõeallika või juhusliku
  `listings.details` JSON-erandiga.

Järgmine eraldatud samm:

- read-only audit ühise kuulutuse elutsükli, Minu ala/rubriigi lepingute,
  hobusepiltide ja publication-event vundamendi kohta;
- audit peab defineerima minimaalse publish-first serveriorkestratsiooni ja
  ühise read/management projektsiooni;
- audit ise ei tohi midagi salvestada, avaldada ega productionis muuta.

<!-- SELQIRO_MARKETPLACE_ITEM_PROJECTION_V1 -->
## 2026-09-11 — shared marketplace-item projection foundation

The next database checkpoint adds `public.marketplace_item_projection_v1` as an internal `UNION ALL` read model over canonical `listings` and `horse_offers`.

Locked decisions:

- never create a shadow generic listing row for each horse offer;
- shared key is `content_type + content_id`;
- preserve canonical source status and expose a separate normalized lifecycle status;
- keep exact horse location, coordinates, confirmations and moderation fields outside the shared card projection;
- revoke direct browser-role access;
- allow source-specific indexed public-search branches to return the common shape for scale.

No UI, publication, Energy, image or store-category mutation is part of this checkpoint.

After local migration/test review and commit/push, the next exact step is a bounded owner read RPC for My Area. Do not connect the UI and do not add the horse publication mutation in the same patch.

<!-- SELQIRO_OWNER_MARKETPLACE_ITEMS_RPC_V1 -->
## Owner marketplace-item read RPC local checkpoint

The next local database checkpoint adds `get_my_marketplace_items_v1` over `marketplace_item_projection_v1` while preserving `get_my_identity_listings` unchanged.

The rollback test covers active-identity isolation, generic and horse rows, shared status mapping, search, recursive generic store-category filtering, foreign-category isolation, privileges and bounded pagination. All fixtures are rolled back.

No client or My Area UI is changed in this checkpoint. After local review and commit/push, apply the migration through a separate controlled production preflight and rollout. Only after production verification should the typed discriminated-union client wrapper be added.

<!-- SELQIRO_MARKETPLACE_ITEM_OWNER_READ_PRODUCTION_ROLLOUT_20260911 -->
## 2026-09-11 production checkpoint: shared marketplace-item owner read

Completed and verified in linked production project `vyjletlmwoiwxsnsunlm`:

- `20260911203000_add_marketplace_item_projection_foundation.sql`;
- `20260911220000_add_owner_marketplace_item_read_rpc.sql`;
- `public.marketplace_item_projection_v1`;
- `public.get_my_marketplace_items_v1`;
- shared key `content_type + content_id`;
- legacy `public.get_my_identity_listings` preserved;
- both migrations local + remote;
- no pending linked migrations;
- fresh production schema contract verification passed;
- production build passed;
- worktree remained clean after verification.

Do not run the production rollout again. Its first final check was a strict schema-dump parser false negative after both migrations had already been applied. A separate tolerant read-only verifier confirmed the deployed projection and RPC.

Current code checkpoint before this documentation commit is `ddaec90 Add owner marketplace item read RPC`.

Next exact isolated patch:

1. inspect the current `getMyIdentityListings` entity API, listing model and `useMyAreaListings` hook;
2. add typed owner marketplace-item types, a row mapper and a browser RPC wrapper for `get_my_marketplace_items_v1`;
3. preserve the current My Area UI and all mutations in that first client patch;
4. represent IDs as `contentType + contentId`, never assume every item has a numeric listing ID;
5. run build and static contract checks, then browser-test ordinary listings before committing;
6. connect horse rows to My Area rendering only in the following small patch.

Do not change status mutation, store-category assignment, public profile/search, horse publication, images or Energy in the first client-connection patch.

<!-- SELQIRO_OWNER_MARKETPLACE_ITEM_CLIENT_CONTRACT_V1 -->
## Typed owner marketplace-item client checkpoint

Completed locally:

- `OwnerMarketplaceItem` discriminated union for `listing | horse_offer`;
- stable `contentType + contentId` key;
- string source IDs across bigint listing IDs and UUID horse-offer IDs;
- validated RPC row mapper;
- read-only `getMyMarketplaceItems` browser wrapper;
- bounded pagination and status/search/store-category filter inputs;
- production build and static contract checks.

Unchanged in this checkpoint:

- `useMyAreaListings` still uses the legacy ordinary-listing API;
- `MyAreaListingsSection` and all owner-facing routes remain unchanged;
- horse rows are not rendered yet;
- status, store-category, publication, image and Energy mutations remain untouched;
- database and linked production remain unchanged.

Next exact step:

1. perform a read-only audit of `useMyAreaListings`, `MyAreaListingsSection`, current listing row types, navigation helpers and status mutation assumptions;
2. define the smallest adapter that lets the hook read `getMyMarketplaceItems` while preserving the existing ordinary-listing UI;
3. do not render horse rows or alter routes/actions in that same connection patch;
4. build and browser-test ordinary listing loading, search, filters and navigation before commit;
5. add horse-row rendering only in the following isolated checkpoint.

<!-- SELQIRO_V2_MY_AREA_MARKETPLACE_ITEM_READ_CONNECTION_V1 -->

## 2026-09-12 My Area owner marketplace-item read connection checkpoint

Completed and browser-verified:

- added `getMyAreaOrdinaryListings` as a local compatibility adapter;
- connected `useMyAreaListings` to the typed `getMyMarketplaceItems` owner read;
- filtered the first connection to `contentType === "listing"`;
- preserved the exact `MyIdentityListingCard` contract consumed by the current My Area UI;
- preserved ordinary search, status filter, hierarchical store-category filter, five-row preview, status mutation, detail navigation and edit navigation;
- left horse-offer rendering, status actions and routes outside this checkpoint;
- made no database, production, publication, store-category or Energy mutation.

Known non-blocking follow-up:

- after opening a late item from `Vaata kõiki`, browser Back returns to the compact five-row preview rather than restoring the expanded state and the previously opened row position;
- this behavior existed in the local-state view model and is not a regression in the marketplace-item read connection.

Next exact step:

1. commit this compatibility connection;
2. run a read-only audit of content-type-aware My Area routes and lifecycle actions;
3. add horse-offer row presentation only after the route/action contract is explicit;
4. keep the return-navigation restoration as a separate focused patch.

<!-- SELQIRO_V2_MY_AREA_MARKETPLACE_ITEM_ROW_ACTION_CONTRACT_V1 -->
## 2026-09-12 My Area marketplace-item row action contract checkpoint

Completed and build-verified:

- added `src/features/my-area/model/myAreaMarketplaceItemRow.ts`;
- added `src/features/my-area/model/mapMyAreaMarketplaceItemRow.ts`;
- defined a feature-level discriminated row model for `listing | horse_offer`;
- ordinary listings have explicit detail/edit routes and `active | paused | sold` owner status actions;
- horse offers have explicit null routes and disabled status actions until dedicated contracts exist;
- mapper is pure, exhaustive, side-effect-free, and URL-encodes `contentId` for listing routes.

Intentionally unchanged:

- `useMyAreaListings` is not connected to the new row mapper;
- `MyAreaListingsSection` is unchanged;
- horse rows are not yet rendered;
- existing ordinary-listing status mutation is unchanged and remains listing-only;
- store-category, publication, image, Energy, database, and linked production behavior are unchanged.

Next exact step:

1. run a read-only audit of the current hook return type, UI field usage, row keys, navigation, status controls, filters, preview/expanded behavior, and store-category assumptions;
2. define the smallest content-type-aware hook/UI connection around `MyAreaMarketplaceItemRow`;
3. preserve ordinary listing rendering and actions exactly;
4. never call ordinary listing status/edit APIs for `horse_offer`;
5. expose horse rows only with the capabilities present in the row contract, unless dedicated horse owner routes or mutations are added in their own later checkpoint;
6. build and browser-test before commit.

<!-- SELQIRO_V2_MY_AREA_CONTENT_TYPE_AWARE_ROWS_20260913 -->
## 2026-09-13 — My Area content-type-aware rows checkpoint

Completed and browser-tested:

- owner read uses `get_my_marketplace_items_v1`;
- My Area can consume `listing` and `horse_offer` projection rows;
- ordinary listing JSX, detail, edit and `active / paused / sold` actions remain unchanged;
- horse offers appear in the same list as compact read-only rows;
- horse UUIDs are not coerced into generic listing IDs;
- horse detail, edit and status actions remain disabled until dedicated contracts exist;
- horse image/placeholder alignment was adjusted by 8 px on desktop without enlarging the row;
- production build passed;
- read-only browser test passed with visible horse rows;
- no status, store-category, publication, Energy, database or production mutation occurred.

Known deferred UX issue:

- after expanding `Vaata kõiki`, opening a row near the end and returning with browser Back may restore the five-row preview instead of the prior expanded/scroll position.

Next exact step:

1. keep this checkpoint committed and the worktree clean;
2. run a read-only audit of horse owner detail/edit/publication/lifecycle contracts;
3. choose the first dedicated horse action without reusing generic listing routes or mutations;
4. keep store-category assignment and lifecycle writes separate, small and independently tested.

<!-- SELQIRO_HORSE_OWNER_DETAIL_READ_V1 -->
## 2026-09-13 owner horse-offer detail read checkpoint

Current checkpoint adds the first secure single-item owner read for canonical horse offers:

- migration: `20260913113000_add_owner_horse_offer_detail_read.sql`;
- RPC: `get_my_horse_offer_v1(uuid)`;
- authorization: authenticated active identity resolved server-side;
- owner output: complete editable fields, `details`, private owner location, lifecycle timestamps and ordered safe image metadata;
- excluded browser fields: Storage paths, uploader IDs and internal publication-event pointer;
- no client, route, edit, publish, lifecycle, category or Energy mutation.

Next exact step after local verification, documentation commit/push and controlled production rollout:

1. add a typed horse-owner detail entity model;
2. add a row mapper for the RPC result;
3. add a read-only browser wrapper;
4. do not connect the Minu ala row or create an edit route in that same first client patch.

<!-- SELQIRO_OWNER_HORSE_OFFER_DETAIL_READ_PRODUCTION_V1 -->
## 2026-09-13 owner horse-offer detail read production checkpoint

Completed:

- source commit `c866cde` (`Add owner horse offer detail read`) is on `main` and `origin/main`;
- migration `20260913113000_add_owner_horse_offer_detail_read.sql` is applied to linked production project `vyjletlmwoiwxsnsunlm`;
- local and remote migration histories are synchronized;
- linked post-rollout dry-run reports no pending migrations;
- fresh production schema verification passed;
- production RPC: `public.get_my_horse_offer_v1(uuid)`;
- owner authority is resolved server-side from the authenticated user and active identity;
- canonical source remains `public.horse_offers`;
- ordered image metadata is included without Storage paths, uploader IDs or internal publication-event linkage;
- ordinary direct table access remains closed;
- the verification run was read-only and confirmed no horse data, publication, lifecycle, store-category, policy-acceptance or Energy mutation;
- client routes and write actions remain unchanged.

Next exact isolated step:

1. perform a read-only audit of the current `src/entities/horse-offer` types and APIs;
2. add a typed owner detail discriminated model for the existing horse-offer variants;
3. add a strict RPC row mapper for `get_my_horse_offer_v1`;
4. add one browser RPC wrapper that accepts only the horse-offer ID;
5. run static contract checks and `npm run build`;
6. do not connect a route, owner detail page, edit form, publication mutation, status action, images mutation, store-category mutation or Energy action in the same patch.

The existing My Area horse rows remain read-only until a separate route and action contract is designed.

<!-- SELQIRO_OWNER_HORSE_OFFER_DETAIL_CLIENT_CONTRACT_V1 -->

## 2026-09-13 owner horse-offer detail client checkpoint

Current stable state:

- production contains the owner-only read RPC `get_my_horse_offer_v1`;
- the browser client now has a typed owner-detail model, strict mapper and read-only RPC wrapper;
- empty owner-detail results return `null`;
- shared marketplace identity is preserved as `content_type + content_id`;
- safe ordered images are mapped without Storage paths or uploader IDs;
- mapper behavior tests and the production build passed;
- no hook, owner route, edit form or mutation was connected;
- database and production remained unchanged during the client patch.

Files:

- `src/entities/horse-offer/model/types.ts`
- `src/entities/horse-offer/api/mappers.ts`
- `src/entities/horse-offer/api/getMyHorseOffer.ts`

Next exact work:

1. perform a read-only audit of the existing owner-detail hooks, routes and page composition;
2. define the smallest owner horse-offer detail route contract;
3. connect `getMyHorseOffer` through a feature hook;
4. add loading, forbidden/not-found and read-only success states;
5. do not add edit, status, publication, category or image mutations in that same first connection patch.

<!-- SELQIRO_V2_OWNER_HORSE_OFFER_READ_ONLY_DETAIL_ROUTE_20260913 -->
## 2026-09-13 owner horse-offer read-only detail route checkpoint

Completed and browser-tested:

- added `/v2/my-area/horse-offers/[id]`;
- added a thin route and V2 wrapper;
- added `useOwnerHorseOfferDetail`;
- connected the route to `getMyHorseOffer` and `get_my_horse_offer_v1`;
- added loading, not-found, retryable error and success states;
- added a private owner detail presentation for title, type, status, price, location, images and horse-specific fields;
- confirmed active-identity isolation;
- confirmed generic listing detail and edit routes still work;
- confirmed there are no edit, publication, status, store-category, image or Energy mutations;
- production build passed;
- database and production schema were unchanged.

Current boundary:

- Minu ala horse rows remain read-only and are not yet linked to the route;
- horse edit, publication and lifecycle actions remain unavailable.

Next exact step:

1. read-only audit `MyAreaHorseOfferRow`, `MyAreaListingsSection`, owner return context and route navigation;
2. define the smallest content-type-aware row-navigation patch;
3. connect only the horse row's image/title/detail action to `/v2/my-area/horse-offers/[id]`;
4. preserve ordinary listing `/v2/listing/[id]`, edit and inline status behavior;
5. add no horse mutations;
6. build, browser-test desktop/mobile and checkpoint separately.

<!-- SELQIRO_MY_AREA_HORSE_OWNER_DETAIL_NAVIGATION_V1 -->
## 2026-09-13 – My Area horse row owner-detail navigation checkpoint

Current pre-commit base:

- `4a3b4e9 Add owner horse offer read-only detail route`

Implemented staged code:

- `src/features/my-area/components/MyAreaHorseOfferRow.tsx`;
- the horse image/placeholder and primary text open `/v2/my-area/horse-offers/[id]`;
- the route ID comes from `item.contentId` and is URL-encoded;
- price, status badge and `Ainult vaade` explanation remain outside the link;
- horse edit, publication and status actions remain absent;
- ordinary listing detail/edit/status behavior is unchanged.

Manual browser evidence:

- owner horse detail opens from the row;
- the correct offer title, price, type, location and available detail fields are shown;
- the route is read-only;
- desktop and narrow layouts work;
- browser Back returns to My Area;
- ordinary listing detail, edit and status UI still work;
- no status or content was mutated during testing.

Known follow-up:

- after `Vaata kõiki`, returning from detail can still restore the five-row preview instead of the prior expanded/scroll state;
- solve this later as a dedicated My Area return-context patch.

Checkpoint commit message:

- `Connect My Area horse owner detail navigation`

After this checkpoint, start a read-only audit of owner horse-offer edit, publication-policy acceptance, publication and lifecycle mutation boundaries. Keep the first writing patch smaller than the full management flow.


<!-- SELQIRO_V2_OWNER_HORSE_EDIT_READ_ONLY_CHECKPOINT_20260913 -->
## Latest handoff — 2026-09-13 owner horse-offer read-only edit form

This entry supersedes the older next-step instructions above. Do not return to Architecture Sprint 1, LocationCard, the V2 skeleton phase or the earlier owner-detail/navigation implementation.

### Source and checkpoint

- Parent checkpoint: `649d9da Connect My Area horse owner detail navigation`.
- Checkpoint commit message: `Add owner horse offer read-only edit form`.
- Read the actual commit hash and push status from the current Git state and the checkpoint runner's result; this document cannot contain its own future commit hash.
- Six source files add the private `/v2/my-area/horse-offers/[id]/edit` route, wrapper, feature page, hydration mapper, form hook and detail-page navigation link.
- This is an existing-data, read-only form. Saving and every publication/lifecycle/image/Energy action remain absent.
- Four documentation files are included in the same checkpoint.

### Test evidence and limits

The original build and user-confirmed wide/narrow browser test passed. The source staged-diff SHA-256 is `f7a326dec1a88a0ee680a146fc7355e0ac0b873e97090493270a7f7d7b26af2d`. The recovery snapshot matched that patch byte-for-byte and contained no unstaged changes. It did not run new tests. The checkpoint runner requires a fresh passing build and exact source/documentation scope before commit/push.

The user did not have an `Otsin hobust` / wanted draft. Do not label that branch browser-tested, and do not invent a fixture or claim a production write. Ordinary listing navigation/edit UI and the narrow horse edit view were covered by the original checklist.

### Next coherent capability after a confirmed clean commit/push

Inspect the current horse entity save wrapper, shared form state and field components, create-form payload builder, draft-save SQL contract and relevant tests. Then implement draft-only owner editing and saving through `save_my_horse_offer_draft_v1` as one scoped feature:

- use the existing offer ID; never create a replacement draft during owner editing;
- permit saving only a currently authorized draft; keep non-draft statuses read-only;
- preserve seller-price versus buyer-budget and actual-location versus search-area semantics;
- audit hydration-to-save round trips and preserve stored values outside the edited fields;
- provide dirty, saving, success and error states with a single in-flight operation and stale-result guards;
- verify save persistence, owner/identity isolation, rejected/non-draft writes and ordinary-listing regression;
- test the wanted branch explicitly when a suitable safe fixture is available;
- do not add publication, policy acceptance, images, store categories, lifecycle writes or Energy to that patch.

The runner may collect the relevant current source files into its result ZIP after the checkpoint to avoid a separate collection round. That source export is read-only and is not itself an audit or test of the next feature.

### Product and workflow invariants

Keep publish-first creation: `Salvesta hilisemaks` is optional, not a mandatory visible draft stage. `horse_offers` remains canonical; shared marketplace reads use `content_type + content_id` without a shadow ordinary listing.

Group related low-risk work into meaningful checkpoints instead of unnecessary per-file conversation rounds. Keep actual-source inspection, build, relevant browser tests, documentation and exact-scope commit/push. Security-sensitive database/authorization changes, publication, image/Storage deletion and Energy/payments require independently controlled validation.

My Area `Vaata kõiki`, filters and scroll restoration after Back remain a separate deferred task.


<!-- SELQIRO_OWNER_HORSE_DRAFT_UPDATE_CONTRACT_20260913 -->
## Latest direction — owner draft update server contract, 2026-09-13

This supersedes the older instruction to unlock the owner form using the existing
create-form mapper and `save_my_horse_offer_draft_v1` directly.

The last confirmed base remains `5f59250 Add owner horse offer read-only edit form`.
The next source checkpoint adds migration `20260913190000`, its rollback test and
`docs/architecture/horse-offer-draft-update-v1.md`, plus these four documentation
updates. Read the runner result/Git state for whether this source was later committed.

New contracts are `get_my_horse_offer_edit_snapshot_v1` and
`update_my_horse_offer_draft_v1`. They use a server-incremented bigint edit revision
as decimal text and preserve unedited values through a closed scalar patch.
Local rollback tests, existing save/read regression suites and build passed; the
local migration/test data were rolled back. Production is NOT applied, UI remains
read-only, and no new browser test was performed.

Next sequence:
1. Review the result ZIP and exact seven-file scope, then commit/push this source.
2. Perform a separately controlled production preflight, migration and verification.
3. Audit/coordinate the existing optional same-session draft update path: legacy
   writes advance revision but do not check it. Retire/restrict that old update
   path through a controlled migration/release before exposing owner editing.
4. Connect the atomic edit snapshot, revision-string client, changed-field mapper,
   guarded hook and editable UI as one cohesive feature once the write contracts
   are deployed and the legacy transition is safe. Keep offer type locked.
5. Preserve unknown displayed/stored values; do not send all hydration defaults.
   Conflicts retain unsaved user input and must not be auto-retried with a new revision.

Do not add publication, images, Energy, category assignments or My Area scroll
restoration to this feature. Publish-first creation and optional save-later stay.
