# V2 Kuulutused wording v1

Approved by the user on 2026-09-24. Base: `869be7b` (wanted owner-list client complete).
This is a copy-only candidate, not a new marketplace capability.

## Vocabulary

| General surface | Wording |
| --- | --- |
| Navigation / type switcher / discovery title | Kuulutused |
| Search placeholder | Otsi kuulutusi… |
| Home entry | Vaata kuulutusi |
| Featured section / generic sample badge | Esiletõstetud kuulutused / Kuulutus |
| Organic heading | Kuulutused sinu lähedal |
| Listing return fallback | ← Tagasi kuulutuste juurde |
| General creation heading / accessible label | Lisa kuulutus |
| Short mobile creation label | Lisa |

Teenused remains separate. Product Showcase / Tootenäidised is not renamed.
Real producer/product descriptions, sale/wanted/rental type labels, policy text
and user-entered content are preserved. The obsolete Product Discovery eyebrow
paragraph is removed rather than replaced with another redundant badge.

## Exact application scope

- V2Shell and V2DiscoveryTypeSwitcher: labels only, existing destinations/types.
- V2MobileNavigation: visible and accessible create labels; `/sell` remains.
- V2HomePage: listing entry and generic sample/featured labels only.
- V2ProductDiscoveryPage: title, helper, placeholder, featured/category wording,
  and one removed static paragraph; no search/filter implementation change.
- ProductResultsSection: heading only; actual list hook/card/return source stays.
- ListingDetailPage and listingReturnContext: neutral back/fallback wording;
  public-profile back wording and navigation/restoration logic stay intact.
- ListingCreateForm: heading and mobile-label mention only; no publication unlock.
- StoreCategoryManagementCard: neutral explanatory category text only.

27 exact reviewed occurrences in 10 modules. No global replacement and no
URL/component/API/database rename. V1 translation keys are not used for these
V2 labels and remain untouched; the fallback legacy form itself is not redesigned.
The existing skeleton featured/home/filter content is not completed by this patch.
No new ranked/public horse result, status, image, moderation or Energy behavior.

## Validation and lifecycle

`tests/kuulutused-wording.test.cjs` has 39 checks using actual source modules and
synthetic hooks/data/JSX interpretation. It checks labels, existing link targets,
products/public-profile back semantics, mobile visibility and untouched concepts.
It does not test a browser DOM, responsive geometry or a database.
The guarded installer checks exact source/Git/evidence, makes external backups,
writes whole files, runs those tests and the local Next build, then stages exactly
16 files. It does not commit, push, execute SQL or mutate an operational journal.
Read the actual installer report for run status; a separate browser review and
finish commit are required. The production frontend is not changed by staging.


<!-- SELQIRO_KUULUTUSED_WORDING_ACCEPTED_20260925 -->
## Acceptance and scoped completion — 2026-09-25

The actual installer result ended at 10:33:14 (+03): 39/39 checks, build PASS,
16 staged paths on `869be7b`, no commit/push, no DB commands. Archive SHA-256:
`d505b01fba1f912114c5e70eec49205cf492ae9056bdfe4d5f87fcef705dfdb3`.
The user subsequently reported "testides on korras" against the four-item
browser checklist and supplied desktop/narrow screenshots. These show the new
labels and preserved services/showcases/back contexts. The browser behavior is
user-confirmed; Node tests use synthetic hooks/JSX, not a real DOM.

The completion adds only acceptance to this contract and four current project
docs. All ten application modules and the test file remain exactly as tested.
Its fresh build, explicit COMMIT PUSH and final exact Git checks establish the
checkpoint; consult the result for the actual new hash and remote state.
The same 16 paths remain the entire commit. No SQL/install/journal or new UI
mutation is included. A successful push alone is not deployment verification.
Remaining technical UI explanations and placeholders are deferred pre-launch
work; accepting the vocabulary does not certify those features as complete.
