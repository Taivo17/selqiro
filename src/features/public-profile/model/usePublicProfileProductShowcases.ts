"use client";

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

  const [state, setState] =
    useState<PublicProfileProductShowcasesState>({
      showcases: [],
      loading: Boolean(identityId),
      error: null,
    });

  useEffect(() => {
    let mounted = true;

    async function loadShowcases() {
      if (!identityId) {
        setState({
          showcases: [],
          loading: false,
          error: null,
        });

        return;
      }

      setState({
        showcases: [],
        loading: true,
        error: null,
      });

      try {
        const showcases =
          await getPublicProductShowcases({
            identityId,
            limit: 80,
          });

        if (!mounted) {
          return;
        }

        setState({
          showcases,
          loading: false,
          error: null,
        });
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setState({
          showcases: [],
          loading: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "Avaliku profiili tootenäidiseid ei saanud laadida.",
        });
      }
    }

    void loadShowcases();

    return () => {
      mounted = false;
    };
  }, [identityId]);

  return state;
}
