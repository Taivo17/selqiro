# Listing store-category assignment v1

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

Integrated My Area currently hides the legacy category CRUD. This step exposes
existing-category selection only, with an honest empty state and no link to a
hidden management anchor. Opening creation/rename/delete requires a separate
actor-scoped management contract, including safe root-category creation during
an active-identity change. The existing CRUD is not enabled as a shortcut.

## Evidence

See `docs/continuity/STORE_CATEGORIES_20261110.md` for exact proof filenames,
completed checks and pending checks. Local fixture results do not prove the
current Mac, live database, Vercel deployment or user journey.
