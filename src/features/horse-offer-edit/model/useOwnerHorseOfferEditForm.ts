"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { getMyHorseOfferEditSnapshot } from "../../../entities/horse-offer/api/getMyHorseOfferEditSnapshot";
import { getHorseDraftActor } from "../../../entities/horse-offer/api/getHorseDraftActor";
import { updateMyHorseOfferDraft } from "../../../entities/horse-offer/api/updateMyHorseOfferDraft";
import { ACTIVE_IDENTITY_CHANGED_EVENT } from "../../v2-shell/model/useV2IdentitySwitcher";
import { OwnerHorseDraftSession } from "./ownerHorseDraftSession";

/** Parent MUST key this component by user ID + offer ID. */
export function useOwnerHorseOfferEditForm(userId: string, offerId: string) {
  const [session] = useState(() => new OwnerHorseDraftSession(userId, offerId, {
    actor: getHorseDraftActor, read: getMyHorseOfferEditSnapshot, update: updateMyHorseOfferDraft,
  }));
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => {
    session.activate();
    const refresh = () => { void session.refreshContext(); };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (session.hasUnsettledWork()) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("beforeunload", beforeUnload);
    const { data: { subscription } } = supabaseBrowserClient.auth.onAuthStateChange((_event, next) => {
      // No asynchronous Supabase call inside its auth callback/lock.
      session.authChanged(next?.user.id ?? null);
    });
    refresh();
    return () => {
      session.deactivate();
      subscription.unsubscribe();
      window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [session]);
  const confirmLeave = () => !session.hasUnsettledWork()
    || (state.work === "idle" && window.confirm("Vormis on salvestamata või kontrollimata muudatusi. Kas lahkud ja loobud kohalikust sisestusest?"));
  const reload = () => {
    const replace = !!state.snapshot && !state.acknowledgement && (session.hasUnsettledWork() || !!state.problem);
    if (replace && !window.confirm("Asendan kohaliku sisestuse viimaste serveriandmetega. Salvestamata tekst kaob. Kas jätkan?")) return;
    void session.reload(replace);
  };
  const reset = () => {
    if (session.isDirty() && window.confirm("Kas loobud selles vormis tehtud salvestamata muudatustest?")) session.resetToLoaded();
  };
  return { state, session, confirmLeave, reload, reset };
}
