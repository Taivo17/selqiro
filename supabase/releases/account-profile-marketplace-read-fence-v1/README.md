# Profile marketplace account availability fence v1

Prepared over accepted `ac5521a7e944ebfb3710ea97b9913cc91b9130ee`, tree
`3466f08a7134bd6fb8b334b7520924f85cfad394`. Previous releases stay unchanged.

## Three existing readers

| File | Existing function |
| --- | --- |
| `profile-marketplace-v1.sql` | `get_public_profile_marketplace_v1(text,uuid,integer,integer)` |
| `profile-marketplace-v2.sql` | `get_public_profile_marketplace_v2(text,uuid,integer,integer)` |
| `profile-store-categories-v2.sql` | `get_public_profile_store_categories_v2(text,text,integer,integer)` |

Each function retains its input checks and unique active identity lookup by
profile slug. Two matching active identities still mean unavailable, even if
only one has an eligible account. The new check follows that resolution and
runs once per resolved profile, before content/category CTEs. A private
identity resolves to `identities.user_id`; a business identity resolves to
`business_accounts.owner_user_id`. Unknown type, missing business/owner/Auth
row or missing authoritative account state fails closed. The creator, legacy
business identity user and membership are not fallback owners.

The existing private `account_lifecycle_private.account_is_available(uuid)`
helper stays byte-identical. No confirmation-email requirement, new account
state, shared cache, browser per-card lookup, row lock or repair-on-read is
introduced. Missing/ambiguous profiles skip the account check. Its measured
call count and query plans are separate performance proof, not an assumption
about PostgreSQL optimization.

An unavailable account sets only internal `identity_value` to NULL. Existing
responses retain `profile_available=false`, empty `items`, `total_count="0"`,
false `has_more` and `window_limit_reached`, and null `next_offset`; the category
response also retains null `identity_id`. The requested slug, filter, limit
and offset remain. These are successful typed envelopes, not raw JSON null.

## Retained semantics

All three CTE-through-return tails and the unique active slug query are
byte-identical; exact preservation pins are in `source-pins.json`. Active
private/business fixture responses were compared as full JSON before/after.
V1 still excludes horse cards when a category is selected; v2 uses separate
canonical ordinary/horse category memberships. Recursive descendants and
contextual ancestors remain identity-scoped. Category options cover the full
visible section, independently of the displayed content page.

Ordinary listings keep strict future expiry: NULL expiry remains excluded.
Horse publication, event/content hash, gallery and WEB finality checks remain.
Ordinary/horse bilateral blocks continue to use the publisher; service
visibility continues to use its existing owner-based helper. Discovery-only
hidden-provider preferences do not hide intentional profile visits. The
shared category RPC checks both `marketplace` and `services`; service content,
finality and viewer helpers are unchanged. This does not complete standalone
service-reader account eligibility.

Ordering, server count/page boundaries, three strict client envelopes, five
horse offer types, EE/EUR prices and public field/privacy rules stay intact.
Header-specific legacy slug fallback and business-status rules are not added
to these content readers. Existing grants and function comments are not changed.

## Exact installation contract

The catalog query reads metadata only. The previously accepted account,
profile, ordinary and horse contract is retained in full. Newly scoped
properties cover three targets, six real service-read dependencies, ten
relations, 50 selected columns, 20 selected indexes and 39 primary/foreign/
unique constraints. Function signatures/defaults, bodies/definitions,
execution settings, owners and ACLs are exact. Table ownership/RLS and selected
key/index definitions are checked. This is a bounded reader contract, not a
complete table policy or application schema audit. Function comment text is not
inventoried; no COMMENT or ACL statement is part of the replacement payload.

New expectations come from accepted source compiled on isolated PostgreSQL
17.6; they are not a fresh production observation. The Mac runner must match
the exact fresh `before` contract before any schema write. Unknown definitions,
overloads, owners, permissions, selected columns/keys or indexes stop the run.
The updater does not repair or normalize unknown production state.

One protected `apply.sql` transaction rechecks before, replaces exactly three
functions, verifies after, sends the schema-cache notification and commits.
The receipt is emitted from a fresh read after COMMIT. Independent `verify.sql`
then reads the after-state. Reapplying from after is refused. A mid-transaction
failure rolls back earlier function replacements and emits no success receipt.
An uncertain result must be reconciled by reads, never by resending a mutation.

Install stages do not read/export account, application, Auth or Storage rows.
Defining the functions does not execute their row-reading bodies. There are no
row writes, new tables/indexes/constraints, helper changes, account closure,
restoration or deletion operations. Existing active-only account state remains.
SQL scripts remain below the runner's 512 KiB limit and receipts retain the
existing bounded ten-field strict format with new exact fingerprints.

## Targeted evidence and limits

The new isolated native PostgreSQL run passed 58 cases: private/business
availability, missing state/owner, bans/deletion flag, no owner bypass, unique
slug ordering, both category scopes, v1/v2 differences, foreign membership,
recursive cycles, count/page ordering, retained ordinary/horse/service
visibility, anonymous/authenticated grants, unchanged private helper access,
catalog drift, single installation, separate verification and atomic failure.
All synthetic rows remain identical across the installation. The dedicated
cluster is stopped; raw logs, exact inputs and receipts are retained.

Fixtures use the real reader, account, horse/service finality/content/image
helpers and source-defined read tables. Publication attempt/slot/object and
policy references are synthetic FK stubs; writer flows, consent, Storage,
HTTP and production traffic are not simulated. Preliminary fixture mistakes
were corrected before the successful suite and their logs remain in history.

Separate client parser/API/hook and comparative performance proof must pass
before package release. Existing profile queries still construct cards and
horse finality before pagination; categories evaluate the full visible section.
This change adds one profile account lookup, not a new large-volume search
architecture. Local plans establish only the measured synthetic cases.

Standalone services/jobs/showcase/legacy paths, direct-table permissions,
writes/contact/messages, media and final account closure/deletion remain
separate work. Existing cached responses and public image URLs are not revoked
by these three function definitions. Preparation scripts and native fixtures
are proof material, not commands to run on the user's Mac.
