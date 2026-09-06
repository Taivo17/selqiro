"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  acceptPublicationPolicy,
  PublicationPolicyAcceptanceError,
} from "../../../entities/publication-policy/api/acceptPublicationPolicy";
import {
  getMyRequiredPublicationPolicyStatus,
  PublicationPolicyStatusLoadError,
} from "../../../entities/publication-policy/api/getMyRequiredPublicationPolicyStatus";
import {
  type PublicationPolicyStatus,
} from "../../../entities/publication-policy/model/types";

export type HorseOfferPublicationPolicyStatusPhase =
  | "loading"
  | "ready"
  | "empty"
  | "error";

export type HorseOfferPublicationPolicyAcceptancePhase =
  | "idle"
  | "accepting"
  | "success"
  | "error";

type HorseOfferPublicationPolicyStatusState = {
  phase: HorseOfferPublicationPolicyStatusPhase;
  policies: PublicationPolicyStatus[];
  errorMessage: string | null;
  acceptancePhase:
    HorseOfferPublicationPolicyAcceptancePhase;
  acceptanceErrorMessage: string | null;
  acceptanceMessage: string | null;
  acceptanceCompletedCount: number;
  acceptanceTotalCount: number;
};

type PolicyStatusLoadMode =
  | "replace"
  | "refresh";

const HORSE_OFFER_POLICY_STATUS_INPUT = {
  contentType: "horse_offer",
  countryCode: "EE",
  locale: "et-EE",
} as const;

const INITIAL_STATE:
  HorseOfferPublicationPolicyStatusState = {
    phase: "loading",
    policies: [],
    errorMessage: null,
    acceptancePhase: "idle",
    acceptanceErrorMessage: null,
    acceptanceMessage: null,
    acceptanceCompletedCount: 0,
    acceptanceTotalCount: 0,
  };

class PublicationPolicyReviewRequiredError
  extends Error {
  constructor() {
    super(
      "The active publication policy snapshot changed during acceptance."
    );
    this.name =
      "PublicationPolicyReviewRequiredError";
  }
}

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

function getPolicyAcceptanceErrorMessage(
  error: unknown
): string {
  if (
    error instanceof
      PublicationPolicyReviewRequiredError
  ) {
    return "Reeglistiku kehtiv versioon muutus. Oleku värskendamise järel ava uus täistekst ja kinnita uuesti.";
  }

  if (
    error instanceof
      PublicationPolicyStatusLoadError
  ) {
    return "Nõustumine võis salvestuda, kuid värsket olekut ei saanud serverist kinnitada. Laadi reeglite olek uuesti.";
  }

  if (
    error instanceof
      PublicationPolicyAcceptanceError
  ) {
    const message =
      error.message.toLowerCase();

    if (message.includes("not_authenticated")) {
      return "Nõustumise salvestamiseks logi uuesti sisse.";
    }

    if (
      message.includes(
        "publication_policy_not_active"
      )
      || message.includes(
        "publication_policy_version_mismatch"
      )
      || message.includes(
        "publication_policy_hash_mismatch"
      )
    ) {
      return "Reeglistiku kehtiv versioon muutus. Oleku värskendamise järel ava uus täistekst ja kinnita uuesti.";
    }

    if (
      message.includes(
        "publication_policy_identity_forbidden"
      )
    ) {
      return "Aktiivse identiteedi kasutusõigus muutus. Kontrolli, kelle nimel tegutsed, ja proovi uuesti.";
    }
  }

  return "Kõiki nõustumisi ei saanud salvestada. Juba õnnestunud append-only nõustumised jäid alles; värskenda olekut ja proovi ülejäänutega uuesti.";
}

function getPolicySnapshotKey(
  policy: PublicationPolicyStatus
): string {
  return [
    policy.policyDocumentId,
    policy.policyVersion,
    policy.contentHash,
  ].join(":");
}

export function
useHorseOfferPublicationPolicyStatus():
  HorseOfferPublicationPolicyStatusState & {
    retry: () => void;
    acceptMissingPolicies: (
      reviewedPolicies:
        readonly PublicationPolicyStatus[]
    ) => Promise<void>;
    isAccepting: boolean;
  } {
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const mutationIdRef = useRef(0);
  const mutationRunningRef = useRef(false);
  const [state, setState] =
    useState<
      HorseOfferPublicationPolicyStatusState
    >(INITIAL_STATE);
  const stateRef = useRef(state);

  stateRef.current = state;

  const loadPolicies = useCallback(
    async (
      mode: PolicyStatusLoadMode
    ): Promise<PublicationPolicyStatus[]> => {
      const requestId =
        requestIdRef.current + 1;

      requestIdRef.current = requestId;

      if (
        mode === "replace"
        && mountedRef.current
      ) {
        setState((current) => ({
          ...current,
          phase: "loading",
          policies: [],
          errorMessage: null,
        }));
      }

      try {
        const policies =
          await getMyRequiredPublicationPolicyStatus(
            HORSE_OFFER_POLICY_STATUS_INPUT
          );

        if (
          mountedRef.current
          && requestIdRef.current === requestId
        ) {
          setState((current) => ({
            ...current,
            phase:
              policies.length > 0
                ? "ready"
                : "empty",
            policies,
            errorMessage: null,
          }));
        }

        return policies;
      } catch (error: unknown) {
        if (
          mountedRef.current
          && requestIdRef.current === requestId
        ) {
          setState((current) => ({
            ...current,
            phase: "error",
            policies:
              mode === "refresh"
                ? current.policies
                : [],
            errorMessage:
              getPolicyStatusErrorMessage(error),
          }));
        }

        throw error;
      }
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;

    void loadPolicies("replace").catch(
      () => undefined
    );

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      mutationIdRef.current += 1;
      mutationRunningRef.current = false;
    };
  }, [loadPolicies]);

  const retry = useCallback(() => {
    if (mutationRunningRef.current) {
      return;
    }

    setState((current) => ({
      ...current,
      acceptancePhase: "idle",
      acceptanceErrorMessage: null,
      acceptanceMessage: null,
      acceptanceCompletedCount: 0,
      acceptanceTotalCount: 0,
    }));

    void loadPolicies("replace").catch(
      () => undefined
    );
  }, [loadPolicies]);

  const acceptMissingPolicies = useCallback(
    async (
      reviewedPolicies:
        readonly PublicationPolicyStatus[]
    ): Promise<void> => {
      if (mutationRunningRef.current) {
        return;
      }

      const snapshot = stateRef.current;

      if (snapshot.phase !== "ready") {
        setState((current) => ({
          ...current,
          acceptancePhase: "error",
          acceptanceErrorMessage:
            "Reeglite olek peab enne nõustumist olema edukalt laaditud.",
          acceptanceMessage: null,
        }));
        return;
      }

      const initialMissingPolicies =
        reviewedPolicies.filter(
          (policy) => !policy.accepted
        );

      const reviewedSnapshotsMatch =
        initialMissingPolicies.every(
          (reviewedPolicy) => {
            const currentPolicy =
              snapshot.policies.find(
                (candidate) =>
                  candidate.policyKey
                  === reviewedPolicy.policyKey
              );

            return Boolean(
              currentPolicy
              && !currentPolicy.accepted
              && getPolicySnapshotKey(
                currentPolicy
              ) === getPolicySnapshotKey(
                reviewedPolicy
              )
            );
          }
        );

      if (!reviewedSnapshotsMatch) {
        setState((current) => ({
          ...current,
          acceptancePhase: "error",
          acceptanceErrorMessage:
            "Reeglistike olek muutus. Ava värsked täistekstid ja kinnita uuesti.",
          acceptanceMessage: null,
        }));
        return;
      }

      if (initialMissingPolicies.length === 0) {
        setState((current) => ({
          ...current,
          acceptancePhase: "success",
          acceptanceErrorMessage: null,
          acceptanceMessage:
            "Kõigi nõutud reeglistikega on juba nõustutud.",
          acceptanceCompletedCount: 0,
          acceptanceTotalCount: 0,
        }));
        return;
      }

      mutationRunningRef.current = true;
      const mutationId =
        mutationIdRef.current + 1;
      mutationIdRef.current = mutationId;

      let currentPolicies = snapshot.policies;
      let completedCount = 0;

      setState((current) => ({
        ...current,
        acceptancePhase: "accepting",
        acceptanceErrorMessage: null,
        acceptanceMessage: null,
        acceptanceCompletedCount: 0,
        acceptanceTotalCount:
          initialMissingPolicies.length,
      }));

      try {
        for (
          const requestedPolicy of
          initialMissingPolicies
        ) {
          if (
            !mountedRef.current
            || mutationIdRef.current !== mutationId
          ) {
            return;
          }

          const currentPolicy =
            currentPolicies.find(
              (candidate) =>
                candidate.policyKey
                === requestedPolicy.policyKey
            );

          if (!currentPolicy) {
            throw new
              PublicationPolicyReviewRequiredError();
          }

          if (currentPolicy.accepted) {
            completedCount += 1;
            setState((current) => ({
              ...current,
              acceptanceCompletedCount:
                completedCount,
            }));
            continue;
          }

          if (
            getPolicySnapshotKey(currentPolicy)
            !== getPolicySnapshotKey(
              requestedPolicy
            )
          ) {
            throw new
              PublicationPolicyReviewRequiredError();
          }

          await acceptPublicationPolicy({
            policyDocumentId:
              requestedPolicy.policyDocumentId,
            policyVersion:
              requestedPolicy.policyVersion,
            contentHash:
              requestedPolicy.contentHash,
            identityId: null,
          });

          completedCount += 1;
          setState((current) => ({
            ...current,
            acceptanceCompletedCount:
              completedCount,
          }));

          currentPolicies =
            await loadPolicies("refresh");

          const acceptedPolicy =
            currentPolicies.find(
              (candidate) =>
                candidate.policyDocumentId
                === requestedPolicy.policyDocumentId
            );

          if (!acceptedPolicy?.accepted) {
            throw new
              PublicationPolicyReviewRequiredError();
          }
        }

        const requestedPoliciesAccepted =
          initialMissingPolicies.every(
            (requestedPolicy) => {
              const currentPolicy =
                currentPolicies.find(
                  (candidate) =>
                    candidate.policyKey
                    === requestedPolicy.policyKey
                );

              return Boolean(
                currentPolicy?.accepted
                && getPolicySnapshotKey(
                  currentPolicy
                ) === getPolicySnapshotKey(
                  requestedPolicy
                )
              );
            }
          );

        if (!requestedPoliciesAccepted) {
          throw new
            PublicationPolicyReviewRequiredError();
        }

        if (
          mountedRef.current
          && mutationIdRef.current === mutationId
        ) {
          setState((current) => ({
            ...current,
            acceptancePhase: "success",
            acceptanceErrorMessage: null,
            acceptanceMessage:
              "Kõigi nõutud reeglistikega nõustumine on salvestatud.",
            acceptanceCompletedCount:
              initialMissingPolicies.length,
            acceptanceTotalCount:
              initialMissingPolicies.length,
          }));
        }
      } catch (error: unknown) {
        try {
          currentPolicies =
            await loadPolicies("refresh");
        } catch {
          // The status loader already exposes its own retryable error state.
        }

        if (
          mountedRef.current
          && mutationIdRef.current === mutationId
        ) {
          setState((current) => ({
            ...current,
            acceptancePhase: "error",
            acceptanceErrorMessage:
              getPolicyAcceptanceErrorMessage(
                error
              ),
            acceptanceMessage: null,
            acceptanceCompletedCount:
              completedCount,
            acceptanceTotalCount:
              initialMissingPolicies.length,
          }));
        }
      } finally {
        if (
          mutationIdRef.current === mutationId
        ) {
          mutationRunningRef.current = false;
        }
      }
    },
    [loadPolicies]
  );

  return {
    ...state,
    retry,
    acceptMissingPolicies,
    isAccepting:
      state.acceptancePhase === "accepting",
  };
}
