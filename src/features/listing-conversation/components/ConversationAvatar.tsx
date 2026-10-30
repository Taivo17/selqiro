"use client";
import { useState } from "react";
import { safeMessageAvatar } from "../../../entities/conversation/model/messagingValidation";
import styles from "./conversation.module.css";

export type ConversationIdentity = Readonly<{ identity_id: string; name: string | null; avatar_url: string | null }>;
export default function ConversationAvatar({ identity }: { identity: Pick<ConversationIdentity, "name" | "avatar_url"> | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  const image = safeMessageAvatar(identity?.avatar_url ?? null);
  return <span className={styles.avatar} aria-hidden="true">
    {image && failed !== image
      // The permitted image origin is shared with listing cards; arbitrary chat tracking URLs are never loaded.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={image} alt="" referrerPolicy="no-referrer" onError={() => setFailed(image)} />
      : (identity?.name?.trim().slice(0, 1).toLocaleUpperCase("et-EE") || "?")}
  </span>;
}
