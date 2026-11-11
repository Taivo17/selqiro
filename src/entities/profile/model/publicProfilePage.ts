/** Shared strict public-profile page envelope; the server decides content eligibility. */
export const profileUuid = (value: unknown): value is string => typeof value === "string"
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
export function ensureProfilePage(value: unknown): asserts value {
  if (!value) throw new Error("public_profile_page_invalid");
}
export function profilePageRecord(value: unknown, keys: readonly string[]) {
  ensureProfilePage(value !== null && typeof value === "object" && !Array.isArray(value));
  const row = value as Record<string, unknown>;
  ensureProfilePage(Object.keys(row).length === keys.length && keys.every(key => Object.hasOwn(row, key)));
  return row;
}
export function validateProfilePageRequest(request: {identityId: string; sellerSlug: string; limit: number; offset: number}, maxLimit: number) {
  ensureProfilePage(profileUuid(request.identityId) && typeof request.sellerSlug === "string"
    && request.sellerSlug.length > 0 && request.sellerSlug === request.sellerSlug.trim()
    && Array.from(request.sellerSlug).length <= 160);
  ensureProfilePage(Number.isInteger(request.limit) && request.limit >= 1 && request.limit <= maxLimit
    && Number.isInteger(request.offset) && request.offset >= 0 && request.offset <= 100000);
}
export function parseProfilePagination(row: Record<string, unknown>, request: {offset: number; limit: number}) {
  ensureProfilePage(row.result_limit === request.limit && row.result_offset === request.offset && Array.isArray(row.items));
  ensureProfilePage(typeof row.total_count === "string" && /^(0|[1-9][0-9]{0,18})$/.test(row.total_count));
  const count = BigInt(row.total_count), offset = request.offset, limit = request.limit;
  ensureProfilePage(count <= BigInt("9223372036854775807"));
  const remaining = count > BigInt(offset) ? count - BigInt(offset) : BigInt(0);
  ensureProfilePage(row.items.length === (remaining > BigInt(limit) ? limit : Number(remaining)));
  const hasMore = count > BigInt(offset + limit), windowLimitReached = hasMore && offset + limit > 100000;
  const nextOffset = hasMore && !windowLimitReached ? offset + limit : null;
  ensureProfilePage(row.has_more === hasMore && row.next_offset === nextOffset && row.window_limit_reached === windowLimitReached);
  return {totalCount: row.total_count, offset, hasMore, nextOffset, windowLimitReached};
}
