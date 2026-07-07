"use client";

import { useEffect, useState } from "react";
import { getListingById } from "../../../entities/listing/api/getListingById";
import type { ProductListingDetail } from "../../../entities/listing/model/types";

export type ListingDetailState = {
  listing: ProductListingDetail | null;
  loading: boolean;
  error: string | null;
};

export function useListingDetail(listingId: string): ListingDetailState {
  const [state, setState] = useState<ListingDetailState>({
    listing: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function loadListing() {
      if (!listingId) {
        setState({
          listing: null,
          loading: false,
          error: "Listing id missing",
        });
        return;
      }

      setState({
        listing: null,
        loading: true,
        error: null,
      });

      try {
        const listing = await getListingById(listingId);

        if (!mounted) return;

        setState({
          listing,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!mounted) return;

        setState({
          listing: null,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load listing",
        });
      }
    }

    loadListing();

    return () => {
      mounted = false;
    };
  }, [listingId]);

  return state;
}
