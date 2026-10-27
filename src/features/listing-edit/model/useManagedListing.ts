"use client";
import {useEffect, useRef, useState} from "react";
import {getListingActivityActor} from "../../../entities/listing/api/getListingActivityActor";
import {publicationJourneyRequest} from "../../../entities/listing/api/publicationJourneyClient";
import {supabaseBrowserClient} from "../../../shared/supabase/browserClient";
import {ACTIVE_IDENTITY_CHANGED_EVENT} from "../../v2-shell/model/useV2IdentitySwitcher";
import {receipt, type FinalReceipt} from "../../../server/listing-publication/final/finalContract";
import {uploadRecord} from "../../../entities/listing/model/privatePublicationUpload";
import {managedListingMedia} from "../../../entities/listing/model/listingMediaUrl";
import type {PublicationActor} from "../../../entities/listing/model/publicationJourney";
export type ManagedListingState = {actor: PublicationActor | null; receipt: FinalReceipt | null;
  activity: {status: "active" | "paused" | "sold"; activeUntil: string | null} | null; images: string[];
  cleanupState: "pending" | "needs_attention" | "settled" | null;
  loading: boolean; busy: boolean; error: string | null};
const initial = (): ManagedListingState => ({actor: null, receipt: null, activity: null, images: [], cleanupState: null, loading: true, busy: false, error: null});
export function useManagedListing(listingId: string) {
  const [state, setState] = useState(initial);
  const stateRef = useRef(state); stateRef.current = state;
  const generation = useRef(0), control = useRef(new AbortController()), locked = useRef(false);
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    let active = true;
    const load = (preserve: boolean) => {
      if (preserve && locked.current) return;
      const previous = stateRef.current;
      const keep = preserve && previous.actor !== null && previous.receipt?.listing_id === listingId;
      const g = ++generation.current; control.current.abort(); control.current = new AbortController();
      const signal = control.current.signal; locked.current = false;
      const checking = keep ? {...previous, loading: true, busy: false, error: null} : initial();
      stateRef.current = checking; setState(checking);
      queueMicrotask(() => { void (async () => {
        try {
          const readActor = await getListingActivityActor(); if (!active || g !== generation.current) return;
          const sameActor = keep && previous.actor?.userId === readActor.userId && previous.actor.identityId === readActor.identityId;
          // Preserve the actor object as well as the mounted editor. A fresh
          // owner-status response must not reconstruct a CAS draft/session.
          const actor = sameActor ? previous.actor! : Object.freeze({...readActor});
          if (keep && !sameActor) { stateRef.current = initial(); setState(initial()); }
          const value = uploadRecord(await publicationJourneyRequest(actor, "owner-status", {expectedUserId: actor.userId,
            expectedIdentityId: actor.identityId, listingId}, signal), ["receipt", "activity", "images"]);
          if (!active || g !== generation.current) return;
          const final = value.receipt === null ? null : receipt(value.receipt, {identityId: actor.identityId, listingId});
          let activity: ManagedListingState["activity"] = null;
          if (value.activity !== null) {
            const a = uploadRecord(value.activity, ["status", "active_until"]);
            if (!["active", "paused", "sold"].includes(String(a.status)) || a.active_until !== null
              && (typeof a.active_until !== "string" || !Number.isFinite(Date.parse(a.active_until)))) throw new Error("response");
            activity = {status: a.status as "active" | "paused" | "sold", activeUntil: a.active_until as string | null};
          }
          if (!Array.isArray(value.images) || value.images.length > 10
            || value.images.some(v => !managedListingMedia(v) || managedListingMedia(v)?.attemptId !== final?.attempt_id)) throw new Error("response");
          const sameAttempt = sameActor && previous.receipt?.attempt_id === final?.attempt_id
            && previous.receipt?.request_key === final?.request_key;
          // An owner read confirms finality; a cleanup ACK never substitutes for it.
          // Keep an unresolved cleanup observation through a refresh of this exact
          // actor/attempt only. Account, identity and listing changes clear it.
          const cleanupState: ManagedListingState["cleanupState"] = final?.files_remaining === 0 ? "settled"
            : sameAttempt && previous.cleanupState !== "settled" ? previous.cleanupState : null;
          const next = {actor, receipt: final, activity, images: value.images as string[], cleanupState, loading: false, busy: false, error: null};
          stateRef.current = next; setState(next);
        } catch { if (active && g === generation.current) {
          const retained = stateRef.current.actor === previous.actor && keep ? stateRef.current : initial();
          const failed = {...retained, loading: false, busy: false, error: "Kuulutuse haldusõigust ja seisu ei saanud kontrollida."};
          stateRef.current = failed; setState(failed);
        } }
      })(); });
    };
    refreshRef.current = () => load(true);
    const invalidate = () => load(false);
    const subscription = supabaseBrowserClient.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_OUT" || stateRef.current.actor && next?.user.id !== stateRef.current.actor.userId) invalidate();
      else if (event === "SIGNED_IN") load(true);
    }).data.subscription;
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, invalidate); load(false);
    return () => { active = false; ++generation.current; control.current.abort(); refreshRef.current = () => {};
      subscription.unsubscribe(); window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, invalidate); };
  }, [listingId]);
  const remove = async () => {
    const current = stateRef.current, actor = current.actor;
    if (locked.current || current.loading || current.error || !actor || current.receipt?.state !== "published"
      || current.receipt.listing_id !== listingId) return;
    locked.current = true; const g = generation.current;
    const busy = {...current, busy: true, error: null}; stateRef.current = busy; setState(busy);
    try {
      const result = await publicationJourneyRequest(actor, "remove", {expectedUserId: actor.userId,
        expectedIdentityId: actor.identityId, listingId}, control.current.signal);
      if (g !== generation.current) return;
      const final = receipt(result, {identityId: actor.identityId, listingId,
        attemptId: current.receipt.attempt_id, requestKey: current.receipt.request_key});
      if (!final.content_deleted || !["deleting", "deleted"].includes(final.state)) throw new Error("response");
      const next: ManagedListingState = {...current, receipt: final, images: [], activity: null,
        cleanupState: final.state === "deleted" ? "settled" : "pending", busy: false, error: null}; stateRef.current = next; setState(next);
    } catch { if (g === generation.current) {
      const failed = {...stateRef.current, busy: false, error: "Kustutamise tulemus pole kinnitatud. Kontrolli seisu enne uut tegevust."};
      stateRef.current = failed; setState(failed);
    } }
    finally { if (g === generation.current) locked.current = false; }
  };
  const scoped = state.receipt && state.receipt.listing_id !== listingId ? initial() : state;
  const cleanup = async () => {
    const current = stateRef.current, actor = current.actor, final = current.receipt;
    if (locked.current || current.loading || current.error || !actor || !final
      || !["published", "deleting"].includes(final.state) || final.files_remaining === 0 || final.listing_id !== listingId) return;
    locked.current = true; const g = generation.current;
    const busy = {...current, busy: true, error: null}; stateRef.current = busy; setState(busy);
    try {
      const result = uploadRecord(await publicationJourneyRequest(actor, "cleanup", {expectedUserId: actor.userId,
        expectedIdentityId: actor.identityId, attemptId: final.attempt_id, requestKey: final.request_key}, control.current.signal),
        ["kind", "attemptId", "filesRemaining"]);
      if (g !== generation.current) return;
      if (result.attemptId !== final.attempt_id || !["pending", "needs_attention", "settled"].includes(String(result.kind))
        || result.filesRemaining !== null && (!Number.isSafeInteger(result.filesRemaining) || Number(result.filesRemaining) < 0 || Number(result.filesRemaining) > 20)
        || (result.kind === "settled") !== (result.filesRemaining === 0)) throw new Error("response");
      locked.current = false;
      const checked: ManagedListingState = {...stateRef.current, busy: false,
        cleanupState: result.kind as ManagedListingState["cleanupState"]}; stateRef.current = checked; setState(checked);
      refreshRef.current(); // Read the authoritative final receipt; don't infer deletion from an ACK.
    } catch { if (g === generation.current) {
      const failed = {...stateRef.current, busy: false, error: "Piltide koristamise tulemust ei saanud kinnitada. Kontrolli seisu enne järgmist toimingut."};
      stateRef.current = failed; setState(failed);
    } }
    finally { if (g === generation.current) locked.current = false; }
  };
  return {...scoped, refresh: () => refreshRef.current(), remove, cleanup};
}
