"use client";

import { useEffect, useState } from "react";
import { getMyIdentityListings } from "../../../entities/listing/api/getMyIdentityListings";
import type { MyIdentityListingCard } from "../../../entities/listing/model/types";

export type MyAreaListingsStatusFilter = "all" | "active" | "paused" | "sold";

export type MyAreaListingsFilters = {
  limit?: number;
  offset?: number;
  statusFilter?: MyAreaListingsStatusFilter;
  searchQuery?: string;
  storeCategoryFilter?: string | null;
};

export type MyAreaListingsState = {
  listings: MyIdentityListingCard[];
  loading: boolean;
  error: string | null;
};

export function useMyAreaListings(
  filters: MyAreaListingsFilters = {}
): MyAreaListingsState {
  const [state, setState] = useState<MyAreaListingsState>({
    listings: [],
    loading: true,
    error: null,
  });

  const limit = filters.limit ?? 500;
  const offset = filters.offset ?? 0;
  const statusFilter = filters.statusFilter ?? "all";
  const searchQuery = filters.searchQuery ?? "";
  const storeCategoryFilter = filters.storeCategoryFilter ?? null;

  useEffect(() => {
    let mounted = true;

    async function loadListings() {
      setState({
        listings: [],
        loading: true,
        error: null,
      });

      try {
        const listings = await getMyIdentityListings({
          limit,
          offset,
          statusFilter,
          searchQuery,
          storeCategoryFilter,
        });

        if (!mounted) return;

        setState({
          listings,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!mounted) return;

        setState({
          listings: [],
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load My Area listings",
        });
      }
    }

    loadListings();

    return () => {
      mounted = false;
    };
  }, [limit, offset, statusFilter, searchQuery, storeCategoryFilter]);

  return state;
}
