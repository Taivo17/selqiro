"use client";
import { useEffect, useRef, useState } from "react";
import { hideThread, listMessageThreads, setThreadBlocked } from "../../../entities/conversation/api/messagingClient";
import type { MessageThreadCursor, MessageThreadList } from "../../../entities/conversation/model/messaging";
import { useConversationActor, type ConversationActorContext } from "./useConversationActor";
import { useConversationAutoRefresh } from "./useConversationAutoRefresh";

export function useMessageInbox() {
  const context = useConversationActor(), version = useRef(0), working = useRef(false), paginated = useRef(false);
  const mutation = useRef<symbol | null>(null);
  const [list, setList] = useState<MessageThreadList | null>(null), [reading, setReading] = useState(false);
  const [acting, setActing] = useState(false), [problem, setProblem] = useState<string | null>(null);
  async function load(actor: ConversationActorContext, cursor: MessageThreadCursor | null = null, quiet = false) {
    if (working.current || !context.isCurrent(actor)) return;
    const request = ++version.current; working.current = true; if (!quiet) setReading(true);
    try {
      const value = await listMessageThreads(actor.accessToken, { expectedUserId: actor.expectedUserId,
        expectedIdentityId: actor.expectedIdentityId, cursor }, actor.signal);
      if (!context.isCurrent(actor) || request !== version.current) return;
      setList(current => cursor && current?.identity_id === value.identity_id && current.actor_user_id === value.actor_user_id
        ? Object.freeze({ ...value, conversations: Object.freeze([...current.conversations,
          ...value.conversations.filter(row => !current.conversations.some(known => known.conversation_id === row.conversation_id))]) }) : value);
      paginated.current = cursor !== null; setProblem(null);
    } catch { if (context.isCurrent(actor) && request === version.current) setProblem("Vestlusi ei saanud värskendada. Proovi uuesti."); }
    finally { if (request === version.current) { working.current = false; setReading(false); } }
  }
  useEffect(() => {
    version.current += 1; working.current = false; paginated.current = false; mutation.current = null;
    setReading(false); setActing(false); setList(null); setProblem(null);
    if (context.actor) void load(context.actor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.actor]);
  useConversationAutoRefresh(!!context.actor, () => {
    // Preserve an explicitly paged inbox and its server activity cursor. Do not
    // splice a live first page across a potentially unseen pagination interval.
    if (context.actor && !paginated.current && !acting) void load(context.actor, null, true);
  }, 7000);
  async function action(conversationId: string, blocked: boolean | null) {
    const actor = context.actor;
    if (!actor || !context.isCurrent(actor) || mutation.current) return false;
    const operation = Symbol("inbox-action"); mutation.current = operation;
    // A poll started before a confirmed hide must not restore its stale row.
    version.current += 1; working.current = false; setReading(false);
    setActing(true); setProblem(null);
    try {
      const command = { expectedUserId: actor.expectedUserId, expectedIdentityId: actor.expectedIdentityId, conversationId };
      if (blocked === null) await hideThread(actor.accessToken, command, actor.signal);
      else await setThreadBlocked(actor.accessToken, { ...command, blocked }, actor.signal);
      if (!context.isCurrent(actor)) return false;
      if (blocked === null) setList(current => current ? Object.freeze({ ...current,
        conversations: Object.freeze(current.conversations.filter(row => row.conversation_id !== conversationId)) }) : null);
      else await load(actor);
      return true;
    } catch { if (context.isCurrent(actor)) setProblem("Muudatust ei saanud kinnitada. Proovi uuesti."); return false; }
    finally { if (mutation.current === operation) { mutation.current = null; setActing(false); } }
  }
  const visible = context.actor && list?.actor_user_id === context.actor.expectedUserId && list.identity_id === context.actor.expectedIdentityId ? list : null;
  return { context, visible, reading, acting, problem, hide: (id: string) => action(id, null), block: (id: string, blocked: boolean) => action(id, blocked),
    refresh: () => context.actor && void load(context.actor),
    more: () => context.actor && visible?.next_cursor && void load(context.actor, visible.next_cursor) };
}
