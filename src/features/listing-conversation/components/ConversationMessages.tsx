"use client";
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
  const dayLabel = (createdAt: string) => new Date(createdAt).toLocaleDateString("et-EE", { day: "numeric", month: "long", year: "numeric" });
  return <ol className={styles.messages} aria-label="Vestluse sõnumid">
    {messages.map((message, index) => {
      const instant = new Date(message.created_at), day = dayLabel(message.created_at);
      const newDay = index === 0 || day !== dayLabel(messages[index - 1].created_at);
      return <Fragment key={message.id}>
        {newDay && <li className={styles.day}>{day}</li>}
        <li data-message-id={message.id} className={styles.message + (message.mine ? " " + styles.mine : "")}>
          <article className={styles.bubble} aria-label={message.mine ? "Sinu sõnum" : "Saabunud sõnum"}>
            {message.text && <p className={styles.body}>{message.text}</p>}
            {message.text_truncated && <p className={styles.time}>Väga pikast varasemast sõnumist kuvatakse siin algus.</p>}
            {message.image && <MessageImage key={actor.generation} conversationId={conversationId} messageId={message.id} actor={actor} isCurrent={isCurrent}
              width={message.image.width} height={message.image.height} />}
            {message.listing && <div className={styles.card}><ConversationListingCard listing={message.listing} /></div>}
            <time className={styles.time} dateTime={message.created_at} title={instant.toLocaleString("et-EE")}>
              {instant.toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" })}
            </time>
          </article>
        </li>
      </Fragment>;
    })}
  </ol>;
}
