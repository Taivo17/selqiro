import { parseContentStoreCategories } from "./contentCategories";
import { ensureProfilePage as ensure, profilePageRecord, validateProfilePageRequest,
  parseProfilePagination } from "../../profile/model/publicProfilePage";

export type PublicCategoryScope = "marketplace" | "services";
export type PublicProfileCategoriesRequest = {identityId: string; sellerSlug: string; scope: PublicCategoryScope; limit: number; offset: number};
export function publicProfileCategoriesRequest(input: PublicProfileCategoriesRequest): PublicProfileCategoriesRequest {
  validateProfilePageRequest(input, 100);
  ensure(input.scope === "marketplace" || input.scope === "services");
  return Object.freeze({identityId: input.identityId, sellerSlug: input.sellerSlug,
    scope: input.scope, limit: input.limit, offset: input.offset});
}
export function parsePublicProfileCategoriesV2(value: unknown, request: PublicProfileCategoriesRequest) {
  publicProfileCategoriesRequest(request);
  const row = profilePageRecord(value, ["schema_version", "content_scope", "filter_scope", "seller_slug", "identity_id",
    "profile_available", "items", "total_count", "result_limit", "result_offset", "has_more", "next_offset", "window_limit_reached"]);
  ensure(row.schema_version === 2 && row.content_scope === "public_profile_store_categories"
    && row.filter_scope === request.scope && row.seller_slug === request.sellerSlug && typeof row.profile_available === "boolean");
  const pagination = parseProfilePagination(row, request);
  ensure(row.profile_available ? row.identity_id === request.identityId : row.identity_id === null && pagination.totalCount === "0");
  return {...pagination, profileAvailable: row.profile_available, items: parseContentStoreCategories(row.items, request.identityId)};
}
