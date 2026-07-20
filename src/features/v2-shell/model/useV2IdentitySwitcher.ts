"use client";

import { useEffect, useState } from "react";
import { getActiveIdentity } from "../../../entities/identity/api/getActiveIdentity";
import { getMyIdentities } from "../../../entities/identity/api/getMyIdentities";
import {
  setActiveIdentity,
  type SetActiveIdentityResult,
} from "../../../entities/identity/api/setActiveIdentity";
import type { IdentitySummary } from "../../../entities/identity/model/types";

export const ACTIVE_IDENTITY_CHANGED_EVENT =
  "selqiro:active-identity-changed";

export type ActiveIdentityChangedDetail = {
  identity: IdentitySummary;
  changed: boolean;
};

export type V2IdentitySwitcherState = {
  identities: IdentitySummary[];
  activeIdentity: IdentitySummary | null;
  loading: boolean;
  switchingIdentityId: string | null;
  error: string | null;
  switchIdentity: (
    identityId: string
  ) => Promise<SetActiveIdentityResult>;
};

function fallbackIdentity(
  userEmail?: string | null
): IdentitySummary {
  return {
    id: "fallback-private",
    type: "private",
    displayName:
      userEmail?.split("@")[0] ||
      "Kasutaja",
    avatarUrl: null,
    slug: null,
  };
}

function normalizeIdentities(
  identities: IdentitySummary[]
): IdentitySummary[] {
  const identityById =
    new Map<string, IdentitySummary>();

  for (const identity of identities) {
    const cleanId = identity.id.trim();

    if (
      !cleanId ||
      cleanId === "fallback-private"
    ) {
      continue;
    }

    identityById.set(cleanId, {
      ...identity,
      id: cleanId,
      displayName:
        identity.displayName.trim() ||
        "Identiteet",
    });
  }

  return Array.from(identityById.values());
}

function mergeIdentity(
  fallback: IdentitySummary,
  preferred: IdentitySummary
): IdentitySummary {
  return {
    ...fallback,
    ...preferred,
    displayName:
      preferred.displayName.trim() ||
      fallback.displayName,
    avatarUrl:
      preferred.avatarUrl ||
      fallback.avatarUrl,
    slug:
      preferred.slug ||
      fallback.slug,
  };
}

function resolveIdentityState(input: {
  identities: IdentitySummary[];
  activeIdentity: IdentitySummary | null;
  userEmail?: string | null;
}) {
  const identities =
    normalizeIdentities(input.identities);

  let activeIdentity =
    input.activeIdentity;

  if (activeIdentity) {
    const matchingIdentity =
      identities.find(
        (identity) =>
          identity.id ===
          activeIdentity?.id
      );

    if (matchingIdentity) {
      activeIdentity = mergeIdentity(
        matchingIdentity,
        activeIdentity
      );
    } else if (
      activeIdentity.id ===
      "fallback-private"
    ) {
      activeIdentity =
        identities[0] ||
        activeIdentity;
    }
  }

  activeIdentity =
    activeIdentity ||
    identities[0] ||
    fallbackIdentity(input.userEmail);

  const activeIdentityIsListed =
    activeIdentity.id !==
      "fallback-private" &&
    identities.some(
      (identity) =>
        identity.id === activeIdentity?.id
    );

  return {
    identities:
      activeIdentity.id !==
        "fallback-private" &&
      !activeIdentityIsListed
        ? [activeIdentity, ...identities]
        : identities,
    activeIdentity,
  };
}

function notifyActiveIdentityChanged(
  detail: ActiveIdentityChangedDetail
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ActiveIdentityChangedDetail>(
      ACTIVE_IDENTITY_CHANGED_EVENT,
      {
        detail,
      }
    )
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  return error instanceof Error &&
    error.message
    ? error.message
    : fallback;
}

export function useV2IdentitySwitcher(input: {
  userId: string | null;
  userEmail?: string | null;
}): V2IdentitySwitcherState {
  const { userId, userEmail } = input;

  const [state, setState] = useState<{
    identities: IdentitySummary[];
    activeIdentity: IdentitySummary | null;
    loading: boolean;
    error: string | null;
  }>({
    identities: [],
    activeIdentity: null,
    loading: Boolean(userId),
    error: null,
  });

  const [
    switchingIdentityId,
    setSwitchingIdentityId,
  ] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadIdentityState() {
      if (!userId) {
        setState({
          identities: [],
          activeIdentity: null,
          loading: false,
          error: null,
        });

        setSwitchingIdentityId(null);
        return;
      }

      setState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const [
          identities,
          activeIdentity,
        ] = await Promise.all([
          getMyIdentities(),
          getActiveIdentity({
            userId,
            userEmail,
          }),
        ]);

        if (!mounted) return;

        const resolved =
          resolveIdentityState({
            identities,
            activeIdentity,
            userEmail,
          });

        setState({
          identities:
            resolved.identities,
          activeIdentity:
            resolved.activeIdentity,
          loading: false,
          error: null,
        });
      } catch (loadError) {
        if (!mounted) return;

        setState({
          identities: [],
          activeIdentity:
            fallbackIdentity(userEmail),
          loading: false,
          error: getErrorMessage(
            loadError,
            "Identiteete ei saanud laadida."
          ),
        });
      }
    }

    void loadIdentityState();

    return () => {
      mounted = false;
    };
  }, [userId, userEmail]);

  async function switchIdentity(
    identityId: string
  ): Promise<SetActiveIdentityResult> {
    const cleanIdentityId =
      identityId.trim();

    if (state.loading) {
      throw new Error(
        "Identiteete alles laetakse."
      );
    }

    if (switchingIdentityId) {
      throw new Error(
        "Identiteedi vahetamine juba käib."
      );
    }

    const targetIdentity =
      state.identities.find(
        (identity) =>
          identity.id ===
          cleanIdentityId
      );

    if (!targetIdentity) {
      const targetError =
        new Error(
          "Valitud identiteeti ei ole sinu identiteetide nimekirjas."
        );

      setState((current) => ({
        ...current,
        error: targetError.message,
      }));

      throw targetError;
    }

    if (
      state.activeIdentity?.id ===
      targetIdentity.id
    ) {
      return {
        identity:
          state.activeIdentity,
        changed: false,
      };
    }

    setSwitchingIdentityId(
      targetIdentity.id
    );

    setState((current) => ({
      ...current,
      error: null,
    }));

    try {
      const result =
        await setActiveIdentity({
          identityId:
            targetIdentity.id,
        });

      const resolvedIdentity =
        mergeIdentity(
          targetIdentity,
          result.identity
        );

      setState((current) => {
        const identityAlreadyExists =
          current.identities.some(
            (identity) =>
              identity.id ===
              resolvedIdentity.id
          );

        return {
          ...current,
          identities:
            identityAlreadyExists
              ? current.identities.map(
                  (identity) =>
                    identity.id ===
                    resolvedIdentity.id
                      ? mergeIdentity(
                          identity,
                          resolvedIdentity
                        )
                      : identity
                )
              : [
                  resolvedIdentity,
                  ...current.identities,
                ],
          activeIdentity:
            resolvedIdentity,
          error: null,
        };
      });

      notifyActiveIdentityChanged({
        identity:
          resolvedIdentity,
        changed: result.changed,
      });

      return {
        identity:
          resolvedIdentity,
        changed: result.changed,
      };
    } catch (switchError) {
      const resolvedError =
        switchError instanceof Error
          ? switchError
          : new Error(
              "Aktiivset identiteeti ei saanud vahetada."
            );

      setState((current) => ({
        ...current,
        error:
          resolvedError.message,
      }));

      throw resolvedError;
    } finally {
      setSwitchingIdentityId(null);
    }
  }

  return {
    ...state,
    switchingIdentityId,
    switchIdentity,
  };
}
