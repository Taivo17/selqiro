"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { getMyAccountState } from "../../../entities/accountLifecycle/api/getMyAccountState";
import { AccountStateError } from "../../../entities/accountLifecycle/model/accountState";
import { AccountStateSession, accountStateLoading, type AccountStateSource } from "./accountStateSession";

const source: AccountStateSource = {
  session: async () => {
    const result = await supabaseBrowserClient.auth.getSession();
    if (result.error) throw new AccountStateError("authChanged");
    const session = result.data.session;
    return session ? {userId: session.user.id, accessToken: session.access_token} : null;
  },
  user: async accessToken => {
    // Verify the captured token, not whichever account might be selected later.
    const result = await supabaseBrowserClient.auth.getUser(accessToken);
    if (result.error || !result.data.user) throw new AccountStateError("authRequired");
    return {userId: result.data.user.id, email: result.data.user.email ?? null};
  },
  read: getMyAccountState,
};

export function useAccountState() {
  const session = useMemo(() => new AccountStateSession(source), []);
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, () => accountStateLoading);
  useEffect(() => {
    session.start();
    const {data: {subscription}} = supabaseBrowserClient.auth.onAuthStateChange(event => {
      if (event !== "INITIAL_SESSION") session.authChanged();
    });
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key?.startsWith("sb-")) session.authChanged();
    };
    window.addEventListener("focus", session.refresh);
    window.addEventListener("storage", storage);
    return () => {
      session.stop(); subscription.unsubscribe();
      window.removeEventListener("focus", session.refresh);
      window.removeEventListener("storage", storage);
    };
  }, [session]);
  return {view, refresh: session.refresh};
}
