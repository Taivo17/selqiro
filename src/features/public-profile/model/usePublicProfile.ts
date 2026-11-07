"use client";
import { uiMessage, safeUiError } from "../../../../lib/i18n/interfaceMessage";


import { useEffect, useState } from "react";
import { getPublicProfileBySlug } from "../../../entities/profile/api/getPublicProfileBySlug";
import type { PublicProfile } from "../../../entities/profile/model/types";

export type PublicProfileState = {
  profile: PublicProfile | null;
  loading: boolean;
  error: string | null;
};

export function usePublicProfile(slug: string): PublicProfileState {
  const [state, setState] = useState<PublicProfileState>({
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!slug) {
        setState({
          profile: null,
          loading: false,
          error: uiMessage("the_profile_address_is_missing"),
        });
        return;
      }

      setState({
        profile: null,
        loading: true,
        error: null,
      });

      try {
        const profile = await getPublicProfileBySlug(slug);

        if (!mounted) return;

        setState({
          profile,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!mounted) return;

        setState({
          profile: null,
          loading: false,
          error:
            safeUiError(error, "could_not_load_the_public_profile_try_again"),
        });
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [slug]);

  return state;
}
