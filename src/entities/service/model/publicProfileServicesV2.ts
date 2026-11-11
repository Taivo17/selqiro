import { parsePublicProfileServicesV1 } from "../../profile/model/publicProfileOfferingsV1";
import { ensureProfilePage as ensure, profilePageRecord, profileUuid, validateProfilePageRequest,
  parseProfilePagination } from "../../profile/model/publicProfilePage";

export type PublicProfileServicesRequest = {identityId: string; sellerSlug: string; storeCategoryId: string | null; limit: number; offset: number};
export function publicProfileServicesRequest(input: PublicProfileServicesRequest): PublicProfileServicesRequest {
  validateProfilePageRequest(input, 60);
  ensure(input.storeCategoryId === null || profileUuid(input.storeCategoryId));
  return Object.freeze({identityId: input.identityId, sellerSlug: input.sellerSlug,
    storeCategoryId: input.storeCategoryId, limit: input.limit, offset: input.offset});
}
export function parsePublicProfileServicesV2(value: unknown, request: PublicProfileServicesRequest) {
  publicProfileServicesRequest(request);
  const row = profilePageRecord(value, ["schema_version", "content_scope", "seller_slug", "identity_id", "profile_available",
    "store_category_id", "sort", "read_at", "items", "total_count", "result_limit", "result_offset", "has_more", "next_offset", "window_limit_reached"]);
  ensure(row.schema_version === 2 && row.content_scope === "public_profile_services" && row.sort === "newest"
    && row.seller_slug === request.sellerSlug && row.store_category_id === request.storeCategoryId
    && typeof row.profile_available === "boolean");
  const pagination = parseProfilePagination(row, request);
  ensure(row.profile_available || pagination.totalCount === "0");
  // Keep the existing service/image allowlist and exact canonical identity checks.
  const items = parsePublicProfileServicesV1({schema_version: 1, content_scope: "public_profile_services",
    seller_slug: row.seller_slug, identity_id: row.identity_id, profile_available: row.profile_available,
    result_limit: row.result_limit, read_at: row.read_at, items: row.items}, request);
  return {...pagination, items, sellerSlug: request.sellerSlug, storeCategoryId: request.storeCategoryId,
    profileAvailable: row.profile_available};
}
export type PublicProfileServicesPage = ReturnType<typeof parsePublicProfileServicesV2>;
