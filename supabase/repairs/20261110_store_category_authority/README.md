# Listing store-category write authority

Prepared 2026-11-10 over accepted management commit
`0b2594ad27e8320ab7e71206c8c5cb20edcb5d8a`. Actual Mac application, database
verification, commit/push and deployment are separate evidence. The generated
SQL is consumed by the guarded updater; it is not a manual installation guide.

## Audited problem and narrow change

The retained `listing_store_categories` policy named
`users can manage own listing store categories` is `FOR ALL` to authenticated.
Its `USING` and `WITH CHECK` expressions test only `listings.user_id=auth.uid()`.
Neither expression checks the category's identity. The table's retained grants
also give `anon` and `authenticated` `ALL` privileges. Table-level operations
such as `TRUNCATE` do not gain row-level protection from an RLS predicate.

The accepted source has two legacy client mutation sites: `/sell` inserts one
link after creating a listing; `/my-page` deletes the old links and then inserts
one link, with the old delete error ignored. The companion client change routes
these sites through the existing atomic assignment API. The integrated V2
editor already uses that API and requires no database contract change.

`01_authority.sql` makes only three authority changes in one transaction:

1. Revoke all direct join-table privileges from `PUBLIC`, `anon` and
   `authenticated`, including non-row privileges such as TRUNCATE and MAINTAIN.
2. Restore SELECT for `anon` and `authenticated`.
3. Remove the obsolete broad write policy while retaining the public read policy.

No listing, image, category or link row is updated, deleted, migrated or backfilled.
Existing anomalous links, if any, are left unchanged. A later deliberate valid
assignment can atomically replace a listing's complete set. The table structure,
foreign keys, indexes, owner, RLS flag, triggers, function bodies and service-role
privileges remain unchanged. Existing default privileges are not modified.

## One authenticated assignment contract

The unchanged `set_my_listing_store_categories_v2(text,uuid[])` is the writer.
It is postgres-owned and SECURITY DEFINER with its retained fixed search path
and explicit execute grants. It requires authentication, an accessible stored
active identity and a locked listing whose non-null `identity_id` matches it.
Every selected category must belong to that same identity. Private-owner and
active-business-member rules remain those of `current_user_has_identity_access`.

The assignment normalizes the explicit set and replaces links atomically.
Any missing/foreign category or other error leaves the previous links intact.
An empty set deliberately clears assignments without deleting the listing.
A user-ID-only listing with null identity is rejected; this change does not
invent a legacy fallback or silently attach the listing to the current identity.

The existing management and legacy category-delete RPCs retain their authorized
link removal behavior. Foreign-key cascades also remain unchanged. Privileged
server/service-role authority is retained; this patch closes the ordinary API
roles' direct join-table mutation path. It does not establish a global immutable
relationship against every possible later privileged listing/category identity
change or change the authority of other tables.

## Exact guarded installation

The 12-field report uses `kind: store-category-authority-v1` and the existing
`absent`, `applied`, `unknown` state contract. Nine guard groups cover:

- installer and retained privileged actor roles;
- the existing hosted project/instance context and retained release;
- exact category, identity, assignment, management and profile reader functions;
- both category/link table structures and category deletion effects;
- unchanged `store_categories` authority;
- API-role properties, membership channels, column grants and assignment entrypoints.

The target capability fingerprints the entire `listing_store_categories`
ACL/policy object plus effective table and column privileges. For both API roles,
post-state requires SELECT and denies INSERT, UPDATE, DELETE, TRUNCATE,
REFERENCES, TRIGGER and PostgreSQL 17 MAINTAIN, including grant options.
Effective column checks additionally deny INSERT, UPDATE and REFERENCES.

Unexpected role membership is rejected, including a non-inherited membership
that permits SET ROLE. API roles cannot be superuser, bypass RLS, create roles
or databases, replicate, own the target table or create objects in public.
Unexpected column grants and PUBLIC grants cannot be hidden by table revocation.
The normal authenticator-to-API-role membership direction is not confused with
an API role gaining membership in a more privileged role.

The previous service catalog remains retained. Its separately updated readers,
profile/category dependencies and installed management RPC are fingerprinted
explicitly. Only the intentionally changed join-table authority is excluded
from the unchanged-authority invariant; it is fully checked as the target
capability instead. No relevant table structure or function is omitted from
both comparisons. Observed instance-dependent invariants are compared before
and after application, not mistaken for fixed production hashes.

The apply transaction locks the join table, takes the release advisory lock,
and rechecks the exact absent/applied state before changes. Partial authority
states or drift stop. Exact applied replay verifies without issuing the three
authority changes again. Any failure rolls back the transaction. The updater
retains its separate post-application verification and one-attempt journal;
an uncertain acknowledgement is not permission to replay SQL.

## Focused local verification

New tests use disposable PGlite PostgreSQL/WASM, actual retained declarations
and synthetic users/rows. No previous test suite, live provider, Storage object,
real account or production content is contacted.

- Guard generation: first install, exact replay, separate verification,
  stable retained invariants and effective SELECT-only post-state passed.
- Runtime: **18/18** cases passed, including denied direct mutations, private
  assignment, foreign/missing categories, all-or-nothing replacement, null
  identity rejection, active/inactive business membership, anonymous reads,
  management deletion and retained listing/image content.
- Installation: **31/31** cases passed, covering exact baseline, function/ACL/
  policy/structure drift, PUBLIC/column/inherited/SET-only grants, bypass role,
  unexpected dependencies, atomic rollback, row preservation, replay and verify.

The first runtime attempt is preserved in `tests/review/runtime-attempt-1.json`.
Its initial weak-policy reproduction was denied because the current retained
fixture closes ordinary direct listing reads. The corrected isolated case
temporarily uses the exact historical baseline public-listing SELECT policy to
exercise the missing category-identity check, then drops that policy before
running the real repair. This is a conditional source-policy reproduction,
not proof of a currently reachable production exploit. The actual production
listing visibility was not queried. Post-repair tests retain the current
fixture's listing authority.

Evidence is in `guard-generation-result.json`, `runtime-result.json` and
`installation-result.json`; each binds its inputs to SHA-256 values. Tests use
one PostgreSQL/WASM connection, not concurrent provider sessions. Real
Auth/PostgREST behavior, Mac installation and hosted use remain separate.

PostgreSQL references:

- [Row Security Policies](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)
- [REVOKE](https://www.postgresql.org/docs/17/sql-revoke.html)

The old production-applied SQL and previously issued packages remain immutable.
