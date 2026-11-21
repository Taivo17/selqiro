"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getActiveIdentity } from "../../../entities/identity/api/getActiveIdentity";
import type { IdentitySummary } from "../../../entities/identity/model/types";
import { getJobPolicies, getOwnerJob } from "../../../entities/job/api/jobClient";
import { jobUuid } from "../../../entities/job/model/jobContent";
import type { JobPolicy } from "../../../entities/job/model/types";
import { useConversationActor } from "../../listing-conversation/model/useConversationActor";
import { browserJobPendingStore } from "./jobPending";
import { JobSession, type JobSessionView } from "./jobSession";
const EMPTY: JobSessionView = {phase: "blocked",job: null,pending: null,message: null,completion: 0};
const noSubscribe = () => () => {};
type Bound = {key: string; session: JobSession};
/** Auth changes suspend writes immediately; a focus recheck does not discard a same-identity form. */
export function useJobEditor(scope: string) {
  const context = useConversationActor(), current = useRef(context); current.current = context;
  const binding = useRef<Bound | null>(null), [bound,setBound] = useState<Bound | null>(null);
  const permitted = useRef(false), generation = useRef(0);
  const [resource,setResource] = useState<{key: string; identity: IdentitySummary | null; policies: readonly JobPolicy[]; loading: boolean; error: boolean}>({key: "",identity: null,policies: [],loading: true,error: false});
  const [refresh,setRefresh] = useState(0);
  useEffect(() => {
    const actor = context.actor, ticket = ++generation.current; permitted.current = false;
    if (!actor) {
      binding.current?.session.suspend();
      if (context.anonymous) {binding.current?.session.retire(); binding.current = null; setBound(null);}
      return;
    }
    const key = `${actor.expectedUserId}:${actor.expectedIdentityId}:${scope}`;
    if (binding.current && binding.current.key !== key) {binding.current.session.retire(); binding.current = null; setBound(null);}
    const stillCurrent = () => generation.current === ticket && current.current.isCurrent(actor);
    setResource(previous => ({key, identity: previous.key === key ? previous.identity : null, policies: [],loading: true,error: false}));
    const abort = () => {permitted.current = false; binding.current?.session.suspend();};
    actor.signal.addEventListener("abort",abort,{once: true});
    void (async () => {
      try {
        if (scope !== "new" && !jobUuid(scope)) throw new Error("invalid_job");
        const identity = await getActiveIdentity({userId: actor.expectedUserId});
        if (!stillCurrent()) return;
        if (!identity || identity.id !== actor.expectedIdentityId) throw new Error("identity_changed");
        if (identity.type !== "business" && identity.type !== "private") throw new Error("identity_unavailable");
        const newBinding = binding.current?.key !== key;
        if (newBinding) {
          binding.current?.session.retire();
          const pair = {userId: actor.expectedUserId,identityId: actor.expectedIdentityId};
          const session = new JobSession({actor: pair,scope,store: browserJobPendingStore(pair,scope),
            canAct: () => {const now = current.current.actor; return permitted.current && !!now && current.current.isCurrent(now) && now.expectedUserId === pair.userId && now.expectedIdentityId === pair.identityId;},
            signal: () => current.current.actor?.signal ?? null});
          binding.current = {key,session}; setBound(binding.current);
        }
        const session = binding.current!.session;
        const [policies,job] = await Promise.all([getJobPolicies({userId: actor.expectedUserId,identityId: actor.expectedIdentityId},actor.signal),
          !session.getSnapshot().job && session.getJobId() ? getOwnerJob({userId: actor.expectedUserId,identityId: actor.expectedIdentityId},session.getJobId()!,actor.signal) : Promise.resolve(null)]);
        if (!stillCurrent()) return;
        if (job) session.adopt(job);
        permitted.current = true; setResource({key,identity,policies,loading: false,error: false});
      } catch {if (stillCurrent()) setResource({key,identity: null,policies: [],loading: false,error: true});}
    })();
    return () => {actor.signal.removeEventListener("abort",abort);};
  },[context.actor,context.anonymous,scope,refresh]);
  useEffect(() => () => {++generation.current; permitted.current = false; binding.current?.session.retire();},[]);
  const view = useSyncExternalStore(bound?.session.subscribe ?? noSubscribe,bound?.session.getSnapshot ?? (() => EMPTY),() => EMPTY);
  const actor = context.actor, key = actor ? `${actor.expectedUserId}:${actor.expectedIdentityId}:${scope}` : null;
  const ready = !!actor && context.isCurrent(actor) && resource.key === key && !resource.loading && !resource.error;
  return {context,bound,view,identity: resource.key === key ? resource.identity : null,policies: resource.key === key ? resource.policies : [],
    ready,loading: context.loading || resource.loading, error: !!context.error || resource.error,
    reload: () => {setRefresh(value => value + 1); if (context.error) context.refresh();}};
}
