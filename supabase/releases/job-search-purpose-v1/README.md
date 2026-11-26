# Job search purpose v1

This append-only release changes one function:

`public.search_public_jobs_v1(text,text,text,text,text,text,text,integer,jsonb)`

It adds the search-only value `employment` to `p_employment_type`. This lets the
application distinguish people looking for a job from people looking for a task
without loading and filtering incomplete result pages in the browser.

| Search argument | Eligible employment type |
| --- | --- |
| `NULL` | All existing jobs and tasks, unchanged |
| `employment` | Every value distinct from `task`, including `NULL` |
| `task` | `task`, unchanged |
| A concrete existing subtype | The matching subtype, unchanged |

`NULL` stored employment types are deliberately included in the employment
search. Existing UI semantics treat every non-task entry as a job, and an older
job with an unspecified contract subtype must remain discoverable.

The only two source edits in the function are its search-argument allowlist and
employment predicate. The new predicate runs before cursor comparison and
`LIMIT`. Keyword/category/country/city/workplace/working-time filters, the
timestamp/UUID cursor and result shape are preserved. The function signature,
default arguments, owner, grants, security mode, volatility, search path,
timezone and plan-cache configuration remain exact.

## Search-only boundary

`employment` is not a stored employment type. The job table constraint,
`jobs_private.normalize_content` and all four writer RPCs remain unchanged. The
native test suite calls the current public `save_my_job_v1` and verifies that a
request containing this sentinel is rejected without a job, receipt or policy
acceptance write.

Existing `is_public`, account availability, canonical business owner,
bidirectional block and hidden-provider checks remain in force. No existing
repair file is rewritten. This release adds no helper, table, column, enum,
index, policy, grant or role membership and migrates no account or content row.

## Pinned catalog and execution

The expected contract is derived from accepted source at commit
`2b3407fee17f4d19594ce45647a1739b26249835`, tree
`b6543039421cd86f4227d18f65edde1ca06e8a05` (2,398 files). It uses the accepted
job-read catalog for the old target and read dependencies, and the latest
job-write catalog for current writer/account dependencies. It does not assume
that an older contact-reader catalog remains wholly current.

The guard pins the target and 32 unchanged functions, current job/category/
request relation structure and ACLs, the current account foundation, Auth
metadata, relevant identity/block/hide structures and the public avatar
projection. Function enumeration allows the expected set plus one unexpected
function, so a changed overload cannot be silently truncated from comparison.
Catalog queries read metadata only. They do not select real account, job,
message or file rows.

Execute complete SQL entry files through the reviewed bounded updater:

1. `preflight.sql` uses a read-only transaction and recognizes exact `before`,
   exact `after`, or `unknown`. A new installation requires trusted `before`.
2. `apply.sql` takes an advisory transaction lock and relevant relation locks,
   checks exact `before`, replaces the one function, checks exact `after` and
   commits. It then opens a fresh read-only snapshot, rechecks `after`, and
   emits its acknowledgement only after the schema commit.
3. `verify.sql` must run in an independent connection and verifies the
   committed `after` state in a read-only transaction.

Only `postgres`, the pinned function owner, may execute the installation path.
The prerequisite grants no privileges. A second apply is refused. Do not infer
success from an empty response or CLI exit status alone, and do not retry an
uncertain apply automatically. A later `after` observation does not substitute
for a missing required apply acknowledgement. Preserve the updater's recovery
rules.

All entry files remain under the existing 512 KiB SQL transport ceiling.

## Receipt contract

`sql_contract.py` retains the existing runner interface:
`read_result(raw_bytes, stage)`, `trusted(report, state=None)` and
`unchanged_contract(current, original)`.

It accepts only a bounded UTF-8 JSON envelope `[{"result": {...}}]` with the
exact required keys. Duplicate keys, extra rows/fields, non-JSON constants,
invalid booleans, stage mismatch or fingerprints inconsistent with the state
are rejected. `unknown` is never trusted. The historical `fence_verified` field
means that this release's exact installed state is verified; its key is retained
for the updater contract. No receipt reports account rows read or exported.

## Isolated verification

The native suite ran on PostgreSQL 17.6 with synthetic data. Its 58 cases cover:

- Every existing subtype and all-results compatibility, including complete
  result JSON preservation apart from the statement timestamp.
- Inclusion of unspecified (`NULL`) employment types and exclusion of tasks.
- Interleaved employment/task records, tied publication timestamps, multiple
  page sizes, exact cursor boundaries and no duplicate pages.
- Keyword, category, country, case-insensitive trimmed city, workplace and
  working-time filters, individually and together.
- Published/paused/closed/draft/expired rules, inactive identities/businesses,
  canonical account availability, bilateral blocks and provider hiding.
- Anonymous/authenticated RPC access, denied table/helper access, no new
  service-role grant, and write rejection of the search sentinel.
- Exact target metadata, fail-closed production preflight on the fixture,
  drift refusal, transaction rollback, post-COMMIT acknowledgement,
  independent verification and preservation of rows/non-target functions.

`fixture-provenance.json` identifies substitutions. The fixture uses real
accepted job search, public projection, visibility, account, normalization,
authority and writer bodies. Hosted Auth token lookup is replaced by a
synthetic session-setting reader, unrelated Storage readiness returns true,
and unrelated profile avatar lookup returns `NULL`. Identity/Auth/provider
relations contain minimal synthetic data.

For guarded transaction tests, only expected **BASE** facts are adapted to
these synthetic fixtures. Production target BEFORE/AFTER metadata stays exact.
A separate test proves that the unmodified production preflight rejects the
synthetic BASE. This is preparation evidence, not a production deployment or
live user-path acceptance claim.

From the development layout, run `python3 -I -B tests/build_fixture.py`, then
`node tests/native.mjs runtime01`, using a fresh run number for later attempts,
and `python3 -I -B tests/contract.py`. Set `SELQIRO_JOB_SEARCH_BASE` to the
accepted repository root when needed and `SELQIRO_TEST_RUNTIME` to a directory
providing `pg` 8.16.3 and `@embedded-postgres/linux-x64` 17.6.0-beta.15. The native
cluster binds only loopback port 58429, contains synthetic data and is stopped
after testing. Database runtime files are not a release payload.
