import { ensure, record } from "./priceRead";
import { parsePublicMarketplace } from "./publicMarketplace";
import { validatePublicProfileMarketplaceRequest, type PublicProfileMarketplacePage } from "./publicProfileMarketplaceV1";
import type { ProfileListingRequest } from "./publicProfileListingsV1";

/** Version 2 receives explicitly assigned canonical horses as well as ordinary listings.
 * Version 1 remains unchanged for deployed clients that do not support horse category links. */
export function parsePublicProfileMarketplaceV2(value: unknown, request: ProfileListingRequest): PublicProfileMarketplacePage {
  validatePublicProfileMarketplaceRequest(request);
  const row = record(value, ["schema_version", "content_scope", "seller_slug", "profile_available",
    "store_category_id", "sort", "items", "total_count", "result_limit", "result_offset", "has_more",
    "next_offset", "window_limit_reached"]);
  ensure(row.schema_version === 2 && row.content_scope === "public_profile_marketplace"
    && row.seller_slug === request.sellerSlug && row.store_category_id === request.storeCategoryId
    && typeof row.profile_available === "boolean" && Array.isArray(row.items));
  ensure(row.items.every(item => item !== null && typeof item === "object" && !Array.isArray(item)
    && item.seller_slug === request.sellerSlug && ["listing", "horse_offer"].includes(item.content_type)));
  const page = parsePublicMarketplace({schema_version: 1, content_scope: "marketplace", sort: row.sort,
    items: row.items, total_count: row.total_count, result_limit: row.result_limit, result_offset: row.result_offset,
    has_more: row.has_more, next_offset: row.next_offset, window_limit_reached: row.window_limit_reached},
  request.offset, request.limit);
  ensure(row.profile_available || page.totalCount === "0");
  return {...page, sellerSlug: request.sellerSlug, storeCategoryId: request.storeCategoryId,
    profileAvailable: row.profile_available};
}
