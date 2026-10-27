import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { PUBLIC_SEARCH_PAGE_SIZE, publicSearchError, type PublicSearchInput } from "../model/publicSearch";
import { parsePublicSearchPage, type PublicSearchPage } from "../model/publicSearchResponse";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { parsePublicSearchV2 } from "../model/publicRead/publicSearchV2";
import { priceReadDisplay } from "../model/publicRead/presentation";

/** Read-only. No fallback feed, per-card enrichment, AI or client-side full-dataset filtering. */
export async function searchPublicListings(input: PublicSearchInput, signal: AbortSignal): Promise<PublicSearchPage> {
  const validation = publicSearchError(input);
  if (validation) throw new Error(validation);
  const integrated = v2IntegrationEnabled();
  const {data, error} = await supabaseBrowserClient.rpc(integrated ? "search_public_listings_v2" : "search_public_listings_v1", {
    p_search_query: input.query.trim(), p_category: input.category || null,
    p_subcategory: input.subcategory || null, p_detail_category: input.detailCategory || null,
    p_condition: input.condition || null, p_location_query: input.location.trim(),
    p_result_limit: PUBLIC_SEARCH_PAGE_SIZE, p_result_offset: input.offset,
  }).abortSignal(signal);
  if (error) throw new Error("Kuulutusi ei saanud laadida. Kontrolli ühendust ja proovi uuesti.");
  if (integrated) {
    const page = parsePublicSearchV2(data, input.offset, PUBLIC_SEARCH_PAGE_SIZE);
    return {...page, items: page.items.map(item => ({...item, title: item.title || "Pealkirjata kuulutus",
      sellerName: item.sellerName || "Avaldaja", price: item.price.legacy_text,
      priceAmount: item.price.amount ?? item.price.legacy_amount, displayPrice: priceReadDisplay(item.price)}))};
  }
  return parsePublicSearchPage(data, input.offset);
}
