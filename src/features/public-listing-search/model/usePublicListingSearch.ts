"use client";

import { useEffect, useRef, useState } from "react";
import { searchPublicListings } from "../../../entities/listing/api/searchPublicListings";
import { publicSearchKey, type PublicSearchInput } from "../../../entities/listing/model/publicSearch";
import type { PublicSearchPage } from "../../../entities/listing/model/publicSearchResponse";

export function usePublicListingSearch(input: PublicSearchInput, audience: string, enabled: boolean) {
  const key = audience + "|" + publicSearchKey(input);
  const [retryVersion, setRetryVersion] = useState(0);
  const [state, setState] = useState<{key: string; page: PublicSearchPage | null; loading: boolean; error: string | null}>({
    key: "", page: null, loading: true, error: null,
  });
  const inputRef = useRef(input); inputRef.current = input;
  const lastRefresh = useRef(0);
  useEffect(() => {
    let active = true;
    let timedOut = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    if (!enabled) return () => controller.abort();
    setState({key, page: null, loading: true, error: null});
    const requested = {...inputRef.current};
    // Cancellation starts on dependency change, not after the debounce delay.
    const debounce = setTimeout(async () => {
      lastRefresh.current = Date.now();
      timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
      try {
        const page = await searchPublicListings(requested, controller.signal);
        if (controller.signal.aborted) throw new Error("Aborted search");
        if (active) setState({key, page, loading: false, error: null});
      } catch {
        if (active) setState({key, page: null, loading: false, error: timedOut
          ? "Otsing võttis liiga kaua. Täpsusta otsingut või proovi uuesti."
          : "Kuulutusi ei saanud laadida. Kontrolli ühendust ja proovi uuesti."});
      } finally { if (timeout) clearTimeout(timeout); }
    }, 300);
    return () => { active = false; clearTimeout(debounce); if (timeout) clearTimeout(timeout); controller.abort(); };
  }, [key, enabled, retryVersion]);

  useEffect(() => {
    function refresh() {
      // No timer polling. Recheck eligibility after an actual tab return when stale.
      if (document.visibilityState === "visible" && Date.now() - lastRefresh.current > 30000) {
        lastRefresh.current = Date.now(); setRetryVersion(v => v + 1);
      }
    }
    function historyChanged() { setRetryVersion(v => v + 1); }
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("popstate", historyChanged);
    return () => {
      window.removeEventListener("focus", refresh); window.removeEventListener("pageshow", refresh);
      window.removeEventListener("popstate", historyChanged);
    };
  }, []);
  // Never expose a previous audience/query's rows while the new effect is pending.
  const current = enabled && state.key === key;
  return {page: current ? state.page : null, loading: enabled && (!current || state.loading),
    error: current ? state.error : null, retry: () => setRetryVersion(v => v + 1), key};
}
