"use client";
import { useCallback } from "react";
import type { JobActor,OwnerJobCursor } from "../../../entities/job/model/types";
import { useConversationActor } from "../../listing-conversation/model/useConversationActor";
import { readOwnerJobsWithRecovery } from "./ownerJobRead";
import { useJobPage } from "./useJobPage";
export function useOwnerJobs(expected: JobActor | null,enabled: boolean) {
  const context = useConversationActor(), actor = context.actor, isCurrent = context.isCurrent;
  const matching = enabled && !!actor && context.isCurrent(actor) && actor.expectedUserId === expected?.userId && actor.expectedIdentityId === expected?.identityId;
  const key = actor ? `${actor.generation}:${actor.expectedUserId}:${actor.expectedIdentityId}` : "unverified";
  const read = useCallback((cursor: OwnerJobCursor | null,signal: AbortSignal) => {
    if (!expected || !actor) return Promise.reject(new Error("job_actor_unavailable"));
    return readOwnerJobsWithRecovery(expected,cursor,signal,{signal: actor.signal,
      isCurrent: () => isCurrent(actor) && actor.expectedUserId === expected.userId && actor.expectedIdentityId === expected.identityId});
  },[expected?.userId,expected?.identityId,actor,isCurrent]);
  const page = useJobPage(key,matching,read);
  return {...page,error: !!context.error || page.error,reload: () => {if (context.error) context.refresh(); else page.reload();}};
}
