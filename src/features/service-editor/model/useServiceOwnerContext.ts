"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getListingActivityActor } from "../../../entities/listing/api/getListingActivityActor";
import { readServiceOwner } from "../../../entities/service/api/servicePublicationClient";
import type { ServiceOwnerSnapshot } from "../../../entities/service/model/servicePublication";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { ACTIVE_IDENTITY_CHANGED_EVENT, ACTIVE_IDENTITY_CHANGING_EVENT, ACTIVE_IDENTITY_STORAGE_KEY, identityChangePending } from "../../v2-shell/model/identityEvents";

async function readActor() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {return await Promise.race([getListingActivityActor(), new Promise<never>((_, reject) => {timer = setTimeout(() => reject(new Error("identity_unavailable")), 15000);})]);}
  finally {if (timer) clearTimeout(timer);}
}

/** Focus checks the actor, never silently rehydrates an edited form. A confirmed
 * save or an explicit reload is the only way to adopt another content revision. */
export function useServiceOwnerContext(userId: string, serviceId: string | null) {
  const owner = useRef<PublicationActor | null>(null), boundIdentity = useRef<string | null>(null), currentSnapshot = useRef<ServiceOwnerSnapshot | null>(null);
  const [actor, setActor] = useState<PublicationActor | null>(null), [active, setActive] = useState(false), [ready, setReady] = useState(false);
  const [error, setError] = useState(""), [snapshot, setSnapshot] = useState<ServiceOwnerSnapshot | null>(null);
  const refreshRef = useRef<(hard?: boolean, reload?: boolean) => void>(() => {});
  const canAct = useCallback(() => owner.current?.userId === userId && !identityChangePending(userId), [userId]);
  const adopt = useCallback((next: ServiceOwnerSnapshot) => {
    if (!owner.current || next.service.id !== serviceId || next.service.identityId !== owner.current.identityId) return;
    currentSnapshot.current = next; setSnapshot(next);
  }, [serviceId]);
  useEffect(() => {
    let live = true, closed = false, version = 0;
    let abort: AbortController | null = null;
    const suspend = () => {owner.current = null; setActive(false); setReady(false); abort?.abort(); ++version;};
    const refresh = (hard = false, reload = false) => {
      if (!live || closed) return;
      if (hard) suspend();
      const ticket = ++version;
      setReady(false); setError("");
      if (identityChangePending(userId)) return;
      const valid = () => live && !closed && ticket === version && !identityChangePending(userId);
      queueMicrotask(() => {void (async () => {
        try {
          const next = await readActor(); if (!valid()) return;
          if (next.userId !== userId || (boundIdentity.current && next.identityId !== boundIdentity.current)) {
            suspend(); setError("contextChanged"); return;
          }
          boundIdentity.current = next.identityId;
          if (serviceId && (!currentSnapshot.current || reload)) {
            abort?.abort(); abort = new AbortController();
            const loaded = await readServiceOwner(next, serviceId, abort.signal); if (!valid()) return;
            if (!loaded) {suspend(); setError("unavailable"); return;}
            const after = await readActor(); if (!valid()) return;
            if (after.userId !== next.userId || after.identityId !== next.identityId) {suspend(); setError("contextChanged"); return;}
            currentSnapshot.current = loaded; setSnapshot(loaded);
          }
          if (valid()) {owner.current = next; setActor(next); setActive(true); setReady(true);}
        } catch {if (valid()) {suspend(); setError(serviceId ? "loadError" : "identityUnavailable");}}
      })();});
    };
    refreshRef.current = refresh;
    const changing = () => suspend(), changed = () => refresh(true), focus = () => refresh();
    const storage = (event: StorageEvent) => {if (event.key === null || event.key === ACTIVE_IDENTITY_STORAGE_KEY || event.key?.startsWith("sb-")) refresh(true);};
    const {data: {subscription}} = supabaseBrowserClient.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (session?.user.id !== userId) {closed = true; suspend(); setError("contextChanged");}
    });
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, changing); window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, changed);
    window.addEventListener("focus", focus); window.addEventListener("storage", storage); refresh();
    return () => {live = false; ++version; abort?.abort(); owner.current = null; subscription.unsubscribe();
      window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, changing); window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, changed);
      window.removeEventListener("focus", focus); window.removeEventListener("storage", storage);};
  }, [userId, serviceId]);
  return {actor, active, ready, error, snapshot, canAct, adopt, retry: () => refreshRef.current(true), reload: () => refreshRef.current(false, true)};
}
