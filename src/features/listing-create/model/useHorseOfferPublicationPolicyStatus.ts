"use client";

import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
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
    return marketplaceMessage("horse.sign_in_again_to_view_policy_status.f1a02f");
  }

  return marketplaceMessage("horse.policy_status_could_not_be_loaded_check_your.34e455");
}

function getPolicyAcceptanceErrorMessage(
  error: unknown
): string {
  if (
    error instanceof
      PublicationPolicyReviewRequiredError
  ) {
    return marketplaceMessage("horse.the_active_policy_version_changed_after_refreshing_the.227d4c");
  }

  if (
    error instanceof
      PublicationPolicyStatusLoadError
  ) {
    return marketplaceMessage("horse.acceptance_may_have_been_saved_but_the_latest.32a017");
  }

  if (
    error instanceof
      PublicationPolicyAcceptanceError
  ) {
    const message =
      error.message.toLowerCase();

    if (message.includes("not_authenticated")) {
      return marketplaceMessage("horse.sign_in_again_to_save_policy_acceptance.643a4a");
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
      return marketplaceMessage("horse.the_active_policy_version_changed_after_refreshing_the.227d4c");
    }

    if (
      message.includes(
        "publication_policy_identity_forbidden"
      )
    ) {
      return marketplaceMessage("horse.your_access_to_the_active_identity_changed_check.85901e");
    }
  }

  return marketplaceMessage("horse.not_all_acceptances_could_be_saved_successful_acceptances.aa0932");
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
            marketplaceMessage("horse.policy_status_must_load_successfully_before_acceptance.0db190"),
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
            marketplaceMessage("horse.policy_status_changed_open_the_latest_full_texts.a26d62"),
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
            marketplaceMessage("horse.all_required_policy_documents_have_already_been_accepted.82dc34"),
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
              marketplaceMessage("horse.acceptance_of_all_required_policy_documents_has_been.ce8c78"),
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
