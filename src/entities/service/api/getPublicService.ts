import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { parsePublicService, parsePublicServicePage, serviceUuid, type ServiceSearchInput } from "../model/publicService";

export async function getPublicService(serviceId: string, signal: AbortSignal) {
  if (!serviceUuid(serviceId)) return null;
  const {data, error} = await supabaseBrowserClient.rpc("get_public_service_v1", {p_service_id: serviceId}).abortSignal(signal);
  if (error) throw new Error("service_public_read_unavailable");
  return parsePublicService(data, serviceId);
}

export const SERVICE_SEARCH_PAGE_SIZE = 24;
export async function searchPublicServices(input: ServiceSearchInput, offset: number, signal: AbortSignal, limit = SERVICE_SEARCH_PAGE_SIZE) {
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100
    || input.query.length > 200 || (input.category?.length ?? 0) > 120 || (input.subcategory?.length ?? 0) > 160
    || (input.country?.length ?? 0) > 120 || (input.city?.length ?? 0) > 160) throw new Error("service_search_invalid");
  const {data, error} = await supabaseBrowserClient.rpc("search_public_services_v1", {
    p_query: input.query.trim(), p_category: input.category || null, p_subcategory: input.subcategory || null,
    p_country: input.country || null, p_city: input.city?.trim() || null, p_result_limit: limit, p_result_offset: offset,
  }).abortSignal(signal);
  if (error) throw new Error("service_search_unavailable");
  return parsePublicServicePage(data, offset, limit);
}
