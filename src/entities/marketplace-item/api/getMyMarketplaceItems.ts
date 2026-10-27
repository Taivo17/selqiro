import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { getListingActivityActor } from "../../listing/api/getListingActivityActor";
import { ownerReadRequest, parseOwnerReadPage } from "../model/ownerRead/ownerMarketplaceV3";
import { mapOwnerMarketplaceItemRow } from "./mappers";
import { priceReadDisplay } from "../../listing/model/publicRead/presentation";
import {
  type GetMyMarketplaceItemsInput,
  type OwnerMarketplaceItem,
} from "../model/types";
import {
  mapOwnerMarketplaceItemRows,
} from "./mappers";

const DEFAULT_RESULT_LIMIT = 80;
const MAX_RESULT_LIMIT = 500;

function normalizeLimit(
  value: number | undefined
): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_RESULT_LIMIT;
  }

  return Math.min(
    MAX_RESULT_LIMIT,
    Math.max(1, Math.trunc(value as number))
  );
}

function normalizeOffset(
  value: number | undefined
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.trunc(value as number)
  );
}

export async function getMyMarketplaceItems(
  input: GetMyMarketplaceItemsInput = {}
): Promise<OwnerMarketplaceItem[]> {
  if (v2IntegrationEnabled()) {
    const actor = await getListingActivityActor(), context = {actorId: actor.userId, identityId: actor.identityId};
    const request = ownerReadRequest(context, {...input, limit: Math.min(normalizeLimit(input.limit), 100)});
    const {data, error} = await supabaseBrowserClient.rpc("get_my_marketplace_items_v3", request);
    if (error) throw new Error("Omaniku kuulutusi ei saanud laadida.");
    const page = parseOwnerReadPage(data, context, request);
    return page.items.map(item => {
      const money = item.money, price = money.role === "listing_price" ? money.value : null;
      const horse = money.role === "horse_offer_price" ? money.value : null;
      const wanted = money.role === "wanted_budget" ? money.value : null;
      // Ordinary amounts stay decimal text throughout. This adapter retains the
      // existing, separately bounded EUR horse UI without using it for listing money.
      const mapped = mapOwnerMarketplaceItemRow({...item, owner_user_id: null, description: item.description_excerpt,
        price_text: price?.legacy_text ?? null, price_amount: horse?.amount ?? null,
        price_type: horse?.kind ?? null, currency: price?.currency ?? horse?.currency ?? null, search_text: "",
        wanted_summary: wanted ? {version: 1, budget: wanted.budget ? {...wanted.budget,
          amount: wanted.budget.amount === null ? null : Number(wanted.budget.amount)} : null, search_area: wanted.search_area} : null});
      return mapped.contentType === "listing" && price ? {...mapped, priceAmount: null,
        priceAmountText: price.amount ?? price.legacy_amount, displayPrice: priceReadDisplay(price)} : mapped;
    });
  }
  const { data, error } =
    await supabaseBrowserClient.rpc(
      "get_my_marketplace_items_v2",
      {
        p_result_limit: normalizeLimit(
          input.limit
        ),
        p_result_offset: normalizeOffset(
          input.offset
        ),
        p_status_filter:
          input.status?.trim() || "all",
        p_search_query:
          input.search?.trim() || "",
        p_store_category_filter:
          input.storeCategoryId?.trim() || null,
      }
    );

  if (error) {
    throw new Error(
      error.message ||
        "Omaniku kuulutuste laadimine ebaõnnestus."
    );
  }

  return mapOwnerMarketplaceItemRows(
    data as unknown
  );
}
