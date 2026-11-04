# Hosted completed SOURCE cleanup

This repair adds one bounded logical cleanup path for an already published
listing. It reuses the existing cleanup row, work key, lease, retry limit and
quota predicate. It creates no table, queue, provider client or auxiliary receipt.

## Contract

- `claim_listing_published_source_cleanup_v1(user, identity, attempt, request)` is
  service-only. The trusted server supplies the user already verified by Auth.
  Existing actor locks check the current active identity and private ownership or
  active business membership. The accepted gallery validator checks the listing.
- The claim selects at most one immutable `published_source` cleanup target with
  a completed, verified, problem-free SOURCE and the corresponding published,
  ready WEB object. Exact metadata versions must match; unresolved uploads or
  parts block the claim. The existing 60-second lease and eight-attempt bound apply.
- `record_listing_published_source_cleanup_v1(user, identity, attempt, request,
  object, work_key, result)` binds the result to that same actor, attempt and
  lease. It delegates the transition to the existing closed recorder. A first
  `deleted` result also requires no session problem and no object, upload or part
  metadata at the exact SOURCE path. A bare transport acknowledgement cannot
  release quota.
- `hosted_completed_source_deleted_v1(object)` extends the central existing
  predicate only for this durable SOURCE lineage. A later listing deletion or
  late diagnostic cannot charge the SOURCE again. The immutable completed and
  verified hash/byte lineage and metadata absence remain required.
- One settled SOURCE releases its 25 MiB reservation. Its published WEB retains
  4 MiB. Public content, WEB files, image order and identities are unchanged by
  this repair. Content deletion is exercised only on synthetic test rows.
- This is the managed provider's logical removal contract. It does not establish
  physical disk erasure or zero hidden temporary provider bytes. No process-exit
  or auxiliary-volume proof is fabricated.

The legacy readiness response remains `cleanup_mode: "held"`. Older deployments
therefore retain their accepted behavior during rollout. Generic cleanup RPCs
remain unavailable to API roles. Incomplete or unknown multipart sessions,
cancelled attempts and terminal WEB cleanup remain outside this capability.

## Files and installation

`changes.sql` is the small reviewed definition. Run it only through the delivery
installer's guarded `apply.sql`, after its exact `preflight.sql` result. The
generated `verify.sql` recognizes only the accepted installed capability.
`tests/build-guards.mjs` builds the three SQL files from pinned retained
declarations, including the already accepted primary-image repair.

The previous central predicate is a separately pinned before/after capability.
All other function definitions, existing authority and structure remain observed
invariants. Dependency checks include the bounded metadata views, original
identity writer policies, immutable ledger triggers, service-only boundaries and
the exact existing hosted project/instance. Unknown state is refused; no old
release or original SQL file is rewritten.

## Focused validation

The checked-in results were obtained with `@electric-sql/pglite@0.3.14`, reporting
PostgreSQL 17.5 compiled for Emscripten, in a disposable isolated fixture. Only
synthetic rows and metadata were used. The fixture imports accepted declarations
and the primary-image repair; it does not execute the old broad test suites.

- `tests/runtime-result.json`: 19 grouped checks, including identity and request
  binding, shared business authorization/revocation, unknown and mismatched
  sessions, foreign versions and parts, one-item claims, lease recovery, retry
  backoff, ACK rollback, 25 MiB/4 MiB accounting, idempotency, and deletion/diagnostic
  interleavings that must not recharge SOURCE.
- `tests/installation-result.json`: 14 grouped checks of the actual generated
  preflight/apply/verify SQL, dependency/authority drift refusals, view drift,
  collisions, rollback of failed postchecks, exact installation and repeat
  refusal. The accepted primary-image capability remains recognized.
- `tests/preflight-example.json` and `tests/verified-example.json` are actual
  isolated observations for the delivery parser, not production observations.

Set `SELQIRO_PGLITE_MODULE` to the installed PGlite module when running the three
test modules. Generation precedes installation checks. Runtime tests are
independent of generation. Each module closes its disposable database.

Native PostgreSQL startup was unavailable in this environment. These results
exercise PostgreSQL semantics, but do not prove behavior between simultaneous
native sessions. Lease and deletion races are tested as explicit sequential
interleavings. No real Supabase Storage request, Mac mutation, database deployment,
Git push or Vercel deployment is claimed here.
