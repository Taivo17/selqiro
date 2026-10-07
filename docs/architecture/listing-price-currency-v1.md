<!-- SELQIRO_PUBLIC_PRICE_READ_SOURCE_CHECKPOINT_20261006 -->
## 2026-10-06 — retain the tested public price-read layer, not an API rollout

This dated source checkpoint supersedes older next-task entries. Base e4b4143 was
clean and remote-equal in the user's 6 Oct 22:12:30 (+03) run. Read the new
listing-public-read-source result for actual build, staged/committed/pushed state
and NEW_COMMIT; this source document cannot know its own future commit hash.

Retain 10–14 and four TS parsers in supabase/labs/listing-public-read-v1, outside
migrations and runtime imports. Existing 01–09, their shared fixture/seed/currency
sample, all 23 migrations, application source and existing tests stay unchanged.
The new lab records exact tested bytes and dependency hashes; no second price
truth source or duplicate core is introduced. Node suites keep exact bytes as
reference files, with historical scratch layouts mapped for a future reviewed
harness. This checkpoint does not replay one-shot SQL/Docker/Node test runners.

Prior completed search run: 6 Oct 12:09, 154 SQL +156 parser cases (5 with helper
JSON) +2 nonblocking snapshots. Prior surfaces run: 6 Oct 22:12, 320 SQL (172
registry checks included) +154 parser cases (7 with helper JSON) +2 snapshots.
Both included TS checking, selected rollback and removal of only their helper.
These are selected PG17.6/synthetic-auth cases, not full HTTP/JWT/role/load/browser
proof. Retention checks file parity and the existing project build, not new SQL.

Public fields deliberately omit owner price revision/request key/receipt and
precise private location. Search/detail permit active NULL expiry; profile does
not. Detail truncation and images_has_more must be handled by later UI. Broad
legacy SELECT/RLS is not repaired. The 16-currency sample is not a global register.
No new permission or database application occurs. Preserve all original test data.

Next after reviewed source completion: owner ordinary/horse/wanted reading with
server active-identity authorization and one bounded list; preserve private owner
access, horse sale-price and wanted-budget meanings. Registry, legacy/trusted
writers, deletion/receipt policy, recoverable client and real HTTP/role/deployment
QA remain separate release gates. FX/crypto/Energy/units are outside this step.

---
<!-- SELQIRO_PRICE_INTEGRATION_SOURCE_20261006 -->
## 2026-10-06 — Retain tested atomic basics and creation integration (closed lab)

This checkpoint retains 04–09 in `supabase/labs/listing-price-integration-v1/`,
using the existing 01–03 core/fixture/seed without duplicate copies. The exact
new source outcome is `listing-price-integration-source-*.zip`, not this entry.
Base is 38d260af982bd41784ce4d5cb5fca6db31535a88, clean and remote-equal in the
06 October 09:24:49–50 +03 test result. A new commit hash is not predetermined.

Historical actual tests: 05 October 110 basics assertions + five overlapping
session pairs; 06 October creation 170 + five regressions, two isolation rejections
and seven overlapping pairs. Outer rollback and own-helper removal passed in both.
No SQL/test replay occurs merely to retain source. Exact bytes and result hashes
are recorded in the integration lab PROVENANCE.json; suites remain separate.

One basics save changes title/description/condition and optional price atomically.
Omitted price preserves a concurrent newer price. Basics uses initial-value CAS,
not a general revision/ABA detector. Price uses its own original revision.
Creation makes listing/price/receipt together; same account/key/canonical input
recovers the original current object, changed input conflicts, deleted results
are not resurrected. Only READ COMMITTED is supported; sequence gaps are allowed.

These remain closed local contracts, NOT a production migration or enabled API.
The selected PG17.6 fixture has synthetic auth and a superuser; it is not full
Supabase/JWT/HTTP, every role/definer/lock order or a performance result. Existing
pure value helpers are distinct from the closed new row-reading/writing functions.
Images, AI, geocoding and store-category relations are outside the creation SQL
transaction. Do not dispatch them automatically on receipt recovery.

Next after source review: versioned readers with exact decimal text and price kind,
coordinating search-v1, owner list and detail. Before enabling writes: full currency
registry, all three legacy writers/trusted paths, receipt/account retention and
delete flows, then actual HTTP/JWT and recoverable publish-first browser integration.
The 16 currencies stay a test subset; no guessed test-data currency backfill.

Runtime files, existing client tests/dependencies and all 23 migrations are unchanged.
No source operation calls SQL, Supabase, Docker, cleanup or an old journal; fresh
build and exact staging precede separate COMMIT PUSH consent. Actual results belong
to the new report. A stopped run must preserve files/index/commit, without replay.
FX, crypto, Energy, horse publication and Details/unit conversion remain separate.
Unit conversion is only for supported Details fields, never title/description.

The short 99 handoff is generated from CURRENT_STATE; old archived history and the
renderer are unchanged. At every important new external package explicitly say:
**Laadi see üleandmispakett nüüd alla.** This is not automatic local saving.

---
<!-- SELQIRO_PRICE_CORE_LOCAL_PASS_SOURCE_20261004 -->
## 2026-10-04 — Tested closed price lab retained as source, not deployed

Accepted evidence: `listing-price-core-local-v2-20261004-103434-t4cgfpdb.zip`,
SHA-256 `9d16717c2cc1efdbcb08f0d5573e11cc1db7a78e5cab395ec2a0f288a54d2ef2`.
Actual Mac run ended 04 Oct 10:34:57 +03: 154 PostgreSQL 17.6 assertions,
three overlapping two-session cases, selected outer rollback and exact helper
removal PASS. Git was clean at `6df0af9457d2e812788b10a7a7951d8be8271912`
and remote-equal. These tests are prior evidence, not rerun by this source step.

The byte-identical SQL modules, 16-currency laboratory subset and test files are
stored under `supabase/labs/listing-price-core-v1/`, NOT under migrations.
The core writer remains closed to API roles. No application code, current client
tests, package dependencies or the 23 applied migration files change.
No persistent local schema, production migration or new frontend feature is installed.
Use the new source result for actual build, staging, commit/push and clean-state
facts; the presence of these prepared documents is not proof of execution.

Continuity: start with `docs/99_V2_HANDOFF_NEXT_CHAT.md`, generated from
`docs/continuity/CURRENT_STATE.json`. Its former 5573 lines are preserved exactly
under `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Keep current state separate from historical NEXT instructions. Actual Git and the
latest result outrank historical proposed next steps. Do not rerun completed
lab runners, catalog audits, diagnostics, installers or production operations.

### Verified closed-core scope versus unimplemented integration

The retained SQL uses existing price_amount numeric plus laboratory price_kind,
currency and price_revision. Fixed amount is canonical decimal text, not a JSON
Number. The lab caps amounts below 10^18 and validates the selected currency scale;
zero is not free, and non-fixed modes carry no amount/currency. The legacy price
text is a one-way display of structured prices. These are LAB limits, not a
final all-country currency registry or a production migration approval.

CAS checks the expected revision before no-op detection. Profile/identity/member
locks serialize the three tested schedules; the loser remains unchanged. The
membership race changes status to inactive; deletion was tested sequentially.
Direct protected price/revision writes and structured delete/truncate are blocked
inside the lab's tested SQL-role boundary, not a client-supplied trust flag.
Do not apply the lab deletion guard to the live portal before coordinating its
real deletion workflow. The trusted-role/definer surface needs integration review.

No create RPC, durable create-idempotency or single basic-fields+price endpoint
is delivered by this source checkpoint. Keep title/price in one future server
transaction, never two partially succeeding browser calls. Preserve unchanged-
price omission. Old /sell, /my-page and V2 writers need coordinated transition.
Current search v1 expects null currency: do not change that response under it.
Owner/public readers must deliver price kind and precise strings before opening
new writes. No per-card conversion queries, FX, price sorting, crypto, unit
conversion, Details editor, horse publication or Energy changes are included.

---

<!-- SELQIRO_PRICE_DISPLAY_ACCEPTED_TEST_LISTINGS_20261002 -->
## 2026-10-02 — Shared display browser accepted; disposable test-data direction

Actual 02 Oct 14:00:11–14:00:52 +03 installer run passed 633 module cases and
real Mac build; base d8090ba remained unchanged with exactly 22 staged paths and no
unstaged changes. This was not a new commit/push. The base remote was equal then.
Evidence: listing-price-display-20261002-140011-ft9q0e9u.zip, SHA-256
e883cebe959e72d8db36176c5679cfcc473244a3c2484b6606663063d182a05e.
Review verified 354 archive files/353 hashes, 311 current/308 base source triples,
all 22 payloads, staged-patch reconstruction and 23 unchanged migrations.
633 TAP cases are prior synthetic-transport/hooks/JSX tests, not a browser/HTTP run.

User acceptance 02 Oct: "testides vigu ei leidnud". Desktop screenshots show original
5578 with "Valuuta täpsustamata" in public detail/profile and My Area, BMW 2345 €
retained, wanted budget 5000 EUR / Rapla unchanged, and edit raw 5578 with no changes.
The narrow search screenshot shows the same 5578/note without truncation.
This is user browser evidence, not independent HTTP/DB, all filter/return actions,
identity, race/load, full mobile owner/profile coverage or new deployment proof.

The shared display policy is now tested locally, not deployed by the installer.
Freeze its 17 app/test files. Only five doc prefixes, a fresh build and explicitly
confirmed 22-path commit/push belong to this source finish. Use returned NEW_COMMIT
and remote/clean status; verify that exact serving deployment separately afterwards.
No listing save/renewal or test-record creation is required for the read-only smoke.

User explicitly states all currently posted listings are test listings and will be
deleted later. Treat old test-record preservation as a non-goal for the next schema:
do not build elaborate historical-price repair, backfill or indefinite compatibility
branches solely for them. Prefer one clean validated source amount/currency contract
for newly created listings. This does NOT authorize deletion/reset now, change the
classification of accounts/services/messages, or relax ownership, accuracy and safety.
Any later cleanup needs its own exact scope and confirmation, including linked images.
No test data, source history or completed operation journal is removed by this finish.

Next data-model work can prioritize a small validated original amount + fiat currency
contract for new listings, without guessing currencies or preserving every historical
text convention. Document any intentional break before removing a writer/reader;
do not weaken authorization or let presentation values become saved source values.
The current display-only unknown-currency fallback is small and remains unchanged in
this finish. Future cleanup/migration is separately scoped, never an implicit reset.
Viewer currency/FX remains derived and approximate, never the seller's payment terms.
Crypto is only a deferred optional agreement preference, not processing or custody.
Measurement conversion is confined to supported structured quantitative Detailid
fields with explicit original value/unit. Never parse title/description for units.
Energy, horse/wanted contracts, lifecycle, images and search ordering stay separate.

---

<!-- SELQIRO_HONEST_LISTING_PRICE_DISPLAY_CANDIDATE_20261002 -->
## 2026-10-02 — Ordinary display-only candidate after accepted d8090ba production

Accepted production scope: user screenshots at 12:32–12:35 show d8090ba main,
Ready/Production and live edit/detail with original 5578. Actual 12:09 source
finish is committed/pushed/clean/build-PASS. No fresh DB/Vercel API audit implied.

Display rules are implemented in one pure getListingPriceDisplay model:
1. Nonblank original price text wins over any derived numeric fallback. Trim only
   outer display whitespace, preserve decimals/separators/prose/currency tokens.
2. Bare numeric notation plus no supplied currency -> unchanged label and visible
   "Valuuta täpsustamata". No locale/identity/location/default EUR inference.
3. Explicit currency/free/agreement/range/unit-price prose -> original text, no
   auto-recognition, conversion, validation or appended contradictory currency.
4. Absent/blank price text -> existing amount if available; decimal strings stay
   exact, trailing zeros retained, no Number coercion. A finite transport Number
   is shown as received; its previously lost digits cannot be reconstructed.
5. No usable text/amount -> "Küsi hinda". 0 stays numeric 0, never implicit free.
6. A provided separate currency may accompany bare amounts (EUR label -> €); this
   is presentation only, not confirmation of a canonical currency/FX contract.

Read models carry optional priceNote; only the ordinary owner branch additionally
retains priceAmountText from the existing read response before the legacy Number
field. Neither is persisted. Existing priceAmount numeric consumers for owner rows
stay intact. Generic listing priceAmount permits its already possible decimal string.
One ListingPrice component renders label and note without truncation or private IO.

Money authority in detail is the directly loaded listing: existing seller snapshot
may enrich seller presentation but does NOT replace price_amount or currency.
No other snapshot, seller, owner, visibility, auth, query or gallery behavior changes.
The old text-only formatPriceLabel entry forwards to the same pure model. The
compatibility ordinary-owner adapter uses that model too; it is not reactivated.

Scope: search, public detail, profile listings, ordinary owner rows and existing
product-discovery cards. Horse sale/free/lease/co-rider and wanted use their existing
price/budget contracts, untouched. All existing search-filter/pagination/return,
profile-category, status and renewal semantics stay outside the price calculation.

Validation: 93 new source/JSX/read-boundary tests plus 540 existing cases (one
ordinary-row expected value updated to retain 1234.50). No old horse expectation
relaxed. New tests include all five renderers, huge decimals, contradictory numeric
fallbacks/snapshots, 0/empty/missing/prose, query bounds and raw form hydration.
These use synthetic transport/hooks, not browser DOM, SQL, real users or load.
Actual installer PASS requires serial TAP 633/633 and the user's real full build;
then read-only browser acceptance, separate finish and exact deployment verification.

No new price storage, writes or SQL. Keep rawPrice hydration and unchanged-price
omission. Never send a display label, note or amountText in a write payload.
Later: safe source amount + currency write contract, viewer display currency and
explicit approximate FX, separately tested cross-currency filters/order. No crypto
processing; optional agreement marker may come later. Units are separate and only
supported quantitative Detailid fields, never title/description/arbitrary prose.

---

<!-- SELQIRO_ORIGINAL_PRICE_BROWSER_ACCEPTED_DETAILS_ONLY_UNITS_20261002 -->
# Current checkpoint — 2 October 2026: original-price browser acceptance

This entry updates the prepared/staged sections below; their historical text is retained.
The Oct1 installer passed all 540 module cases and real Mac build. Its exact result
listing-original-price-safety-20261001-120156-89xn2sw1.zip has SHA-256
d9853b28afc04d59757c07d0fe96de070475b54a52ecaedbd7fb82ad3ee9ea39.
Before source finish: base 204088f, eleven staged paths, no unstaged changes and no
new commit. Its 340 files/339 hashes, 308 source triples and staged diff were reviewed.

Oct2 user browser acceptance shows a title-only save, raw price 5578 preserved and
the new title in public detail. This is user evidence and a real configured-DB write,
not our HTTP payload or exact server numeric-value audit. Current public/My Area
5578 EUR labeling remains an old, deferred display issue, not proof of currency.
The six tested app/test files are frozen for finish. Only five document prefixes,
fresh build and separately consented eleven-path commit/push belong to that step.
Actual NEW_COMMIT and clean/remote status come from its returned result; deployment
must be verified afterwards without another title/price/renewal write.

### Accepted next design boundary: measurements in Details only

The user's explicit Oct2 decision confines unit conversion to supported structured
quantitative fields in "Detailid". Title and description are NEVER scanned, parsed,
converted or rewritten for measurement units. Their ordinary editing and keyword
search are unchanged. Location in Details alone is insufficient: arbitrary legacy
strings do not become typed measurements without an explicit reviewed input flow.
Original value, unit and field meaning are authoritative; display conversion is
secondary, rounded output marked, no persistence or edit hydration from conversion.
Missing/ambiguous units, technical designations and identifiers remain unchanged.
A small registry/converter/formatter can serve approved fields later; no unit API,
AI, network lookup or speculative database infrastructure is introduced now.

The current DetailsPreview is read-only and shows at most eight entries. The later
editor must preserve all unedited/unknown keys and validate category applicability;
never replace the full details object from its visible subset. This is a separate
follow-up from price saving. Price/FX and measurement calculation remain distinct.

The approved sequence remains: close this safeguard, verify exact deployment, shared
honest price display, then canonical fiat amount/currency and optional viewer FX.
The detailed unit editor/runtime follows its own scoped review. No price data backfill,
crypto interface, wallets, payments, general CAS, new SQL or unit conversion is delivered
by this finish. All 23 migrations and existing owner/renewal/image/Energy behavior stay.

---

# Listing original-price and currency contract — staged implementation

## Decision and first boundary — 1 October 2026

User approved the multi-currency direction and minimal deferred crypto preference.
This first candidate ONLY protects the stored price from display-to-edit round trips.
It does not claim that structured currencies, shared display or FX are implemented.
Required source base: 204088f37453c716b238b6ddab34403a09128644.

### Observed current flow

The working ordinary creation route is /sell. Its text input, local draft and insert
store price text plus a derived price_amount. The /v2/sell ordinary branch is not
an independent working publisher; its horse owner draft flow stays unchanged.
The exported listings DDL has price text and price_amount numeric, but no canonical
currency column. This is saved source/schema evidence, not a new production read.
Legacy parsers strip non-numeric characters differently; price_amount is NOT
sufficient proof of currency or an unambiguous original decimal. No backfill here.

Before this candidate, mapListingDetailRow exposed priceLabel but not original
price text. useListingBasicsForm hydrated from that formatted label, treating
"Hind kokkuleppel" as missing. updateListingBasics unconditionally sent price and
price_amount even for a title/description/condition-only edit. Thus a display-only
EUR fallback, rounding or label could become new stored data. Historical rows may
already contain such values; this patch does not infer or repair their history.

### Implemented candidate

- ProductListingDetail.rawPrice carries row.price exactly, with null retained.
- A small listingBasicsForm module hydrates from rawPrice, never priceLabel or FX.
- Explicit empty or textual prices remain text. With no price text, an available
  raw numeric value is stringified without currency/grouping/rounding. Unchanged
  fallback text does not create a stored price string on an amount-only row.
- The hook compares current price input with the initial/subsequently saved input.
  Change-then-revert is not a price change. Only a different input includes price.
- updateListingBasics accepts omitted price and omits BOTH price and price_amount
  from its update payload. It does not fetch/rewrite current price as a workaround.
- An explicitly changed string retains the existing write/parser behavior, including
  explicit clearing. Non-string present price is rejected before transport.
- Ownership checks, title/description validation, search_text building, and all
  non-price fields of this writer remain unchanged. No status/deadline write added.

This prevents this V2 path's unrelated edits from overwriting a concurrently changed
price. It is NOT general revision/CAS, HTTP/RLS authorization, durable replay or
system-wide lost-update protection. Explicit price edits retain existing limitations.
Legacy /my-page and /sell writers are not modified in this candidate.

## Approved target after this safeguard (not implemented here)

One original monetary value is the authority: publisher-selected amount/currency.
Viewer display currency is a separate account preference (browser preference for
visitors), independent from language, search country and acting identity. Public
cards/details may show an approximate converted value first and ALWAYS show original
amount/currency with it. Same-currency display has no approximation marker. Owner
editing uses only original data. Currency choices must never silently retag amounts.

An unknown currency remains unknown; do not infer EUR from country, locale, current
viewer preference or old UI defaults. Old price text is retained. Text such as free,
negotiable, from, per hour/month and wanted budget needs its own honest semantics;
null is not zero. Horse wanted budget must never be mapped into ordinary seller price.
Use explicit supported fiat codes and an exact decimal amount contract for the later
structured writer. Mixed or ambiguous old strings must not be destructively parsed.

FX will be an optional shared read-side aid: batched/cacheable rate snapshots with
source/date, bounded freshness and original-price fallback. No provider call per card,
no rewriting listings on a rate update, no ranking/timestamp or Energy effect. Display
conversion is not a guaranteed settlement amount, accepted payment currency or checkout.
Price filters/sorting require a separate server-side pre-pagination contract; none added.

Payment preference is separate from original price and display currency. Only a later,
optional and default-off seller declaration "Krüptoga tasumine kokkuleppel" is approved
as the first possible crypto-facing step. No crypto prices/rates/payments, wallets,
keys, addresses/QR generation, escrow, exchange or token infrastructure now. Energy
remains internal optional-capability units, not crypto or a user-to-user currency.
No unsupported countries or fiat participation are blocked merely for missing FX.

## Validation and execution boundary

New regression suite: tests/listing-original-price.test.cjs (57 cases). Full client
regression selection: eight suites, 540 cases including the prior 483. These exercise
actual modules with fake transports/hooks, not real Supabase/React DOM/browser/HTTP.
Preparation must not be reported as a Mac Next build. The installer runs these suites
and the existing npm run build on the Mac, then stages exactly eleven paths. No install,
SQL, Docker/Supabase, migration, application-row operation, commit or push in the runner.

Browser: inspect existing raw price input; changing/reverting without Save is not a write.
For a write check use only a deliberately selected existing owner test listing; change
only its title, save once, reopen, and confirm the price remains unchanged. Even local
frontend saves write to its configured DB. Do not use an ordinary live sale casually,
create arbitrary fixtures, change a price merely for this test, or renew a listing.
Screenshots do not prove exact server-row numeric precision; payload omissions are
covered by module tests. Return result ZIP and findings before a separate source finish.

Latest completed checkpoint: 204088f was user-accepted Ready/Production with working
owner expiry/search/wanted views on 29 September. Source/remote equality was last
observed in the 20:01 finish, not newly verified by documentation preparation. The
20260928160000 renewal migration remains prior APPLIED_VERIFIED; preserve all 23
applied migration files and COMPLETE journals. Do not rerun completed installers.

## Next scoped work after this candidate is accepted and finished

Implement one shared honest original-price display rule in the ordinary listing
search/detail/profile/My Area read paths, preserving raw input separation. Then define
and validate the additive canonical amount/currency write/read contract before exposing
currency selection or conversion. Existing title strings with currency are not proof
of a structured currency field. Keep crypto and unrelated layout polish out of that step.
