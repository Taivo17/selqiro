"use client";
import { uiMessage } from "../../../../lib/i18n/interfaceMessage";

import { useEffect, useRef, useState } from "react";
import { getOfferMessageThread, hideThread, sendOfferMessage, setThreadBlocked } from "../../../entities/conversation/api/messagingClient";
import { copySendOfferMessage, sameOfferOrigin, messageOfferMatchesCard,
  type MessageOfferIntent, type OfferMessageThread, type SendOfferMessageCommand } from "../../../entities/conversation/model/offerMessaging";
import { ListingContactError } from "../../../entities/conversation/model/listingContact";
import type { ListingMessageCard } from "../../../entities/conversation/model/listingMessageCards";
import { consumeOfferOrigin } from "./listingConversationNavigation";
import { useConversationActor, type ConversationActorContext } from "./useConversationActor";
import { useConversationAutoRefresh } from "./useConversationAutoRefresh";
import { useMessagePhoto } from "./useMessagePhoto";
import { useThreadReadWatermark } from "./useThreadReadWatermark";
import { hasThreadGap, mergeThreadMessages } from "./threadMessages";
import { notifyProviderControlsChanged } from "../../../shared/provider-controls/providerControlEvents";
import { useProviderControlRevision } from "../../../shared/provider-controls/useViewerReadScope";

type Draft = Readonly<{ owner: string | null; text: string; offer: MessageOfferIntent | null; listing: ListingMessageCard | null; revision: number }>;
type Attempt = Readonly<{ command: SendOfferMessageCommand; origin: MessageOfferIntent | null; revision: number }>;
const actorKey = (a: Pick<ConversationActorContext, "expectedUserId" | "expectedIdentityId">) => a.expectedUserId + "/" + a.expectedIdentityId;

export function useListingConversation(conversationId: string, originOffer: MessageOfferIntent | null) {
  const context = useConversationActor();
  const controlRevision = useProviderControlRevision("visibility"), seenControlRevision = useRef(controlRevision);
  const [view, setView] = useState<OfferMessageThread | null>(null), viewRef = useRef(view);
  const [latestPage, setLatestPage] = useState<OfferMessageThread | null>(null);
  const [draft, setDraft] = useState<Draft>({ owner: null, text: "", offer: originOffer, listing: null, revision: 0 });
  const draftRef = useRef(draft), attempt = useRef<Attempt | null>(null);
  const [busy, setBusy] = useState(false), [reading, setReading] = useState(false), [acting, setActing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null), [unresolved, setUnresolved] = useState(false);
  const [incomingOffer, setIncomingOffer] = useState<MessageOfferIntent | null>(null), [sentMessageId, setSentMessageId] = useState<string | null>(null);
  const incoming = useRef<MessageOfferIntent | null>(null), observedOrigin = useRef(originOffer);
  const sending = useRef(false), readVersion = useRef(0), readingNow = useRef(false), actingNow = useRef(false);
  const photo = useMessagePhoto(conversationId, context.actor, context.isCurrent, busy || unresolved, context.refresh, context.anonymous);
  const markRead = useThreadReadWatermark(conversationId, context.actor, context.isCurrent);

  function replaceView(value: OfferMessageThread | null) { viewRef.current = value; setView(value); }
  function replaceDraft(value: Draft) { draftRef.current = value; setDraft(value); }
  function queueOrigin(value: MessageOfferIntent | null) { incoming.current = value; setIncomingOffer(value); }
  async function load(actor: ConversationActorContext, before: string | null = null, quiet = false) {
    if (!context.isCurrent(actor)) return;
    const version = ++readVersion.current; readingNow.current = true;
    if (!quiet) setReading(true);
    const currentDraft = draftRef.current;
    const offer = currentDraft.owner === null || currentDraft.owner === actorKey(actor) ? currentDraft.offer : null;
    try {
      const result = await getOfferMessageThread(actor.accessToken, { expectedUserId: actor.expectedUserId,
        expectedIdentityId: actor.expectedIdentityId, conversationId, beforeMessageId: before,
        attachmentOfferType: offer?.type ?? null, attachmentOfferId: offer?.id ?? null }, actor.signal);
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
      if ((!attempt.current || result.attachment_offer === null) && latestDraft.owner === actorKey(actor)
        && (latestDraft.offer?.type ?? null) === result.attachment_offer_type
        && (latestDraft.offer?.id ?? null) === result.attachment_offer_id) replaceDraft({ ...latestDraft, listing: result.attachment_offer });
      if (!unresolved) setProblem(null);
    } catch {
      if (context.isCurrent(actor) && version === readVersion.current) setProblem(viewRef.current
        ? uiMessage("could_not_load_new_messages_we_will_try_again_automatically")
        : uiMessage("could_not_load_the_conversation_try_refreshing"));
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
      if (current.owner === null && current.offer !== null) replaceDraft({ ...current, owner: actorKey(actor) });
      void load(actor);
    }
    // Immutable generation and AbortSignal belong to the actor hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.actor]);
  useConversationAutoRefresh(!!context.actor, () => {
    if (context.actor && !readingNow.current && !sending.current && !actingNow.current) void load(context.actor, null, true);
  });
  useEffect(() => {
    if (seenControlRevision.current === controlRevision) return;
    seenControlRevision.current = controlRevision;
    if (context.actor && !sending.current && !actingNow.current) void load(context.actor, null, true);
    // A preference event refreshes permissions without clearing the text/photo draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlRevision, context.actor]);
  function adoptOrigin(offer: MessageOfferIntent) {
    const actor = context.actor, current = draftRef.current;
    replaceDraft({ owner: actor ? actorKey(actor) : null, text: "", offer, listing: null, revision: current.revision + 1 });
    queueOrigin(null); setProblem(null);
    if (actor && context.isCurrent(actor)) void load(actor);
  }
  useEffect(() => {
    if (sameOfferOrigin(originOffer, observedOrigin.current)) return;
    observedOrigin.current = originOffer;
    if (originOffer === null || sameOfferOrigin(originOffer, draftRef.current.offer)) return;
    if (!draftRef.current.text && !photo.current.current && !attempt.current && !sending.current) adoptOrigin(originOffer);
    else queueOrigin(originOffer);
    // A different incoming offer never silently relabels an existing draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originOffer]);
  function changeBody(text: string) {
    const actor = context.actor, current = draftRef.current;
    if (!actor || !context.isCurrent(actor) || unresolved || photo.changed
      || (current.owner !== null && current.owner !== actorKey(actor))) return;
    replaceDraft({ ...current, text, revision: current.revision + 1,
      owner: text || current.offer || photo.current.current ? actorKey(actor) : null });
  }
  function removeAttachment() {
    const actor = context.actor, current = draftRef.current;
    if (!actor || !context.isCurrent(actor) || sending.current || attempt.current || current.owner !== actorKey(actor)) return;
    consumeOfferOrigin(conversationId, current.offer);
    replaceDraft({ ...current, offer: null, listing: null, revision: current.revision + 1,
      owner: current.text || photo.current.current ? actorKey(actor) : null });
  }
  function acceptIncomingOffer() {
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
        if (current.offer !== null && !messageOfferMatchesCard(current.offer, current.listing)) return;
        if (image && (image.owner !== actorKey(actor) || image.state !== "ready" || !image.attachmentId)) return;
        frozen = Object.freeze({ command: copySendOfferMessage({ expectedUserId: actor.expectedUserId, expectedIdentityId: actor.expectedIdentityId,
          requestKey: crypto.randomUUID(), conversationId, message: current.text, offerType: current.offer?.type ?? null, offerId: current.offer?.id ?? null,
          attachmentId: image?.attachmentId ?? null }), origin: current.offer, revision: current.revision });
      }
    } catch { setProblem(uiMessage("enter_a_message_of_up_to_5000_characters_or_add_a_photo")); return; }
    attempt.current = frozen; sending.current = true; setBusy(true); setProblem(null);
    try {
      const receipt = await sendOfferMessage(actor.accessToken, frozen.command, actor.signal);
      if (!context.isCurrent(actor)) { setUnresolved(true); return; }
      attempt.current = null; setUnresolved(false); setSentMessageId(receipt.message_id);
      consumeOfferOrigin(conversationId, frozen.origin);
      photo.committed(frozen.command.attachmentId);
      const latestDraft = draftRef.current, nextOffer = incoming.current;
      if (latestDraft.revision === frozen.revision) {
        replaceDraft({ owner: nextOffer ? actorKey(actor) : null, text: "", offer: nextOffer, listing: null, revision: latestDraft.revision + 1 });
        queueOrigin(null);
      } else if (latestDraft.owner === actorKey(actor) || latestDraft.owner === null) {
        // A later draft survives a slow receipt. The offer intent belongs to
        // the earlier confirmed message and must not silently repeat.
        replaceDraft({ ...latestDraft, offer: null, listing: null, owner: latestDraft.text ? actorKey(actor) : null });
      }
      await load(actor);
    } catch (error) {
      const refused = !retrying && error instanceof ListingContactError && error.code === "refused"
        && error.diagnostic?.stage === "rpc" && error.diagnostic.code === "refused";
      if (refused) {
        attempt.current = null; setUnresolved(false);
        if (context.isCurrent(actor)) { await load(actor); setProblem(uiMessage("the_message_was_not_sent_check_the_photo_or_listing_card_and_try_again")); }
      } else {
        setUnresolved(true);
        if (context.isCurrent(actor)) setProblem(uiMessage("the_send_result_could_not_be_confirmed_the_arrow_retries_the_same_message_w"));
      }
    } finally { sending.current = false; setBusy(false); }
  }
  async function action(kind: "hide" | "block"): Promise<boolean> {
    const actor = context.actor;
    if (!actor || !context.isCurrent(actor) || actingNow.current || sending.current || attempt.current) return false;
    actingNow.current = true; setActing(true); setProblem(null);
    try {
      const command = { expectedUserId: actor.expectedUserId, expectedIdentityId: actor.expectedIdentityId, conversationId };
      if (kind === "hide") await hideThread(actor.accessToken, command, actor.signal);
      else await setThreadBlocked(actor.accessToken, { ...command, blocked: true }, actor.signal);
      if (!context.isCurrent(actor)) return false;
      if (kind === "block") {notifyProviderControlsChanged("blocked"); await load(actor);}
      return true;
    } catch { if (context.isCurrent(actor)) setProblem(uiMessage("the_change_could_not_be_confirmed_try_again")); return false; }
    finally { actingNow.current = false; setActing(false); }
  }
  const actor = context.actor;
  const changed = photo.changed || (draft.owner !== null && (!actor || draft.owner !== actorKey(actor)))
    || (!!attempt.current && (!actor || actorKey(attempt.current.command) !== actorKey(actor)));
  const visible = actor && view?.actor_user_id === actor.expectedUserId && view.identity_id === actor.expectedIdentityId ? view : null;
  const attachmentRequested = !changed && draft.offer !== null;
  const attachment = attachmentRequested && visible ? draft.listing : null;
  const image = photo.visiblePhoto;
  const canSend = !busy && !acting && !changed && !!visible?.can_send
    && (unresolved || ((!!draft.text.trim() || image?.state === "ready") && Array.from(draft.text).length <= 5000
      && (!image || image.state === "ready") && (!attachmentRequested || !!attachment)));
  return { context, visible, body: changed ? "" : draft.text, busy, reading, acting, problem, unresolved, changed, photo,
    attachmentRequested, attachment, attachmentUnavailable: attachmentRequested && !!visible && !reading && !attachment,
    incomingOffer, canAcceptIncoming: !photo.photo && !busy && !unresolved && !changed,
    canSend, send, changeBody, removeAttachment, acceptIncomingOffer, sentMessageId, markRead,
    pendingText: unresolved && !changed && attempt.current ? attempt.current.command.message : null,
    pendingLatest: !!latestPage, openLatest: () => { if (latestPage && actor && latestPage.identity_id === actor.expectedIdentityId) { replaceView(latestPage); setLatestPage(null); } },
    refresh: () => actor && !readingNow.current && void load(actor),
    loadEarlier: () => actor && visible?.next_before_message_id && !readingNow.current && void load(actor, visible.next_before_message_id),
    hide: () => action("hide"), block: () => action("block"),
  };
}
