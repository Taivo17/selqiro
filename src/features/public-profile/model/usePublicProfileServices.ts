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
  const sellerSlug =
    profile?.slug?.trim() || null;

  const [state, setState] =
    useState<{
      identityId: string | null;
      sellerSlug: string | null;
      value: PublicProfileServicesState;
    }>({
      identityId,
      sellerSlug,
      value: { services: [], loading: Boolean(identityId), error: null },
    });

  useEffect(() => {
    let mounted = true;
    function update(value: PublicProfileServicesState) {
      if (mounted) setState({ identityId, sellerSlug, value });
    }

    async function loadServices() {
      if (!identityId) {
        update({
          services: [],
          loading: false,
          error: null,
        });

        return;
      }

      update({
        services: [],
        loading: true,
        error: null,
      });

      try {
        const services =
          await getPublicServices({
            identityId,
            sellerSlug,
            limit: 80,
          });

        if (!mounted) {
          return;
        }

        update({
          services,
          loading: false,
          error: null,
        });
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        update({
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
  }, [identityId, sellerSlug]);

  // Hide the old viewed profile synchronously, before the next effect commits.
  return state.identityId === identityId && state.sellerSlug === sellerSlug
    ? state.value
    : { services: [], loading: Boolean(identityId), error: null };
}
