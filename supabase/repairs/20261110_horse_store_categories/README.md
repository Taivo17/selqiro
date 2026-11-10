# Canonical horse offers in own shop categories

Prepared repair `20261110_horse_store_categories`, contract `horse-store-categories-v1`.
This directory is a new additive repair. The retained store-category authority
repair and all earlier migrations remain unchanged. Local proof is not evidence
that these declarations have been installed in the hosted database.

## Scope and source of truth

`public.horse_offers.id` remains the canonical UUID. The new
`public.horse_offer_store_categories` table stores only that UUID and an existing
`store_categories.id`, with a composite primary key. There is no ordinary-listing
shadow row, copied horse content, new publication path, expiry extension, image
operation, or status change.

The category FK uses `ON DELETE CASCADE` from the link table toward the category.
Deleting a category removes its links; it does not delete the referenced horse.
The horse FK similarly removes links when an independently authorized horse
deletion occurs. No horse deletion command is added or invoked by this repair.
The category-first index supports category filtering and link cleanup.

The existing `manage_my_store_category_v1` and legacy category functions are
retained byte-for-byte. The existing manager still requires removal of children
before a parent. Its `removed_listing_links` receipt remains a count of ordinary
listing links, not horse links. The horse/category association is a separate set
operation; selecting a child does not silently add the parent association.

## Owner RPC contract

| RPC | Arguments | JSON receipt |
| --- | --- | --- |
| `get_my_horse_offer_store_categories_v1` | `p_offer_id uuid`, `p_expected_identity_id uuid` | `offer_id`, `identity_id`, sorted unique `category_ids` |
| `set_my_horse_offer_store_categories_v1` | same plus `p_category_ids uuid[]` | same plus integer `assigned_count` |

Both execute only for `authenticated`. The actor comes from `auth.uid()` and the
stored profile must still select the expected identity. Private identities
require their actual owner; business identities require active membership.
Identity status, the retained access helper, and the horse identity are checked
under locks. The setter reuses the owner reader as the common authorization and
locking boundary. No caller-supplied user ID or UI ownership assertion supplies
authority.

The lock order follows the retained category manager and publication operations:
profile, identity, active business membership when applicable, horse, then
selected categories in UUID order. The identity lock also serializes different
members editing categories in the same business. Category row locks plus FKs
protect the selected set against deletion. Only READ COMMITTED is accepted;
stale repeatable-read snapshots are rejected.

The complete selected set must exist under the same identity before any link is
removed. Duplicate category IDs are normalized; an empty array clears links;
nulls, multidimensional arrays, missing categories and foreign categories are
rejected. An identical replay retains existing rows. The operation can organize
an owned draft, published, paused or expired horse without changing its
publication state or deadline.

| SQLSTATE | Message | Meaning |
| --- | --- | --- |
| `42501` | `horse_store_category_context_changed` | No authenticated actor, or the stored active identity changed |
| `42501` | `horse_store_category_forbidden` | Identity, membership, or horse ownership is unavailable |
| `22023` | `horse_store_category_invalid_input` | Invalid IDs/array shape or unsupported transaction isolation |
| `22023` | `horse_store_category_invalid_selection` | Any selected category is missing or belongs to another identity |

The table has RLS enabled with no browser policies. PUBLIC, anon, authenticated
and service_role have no table privileges, including column grants. Owner reads
and writes are restricted to the checked RPCs; public reads use the profile RPC.
Errors after a dispatched RPC do not prove that its transaction failed; the
client must reconcile an uncertain outcome by reading the same horse context.

## Versioned public profile reader

`get_public_profile_marketplace_v1` is retained exactly. Its cached clients reject
horse cards under category filters, so changing its output would be incompatible.
The new `get_public_profile_marketplace_v2` uses the same arguments and card
allowlist, with `schema_version: 2` in the response. New clients select v2.

V2 adds the canonical horse links to the existing recursive seller-owned category
scope. The same combined ordinary-listing/horse relation is counted and sorted
before pagination. Selecting a parent includes its descendants; an explicit child
narrows the branch. A horse linked to both appears once. Missing or foreign
categories produce no matches. The ordinary-listing branch is unchanged.

The retained public checks still enforce a unique active seller slug, ordinary
expiry, canonical horse publication and expiry, both block directions, the public
photo projection, and bounded description previews. Neither owner category access
nor membership can make a private/paused/expired horse publicly visible.

## Installation and catalog guards

The repair is compatible with SQL-first deployment: new table and RPCs are
additive; older clients continue using the unchanged v1 reader. The installer
must verify the exact retained release before applying the new declarations.

`preflight.sql` and `verify.sql` are read-only and return one `result` object with
`schema_version: 1`, `kind: horse-store-categories-v1`, state
`absent | applied | unknown`, boolean recognition/dependency fields, boolean
`guards`, `hosted_context`, `fingerprints` and retained `invariants`. `apply.sql`
returns the same verified final object, after its transaction commits.

The guards retain the exact service/horse/publication baseline, all existing
profile and category functions, existing category structures and authority,
the closed direct-write privileges on ordinary listing/category links, and API
role settings. Only the explicitly added new-table FK is removed from the
retained category delete-effect comparison; its full definition is pinned with
the new table. Other incoming FKs, rules and trigger functions remain guarded.

New capability pins cover all three RPC definitions and ACLs, overload/name
collisions, table schema/ownership/RLS/ACLs/column grants/policies/indexes/FKs,
new-table incoming FKs/rules/trigger functions and effective table privileges.
Any mismatch is unknown and must stop installation. There is no live schema
normalization or permissive fallback to make a preflight pass.

`apply.sql` takes a repair advisory lock, checks the catalog before changing it,
installs within one transaction, checks the exact final catalog and unchanged
retained invariants, then notifies PostgREST to reload its schema. Reapplying the
exact installed repair is a verified no-op. An unknown or partial state is not
treated as a successful prior installation.

## Targeted local evidence

The tests reconstruct retained declarations in disposable PGlite PostgreSQL/WASM.
They import fixture modules rather than running old test suites. Synthetic
provider metadata and content are explicitly local; no cloud, real accounts or
production Storage are accessed.

Run from the repository with a locally available PGlite module:

```sh
SELQIRO_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node supabase/repairs/20261110_horse_store_categories/tests/build-guards.mjs
SELQIRO_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node supabase/repairs/20261110_horse_store_categories/tests/runtime.mjs
SELQIRO_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node supabase/repairs/20261110_horse_store_categories/tests/installation.mjs
```

Evidence is in `guard-generation-result.json`, `runtime-result.json` and
`installation-result.json`, with exact source inputs and scoped checks. The
runtime exercises actual owner RPCs, ordinary assignment and category-management
RPCs, canonical published horses including a photo, active business membership,
invalid-set atomicity, empty sets, mixed category paging/count, old v1 behavior,
public visibility and safe removal. Installation checks deliberately drift
declarations/privileges/FKs, inject rollback failures, and preserve existing
content/media/publication rows across apply and replay.

These tests do not prove native multi-session lock scheduling, live hosted
declaration identity, a Mac installation, Vercel deployment, or the browser
journey. Those remain separate evidence boundaries. The first runtime attempt's
expired-row fixture was corrected to respect the retained `active_until >
published_at` constraint; production SQL was unchanged. Initial environment and
failed-attempt logs are preserved alongside the successful evidence.
