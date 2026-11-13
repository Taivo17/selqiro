"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { searchPublicServices, SERVICE_SEARCH_PAGE_SIZE } from "../../../entities/service/api/getPublicService";
import type { PublicServicePage, ServiceSearchInput } from "../../../entities/service/model/publicService";
import { readPublicServiceWindow } from "./readPublicServiceWindow";

type State = {key: string; page: PublicServicePage | null; firstOffset: number;
  origins: ReadonlyMap<string, number>; loading: boolean; error: boolean};
const empty = (key: string): State => ({key, page: null, firstOffset: 0, origins: new Map(), loading: true, error: false});
const offsetValue = (value: number | undefined) => Number.isInteger(value) && (value ?? 0) >= 0 && (value ?? 0) <= 1_000_000 ? value ?? 0 : 0;

export function usePublicServiceSearch(input: ServiceSearchInput, options: {
  enabled?: boolean; restoreOffset?: number; targetOffset?: number; restorationKey?: string; audience?: string;
} = {}) {
  const enabled = options.enabled !== false, restoreOffset = offsetValue(options.restoreOffset);
  const targetOffset = Math.min(restoreOffset, offsetValue(options.targetOffset)), restorationKey = options.restorationKey ?? "";
  const inputKey = JSON.stringify(input), key = `${options.audience ?? "public"}|${inputKey}`;
  const version = useRef(0), abort = useRef<AbortController | null>(null), live = useRef(false);
  const current = useRef<State>(empty(key));
  const [state, setState] = useState<State>(() => empty(key)), [retryNumber, setRetryNumber] = useState(0);
  const set = useCallback((value: State) => {current.current = value; setState(value);}, []);
  useEffect(() => {
    if (!enabled) return;
    live.current = true;
    const ticket = ++version.current;
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    const isCurrent = () => live.current && ticket === version.current && !controller.signal.aborted;
    // Hide a previous query before debounce or restoration can issue any read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    set(empty(key));
    const timer = window.setTimeout(() => {void (async () => {
      try {
        const result = await readPublicServiceWindow(JSON.parse(inputKey) as ServiceSearchInput,
          restoreOffset, targetOffset, controller.signal, isCurrent);
        if (isCurrent()) set({key, ...result, loading: false, error: false});
      } catch {if (isCurrent()) set({...empty(key), loading: false, error: true});}
    })();}, 250);
    return () => {live.current = false; version.current += 1; controller.abort(); window.clearTimeout(timer);};
  }, [key, inputKey, retryNumber, set, enabled, restoreOffset, targetOffset, restorationKey]);

  const loadPage = useCallback(async (direction: "previous" | "next") => {
    const before = current.current;
    const offset = direction === "previous" ? Math.max(0, before.firstOffset - SERVICE_SEARCH_PAGE_SIZE) : before.page?.nextOffset;
    if (!enabled || before.key !== key || before.loading || !before.page || offset == null
      || (direction === "previous" ? before.firstOffset === 0 : !before.page.hasMore)) return;
    const ticket = ++version.current;
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    set({...before, loading: true, error: false});
    try {
      const page = await searchPublicServices(JSON.parse(inputKey) as ServiceSearchInput, offset, controller.signal);
      if (!live.current || ticket !== version.current || controller.signal.aborted) return;
      const origins = new Map(before.origins), extra = page.items.filter(item => !origins.has(item.id));
      for (const item of extra) origins.set(item.id, offset);
      const items = direction === "previous" ? [...extra, ...before.page.items] : [...before.page.items, ...extra];
      // Earlier pages prepend rows while preserving the current forward cursor.
      set({key, page: {...(direction === "previous" ? before.page : page), items}, origins,
        firstOffset: direction === "previous" ? offset : before.firstOffset, loading: false, error: false});
    } catch {if (live.current && ticket === version.current && !controller.signal.aborted) set({...before, loading: false, error: true});}
  }, [key, inputKey, set, enabled]);
  const visible = enabled && state.key === key ? state : empty(key);
  return {...visible, serviceOffset: (id: string) => visible.origins.get(id) ?? visible.firstOffset,
    loadMore: () => loadPage("next"), loadPrevious: () => loadPage("previous"), retry: () => setRetryNumber(value => value + 1)};
}
