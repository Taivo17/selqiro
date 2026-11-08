"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getHorseDraftActor } from "../../../entities/horse-offer/api/getHorseDraftActor";
import { horsePublicationRequest } from "../../../entities/horse-offer/api/horsePublicationClient";
import { bindHorseOwnerSnapshot } from "../../../entities/horse-offer/model/publication";
import type { OwnerHorseOfferEditSnapshot } from "../../../entities/horse-offer/model/editSnapshot";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { ACTIVE_IDENTITY_CHANGED_EVENT, ACTIVE_IDENTITY_CHANGING_EVENT, ACTIVE_IDENTITY_STORAGE_KEY, identityChangePending } from "../../v2-shell/model/identityEvents";
import { awaitPublicationReadiness } from "../../listing-create/model/useOrdinaryPublication";

/** Reads a whole revision once. Focus/locale changes never attach a newer token
 * to edited fields. Only an explicit reload or confirmed save replaces it. */
export function useHorseOwnerContext(userId: string, offerId: string) {
  const owner = useRef<PublicationActor | null>(null), currentSnapshot = useRef<OwnerHorseOfferEditSnapshot | null>(null);
  const [actor, setActor] = useState<PublicationActor | null>(null);
  const [active, setActive] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<OwnerHorseOfferEditSnapshot | null>(null);
  const refreshRef = useRef<(hard?: boolean, reload?: boolean) => void>(() => {});
  const canAct = useCallback(() => owner.current?.userId === userId && !identityChangePending(userId), [userId]);
  const adopt = useCallback((next: OwnerHorseOfferEditSnapshot) => {
    if (!owner.current || next.detail.offerId !== offerId || next.detail.identityId !== owner.current.identityId) return;
    currentSnapshot.current = next; setSnapshot(next);
  }, [offerId]);
  useEffect(() => {
    let live = true, closed = false, version = 0;
    let readAbort: AbortController | null = null;
    const suspend = () => { owner.current = null; setActive(false); setReady(false); readAbort?.abort(); ++version; };
    const refresh = (hard = false, reload = false) => {
      if (!live || closed) return;
      if (hard) suspend();
      const ticket = ++version;
      setReady(false); setError("");
      if (identityChangePending(userId)) return;
      const valid = () => live && !closed && ticket === version && !identityChangePending(userId);
      queueMicrotask(() => { void (async () => {
        try {
          const next = await awaitPublicationReadiness(getHorseDraftActor(userId));
          if (!valid()) return;
          if (next.userId !== userId || (currentSnapshot.current && currentSnapshot.current.detail.identityId !== next.identityId)) {
            suspend(); setError("identityBlocked"); return;
          }
          if (!currentSnapshot.current || reload) {
            readAbort?.abort(); readAbort = new AbortController();
            const result = await horsePublicationRequest(next, "owner-read", {expectedUserId: userId,
              expectedIdentityId: next.identityId, offerId}, readAbort.signal);
            if (!valid()) return;
            const loaded = bindHorseOwnerSnapshot(result, next, offerId);
            if (!loaded) throw new Error("loadError");
            const after = await awaitPublicationReadiness(getHorseDraftActor(userId));
            if (!valid()) return;
            if (after.userId !== next.userId || after.identityId !== next.identityId) { suspend(); setError("identityBlocked"); return; }
            currentSnapshot.current = loaded; setSnapshot(loaded);
          }
          if (!valid()) return;
          owner.current = next; setActor(next); setActive(true); setReady(true);
        } catch {
          if (valid()) { suspend(); setError("loadError"); }
        }
      })(); });
    };
    refreshRef.current = refresh;
    const changing = () => { suspend(); };
    const changed = () => refresh(true);
    const focus = () => refresh();
    const storage = (event: StorageEvent) => { if (event.key === ACTIVE_IDENTITY_STORAGE_KEY || event.key?.startsWith("sb-")) refresh(true); };
    const {data: {subscription}} = supabaseBrowserClient.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (session?.user.id !== userId) { closed = true; suspend(); setError("contextChanged"); }
    });
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, changing);
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, changed);
    window.addEventListener("focus", focus); window.addEventListener("storage", storage);
    refresh();
    return () => { live = false; ++version; readAbort?.abort(); owner.current = null;
      subscription.unsubscribe(); window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, changing);
      window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, changed);
      window.removeEventListener("focus", focus); window.removeEventListener("storage", storage); };
  }, [userId, offerId]);
  return {actor, active, ready, error, snapshot, canAct, adopt,
    retry: () => refreshRef.current(true), reload: () => refreshRef.current(false, true)};
}
