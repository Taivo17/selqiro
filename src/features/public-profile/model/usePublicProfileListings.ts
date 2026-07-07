"use client";

import { useEffect, useState } from "react";
import { getListingsBySeller } from "../../../entities/listing/api/getListingsBySeller";
import type { ProductListingCard } from "../../../entities/listing/model/types";
import type { PublicProfile } from "../../../entities/profile/model/types";

export type PublicProfileListingsState = {
  listings: ProductListingCard[];
  loading: boolean;
  error: string | null;
};

export function usePublicProfileListings(
  profile: PublicProfile | null
): PublicProfileListingsState {
  const [state, setState] = useState<PublicProfileListingsState>({
    listings: [],
    loading: Boolean(profile),
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function loadListings() {
      if (!profile) {
        setState({
          listings: [],
          loading: false,
          error: null,
        });
        return;
      }

      setState({
        listings: [],
        loading: true,
        error: null,
      });

      try {
        const listings = await getListingsBySeller({
          identityId: profile.identityId,
          legacyUserId: profile.legacyUserId,
          sellerName: profile.displayName,
          sellerSlug: profile.slug,
          sellerAvatarUrl: profile.avatarUrl,
          sellerType: profile.identityType,
          limit: 12,
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
              : "Failed to load profile listings",
        });
      }
    }

    loadListings();

    return () => {
      mounted = false;
    };
  }, [profile]);

  return state;
}
