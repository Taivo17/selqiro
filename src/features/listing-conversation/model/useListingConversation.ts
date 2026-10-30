"use client";
import { useEffect, useRef, useState } from "react";
import { getListingConversationWithListings, sendListingMessage } from "../../../entities/conversation/api/managedConversationClient";
import { copyListingMessageCommand, ListingContactError, type ListingMessageCommand } from "../../../entities/conversation/model/listingContact";
import type { ConversationCardView, ListingMessageCard } from "../../../entities/conversation/model/listingMessageCards";
import { consumeListingOrigin } from "./listingConversationNavigation";
import { useConversationActor, type ConversationActorContext } from "./useConversationActor";

type Draft = Readonly<{ owner: string | null; text: string; listingId: string | null; listing: ListingMessageCard | null }>;
const actorKey = (a: Pick<ConversationActorContext, "expectedUserId" | "expectedIdentityId">) =>
  a.expectedUserId + "/" + a.expectedIdentityId;

export function useListingConversation(conversationId: string, originListingId: string | null) {
  const context = useConversationActor();
  const [view, setView] = useState<ConversationCardView | null>(null);
  const [draft, setDraft] = useState<Draft>({ owner: null, text: "", listingId: originListingId, listing: null });
  const draftRef = useRef(draft), attempt = useRef<ListingMessageCommand | null>(null);
  const [busy, setBusy] = useState(false), [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null), [unresolved, setUnresolved] = useState(false);
  const [incomingListingId, setIncomingListingId] = useState<string | null>(null);
  const incoming = useRef<string | null>(null), observedOrigin = useRef(originListingId);
  const sending = useRef(false), readVersion = useRef(0), readingNow = useRef(false);
  const displayedActor = useRef<string | null>(null);

  function replaceDraft(value: Draft) { draftRef.current = value; setDraft(value); }
  function queueOrigin(value: string | null) { incoming.current = value; setIncomingListingId(value); }

  async function load(actor: ConversationActorContext, before: string | null = null) {
    const version = ++readVersion.current;
    readingNow.current = true; setReading(true);
    const currentDraft = draftRef.current;
    const attachmentListingId = currentDraft.owner === null || currentDraft.owner === actorKey(actor)
      ? currentDraft.listingId : null;
    try {
      const result = await getListingConversationWithListings(actor.accessToken, {
        expectedUserId: actor.expectedUserId, expectedIdentityId: actor.expectedIdentityId,
        conversationId, beforeMessageId: before, attachmentListingId,
      }, actor.signal);
      if (!context.isCurrent(actor) || version !== readVersion.current) return;
      displayedActor.current = actorKey(actor);
      setView(current => before !== null && current && current.actor_user_id === result.actor_user_id
        && current.identity_id === result.identity_id
        ? Object.freeze({ ...result, messages: Object.freeze([...result.messages, ...current.messages]) }) : result);
      const latestDraft = draftRef.current;
      // A lost receipt keeps the visible intent together with its immutable
      // request. Refreshing must not relabel it; an unavailable/scrubbed preview
      // can still disappear without changing the immutable retry's listing ID.
      if ((!attempt.current || result.attachment_listing === null) && latestDraft.owner === actorKey(actor)
        && latestDraft.listingId === result.attachment_listing_id)
        replaceDraft({ ...latestDraft, listing: result.attachment_listing });
      setProblem(null);
    } catch {
      if (context.isCurrent(actor) && version === readVersion.current) {
        setView(null); setProblem("Vestlust ei saanud laadida. Proovi värskendada.");
      }
    } finally {
      if (version === readVersion.current) { readingNow.current = false; setReading(false); }
    }
  }

  useEffect(() => {
    readVersion.current += 1; displayedActor.current = null;
    readingNow.current = false; setReading(false); setView(null); setProblem(null);
    const actor = context.actor;
    if (actor) {
      const current = draftRef.current;
      if (current.owner === null && current.listingId !== null) replaceDraft({ ...current, owner: actorKey(actor) });
      void load(actor);
    }
    // Actor objects carry an immutable generation and cancellation signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.actor]);

  function adoptOrigin(listingId: string) {
    const actor = context.actor;
    replaceDraft({ owner: actor ? actorKey(actor) : null, text: "", listingId, listing: null });
    queueOrigin(null); setProblem(null);
    if (actor && context.isCurrent(actor)) void load(actor);
  }

  useEffect(() => {
    if (originListingId === observedOrigin.current) return;
    observedOrigin.current = originListingId;
    // Native URL consumption can remove the query without resetting this draft.
    if (originListingId === null || originListingId === draftRef.current.listingId) return;
    if (!draftRef.current.text && !attempt.current && !sending.current) adoptOrigin(originListingId);
    else queueOrigin(originListingId);
    // A new source URL must never relabel an existing message or an uncertain send.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originListingId]);

  function changeBody(text: string) {
    const actor = context.actor, current = draftRef.current;
    if (!actor || !context.isCurrent(actor) || sending.current || attempt.current
      || (current.owner !== null && current.owner !== actorKey(actor))) return;
    replaceDraft({ ...current, text, owner: text || current.listingId ? actorKey(actor) : null });
  }

  function removeAttachment() {
    const actor = context.actor, current = draftRef.current;
    if (!actor || !context.isCurrent(actor) || sending.current || attempt.current
      || current.owner !== actorKey(actor)) return;
    consumeListingOrigin(conversationId, current.listingId);
    replaceDraft({ ...current, listingId: null, listing: null, owner: current.text ? actorKey(actor) : null });
  }

  function acceptIncomingListing() {
    const actor = context.actor;
    if (!incoming.current || !actor || !context.isCurrent(actor) || sending.current || attempt.current
      || (draftRef.current.owner !== null && draftRef.current.owner !== actorKey(actor))) return;
    adoptOrigin(incoming.current);
  }

  async function send() {
    const actor = context.actor, current = draftRef.current;
    if (!actor || !context.isCurrent(actor) || sending.current || readingNow.current
      || displayedActor.current !== actorKey(actor) || !view?.can_send
      || (current.owner !== null && current.owner !== actorKey(actor))) return;
    let command = attempt.current;
    const retryingUnconfirmedAttempt = command !== null;
    try {
      if (command && (actorKey(command) !== actorKey(actor) || command.message !== current.text
        || command.listingId !== current.listingId)) return;
      if (!command) {
        if (current.listingId !== null && current.listing?.id !== current.listingId) return;
        command = copyListingMessageCommand({ expectedUserId: actor.expectedUserId,
          expectedIdentityId: actor.expectedIdentityId, requestKey: crypto.randomUUID(),
          conversationId, message: current.text, listingId: current.listingId });
      }
    } catch { setProblem("Sisesta kuni 5000 märgi pikkune sõnum."); return; }
    attempt.current = command; sending.current = true; setBusy(true); setProblem(null);
    try {
      await sendListingMessage(actor.accessToken, command, actor.signal);
      if (!context.isCurrent(actor)) { setUnresolved(true); return; }
      attempt.current = null; setUnresolved(false);
      consumeListingOrigin(conversationId, command.listingId);
      const nextListing = incoming.current;
      replaceDraft({ owner: nextListing ? actorKey(actor) : null, text: "", listingId: nextListing, listing: null });
      queueOrigin(null);
      await load(actor);
    } catch (error) {
      // A first, explicit RPC rejection did not commit. Keep the text editable
      // so an expired attachment can be removed. A rejection after a lost
      // receipt cannot disprove that earlier commit: retain that exact retry.
      const rejectedBeforeCommit = !retryingUnconfirmedAttempt && error instanceof ListingContactError
        && error.code === "refused" && error.diagnostic?.stage === "rpc" && error.diagnostic.code === "refused";
      if (rejectedBeforeCommit) {
        attempt.current = null; setUnresolved(false);
        if (context.isCurrent(actor)) {
          await load(actor);
          if (context.isCurrent(actor)) setProblem("Sõnumit ei saadetud. Kontrolli kuulutusekaarti või eemalda see ja proovi uuesti.");
        }
      } else {
        setUnresolved(true);
        if (context.isCurrent(actor)) setProblem("Saatmise tulemust ei saanud kinnitada. Proovi sama saatmist uuesti; sõnum jääb üheks.");
      }
    } finally { sending.current = false; setBusy(false); }
  }

  const actor = context.actor;
  const changed = draft.owner !== null && (!actor || draft.owner !== actorKey(actor));
  const visible = actor && displayedActor.current === actorKey(actor) ? view : null;
  const attachmentRequested = !changed && draft.listingId !== null;
  const attachment = attachmentRequested && visible ? draft.listing : null;
  const attachmentUnavailable = attachmentRequested && !!visible && !reading && !attachment;
  const canSend = !busy && !reading && !changed && !!visible?.can_send && !!draft.text.trim()
    && (unresolved || !attachmentRequested || !!attachment);
  return { context, visible, body: changed ? "" : draft.text, busy, reading, problem, unresolved,
    changed, attachmentRequested, attachment, attachmentUnavailable, incomingListingId,
    canSend, send, changeBody, removeAttachment, acceptIncomingListing,
    loadEarlier: () => actor && visible?.next_before_message_id && void load(actor, visible.next_before_message_id),
  };
}
