"use client";
import { useEffect, useRef, useState } from "react";
import { HorsePublicationSession, type HorsePublicationJournal, type HorsePublicationView } from "../../../entities/horse-offer/model/horsePublicationSession";
import { horsePublicationRequest } from "../../../entities/horse-offer/api/horsePublicationClient";
import { putPublicationPart } from "../../../entities/listing/api/publicationJourneyClient";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { prepareListingPhoto } from "../../../entities/listing/model/listingPhotoPreparation";
import { publicationUploadOrigin } from "../../../shared/config/v2Integration";

export const horsePublicationStorageKey = (actor: PublicationActor, offerId: string | null) =>
  `selqiro:v2:horse-publication:1:${actor.userId}:${actor.identityId}:${offerId ?? "create"}`;
const initial: HorsePublicationView = {phase: "editing", message: "", result: null, confirmed: null, currentImage: null, intent: null};

/** Language and focus readiness are deliberately absent from the controller
 * identity. A hard actor change aborts local work and retains its own journal. */
export function useHorsePublication(actor: PublicationActor | null, offerId: string | null, active: boolean, canAct: () => boolean) {
  const [session, setSession] = useState<HorsePublicationSession | null>(null);
  const [view, setView] = useState<HorsePublicationView>(initial);
  const permitted = useRef(canAct); permitted.current = canAct;
  const userId = actor?.userId, identityId = actor?.identityId;
  useEffect(() => {
    if (!userId || !identityId || !active) { setSession(null); setView(initial); return; }
    const bound = {userId, identityId}, key = horsePublicationStorageKey(bound, offerId);
    let live = true;
    const controller = new HorsePublicationSession({actor: bound, offerId,
      projectOrigin: process.env.NEXT_PUBLIC_SUPABASE_URL!, storageOrigin: publicationUploadOrigin(),
      readJournal: () => { const value = localStorage.getItem(key); return value ? JSON.parse(value) as HorsePublicationJournal : null; },
      writeJournal: value => { localStorage.setItem(key, JSON.stringify(value)); }, clearJournal: () => localStorage.removeItem(key),
      withLock: async work => {
        if (!navigator.locks?.request) return Promise.reject(new Error("busy_elsewhere"));
        return await navigator.locks.request(key, {ifAvailable: true}, lock => {
          if (!lock) throw new Error("busy_elsewhere"); return work();
        });
      },
      request: (action, body, signal) => horsePublicationRequest(bound, action, body, signal), putPart: putPublicationPart,
      uuid: () => crypto.randomUUID(), digest: async bytes => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await bytes.arrayBuffer())))
        .map(b => b.toString(16).padStart(2, "0")).join(""), preparePhoto: prepareListingPhoto,
      canAct: () => live && permitted.current(),
    });
    const unsubscribe = controller.subscribe(() => { if (live) setView(controller.getSnapshot()); });
    setSession(controller); setView(controller.getSnapshot()); void controller.inspect();
    const storage = (event: StorageEvent) => { if (event.key === key) void controller.inspect(); };
    const unload = (event: BeforeUnloadEvent) => {
      if (!["editing", "published", "closed"].includes(controller.getSnapshot().phase)) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("storage", storage); window.addEventListener("beforeunload", unload);
    return () => { live = false; unsubscribe(); controller.invalidate(); window.removeEventListener("storage", storage); window.removeEventListener("beforeunload", unload); };
  }, [userId, identityId, offerId, active]);
  return {session, view};
}
