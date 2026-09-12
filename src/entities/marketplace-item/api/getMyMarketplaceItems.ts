import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
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
  const { data, error } =
    await supabaseBrowserClient.rpc(
      "get_my_marketplace_items_v1",
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
