"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { saveMyHorseOfferDraft } from "../../../entities/horse-offer/api/saveMyHorseOfferDraft";
import { updateMyHorseOfferDraft } from "../../../entities/horse-offer/api/updateMyHorseOfferDraft";
import { getHorseDraftActor } from "../../../entities/horse-offer/api/getHorseDraftActor";
import { ACTIVE_IDENTITY_CHANGED_EVENT } from "../../v2-shell/model/useV2IdentitySwitcher";
import { HorseDraftSession } from "./horseDraftSession";
import { buildHorseDraftChanges } from "./horseDraftChanges";
import { HorseOfferDraftPayloadError, buildHorseOfferDraftSaveInput, type HorseOfferDraftFormSnapshot } from "./horseOfferDraftSave";

export type HorseOfferDraftSaveSnapshot = Omit<HorseOfferDraftFormSnapshot, "offerId">;
export type HorseOfferDraftSavePhase = "idle" | "saving" | "saved" | "error" | "blocked";
type Context = { session: HorseDraftSession; ready: boolean; canAct: () => boolean };
export function useHorseOfferDraftSave(userId: string, snapshot: HorseOfferDraftSaveSnapshot | null, context?: Context) {
  const [ownSession] = useState(() => new HorseDraftSession(userId, {
    actor: getHorseDraftActor, create: saveMyHorseOfferDraft, update: updateMyHorseOfferDraft,
  }));
  const session = context?.session ?? ownSession;
  const contextRef = useRef(context); contextRef.current = context;
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [payloadError, setPayloadError] = useState<string | null>(null);
  useEffect(() => {
    session.activate();
    const refresh = () => {
      if (!contextRef.current || contextRef.current.canAct()) void session.refreshContext();
      else session.suspend();
    };
    if (!contextRef.current) window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, refresh);
    if (!contextRef.current) window.addEventListener("focus", refresh);
    const { data: { subscription } } = supabaseBrowserClient.auth.onAuthStateChange((_event, nextSession) => {
      // Synchronous only: no Supabase calls while the auth callback owns its lock.
      session.authChanged(nextSession?.user.id ?? null);
    });
    refresh();
    return () => {
      session.deactivate();
      window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      subscription.unsubscribe();
    };
  }, [session]);
  useEffect(() => {
    if (context?.ready) void session.refreshContext();
    else if (context) session.suspend();
  }, [context?.ready, session]);
  let dirty = state.baseline !== null;
  if (snapshot && state.baseline) {
    try { dirty = Object.keys(buildHorseDraftChanges(state.baseline, buildHorseOfferDraftSaveInput(snapshot))).length > 0; }
    catch { dirty = true; }
  }
  const phase: HorseOfferDraftSavePhase = state.busy ? "saving"
    : state.stop || state.context !== "ready" || (context && !context.ready) ? "blocked"
    : payloadError || state.message ? "error"
    : state.baseline && !dirty && snapshot ? "saved" : "idle";
  const save = useCallback(async () => {
    if (!snapshot || !session.canSave() || (contextRef.current && !contextRef.current.canAct())) return;
    setPayloadError(null);
    try { await session.save(buildHorseOfferDraftSaveInput(snapshot)); }
    catch (error) {
      setPayloadError(error instanceof HorseOfferDraftPayloadError
        ? "Kontrolli sünniaastat, turjakõrgust, hinda või eelarvet ja tasu perioodi."
        : "Kontrolli vormi välju. Andmeid ei saadetud.");
    }
  }, [snapshot, session]);
  return {
    phase, hasSavedDraft: state.draft !== null, hasUnsavedChanges: dirty,
    offerId: state.draft?.offerId || state.recoveryId, editRevision: state.draft?.editRevision ?? null,
    typeLocked: state.busy || state.lockedType !== null,
    contextChecking: state.context === "checking",
    canRecheck: !state.busy && !state.stop && state.context === "blocked",
    errorMessage: state.message || payloadError,
    recheck: () => { if (!contextRef.current || contextRef.current.canAct()) void session.refreshContext(); }, save,
  };
}
export type HorseOfferDraftSaveController = ReturnType<typeof useHorseOfferDraftSave>;
