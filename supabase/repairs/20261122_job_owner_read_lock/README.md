# Owner job read lock repair — 22 November 2026

Base: accepted application commit `78aea6f6d7c57aee47a29cd0e8b29c9c4e862561`.
Database baseline: accepted job-image catalog after-state
`683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848`.

`01_owner_read.sql` replaces only the existing
`public.get_my_jobs_v1(uuid,uuid,integer,jsonb)`. Its body and volatility change;
owner, ACL, signature/defaults, security/search-path/UTC/lock-timeout settings and
every other guarded function, table and job contract remain unchanged.

The STABLE read checks authorization and reads the page using the calling
statement's snapshot. A concurrent revocation can finish after that snapshot;
the next statement must observe it and refuse. The shared mutation authority
continues to take its existing row locks. See the architecture document for the
exact privacy, transaction and future-maintenance boundaries.

## Guarded installation

The Mac release dispatches only `preflight.sql`, `apply.sql` and `verify.sql`.
`changes.sql` and the source module are retained for review, not extra actions.
The runner records a durable single-write intent, confirms the after-state with
an independent read and then performs its scoped commit/push.

The fixed catalog scope is inherited from the accepted image-reader release.
It pins all current job functions and relevant Selqiro authority helpers. Actual
additional authority metadata is captured inside apply and compared unchanged;
the complete synthetic Auth/Storage fixture schema is not a production pin.
No application user rows are read or changed by the installation guard.

## Evidence and generation

`generator/` contains the actual portable catalog and SQL composition code.
The preparation function accepts an explicitly supplied local test connection,
captured before/after states and `outputDir`; it does not bootstrap or connect
to any remote database. Its default output directory is a preparation scratch
location, so reproduction should supply this repair directory explicitly.

`source-pins.json` binds the modules, generated SQL, generator and retained
accepted source inputs. `catalog-pins.json` stores the complete known fixed
before/after facts. The issued package's `proof/` retains native PostgreSQL17.6
test sources/results, exact commands, isolated runtime boundaries, guarded
installation tests, independent review and fresh portal build evidence.
Test-only native launchers use explicit preparation-machine paths and remain
evidence; they are not user-Mac installers or new portal dependencies.

The accepted 49 client tests were not repeated. Current package verification
distinguishes their exact prior receipt from new SQL tests and the fresh build.
The repository repair files alone do not prove a Mac run or live deployment.
