"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";
import { localeForLanguage } from "@/lib/i18n/useTranslation";

import { messagesUiMessages } from "@/lib/i18n/catalogs/messagesUi";

import { Fragment } from "react";
import type { ListingMessageCard } from "../../../entities/conversation/model/listingMessageCards";
import type { ConversationActorContext } from "../model/useConversationActor";
import ConversationListingCard from "./ConversationListingCard";
import MessageImage from "./MessageImage";
import styles from "./conversation.module.css";

type Message = Readonly<{ id: string; mine: boolean; text: string; text_truncated: boolean; created_at: string;
  listing: ListingMessageCard | null; image: { width: number | null; height: number | null } | null }>;
type Props = { conversationId: string; messages: readonly Message[]; actor: ConversationActorContext;
  isCurrent: (actor: ConversationActorContext) => boolean };
export default function ConversationMessages({ conversationId, messages, actor, isCurrent }: Props) {
  const { language: uiLanguage, t } = useV2Translation(messagesUiMessages);

  const dayLabel = (createdAt: string) => new Date(createdAt).toLocaleDateString(localeForLanguage(uiLanguage), { day: "numeric", month: "long", year: "numeric" });
  return <ol className={styles.messages} aria-label={t("conversation_messages")}>
    {messages.map((message, index) => {
      const instant = new Date(message.created_at), day = dayLabel(message.created_at);
      const newDay = index === 0 || day !== dayLabel(messages[index - 1].created_at);
      return <Fragment key={message.id}>
        {newDay && <li className={styles.day}>{day}</li>}
        <li data-message-id={message.id} className={styles.message + (message.mine ? " " + styles.mine : "")}>
          <article className={styles.bubble} aria-label={message.mine ? t("your_message") : t("incoming_message")}>
            {message.text && <p className={styles.body}>{message.text}</p>}
            {message.text_truncated && <p className={styles.time}>{t("only_the_beginning_of_this_long_historical_message_is_shown_here")}</p>}
            {message.image && <MessageImage key={actor.generation} conversationId={conversationId} messageId={message.id} actor={actor} isCurrent={isCurrent}
              width={message.image.width} height={message.image.height} />}
            {message.listing && <div className={styles.card}><ConversationListingCard listing={message.listing} /></div>}
            <time className={styles.time} dateTime={message.created_at} title={instant.toLocaleString(localeForLanguage(uiLanguage))}>
              {instant.toLocaleTimeString(localeForLanguage(uiLanguage), { hour: "2-digit", minute: "2-digit" })}
            </time>
          </article>
        </li>
      </Fragment>;
    })}
  </ol>;
}
