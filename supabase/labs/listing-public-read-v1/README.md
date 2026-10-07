# Closed public listing readers — retained test sources

## Status and boundaries

This source checkpoint retains the already tested 10–14 SQL modules and four
TypeScript contracts. It does not install SQL or expose an endpoint. All new
functions remain closed to API roles, exactly as tested. Current UI and runtime
readers do not import the four lab client modules. Files belong outside migrations.
The checkpoint result/Git, not this README alone, proves installation and commit.

## One implementation per contract

| Module | Responsibility |
|---|---|
| 10_price_read_model.sql | Six-field exact original price projection, no owner revision |
| 11_public_search_v2.sql | Versioned search, preserving the old v1 contract |
| 12_public_detail_fields.sql | Reviewed category-specific scalar detail projection |
| 13_public_listing_detail.sql | One public ordinary listing, minimal seller and gallery |
| 14_public_profile_listings.sql | Viewed seller slug, one store-category branch, count/page |
| client/ | priceRead, publicSearchV2, publicDetailV1, publicProfileListingsV1 |

Use 01–03 only from `../listing-price-core-v1/`; 04–05 only from
`../listing-price-integration-v1/`. The latter also retains creation 06–09.
Core fixture, seed and the 16-currency sample are not duplicated here.
`tests/DEPENDENCIES.json` pins their exact bytes and the original schema sources.

## Completed test evidence, not a new run

Search/price 06 Oct 12:08–12:09 +03: 154 SQL, 156 Node (5 with real helper
SQL capture), two nonblocking snapshots, typecheck, selected rollback and helper
removal PASS. Detail/profile 06 Oct 22:11–22:12 +03: 320 SQL (172 registry checks
inside that count), 154 Node (7 with helper capture), two nonblocking snapshots,
typecheck, selected rollback and helper removal PASS. Exact results/hashes are in
PROVENANCE.json. Nine selected empty tables and synthetic auth are not full
Supabase/JWT/HTTP, browser, production role inheritance or performance evidence.

## Test source layout and repeat limits

The search and surfaces SQL suites and label lists are separate. The search seed
is also the base for the surfaces suite; it is stored only once. Four actual TS
sources share one `client/` directory. The two Node suites and typecheck scripts
retain their tested bytes as `*.reference.cjs.txt`, because their original
`__dirname` layout was a temporary result workspace, not this repo subdirectory.
They are NOT advertised as in-place npm tests. `TEST_LAYOUTS.json` maps every
historical path to its retained source or exact external evidence. A future
reviewed test harness can rebuild that temporary layout without editing the tests.
Never rename/replay old Downloads/HEAD-bound runners as reusable repository tests.
`driver.reference.py.txt` contains the exact relevant historical methods only,
not an executable program or permission to reconnect a database.

The captured Oct 3 search-v1 definitions and actual SQL JSON stay in the result
archives, with hashes/maps; no second maintained migration or hand-written
replacement baseline is created. Future live transport tests must capture their
own SQL output, never silently substitute a historical or synthetic JSON sample.

## Read-only file check

From the repository root:

```bash
python3 supabase/labs/listing-public-read-v1/verify_sources.py
```

This checks retained source and dependency hashes. It performs no SQL, Node, Git
or network action and does not claim new tests or production readiness. The
source-checkpoint installer runs it; it is not a replacement for future test runs.
The project build may typecheck these four real `.ts` files via its existing
include rules; it does not make them active UI imports.

## Stable semantics to preserve

Fixed/free/negotiable/unspecified and legacy are separate. Exact decimal text
reaches JSON before JavaScript, fixed zero is not free, currency is never guessed.
Public responses omit account IDs, price revision, raw AI, precise private location,
creation request keys and receipts. Declared authored VIN/serial fields are not
blanket private; certification_documents and online_account_included remain excluded
pending separate rules. Truncation and images_has_more must be handled by a future UI.

Search/detail admit an active NULL expiry, while profile requires a future expiry.
Viewed slug determines seller, not viewer active identity. Invalid/foreign rubrics
return empty; later UI must not turn its old empty-array filter into NULL/all.
Each reader enforces its existing active/identity/profile/account-block predicates;
this does not repair broad legacy SELECT/RLS or add a new profile visibility model.
Counts/large offsets and category recursion have no production-load certification.

## Next coherent work

After this source checkpoint is reviewed, design/test owner ordinary/horse/wanted
reading separately. Preserve active-identity authorization, private owner access,
horse sale price versus wanted budget, and one bounded list without per-row calls.
Before opening any new UI/API: complete currency register, legacy/trusted writer
transition, wide read policies, receipt/account deletion rules, recoverable creation
client, HTTP/JWT/roles, exact deployment and browser QA. No FX, crypto, Energy,
horse publication, unit conversion or deletion of current test data here.
