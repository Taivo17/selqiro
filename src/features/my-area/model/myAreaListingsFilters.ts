export type MyAreaListingsStatusFilter = "all" | "active" | "paused" | "sold";
export type MyAreaListingsFilters = {
  limit?: number; offset?: number; statusFilter?: MyAreaListingsStatusFilter;
  searchQuery?: string; storeCategoryFilter?: string | null;
};
export function ownerListingsFilterKey(filters: MyAreaListingsFilters): string {
  return JSON.stringify([filters.limit ?? 500, filters.offset ?? 0, filters.statusFilter ?? "all",
    filters.searchQuery ?? "", filters.storeCategoryFilter ?? null]);
}
