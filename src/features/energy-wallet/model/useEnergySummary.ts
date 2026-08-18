"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "../../../../lib/useAuth";
import {
  getMyEnergyWallet,
} from "../../../entities/energy/api/getMyEnergyWallet";
import type {
  EnergyWallet,
} from "../../../entities/energy/model/types";
import {
  getActiveIdentity,
} from "../../../entities/identity/api/getActiveIdentity";
import type {
  IdentitySummary,
} from "../../../entities/identity/model/types";

const ACTIVE_IDENTITY_CHANGED_EVENT =
  "selqiro:active-identity-changed";

export type EnergySummaryState = {
  identity: IdentitySummary | null;
  wallet: EnergyWallet | null;
  authenticated: boolean;
  authLoading: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function
useEnergySummary(): EnergySummaryState {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [
    state,
    setState,
  ] = useState<{
    identity: IdentitySummary | null;
    wallet: EnergyWallet | null;
    loading: boolean;
    error: string | null;
  }>({
    identity: null,
    wallet: null,
    loading: true,
    error: null,
  });

  const requestIdRef =
    useRef(0);

  const loadSummary =
    useCallback(
      async () => {
        if (authLoading) {
          return;
        }

        const requestId =
          ++requestIdRef.current;

        if (!user?.id) {
          setState({
            identity: null,
            wallet: null,
            loading: false,
            error: null,
          });

          return;
        }

        setState((current) => ({
          ...current,
          loading: true,
          error: null,
        }));

        try {
          const identity =
            await getActiveIdentity({
              userId: user.id,
              userEmail:
                user.email,
            });

          if (!identity) {
            throw new Error(
              "Aktiivset identiteeti ei saanud laadida."
            );
          }

          const wallet =
            await getMyEnergyWallet();

          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          if (
            identity.id !==
            wallet.identityId
          ) {
            throw new Error(
              "Aktiivne identiteet muutus Energy laadimise ajal."
            );
          }

          setState({
            identity,
            wallet,
            loading: false,
            error: null,
          });
        } catch (loadError) {
          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          setState({
            identity: null,
            wallet: null,
            loading: false,
            error:
              loadError instanceof Error
                ? loadError.message
                : "Energy kokkuvõtet ei saanud laadida.",
          });
        }
      },
      [
        authLoading,
        user?.email,
        user?.id,
      ]
    );

  useEffect(() => {
    void loadSummary();

    function handleIdentityChanged() {
      void loadSummary();
    }

    window.addEventListener(
      ACTIVE_IDENTITY_CHANGED_EVENT,
      handleIdentityChanged
    );

    return () => {
      requestIdRef.current += 1;

      window.removeEventListener(
        ACTIVE_IDENTITY_CHANGED_EVENT,
        handleIdentityChanged
      );
    };
  }, [loadSummary]);

  return {
    ...state,
    authenticated:
      Boolean(user?.id),
    authLoading,
    loading:
      authLoading ||
      state.loading,
    refresh: loadSummary,
  };
}
