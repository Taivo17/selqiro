"use client";

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
          error: "Profile slug missing",
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
            error instanceof Error
              ? error.message
              : "Failed to load public profile",
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
