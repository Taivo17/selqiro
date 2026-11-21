# Job image read correction — 2026-11-21

This repair corrects the optional publisher image in public job responses. It
does not change a job, account, profile image, request receipt, or Storage object.
The accepted source base is `512fe45b19417b380dac8d8fb6c361c6e8bd043e`.

## Observed failure and correction

`jobs_private.public_fields` previously returned `identity_profiles.avatar_url`
directly. That old column can still contain an inline data image even after the
current avatar has moved to managed profile media. A long inline value exceeds
the strict public job parser's URL bound. One such job causes the entire mixed
search page to be rejected; another publisher's profile can still load because
its own page does not contain that job.

The single changed expression now calls the existing
`profile_media_private.slot_url(j.identity_id,'avatar')`. That reader already
prefers the current active managed asset, respects an explicitly removed slot,
and omits unsafe or oversized legacy pointers. Its implementation is unchanged.
The public DTO keys, strict browser parser, search order, job visibility,
publication policy, owner reads, expiry, contact rules and RPC signatures remain
unchanged. The original legacy value is preserved in storage.

## Installation boundary

- `preflight.sql` and `verify.sql` run read-only transactions. They inspect
  PostgreSQL metadata and the fixed installation settings row. They read no user
  or job rows and return only recognized-state metadata.
- The scope retains the previous jobs functions, tables, permissions and
  dependencies, and additionally pins the media reader/URL/immutable-asset
  functions, private media schema, and assets/state table metadata.
- `apply.sql` holds a transaction advisory lock and accepts only the exact
  before or after scope. From before it replaces one function body. It verifies
  the expected after scope inside the same transaction. Unknown state aborts.
- An already installed after state is recognized without applying the change
  again. The Mac runner still uses its own durable intent and independent
  readback to decide whether an interrupted attempt may be considered complete.
- There are no grants, role changes, table changes, data migrations, deletions,
  image uploads, or Storage operations in this repair.

The before scope is
`70f63c1ab7988acb0a8f41d22382d5113e24cfd412754f36e9435217bccf051c`.
The after scope is
`683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848`.

## Evidence

`tests/prepare.mjs` verifies that only the `jobs_private.public_fields` body
changes. Signatures, owners, ACLs, function settings, table constraints, RLS,
indexes and triggers are preserved. It produces the pinned SQL and source
inventory.

`tests/runtime.mjs` passes 12 grouped checks using PostgreSQL 18.6 in PGlite
0.5.13 and the actual unchanged TypeScript job parsers. Checks reproduce the
mixed-search failure before the repair, prove both jobs parse afterward, and
cover anonymous/authenticated reads, no optional pay, valid/invalid/oversized
legacy image references, managed image precedence, removed/wrong-identity/
retired assets, profile/detail responses, stable pagination, task filtering,
unchanged stored rows and receipts, read-only checks, after-state idempotence,
unknown-definition refusal, and API-role closure.

`tests/public-read-fixtures.json` contains unmodified SQL response objects from
that disposable database. Its records and media metadata are synthetic. The
root `tests/job-image-read.test.cjs` uses these responses for additional browser
API/parser, rendering, and anonymous sharing regression checks. Expiry checks
may freeze time to the fixture's `read_at`; the fixture timestamps are not
rewritten.

These are local preparation proofs. They do not claim a hosted Supabase test,
real user-row inspection, live Storage access, native concurrent sessions,
browser layout inspection, or production deployment. Prior historical test
suites are not repeated; accepted declarations provide the local foundation.

For local verification, use an already installed PGlite module through
`SELQIRO_PGLITE_MODULE`, then run the preparation and runtime scripts with Node.
No package installation or hosted credentials are required. The delivery runner
does not run this disposable PostgreSQL fixture on the user's Mac.
