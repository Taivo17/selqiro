"use client";
import { useEffect, useRef, useState } from "react";
import { getMessageThread, hideThread, sendMessage, setThreadBlocked } from "../../../entities/conversation/api/messagingClient";
import { copySendMessage } from "../../../entities/conversation/model/messagingCommands";
import { ListingContactError } from "../../../entities/conversation/model/listingContact";
import type { MessageThread, SendMessageCommand } from "../../../entities/conversation/model/messaging";
import type { ListingMessageCard } from "../../../entities/conversation/model/listingMessageCards";
import { consumeListingOrigin } from "./listingConversationNavigation";
import { useConversationActor, type ConversationActorContext } from "./useConversationActor";
import { useConversationAutoRefresh } from "./useConversationAutoRefresh";
import { useMessagePhoto } from "./useMessagePhoto";
import { useThreadReadWatermark } from "./useThreadReadWatermark";
import { hasThreadGap, mergeThreadMessages } from "./threadMessages";

type Draft = Readonly<{ owner: string | null; text: string; listingId: string | null; listing: ListingMessageCard | null; revision: number }>;
type Attempt = Readonly<{ command: SendMessageCommand; revision: number }>;
const actorKey = (a: Pick<ConversationActorContext, "expectedUserId" | "expectedIdentityId">) => a.expectedUserId + "/" + a.expectedIdentityId;

export function useListingConversation(conversationId: string, originListingId: string | null) {
  const context = useConversationActor();
  const [view, setView] = useState<MessageThread | null>(null), viewRef = useRef(view);
  const [latestPage, setLatestPage] = useState<MessageThread | null>(null);
  const [draft, setDraft] = useState<Draft>({ owner: null, text: "", listingId: originListingId, listing: null, revision: 0 });
  const draftRef = useRef(draft), attempt = useRef<Attempt | null>(null);
  const [busy, setBusy] = useState(false), [reading, setReading] = useState(false), [acting, setActing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null), [unresolved, setUnresolved] = useState(false);
  const [incomingListingId, setIncomingListingId] = useState<string | null>(null), [sentMessageId, setSentMessageId] = useState<string | null>(null);
  const incoming = useRef<string | null>(null), observedOrigin = useRef(originListingId);
  const sending = useRef(false), readVersion = useRef(0), readingNow = useRef(false), actingNow = useRef(false);
  const photo = useMessagePhoto(conversationId, context.actor, context.isCurrent, busy || unresolved);
  const markRead = useThreadReadWatermark(conversationId, context.actor, context.isCurrent);

  function replaceView(value: MessageThread | null) { viewRef.current = value; setView(value); }
  function replaceDraft(value: Draft) { draftRef.current = value; setDraft(value); }
  function queueOrigin(value: string | null) { incoming.current = value; setIncomingListingId(value); }
  async function load(actor: ConversationActorContext, before: string | null = null, quiet = false) {
    if (!context.isCurrent(actor)) return;
    const version = ++readVersion.current; readingNow.current = true;
    if (!quiet) setReading(true);
    const currentDraft = draftRef.current;
    const attachmentListingId = currentDraft.owner === null || currentDraft.owner === actorKey(actor) ? currentDraft.listingId : null;
    try {
      const result = await getMessageThread(actor.accessToken, { expectedUserId: actor.expectedUserId,
        expectedIdentityId: actor.expectedIdentityId, conversationId, beforeMessageId: before, attachmentListingId }, actor.signal);
      if (!context.isCurrent(actor) || version !== readVersion.current) return;
      const current = viewRef.current;
      const same = current?.actor_user_id === result.actor_user_id && current.identity_id === result.identity_id;
      if (same && current && before !== null) {
        replaceView(Object.freeze({ ...result, messages: mergeThreadMessages(result.messages, current.messages) }));
      } else if (same && current && hasThreadGap(current, result)) {
        setLatestPage(result);
        replaceView(Object.freeze({ ...result, messages: current.messages, next_before_message_id: current.next_before_message_id }));
      } else if (same && current) {
        replaceView(Object.freeze({ ...result, messages: mergeThreadMessages(current.messages, result.messages),
          next_before_message_id: current.messages.length ? current.next_before_message_id : result.next_before_message_id }));
        setLatestPage(null);
      } else { replaceView(result); setLatestPage(null); }
      const latestDraft = draftRef.current;
      if ((!attempt.current || result.attachment_listing === null) && latestDraft.owner === actorKey(actor)
        && latestDraft.listingId === result.attachment_listing_id) replaceDraft({ ...latestDraft, listing: result.attachment_listing });
      if (!unresolved) setProblem(null);
    } catch {
      if (context.isCurrent(actor) && version === readVersion.current) setProblem(viewRef.current
        ? "Uusi sõnumeid ei saanud laadida. Proovime automaatselt uuesti."
        : "Vestlust ei saanud laadida. Proovi värskendada.");
    } finally { if (version === readVersion.current) { readingNow.current = false; setReading(false); } }
  }
  useEffect(() => {
    readVersion.current += 1; readingNow.current = false; setReading(false); setView(null); setLatestPage(null); setProblem(null);
    // Keep the last loaded interval private while the actor is revalidated.
    // A successful new response may merge it only for the exact same user and
    // identity; no cached messages render before that response.
    const actor = context.actor;
    if (actor) {
      const current = draftRef.current;
      if (current.owner === null && current.listingId !== null) replaceDraft({ ...current, owner: actorKey(actor) });
      void load(actor);
    }
    // Immutable generation and AbortSignal belong to the actor hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.actor]);
  useConversationAutoRefresh(!!context.actor, () => {
    if (context.actor && !readingNow.current && !sending.current && !actingNow.current) void load(context.actor, null, true);
  });
  function adoptOrigin(listingId: string) {
    const actor = context.actor, current = draftRef.current;
    replaceDraft({ owner: actor ? actorKey(actor) : null, text: "", listingId, listing: null, revision: current.revision + 1 });
    queueOrigin(null); setProblem(null);
    if (actor && context.isCurrent(actor)) void load(actor);
  }
  useEffect(() => {
    if (originListingId === observedOrigin.current) return;
    observedOrigin.current = originListingId;
    if (originListingId === null || originListingId === draftRef.current.listingId) return;
    if (!draftRef.current.text && !photo.current.current && !attempt.current && !sending.current) adoptOrigin(originListingId);
    else queueOrigin(originListingId);
    // A different incoming listing never silently relabels an existing draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originListingId]);
  function changeBody(text: string) {
    const actor = context.actor, current = draftRef.current;
    if (!actor || !context.isCurrent(actor) || unresolved || photo.changed
      || (current.owner !== null && current.owner !== actorKey(actor))) return;
    replaceDraft({ ...current, text, revision: current.revision + 1,
      owner: text || current.listingId || photo.current.current ? actorKey(actor) : null });
  }
  function removeAttachment() {
    const actor = context.actor, current = draftRef.current;
    if (!actor || !context.isCurrent(actor) || sending.current || attempt.current || current.owner !== actorKey(actor)) return;
    consumeListingOrigin(conversationId, current.listingId);
    replaceDraft({ ...current, listingId: null, listing: null, revision: current.revision + 1,
      owner: current.text || photo.current.current ? actorKey(actor) : null });
  }
  function acceptIncomingListing() {
    const actor = context.actor;
    if (!incoming.current || !actor || !context.isCurrent(actor) || sending.current || attempt.current || photo.current.current
      || (draftRef.current.owner !== null && draftRef.current.owner !== actorKey(actor))) return;
    adoptOrigin(incoming.current);
  }
  async function send() {
    const actor = context.actor, current = draftRef.current, image = photo.current.current;
    if (!actor || !context.isCurrent(actor) || sending.current || actingNow.current
      || viewRef.current?.actor_user_id !== actor.expectedUserId || viewRef.current.identity_id !== actor.expectedIdentityId || !viewRef.current.can_send
      || (current.owner !== null && current.owner !== actorKey(actor)) || photo.changed) return;
    const retrying = !!attempt.current;
    let frozen = attempt.current;
    try {
      if (frozen && actorKey(frozen.command) !== actorKey(actor)) return;
      if (!frozen) {
        if (current.listingId !== null && current.listing?.id !== current.listingId) return;
        if (image && (image.owner !== actorKey(actor) || image.state !== "ready" || !image.attachmentId)) return;
        frozen = Object.freeze({ command: copySendMessage({ expectedUserId: actor.expectedUserId, expectedIdentityId: actor.expectedIdentityId,
          requestKey: crypto.randomUUID(), conversationId, message: current.text, listingId: current.listingId,
          attachmentId: image?.attachmentId ?? null }), revision: current.revision });
      }
    } catch { setProblem("Sisesta kuni 5000 märgi pikkune sõnum või lisa foto."); return; }
    attempt.current = frozen; sending.current = true; setBusy(true); setProblem(null);
    try {
      const receipt = await sendMessage(actor.accessToken, frozen.command, actor.signal);
      if (!context.isCurrent(actor)) { setUnresolved(true); return; }
      attempt.current = null; setUnresolved(false); setSentMessageId(receipt.message_id);
      consumeListingOrigin(conversationId, frozen.command.listingId);
      photo.committed(frozen.command.attachmentId);
      const latestDraft = draftRef.current, nextListing = incoming.current;
      if (latestDraft.revision === frozen.revision) {
        replaceDraft({ owner: nextListing ? actorKey(actor) : null, text: "", listingId: nextListing, listing: null, revision: latestDraft.revision + 1 });
        queueOrigin(null);
      } else if (latestDraft.owner === actorKey(actor) || latestDraft.owner === null) {
        // A later draft survives a slow receipt. The listing intent belongs to
        // the earlier confirmed message and must not silently repeat.
        replaceDraft({ ...latestDraft, listingId: null, listing: null, owner: latestDraft.text ? actorKey(actor) : null });
      }
      await load(actor);
    } catch (error) {
      const refused = !retrying && error instanceof ListingContactError && error.code === "refused"
        && error.diagnostic?.stage === "rpc" && error.diagnostic.code === "refused";
      if (refused) {
        attempt.current = null; setUnresolved(false);
        if (context.isCurrent(actor)) { await load(actor); setProblem("Sõnumit ei saadetud. Kontrolli fotot või kuulutusekaarti ja proovi uuesti."); }
      } else {
        setUnresolved(true);
        if (context.isCurrent(actor)) setProblem("Saatmise tulemust ei saanud kinnitada. Noolega proovid sama sõnumit uuesti; uut koopiat ei tehta. Hiljem kirjutatud tekst jääb alles.");
      }
    } finally { sending.current = false; setBusy(false); }
  }
  async function action(blocked: boolean | null): Promise<boolean> {
    const actor = context.actor;
    if (!actor || !context.isCurrent(actor) || actingNow.current || sending.current || attempt.current) return false;
    actingNow.current = true; setActing(true); setProblem(null);
    try {
      const command = { expectedUserId: actor.expectedUserId, expectedIdentityId: actor.expectedIdentityId, conversationId };
      if (blocked === null) await hideThread(actor.accessToken, command, actor.signal);
      else await setThreadBlocked(actor.accessToken, { ...command, blocked }, actor.signal);
      if (!context.isCurrent(actor)) return false;
      if (blocked !== null) await load(actor);
      return true;
    } catch { if (context.isCurrent(actor)) setProblem("Muudatust ei saanud kinnitada. Proovi uuesti."); return false; }
    finally { actingNow.current = false; setActing(false); }
  }
  const actor = context.actor;
  const changed = photo.changed || (draft.owner !== null && (!actor || draft.owner !== actorKey(actor)))
    || (!!attempt.current && (!actor || actorKey(attempt.current.command) !== actorKey(actor)));
  const visible = actor && view?.actor_user_id === actor.expectedUserId && view.identity_id === actor.expectedIdentityId ? view : null;
  const attachmentRequested = !changed && draft.listingId !== null;
  const attachment = attachmentRequested && visible ? draft.listing : null;
  const image = photo.visiblePhoto;
  const canSend = !busy && !acting && !changed && !!visible?.can_send
    && (unresolved || ((!!draft.text.trim() || image?.state === "ready") && Array.from(draft.text).length <= 5000
      && (!image || image.state === "ready") && (!attachmentRequested || !!attachment)));
  return { context, visible, body: changed ? "" : draft.text, busy, reading, acting, problem, unresolved, changed, photo,
    attachmentRequested, attachment, attachmentUnavailable: attachmentRequested && !!visible && !reading && !attachment,
    incomingListingId, canAcceptIncoming: !photo.photo && !busy && !unresolved && !changed,
    canSend, send, changeBody, removeAttachment, acceptIncomingListing, sentMessageId, markRead,
    pendingText: unresolved && !changed && attempt.current ? attempt.current.command.message : null,
    pendingLatest: !!latestPage, openLatest: () => { if (latestPage && actor && latestPage.identity_id === actor.expectedIdentityId) { replaceView(latestPage); setLatestPage(null); } },
    refresh: () => actor && !readingNow.current && void load(actor),
    loadEarlier: () => actor && visible?.next_before_message_id && !readingNow.current && void load(actor, visible.next_before_message_id),
    hide: () => action(null), block: (blocked: boolean) => action(blocked),
  };
}
