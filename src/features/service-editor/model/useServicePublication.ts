"use client";
import { useEffect, useState } from "react";
import { ServicePublicationSession, type ServicePublicationJournal, type ServicePublicationView } from "../../../entities/service/model/servicePublicationSession";
import { servicePublicationRequest } from "../../../entities/service/api/servicePublicationClient";
import { putPublicationPart } from "../../../entities/listing/api/publicationJourneyClient";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { prepareListingPhoto } from "../../../entities/listing/model/listingPhotoPreparation";
import { publicationUploadOrigin } from "../../../shared/config/v2Integration";

export const servicePublicationStorageKey = (actor: PublicationActor, serviceId: string | null) =>
  `selqiro:v2:service-publication:1:${actor.userId}:${actor.identityId}:${serviceId ?? "create"}`;
const initial: ServicePublicationView = {phase: "editing", message: "", result: null, confirmed: null, currentImage: null, intent: null};
export function useServicePublication(actor: PublicationActor | null, serviceId: string | null, active: boolean, canAct: () => boolean) {
  const [session, setSession] = useState<ServicePublicationSession | null>(null), [view, setView] = useState<ServicePublicationView>(initial);
  const userId = actor?.userId, identityId = actor?.identityId;
  useEffect(() => {
    // This hook bridges an actor-bound external session. Detaching it must also
    // detach its visible snapshot; inactive actor props already gate all edits.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!userId || !identityId || !active) {setSession(null); setView(initial); return;}
    const bound = {userId, identityId}, key = servicePublicationStorageKey(bound, serviceId); let live = true;
    const controller = new ServicePublicationSession({actor: bound, serviceId,
      projectOrigin: process.env.NEXT_PUBLIC_SUPABASE_URL!, storageOrigin: publicationUploadOrigin(),
      readJournal: () => {const value = localStorage.getItem(key); return value ? JSON.parse(value) as ServicePublicationJournal : null;},
      writeJournal: value => localStorage.setItem(key, JSON.stringify(value)), clearJournal: () => localStorage.removeItem(key),
      withLock: async work => {
        if (!navigator.locks?.request) throw new Error("busy_elsewhere");
        return await navigator.locks.request(key, {ifAvailable: true}, lock => {if (!lock) throw new Error("busy_elsewhere"); return work();});
      },
      request: (action, body, signal) => servicePublicationRequest(bound, action, body, signal), putPart: putPublicationPart,
      uuid: () => crypto.randomUUID(), digest: async bytes => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await bytes.arrayBuffer()))).map(b => b.toString(16).padStart(2, "0")).join(""),
      preparePhoto: prepareListingPhoto, canAct: () => live && canAct(),
    });
    const unsubscribe = controller.subscribe(() => {if (live) setView(controller.getSnapshot());});
    // Publish the newly subscribed controller only after commit; creating one
    // during render would leak its lock/storage lifecycle on abandoned renders.
    setSession(controller); setView(controller.getSnapshot()); void controller.inspect();
    const storage = (event: StorageEvent) => {if (event.key === key) void controller.inspect();};
    const unload = (event: BeforeUnloadEvent) => {if (!["editing", "published", "closed"].includes(controller.getSnapshot().phase)) {event.preventDefault(); event.returnValue = "";}};
    window.addEventListener("storage", storage); window.addEventListener("beforeunload", unload);
    return () => {live = false; unsubscribe(); controller.invalidate(); window.removeEventListener("storage", storage); window.removeEventListener("beforeunload", unload);};
  }, [userId, identityId, serviceId, active, canAct]);
  return {session, view};
}
