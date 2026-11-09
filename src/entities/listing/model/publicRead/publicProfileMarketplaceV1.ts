import { ensure, record } from "./priceRead";
import { uuid } from "./publicDetailV1";
import { parsePublicMarketplace } from "./publicMarketplace";
import type { ProfileListingRequest } from "./publicProfileListingsV1";
import type { PublicSearchPage } from "../publicSearchResponse";

export type PublicProfileMarketplacePage = PublicSearchPage & {
  sellerSlug: string;
  storeCategoryId: string | null;
  profileAvailable: boolean;
};

export function validatePublicProfileMarketplaceRequest(request: ProfileListingRequest): void {
  ensure(typeof request.sellerSlug === "string" && request.sellerSlug.length > 0
    && Array.from(request.sellerSlug).length <= 160 && request.sellerSlug === request.sellerSlug.trim());
  if (request.storeCategoryId !== null) uuid(request.storeCategoryId);
  ensure(Number.isInteger(request.offset) && request.offset >= 0 && request.offset <= 100000);
  ensure(Number.isInteger(request.limit) && request.limit >= 1 && request.limit <= 60);
}

/** One viewed profile and one server page; never merge an owner feed or infer a horse's shop category. */
export function parsePublicProfileMarketplaceV1(
  value: unknown, request: ProfileListingRequest
): PublicProfileMarketplacePage {
  validatePublicProfileMarketplaceRequest(request);
  const row = record(value, ["schema_version", "content_scope", "seller_slug", "profile_available",
    "store_category_id", "sort", "items", "total_count", "result_limit", "result_offset", "has_more",
    "next_offset", "window_limit_reached"]);
  ensure(row.schema_version === 1 && row.content_scope === "public_profile_marketplace"
    && row.seller_slug === request.sellerSlug && row.store_category_id === request.storeCategoryId
    && typeof row.profile_available === "boolean" && Array.isArray(row.items));
  ensure(row.items.every(item => item !== null && typeof item === "object"
    && !Array.isArray(item) && item.seller_slug === request.sellerSlug));
  const page = parsePublicMarketplace({schema_version: 1, content_scope: "marketplace", sort: row.sort,
    items: row.items, total_count: row.total_count, result_limit: row.result_limit, result_offset: row.result_offset,
    has_more: row.has_more, next_offset: row.next_offset, window_limit_reached: row.window_limit_reached},
  request.offset, request.limit);
  ensure(row.profile_available || page.totalCount === "0");
  ensure(request.storeCategoryId === null || page.items.every(item => item.contentType === "listing"));
  return {...page, sellerSlug: request.sellerSlug, storeCategoryId: request.storeCategoryId,
    profileAvailable: row.profile_available};
}
