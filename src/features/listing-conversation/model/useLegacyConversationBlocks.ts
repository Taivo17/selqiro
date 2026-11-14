"use client";
import {useEffect, useRef, useState} from "react";
import {setThreadBlocked} from "../../../entities/conversation/api/messagingClient";
import {isConversationId} from "../../../entities/conversation/model/listingContact";
import {notifyProviderControlsChanged} from "../../../shared/provider-controls/providerControlEvents";
import {useConversationActor} from "./useConversationActor";
import {useConversationAutoRefresh} from "./useConversationAutoRefresh";
import {useConversationBlockState} from "./useConversationBlockState";
import {useConversationBlockRemoval} from "./useConversationBlockRemoval";

/** A small bridge for the old message page. Draft and message state stay with that page. */
export function useLegacyConversationBlocks(conversationId: string, userId: string | null,
  identityId: string | null, ready: boolean) {
  const context = useConversationActor(), operation = useRef<symbol | null>(null);
  const [busy, setBusy] = useState(false), [problem, setProblem] = useState<string | null>(null);
  const actor = context.actor;
  const key = `${conversationId}:${userId}:${identityId}:${actor?.generation}`;
  const liveKey = useRef(key); liveKey.current = key;
  useEffect(() => {operation.current = null; setBusy(false); setProblem(null);}, [key]);
  const matched = ready && isConversationId(conversationId) && !!actor && context.isCurrent(actor)
    && actor.expectedUserId === userId && actor.expectedIdentityId === identityId;
  const state = useConversationBlockState(actor, context.isCurrent, conversationId, matched, false, false);
  const removal = useConversationBlockRemoval(actor, context.isCurrent, conversationId, matched ? state.snapshot : null);
  useConversationAutoRefresh(matched, state.refresh, 5000);
  const unavailable = !matched || !state.verified;
  async function block() {
    if (!actor || !matched || unavailable || state.blockedByMe || state.blockedByOther || operation.current) return;
    if (!window.confirm("Block this user?\n\nYou will not be able to send messages to each other. Their listings will be hidden from your marketplace view.")) return;
    if (!context.isCurrent(actor)) return;
    const ticket = Symbol("legacy-block"); operation.current = ticket; setBusy(true); setProblem(null);
    try {
      await setThreadBlocked(actor.accessToken, {expectedUserId: actor.expectedUserId, expectedIdentityId: actor.expectedIdentityId,
        conversationId, blocked: true}, actor.signal);
      if (liveKey.current === key && context.isCurrent(actor)) notifyProviderControlsChanged("blocked");
    } catch {
      if (liveKey.current === key && context.isCurrent(actor)) {setProblem("The change could not be confirmed. Check the current state before trying again."); state.refresh();}
    } finally {if (operation.current === ticket) {operation.current = null; setBusy(false);}}
  }
  return {controls: removal.controls, busy, problem, blockedByMe: matched && state.blockedByMe,
    blocked: unavailable || state.blockedByMe || state.blockedByOther, readError: unavailable,
    canUnblock: removal.available && !busy, unblock: removal.open, block};
}
