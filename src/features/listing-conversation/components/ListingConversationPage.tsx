"use client";

import { renderUiMessage } from "@/lib/i18n/interfaceMessage";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { messagesUiMessages } from "@/lib/i18n/catalogs/messagesUi";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { isConversationId } from "../../../entities/conversation/model/listingContact";
import type { MessageThreadMessage } from "../../../entities/conversation/model/messaging";
import { listingConversationHref } from "../model/listingConversationNavigation";
import { useListingConversation } from "../model/useListingConversation";
import { useConversationScroll } from "../model/useConversationScroll";
import { useConversationViewport } from "../model/useConversationViewport";
import ConversationHeader from "./ConversationHeader";
import ConversationMessages from "./ConversationMessages";
import MessageComposer from "./MessageComposer";
import styles from "./conversation.module.css";

type Props = { conversationId: string; originListingId?: string | null };
const EMPTY_MESSAGES: readonly MessageThreadMessage[] = Object.freeze([]);
export default function ListingConversationPage({ conversationId, originListingId = null }: Props) {
  const { t } = useV2Translation(messagesUiMessages);

  if (!v2IntegrationEnabled() || !isConversationId(conversationId)
    || (originListingId !== null && !isConversationId(originListingId))) return <p>{t("this_conversation_is_unavailable")}</p>;
  return <Suspense fallback={<p role="status">{t("loading_conversation")}</p>}>
    <ConversationLocation conversationId={conversationId} originListingId={originListingId} />
  </Suspense>;
}
function ConversationLocation({ conversationId, originListingId = null }: Props) {
  const params = useSearchParams(), listingIds = params?.getAll("listing");
  const currentOrigin = listingIds
    ? listingIds.length === 1 && isConversationId(listingIds[0]) ? listingIds[0] : null
    : originListingId;
  return <ManagedConversation key={conversationId} conversationId={conversationId} originListingId={currentOrigin} />;
}
function ManagedConversation({ conversationId, originListingId = null }: Props) {
  const { language: uiLanguage, t } = useV2Translation(messagesUiMessages);

  const state = useListingConversation(conversationId, originListingId), router = useRouter();
  const { context, visible } = state;
  const root = useConversationViewport();
  const owner = visible ? visible.actor_user_id + "/" + visible.identity_id : null;
  const { historyRef, onScroll, jumpToLatest, prepareEarlier, newMessages } = useConversationScroll(
    visible?.messages ?? EMPTY_MESSAGES, owner, state.markRead, state.sentMessageId);
  const jump = () => { state.openLatest(); jumpToLatest(); };
  async function hide() { const ok = await state.hide(); if (ok) router.push("/v2/messages"); return ok; }
  return <section ref={root} className={styles.thread} aria-label={t("conversation")} data-message-thread>
    <ConversationHeader peer={visible?.peer ?? null} listing={visible?.listing ?? null} ready={!!visible}
      blocked={!!visible?.blocked_by_me} busy={state.busy || state.unresolved || state.acting} onHide={hide} onBlock={state.block} />
    <div className={styles.historyWrap}>
      <div ref={historyRef} onScroll={onScroll} className={styles.history} data-conversation-history tabIndex={0} aria-label={t("message_history")}>
        {(context.loading || (state.reading && !visible)) && <p role="status">{t("loading_conversation")}</p>}
        {context.anonymous && <Link className={styles.textButton} href={"/auth?next=" + encodeURIComponent(listingConversationHref(conversationId, originListingId))}>{t("sign_in_to_read_this_conversation")}</Link>}
        {visible?.next_before_message_id && <button type="button" disabled={state.reading} className={styles.textButton}
          onClick={() => { prepareEarlier(); state.loadEarlier(); }}>{state.reading ? t("loading") : t("load_earlier_messages")}</button>}
        {visible && context.actor && <ConversationMessages conversationId={conversationId} messages={visible.messages}
          actor={context.actor} isCurrent={context.isCurrent} />}
        {visible && !visible.messages.length && <p className={styles.time}>{t("start_the_conversation_with_a_message_or_photo")}</p>}
      </div>
      {(newMessages || state.pendingLatest) && <button type="button" className={styles.newMessages} onClick={jump}>{t("new_messages")}</button>}
      <span className={styles.srOnly} role="status">{newMessages || state.pendingLatest ? t("new_messages_received") : ""}</span>
    </div>
    <div className={styles.notices} data-conversation-notices role="region" aria-label={t("conversation_notices")} tabIndex={0}>
    {(state.problem || context.error) && <div role="alert" className={styles.notice}>
      <p>{renderUiMessage(uiLanguage, state.problem || context.error)}</p>
      {!state.unresolved && <button type="button" className={styles.textButton} onClick={context.actor ? state.refresh : context.refresh}>{t("try_again")}</button>}
    </div>}
    {state.unresolved && state.pendingText !== null && <p className={styles.notice}>{t("awaiting_confirmation")} {state.pendingText.trim() ? state.pendingText.slice(0, 150) + (state.pendingText.length > 150 ? "…" : "") : t("photo_2")}</p>}
    {visible && !visible.can_send && <p className={styles.notice}>{visible.blocked_by_me
      ? t("you_have_blocked_this_user_you_can_change_this_in_the_conversation_menu")
      : t("new_messages_cannot_currently_be_sent_in_this_conversation")}</p>}
    {state.changed && !state.photo.waitingForActor && <p className={styles.notice} role="status">{t("the_pending_message_belongs_to_your_previous_identity_its_text_and_photo_ar")}</p>}
    {state.photo.waitingForActor && <div className={styles.notice} role="status">
      <p>{context.error ? t("a_photo_is_selected_but_the_sender_could_not_be_verified_check_again_or_rem")
        : t("photo_selected_checking_the_active_sender")}</p>
      {!!context.error && <button type="button" className={styles.textButton} onClick={context.refresh}>{t("check_sender_again")}</button>}
      <button type="button" className={styles.textButton} onClick={state.photo.cancelPending}>{t("remove_selected_photo")}</button>
    </div>}
    {state.photo.selectionProblem && <p className={styles.notice} role="status">{renderUiMessage(uiLanguage, state.photo.selectionProblem)}</p>}
    {state.incomingListingId && !state.changed && <div className={styles.notice} role="status">
      <p>{t("another_listing_is_open_your_pending_message_and_its_listing_card_are_retai")}</p>
      <button type="button" className={styles.textButton} disabled={!state.canAcceptIncoming} onClick={state.acceptIncomingListing}>{t("clear_text_and_add_the_new_listing")}</button>
      {!!state.photo.photo && <p>{t("remove_the_pending_photo_before_choosing_a_new_listing")}</p>}
    </div>}
    </div>
    <MessageComposer identity={visible?.actor ?? null} text={state.body} canSend={state.canSend} busy={state.busy} unresolved={state.unresolved}
      disabled={state.changed || !visible?.can_send || state.acting} onText={state.changeBody} onSend={state.send}
      photo={state.photo.visiblePhoto} photoLocked={state.photo.locked} onPhoto={state.photo.choose} onRetryPhoto={state.photo.retry}
      onPhotoPickerOpen={state.photo.beginSelection} onPhotoPickerCancel={state.photo.cancelSelection}
      onRemovePhoto={state.photo.remove} attachmentRequested={state.attachmentRequested} attachment={state.attachment}
      attachmentUnavailable={state.attachmentUnavailable} onRemoveAttachment={state.removeAttachment} />
  </section>;
}
