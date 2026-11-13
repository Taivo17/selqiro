"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { messagesUiMessages } from "@/lib/i18n/catalogs/messagesUi";

import Link from "next/link";
import ConversationAvatar, { type ConversationIdentity } from "./ConversationAvatar";
import ThreadActions from "./ThreadActions";
import styles from "./conversation.module.css";
import { serviceEditorMessages } from "../../service-editor/model/serviceEditorMessages";

type Props = {
  peer: ConversationIdentity | null;
  listing: Readonly<{ id: string; title: string | null; content_type?: "horse_offer" | "service" }> | null;
  ready: boolean; blocked: boolean; blockedByOther?: boolean; blockUnavailable?: boolean; busy: boolean;
  onHide: () => Promise<boolean>; onBlock: (blocked: boolean) => Promise<boolean>;
};
export default function ConversationHeader(props: Props) {
  const { t } = useV2Translation(messagesUiMessages);
  const {t: serviceText} = useV2Translation(serviceEditorMessages);

  return <header className={styles.header}>
    <Link href="/v2/messages" className={styles.iconButton} aria-label={t("back_to_conversations")}>←</Link>
    <ConversationAvatar identity={props.peer} />
    <div className={styles.heading}>
      <h1>{props.peer?.name || t("conversation")}</h1>
      {props.listing ? <Link className={styles.listingLink} href={(props.listing.content_type === "service" ? "/v2/service/" : props.listing.content_type === "horse_offer" ? "/v2/horse-offer/" : "/v2/listing/") + props.listing.id} prefetch={false}>
        {props.listing.title || (props.listing.content_type === "service" ? serviceText("viewPublic") : t("view_listing"))}
      </Link> : props.ready && <span className={styles.listingLink}>{t("conversation_messages")}</span>}
    </div>
    {props.ready && <ThreadActions blocked={props.blocked} blockedByOther={props.blockedByOther} blockUnavailable={props.blockUnavailable}
      disabled={props.busy} onHide={props.onHide} onBlock={props.onBlock} />}
  </header>;
}
