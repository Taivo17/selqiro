import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { validatePublicProfileMarketplaceRequest } from "../model/publicRead/publicProfileMarketplaceV1";
import { parsePublicProfileMarketplaceV2 } from "../model/publicRead/publicProfileMarketplaceV2";
import type { ProfileListingRequest } from "../model/publicRead/publicProfileListingsV1";

export async function getPublicProfileMarketplace(request: ProfileListingRequest, signal: AbortSignal) {
  validatePublicProfileMarketplaceRequest(request);
  const {data, error} = await supabaseBrowserClient.rpc("get_public_profile_marketplace_v2", {
    p_seller_slug: request.sellerSlug, p_store_category_id: request.storeCategoryId,
    p_result_limit: request.limit, p_result_offset: request.offset,
  }).abortSignal(signal);
  if (error) throw new Error("public_profile_marketplace_unavailable");
  return parsePublicProfileMarketplaceV2(data, request);
}
