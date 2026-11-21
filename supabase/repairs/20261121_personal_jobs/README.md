# Personal job and task publication — 21 November 2026

This additive repair extends the accepted `jobs-public-v1` publication and contact
authority to both private and business identities. Either identity type may offer
employment or ask somebody to complete a specific task. Existing employment,
draft, publication, revision, request and conversation records are retained.

## Contract

The owner content object still has its exact original 13 keys. The existing
`employmentType` enumeration gains `task`. For a task, `workingTime` must be
`null`; the field describes employment workload and is not applied to a specific
task. The existing `salaryPeriod` enumeration gains `task` for a whole-task price,
which is accepted only with `employmentType: "task"`. Other accepted pay periods
remain available and payment information remains optional. Exact decimal money
validation and currency precision are unchanged.

Public job results add `employer.identity_type`, read from the publishing
identity's actual `type`: `private` or `business`. Public names, slug and image
still come from the public identity profile, with the existing business-name
fallback for a business. A private account's email, legal name and private
contact details are not used as a fallback. Capability results add
`personal_publication: true` and `task_publication: true`.

No RPC signature, content key, receipt envelope, request-key binding or owner
revision format changes. Existing pending request bodies and stored receipt
bytes are not rewritten. The accompanying client accepts the older public
employer shape without inventing an identity type. Older already-open browser
tabs can need a reload after installation because the new type and enumeration
values are outside their earlier strict parsers. This release is for the owner's
closed self-test; it does not claim a zero-downtime client cutover.

## Authority retained

`jobs_private.require_actor` first calls the accepted shared account and active
identity guard. A private publisher must own the private identity and have the
matching profile; business publication still requires an active business and
active membership. The existing account and identity locks remain in place.

Publication retains the exact displayed-policy acceptance, publication and
expiry timestamps, one calendar month in UTC, row revision checks and historical
request receipts. Public detail, search and profile reads require an active
publisher with a public slug. Bilateral account blocks continue to filter public
reads and new contacts. Provider hiding continues to affect discovery only.

A private task or job contacts the publishing identity's actual account owner.
A business task or job retains the existing business-owner conversation route,
including when an authorized member authored it. The retained contact wrapper
checks the peer, membership and bilateral block state and does not send an
automatic first message. Closing or expiring a job does not erase historical
conversation cards.

## SQL scope

The five numbered modules replace nine existing function bodies and change three
named checks on `public.jobs`: extend the existing employment and pay-period
checks, and add the cross-field task check. Function signatures, owners, ACLs,
configuration, table grants, RLS, policy records and existing triggers remain
unchanged. No Auth schema ownership or grant is changed.

`changes.sql` is the generated module concatenation. It is not a standalone
production installer. Use the packaged runner with `preflight.sql`, `apply.sql`
and `verify.sql` so that expected source and database states are checked.

`preflight.sql` and `verify.sql` are byte-identical read-only transactions. Their
observation includes all job-private functions and tables, the job RPCs, job
triggers and retained account, identity and messaging dependencies. Catalog
facts include function bodies, owner, ACL, configuration and signature; table
columns, checks, indexes, ACL, RLS, policies and triggers; and the job schema ACL.
Ordering uses `COLLATE "C"` and no environment-specific OIDs are fingerprinted.
PostgreSQL 18's separate NOT NULL constraint rows are excluded because the
equivalent column `notnull` fact is already checked, matching PostgreSQL 17.

The only non-catalog observation reads the one retained installation-settings
row. It does not read accounts, jobs, messages or other user-content rows. The
installer must be `postgres`, have unfiltered access to that settings row and
match the fixed hosted project, instance, release and storage authority.

`apply.sql` takes the repair advisory lock, recognizes the complete expected
before or after state, performs the change only from before, verifies the after
state and retained installation context in the same transaction, and notifies
PostgREST to reload its schema. Unknown metadata causes a rollback. An uncertain
remote apply result must be resolved with the independent read-only verifier;
the runner must not blindly repeat a write.

Expected metadata hashes:

| State | SHA-256 |
| --- | --- |
| Before | `33c8f264b584b8a30cc39253af4a5d2b73f551c530296cc5fca037424fc33721` |
| After | `0154e63e365b610241031f5a0e6617abdb918a067212e99b7a82e9cfa06fbb54` |

The JSON report format is `selqiro-personal-jobs-state-20261121-v1`. State is
`before`, `after` or `unknown`; unknown always has `recognized: false`.
`scope_sha256` is the actually observed metadata digest. The report also includes
the fixed project, instance and release identifiers, both expected hashes,
the actual transaction `read_only` state, and `user_rows_read: false`.

## Local evidence and limits

`tests/prepare.mjs` reconstructs accepted declarations in the retained synthetic
fixture, generates portable before/after facts and the three guarded SQL files,
and verifies that only the nine planned function bodies and named job checks
change. It compares seeded application rows and Auth authority before and after.
Historical test suites are not executed; their fixture declarations supply the
accepted test foundation.

`tests/runtime.mjs` runs 22 grouped checks with a non-superuser installer and
separate API/provider roles. Coverage includes private and business employment
and tasks, optional and exact payment, raw historical request replay, wrong
accounts and switched identities, business membership, revision conflicts,
publication policy acceptance, stable public pagination, hiding and bilateral
blocks, real provider routing, historical message cards and closed authority.
An intentionally drifted table grant is rejected by the installation guard and
rolled back.

Run from the repository root with an existing PGlite installation:

```sh
SELQIRO_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js \
  node supabase/repairs/20261121_personal_jobs/tests/prepare.mjs
SELQIRO_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js \
  node supabase/repairs/20261121_personal_jobs/tests/runtime.mjs
```

`catalog-pins.json` records all measured facts. `source-pins.json` records the
input and generated SQL hashes. `runtime-result.json` records the executed engine,
checks, exact test and SQL hashes, and explicit limits. The tests use PostgreSQL
permissions and PL/pgSQL inside PGlite with synthetic data. PGlite serializes
sessions, so sequential CAS and identity-switch results are not native
concurrent-session proof. No hosted database, production storage, real user data
or live PostgREST endpoint was tested or changed by this local repair work. The
packaged runner must independently recognize the actual hosted catalog before
applying; a mismatch must be investigated rather than bypassed.
