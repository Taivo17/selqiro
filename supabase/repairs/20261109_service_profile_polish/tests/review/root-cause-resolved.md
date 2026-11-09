# Fixture mismatch resolved — 2026-11-09

Status: **exact baseline reconstruction and corrected guard checks pass locally.**
Production application remains a separate installer action.

## Cause

The failed preflight came from two inaccuracies in the new disposable fixture:

1. It removed default PUBLIC EXECUTE from `prepare_store_category_name()` and
   `validate_store_category_parent()`. The retained baseline keeps that right.
2. It recreated `store_categories_name_valid_check` from an expanded dump
   expression. Reparsing that explicit three-part AND flattened the original
   nested boolean tree, changing `pg_get_constraintdef` and the strict catalog
   hash without changing the intended condition.

The original, unchanged migration is
`docs/database/legacy-migrations-20260722/20260713152000_add_store_category_name_integrity.sql`.
It uses `char_length(name) BETWEEN 1 AND 60 AND name = regexp_replace(...)`.
Replaying only that CHECK declaration in the local fixture reproduces the
observed nested `(length >= 1 AND length <= 60) AND normalized_name` tree.
Its source SHA-256 is
`082ff73e6d12a87b24a1badbfbac003c7810ffd96aea9699dabe0ec154426000`.
No catalog mutation, definition normalization or alternate hash allowance is
needed. The production repair does not change either ACL or either table.

## Evidence

The bounded diagnostic was observed at `2026-11-09T17:33:53+00:00` on PostgreSQL
`170006`. The received report SHA-256 is
`8e09ba1c714950e8fc28ce8b1f1d1dc8c65dd0f433d22d96f1131bb7b859b980`.
`observed-baseline.json` retains its two table structure objects, old preflight
result, receipt identities and the precise single structural difference.
The full external receipt and source-index inventory are not copied here.

The local PostgreSQL/WASM runtime is `170005`. With the original CHECK and ACLs
restored, both complete table structures match the observation exactly. The
source-derived dependency fingerprint is exactly the observed value:

`d42b8615d634c3c823c2399a8dcc32e88151624635cb90eec20d10262c8f63a6`

The profile dependency component is:

`61b4fe2388231c5545158271b96859195f9e8c56c110e98468f53a370ae94adb`

The entire old STOP report is reproduced, including all three invariants. For
that comparison only, the retained authority and structure invariant inputs
come from the earlier successful r2 receipt; the added profile facts are
reconstructed independently from source. The whole live retained catalog is
not simulated. These previous invariant values remain before/after preservation
checks and are not turned into new absolute acceptance pins.

## Corrected guards

The guard SQL changes only the single profile dependency pin wherever that
exact comparison appears. All original catalog fields, strict comparisons,
unknown-state rejection, transaction boundaries and before/after preservation
checks remain. Measured fingerprints do not change; the now-correct pin changes
only `state`, `recognized`, `ready_to_apply`, `dependencies_ok` and
`guards.profile_dependencies` for the observed baseline.

`01_service_order.sql`, `02_profile_marketplace.sql` and `changes.sql` are
byte-identical to the initial release. The repair still changes exactly three
reader functions; no production table, user row, permission or policy changes
were added.

## Focused verification

The corrected guard generator passed local apply, verification and no-op replay.
The fresh installation suite passed 20 named checks, including:

- revoking either retained PUBLIC trigger permission is rejected;
- reparsing the semantically equivalent flat CHECK is rejected;
- weakening the CHECK is rejected;
- reader definition/ACL, extra overload, table-column, table-ACL, policy and
  legacy-writer changes are rejected;
- an injected second-module failure rolls back the earlier replacements;
- application preserves existing rows and category assignments;
- all retained invariants and dependency fingerprints remain unchanged;
- an exact applied-state replay performs no content change.

The 44 previous service-order and mixed-profile behavior checks are reused,
bound to identical reader SQL and unchanged evidence files by
`runtime-proof-reuse.json`. They were not rerun. This avoids presenting old
runtime evidence as fresh execution.

## Files and boundary

`baseline-reconstruction-verified.json` records exact comparisons;
`installation-result.json` records the 20 fresh checks; the repair's
`service-profile-polish-review.json` verifies source pins, generated guard
hashes, preserved prior SQL and explicitly reused runtime evidence.

The earlier partial review is historical and is superseded by this exact
reconstruction. The original issued ZIP and source remain unchanged. These
results do not claim a new Mac application, production SQL transaction, build,
commit, push, Vercel deployment or browser acceptance.
