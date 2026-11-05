"use client";
import {useEffect, useRef, useState} from "react";
import {getListingActivityActor} from "../../../entities/listing/api/getListingActivityActor";
import {publicationJourneyRequest} from "../../../entities/listing/api/publicationJourneyClient";
import {supabaseBrowserClient} from "../../../shared/supabase/browserClient";
import {ACTIVE_IDENTITY_CHANGED_EVENT, ACTIVE_IDENTITY_CHANGING_EVENT, ACTIVE_IDENTITY_STORAGE_KEY,
  identityChangePending} from "../../v2-shell/model/identityEvents";
import {receipt, type FinalReceipt} from "../../../server/listing-publication/final/finalContract";
import {uploadRecord} from "../../../entities/listing/model/privatePublicationUpload";
import {managedListingMedia} from "../../../entities/listing/model/listingMediaUrl";
import type {PublicationActor} from "../../../entities/listing/model/publicationJourney";
import {readManagedListingImages, removeManagedListingImage, setManagedListingPrimaryImage} from "../../../entities/listing/api/managedListingImagesClient";
import {bindManagedListingRemoveCommand, confirmManagedListingImagesReadback, ManagedListingImagesError,
  type ManagedListingImagesSnapshot, type ManagedListingRemoveCommand} from "../../../entities/listing/model/managedListingImages";
export type ManagedListingState = {actor: PublicationActor | null; receipt: FinalReceipt | null;
  activity: {status: "active" | "paused" | "sold"; activeUntil: string | null} | null; images: string[];
  gallery: ManagedListingImagesSnapshot | null; imageError: string | null; imageMessage: string | null;
  primaryBusyOrdinal: number | null; removalBusyOrdinal: number | null;
  cleanupState: "pending" | "needs_attention" | "settled" | null;
  loading: boolean; busy: boolean; error: string | null};
const initial = (): ManagedListingState => ({actor: null, receipt: null, activity: null, images: [], gallery: null,
  imageError: null, imageMessage: null, primaryBusyOrdinal: null, removalBusyOrdinal: null,
  cleanupState: null, loading: true, busy: false, error: null});
function sameImages(gallery: ManagedListingImagesSnapshot, urls: readonly string[]) {
  const expected = [...urls].sort(), actual = gallery.images.map(image => image.url).sort();
  return expected.length === actual.length && expected.every((url, index) => url === actual[index]);
}
export function useManagedListing(listingId: string) {
  const [state, setState] = useState(initial);
  const stateRef = useRef(state); stateRef.current = state;
  const generation = useRef(0), control = useRef(new AbortController()), locked = useRef(false);
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    let active = true;
    const suspend = () => {
      ++generation.current; control.current.abort(); locked.current = false;
      const next = initial(); stateRef.current = next; setState(next);
    };
    const load = (preserve: boolean) => {
      if (identityChangePending(stateRef.current.actor?.userId ?? null)) { suspend(); return; }
      if (preserve && locked.current) return;
      const previous = stateRef.current;
      const keep = preserve && previous.actor !== null && previous.receipt?.listing_id === listingId;
      const g = ++generation.current; control.current.abort(); control.current = new AbortController();
      const signal = control.current.signal; locked.current = false;
      const checking = keep ? {...previous, loading: true, busy: false, primaryBusyOrdinal: null, removalBusyOrdinal: null, error: null} : initial();
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
          let gallery: ManagedListingImagesSnapshot | null = null, imageError: string | null = null;
          if (final?.state === "published") {
            try {
              gallery = await readManagedListingImages({...actor, listingId, attemptId: final.attempt_id}, signal);
              if (!sameImages(gallery, value.images as string[])) throw new ManagedListingImagesError("unavailable");
              if (sameAttempt && previous.gallery?.images.length)
                gallery = confirmManagedListingImagesReadback(previous.gallery, gallery);
            } catch (error) {
              if (error instanceof ManagedListingImagesError && error.code === "context") throw error;
              gallery = null;
              imageError = "Piltide valikut ei saanud kontrollida. Laadi piltide seis uuesti.";
            }
          }
          if (!active || g !== generation.current || identityChangePending(actor.userId)) return;
          const next: ManagedListingState = {actor, receipt: final, activity, images: value.images as string[],
            gallery, imageError, imageMessage: null, primaryBusyOrdinal: null, removalBusyOrdinal: null,
            cleanupState, loading: false, busy: false, error: null};
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
    const focus = () => load(true);
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key === ACTIVE_IDENTITY_STORAGE_KEY || event.key?.startsWith("sb-")) invalidate();
    };
    const subscription = supabaseBrowserClient.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_OUT" || stateRef.current.actor && next?.user.id !== stateRef.current.actor.userId) invalidate();
      else if (event === "SIGNED_IN") load(true);
    }).data.subscription;
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, invalidate);
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, suspend);
    window.addEventListener("focus", focus); window.addEventListener("storage", storage); load(false);
    return () => { active = false;
      // Retire every outstanding operation, including writes started after mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ++generation.current; control.current.abort(); refreshRef.current = () => {};
      subscription.unsubscribe(); window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, invalidate);
      window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, suspend);
      window.removeEventListener("focus", focus); window.removeEventListener("storage", storage); };
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
      const next: ManagedListingState = {...current, receipt: final, images: [], gallery: null, activity: null,
        imageError: null, imageMessage: null, primaryBusyOrdinal: null, removalBusyOrdinal: null,
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
  const changeImage = async (action: "primary" | "remove", ordinal: number, confirmation?: ManagedListingRemoveCommand) => {
    const current = stateRef.current, actor = current.actor, gallery = current.gallery;
    if (locked.current || current.loading || current.error || current.imageError || !actor || !gallery
      || identityChangePending(actor.userId) || current.receipt?.state !== "published"
      || current.receipt.listing_id !== listingId || gallery.key.listingId !== listingId
      || gallery.key.userId !== actor.userId || gallery.key.identityId !== actor.identityId
      || gallery.key.attemptId !== current.receipt.attempt_id
      || !gallery.images.some(image => image.ordinal === ordinal && !image.isPrimary)) return;
    let command = {key: gallery.key, baseline: gallery, ordinal};
    if (action === "remove") {
      if (!confirmation || current.receipt.files_remaining !== 0 || gallery.images.length < 2) return;
      try {
        command = bindManagedListingRemoveCommand(confirmation);
        // A confirmation belongs to the displayed revision and target. It cannot
        // silently follow a refresh, account change or a different primary.
        if (command.ordinal !== ordinal || command.baseline.revision !== gallery.revision) return;
        confirmManagedListingImagesReadback(command.baseline, gallery);
      } catch { return; }
    }
    locked.current = true; const g = generation.current;
    const busy = {...current, busy: true, primaryBusyOrdinal: action === "primary" ? ordinal : null,
      removalBusyOrdinal: action === "remove" ? ordinal : null, imageMessage: null, imageError: null};
    stateRef.current = busy; setState(busy);
    let acknowledged = false;
    try {
      const saved = await (action === "primary" ? setManagedListingPrimaryImage : removeManagedListingImage)(command, control.current.signal);
      acknowledged = true;
      if (g !== generation.current) return;
      // Both primary and membership can advance concurrently. Confirm a current
      // authorized snapshot; the ACK alone never removes a displayed photo.
      const fresh = confirmManagedListingImagesReadback(saved.snapshot,
        await readManagedListingImages(gallery.key, control.current.signal));
      if (g !== generation.current) return;
      const next: ManagedListingState = {...stateRef.current, gallery: fresh, images: fresh.images.map(image => image.url),
        busy: false, primaryBusyOrdinal: null, removalBusyOrdinal: null, imageError: null,
        imageMessage: action === "remove" ? "Foto on kuulutusest eemaldatud."
          : fresh.images.some(image => image.ordinal === ordinal && image.isPrimary) ? "Põhipilt on salvestatud."
          : "Pilte muudeti vahepeal uuesti. Näitan viimast salvestatud seisu."};
      stateRef.current = next; setState(next);
    } catch (error) {
      if (g !== generation.current) return;
      const problem = error instanceof ManagedListingImagesError ? error : new ManagedListingImagesError("unknown");
      const failed: ManagedListingState = {...stateRef.current, busy: false, primaryBusyOrdinal: null, removalBusyOrdinal: null, imageMessage: null,
        imageError: acknowledged ? "Pildimuudatus salvestati, kuid viimast seisu ei saanud lugeda. Kontrolli piltide seisu."
          : problem.message};
      stateRef.current = failed; setState(failed);
      // The imageError keeps writes locked until a successful, authoritative
      // read. A render, timeout or released button never retries the command.
    } finally { if (g === generation.current) locked.current = false; }
  };
  return {...scoped, refresh: () => refreshRef.current(), remove, cleanup,
    setPrimary: (ordinal: number) => changeImage("primary", ordinal),
    removeImage: (command: ManagedListingRemoveCommand) => changeImage("remove", command.ordinal, command)};
}
