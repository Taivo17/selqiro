# Service shop categories and contextual public category choices

Prepared on 2026-11-11 against the source-verified installed `d5e77e9` boundary.
This directory is a new additive repair. It does not edit an issued repair,
change an old RPC, infer a live schema from source files, or establish a Mac,
Supabase or Vercel deployment receipt.

## Scope

The same identity-owned two-level `public.store_categories` tree can be assigned
to canonical UUID services. `public.service_store_categories` stores those
associations; no ordinary listing or shadow service is created. Assignment is a
separate owner operation, so it does not save the service form, advance its edit
revision, alter activity/publication status, alter a pending publication, or
change the gallery.

Public profile category choices are contextual. The services section shows only
categories with services visible to the current viewer. The marketplace section
shows only categories with visible ordinary listings or canonical horse offers.
Both include required ancestors. Categories without visible content, paused or
draft content, and content blocked from the viewer do not appear. Existing
expiry checks apply to ordinary listings and horse offers; services retain their
current publication/activity checks and gain no expiry gate here. My Area
continues using the full owned tree, including empty categories.

There is no new service-count quota. The new service profile reader filters in
SQL before counting and paginating, so an eligible older service beyond the
previous reader's first eighty rows remains discoverable. Future service expiry,
viewer-specific temporary hiding and jobs are outside this repair.

## Modules and compatibility

| Module | New objects and behavior |
| --- | --- |
| `01_assignments.sql` | Link table, reverse index, owner load/save RPCs |
| `02_profile_services.sql` | Version 2 public services page with category scope, one total count and pagination |
| `03_public_categories.sql` | Version 2 public category pages for services or marketplace |

Existing `get_public_profile_services_v1`, ordinary and horse category writers,
`get_public_profile_marketplace_v1` and `v2`, category management, service form,
photo, publication and status functions retain their exact declarations and
permissions. New category readers use the existing canonical visibility rules.
The marketplace category reader reproduces the currently pinned marketplace
ordinary/horse predicates. A future visibility change must update both together.

### Owner RPCs

- `get_my_service_store_categories_v1(uuid,uuid)` takes `p_service_id` and
  `p_expected_identity_id`. Its JSON receipt is
  `{service_id,identity_id,category_ids}`.
- `set_my_service_store_categories_v1(uuid,uuid,uuid[])` adds `p_category_ids`.
  Its receipt has the same keys plus `assigned_count`.

The stored active identity, active private owner or business membership, parent
service identity and every selected category are checked on the server. The
common lock order is profile, identity, membership, service and categories in
UUID order. A non-read-committed transaction is rejected. A switched identity,
inactive membership, missing service, foreign category or stale deleted category
fails before any link removal. The writer deduplicates and sorts the explicit
set; an empty array clears links. An identical replay retains existing rows.

Only `authenticated` may execute owner RPCs. The new table has RLS enabled and
no direct table or column privileges for PUBLIC, anon, authenticated or
service_role. Foreign keys cascade from a deleted category/service to link rows;
they never delete the parent service, category or images. The existing category
manager still requires children to be removed before their parent. Its existing
`removed_listing_links` field continues to describe ordinary listing links only;
this repair does not redefine that old response as a total across domains.

### Public RPCs

`get_public_profile_services_v2(text,uuid,integer,integer)` parameters:
`p_seller_slug`, optional `p_store_category_id`, `p_result_limit` (1–60, default
24), `p_result_offset` (0–100000, default 0).

The version 2 JSON envelope contains `content_scope: public_profile_services`,
`seller_slug`, resolved `identity_id`, `profile_available`, requested
`store_category_id`, `sort: newest`, `read_at`, `items`, decimal-string
`total_count`, `result_limit`, `result_offset`, `has_more`, `next_offset` and
`window_limit_reached`. Items retain the existing version 1 service card fields,
full description and ordered gallery projection. Services are ordered by
`created_at DESC, id ASC`. The complete eligible set supplies filtering, one
count and the page. Parent selection includes descendants; multiple matching
links never duplicate a service.

`get_public_profile_store_categories_v2(text,text,integer,integer)` parameters:
`p_seller_slug`, `p_content_scope` (`services` or `marketplace`),
`p_result_limit` (1–100, default 100), `p_result_offset` (0–100000, default 0).

Its version 2 envelope contains `content_scope: public_profile_store_categories`,
`filter_scope`, `seller_slug`, resolved `identity_id`, `profile_available`,
`items` and the same count/paging fields. Each category item exposes exactly
`id`, `identity_id`, `name`, `parent_id` and `sort_order`. Eligibility is evaluated
for the entire section before category choice or category pagination, including
ancestors. Ordering is `sort_order`, `created_at`, `id`, ascending with nulls last.

Both readers resolve one unambiguous active profile by slug. Missing, ambiguous
or inactive profiles return no identity, no items and total zero. An unknown or
foreign selected category returns zero service results without widening scope.
Existing two-direction viewer blocking applies to rows, counts and category
choices. Anonymous and authenticated users may execute the two public readers;
service_role is not granted their execution.

## Guarded installation

`preflight.sql` and `verify.sql` are read-only. Their single JSON result has kind
`service-store-categories-v1`, schema version 1 and state `absent`, `applied` or
`unknown`. Only the precisely fingerprinted absent/applied states are recognized.
The absence check includes the new table, primary/reverse index names and all
same-named function overloads; a conflicting live object cannot be adopted.

`catalog-pins.json` records the exact before/after catalog fingerprints and these
12 guards:

- `installer`, `actor_roles`, `hosted_context_ready`, `retained_release`;
- `category_functions`, `category_structure`, `category_delete_effects`;
- `service_delete_effects`, `retained_category_authority`,
  `retained_link_authority`, `retained_horse_categories`;
- `api_roles_and_entrypoints`.

The pinned retained release covers the existing service publication and viewer
checks. Additional invariants cover existing category functions/structure,
category management and ordinary link authority, the complete horse category
capability, relevant incoming foreign keys, rewrite rules, trigger definitions,
function owners/security/settings/ACLs, table/column grants and effective API
privileges. Only this repair's deliberately added category/service incoming FK
is excluded from the retained parent-effect comparison; its complete declaration
and all effects of the new relation are pinned in the new capability.

`apply.sql` reacquires the real catalog, takes one repair advisory lock and
parent relation locks, and performs the additive install only from recognized
absence. The entire operation is one transaction. Unexpected drift or a failed
post-install check rolls it back. A recognized exact replay performs no new DDL
or data operation. Afterward, a separate `verify.sql` must reproduce the applied
receipt and unchanged retained invariants/context. `NOTIFY pgrst` requests a
schema refresh; it is not a deployment or browser receipt.

The Mac updater must use a fresh preflight immediately before the one mutation
attempt and a separate verify afterward. If the mutation acknowledgement is
lost, it reconciles through reads and stops on uncertain state. It must not
blindly repeat a mutation, weaken a fingerprint or replace conflicting objects.
No production row, account, image, message or journal cleanup is authorized here.

## Local verification

`tests/fixture.mjs` reconstructs exact retained declarations in a disposable
PGlite PostgreSQL/WASM instance. It does not execute earlier test suites. Synthetic
provider metadata is a fixture only. `source-pins.json` identifies the declaration
inputs, while result files identify the exact new SQL/test inputs.

Run with the existing isolated test runtime, for example by setting
`SELQIRO_PGLITE_MODULE` to the absolute PGlite `dist/index.js` path, followed by:

```sh
node supabase/repairs/20261111_service_store_categories/tests/build-guards.mjs
node supabase/repairs/20261111_service_store_categories/tests/runtime.mjs
node supabase/repairs/20261111_service_store_categories/tests/installation.mjs
```

Guard generation proves absent/apply/replay and unchanged retained invariants.
Runtime checks cover private/business authorization, active-identity changes,
atomic full-set saves, blocked direct writes, pending content preservation,
canonical media/receipt preservation, 88-service pagination, oldest-service
filtering beyond eighty rows, 105 category choices across pages, contextual
ancestor trees, both-direction blocks, ordinary expiry and horse/service
publication eligibility. Installer checks inject catalog drift, object-name
collisions, grants/policies/triggers/rules, partial failure and post-install
mismatch, and verify rollback and exact replay.

Results are local prepared-source evidence. WASM serializes commands; tests do
not prove simultaneous-session races, live PostgREST schema refresh, production
Storage operations, actual Mac execution, Git push, Vercel Ready or the user's
browser journey. Those boundaries remain separate in the current state record.
