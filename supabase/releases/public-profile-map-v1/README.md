# ASUKOHT-1B — public profile locality map read

This release adds exactly one public read-only RPC. It projects the confirmed
ASUKOHT-1 locality/region point into the public profile map after the existing
profile reader has authorized that profile for the current viewer. It creates
no table, changes no owner writer, and does not modify existing profile, listing,
service, job, account or coordinate records.

## Public contract

`get_public_profile_location_v1(p_identity_id uuid)` is executable by `anon` and
`authenticated`. `PUBLIC` and `service_role` receive no execution grant. The
private location table, schema and helpers remain inaccessible to application
roles. The function is STABLE SECURITY DEFINER with `search_path=pg_catalog` and
qualified application names. It takes no owner lock.

The RPC first obtains the identity's canonical slug, calls the accepted
`get_store_by_slug`, and requires that its selected result has the requested
identity. Account availability, active identity/business and both block
directions remain under that reader's authority. A canonical candidate that is
not visible does not fall back to another account's legacy slug alias.

An unavailable profile returns SQL/JSON null. A readable profile returns exactly
`{identity_id, location}`. The location is null when hidden, unconfirmed, or
inconsistent with the current country/city text. Otherwise it has seven fields:

| Field | Meaning |
| --- | --- |
| `country_code` | Validated ISO country identity |
| `country_name` | Saved country label |
| `place_name` | Saved locality or region label |
| `region_name` | Optional saved regional disambiguation label |
| `latitude`, `longitude` | Representative point of the selected locality/region |
| `precision` | `locality` or `region` |

Only the canonical ASUKOHT-1 table is read for the point. The saved location must
pass its existing provenance/shape validator and still match the public
country/city. The output strips source, source ID and source kind. Historical
`identity_profiles.lat/lng` and free-text addresses are never interpreted as
this point. Valid numeric zero coordinates remain valid.

This remains a locality map even when a business has opted to display its exact
address text. The UI labels that precision, omits a premises marker, and may
provide a separate public-address search link. An exact in-card business point
would require an explicitly confirmed geocoded-address contract. There is no
geocoder call, API key or provider usage in this SQL release.

## Preserved baseline and release protocol

The baseline combines two already observed, accepted metadata fingerprints:

- The original location foundation/profile/account read and writer catalog.
- The complete ASUKOHT-1 private location schema, tables, functions, ACLs and
  invalidation trigger.

`baseline-query.sql` contains the two original bounded metadata queries. Their
hashes are combined as a PostgreSQL JSONB object. No application rows are
exported. `expected-contract.json` records both preserved hashes, the accepted
ASUKOHT-1 installation report hash, and source commit `af78c7b`.

`new-catalog-query.sql` captures the full new routine definition, owner, return
and argument types, volatility, security/configuration, explicit ACL and
effective execution rights. It counts every overload or routine kind with the
new name, so a partial or unexpected routine is rejected.

The updater uses one sequence:

1. `preflight.sql` is read-only. It accepts exact absence or the exact installed
   new routine while requiring both existing metadata contracts to match.
2. `apply.sql` accepts absence only. It performs one transaction, rechecks old
   and new metadata, and commits. There is no acknowledgement before COMMIT.
3. A separate read-only transaction emits the `applied` acknowledgement after
   COMMIT. Failure here means uncertain outcome and does not authorize replay.
4. `verify.sql` independently checks the preserved baseline and installed routine
   before repository commit/push. An exact installed state can be verified
   without another mutation.

`sql_contract.py` accepts exactly one bounded six-key receipt in the expected
stage, with pinned baseline/release/contract hashes and a true no-row-export
flag. Duplicate JSON keys, extra rows/fields, wrong hashes/phases, malformed
UTF-8, nonfinite JSON constants and missing applied/after contract pins fail.

The SQL requires PostgreSQL 17.6 and the actual privileged SELECT authority
needed by the public reader and location table. Transaction-local search path,
UTC and statement/lock/idle timeouts are explicit. No default ACL changes or
extension installation occur. The schema reload notification is transactional.

## Preparation tests and evidence limit

`tests/public-profile-map-v1/sql/run_native.py` starts and stops an isolated
PostgreSQL 17.6 server. It uses the actual accepted public reader, account
availability helper, profile editor foundation and ASUKOHT-1 schema/functions.
The synthetic fixture supplies invented users/data and an inert decorative media
helper. It never accesses a linked project or sends provider requests.

The production preflight must reject the synthetic catalog. The wrapper tests
then substitute only the combined baseline hash literal in memory, retaining
the actual migration, grants, after-contract hash, rollback, post-COMMIT receipt
and independent verification. These tests do not claim a production migration.

The native cases cover both viewer roles, exact seven-field projection, hidden
and unknown visibility, missing/stale records, zero coordinates, region
precision, legacy exact-coordinate separation, closed private privileges,
unavailable owners, inactive identities/businesses, both block directions,
canonical aliases, existing invalidation, read-only execution and unchanged
synthetic content. Installation tests cover partial names, preserved-baseline
drift, after-guard rollback, post-COMMIT acknowledgement, resume without replay,
and unexpected execution grants/configuration. Receipt parser tests are separate.

The prepared release and local tests do not prove the user's Mac installation,
database execution or Vercel deployment. Those remain separate acceptance steps
bound to the returned report and the same deployed commit.
