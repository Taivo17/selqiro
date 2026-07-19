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

function normalizeScopeIds(
  value: string[] | null
): string[] | null {
  if (value === null) {
    return null;
  }

  return Array.from(
    new Set(
      value
        .map((categoryId) =>
          categoryId.trim()
        )
        .filter(Boolean)
    )
  ).sort((first, second) =>
    first.localeCompare(second)
  );
}

const ALL_CATEGORIES_SCOPE_KEY =
  "__all_public_store_categories__";

export function usePublicProfileListings(
  profile: PublicProfile | null,
  storeCategoryScopeIds:
    | string[]
    | null = null
): PublicProfileListingsState {
  const normalizedScopeIds =
    normalizeScopeIds(
      storeCategoryScopeIds
    );

  /*
   * The effect depends on a stable primitive instead
   * of an array reference. This prevents a parent
   * component from causing a request loop by creating
   * an equivalent array on every render.
   */
  const categoryScopeKey =
    normalizedScopeIds === null
      ? ALL_CATEGORIES_SCOPE_KEY
      : normalizedScopeIds.join(",");

  const [state, setState] =
    useState<PublicProfileListingsState>({
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

      const resolvedScopeIds =
        categoryScopeKey ===
        ALL_CATEGORIES_SCOPE_KEY
          ? null
          : categoryScopeKey
            ? categoryScopeKey.split(",")
            : [];

      setState({
        listings: [],
        loading: true,
        error: null,
      });

      try {
        const listings =
          await getListingsBySeller({
            identityId:
              profile.identityId,
            legacyUserId:
              profile.legacyUserId,
            sellerName:
              profile.displayName,
            sellerSlug:
              profile.slug,
            sellerAvatarUrl:
              profile.avatarUrl,
            sellerType:
              profile.identityType,
            storeCategoryScopeIds:
              resolvedScopeIds,
            limit: 12,
          });

        if (!mounted) return;

        setState({
          listings,
          loading: false,
          error: null,
        });
      } catch (loadError) {
        if (!mounted) return;

        setState({
          listings: [],
          loading: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "Profiili kuulutusi ei saanud laadida.",
        });
      }
    }

    void loadListings();

    return () => {
      mounted = false;
    };
  }, [profile, categoryScopeKey]);

  return state;
}
