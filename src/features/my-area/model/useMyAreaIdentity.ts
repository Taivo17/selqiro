"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getActiveIdentity } from "../../../entities/identity/api/getActiveIdentity";
import type { IdentitySummary } from "../../../entities/identity/model/types";
import { getListingActivityActor } from "../../../entities/listing/api/getListingActivityActor";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { ACTIVE_IDENTITY_CHANGED_EVENT } from "../../v2-shell/model/useV2IdentitySwitcher";

type MyAreaIdentityState = {
  identity: IdentitySummary | null;
  loading: boolean;
  anonymous: boolean;
  error: string | null;
};

/** Read-only presentation. Listing actions retain their own server/actor checks. */
export function useMyAreaIdentity() {
  const generation = useRef(0);
  const live = useRef(false);
  const scheduled = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [state, setState] = useState<MyAreaIdentityState>({
    identity: null, loading: true, anonymous: false, error: null,
  });

  const invalidate = useCallback(() => {
    generation.current += 1;
    clearTimeout(scheduled.current);
    if (live.current) {
      setState({ identity: null, loading: true, anonymous: false, error: null });
    }
    return generation.current;
  }, []);

  const load = useCallback(async (version: number) => {
    const current = () => live.current && version === generation.current;
    if (!current()) return;
    try {
      const { data, error } = await supabaseBrowserClient.auth.getSession();
      if (!current()) return;
      if (error) throw error;
      const user = data.session?.user;
      if (!user) {
        setState({ identity: null, loading: false, anonymous: true, error: null });
        return;
      }

      const identity = await getActiveIdentity({ userId: user.id, userEmail: user.email });
      if (!current()) return;
      const confirmed = await getListingActivityActor();
      if (!current()) return;
      // Do not turn a fallback identity or a crossed account/identity read into a profile link.
      if (!identity || identity.id !== confirmed.identityId || user.id !== confirmed.userId) {
        throw new Error("Aktiivne konto või identiteet muutus.");
      }
      setState({ identity, loading: false, anonymous: false, error: null });
    } catch {
      if (!current()) return;
      setState({
        identity: null, loading: false, anonymous: false,
        error: "Aktiivset identiteeti ei saanud kontrollida. Proovi uuesti.",
      });
    }
  }, []);

  const refresh = useCallback(() => {
    const version = invalidate();
    void load(version);
  }, [invalidate, load]);

  useEffect(() => {
    live.current = true;
    const { data: { subscription } } = supabaseBrowserClient.auth.onAuthStateChange((_event, next) => {
      // Clear the old name/link synchronously; defer API reads beyond the Supabase auth lock.
      const version = invalidate();
      if (!next?.user) {
        setState({ identity: null, loading: false, anonymous: true, error: null });
        return;
      }
      scheduled.current = setTimeout(() => { void load(version); }, 0);
    });
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    refresh();
    return () => {
      live.current = false;
      invalidate();
      subscription.unsubscribe();
      window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [invalidate, load, refresh]);

  return { ...state, refresh };
}
