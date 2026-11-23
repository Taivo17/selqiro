# Account public profile fence v1

23.11.2026. Accepted application base: `4b607828d0b153b84166ba963fdb4e77337e11f0`.

## Scope

This release adds one private `account_lifecycle_private.account_is_available(uuid)`
function and changes only the final eligibility predicate in `public.get_store_by_slug(text)`.
The account owner is the existing selected `block_account_id`: a private identity's
`user_id`, or the business account's `owner_user_id`. Unknown identity types are denied.

The selected CTE, canonical-before-legacy ordering, all 21 public response fields,
location privacy, identity/business status and bidirectional viewer blocking remain
unchanged. An unavailable canonical candidate never falls through to another owner's
legacy alias. `public.get_public_profile_media_v1(uuid)` remains byte-identical and
continues to delegate to the same canonical reader before returning media metadata.

The helper returns `false` for a null/missing account or state. It requires `active`,
a positive revision, an undeleted Auth account and no current Auth ban. A nullable
creation time remains valid; a non-null nonfinite time is denied consistently with
the existing account getter. Email confirmation is not an added requirement.

The helper is `STABLE`, uses `pg_catalog` search_path and qualified relations, has no
row locks, writes or repair-on-read, and grants no direct execution to PUBLIC, anon,
authenticated or service_role. Its two account lookups use existing primary keys.
No new lifecycle state, closure/restore/delete command, UI, dependency or account
backfill is introduced. The active-only constraint and Auth INSERT trigger are preserved.

## Installation contract

Use the separately issued bounded updater, not manual SQL execution. It checks the
actual Mac/Git/source/dependency/approved remote state before writing and preserves
all original reports and journals. This release's SQL never reads application, Auth
or Storage rows; all three installation stages inspect only scoped catalog metadata.

- `preflight.sql` returns recognized `before`, recognized `after`, or `unknown`.
- `apply.sql` requires exact `before` inside one bounded transaction, under a release
  advisory lock; creates the helper, replaces one reader, checks exact `after`, notifies
  PostgREST, and commits. Its receipt is read after COMMIT in a separate read-only
  transaction. Existing public reader grants are preserved by CREATE OR REPLACE.
- `verify.sql` independently requires the same `after` metadata in a read-only transaction.

Only one apply is allowed. Existing `after` is not permission to reapply. An uncertain
apply result may be reconciled by the same independent read-only verification, never
an automatic second schema write. The updater still distinguishes confirmed COMMIT
acknowledgment from separately observed after-state. Notify is not HTTP cache proof.

Exact before/after fingerprints are in `receipt-pins.json`; normalized function and
foundation contracts are in `expected-contract.json`. `source-pins.json` records
source provenance. `catalog-query.sql` is the catalog assembly's readable source;
executed preflight/apply/verify are self-contained exact generated files.

The preflight checks the accepted account foundation, preserved helper/media/Auth
function definitions and explicit grants, relevant owner column types/nullability,
relation ownership/RLS, primary-key and canonical/legacy slug indexes, exact old
reader definition and grants, and absence of the new helper. After-state also checks
that no application role has inherited EXECUTE on the private helper. Drift, overloads,
extra private functions, changed state-table rights or a different old reader stop it.

Public reader ACLs are reconstructed from accepted source (baseline explicit client
GRANTs, preserved PUBLIC default and later CREATE OR REPLACE statements); this local
preparation is not an independent fresh production ACL observation. The fresh exact
preflight must match those pins. Auth grants and selected owner/index metadata derive
from the previously accepted actual 22 November account catalog. No cloud state is
assumed from local compilation.

## Targeted evidence

A new dedicated PostgreSQL **17.6** loopback cluster passed **22** targeted cases:
active private/business reads, exact owner mapping in both directions, missing/null
owner/state, unknown identity type, deletion/ban/expired ban, nullable/nonfinite time,
legacy/canonical collision, private location, viewer blocks, delegated media and
managed cover metadata, private helper ACLs, read-only reads while both Auth/state
rows are locked elsewhere, active-only retention, second-apply rejection, metadata
drift and the final exact schema. Before/after fixture rows were unchanged by apply.
The own cluster was stopped and its PID file absent afterwards.

The fixture compiles the exact existing function bodies and foundation. It is a small
synthetic relation/data fixture, not a full Supabase/PostgREST/Auth/Storage environment.
An EXPLAIN with `enable_seqscan=off` confirms both exact-ID primary-key index paths
are usable; it is not a production performance, optimizer choice or load benchmark.

**18** targeted Python receipt-parser cases passed, including strict boolean types,
duplicate/extra/missing keys, stage/size/JSON boundaries, false fingerprint/success
claims and changed-base rejection. Actual native preflight/apply/verify envelopes
were reparsed. Proof files, fixture sources, commands, logs and input hashes are in
the issued package's SQL proof directory. No application dependencies were added
for those isolated tests. Existing broad suites were not repeated.

## Remaining boundaries

This is only the canonical public profile card and delegated media projection.
Other direct offering/search/feed readers, legacy profile cards, historical message
cards, writes, contacts and external image completion remain separate next adapters.
Previously issued raw public image URLs, cached responses and already rendered client
state are not revoked by this predicate. Separate RPC requests can observe different
statement snapshots. Account closure must stay unavailable until all required paths
and its own concurrency/restore/erasure contract are implemented.

All real existing accounts/content stay unchanged. No new SMTP/Auth configuration,
registration, domain, team roles, financial or Energy behavior is part of this release.
Maci build/commit/push, cloud apply/verify, exact Vercel deployment and real browser
profile acceptance remain separate evidence steps after this prepared package.
