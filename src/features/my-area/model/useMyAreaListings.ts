"use client";

import { useEffect, useState } from "react";
import { getMyIdentityListings } from "../../../entities/listing/api/getMyIdentityListings";
import type { MyIdentityListingCard } from "../../../entities/listing/model/types";

export type MyAreaListingsState = {
  listings: MyIdentityListingCard[];
  loading: boolean;
  error: string | null;
};

export function useMyAreaListings(): MyAreaListingsState {
  const [state, setState] = useState<MyAreaListingsState>({
    listings: [],
    loading: true,
    error: null,
  });

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
          limit: 12,
          offset: 0,
          statusFilter: "all",
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
  }, []);

  return state;
}
