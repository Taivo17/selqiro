# Account service read fence v1

This prepared release is based on accepted commit
`0cb3484675ac9267a0f9d7f52f6e3dbff5074d1a`, tree
`6d213969675d86eea8e2ff56b99f9a232715b3a8`. It changes exactly three function
definitions and no application/account/content rows. Preparation, isolated
database proof, a future Mac run, cloud schema application, commit/push,
deployment, and user acceptance are separate evidence stages.

## Scope and retained behavior

| Target | Added check |
| --- | --- |
| `service_publication_private.visible_to_viewer(uuid)` | Canonical owner's unchanged `account_is_available` result, alongside the unchanged bilateral block predicate |
| `public.get_public_profile_services_v1(text,integer)` | One early canonical-owner check after unique active slug resolution, before content selection |
| `public.get_public_profile_services_v2(text,uuid,integer,integer)` | The same early check, with all category/count/pagination behavior retained |

A private identity uses `identities.user_id`. A business identity uses
`business_accounts.owner_user_id`. A legacy business identity's `user_id` does
not substitute for the business owner. Missing or invalid ownership fails
closed through the existing account helper. Profile slug ambiguity is resolved
before this check; eligibility cannot turn an ambiguous slug into a selected
profile. When an existing profile's owner is unavailable, the profile readers
set `identity_value` to NULL and retain their established empty envelope with
`profile_available=false`. They do not expose the account state or explain its
private reason.

Service detail, search, and service-category reads receive the new restriction
through their existing `visible_to_viewer` calls. Their definitions are not
rewritten. The early profile checks also avoid returning an available-looking
identity for an unavailable owner. The two profile functions' entire content
CTE and output tails are byte-identical to their accepted inputs; these sections
are separately pinned in `source-pins.json`.

`service_publication_private.is_public`, finality, activity/expiry, contact,
media binding, writers, public projections, caller permissions, grants, and
the active-only account-state table constraint remain as before. This release
does not enable account closing/deletion, alter login/email behavior, or finish
the complete account lifecycle. Contact and writer restrictions require their
own bounded work before a closure action can be enabled.

## Catalog contract

`catalog-query.sql` reads bounded catalog metadata only. It retains the exact
previous nested account/profile/listing/horse/profile-marketplace after-state.
The former invariant `visible_to_viewer` entry is removed from that prior base
dependency array and moved byte-exactly into this release's before-target set.
The changing helper therefore cannot be both a target and an immutable base
requirement. The other prior dependencies and three prior profile-marketplace
readers retain their accepted metadata.

The new base adds the unchanged service card/detail/latest search definitions,
six selected columns, the existing service discovery index, and denied browser
table privileges. New profile-reader and dependency expectations were compiled
from accepted source in native PostgreSQL 17.6. They remain source-derived until
the future Mac runner's fresh preflight recognizes the exact live catalog.
Function bodies, definitions, signatures/overloads, owner, ACL, and execution
settings are included in the scoped contract. Catalog comments are not an
inventoried field; the release does not issue COMMENT or ACL changes.

Format: `selqiro-account-service-read-fence-20261124-v1`.

| Fingerprint | SHA-256 |
| --- | --- |
| Base | `297253cb036c1bac44327a81da39419ed9d67218f1033e44953e84d8471f7a16` |
| Before targets | `08d255637c3399f08f63bd6901e1c079273e7132aa05648bbf412a23cdddbda9` |
| After targets | `5cf6eba005e6209140bc3ce550616abaebe2eeddc75074d4a9e5ab97ab09d46b` |

The expected JSON is compactly serialized once per catalog query, preserving
the previous transport limit. `preflight.sql` is 107,041 bytes, `apply.sql`
333,371 bytes, and `verify.sql` 214,065 bytes; each is below 524,288 bytes.

## Apply and receipt boundary

Preflight uses a read-only transaction. Apply takes the module's transaction
advisory lock, recognizes the exact before-state, replaces the three targets,
recognizes the exact after-state, requests a PostgREST schema reload, and commits.
The `apply` receipt is queried from the catalog **after COMMIT**, in a new
read-only transaction. A separate `verify.sql` recognizes the same after-state
and returns its own receipt. A second apply refuses the already-applied state.
An uncertain apply response is not permission to repeat the schema write.

All three installer statements return only one bounded `{result: ...}` row.
`selqiro_service_sql_contract.py` retains the strict envelope, field, type,
fingerprint, stage, duplicate-key, and size checks. `account_rows_read` and
`account_rows_exported` are both false for installer receipts. The application
read helpers of course inspect the requested owner's account eligibility; that
is separate from the installer's metadata-only receipt query.

The native proof reparses all three actual before/apply/verify envelopes through
that exact Python parser. The hash envelope is not a server digital signature
or a raw catalog export. Future runner evidence must preserve its real command
and output provenance separately.

## Targeted native proof

`tests/proof/runtime-report.json` records **51 passed, 0 failed** cases on
PostgreSQL 17.6 / Node v24.22.3. The suite exercises real retained account,
actor, blocking, service activity/publication/finality, card and category
helpers. It does not run the previous broad suites.

Coverage includes exact old/new full JSON for private and business detail,
search, profile v1/v2 and categories; public/anonymous/authenticated/owner
permissions; absent actor; invalid inputs; missing versus ambiguous slug;
canonical business owner versus publisher; unavailable or missing owners;
bilateral blocking; discovery-only provider hiding; expiration, revision/hash,
and image-finality rejection; categories, ordering, pagination and exact decimal
projection; and read-only execution. Fifty-one is the number of named cases,
not the number of all internal assertions.

The suite also verifies one guarded apply plus independent verify, unchanged
synthetic rows, nine catalog/ACL/index/overload drift cases, second-apply refusal,
and rollback after an injected failure between target replacements. No success
receipt is returned for that injected failure. `wire-examples.json` contains
23 synthetic responses with request context for the client parser review. The
three missing-slug records have no resolved identity; their request identity is
NULL and does not claim to be a valid client identity argument.

Fixture limits are recorded in `source-pins.json`: shared publication FK identity
stubs and one synthetic `display_name` default support creation of test rows.
Writer, Storage, HTTP, browser and email integrations are not simulated. The
successful run is `tests/runtime-tests-2`; its command/log and stopped-cluster
evidence is retained. The first behavioral attempt `tests/runtime-tests` failed
while seeding a synthetic image because epoch conversion rounded; using floor
fixed that fixture. Its original logs/proof and original input copy are kept.
The prepared SQL and parser did not change for that fixture correction.

## Performance boundary

The separate completed experiment under `performance/runs/20261124T125537299238Z`
compares 84 old/new pairs (168 timed calls) across 28 scenario/size combinations,
and captures 16 separate nested-plan calls. All active JSON pairs are equal.
The final cluster has 5,008 accounts/identities and 5,500 services. Actual account
and slug plans use point indexes. The early profile-owner query uses an identity
index and scans a one-row business table; this does not prove its plan for a
large business table.

Available 200-service profiles perform 201 account checks: one early check and
200 checks through the existing visibility calls. Filtered search performs 500
checks both before and after adding 5,000 unrelated private accounts/services,
but retains a sequential scan of all 5,500 service rows. Unfiltered search over
5,500 services performs 5,500 checks, with local old/new median time
566.67/1,105.46 ms. Detail remains one account check. Missing profiles make zero;
ineligible existing profiles make one early check and no per-service calls.
Existing finality/counting work before pagination is unchanged. This measured
cost is documented, not presented as a production scalability guarantee.

The performance README and raw pinned measurements contain the full method and
limitations. All new native clusters were stopped. No Mac, cloud service,
production account, or user content was changed during this preparation.

A separately reviewed future optimization should collect candidate owners in
the search/profile query and evaluate the same canonical helper once per unique
owner, while preserving finality, filtering, snapshot semantics and exact
counts. It belongs in its own bounded query change before a large-scale
readiness claim. This release retains per-candidate checks and does not add a
cross-request cache or duplicate the account/blocking rules.
