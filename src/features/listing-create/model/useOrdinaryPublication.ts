"use client";

import {prepareListingPhoto} from "../../../entities/listing/model/listingPhotoPreparation";
import { useCallback, useEffect, useRef, useState } from "react";
import { v2IntegrationEnabled, publicationUploadOrigin } from "../../../shared/config/v2Integration";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { getListingActivityActor } from "../../../entities/listing/api/getListingActivityActor";
import { publicationJourneyRequest, putPublicationPart } from "../../../entities/listing/api/publicationJourneyClient";
import { ACTIVE_IDENTITY_CHANGED_EVENT, ACTIVE_IDENTITY_CHANGING_EVENT, ACTIVE_IDENTITY_STORAGE_KEY,
  identityChangePending } from "../../v2-shell/model/identityEvents";
import { OrdinaryPublicationSession, type JourneyJournal, type PublicationView } from "./ordinaryPublicationSession";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";

/** Only bounds the UI wait. A timed-out acceptance write may still finish remotely. */
export async function awaitPublicationReadiness<T>(work: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("publication_readiness_timeout")), 15000); }),
    ]);
  } finally { clearTimeout(timer); }
}

type Callbacks = {
  suspend?: () => void; accountChanged?: () => void;
};
const initialView = (): PublicationView => ({phase: "editing", message: "", snapshot: null, receipt: null});
const sameActor = (a: PublicationActor | null, b: PublicationActor) => a?.userId === b.userId && a.identityId === b.identityId;
const journalKey = (a: PublicationActor) => `selqiro:v2:publication:1:${a.userId}:${a.identityId}`;

/** Resolves the create form's actor even when ordinary publishing is disabled.
 * Focus rechecks keep the same actor's DOM and files mounted; a real context
 * change retires commands synchronously before asynchronous context reads. */
export function useOrdinaryPublication(userId: string, callbacks: Callbacks = {}) {
  const session = useRef<OrdinaryPublicationSession | null>(null), epoch = useRef(0);
  const owner = useRef<PublicationActor | null>(null), ready = useRef(false);
  const callbacksRef = useRef(callbacks); callbacksRef.current = callbacks;
  const [actor, setActor] = useState<PublicationActor | null>(null);
  const [view, setView] = useState<PublicationView>(initialView);
  const [contextReady, setContextReady] = useState(false);
  const [, setContextVersion] = useState(0);
  const [contextError, setContextError] = useState<string | null>(null);
  const [contextRequest, setContextRequest] = useState(0);
  const enabled = v2IntegrationEnabled();
  const canAct = useCallback((expected: PublicationActor) => ready.current && sameActor(owner.current, expected)
    && !identityChangePending(userId), [userId]);
  const ownsForm = useCallback((expected: PublicationActor) => sameActor(owner.current, expected)
    && !identityChangePending(userId), [userId]);

  useEffect(() => {
    let alive = true, accountClosed = false, readVersion = 0;
    const suspend = () => {
      ++epoch.current; ready.current = false; owner.current = null;
      session.current?.invalidate(); session.current = null;
      callbacksRef.current.suspend?.(); setContextReady(false);
      // A focus read may already have set ready=false. The owner ref still
      // changed, so always repaint the wrapper that hides the previous actor.
      setContextVersion(value => value + 1);
    };
    const refresh = (hard = false) => {
      if (!alive || accountClosed) return;
      if (hard) suspend();
      ready.current = false; setContextReady(false); setContextError(null);
      const version = ++readVersion;
      if (identityChangePending(userId)) return;
      // Never re-enter Supabase from its synchronous auth callback.
      queueMicrotask(() => { void (async () => {
        try {
          const current = await awaitPublicationReadiness(getListingActivityActor());
          if (!alive || accountClosed || readVersion !== version || identityChangePending(userId)) return;
          if (current.userId !== userId) throw new Error("context_changed");
          if (owner.current && !sameActor(owner.current, current)) suspend();
          const stableActor = sameActor(owner.current, current) ? owner.current! : Object.freeze({ ...current });
          owner.current = stableActor; setActor(stableActor);
          if (enabled && !session.current) {
            const key = journalKey(stableActor), generation = epoch.current;
            const s = new OrdinaryPublicationSession({actor: stableActor, projectOrigin: process.env.NEXT_PUBLIC_SUPABASE_URL!,
              storageOrigin: publicationUploadOrigin(),
              readJournal: () => { const value = localStorage.getItem(key); return value ? JSON.parse(value) as JourneyJournal : null; },
              writeJournal: j => localStorage.setItem(key, JSON.stringify(j)), clearJournal: () => localStorage.removeItem(key),
              withLock: async work => {
                if (!navigator.locks) throw new Error("lock_unavailable");
                return navigator.locks.request(key, {ifAvailable: true}, lock => { if (!lock) throw new Error("busy_elsewhere"); return work(); });
              },
              request: (action, body, signal) => publicationJourneyRequest(stableActor, action, body, signal),
              putPart: putPublicationPart, uuid: () => crypto.randomUUID(), preparePhoto: prepareListingPhoto,
              digest: async bytes => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await bytes.arrayBuffer())), b => b.toString(16).padStart(2, "0")).join(""),
            });
            session.current = s;
            s.subscribe(next => { if (alive && epoch.current === generation && session.current === s) setView(next); });
            await s.inspect();
            if (!alive || accountClosed || readVersion !== version || session.current !== s) return;
          }
          if (!alive || accountClosed || readVersion !== version || identityChangePending(userId)) return;
          ready.current = true; setContextReady(true);
        } catch {
          if (!alive || accountClosed || readVersion !== version) return;
          suspend();
          setContextError("identityUnavailable");
        }
      })(); });
    };
    const changing = () => { ++readVersion; suspend(); setContextError(null); };
    const changed = () => refresh(true);
    const focus = () => refresh(identityChangePending(userId));
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key === ACTIVE_IDENTITY_STORAGE_KEY || event.key?.startsWith("sb-")
        || (owner.current && event.key === journalKey(owner.current))) refresh(true);
    };
    const auth = supabaseBrowserClient.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_OUT" || (next && next.user.id !== userId)) {
        accountClosed = true; ++readVersion; suspend(); callbacksRef.current.accountChanged?.(); setActor(null);
      } else if (event === "SIGNED_IN") refresh(false);
    }).data.subscription;
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, changing);
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, changed);
    window.addEventListener("storage", storage); window.addEventListener("focus", focus);
    refresh();
    return () => {
      alive = false; ++readVersion; ++epoch.current; ready.current = false; owner.current = null;
      session.current?.invalidate(); session.current = null; callbacksRef.current.suspend?.();
      window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, changing);
      window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, changed);
      window.removeEventListener("storage", storage); window.removeEventListener("focus", focus); auth.unsubscribe();
    };
  }, [enabled, userId, contextRequest]);
  return {enabled, actor, view, contextReady, contextError, session, epoch, canAct, ownsForm,
    retryContext: () => { if (contextError) setContextRequest(value => value + 1); }};
}
