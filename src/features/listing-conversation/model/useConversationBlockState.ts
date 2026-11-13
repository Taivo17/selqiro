"use client";
import { useEffect, useState } from "react";
import { providerControlsClient } from "../../../entities/viewer-provider-controls/api/providerControlsClient";
import type { ProviderControlState } from "../../../entities/viewer-provider-controls/model/types";
import { useProviderControlRevision } from "../../../shared/provider-controls/useViewerReadScope";
import type { ConversationActorContext } from "./useConversationActor";

/** The conversation target resolves its actual stored peer account. A business
 * profile's owner is not assumed to be the person on the other side of a thread. */
export function useConversationBlockState(actor: ConversationActorContext | null,
  isCurrent: (actor: ConversationActorContext) => boolean, conversationId: string, ready: boolean,
  blockedByMe: boolean, canSend: boolean) {
  const revision = useProviderControlRevision("visibility");
  const key = `${actor?.expectedUserId}:${actor?.expectedIdentityId}:${actor?.generation}:${conversationId}:${blockedByMe}:${canSend}:${revision}`;
  const [state, setState] = useState<{key: string; value: ProviderControlState | null}>({key: "", value: null});
  useEffect(() => {
    if (!actor || !ready || !isCurrent(actor)) return;
    const controller = new AbortController(), abort = () => controller.abort();
    actor.signal.addEventListener("abort", abort, {once: true}); if (actor.signal.aborted) abort();
    void providerControlsClient.get({userId: actor.expectedUserId, accessToken: actor.accessToken}, {type: "conversation", id: conversationId}, controller.signal)
      .then(value => {if (!controller.signal.aborted && isCurrent(actor)) setState({key, value});})
      .catch(() => {if (!controller.signal.aborted && isCurrent(actor)) setState({key, value: null});});
    return () => {controller.abort(); actor.signal.removeEventListener("abort", abort);};
  }, [key, actor, isCurrent, conversationId, ready]);
  const value = ready && state.key === key && state.value?.targetAvailable ? state.value : null;
  return {blockedByMe: value?.blockedByMe ?? blockedByMe, blockedByOther: value?.blockedByOther ?? false,
    loading: ready && state.key !== key, verified: !!value};
}
