"use client";
import { useEffect, useRef, useState } from "react";
import { createMessageImageClient } from "../../../entities/conversation/api/messageImages";
import type { ConversationActorContext } from "../model/useConversationActor";
import styles from "./conversation.module.css";

type Props = { conversationId: string; messageId: string; actor: ConversationActorContext;
  isCurrent: (actor: ConversationActorContext) => boolean; width: number | null; height: number | null };
export default function MessageImage({ conversationId, messageId, actor, isCurrent, width, height }: Props) {
  const [nearby, setNearby] = useState(false), [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false), [retry, setRetry] = useState(0);
  const holder = useRef<HTMLDivElement>(null), dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = holder.current;
    if (!node) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setNearby(true); observer.disconnect(); } },
      { root: node.closest("[data-conversation-history]"), rootMargin: "180px" });
    observer.observe(node); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!nearby || !isCurrent(actor)) return;
    let live = true, objectUrl: string | null = null;
    const controller = new AbortController(), abort = () => controller.abort();
    actor.signal.addEventListener("abort", abort, { once: true });
    void createMessageImageClient().read(actor.accessToken, {
      expectedUserId: actor.expectedUserId, expectedIdentityId: actor.expectedIdentityId, conversationId, messageId,
    }, controller.signal).then(blob => {
      if (!live || !isCurrent(actor)) return;
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(() => { if (live && isCurrent(actor)) setError(true); });
    return () => { live = false; controller.abort(); actor.signal.removeEventListener("abort", abort); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [actor, conversationId, isCurrent, messageId, nearby, retry]);
  return <div ref={holder}>
    {url ? <>
      <button type="button" className={styles.messageImage} onClick={() => dialog.current?.showModal()} aria-label="Ava foto suurelt">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Vestluses saadetud foto" width={width ?? undefined} height={height ?? undefined} />
      </button>
      <dialog ref={dialog} className={styles.dialog + " " + styles.imageDialog} aria-label="Vestluse foto">
        <div className={styles.imageClose}><button type="button" className={styles.iconButton} onClick={() => dialog.current?.close()} aria-label="Sulge foto">×</button></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Vestluses saadetud foto suurvaade" />
      </dialog>
    </> : <div style={{ width: "min(260px, 100%)", minHeight: 100 }}>
      {error ? <button type="button" className={styles.textButton} onClick={() => { setError(false); setRetry(value => value + 1); }}>Lae foto uuesti</button>
        : <p className={styles.time}>Laen fotot…</p>}
    </div>}
  </div>;
}
