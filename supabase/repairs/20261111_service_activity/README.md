# Service activity v1

Prepared 2026-11-11 against the source and accepted service-store-category
baseline. This repair is not a historical migration replay. Earlier issued SQL
and installer packages remain unchanged.

## Scope

Services keep their canonical UUID/content/gallery/category links. The new private
activity table gives a first-publication 365 × 24 hour period and an explicit free
owner renewal with exact previous-deadline compare-and-swap. Renewal does not
change a service row, creation/publication/update dates, edit revision or status.
Archived remains archived, and normal edits/status changes never extend a period.

The architecture and exact owner RPC contract are in
`docs/architecture/service-activity-v1.md`.

## Modules

| Module | Responsibility |
| --- | --- |
| `01_state.sql` | Private rollout/activity metadata, deliberate existing-data transition, first-publication trigger, central public eligibility |
| `02_owner_reads.sql` | Additive V2 owner snapshots/list and separate activity read; V1 unchanged |
| `03_renewal.sql` | Explicit authorized CAS renewal, finite exact deadline and unchanged long-period handling |

`changes.sql` concatenates these modules. `preflight.sql` and `verify.sql` are
read-only catalog/data checks. `apply.sql` performs one guarded transaction with
a service-write lock, row backfill, capability install and postcondition check.
Do not execute the component files directly against production.

## Existing-data transition

There was no authoritative service expiry field. Already published services and
archived services with `published_at` receive one deliberate year from a single
rollout server instant. Their original timestamps remain untouched; origin is
`transition`, and explicit `last_confirmed_at` remains null. Drafts and archived
services without publication evidence wait for actual first publication.

Preflight reports counts only in `transition_summary`:
`published_count`, `archived_count`, `draft_count`, `invalid_date_count`.
The invalid count must be zero. These are current counts and may differ across
separate observations; immutable schema/authority fingerprints must still match.
Unknown database declarations, wrong privileges or nonfinite dates stop before
the new rollout. Exact apply replay preserves the rollout and all periods.

## Guard boundaries

Fourteen named guards retain the accepted service/publication/profile/category
foundation, actor and hosted-context checks, table/column privileges, incoming
foreign keys, rules, trigger implementations and API role inheritance. Only the
deliberately replaced `is_public` predicate and new activity objects/trigger are
excluded from the retained aggregate; their complete definitions, owners, ACLs,
RLS, constraints, indexes, effects and collisions are in the capability fingerprint.
No object is omitted from both checks.

Neither API roles nor legacy browser writers gain direct activity access. Public
search/profile/detail/category/media/contact paths use the same eligibility
predicate. Old V1 owner snapshots remain byte-shape compatible, so the deployment
order can be SQL then web client. Existing public Storage photo URLs are outside
managed-media access control; this repair performs no Storage operations.

## Local verification

Use the existing cached PGlite runtime; no database connection or package install
is needed. Set `SELQIRO_PGLITE_MODULE` to its absolute `dist/index.js` path, then run
from the repository root:

```sh
node supabase/repairs/20261111_service_activity/tests/build-guards.mjs
node supabase/repairs/20261111_service_activity/tests/runtime.mjs
node supabase/repairs/20261111_service_activity/tests/installation.mjs
```

The builder imports retained fixture declarations without running earlier test
suites. It checks before/after invariants, complete private-table API denial and
exact replay, then records source and catalog pins. Runtime tests use synthetic
content, managed photos and identities. Installation fault injection verifies
unknown-state refusal and transactional rollback, including after backfill.

Proof files are `guard-generation-result.json`, `runtime-result.json` and
`installation-result.json`; each records its source hashes and limitations.
They are local preparation evidence, not Mac, hosted SQL, Storage or Vercel proof.
