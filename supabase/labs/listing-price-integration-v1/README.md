# Tested listing price integration — closed laboratory

06 October 2026. **TESTED SOURCE, NOT AN APPLIED MIGRATION OR ENABLED API.**
This checkpoint retains the already tested 04–09 integration as readable source.
The actual installation/commit/push outcome is in `listing-price-integration-source-*.zip`.
File presence by itself does not certify source completion or database installation.

## One source for the core

Reuse `../listing-price-core-v1/` modules 01–03, its currency subset, fixture and seed.
They are not duplicated here. `tests/DEPENDENCIES.json` pins their exact paths/bytes.
This folder is deliberately outside `supabase/migrations`. Do not run these SQL files
against production or the original local Supabase database. No new API grant is added.

## Retained integration

| Module | Responsibility |
| --- | --- |
| 04_basics_contract.sql | Basic-field normalization, exact owner snapshot and search text. |
| 05_owner_basics_atomic.sql | Owner read plus one atomic basics/optional-price save. |
| 06_creation_categories.sql | Frozen ordinary-category prefix allowlist, tied to lib/categories.ts. |
| 07_creation_values.sql | Bounded creation input; tested two-parenthesis CASE correction. |
| 08_creation_receipts.sql | Closed completed-request receipt and request fingerprint boundary. |
| 09_owner_create.sql | One listing/price/receipt transaction, replay and identity checks. |

`CREATION_CONTRACT.md` preserves the reviewed contract from the tested candidate;
its dated word "candidate" means no rollout, not that the subsequent local test is missing.
`PROVENANCE.json` is the exact mapping from retained bytes to both original test results.

## Historical actual tests, not replayed by this checkpoint

05 October 10:25–10:26 +03: 110 basics assertions, five overlapping session pairs,
outer rollback and removal of that disposable helper passed.
06 October 09:24 +03: 170 creation assertions plus five syntax/length regressions,
two isolation-level rejections, seven overlapping session pairs, rollback and removal passed.
The source remained clean at 38d260a; no live schema was installed by either test.

Both original suites remain separate in `tests/basics/` and `tests/creation/`.
`.py.txt` files contain exact selected methods from pinned historical drivers.
They are readable references, NOT standalone tests and NOT instructions to repeat
completed Downloads runners. The creation reference also retains the exact isolation tests.
Full per-session SQL and logs remain in the external original result evidence.
Fixture and seed come only from the core folder; creation has its tested extra fixture adapter.

## Quick read-only source check

```bash
python3 supabase/labs/listing-price-integration-v1/verify_sources.py
```

This reads local files and compares hashes. It runs no SQL, Git, Docker or network,
installs nothing and writes nothing. PASS means retained source matches provenance,
not that SQL was executed again or that any function is publicly available.

## Boundaries that still need integration

Basics value-CAS covers title/description/condition; it is not a global revision and
cannot detect a change followed by a return to exactly the same values. Price has
its separate revision. An omitted price change preserves a newer concurrent price.
Creation replays the same account/key/canonical input to the original current object;
changed input conflicts, deleted results are not resurrected and ID sequence gaps are normal.
Creation requires READ COMMITTED; two other tested levels are intentionally rejected.

These tests use selected PostgreSQL 17.6 tables and synthetic auth, not full Supabase,
real JWT/HTTP, every role inheritance/definer path, every lock ordering or load.
The lab postgres is superuser. New row-reading/writing endpoints remain closed;
pre-existing pure value helpers are not the same thing as enabled application writers.
The 16-currency subset is not the final currency register. No inferred backfill of test listings.

Before enabling any new input: coordinate exact-decimal versioned readers and registry,
/sell, /my-page and V2 writers, trusted server roles, receipt retention/account deletion,
and the actual deletion path. Preserve the frozen search-v1 null-currency contract until
its callers are replaced safely. Images, AI, geocoding and store-category links are not
part of this SQL transaction; the publish-first client must handle recovery explicitly.

No FX, crypto, Energy, horse publication, Details editor or unit conversion is introduced.
Units later apply only to supported structured Details fields, never title/description.
Do not delete existing test listings or completed journals as part of source retention.
Next: read the current handoff, review the source result, then versioned reader integration.
