"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { searchPublicServices } from "../../../entities/service/api/getPublicService";
import type { PublicServicePage, ServiceSearchInput } from "../../../entities/service/model/publicService";

type State = {key: string; page: PublicServicePage | null; loading: boolean; error: boolean};
export function usePublicServiceSearch(input: ServiceSearchInput) {
  const key = JSON.stringify(input), version = useRef(0), abort = useRef<AbortController | null>(null), live = useRef(false);
  const current = useRef<State>({key, page: null, loading: true, error: false});
  const [state, setState] = useState<State>({key, page: null, loading: true, error: false}), [retryNumber, setRetryNumber] = useState(0);
  const set = useCallback((value: State) => {current.current = value; setState(value);}, []);
  const invalidate = useCallback(() => {version.current += 1;}, []);
  useEffect(() => {
    live.current = true;
    const ticket = ++version.current;
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    // Synchronize a new external query before its debounce fires. Keeping an
    // old page here could make pagination reuse the previous filter's offset.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    set({key, page: null, loading: true, error: false});
    const timer = window.setTimeout(() => {void (async () => {
      try {const page = await searchPublicServices(JSON.parse(key) as ServiceSearchInput, 0, controller.signal);
        if (live.current && ticket === version.current && !controller.signal.aborted) set({key, page, loading: false, error: false});
      } catch {if (live.current && ticket === version.current && !controller.signal.aborted) set({key, page: null, loading: false, error: true});}
    })();}, 250);
    return () => {live.current = false; invalidate(); controller.abort(); window.clearTimeout(timer);};
  }, [key, retryNumber, set, invalidate]);
  const loadMore = useCallback(async () => {
    const before = current.current, offset = before.page?.nextOffset;
    if (before.key !== key || before.loading || !before.page?.hasMore || offset == null) return;
    const ticket = ++version.current;
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    set({...before, loading: true, error: false});
    try {
      const page = await searchPublicServices(JSON.parse(key) as ServiceSearchInput, offset, controller.signal);
      if (!live.current || ticket !== version.current || controller.signal.aborted) return;
      const previous = before.page.items, seen = new Set(previous.map(item => item.id));
      set({key, page: {...page, items: [...previous, ...page.items.filter(item => !seen.has(item.id))]}, loading: false, error: false});
    } catch {if (live.current && ticket === version.current && !controller.signal.aborted) set({...before, loading: false, error: true});}
  }, [key, set]);
  return {...(state.key === key ? state : {key, page: null, loading: true, error: false}), loadMore, retry: () => setRetryNumber(value => value + 1)};
}
