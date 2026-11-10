# Owner shop category management

This repair adds one authenticated RPC to the existing Selqiro database. It
does not replace any table, policy, legacy writer, listing, photo or service.
It is prepared source until the guarded Mac updater records actual application
and a separate verification receipt. Do not execute the SQL manually.

## RPC contract

`public.manage_my_store_category_v1(uuid,uuid,text,uuid,uuid,text,text)` accepts:

1. Expected authenticated user ID.
2. Expected active identity ID.
3. Operation: `create_root`, `create_child`, `rename` or `delete`.
4. Category UUID. For creation the client retains the same UUID across review.
5. Parent UUID or null. For rename/delete this is the expected original parent.
6. Desired name. Delete sends the exact original name.
7. Expected original name for rename/delete; null for creation.

The JSONB receipt has exactly ten fields: `schema_version`, `operation`,
`actor_user_id`, `identity_id`, `category_id`, `name`, `sort_order`, `parent_id`,
`changed` and `removed_listing_links`.

## Authorization and concurrent changes

The function accepts only READ COMMITTED transactions. It locks the current
profile, identity, and applicable active business membership before checking
the category. The authenticated user must equal the expected user and the
profile must still select the expected identity. Private ownership or active
business membership must satisfy the existing identity-access rule.

The identity lock serializes this RPC's per-identity creation ordering.
Parent/category row locks and existing foreign keys protect childless deletion
against ordinary concurrent inserts. Rename/delete compare the exact original
name and parent; stale forms do not overwrite newer values. The function does
not change a category's identity, creator, parent, creation time or sort order
when renaming it. Existing old writers remain separately guarded dependencies.

Creation supports roots and direct children of roots. Desired names normalize
whitespace, trim the ends and contain 1–60 Unicode codepoints. Existing unique
indexes enforce case-insensitive sibling-name uniqueness. An identical replay
of the same UUID, identity, creator, parent and name returns `changed:false`.
A different actor cannot claim another creator's UUID as their replay.

Deletion requires an existing matching category without any child. It removes
only that category's listing links and then its category row. Listings, image
rows, descriptions and media objects remain intact. A missing category is a
stale result, not proof that an earlier uncertain delete succeeded.

## Error contract

| SQLSTATE | Exact message | Meaning |
| --- | --- | --- |
| 42501 | store_category_context_changed | Authentication/expected user/active identity changed |
| 42501 | store_category_forbidden | No current identity access or category/parent belongs elsewhere |
| 22023 | store_category_invalid_input | Invalid command, name, hierarchy or isolation mode |
| 23505 | store_category_duplicate | Existing key or sibling name conflicts |
| 40001 | store_category_stale | Missing or changed category/parent, or changed create intent |
| 23503 | store_category_has_children | Category must be emptied before deletion |

## Guarded installation

The generated preflight and verify reports contain twelve fields. Seven guards
cover installer, actor roles, hosted context, the complete retained service and
profile release, legacy category/identity functions, exact category and link
table structure/authority, and category-delete effects. Delete effects include
incoming foreign keys, rewrite rules and trigger function definitions for
both writable tables.

Installation recognizes only an absent capability or the exact installed
function, including owner, body, signature, search path and ACL. Unknown
overloads or drift stop before changes. Creation is transactional; a failure
rolls back the new function. Exact install replay does not replace it. The
installer compares actual before/after catalog invariants and hosted context;
example invariant hashes are not live pins because hosted actor rows include
instance-specific data. The report's dependency and capability fingerprints
are source-derived pins.

## Verification

The final local proof uses disposable PostgreSQL/WASM (PGlite), existing
retained declarations and synthetic users, categories, listings and images:

- Guard generation, first installation, exact replay and independent verify
  passed without changing the retained catalog invariants.
- 17 runtime cases passed: authorization, active context, stable create replay,
  creator binding, names, two-level creation, CAS, childless delete, retained
  listings/images, business membership and rejected stronger snapshots.
- 18 installation cases passed: exact baseline, function/ACL/structure/policy
  drift, incoming FKs to either table, rules on either table, trigger effects,
  unexpected overloads, rollback, row preservation and exact replay.

`guard-generation-result.json`, `runtime-result.json` and
`installation-result.json` bind the observed result to source hashes. Tests
do not contact production, Storage, a Mac or real accounts. They do not prove
multi-session lock schedules, provider Auth/PostgREST integration, deployment
or the final browser journey. Those evidence limits remain explicit.

The existing direct `listing_store_categories` RLS write path remains a separate
launch gate. This RPC does not use or widen that client write path.
