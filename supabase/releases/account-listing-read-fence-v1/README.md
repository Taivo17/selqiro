# Ordinary-listing account availability fence v1

Prepared over accepted commit `8dc0b3b11777b010c8486b45a3f98f0191d97d80`.
This directory is a new SQL release. It does not replay or edit older releases.

## One bounded read module

The four replacement declarations add account availability before public
ordinary-listing count/page selection or the first detail-row read:

| File | Existing reader |
| --- | --- |
| `search-ordinary-v1.sql` | `search_public_listings_v1` |
| `search-ordinary-v2.sql` | `search_public_listings_v2` |
| `search-marketplace.sql` | `search_public_marketplace_v1`, ordinary branch only |
| `listing-detail.sql` | `get_public_listing_detail_v1` |

Each candidate retains the active identity and existing public listing rules.
In the three search readers, the existing identity alias comes from an
identity-primary-key-correlated LATERAL subquery with `OFFSET 0`. This preserves
the listing filters while preventing the account helper from moving into an
unrelated all-identity scan. Repeated candidate identities may use PostgreSQL
Memoize; that optimizer choice is measured separately, not guaranteed by the
SQL API. Detail retains its single listing-ID lookup and the simple owner join.
A private identity resolves to `identities.user_id`; a business resolves to
`business_accounts.owner_user_id` through the existing business primary key.
Only private/business types qualify. Missing owner, unknown type, unavailable
Auth row or missing authoritative account state does not qualify. The accepted
private `account_is_available(uuid)` helper is called unchanged; no account
state cache, repair, new identity/member workflow or browser filtering is added.

The existing bilateral block still refers to `listings.user_id`, the author.
It is not silently converted into a business-owner block. Temporary provider
hiding remains a viewer's discovery preference and does not hide a deliberately
opened detail link. Ordinary publication status, NULL expiry semantics, filters,
FTS allowlist, newest order/tiebreaks, numeric text totals, page/window limits,
price, gallery and public privacy fields retain their previous contracts.
The combined reader's horse branch and shared result construction are exact
old bytes. Detail keeps the same successful `item: null` response, including
for a caller who owns the unavailable account.

## Exact installation contract

`catalog-query.sql` reads bounded catalog metadata only. It embeds the entire
previously accepted profile/account base and after-state, protecting the
unchanged private helper, foundation, canonical public profile/media reader
and relevant ownership keys. It additionally observes exactly the four target
reader names (including overloads), the unchanged actor/FTS dependencies,
selected listing/hidden-provider/block relation and column facts, and nine
existing lookup/FTS index definitions and readiness flags.

The accepted profile/account metadata and existing actor definition are backed
by prior actual receipts. The remaining reader ACLs and new scoped relation,
column/index and FTS facts are reconstructed from accepted source and compiled
in a synthetic PostgreSQL fixture. They are **not a new production observation**.
The Mac runner must obtain an exact fresh `before` match before any SQL write;
an unexpected body, owner, signature, configuration, permission or protected
index stops the release. Existing function grants are preserved, not reset.

`apply.sql` uses one bounded transaction with a release-specific advisory lock,
a fresh exact before guard, only the four `CREATE OR REPLACE FUNCTION`
statements and an exact after guard. `NOTIFY pgrst` requests schema-cache reload.
The success receipt comes from a new read after COMMIT. `verify.sql` separately
checks the exact after contract. Reapplying from the after-state is refused.
The runner persists one apply intent, limits apply to one attempt and reconciles
an uncertain outcome by reading; it never resends an ambiguous write.

No install stage reads or exports application/Auth/Storage rows. Defining the
reader bodies does not invoke them. No table rows, constraints, indexes, helper
rights, account state, existing contents or Storage objects are changed. The
foundation continues to permit only active account-state rows; this module
introduces no close/restore/delete action.

The receipt parser accepts only the pinned ten-field JSON envelope. It checks
exact base/before/after fingerprints, booleans, stage, no-account-row-read/export
claims and the actual after-state flag. Limits remain 512 KiB per SQL snapshot,
8192 bytes per CLI response, 45 seconds for read stages and 60 seconds for apply.

## Evidence and limits

New tests use an isolated native PostgreSQL 17.6 instance, synthetic accounts
and content, exact retained function declarations and a minimal schema with
relevant existing indexes. No prior broad suite, installer, real Supabase,
Mac, real Storage or browser session is invoked. Targeted cases cover the
new owner availability rule, unchanged author blocking/hiding, total/page
boundaries, privacy/gallery, mixed horse order, public/null detail, preserved
ACL/configuration, exact catalog drift and a one-time guarded installation.
The helper/profile base remains unchanged throughout.

Comparative old/new query-plan evidence is produced separately over synthetic
representative data. It must be assessed before release. A usable primary key
or GIN index alone does not establish production capacity. Exact count still
processes matching candidates outside the returned page, and the existing
SECURITY DEFINER helper can add per-candidate calls and two account-key reads.
No millions-of-users or production load claim follows from the local fixture.

Horse availability, services, jobs, showcases, direct public-profile offer
RPCs, legacy feed/nearby/direct-table paths, writes, contact/sending, historical
message cards and late image adoption remain separate work. Existing cached
responses, rendered pages and public image URLs are not revoked. No full
account closure can be enabled on the strength of this read module alone.
