<!-- SELQIRO_HORSE_STORE_CATEGORIES_ACCEPTED_20261110 -->
Installation and user acceptance recorded on 2026-11-10: commit
`d5e77e963f80cb4dab33e6e6667c44d4062c4bbc`, database verified, build passed,
push verified. The user accepted category saving, finding the horse on their
profile and opening it through the added category. Exact Vercel Ready/deployment
identity remains unreported. See `../continuity/HORSE_STORE_CATEGORIES_ACCEPTED_20261110.md`.
The original design and preparation evidence below is preserved unchanged.

# Horse offer shop category assignment v1

Prepared source, 2026-11-10. This extends the accepted own-shop category flow
to canonical horse offers. Actual Mac installation, SQL verification,
commit/push, Vercel status and user acceptance are recorded independently in
`../continuity/CURRENT_STATE.json`.

## User contract

The existing owner horse editor lets the owner select their own shop categories
and save the selection independently. This operation does not save or reset
the horse's title, description, photos, factual confirmations or publication
form. It does not publish again, extend the activity deadline, change status,
or charge Energy. Unsaved category choices participate in the editor's leave
warning alongside unsaved horse content.

The explicit selected set is saved. A child selection does not create an
additional parent assignment. The public profile's parent filter includes
matching descendants; selecting the child narrows the result. An empty set
removes only associations. An otherwise public horse remains in All listings.

The category manager still offers two levels and removes a parent only after
its children are removed. Deleting a category removes its associations; horse
offers, ordinary listings, descriptions and photos remain. The accepted
manager's ordinary-listing-link receipt field retains its original meaning.

## Canonical data

`horse_offers` remains the horse-specific source of truth with its UUID key.
The new `horse_offer_store_categories` relation associates that UUID with an
existing `store_categories` UUID. No ordinary `listings` shadow row, copied
horse payload, generic polymorphic content table, or new identity system is
created. These shop categories remain separate from Selqiro's global taxonomy.

Foreign keys remove association rows when their referenced category is removed.
The category-management RPC itself can remain unchanged. The new relation does
not make a horse or category public; public visibility continues to come from
the existing horse visibility, identity and viewer-block rules.

## Authorized commands

| RPC | Arguments | Receipt |
| --- | --- | --- |
| `get_my_horse_offer_store_categories_v1` | `p_offer_id uuid`, `p_expected_identity_id uuid` | `offer_id`, `identity_id`, `category_ids` |
| `set_my_horse_offer_store_categories_v1` | Same, plus `p_category_ids uuid[]` | Same, plus `assigned_count` |

The authenticated actor comes from the verified request token. Server checks
require that actor's stored active identity, the expected identity, current
private-owner or active-business-member access, and the horse's identity to
agree. Client ownership checks supplement these server checks. A missing or
foreign category rejects the entire replacement. Inputs are normalized into a
unique deterministic set; an empty set is intentional removal of links.

The setter locks the relevant owner context, horse and category rows using an
order compatible with the existing category manager. The relation exposes no
browser direct-write path. Fixed search paths, explicit function owners and
ACLs are part of the deployment contract. No permission is inferred from a
legacy user-ID fallback or a client-selected identity.

This scoped command does not claim to establish a universal identity-transfer
invariant for later privileged changes to horse/category ownership. Such a
future transfer needs its own explicit policy.

## Independent client state

The horse entity layer validates a UUID-based key and the exact returned
offer, identity, selected set and assigned count. It does not pass a horse UUID
to the ordinary listing bigint-key contract.

Each operation captures the authenticated user, active identity and access
token. Reads and writes use that same captured token and recheck the scope.
All of the identity's categories are read through bounded pages with a total
count; the transport page size is not a participation quota.

A separate hook owns category loading, selection, dirty state, saving, reset
and readback. A synchronous lock prevents duplicate submission. Cancellation,
generation checks and identity/auth events prevent late responses from being
adopted by another actor. A temporary same-identity readiness check keeps the
selection mounted but read-only. A confirmed identity change retires the old
scope.

After a timeout or uncertain dispatched write, the UI retains the intended
selection and requires a deliberate readback. It does not automatically resend
the operation, declare success from a missing receipt, or refresh the horse
content revision. A readback match is described as an observed saved selection.

English is the primary/fallback interface language; Estonian is also covered.
User-provided horse text and category names are not translated.

## Versioned public profile reader

The previous `get_public_profile_marketplace_v1` and its original client parser
are retained unchanged. That parser intentionally rejects horse results when
a shop category is selected; changing the old RPC's result would therefore
break cached old clients after the first new association.

The new `get_public_profile_marketplace_v2` takes the same seller slug, category,
limit and offset arguments and returns `schema_version: 2`. Its current client
parser accepts canonical ordinary listings and horse offers while retaining
the exact seller, category, result-count and pagination checks. Services are
not merged into this product list.

Both ordinary listings and horse offers are filtered before one shared count
and page. The horse branch uses the same seller-scoped recursive category
branch as ordinary listings. `EXISTS` membership avoids duplicate horses when
both parent and child are explicitly selected. Status, activity deadline,
policy visibility, blocks and existing ordering remain authoritative.

## Rollout and verification

The repair lives separately in
`supabase/repairs/20261110_horse_store_categories/`. Previously applied repair
files and migrations are not edited. Exact relevant function, ACL, table and
dependency checks protect application to the known installed base. SQL adds
the new relation and RPCs before the new client uses them. The old reader
continues to serve old clients during this transition.

The controlled updater verifies the actual Mac branch, HEAD, worktree/index,
source bytes and approved remote before writes. It preserves user edits and
journals and distinguishes a database result from source/build/push and the
later deployment. The new report is uniquely named in Downloads and the exact
sendable file is shown and selected in Finder when available.

Targeted SQL tests cover authorized and rejected assignments, atomic invalid
sets, safe category removal, profile hierarchy/count/pagination, existing
visibility and unchanged horse lifecycle data. Client and browser tests cover
the real new modules, independent saving, uncertainty and actor changes.
Local fixtures are not live provider or actual user-journey proof. Exact
results and remaining boundaries belong in the dated continuity record.

Service shop categories and general terminal photo cleanup are separate work.
