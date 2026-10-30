"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { ACTIVE_IDENTITY_CHANGED_EVENT, ACTIVE_IDENTITY_CHANGING_EVENT, ACTIVE_IDENTITY_STORAGE_KEY,
  identityChangePending, retireIdentityChangeForAccount } from "../../v2-shell/model/identityEvents";

export type ConversationActorContext = Readonly<{ expectedUserId: string; expectedIdentityId: string;
  accessToken: string; generation: number; signal: AbortSignal }>;
const uuid = (value: unknown): value is string => typeof value === "string"
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
  && value !== "00000000-0000-0000-0000-000000000000";

/** UI context only. Every action is checked again inside the atomic SQL RPC.
 * Invalidation is synchronous; no Supabase call runs under an auth callback lock. */
export function useConversationActor() {
  const generation = useRef(0), live = useRef(false), current = useRef<ConversationActorContext | null>(null);
  const controller = useRef<AbortController | null>(null), authUser = useRef<string | null>(null);
  const [actor, setActor] = useState<ConversationActorContext | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const invalidate = useCallback(() => {
    generation.current += 1; current.current = null; controller.current?.abort();
    if (live.current) { setActor(null); setLoading(true); setError(null); setAnonymous(false); }
    return generation.current;
  }, []);
  const resolve = useCallback(async (version: number) => {
    if (!live.current || version !== generation.current) return;
    try {
      const session = await supabaseBrowserClient.auth.getSession();
      if (!live.current || version !== generation.current) return;
      if (session.error) throw new Error("Sisselogimist ei saanud kontrollida.");
      if (!session.data.session) {
        retireIdentityChangeForAccount(null);
        if (live.current && version === generation.current) { setAnonymous(true); setLoading(false); }
        return;
      }
      const uid = session.data.session.user.id, token = session.data.session.access_token;
      retireIdentityChangeForAccount(uid);
      if (identityChangePending(uid)) return;
      const user = await supabaseBrowserClient.auth.getUser();
      if (user.error || !uuid(uid) || user.data.user?.id !== uid) throw new Error("Kontrolli sisselogitud kontot.");
      const profile = await supabaseBrowserClient.from("profiles").select("active_identity_id").eq("id", uid).maybeSingle();
      if (profile.error || !uuid(profile.data?.active_identity_id)) throw new Error("Vali aktiivne identiteet.");
      if (!live.current || version !== generation.current || identityChangePending(uid)) return;
      controller.current = new AbortController(); authUser.current = uid;
      const value = Object.freeze({ expectedUserId: uid, expectedIdentityId: profile.data.active_identity_id,
        accessToken: token, generation: version, signal: controller.current.signal });
      current.current = value; setActor(value); setLoading(false);
    } catch (e) {
      if (!live.current || version !== generation.current) return;
      setLoading(false); setError(e instanceof Error ? e.message : "Kontot ei saanud kontrollida.");
    }
  }, []);
  const refresh = useCallback(() => { const version = invalidate(); void resolve(version); }, [invalidate, resolve]);
  useEffect(() => {
    live.current = true; refresh();
    const changed = () => refresh();
    const changing = () => { invalidate(); };
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key === ACTIVE_IDENTITY_STORAGE_KEY || event.key?.startsWith("sb-")) refresh();
    };
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, changed);
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, changing);
    window.addEventListener("focus", changed); window.addEventListener("storage", storage);
    const { data: { subscription } } = supabaseBrowserClient.auth.onAuthStateChange((event, session) => {
      const uid = session?.user.id ?? null;
      if (uid === authUser.current && !["SIGNED_OUT", "USER_UPDATED", "TOKEN_REFRESHED"].includes(event)) return;
      retireIdentityChangeForAccount(uid);
      authUser.current = uid; const version = invalidate();
      setTimeout(() => { void resolve(version); }, 0);
    });
    return () => { live.current = false; invalidate(); subscription.unsubscribe();
      window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, changed);
      window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, changing);
      window.removeEventListener("focus", changed); window.removeEventListener("storage", storage); };
  }, [invalidate, refresh, resolve]);
  const isCurrent = useCallback((value: ConversationActorContext) => live.current && current.current === value
    && value.generation === generation.current && !value.signal.aborted, []);
  return { actor, loading, anonymous, error, refresh, isCurrent };
}
