## 2026-11-10 current category checkpoint

Ordinary listing category assignment, root/child management and the later
join-table authority repair have been installed and accepted in the user
journey. The matching Vercel Ready / Production evidence is retained. Earlier
preparation-time pending or broader-policy paragraphs below are dated history.

The next prepared extension is canonical horse-offer shop categories. It adds
an independent UUID association and versioned public profile reader; it does
not alter the ordinary listing assignment contract. See
`horse-store-category-assignment-v1.md` and `../continuity/CURRENT_STATE.json`
for actual preparation, installation and acceptance boundaries. Services remain
outside that extension. All older content below is retained unchanged.

---

# Listing store-category assignment v1

## 2026-11-10 prepared direct-write closure

The separately prepared authority release converts both legacy page writers
to the existing atomic assignment RPC, removes direct browser non-SELECT
authority on the join table and retains public reads. Its receipt-independent
category review route supports an identity-owned legacy listing even when the
integrated publication receipt does not exist. This is prepared source; the
actual database closure and rollout remain pending in CURRENT_STATE.
See `store-category-link-authority-v1.md` and
`../continuity/STORE_CATEGORY_AUTHORITY_20261110.md`. Earlier text about the
broader retained policy describes the accepted pre-repair database state.

Prepared: 2026-11-10. This describes the source change; Mac installation,
commit/push, deployment and user acceptance are recorded separately in
`docs/continuity/CURRENT_STATE.json`.

## User contract

The current `/v2/my-area/listings/[id]/edit` page lets the owner select existing
store categories for an ordinary listing. Category assignment has its own save
action. It does not save, reset or change the listing's text, price or photos.
Clearing and saving an empty selection removes category links, while the listing
itself remains intact. An otherwise public listing stays in the profile's All view.

Selection stores the explicit set: selecting a child does not add its parent.
The existing public profile reader follows the selected category's recursive
branch, so the parent's results include listings assigned to its descendants.
This relationship belongs to ordinary listings; it does not assign categories
to horses or services.

## Module ownership

| Module | Responsibility |
| --- | --- |
| `src/entities/listing/model/managedListingStoreCategories.ts` | Immutable actor/listing key, validated rows and exact assignment receipt. |
| `src/entities/listing/api/managedListingStoreCategoriesClient.ts` | Captured-token reads, scope checks and the existing assignment RPC. |
| `src/features/listing-edit/model/useManagedListingStoreCategories.ts` | Selection, saved state, single-flight requests and stale-response handling. |
| `src/features/listing-edit/components/ManagedListingStoreCategoryCard.tsx` | Localized card and user actions using the existing `ListingStoreCategorySelector`. |

`IntegratedListingEditPage.tsx` composes the card only in its owned, published
listing branch. `listingEditMessages.ts` supplies English and Estonian messages.
The legacy assignment card, hook and APIs are retained; the integrated page
uses the new actor-scoped module. Text/price and photo sessions stay independent.

## Request and confirmation contract

Each operation binds `userId`, `identityId` and `listingId`, captures one session
token and verifies that token's user. Every data query carries that captured
Authorization value. Before and after the operation, the client checks the
stored active identity, identity access and the listing's identity. Category and
assignment reads use ordered pages of 500 with exact counts; this is a transport
page size, not a limit on participation or the number of store categories.

A synchronous lock prevents duplicate reads/saves before React renders again.
Generation checks, abort signals and the immutable scope reject late results
after an account, identity or listing change. Auth/identity/storage events retire
the old context. These UI guards supplement the database authorization below.

Success requires exactly one RPC result for the requested listing, the exact
requested category set, a matching assigned count and a valid removed-link
count. A missing/malformed acknowledgement, timeout or uncertain post-write
outcome does not become success or an automatic retry. The hook retains the
selection and requires a manual readback before another save. Readback reports
whether the stored set matches; it preserves the user's selection if different.
Clear/reset actions cannot bypass this review requirement.

## Database authority

The writer is the existing `set_my_listing_store_categories_v2(text, uuid[])`.
It requires `auth.uid()`, reads that user's stored active identity and verifies
private-owner/active-business-member access. It locks the listing and requires
its `identity_id` to equal that identity. User-ID-only legacy ownership is not
enough for this operation. Every requested category must belong to the same
identity. A missing or foreign category rejects the whole update.

The RPC normalizes the set and atomically replaces `listing_store_categories`
links. A failure rolls back the entire replacement. It does not update listing
basics, prices or image records. This step adds no SQL migration or grant.

The retained direct-table write policy is broader: it checks `listing.user_id`
but does not bind `category.identity_id`. This feature writes through the stricter
RPC. Its safety does not establish that every legacy writer is hardened; that
policy boundary remains separate work.

## Category management boundary

The separately prepared 2026-11-10 management change exposes an actor-scoped
category section in integrated My Area. It supports root and direct-child
creation, rename and explicitly confirmed removal of one childless category.
Removing a category removes its links while retaining listings, photos and
content. English is the primary/fallback language and Estonian is also covered.
The assignment card links to `/v2/my-area#my-area-categories` in a clearly named
new tab, preserving unsaved listing input in the original tab.

Management has its own captured-actor API, server authorization, expected
name/parent checks and exact receipt. An unknown write result requires manual
readback before another action. It does not enable the legacy CRUD as a shortcut
or harden the retained direct `listing_store_categories` policy described above.
See `docs/architecture/store-category-management-v1.md` and
`docs/continuity/STORE_CATEGORY_MANAGEMENT_20261110.md`.

The management Mac report now records database verification, build and pushed
commit `0b2594ad27e8320ab7e71206c8c5cb20edcb5d8a`. On 2026-11-10 the user accepted
root/child creation, both renames, assignment/profile discovery and retained
listing after category removal. This supplements the earlier assignment-only
acceptance. Exact Vercel deployment identity was not supplied; see CURRENT_STATE.

## Evidence

See `docs/continuity/STORE_CATEGORIES_20261110.md` for exact proof filenames,
completed checks and pending checks. Local fixture results do not prove the
current Mac, live database, Vercel deployment or user journey.
