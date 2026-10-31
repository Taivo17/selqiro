"use client";
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
  if (!v2IntegrationEnabled() || !isConversationId(conversationId)
    || (originListingId !== null && !isConversationId(originListingId))) return <p>Vestlus ei ole kättesaadav.</p>;
  return <Suspense fallback={<p role="status">Laen vestlust…</p>}>
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
  const state = useListingConversation(conversationId, originListingId), router = useRouter();
  const { context, visible } = state;
  const root = useConversationViewport();
  const owner = visible ? visible.actor_user_id + "/" + visible.identity_id : null;
  const { historyRef, onScroll, jumpToLatest, prepareEarlier, newMessages } = useConversationScroll(
    visible?.messages ?? EMPTY_MESSAGES, owner, state.markRead, state.sentMessageId);
  const jump = () => { state.openLatest(); jumpToLatest(); };
  async function hide() { const ok = await state.hide(); if (ok) router.push("/v2/messages"); return ok; }
  return <section ref={root} className={styles.thread} aria-label="Vestlus" data-message-thread>
    <ConversationHeader peer={visible?.peer ?? null} listing={visible?.listing ?? null} ready={!!visible}
      blocked={!!visible?.blocked_by_me} busy={state.busy || state.unresolved || state.acting} onHide={hide} onBlock={state.block} />
    <div className={styles.historyWrap}>
      <div ref={historyRef} onScroll={onScroll} className={styles.history} data-conversation-history tabIndex={0} aria-label="Sõnumite ajalugu">
        {(context.loading || (state.reading && !visible)) && <p role="status">Laen vestlust…</p>}
        {context.anonymous && <Link className={styles.textButton} href={"/auth?next=" + encodeURIComponent(listingConversationHref(conversationId, originListingId))}>Vestluse lugemiseks logi sisse</Link>}
        {visible?.next_before_message_id && <button type="button" disabled={state.reading} className={styles.textButton}
          onClick={() => { prepareEarlier(); state.loadEarlier(); }}>{state.reading ? "Laen…" : "Lae varasemad sõnumid"}</button>}
        {visible && context.actor && <ConversationMessages conversationId={conversationId} messages={visible.messages}
          actor={context.actor} isCurrent={context.isCurrent} />}
        {visible && !visible.messages.length && <p className={styles.time}>Alusta vestlust oma sõnumi või fotoga.</p>}
      </div>
      {(newMessages || state.pendingLatest) && <button type="button" className={styles.newMessages} onClick={jump}>Uued sõnumid ↓</button>}
      <span className={styles.srOnly} role="status">{newMessages || state.pendingLatest ? "Saabus uusi sõnumeid" : ""}</span>
    </div>
    <div className={styles.notices} data-conversation-notices role="region" aria-label="Vestluse teated" tabIndex={0}>
    {(state.problem || context.error) && <div role="alert" className={styles.notice}>
      <p>{state.problem || context.error}</p>
      {!state.unresolved && <button type="button" className={styles.textButton} onClick={context.actor ? state.refresh : context.refresh}>Proovi uuesti</button>}
    </div>}
    {state.unresolved && state.pendingText !== null && <p className={styles.notice}>Kinnitust ootab: {state.pendingText.trim() ? state.pendingText.slice(0, 150) + (state.pendingText.length > 150 ? "…" : "") : "Foto"}</p>}
    {visible && !visible.can_send && <p className={styles.notice}>{visible.blocked_by_me
      ? "Oled selle kasutaja blokeerinud. Blokeeringut saad muuta vestluse menüüst."
      : "Selles vestluses ei saa praegu uusi sõnumeid saata."}</p>}
    {state.changed && !state.photo.waitingForActor && <p className={styles.notice} role="status">Pooleli olev sõnum kuulub eelmisele identiteedile. Tekst ja foto on alles; jätkamiseks vaheta tagasi.</p>}
    {state.photo.waitingForActor && <div className={styles.notice} role="status">
      <p>{context.error ? "Foto on valitud, kuid saatjat ei saanud kontrollida. Proovi kontrolli uuesti või eemalda foto."
        : "Foto on valitud. Kontrollin aktiivset saatjat…"}</p>
      {!!context.error && <button type="button" className={styles.textButton} onClick={context.refresh}>Kontrolli saatjat uuesti</button>}
      <button type="button" className={styles.textButton} onClick={state.photo.cancelPending}>Eemalda valitud foto</button>
    </div>}
    {state.photo.selectionProblem && <p className={styles.notice} role="status">{state.photo.selectionProblem}</p>}
    {state.incomingListingId && !state.changed && <div className={styles.notice} role="status">
      <p>Avatud on teine kuulutus. Pooleli olev sõnum ja selle kuulutusekaart on alles.</p>
      <button type="button" className={styles.textButton} disabled={!state.canAcceptIncoming} onClick={state.acceptIncomingListing}>Tühjenda tekst ja lisa uus kuulutus</button>
      {!!state.photo.photo && <p>Uue kuulutuse valimiseks eemalda esmalt pooleli olev foto.</p>}
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
