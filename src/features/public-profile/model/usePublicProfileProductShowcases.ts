"use client";
import { uiMessage } from "../../../../lib/i18n/interfaceMessage";
import { safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";


import {
  useEffect,
  useState,
} from "react";
import {
  getPublicProductShowcases,
} from "../../../entities/product-showcase/api/getPublicProductShowcases";
import type {
  PublicProductShowcase,
} from "../../../entities/product-showcase/model/public";
import type {
  PublicProfile,
} from "../../../entities/profile/model/types";

export type PublicProfileProductShowcasesState = {
  showcases:
    PublicProductShowcase[];
  loading: boolean;
  error: string | null;
};

export function
usePublicProfileProductShowcases(
  profile: PublicProfile | null
): PublicProfileProductShowcasesState {
  const identityId =
    profile?.identityId?.trim() ||
    null;
  const sellerSlug =
    profile?.slug?.trim() || null;

  const [state, setState] =
    useState<{
      identityId: string | null;
      sellerSlug: string | null;
      value: PublicProfileProductShowcasesState;
    }>({
      identityId,
      sellerSlug,
      value: { showcases: [], loading: Boolean(identityId), error: null },
    });

  useEffect(() => {
    let mounted = true;
    function update(value: PublicProfileProductShowcasesState) {
      if (mounted) setState({ identityId, sellerSlug, value });
    }

    async function loadShowcases() {
      if (!identityId) {
        update({
          showcases: [],
          loading: false,
          error: null,
        });

        return;
      }

      update({
        showcases: [],
        loading: true,
        error: null,
      });

      try {
        const showcases =
          await getPublicProductShowcases({
            identityId,
            sellerSlug,
            limit: 80,
          });

        if (!mounted) {
          return;
        }

        update({
          showcases,
          loading: false,
          error: null,
        });
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        update({
          showcases: [],
          loading: false,
          error:
            safeMarketplaceError(loadError, uiMessage("could_not_load_this_profile_s_product_showcases")),
        });
      }
    }

    void loadShowcases();

    return () => {
      mounted = false;
    };
  }, [identityId, sellerSlug]);

  // The old slug/identity must not render while the new read is being scheduled.
  return state.identityId === identityId && state.sellerSlug === sellerSlug
    ? state.value
    : { showcases: [], loading: Boolean(identityId), error: null };
}
