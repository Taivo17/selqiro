"use client";
import { useEffect, useRef, useState } from "react";
import { setActiveIdentity, type SetActiveIdentityResult } from "../../../entities/identity/api/setActiveIdentity";
import type { IdentitySummary } from "../../../entities/identity/model/types";
import { loadSwitcherIdentities } from "./loadSwitcherIdentities";
import { ACTIVE_IDENTITY_CHANGED_EVENT, ACTIVE_IDENTITY_CHANGING_EVENT, ACTIVE_IDENTITY_STORAGE_KEY,
  beginIdentityChange, finishIdentityChange, identityChangePending, retireIdentityChangeForAccount } from "./identityEvents";
export { ACTIVE_IDENTITY_CHANGED_EVENT } from "./identityEvents";
export type ActiveIdentityChangedDetail = { identity: IdentitySummary; changed: boolean };
export type V2IdentitySwitcherState = {
  identities: IdentitySummary[]; activeIdentity: IdentitySummary | null; loading: boolean;
  switchingIdentityId: string | null; error: string | null;
  switchIdentity: (identityId: string) => Promise<SetActiveIdentityResult>;
};
type State = Omit<V2IdentitySwitcherState, "switchIdentity"> & { userId: string | null };
const empty = (userId: string | null): State => ({ userId, identities: [], activeIdentity: null,
  loading: Boolean(userId), switchingIdentityId: null, error: null });

/** Invalidate before identity changes; stale focus replies cannot overwrite the
 * new identity. Header and composer resolve the same stored active identity. */
export function useV2IdentitySwitcher({ userId }: { userId: string | null; userEmail?: string | null }): V2IdentitySwitcherState {
  const [state, setState] = useState<State>(() => empty(userId));
  const generation = useRef(0), live = useRef(false), owner = useRef(userId), busy = useRef<string | null>(null);
  const switchError = useRef<{ userId: string; message: string } | null>(null);
  useEffect(() => {
    live.current = true; owner.current = userId; busy.current = null;
    retireIdentityChangeForAccount(userId);
    if (switchError.current?.userId !== userId) switchError.current = null;
    const load = () => {
      if (busy.current || identityChangePending(userId)) return;
      const version = ++generation.current;
      setState({ ...empty(userId), error: switchError.current?.message ?? null });
      if (!userId) return;
      void loadSwitcherIdentities(userId).then(result => {
        if (live.current && version === generation.current && owner.current === userId && !identityChangePending(userId))
          setState({ ...result, userId, loading: false, switchingIdentityId: null, error: switchError.current?.message ?? null });
      }, () => {
        if (live.current && version === generation.current && owner.current === userId)
          setState({ ...empty(userId), loading: false, error: "Identiteeti ei saanud kontrollida. Proovi uuesti." });
      });
    };
    const changing = () => {
      if (!busy.current && identityChangePending(userId)) {
        generation.current++;
        setState(empty(userId));
      }
    };
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key === ACTIVE_IDENTITY_STORAGE_KEY || event.key?.startsWith("sb-")) load();
    };
    load();
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, load);
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, changing);
    window.addEventListener("focus", load); window.addEventListener("storage", storage);
    return () => {
      live.current = false;
      // This counter intentionally retires all outstanding replies at cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      busy.current = null;
      window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, load);
      window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, changing);
      window.removeEventListener("focus", load); window.removeEventListener("storage", storage);
    };
  }, [userId]);

  async function switchIdentity(identityId: string): Promise<SetActiveIdentityResult> {
    if (!userId || owner.current !== userId || state.userId !== userId || state.loading)
      throw new Error("Identiteete alles kontrollitakse.");
    if (busy.current || identityChangePending(userId)) throw new Error("Identiteedi vahetamine juba käib.");
    const target = state.identities.find(item => item.id === identityId.trim());
    if (!target) throw new Error("Sul puudub ligipääs valitud identiteedile.");
    if (state.activeIdentity?.id === target.id) return { identity: state.activeIdentity, changed: false };
    const version = ++generation.current;
    busy.current = target.id;
    switchError.current = null;
    setState(current => ({ ...current, activeIdentity: null, switchingIdentityId: target.id, error: null }));
    const change = beginIdentityChange(userId);
    try {
      const result = await setActiveIdentity({ identityId: target.id, expectedUserId: userId });
      if (!live.current || owner.current !== userId || version !== generation.current)
        throw new Error("Konto vahetus toimingu ajal. Kontrolli aktiivset identiteeti.");
      setState(current => ({ ...current, activeIdentity: result.identity,
        identities: current.identities.map(item => item.id === target.id ? result.identity : item),
        switchingIdentityId: null, error: null }));
      return result;
    } catch (error) {
      if (live.current && owner.current === userId && version === generation.current) {
        switchError.current = { userId, message: error instanceof Error ? error.message : "Identiteedi vahetamine ei õnnestunud." };
        setState(current => ({ ...current, activeIdentity: null, switchingIdentityId: null,
          error: switchError.current?.message ?? null }));
      }
      throw error;
    } finally {
      if (live.current && owner.current === userId && version === generation.current) {
        busy.current = null;
      }
      // A matching operation releases even after unmount. An old account's
      // completion cannot release a newer account's pending identity change.
      finishIdentityChange(change);
    }
  }
  const visible = state.userId === userId ? state : empty(userId);
  return { identities: visible.identities, activeIdentity: visible.activeIdentity, loading: visible.loading,
    switchingIdentityId: visible.switchingIdentityId, error: visible.error, switchIdentity };
}
