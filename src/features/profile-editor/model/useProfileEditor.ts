"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useConversationActor } from "../../listing-conversation/model/useConversationActor";
import { notifyIdentityResolutionNeeded } from "../../v2-shell/model/identityEvents";
import { profileEditorClient } from "../api/profileEditorClient";
import { profileEditorFailure } from "./profileEditor";
import { ProfileEditorSession, type ProfileEditorView } from "./profileEditorSession";

type Bound = {key: string; session: ProfileEditorSession};
type Resource = {key: string; loading: boolean; error: "readError" | "forbidden" | "actorChanged" | "authChanged" | null};
const emptySubscribe = () => () => {};
const emptySnapshot = (): ProfileEditorView | null => null;

export function useProfileEditor() {
  const context = useConversationActor(), current = useRef(context); current.current = context;
  const binding = useRef<Bound | null>(null), [bound, setBound] = useState<Bound | null>(null);
  const generation = useRef(0), permitted = useRef(false);
  const [resource, setResource] = useState<Resource>({key: "", loading: true, error: null});
  useEffect(() => {
    const actor = context.actor, ticket = ++generation.current;
    permitted.current = false;
    if (!actor) {
      binding.current?.session.suspend();
      if (context.anonymous) {binding.current?.session.retire(); binding.current = null; setBound(null);}
      return;
    }
    const key = `${actor.expectedUserId}:${actor.expectedIdentityId}`;
    if (binding.current?.key !== key) {binding.current?.session.retire(); binding.current = null; setBound(null);}
    const stillCurrent = () => generation.current === ticket && current.current.isCurrent(actor);
    const abort = () => {permitted.current = false; binding.current?.session.suspend();};
    actor.signal.addEventListener("abort", abort, {once: true});
    setResource({key, loading: true, error: null});
    void (async () => {
      try {
        const snapshot = await profileEditorClient.read({userId: actor.expectedUserId, identityId: actor.expectedIdentityId,
          accessToken: actor.accessToken, signal: actor.signal});
        if (!stillCurrent()) return;
        if (!binding.current) {
          const pair = {userId: actor.expectedUserId, identityId: actor.expectedIdentityId};
          const session = new ProfileEditorSession({actor: pair, initial: snapshot, client: profileEditorClient,
            context: () => {
              const now = current.current.actor;
              return permitted.current && now && current.current.isCurrent(now)
                && now.expectedUserId === pair.userId && now.expectedIdentityId === pair.identityId
                ? {...pair, accessToken: now.accessToken, signal: now.signal} : null;
            }, confirmed: notifyIdentityResolutionNeeded});
          binding.current = {key, session}; setBound(binding.current);
        }
        permitted.current = true;
        setResource({key, loading: false, error: null});
        binding.current.session.revalidate(snapshot);
      } catch (error) {
        if (!stillCurrent()) return;
        const kind = profileEditorFailure(error).kind;
        if (["forbidden", "authChanged", "actorChanged"].includes(kind)) {
          binding.current?.session.retire(); binding.current = null; setBound(null);
        }
        setResource({key, loading: false, error: kind === "forbidden" || kind === "authChanged" || kind === "actorChanged" ? kind : "readError"});
      }
    })();
    return () => {actor.signal.removeEventListener("abort", abort);};
  }, [context.actor, context.anonymous]);
  useEffect(() => () => {++generation.current; permitted.current = false; binding.current?.session.retire();}, []);
  const view = useSyncExternalStore(bound?.session.subscribe ?? emptySubscribe, bound?.session.getSnapshot ?? emptySnapshot, emptySnapshot);
  const actor = context.actor, key = actor ? `${actor.expectedUserId}:${actor.expectedIdentityId}` : null;
  const matches = !!actor && bound?.key === key && context.isCurrent(actor);
  const ready = matches && resource.key === key && !resource.loading && !resource.error;
  return {context, session: matches ? bound?.session ?? null : null, view: matches ? view : null,
    ready, loading: context.loading || (!!actor && resource.loading), error: context.error ? "authChanged" as const : resource.key === key ? resource.error : null,
    refresh: context.refresh};
}
