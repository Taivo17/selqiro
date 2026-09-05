"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getMyRequiredPublicationPolicyStatus,
} from "../../../entities/publication-policy/api/getMyRequiredPublicationPolicyStatus";
import {
  type PublicationPolicyStatus,
} from "../../../entities/publication-policy/model/types";

export type HorseOfferPublicationPolicyStatusPhase =
  | "loading"
  | "ready"
  | "empty"
  | "error";

type HorseOfferPublicationPolicyStatusState = {
  phase: HorseOfferPublicationPolicyStatusPhase;
  policies: PublicationPolicyStatus[];
  errorMessage: string | null;
};

const HORSE_OFFER_POLICY_STATUS_INPUT = {
  contentType: "horse_offer",
  countryCode: "EE",
  locale: "et-EE",
} as const;

function getPolicyStatusErrorMessage(
  error: unknown
): string {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : "";

  if (message.includes("not_authenticated")) {
    return "Reeglite oleku vaatamiseks logi uuesti sisse.";
  }

  return "Reeglite olekut ei saanud laadida. Kontrolli ühendust ja proovi uuesti.";
}

export function
useHorseOfferPublicationPolicyStatus():
  HorseOfferPublicationPolicyStatusState & {
    retry: () => void;
  } {
  const requestIdRef = useRef(0);
  const [retrySequence, setRetrySequence] =
    useState(0);
  const [state, setState] =
    useState<HorseOfferPublicationPolicyStatusState>({
      phase: "loading",
      policies: [],
      errorMessage: null,
    });

  useEffect(() => {
    const requestId =
      requestIdRef.current + 1;
    let active = true;

    requestIdRef.current = requestId;
    setState({
      phase: "loading",
      policies: [],
      errorMessage: null,
    });

    void getMyRequiredPublicationPolicyStatus(
      HORSE_OFFER_POLICY_STATUS_INPUT
    )
      .then((policies) => {
        if (
          !active
          || requestIdRef.current !== requestId
        ) {
          return;
        }

        setState({
          phase:
            policies.length > 0
              ? "ready"
              : "empty",
          policies,
          errorMessage: null,
        });
      })
      .catch((error: unknown) => {
        if (
          !active
          || requestIdRef.current !== requestId
        ) {
          return;
        }

        console.error(
          "Horse offer publication policy status load failed:",
          error
        );

        setState({
          phase: "error",
          policies: [],
          errorMessage:
            getPolicyStatusErrorMessage(error),
        });
      });

    return () => {
      active = false;

      if (
        requestIdRef.current === requestId
      ) {
        requestIdRef.current += 1;
      }
    };
  }, [retrySequence]);

  const retry = useCallback(() => {
    setRetrySequence(
      (current) => current + 1
    );
  }, []);

  return {
    ...state,
    retry,
  };
}
