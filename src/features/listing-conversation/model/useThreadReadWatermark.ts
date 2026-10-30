"use client";
import { useRef } from "react";
import { markThreadRead } from "../../../entities/conversation/api/messagingClient";
import type { ConversationActorContext } from "./useConversationActor";

export function useThreadReadWatermark(conversationId: string, actor: ConversationActorContext | null,
  isCurrent: (actor: ConversationActorContext) => boolean) {
  const state = useRef({ owner: "", acknowledged: "0", queued: "0", working: false });
  const key = actor ? actor.expectedUserId + "/" + actor.expectedIdentityId : "";
  async function mark(messageId: string) {
    if (!actor || !isCurrent(actor) || document.visibilityState !== "visible") return;
    if (state.current.owner !== key) state.current = { owner: key, acknowledged: "0", queued: "0", working: false };
    const snapshot = state.current;
    if (BigInt(messageId) > BigInt(snapshot.queued)) snapshot.queued = messageId;
    if (snapshot.working || BigInt(snapshot.queued) <= BigInt(snapshot.acknowledged)) return;
    snapshot.working = true;
    const target = snapshot.queued;
    try {
      const receipt = await markThreadRead(actor.accessToken, { expectedUserId: actor.expectedUserId,
        expectedIdentityId: actor.expectedIdentityId, conversationId, throughMessageId: target }, actor.signal);
      if (isCurrent(actor) && state.current === snapshot) snapshot.acknowledged = receipt.through_message_id;
    } catch { /* A failed acknowledgement never fabricates a read receipt. */ }
    finally { snapshot.working = false; }
    if (isCurrent(actor) && state.current === snapshot && BigInt(snapshot.queued) > BigInt(target)) void mark(snapshot.queued);
  }
  return mark;
}
