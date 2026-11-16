"use client";
import { useCallback } from "react";
import { getOwnerJobs } from "../../../entities/job/api/jobClient";
import type { JobActor,OwnerJobCursor } from "../../../entities/job/model/types";
import { useConversationActor } from "../../listing-conversation/model/useConversationActor";
import { useJobPage } from "./useJobPage";
export function useOwnerJobs(expected: JobActor | null,enabled: boolean) {
  const context = useConversationActor(), actor = context.actor;
  const matching = enabled && !!actor && context.isCurrent(actor) && actor.expectedUserId === expected?.userId && actor.expectedIdentityId === expected?.identityId;
  const key = actor ? `${actor.generation}:${actor.expectedUserId}:${actor.expectedIdentityId}` : "unverified";
  const read = useCallback((cursor: OwnerJobCursor | null,signal: AbortSignal) => {
    if (!expected) return Promise.reject(new Error("job_actor_unavailable"));
    return getOwnerJobs(expected,cursor,signal);
  },[expected?.userId,expected?.identityId]);
  const page = useJobPage(key,matching,read);
  return {...page,error: !!context.error || page.error,reload: () => {if (context.error) context.refresh(); else page.reload();}};
}
