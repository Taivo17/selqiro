"use client";
import Link from "next/link";
import ConversationAvatar, { type ConversationIdentity } from "./ConversationAvatar";
import ThreadActions from "./ThreadActions";
import styles from "./conversation.module.css";

type Props = {
  peer: ConversationIdentity | null;
  listing: Readonly<{ id: string; title: string | null }> | null;
  ready: boolean; blocked: boolean; busy: boolean;
  onHide: () => Promise<boolean>; onBlock: (blocked: boolean) => Promise<boolean>;
};
export default function ConversationHeader(props: Props) {
  return <header className={styles.header}>
    <Link href="/v2/messages" className={styles.iconButton} aria-label="Tagasi vestluste juurde">←</Link>
    <ConversationAvatar identity={props.peer} />
    <div className={styles.heading}>
      <h1>{props.peer?.name || "Vestlus"}</h1>
      {props.listing ? <Link className={styles.listingLink} href={"/v2/listing/" + props.listing.id} prefetch={false}>
        {props.listing.title || "Vaata kuulutust"}
      </Link> : props.ready && <span className={styles.listingLink}>Vestluse sõnumid</span>}
    </div>
    {props.ready && <ThreadActions blocked={props.blocked} disabled={props.busy} onHide={props.onHide} onBlock={props.onBlock} />}
  </header>;
}
