"use client";
import ProfileAvatar from "../../../shared/profile-media/ProfileAvatar";
import styles from "./conversation.module.css";

export type ConversationIdentity = Readonly<{ identity_id: string; name: string | null; avatar_url: string | null }>;
export default function ConversationAvatar({ identity }: { identity: Pick<ConversationIdentity, "name" | "avatar_url"> | null }) {
  return <ProfileAvatar className={styles.avatar} name={identity?.name} url={identity?.avatar_url} />;
}
