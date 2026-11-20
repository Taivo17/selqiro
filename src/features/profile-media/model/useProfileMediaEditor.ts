"use client";
import {useEffect, useRef, useState, useSyncExternalStore} from "react";
import type {useConversationActor} from "../../listing-conversation/model/useConversationActor";
import {notifyIdentityResolutionNeeded} from "../../v2-shell/model/identityEvents";
import {profileMediaClient, ProfileMediaClientError} from "../api/profileMediaClient";
import {ProfileMediaSession, type ProfileMediaView} from "./profileMediaSession";

type ActorState = ReturnType<typeof useConversationActor>;
type Bound = {key: string; session: ProfileMediaSession};
const emptySubscribe = () => () => {};
const emptySnapshot = (): ProfileMediaView | null => null;

/** Lives beside the text hook so a file-picker focus refresh cannot unmount its draft. */
export function useProfileMediaEditor(context: ActorState) {
  const current = useRef(context); current.current = context;
  const binding = useRef<Bound | null>(null), [bound, setBound] = useState<Bound | null>(null);
  const generation = useRef(0), permitted = useRef(false);
  const [resource, setResource] = useState<{key: string; loading: boolean; error: "readError" | "forbidden" | null}>({key: "", loading: true, error: null});
  useEffect(() => {
    const actor = context.actor, ticket = ++generation.current; permitted.current = false;
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
        const snapshot = await profileMediaClient.snapshot(actor);
        if (!stillCurrent()) return;
        if (!binding.current) {
          const pair = {expectedUserId: actor.expectedUserId, expectedIdentityId: actor.expectedIdentityId};
          const session = new ProfileMediaSession({actor: pair, initial: snapshot, client: profileMediaClient,
            context: () => {
              const now = current.current.actor;
              return permitted.current && now && current.current.isCurrent(now) && now.expectedUserId === pair.expectedUserId
                && now.expectedIdentityId === pair.expectedIdentityId ? now : null;
            }, confirmed: notifyIdentityResolutionNeeded});
          binding.current = {key, session}; setBound(binding.current);
        }
        permitted.current = true; setResource({key, loading: false, error: null}); binding.current.session.revalidate(snapshot);
      } catch (error) {
        if (!stillCurrent()) return;
        setResource({key, loading: false, error: error instanceof ProfileMediaClientError && error.kind === "forbidden" ? "forbidden" : "readError"});
      }
    })();
    return () => {actor.signal.removeEventListener("abort", abort);};
  }, [context.actor, context.anonymous]);
  useEffect(() => () => {++generation.current; permitted.current = false; binding.current?.session.retire();}, []);
  const view = useSyncExternalStore(bound?.session.subscribe ?? emptySubscribe, bound?.session.getSnapshot ?? emptySnapshot, emptySnapshot);
  const actor = context.actor, key = actor ? `${actor.expectedUserId}:${actor.expectedIdentityId}` : null;
  const same = !context.anonymous && (!actor || bound?.key === key);
  const ready = !!actor && bound?.key === key && context.isCurrent(actor) && resource.key === key && !resource.loading && !resource.error;
  return {session: same ? bound?.session ?? null : null, view: same ? view : null, ready,
    loading: context.loading || resource.loading, error: resource.key === key ? resource.error : null, refresh: context.refresh};
}
export type ProfileMediaEditorState = ReturnType<typeof useProfileMediaEditor>;
