"use client";

import { useEffect, useState } from "react";
import { getPublicStoreCategories } from "../../../entities/store-category/api/getPublicStoreCategories";
import type { StoreCategory } from "../../../entities/store-category/model/types";
import type { PublicProfile } from "../../../entities/profile/model/types";

export type PublicProfileStoreCategoriesState = {
  categories: StoreCategory[];
  loading: boolean;
  error: string | null;
};

export function usePublicProfileStoreCategories(
  profile: PublicProfile | null
): PublicProfileStoreCategoriesState {
  const identityId =
    profile?.identityId?.trim() || null;

  const [state, setState] =
    useState<PublicProfileStoreCategoriesState>({
      categories: [],
      loading: Boolean(identityId),
      error: null,
    });

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      if (!identityId) {
        setState({
          categories: [],
          loading: false,
          error: null,
        });

        return;
      }

      setState({
        categories: [],
        loading: true,
        error: null,
      });

      try {
        const categories =
          await getPublicStoreCategories(
            identityId
          );

        if (!mounted) return;

        setState({
          categories,
          loading: false,
          error: null,
        });
      } catch (loadError) {
        if (!mounted) return;

        setState({
          categories: [],
          loading: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "Avaliku profiili poe-rubriike ei saanud laadida.",
        });
      }
    }

    void loadCategories();

    return () => {
      mounted = false;
    };
  }, [identityId]);

  return state;
}
