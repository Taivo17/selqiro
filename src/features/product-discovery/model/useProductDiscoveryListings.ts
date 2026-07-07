"use client";

import { useEffect, useState } from "react";
import { getProductListings } from "../../../entities/listing/api/getProductListings";
import type { ProductListingCard } from "../../../entities/listing/model/types";

export type ProductDiscoveryListingsState = {
  listings: ProductListingCard[];
  loading: boolean;
  error: string | null;
};

export function useProductDiscoveryListings(): ProductDiscoveryListingsState {
  const [state, setState] = useState<ProductDiscoveryListingsState>({
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
        const listings = await getProductListings({ limit: 30, offset: 0 });

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
              : "Failed to load product listings",
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
