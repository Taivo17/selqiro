import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { publicProfileServicesRequest, parsePublicProfileServicesV2, type PublicProfileServicesRequest } from "../model/publicProfileServicesV2";

export async function getPublicProfileServices(input: PublicProfileServicesRequest, signal: AbortSignal) {
  const request = publicProfileServicesRequest(input);
  const {data, error} = await supabaseBrowserClient.rpc("get_public_profile_services_v2", {
    p_seller_slug: request.sellerSlug, p_store_category_id: request.storeCategoryId,
    p_result_limit: request.limit, p_result_offset: request.offset,
  }).abortSignal(signal);
  if (error || signal.aborted) throw new Error("public_profile_services_unavailable");
  return parsePublicProfileServicesV2(data, request);
}
