"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  getPublicServices,
} from "../../../entities/service/api/getPublicServices";
import type {
  PublicService,
} from "../../../entities/service/model/public";
import type {
  PublicProfile,
} from "../../../entities/profile/model/types";

export type PublicProfileServicesState = {
  services: PublicService[];
  loading: boolean;
  error: string | null;
};

export function usePublicProfileServices(
  profile: PublicProfile | null
): PublicProfileServicesState {
  const identityId =
    profile?.identityId?.trim() ||
    null;

  const [state, setState] =
    useState<PublicProfileServicesState>({
      services: [],
      loading: Boolean(identityId),
      error: null,
    });

  useEffect(() => {
    let mounted = true;

    async function loadServices() {
      if (!identityId) {
        setState({
          services: [],
          loading: false,
          error: null,
        });

        return;
      }

      setState({
        services: [],
        loading: true,
        error: null,
      });

      try {
        const services =
          await getPublicServices({
            identityId,
            limit: 80,
          });

        if (!mounted) {
          return;
        }

        setState({
          services,
          loading: false,
          error: null,
        });
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setState({
          services: [],
          loading: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "Avaliku profiili teenuseid ei saanud laadida.",
        });
      }
    }

    void loadServices();

    return () => {
      mounted = false;
    };
  }, [identityId]);

  return state;
}
