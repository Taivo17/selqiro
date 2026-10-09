# Owner listing price read — closed laboratory v1

Retained on 9 October 2026 from the reviewed local PASS. **Source retention only.**
The exact source-checkpoint result determines installed/staged/committed/pushed state.
This folder is outside `supabase/migrations` and is not an application deployment.

## Contract

`get_my_marketplace_items_v3(uuid,integer,integer,text,text,uuid)` is a bounded
owner page. The server resolves the authenticated account and its actual active
identity. The expected identity is a precondition, never a grant of access.
The parser validates both returned actor and identity; a later UI also needs
request-generation, auth and filter guards, including A→B→A identity switches.

Money stays a discriminated value: `listing_price`, `horse_offer_price` or
`wanted_budget`. All monetary amounts are exact decimal text. Missing or malformed
wanted budget and search area stay independently null; no fallback to a seller's
price or actual location. Horse EUR/EE is the existing pilot, not a worldwide rule.

One materialized v1 page keeps existing access/status/search/store-category/order
semantics. Limit defaults to 30 and is 1–100, offset 0–100000. One extra row gives
has_more/next_offset/window_limit_reached; there is no invented total count.
Store-category filtering currently includes ordinary listings only, as in v1.

Active source status may include an expired ordinary listing. An effective expiry
filter must be applied server-side before pagination in later client integration.
The existing 500-row UI must not silently be switched to this 100-row contract.
512-character title/description excerpts and flags are not edit-form initial values.

## Preserved files and one shared implementation

- 15–16 SQL, both owner parsers and SQL test/seed/labels are byte-identical to the PASS.
- Core fixture, core seed, currencies, 01–02, shared 10 and baseline migrations remain
  in their existing repository locations; `tests/DEPENDENCIES.json` records them.
- The two original parser files still import `./priceRead`. The new two-line
  `client/priceRead.ts` only re-exports the single existing implementation in
  `listing-public-read-v1/client/priceRead.ts`. It adds no price semantics.
- Historical Node tests are `*.reference.cjs.txt`; original driver methods are
  `driver.reference.py.txt`. They require the dated temporary layout, not a new
  general replay command. `tests/TEST_LAYOUTS.json` records that layout explicitly.
- `tests/snapshot.sql` is the exact transaction sent for before/after comparison,
  including READ ONLY, UTC, pg_catalog search_path and COMMIT. The old unwrapped
  SELECT body remains in external evidence, not as a second maintained test.

## Actual prior evidence, not re-execution during retention

The 9 October 09:46 +03 user run passed 190 SQL assertions, 140 real-parser cases
(eight use its own PostgreSQL stdout), three-module typecheck, four nonblocking
session pairs, selected rollback/nine empty tables and exact helper cleanup.
See `PROVENANCE.json` for archive identity, hashes, dates and boundary.

The two money snapshot tests read the complete old page while a writer transaction
was uncommitted, then the new page after COMMIT or the old after ROLLBACK. The two
auth tests read old permitted state before change COMMIT; subsequent requests
were denied after identity/member-status change. They do not prove instantaneous
revocation of already delivered data or revocation committed inside the same read.

The helper used selected PostgreSQL17.6 schema and synthetic auth. This is not a
full Supabase/HTTP/JWT/role-inheritance/browser/load result. Existing broad SELECT
policies, live writers and production image/storage permissions were not fixed.

## Read-only file check

From the repository root:

```bash
python3 -I supabase/labs/listing-owner-read-v1/verify_sources.py
```

This checks recorded source and dependency bytes only. It makes no SQL, network,
Git or data mutation and is not a SQL test or rollout approval. The source
checkpoint runs it automatically; do not rerun completed database test drivers.

## Next boundary

After the source result is reviewed, close the price release gaps in one scoped
plan: full currency registry, full owner edit reads, server expiry filtering,
legacy reader/writer transition, roles/RLS and recoverable client creation.
No endless new foundations: choose one user-visible integration slice, then test
and roll it out separately. Preserve the working horse draft editor and old v1/v2
until the tested replacement exists. FX, crypto, units, AI, horse publication,
Energy and test-listing deletion do not belong to this retention checkpoint.
