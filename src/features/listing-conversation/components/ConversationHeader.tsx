"use client";
import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";
import { messagesUiMessages } from "@/lib/i18n/catalogs/messagesUi";
import Link from "next/link";
import ConversationAvatar, { type ConversationIdentity } from "./ConversationAvatar";
import ThreadActions from "./ThreadActions";
import styles from "./conversation.module.css";
import { getOfferTheme } from "../../../shared/marketplace/offerTheme";
import { conversationOfferKind, conversationSubjectHref, conversationSubjectMessages,
  type ConversationSubject } from "../model/conversationSubject";

type Props = {
  peer: ConversationIdentity | null; listing: ConversationSubject | null;
  ready: boolean; blocked: boolean; blockedByOther?: boolean; blockUnavailable?: boolean; busy: boolean;
  onHide: () => Promise<boolean>; onBlock: () => Promise<boolean>; onUnblock?: () => void;
};
export default function ConversationHeader(props: Props) {
  const { t } = useV2Translation(messagesUiMessages), { t: subjectText } = useV2Translation(conversationSubjectMessages);
  const kind = props.listing ? conversationOfferKind(props.listing) : null;
  const href = props.listing ? conversationSubjectHref(props.listing) : null;
  return <header className={styles.header}>
    <Link href="/v2/messages" className={styles.iconButton} aria-label={t("back_to_conversations")}>←</Link>
    <ConversationAvatar identity={props.peer} />
    <div className={styles.heading}>
      <h1>{props.peer?.name || t("conversation")}</h1>
      {props.listing && kind && href ? <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + getOfferTheme(kind).badge}>{subjectText(kind)}</span>
        <Link className={styles.listingLink} href={href} prefetch={false}>{props.listing.title || subjectText("view")}</Link>
      </div> : props.ready && <span className={styles.listingLink}>{t("conversation_messages")}</span>}
    </div>
    {props.ready && <ThreadActions blocked={props.blocked} blockedByOther={props.blockedByOther} blockUnavailable={props.blockUnavailable}
      disabled={props.busy} onHide={props.onHide} onBlock={props.onBlock} onUnblock={props.onUnblock} />}
  </header>;
}
