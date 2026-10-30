"use client";
import { useEffect, useRef, useState } from "react";
import { createMessageImageClient } from "../../../entities/conversation/api/messageImages";
import { MessageImagePreparationError, prepareMessageImage } from "../../../entities/conversation/model/messageImagePreparation";
import type { PreparedMessageImage } from "../../../entities/conversation/model/messageImage";
import type { ConversationActorContext } from "./useConversationActor";
import { ACTIVE_IDENTITY_CHANGING_EVENT } from "../../v2-shell/model/identityEvents";

export type MessagePhotoDraft = Readonly<{
  owner: string; file: File; requestKey: string; prepared: PreparedMessageImage | null;
  previewUrl: string | null; attachmentId: string | null;
  state: "checking" | "preparing" | "uploading" | "ready" | "error" | "uncertain";
  error: string | null;
}>;
const ownerKey = (actor: ConversationActorContext) => actor.expectedUserId + "/" + actor.expectedIdentityId;

export function useMessagePhoto(conversationId: string, actor: ConversationActorContext | null,
  isCurrent: (actor: ConversationActorContext) => boolean, locked: boolean,
  revalidate: () => void, anonymous: boolean) {
  const [photo, setPhoto] = useState<MessagePhotoDraft | null>(null);
  const [selectionProblem, setSelectionProblem] = useState<string | null>(null);
  const current = useRef(photo), live = useRef(true), working = useRef(false), lock = useRef(locked);
  const controller = useRef<AbortController | null>(null);
  // The owner is captured before opening the native picker. Its return may fire
  // window focus (invalidating the actor) before or after the input change event.
  // This is a local selection lease, never an authorization to upload a file.
  const selectionOwner = useRef<string | null>(null);
  lock.current = locked;
  function replace(value: MessagePhotoDraft | null) {
    if (current.current?.previewUrl && current.current.previewUrl !== value?.previewUrl) URL.revokeObjectURL(current.current.previewUrl);
    current.current = value; if (live.current) setPhoto(value);
  }
  useEffect(() => {
    live.current = true;
    const changed = () => {
      const pending = selectionOwner.current !== null || current.current?.state === "checking";
      selectionOwner.current = null;
      if (current.current?.state === "checking") replace(null);
      if (pending) setSelectionProblem("Foto valimine katkestati, sest aktiivset identiteeti vahetatakse. Vali foto uuesti.");
    };
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, changed);
    return () => { live.current = false; selectionOwner.current = null; controller.current?.abort();
      window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, changed);
      if (current.current?.previewUrl) URL.revokeObjectURL(current.current.previewUrl); };
  }, []);

  async function upload(value: MessagePhotoDraft, context: ConversationActorContext) {
    if (working.current || !isCurrent(context) || value.owner !== ownerKey(context)) return;
    working.current = true;
    const aborter = new AbortController(); controller.current = aborter;
    const abort = () => aborter.abort(); context.signal.addEventListener("abort", abort, { once: true });
    let prepared = value.prepared, submitted = false;
    const update = (patch: Partial<MessagePhotoDraft>) => {
      if (live.current && current.current?.requestKey === value.requestKey) replace({ ...current.current, ...patch });
    };
    try {
      update({ state: prepared ? "uploading" : "preparing", error: null });
      if (!prepared) {
        prepared = await prepareMessageImage(value.file, aborter.signal);
        if (!live.current || current.current?.requestKey !== value.requestKey) return;
        if (aborter.signal.aborted) throw new Error("context_changed");
        update({ prepared, previewUrl: URL.createObjectURL(prepared.preview), state: "uploading" });
      }
      if (!isCurrent(context)) throw new Error("context_changed");
      submitted = true;
      const result = await createMessageImageClient().upload(context.accessToken, {
        expectedUserId: context.expectedUserId, expectedIdentityId: context.expectedIdentityId,
        conversationId, requestKey: value.requestKey,
      }, prepared, aborter.signal);
      // Store the receipt with its original owner even if the active identity changed.
      // A different identity never sees or attaches this photo.
      update({ state: "ready", attachmentId: result.attachment_id, error: null });
    } catch (error) {
      if (!submitted && !isCurrent(context)) {
        // A focus/token refresh can also happen during local decoding. Resume
        // only after the original owner has been freshly verified; no request
        // has left the browser at this point.
        update({ state: "checking", error: null });
        return;
      }
      update({ state: submitted || value.state === "uncertain" ? "uncertain" : "error",
        error: submitted || value.state === "uncertain"
          ? "Pildi laadimise tulemust ei saanud kinnitada. Proovi sama pildi laadimist uuesti."
          : error instanceof MessageImagePreparationError ? error.message
            : "Pilti ei saanud ette valmistada. Vali kuni 5 MB JPEG-, PNG- või WebP-pilt." });
    } finally { context.signal.removeEventListener("abort", abort); working.current = false; }
  }
  function beginSelection() {
    if (!live.current || !actor || !isCurrent(actor) || lock.current || current.current || working.current) return false;
    selectionOwner.current = ownerKey(actor); setSelectionProblem(null);
    return true;
  }
  function cancelSelection() { selectionOwner.current = null; }
  function choose(file: File) {
    const owner = selectionOwner.current; selectionOwner.current = null;
    if (!live.current || !owner || lock.current || current.current || working.current) return;
    if ((actor && isCurrent(actor) && ownerKey(actor) !== owner) || anonymous) {
      setSelectionProblem("Foto valimine katkestati, sest kasutaja või identiteet muutus. Vali foto uuesti."); return;
    }
    const value: MessagePhotoDraft = { owner, file, requestKey: crypto.randomUUID(),
      prepared: null, previewUrl: null, attachmentId: null, state: "checking", error: null };
    replace(value);
    // Always validate after selection, even when change precedes the native
    // picker's focus event. The stale actor is never used for an upload.
    revalidate();
  }
  useEffect(() => {
    const value = current.current;
    const owner = actor && isCurrent(actor) ? ownerKey(actor) : null;
    if (anonymous || (owner && selectionOwner.current && selectionOwner.current !== owner)) {
      const armed = selectionOwner.current !== null; selectionOwner.current = null;
      if (armed) setSelectionProblem("Foto valimine katkestati, sest kasutaja või identiteet muutus. Vali foto uuesti.");
    }
    if (!value || value.state !== "checking") return;
    if (anonymous || (owner && value.owner !== owner)) {
      replace(null); setSelectionProblem("Foto valimine katkestati, sest kasutaja või identiteet muutus. Vali foto uuesti."); return;
    }
    if (actor && owner === value.owner && !lock.current) void upload(value, actor);
    // The async upload operates on the selected file and exact actor generation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, anonymous, photo?.state, locked, isCurrent]);
  function cancelPending() {
    if (current.current?.state !== "checking" || working.current || lock.current) return;
    replace(null); setSelectionProblem(null);
  }
  function retry() {
    if (actor && isCurrent(actor) && !lock.current && current.current?.owner === ownerKey(actor)) void upload(current.current, actor);
  }
  function remove() {
    const value = current.current;
    if (!actor || !isCurrent(actor) || lock.current || !value || value.owner !== ownerKey(actor)
      || working.current || value.state === "uncertain") return;
    replace(null);
    if (value.attachmentId) {
      // The image is removed from this draft immediately. Server cleanup is best
      // effort; bounded expiry handles leaving the page or a lost cancel receipt.
      void createMessageImageClient().cancel(actor.accessToken, { expectedUserId: actor.expectedUserId,
        expectedIdentityId: actor.expectedIdentityId, conversationId, attachmentId: value.attachmentId }, actor.signal).catch(() => {});
    }
  }
  function committed(attachmentId: string | null) {
    if (attachmentId && current.current?.attachmentId === attachmentId) replace(null);
  }
  const changed = !!photo && (!actor || photo.owner !== ownerKey(actor));
  const waitingForActor = photo?.state === "checking" && (!actor || !isCurrent(actor));
  return { photo, current, changed, visiblePhoto: changed ? null : photo, choose, beginSelection, cancelSelection,
    waitingForActor, selectionProblem, cancelPending, retry, remove, committed,
    locked: working.current || photo?.state === "uncertain" };
}
