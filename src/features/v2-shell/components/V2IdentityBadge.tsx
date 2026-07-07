"use client";

import { useEffect, useState } from "react";
import { getActiveIdentity } from "../../../entities/identity/api/getActiveIdentity";
import type { ActiveIdentityState } from "../../../entities/identity/model/types";

export default function V2IdentityBadge({
  userId,
  userEmail,
}: {
  userId: string | null;
  userEmail?: string | null;
}) {
  const [state, setState] = useState<ActiveIdentityState>({
    identity: null,
    loading: Boolean(userId),
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function loadIdentity() {
      if (!userId) {
        setState({
          identity: null,
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
        const identity = await getActiveIdentity({ userId, userEmail });

        if (!mounted) return;

        setState({
          identity,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.warn(
          "V2IdentityBadge failed to load active identity:",
          error instanceof Error ? error.message : error
        );

        if (!mounted) return;

        setState({
          identity: {
            id: "fallback-private",
            type: "private",
            displayName: userEmail?.split("@")[0] || "Kasutaja",
            avatarUrl: null,
            slug: null,
          },
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load active identity",
        });
      }
    }

    loadIdentity();

    return () => {
      mounted = false;
    };
  }, [userId, userEmail]);

  const label = state.loading
    ? "Laen..."
    : state.identity?.displayName || "Kasutaja";

  return (
    <button className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-3 py-2 text-left text-sm shadow-sm transition hover:border-neutral-300">
      {state.identity?.avatarUrl ? (
        <img
          src={state.identity.avatarUrl}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-300" />
      )}

      <span>
        <span className="block text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          Tegutsen kui
        </span>
        <span className="font-semibold">{label}</span>
      </span>
    </button>
  );
}
