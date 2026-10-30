"use client";
import { useEffect, useLayoutEffect, useRef } from "react";

/** A small bounded poll while visible, independent of typing. No presence or
 * typing analytics are transmitted. Network calls may decline while busy. */
export function useConversationAutoRefresh(enabled: boolean, refresh: () => void, interval = 5000) {
  const current = useRef(refresh);
  useLayoutEffect(() => { current.current = refresh; }, [refresh]);
  useEffect(() => {
    if (!enabled) return;
    const poll = () => { if (document.visibilityState === "visible") current.current(); };
    const timer = setInterval(poll, interval);
    document.addEventListener("visibilitychange", poll);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", poll); };
  }, [enabled, interval]);
}
