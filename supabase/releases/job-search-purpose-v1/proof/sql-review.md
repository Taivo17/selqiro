# Independent SQL release review

**Result: PASS. Blocking findings: none.**

Independent static source/metadata-delta/hash and synthetic receipt-parser review only. No SQL or production operation executed by this reviewer. Native PostgreSQL evidence below was produced by the separate SQL agent with synthetic data and an explicit fixture-only BASE adaptation.

## Findings

- **exact_body_delta — PASS.** Only the search allowlist and employment predicate differ from the accepted search definition; inverse replacement restores every byte.
- **search_only_before_pagination — PASS.** employment excludes task and includes NULL; all/task/exact-subtype branches retain prior behavior; predicate precedes cursor and limit.
- **target_metadata_preserved — PASS.** Owner, direct ACL, security-definer, language, stability, strictness, parallel/leakproof flags, return type, argument names/defaults and config are identical; only body hash changes.
- **accepted_input_pins — PASS.** All five accepted source/catalog input hashes match; accepted commit/tree/file-count are explicit pins, not a claim of freshly read production state.
- **sql_files_manifest — PASS.** Every listed SQL file matches sql-files.json.
- **receipt_fingerprints — PASS.** Independent local JSONB-style serialization reproduces the three published SHA256 fingerprints.
- **preflight.sql_catalog_identity — PASS.** Every embedded catalog recognition block is byte-identical to catalog-query.sql.
- **apply.sql_catalog_identity — PASS.** Every embedded catalog recognition block is byte-identical to catalog-query.sql.
- **verify.sql_catalog_identity — PASS.** Every embedded catalog recognition block is byte-identical to catalog-query.sql.
- **transaction_and_acknowledgement — PASS.** One guarded replacement is checked within the write transaction; COMMIT occurs before a new read-only snapshot checks afterstate and emits acknowledgement.
- **independent_verify — PASS.** Separate verification requires exact afterstate in a read-only transaction; preflight also uses read-only/ROLLBACK and unknown is not trusted.
- **only_one_function_replacement — PASS.** Only search_public_jobs_v1 is replaced; no row DML, table/policy/role/ACL changes or extra function creation is present. Transactional/advisory locks and SET LOCAL bounds are intentional.
- **visibility_and_write_gates_pinned — PASS.** Accepted publication/account-availability/block/hide gates and projection/cursor remain in search; current writer/account dependencies are additionally pinned and unchanged.
- **metadata_only_recognition — PASS.** Catalog recognition queries pg_catalog metadata and privilege expressions; no application/Auth/account/Storage rows are selected or exported.
- **receipt_parser_strictness — PASS.** Independently exercised four valid and five invalid synthetic receipt envelopes. Rejects uncommitted/before apply and verify, wrong read-only flag, drifted fingerprint and non-boolean recognition. This is not SQL execution.

## Native evidence reviewed separately

The SQL agent reported PostgreSQL 17.6 with 58 passing cases and 0 failures. Its report covers NULL subtype, type-specific keyset pagination, common filters, current publication/account/block/hide gates, authorization, row/metadata preservation, rollback, post-COMMIT acknowledgement, independent connection verification and drift refusals. This reviewer read the report and fixture provenance, but did not independently execute that suite.

## Limits

- The live catalog must still match exact production BASE and BEFORE pins at install time. No fresh production observation was made here.
- The native fixture substitutes hosted Auth/Storage/avatar boundaries and adapts only test BASE; production target BEFORE/AFTER metadata remains exact.
- This review does not claim browser layout or live deployment verification.

The machine-readable companion `sql-review.json` records exact hashes and sizes for every reviewed release/generator/evidence file.
