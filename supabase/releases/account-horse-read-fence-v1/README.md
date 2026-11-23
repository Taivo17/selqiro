# Horse account availability fence v1

Prepared over accepted commit `87bff3f51a01a6953c37096ed32a1017135fd304`, tree
`a6f7b7522cd0e88db25caf88b8dd4e9a48c64d77`. This is a new, separate SQL release.
Previous releases remain unchanged.

## Two existing public readers

| File | Changed scope |
| --- | --- |
| `search-marketplace.sql` | Only the horses branch of `search_public_marketplace_v1` |
| `horse-detail.sql` | Only account eligibility in `get_public_horse_offer_v1(uuid)` |

Each old horse identity join becomes a primary-key-correlated LATERAL lookup
with `OFFSET 0`. The lookup retains active identity eligibility, accepts only
private/business identities and calls the accepted private
`account_lifecycle_private.account_is_available(uuid)` helper unchanged.
A private identity resolves to `identities.user_id`; a business resolves to
`business_accounts.owner_user_id`. Unknown identity type, missing owner/Auth
row or missing authoritative account state fails closed. No fallback to the
publisher or legacy business identity user is added. Account confirmation
email settings are not part of this read predicate.

The account predicate applies before count and page construction and before
public detail can return a row. Search lookup is tied to `h.identity_id`, which
prevents evaluation over unrelated identity rows. PostgreSQL may memoize
repeated identity keys; that is an optimizer behavior to measure, not an API
guarantee. Detail remains a single horse-ID lookup. The combined reader's
ordinary branch and shared count/page/result tail are byte-identical to the
accepted source. Their preservation hashes are in `source-pins.json`.

Existing bilateral blocks still use `horse_offers.created_by_user_id`, the
publisher. A business-owner account check does not change that established
block relationship. Temporary hidden-provider preferences remain specific
to discovery; opening an otherwise eligible detail link is still possible.

The existing `is_public`, current publication event, content-snapshot/hash,
gallery membership, WEB readiness and pending cleanup predicates are not
changed. Five offer types, EE/EUR rules, public fields, price strings, image
order, approximate location, NULL expiry fallback, filters and paging keep
their existing contracts. Unavailable detail still returns successful raw
JSON `null`. It does not introduce a new wrapper or an owner exception.

## Exact installation contract

`catalog-query.sql` reads catalog metadata only. It preserves the accepted
account/profile/listing base, including the private helper and three ordinary
readers. It separately observes the two target names, six retained horse
dependencies, six required relations, 62 columns and 11 existing indexes.
It records exact function bodies/definitions, signatures, owners, execution
settings and ACLs, plus relevant table/column/key facts. New overloads or a
missing protected object result in an unknown contract.

The previous account/profile/listing metadata is backed by the accepted
release receipt. Newly scoped horse properties are reconstructed from accepted
source and compiled on synthetic PostgreSQL. They are **not a fresh production
observation**. The Mac runner must match the exact fresh `before` contract
before writing. An unexpected schema, body, permission, owner or index stops
installation; this release does not reset existing grants to make them match.

`apply.sql` takes its own transaction advisory lock, rechecks the exact before
contract, replaces only the two readers, checks the after contract, requests
PostgREST schema-cache reload and commits. Its success receipt is emitted from
a fresh read after COMMIT. `verify.sql` is a separate read-only after-state
check. Reapplying from the after-state is refused. The runner's durable intent
permits one apply and reconciles an ambiguous result by reading, not resending.

No installation stage reads or exports application, account, Auth or Storage
rows. Defining the functions does not call their row-reading bodies. The only
schema mutations are the two function replacements; no table rows, indexes,
constraints, helper, identity system or account state are changed. Active-only
account-state constraints stay in force. There is no close, restore or delete
action in this release.

Receipts use the existing strict ten-field shape with a new horse-specific
format and exact base/before/after fingerprints. Limits remain 512 KiB per SQL
file, 8192 bytes per response, 45 seconds for read stages and 60 for apply.

## Evidence and limits

The new isolated native PostgreSQL 17.6 run passed 56 targeted cases. It uses
real retained reader, availability, finality, content-snapshot and public-field
functions and the source horse/image/event/gallery/WEB schemas. Synthetic
publication facts satisfy the real read checks, including a ten-image offer
and wanted offer with zero images. Referenced policy and upload-attempt tables
are minimal FK fixtures; full writer, policy acceptance, Storage and HTTP flows
are not simulated. No prior broad suite or real service was invoked.

Cases cover all five types, person/business ownership, unavailable/missing
account state, bans/deletions, legacy nullable creation dates, author blocks,
viewer hiding, mixed ordinary/horse counts and page boundaries, successful raw
null, public privacy, expiry, invalid publication/gallery facts, exact ACLs,
catalog drift and one guarded installation. Before/after row snapshots remain
equal across the apply in this synthetic fixture. The owner cluster is stopped.

The separate old/new performance proof must be accepted before package release.
The existing horse query builds an inline FTS document; presence of the stored
`search_vector` GIN index does not establish its use. Publication finality and
full matching-card work occur before paging in the existing reader. Exact
counts still inspect matching candidates beyond the returned page. Local
plans are evidence for the measured dataset only, not production-load capacity.

Other independently callable profile feeds, services/jobs, legacy direct-table
paths, writes, contact/sending, historical messages, image serving/adoption and
account closure/deletion remain separate work. Cached responses and already
public image URLs are not revoked by these two reader definitions.

Preparation scripts, native harness and fixture source files are included in
the preparation proof, not in the Mac installation flow. Their paths refer to
the preparation workspace and its pinned runtime. Do not run them as a portal
updater or install dependencies on the user's Mac to replay this local proof.
