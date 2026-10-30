"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Read acknowledgements are measured after layout in the visible history pane,
 * never taken from a response's newest ID. Prepending history preserves position. */
export function useConversationScroll(messages: readonly Readonly<{ id: string }>[], actorKey: string | null,
  onRead: (messageId: string) => void, ownSentId: string | null) {
  const history = useRef<HTMLDivElement>(null), pinned = useRef(true);
  const historyRef = useCallback((node: HTMLDivElement | null) => { history.current = node; }, []);
  const suspended = useRef(false), position = useRef(0);
  const before = useRef<{ height: number; top: number; first: string | null } | null>(null);
  const previous = useRef<{ actor: string | null; last: string | null; sent: string | null }>({ actor: null, last: null, sent: null });
  const readCallback = useRef(onRead), readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newMessages, setNewMessages] = useState(false);
  useLayoutEffect(() => { readCallback.current = onRead; }, [onRead]);
  const scheduleRead = useCallback(() => {
    if (readTimer.current) clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      const pane = history.current;
      if (!pane || document.visibilityState !== "visible" || !document.hasFocus()) return;
      const bounds = pane.getBoundingClientRect();
      if (bounds.height < 20 || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
      let seen: string | null = null;
      pane.querySelectorAll<HTMLElement>("[data-message-id]").forEach(node => {
        const box = node.getBoundingClientRect(), id = node.dataset.messageId;
        if (id && box.bottom <= bounds.bottom + 1 && box.bottom > bounds.top && box.top < bounds.bottom) {
          if (!seen || BigInt(id) > BigInt(seen)) seen = id;
        }
      });
      if (seen) readCallback.current(seen);
    }, 500);
  }, []);
  const jumpToLatest = useCallback(() => {
    const pane = history.current; pinned.current = true; before.current = null; setNewMessages(false);
    if (pane) pane.scrollTop = pane.scrollHeight;
    scheduleRead();
  }, [scheduleRead]);
  const onScroll = useCallback(() => {
    const pane = history.current;
    if (!pane || !actorKey) return;
    pinned.current = pane.scrollHeight - pane.scrollTop - pane.clientHeight < 64;
    position.current = pane.scrollTop;
    if (pinned.current) setNewMessages(false);
    scheduleRead();
  }, [actorKey, scheduleRead]);
  useLayoutEffect(() => {
    const pane = history.current;
    if (!pane) return;
    if (!actorKey) { suspended.current = true; return; }
    const last = messages.at(-1)?.id ?? null, first = messages[0]?.id ?? null;
    let showNew: boolean | null = null;
    if (previous.current.actor !== actorKey) {
      pinned.current = true; before.current = null; showNew = false;
      pane.scrollTop = pane.scrollHeight;
    } else if (suspended.current) {
      pane.scrollTop = pinned.current ? pane.scrollHeight : position.current;
      if (!pinned.current && last !== previous.current.last) showNew = true;
    } else if (before.current && first !== before.current.first) {
      pane.scrollTop = before.current.top + pane.scrollHeight - before.current.height;
      before.current = null;
    } else if (last !== previous.current.last || ownSentId !== previous.current.sent) {
      if (pinned.current || (ownSentId && ownSentId !== previous.current.sent)) {
        pinned.current = true; before.current = null; pane.scrollTop = pane.scrollHeight; showNew = false;
      } else showNew = true;
    }
    suspended.current = false; position.current = pane.scrollTop;
    previous.current = { actor: actorKey, last, sent: ownSentId };
    scheduleRead();
    const frame = requestAnimationFrame(() => { if (showNew !== null) setNewMessages(showNew); });
    return () => cancelAnimationFrame(frame);
  }, [messages, actorKey, ownSentId, scheduleRead]);
  useEffect(() => {
    const pane = history.current;
    if (!pane || !actorKey) return;
    const observer = new ResizeObserver(() => {
      if (pinned.current) pane.scrollTop = pane.scrollHeight;
      scheduleRead();
    });
    observer.observe(pane);
    const content = pane.querySelector("ol"); if (content) observer.observe(content);
    const visible = () => { if (document.visibilityState === "visible") scheduleRead(); };
    document.addEventListener("visibilitychange", visible); window.addEventListener("focus", visible);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visible); window.removeEventListener("focus", visible); };
  }, [actorKey, messages.length, scheduleRead]);
  useEffect(() => () => { if (readTimer.current) clearTimeout(readTimer.current); }, []);
  const prepareEarlier = () => {
    const pane = history.current;
    if (pane) before.current = { height: pane.scrollHeight, top: pane.scrollTop, first: messages[0]?.id ?? null };
  };
  return { historyRef, onScroll, jumpToLatest, prepareEarlier, newMessages };
}
