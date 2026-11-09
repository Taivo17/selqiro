# Profile preflight reconstruction and r2 — 2026-11-09

The read-only diagnostic is complete. Its command is historical; the one next
installation action is now in HOSTED_PORTAL.md and CURRENT_STATE.json.

## Accepted real evidence

The first stopped update receipt has SHA-256
`fde3c3e874bbeabb018c4de66b8746c2b1a35d5d9a68d1f9e21f02c01df0c99a` and release
`0cf78dad191f17bdc73876649470ce1d269e2631356f7090f45daa64d9a366ab`.
It records database not_started, build not_run, commit null and push not_run.
Only profile_dependencies was false; all nine retained guards passed.

The user then supplied the completed read-only diagnostic, SHA-256
`8e09ba1c714950e8fc28ce8b1f1d1dc8c65dd0f433d22d96f1131bb7b859b980`, run
`344a4a96fa757fd041188e969860abc33809ac621a1e8b6ff2bbbd3079c458bb`, package
`97866852b780c872b6f61c319c3889e91238405c0590cb2c2d5e76a7ffae5c18`.
It ran 2026-11-09 19:33:50–19:33:54 Europe/Tallinn. PostgreSQL reports 17.6.
All 1326 index entries match b05ed30's accepted tree
`4dd48a37bb2df4de686a6b930b951e9af115f63c`; source was unchanged before and after.
The preflight is identical to the earlier stopped receipt. The only new data
are the technical catalog descriptions of the two shop-category tables.
No application or category content rows were collected. No portal-source, database or Storage write occurred. No build, commit or push
was performed. SQL stderr was 27 bytes;
its raw text was not included and is not inferred.

## Exact causes in the local reconstruction

1. The fixture had removed PUBLIC EXECUTE from the existing
   `prepare_store_category_name()` and `validate_store_category_parent()`
   trigger helpers. The retained baseline preserves their PostgreSQL default
   PUBLIC grant. The fixture now replays those source rights correctly.
2. The sole structural difference is the definition of
   `store_categories_name_valid_check`. The original source is
   `docs/database/legacy-migrations-20260722/20260713152000_add_store_category_name_integrity.sql`:
   `char_length(name) BETWEEN 1 AND 60 AND name = regexp_replace(...)`.
   PostgreSQL expands BETWEEN into a nested conjunction. Re-parsing the later
   schema dump flattens the equivalent conjunction, changing its serialized
   catalog description and exact fingerprint. The fixture now restores the
   original declaration from that unchanged source. No catalog normalization
   or special unknown-hash allowance is added.

Both table structure JSON objects now match the observed metadata exactly.
The complete dependency hash is reconstructed as
`d42b8615d634c3c823c2399a8dcc32e88151624635cb90eec20d10262c8f63a6`.
The prior actual services-r2 authority/structure invariants already differed
from their synthetic fixture; they are before/after preservation values, not
absolute synthetic-production equality pins. With those accepted retained
inputs, the rebuilt category facts reproduce every field of the actual old
STOP preflight, including all three invariants. See tests/review/baseline-reconstruction-verified.json and root-cause-resolved.md
in the repair directory.

## New r2 scope and proof boundary

The application, 01_service_order.sql, 02_profile_marketplace.sql and changes.sql
are byte-identical to the original tested patch. All 557 successful production
build inputs match. Existing unit, Chromium and runtime-SQL evidence is reused
with explicit hashes; those broad suites were not repeated for this fixture fix.
The newly generated preflight/apply/verify retain exact dependency checks and
before/after invariants. The complete baseline reconstruction passed, as did 20 focused permission/CHECK
drift, rollback, apply/replay checks and 10 updater-report-path integration tests.
Those fresh results are recorded separately from reused runtime evidence.

The installer still verifies the previous successful services-r2 receipt,
all sources and index entries, actual branch/HEAD and the approved remote before
writes. It uses the same existing CLI and one guarded transaction changing only
three readers. It does not alter the production shop-category CHECK or grants.
Original issued ZIPs, the stopped journal and the diagnostic journal remain
unchanged. This r2 package has its own manifest-derived journal.

The prepared r2 is not yet an actual Mac update, Git commit/push, Vercel Ready
result or authenticated browser acceptance. Those boundaries remain distinct.

## Report delivery preference

Every new runner must make the exact current sendable report easy to provide:
create a private unique Downloads copy, print SAADA SEE FAIL with its absolute
path, then reveal the same file using bounded /usr/bin/open -R without a shell.
Never guess by selecting the newest old report. Preserve originals and copies.
A failed copy falls back to the verified original; a failed Finder call leaves
an exact path. A last durable but stale report is labelled; if no report exists or its provenance cannot be safely verified,
say so and request the STOP line. This enduring rule is in docs/03_AI_RULES.md.

The actual diagnostic's terminal screenshot shows the Downloads path and the
Finder selection command without an error, and the exact resulting JSON was
supplied. The Finder window itself was not visually inspected. The r2 updater
integrates the same verified reporter on its failure path.
