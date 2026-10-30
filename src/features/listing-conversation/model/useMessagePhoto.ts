"use client";
import { useEffect, useRef, useState } from "react";
import { createMessageImageClient } from "../../../entities/conversation/api/messageImages";
import { prepareMessageImage } from "../../../entities/conversation/model/messageImagePreparation";
import type { PreparedMessageImage } from "../../../entities/conversation/model/messageImage";
import type { ConversationActorContext } from "./useConversationActor";

export type MessagePhotoDraft = Readonly<{
  owner: string; file: File; requestKey: string; prepared: PreparedMessageImage | null;
  previewUrl: string | null; attachmentId: string | null;
  state: "preparing" | "uploading" | "ready" | "error" | "uncertain";
  error: string | null;
}>;
const ownerKey = (actor: ConversationActorContext) => actor.expectedUserId + "/" + actor.expectedIdentityId;

export function useMessagePhoto(conversationId: string, actor: ConversationActorContext | null,
  isCurrent: (actor: ConversationActorContext) => boolean, locked: boolean) {
  const [photo, setPhoto] = useState<MessagePhotoDraft | null>(null);
  const current = useRef(photo), live = useRef(true), working = useRef(false), lock = useRef(locked);
  const controller = useRef<AbortController | null>(null);
  lock.current = locked;
  function replace(value: MessagePhotoDraft | null) {
    if (current.current?.previewUrl && current.current.previewUrl !== value?.previewUrl) URL.revokeObjectURL(current.current.previewUrl);
    current.current = value; if (live.current) setPhoto(value);
  }
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; controller.current?.abort(); if (current.current?.previewUrl) URL.revokeObjectURL(current.current.previewUrl); };
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
    } catch {
      update({ state: submitted || value.state === "uncertain" ? "uncertain" : "error",
        error: submitted || value.state === "uncertain"
          ? "Pildi laadimise tulemust ei saanud kinnitada. Proovi sama pildi laadimist uuesti."
          : "Pilti ei saanud ette valmistada. Vali kuni 5 MB JPEG-, PNG- või WebP-pilt." });
    } finally { context.signal.removeEventListener("abort", abort); working.current = false; }
  }
  function choose(file: File) {
    if (!actor || !isCurrent(actor) || lock.current || current.current || working.current) return;
    const value: MessagePhotoDraft = { owner: ownerKey(actor), file, requestKey: crypto.randomUUID(),
      prepared: null, previewUrl: null, attachmentId: null, state: "preparing", error: null };
    replace(value); void upload(value, actor);
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
  return { photo, current, changed, visiblePhoto: changed ? null : photo, choose, retry, remove, committed,
    locked: working.current || photo?.state === "uncertain" };
}
