"use client";
import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";
import { messagesUiMessages } from "@/lib/i18n/catalogs/messagesUi";
import Link from "next/link";
import {useEffect, useState} from "react";
import ConversationAvatar, { type ConversationIdentity } from "./ConversationAvatar";
import ThreadActions from "./ThreadActions";
import styles from "./conversation.module.css";
import { getOfferTheme } from "../../../shared/marketplace/offerTheme";
import { conversationOfferKind, conversationSubjectHref, conversationSubjectMessages,
  type ConversationSubject } from "../model/conversationSubject";
import {getPublicProfileMedia, publicProfileHref} from "../../../entities/profile/api/getPublicProfileMedia";
import {profileMediaMessages} from "../../profile-media/i18n/messages";

type Props = {
  peer: ConversationIdentity | null; listing: ConversationSubject | null;
  ready: boolean; blocked: boolean; blockedByOther?: boolean; blockUnavailable?: boolean; busy: boolean;
  onHide: () => Promise<boolean>; onBlock: () => Promise<boolean>; onUnblock?: () => void;
};
export default function ConversationHeader(props: Props) {
  const { t } = useV2Translation(messagesUiMessages), { t: subjectText } = useV2Translation(conversationSubjectMessages);
  const {t: profileText} = useV2Translation(profileMediaMessages);
  const peerId = props.peer?.identity_id ?? null;
  const peerKey = `${peerId ?? ""}:${props.ready}:${props.blocked}:${!!props.blockedByOther}`;
  const [profileLink, setProfileLink] = useState<{key: string; href: string | null}>({key: "", href: null});
  useEffect(() => {
    if (!peerId || !props.ready || props.blocked || props.blockedByOther) return;
    const controller = new AbortController();
    void getPublicProfileMedia(peerId, controller.signal).then(media => {
      if (!controller.signal.aborted) setProfileLink({key: peerKey, href: publicProfileHref(media?.slug)});
    }, () => {if (!controller.signal.aborted) setProfileLink({key: peerKey, href: null});});
    return () => {controller.abort();};
  }, [peerId, peerKey, props.ready, props.blocked, props.blockedByOther]);
  const peerHref = profileLink.key === peerKey && props.ready && !props.blocked && !props.blockedByOther ? profileLink.href : null;
  const kind = props.listing ? conversationOfferKind(props.listing) : null;
  const href = props.listing ? conversationSubjectHref(props.listing) : null;
  return <header className={styles.header}>
    <Link href="/v2/messages" className={styles.iconButton} aria-label={t("back_to_conversations")}>←</Link>
    {peerHref ? <Link href={peerHref} prefetch={false} className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      aria-label={`${profileText("publicProfile")}: ${props.peer?.name ?? ""}`}><ConversationAvatar identity={props.peer} /></Link>
      : <ConversationAvatar identity={props.peer} />}
    <div className={styles.heading}>
      <h1>{peerHref ? <Link href={peerHref} prefetch={false} title={profileText("publicProfile")}
        className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">{props.peer?.name || t("conversation")}</Link>
        : props.peer?.name || t("conversation")}</h1>
      {props.listing && kind && href ? <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + getOfferTheme(kind).badge}>{subjectText(kind)}</span>
        <Link className={styles.listingLink} href={href} prefetch={false}>{props.listing.title || subjectText("view")}</Link>
      </div> : props.ready && <span className={styles.listingLink}>{t("conversation_messages")}</span>}
    </div>
    {props.ready && <ThreadActions blocked={props.blocked} blockedByOther={props.blockedByOther} blockUnavailable={props.blockUnavailable}
      disabled={props.busy} onHide={props.onHide} onBlock={props.onBlock} onUnblock={props.onUnblock} />}
  </header>;
}
