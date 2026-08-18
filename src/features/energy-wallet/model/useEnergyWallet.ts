"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "../../../../lib/useAuth";
import {
  getMyEnergyWalletSnapshot,
} from "../../../entities/energy/api/getMyEnergyWallet";
import type {
  EnergyLedgerEntry,
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

export type EnergyWalletState = {
  identity: IdentitySummary | null;
  wallet: EnergyWallet | null;
  entries: EnergyLedgerEntry[];
  authenticated: boolean;
  authLoading: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function
useEnergyWallet(): EnergyWalletState {
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
    entries: EnergyLedgerEntry[];
    loading: boolean;
    error: string | null;
  }>({
    identity: null,
    wallet: null,
    entries: [],
    loading: true,
    error: null,
  });

  const requestIdRef =
    useRef(0);

  const loadEnergy =
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
            entries: [],
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

          const snapshot =
            await getMyEnergyWalletSnapshot();

          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          if (
            identity.id !==
            snapshot.wallet.identityId
          ) {
            throw new Error(
              "Aktiivne identiteet muutus laadimise ajal. Värskenda Energy vaadet."
            );
          }

          setState({
            identity,
            wallet: snapshot.wallet,
            entries:
              snapshot.entries,
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
            entries: [],
            loading: false,
            error:
              loadError instanceof Error
                ? loadError.message
                : "Energy andmeid ei saanud laadida.",
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
    void loadEnergy();

    function handleIdentityChanged() {
      void loadEnergy();
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
  }, [loadEnergy]);

  return {
    ...state,
    authenticated:
      Boolean(user?.id),
    authLoading,
    refresh: loadEnergy,
  };
}
