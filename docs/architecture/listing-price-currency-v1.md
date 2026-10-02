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
