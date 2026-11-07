"use client";

import { renderUiMessage } from "@/lib/i18n/interfaceMessage";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";
import { localeForLanguage } from "@/lib/i18n/useTranslation";

import { messagesUiMessages } from "@/lib/i18n/catalogs/messagesUi";

import Link from "next/link";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { useMessageInbox } from "../model/useMessageInbox";
import ConversationAvatar from "./ConversationAvatar";
import ThreadActions from "./ThreadActions";
import styles from "./conversation.module.css";

export default function ListingConversationListPage() {
  const { t } = useV2Translation(messagesUiMessages);

  return v2IntegrationEnabled() ? <ManagedConversationList /> : <p>{t("conversations_are_unavailable")}</p>;
}
function ManagedConversationList() {
  const { language: uiLanguage, t } = useV2Translation(messagesUiMessages);

  const state = useMessageInbox(), { context, visible } = state;
  return <section className={styles.inbox}>
    <header className={styles.inboxHeader}><h1>{t("conversations")}</h1>
      <button type="button" onClick={context.actor ? state.refresh : context.refresh} disabled={state.reading || state.acting} className={styles.textButton}>{t("refresh")}</button></header>
    {visible && <div className={styles.sender}><ConversationAvatar identity={visible.actor} /><span>{t("inbox")} <strong>{visible.actor.name || t("your_identity")}</strong></span></div>}
    {(state.reading || context.loading) && <p role="status">{t("loading_conversations")}</p>}
    {context.anonymous && <Link className={styles.textButton} href="/auth?next=%2Fv2%2Fmessages">{t("sign_in_to_read_conversations")}</Link>}
    {(context.error || state.problem) && <p role="alert" className={styles.notice}>{renderUiMessage(uiLanguage, context.error || state.problem)}</p>}
    {visible?.conversations.map(item => <div key={item.conversation_id} className={styles.threadRow + (item.unread ? " " + styles.unread : "")}>
      <Link href={"/v2/messages/" + item.conversation_id} className={styles.threadLink}>
        <ConversationAvatar identity={item.peer} />
        <div className={styles.threadInfo}>
          <div className={styles.rowHeading}><strong>{item.peer.name || t("conversation")}</strong>
            <time dateTime={item.updated_at} title={new Date(item.updated_at).toLocaleString(localeForLanguage(uiLanguage))}>
              {new Date(item.updated_at).toLocaleDateString(localeForLanguage(uiLanguage), { day: "numeric", month: "short" })}
            </time>
          </div>
          {item.listing_title && <p className={styles.rowListing}>{item.listing_title}</p>}
          <p className={styles.rowPreview}>{item.preview.has_image ? t("photo") + (item.preview.text ? " · " : "") : ""}{item.preview.text || (!item.preview.has_image ? t("start_conversation") : "")}</p>
          {!item.can_send && <p className={styles.rowListing}>{t("sending_is_currently_unavailable")}</p>}
        </div>
        {item.unread && <span className={styles.unreadDot} role="img" aria-label={t("unread_messages")} />}
      </Link>
      <ThreadActions disabled={state.acting} onHide={() => state.hide(item.conversation_id)} onBlock={blocked => state.block(item.conversation_id, blocked)} />
    </div>)}
    {visible && !visible.conversations.length && <p className={styles.rowPreview}>{t("there_are_no_conversations_for_this_identity_yet")}</p>}
    {visible?.next_cursor && <button type="button" disabled={state.reading || state.acting} className={styles.textButton} onClick={state.more}>{t("load_more_conversations")}</button>}
  </section>;
}
