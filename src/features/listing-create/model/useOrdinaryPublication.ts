"use client";
import { useEffect, useRef, useState } from "react";
import { v2IntegrationEnabled, publicationUploadOrigin } from "../../../shared/config/v2Integration";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { getListingActivityActor } from "../../../entities/listing/api/getListingActivityActor";
import { publicationJourneyRequest, putPublicationPart } from "../../../entities/listing/api/publicationJourneyClient";
import { ACTIVE_IDENTITY_CHANGED_EVENT } from "../../v2-shell/model/useV2IdentitySwitcher";
import { OrdinaryPublicationSession, type JourneyJournal, type PublicationView } from "./ordinaryPublicationSession";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";

/** Bounds the UI wait only. In particular, an acceptance write may still finish
 * remotely after this deadline; callers must read its state before proceeding. */
export async function awaitPublicationReadiness<T>(work: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("publication_readiness_timeout")), 15000); }),
    ]);
  } finally { clearTimeout(timer); }
}

export function useOrdinaryPublication(userId: string) {
  const session = useRef<OrdinaryPublicationSession | null>(null), epoch = useRef(0);
  const [actor, setActor] = useState<PublicationActor | null>(null);
  const [view, setView] = useState<PublicationView>({phase: "editing", message: "", snapshot: null, receipt: null});
  const [contextError, setContextError] = useState<string | null>(null);
  const [contextRequest, setContextRequest] = useState(0);
  const enabled = v2IntegrationEnabled();
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const refresh = () => {
      const g = ++epoch.current; session.current?.invalidate(); session.current = null;
      setActor(null); setContextError(null); setView({phase: "editing", message: "Kontrollin aktiivset identiteeti…", snapshot: null, receipt: null});
      queueMicrotask(() => { void (async () => {
        try {
          const current = await awaitPublicationReadiness(getListingActivityActor());
          if (!alive || epoch.current !== g) return;
          if (current.userId !== userId) throw new Error("context_changed");
          const key = `selqiro:v2:publication:1:${current.userId}:${current.identityId}`;
          const s = new OrdinaryPublicationSession({actor: current, projectOrigin: process.env.NEXT_PUBLIC_SUPABASE_URL!,
            storageOrigin: publicationUploadOrigin(),
            readJournal: () => { const value = localStorage.getItem(key); return value ? JSON.parse(value) as JourneyJournal : null; },
            writeJournal: j => localStorage.setItem(key, JSON.stringify(j)), clearJournal: () => localStorage.removeItem(key),
            withLock: async work => {
              if (!navigator.locks) throw new Error("lock_unavailable");
              return navigator.locks.request(key, {ifAvailable: true}, lock => { if (!lock) throw new Error("busy_elsewhere"); return work(); });
            },
            request: (action, body, signal) => publicationJourneyRequest(current, action, body, signal),
            putPart: putPublicationPart, uuid: () => crypto.randomUUID(),
            digest: async bytes => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await bytes.arrayBuffer())), b => b.toString(16).padStart(2, "0")).join(""),
          });
          session.current = s; s.subscribe(next => { if (alive && epoch.current === g) setView(next); });
          setActor(current); await s.inspect();
        } catch { if (alive && epoch.current === g) setContextError("Aktiivset identiteeti või avaldamise taastamise võtmeid ei saanud kontrollida. Proovi uuesti; sisestatud andmed ja pildid jäävad alles."); }
      })(); });
    };
    const auth = supabaseBrowserClient.auth.onAuthStateChange((event, next) => {
      // Invalidate synchronously; defer Supabase calls until its auth lock is released.
      if (event === "SIGNED_OUT" || event === "SIGNED_IN" || (next && next.user.id !== userId)) refresh();
    }).data.subscription;
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, refresh);
    const storage = (event: StorageEvent) => { if (event.key?.startsWith("selqiro:v2:publication:1:")) refresh(); };
    window.addEventListener("storage", storage); refresh();
    return () => { alive = false; ++epoch.current; session.current?.invalidate(); session.current = null;
      window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, refresh); window.removeEventListener("storage", storage); auth.unsubscribe(); };
  }, [enabled, userId, contextRequest]);
  return {enabled, actor, view, contextError, session, epoch,
    retryContext: () => { if (contextError) setContextRequest(value => value + 1); }};
}
