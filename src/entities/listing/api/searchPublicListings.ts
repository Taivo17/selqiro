import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { PUBLIC_SEARCH_PAGE_SIZE, publicSearchError, type PublicSearchInput } from "../model/publicSearch";
import { parsePublicSearchPage, type PublicSearchPage } from "../model/publicSearchResponse";

/** Read-only. No fallback feed, per-card enrichment, AI or client-side full-dataset filtering. */
export async function searchPublicListings(input: PublicSearchInput, signal: AbortSignal): Promise<PublicSearchPage> {
  const validation = publicSearchError(input);
  if (validation) throw new Error(validation);
  const {data, error} = await supabaseBrowserClient.rpc("search_public_listings_v1", {
    p_search_query: input.query.trim(), p_category: input.category || null,
    p_subcategory: input.subcategory || null, p_detail_category: input.detailCategory || null,
    p_condition: input.condition || null, p_location_query: input.location.trim(),
    p_result_limit: PUBLIC_SEARCH_PAGE_SIZE, p_result_offset: input.offset,
  }).abortSignal(signal);
  if (error) throw new Error("Kuulutusi ei saanud laadida. Kontrolli ühendust ja proovi uuesti.");
  return parsePublicSearchPage(data, input.offset);
}
