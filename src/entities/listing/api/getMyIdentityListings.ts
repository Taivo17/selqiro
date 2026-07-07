import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { MyIdentityListingCard } from "../model/types";
import { mapMarketplaceListingRow, type MarketplaceListingRow } from "./mappers";

type MyIdentityListingRpcRow = MarketplaceListingRow & {
  status?: string | null;
  active_until?: string | null;
};

export type GetMyIdentityListingsInput = {
  limit?: number;
  offset?: number;
  statusFilter?: "all" | "active" | "paused" | "sold";
  searchQuery?: string;
  storeCategoryFilter?: string | null;
};

function getDaysLeft(activeUntil?: string | null): number | null {
  if (!activeUntil) return null;

  const diff = new Date(activeUntil).getTime() - Date.now();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function getMyIdentityListings(
  input: GetMyIdentityListingsInput = {}
): Promise<MyIdentityListingCard[]> {
  const limit = input.limit ?? 12;
  const offset = input.offset ?? 0;

  const { data, error } = await supabaseBrowserClient.rpc(
    "get_my_identity_listings",
    {
      result_limit: limit,
      result_offset: offset,
      status_filter: input.statusFilter ?? "all",
      search_query: input.searchQuery ?? "",
      store_category_filter: input.storeCategoryFilter ?? null,
    }
  );

  if (error) {
    throw new Error(error.message || "Failed to load identity listings");
  }

  return ((data || []) as MyIdentityListingRpcRow[]).map((row) => {
    const card = mapMarketplaceListingRow({
      ...row,
      listing_id: row.listing_id || row.id,
    });

    return {
      ...card,
      status: row.status || "active",
      activeUntil: row.active_until || null,
      daysLeft: getDaysLeft(row.active_until || null),
    };
  });
}
