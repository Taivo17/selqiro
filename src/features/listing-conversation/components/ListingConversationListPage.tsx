"use client";
import Link from "next/link";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { useMessageInbox } from "../model/useMessageInbox";
import ConversationAvatar from "./ConversationAvatar";
import ThreadActions from "./ThreadActions";
import styles from "./conversation.module.css";

export default function ListingConversationListPage() {
  return v2IntegrationEnabled() ? <ManagedConversationList /> : <p>Vestlused ei ole kättesaadavad.</p>;
}
function ManagedConversationList() {
  const state = useMessageInbox(), { context, visible } = state;
  return <section className={styles.inbox}>
    <header className={styles.inboxHeader}><h1>Vestlused</h1>
      <button type="button" onClick={context.actor ? state.refresh : context.refresh} disabled={state.reading || state.acting} className={styles.textButton}>Värskenda</button></header>
    {visible && <div className={styles.sender}><ConversationAvatar identity={visible.actor} /><span>Postkast: <strong>{visible.actor.name || "Sinu identiteet"}</strong></span></div>}
    {(state.reading || context.loading) && <p role="status">Laen vestlusi…</p>}
    {context.anonymous && <Link className={styles.textButton} href="/auth?next=%2Fv2%2Fmessages">Vestluste lugemiseks logi sisse</Link>}
    {(context.error || state.problem) && <p role="alert" className={styles.notice}>{context.error || state.problem}</p>}
    {visible?.conversations.map(item => <div key={item.conversation_id} className={styles.threadRow + (item.unread ? " " + styles.unread : "")}>
      <Link href={"/v2/messages/" + item.conversation_id} className={styles.threadLink}>
        <ConversationAvatar identity={item.peer} />
        <div className={styles.threadInfo}>
          <div className={styles.rowHeading}><strong>{item.peer.name || "Vestlus"}</strong>
            <time dateTime={item.updated_at} title={new Date(item.updated_at).toLocaleString("et-EE")}>
              {new Date(item.updated_at).toLocaleDateString("et-EE", { day: "numeric", month: "short" })}
            </time>
          </div>
          {item.listing_title && <p className={styles.rowListing}>{item.listing_title}</p>}
          <p className={styles.rowPreview}>{item.preview.has_image ? "▧ Foto" + (item.preview.text ? " · " : "") : ""}{item.preview.text || (!item.preview.has_image ? "Alusta vestlust" : "")}</p>
          {!item.can_send && <p className={styles.rowListing}>Saatmine pole praegu võimalik</p>}
        </div>
        {item.unread && <span className={styles.unreadDot} role="img" aria-label="Lugemata sõnumid" />}
      </Link>
      <ThreadActions disabled={state.acting} onHide={() => state.hide(item.conversation_id)} onBlock={blocked => state.block(item.conversation_id, blocked)} />
    </div>)}
    {visible && !visible.conversations.length && <p className={styles.rowPreview}>Selle identiteediga pole veel vestlusi.</p>}
    {visible?.next_cursor && <button type="button" disabled={state.reading || state.acting} className={styles.textButton} onClick={state.more}>Lae rohkem vestlusi</button>}
  </section>;
}
