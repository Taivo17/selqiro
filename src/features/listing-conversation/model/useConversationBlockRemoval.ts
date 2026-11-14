"use client";
import type {ProviderControlState} from "../../../entities/viewer-provider-controls/model/types";
import {useProviderControls} from "../../viewer-provider-controls/model/useProviderControls";
import type {ConversationActorContext} from "./useConversationActor";

/** The stored conversation peer supplies the block row; a profile owner is never substituted. */
export function useConversationBlockRemoval(actor: ConversationActorContext | null,
  isCurrent: (actor: ConversationActorContext) => boolean, conversationId: string, snapshot: ProviderControlState | null) {
  const controls = useProviderControls({
    key: `conversation:${conversationId}:${actor?.expectedUserId}:${actor?.expectedIdentityId}:${actor?.generation}`,
    signal: actor?.signal,
    isCurrent: () => !!actor && isCurrent(actor),
  });
  const available = !!actor && isCurrent(actor) && snapshot?.actorUserId === actor.expectedUserId
    && snapshot.target.type === "conversation" && snapshot.target.id === conversationId
    && snapshot.targetAvailable && snapshot.blockedByMe && !!snapshot.blockId && !!snapshot.blockCreatedAt;
  return {controls, available, open: () => {
    if (available && snapshot) controls.session.openBlockRemoval(snapshot);
  }};
}
