import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { ProductListingCard } from "../model/types";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { parsePublicProfileListingsV1 } from "../model/publicRead/publicProfileListingsV1";
import { publicCard } from "../model/publicRead/presentation";
import {
  mapMarketplaceListingRow,
  type MarketplaceListingRow,
} from "./mappers";

type SellerListingRow =
  MarketplaceListingRow & {
    listing_store_categories?: Array<{
      store_category_id?: string | null;
    }> | null;
  };

export type GetListingsBySellerInput = {
  identityId?: string | null;
  legacyUserId?: string | null;
  sellerName: string;
  sellerSlug: string | null;
  sellerAvatarUrl: string | null;
  sellerType: string | null;

  /*
   * null / undefined:
   * no store-category filter
   *
   * []:
   * an explicitly invalid or empty scope,
   * therefore return no listings
   *
   * [uuid, ...]&#58;    * listing must have at least one direct relation
   * to a category inside the supplied branch scope
   */
  storeCategoryScopeIds?: string[] | null;
  /** Selected root; the server resolves its authorized descendants. */
  storeCategoryId?: string | null;

  limit?: number;
};

function normalizeStoreCategoryScopeIds(
  value: string[] | null | undefined
): string[] | null {
  if (value == null) {
    return null;
  }

  return Array.from(
    new Set(
      value
        .map((categoryId) =>
          categoryId.trim()
        )
        .filter(Boolean)
    )
  ).sort((first, second) =>
    first.localeCompare(second)
  );
}

export async function getListingsBySeller(
  input: GetListingsBySellerInput
): Promise<ProductListingCard[]> {
  if (v2IntegrationEnabled()) {
    if (!input.sellerSlug || input.storeCategoryScopeIds?.length === 0) return [];
    if (input.storeCategoryScopeIds && !input.storeCategoryId) throw new Error("Vali poe rubriik uuesti.");
    const request = {sellerSlug: input.sellerSlug, storeCategoryId: input.storeCategoryId ?? null,
      offset: 0, limit: Math.max(1, Math.min(input.limit ?? 12, 60))};
    const {data, error} = await supabaseBrowserClient.rpc("get_public_profile_listings_v1", {
      p_seller_slug: request.sellerSlug, p_store_category_id: request.storeCategoryId,
      p_result_limit: request.limit, p_result_offset: request.offset});
    if (error) throw new Error("Profiili kuulutusi ei saanud laadida.");
    return parsePublicProfileListingsV1(data, request).items.map(publicCard);
  }
  const limit = input.limit ?? 12;

  if (
    !input.identityId &&
    !input.legacyUserId
  ) {
    return [];
  }

  const categoryScopeIds =
    normalizeStoreCategoryScopeIds(
      input.storeCategoryScopeIds
    );

  const categoryFilterEnabled =
    categoryScopeIds !== null;

  /*
   * Fail closed. An invalid selected category must not
   * accidentally expose every public listing.
   */
  if (
    categoryFilterEnabled &&
    categoryScopeIds.length === 0
  ) {
    return [];
  }

  const selectExpression =
    categoryFilterEnabled
      ? [
          "*",
          "listing_images(id, thumb_url, medium_url, original_url, is_primary, sort_order)",
          "listing_store_categories!inner(store_category_id)",
        ].join(", ")
      : [
          "*",
          "listing_images(id, thumb_url, medium_url, original_url, is_primary, sort_order)",
        ].join(", ");

  let query = supabaseBrowserClient
    .from("listings")
    .select(selectExpression)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (input.identityId) {
    query = query.eq(
      "identity_id",
      input.identityId
    );
  } else if (input.legacyUserId) {
    query = query.eq(
      "user_id",
      input.legacyUserId
    );
  }

  /*
   * Preserve the existing public visibility boundary:
   * paused, sold and expired listings are excluded.
   */
  query = query
    .eq("status", "active")
    .gt(
      "active_until",
      new Date().toISOString()
    );

  if (
    categoryFilterEnabled &&
    categoryScopeIds.length > 0
  ) {
    query = query.in(
      "listing_store_categories.store_category_id",
      categoryScopeIds
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      error.message ||
        "Profiili kuulutusi ei saanud laadida."
    );
  }

  return (
    (data || []) as SellerListingRow[]
  ).map((row) =>
    mapMarketplaceListingRow({
      ...row,
      seller_name:
        row.seller_name ||
        input.sellerName,
      seller_slug:
        row.seller_slug ||
        input.sellerSlug,
      seller_avatar_url:
        row.seller_avatar_url ||
        input.sellerAvatarUrl,
      seller_type:
        row.seller_type ||
        input.sellerType,
    })
  );
}
