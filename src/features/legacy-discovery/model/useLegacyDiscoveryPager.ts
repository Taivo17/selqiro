"use client";
import {useEffect, useRef, useState, useSyncExternalStore} from "react";
import {createLegacyDiscoveryPager, emptyLegacyDiscovery, type LegacyDiscoveryLoad} from "./legacyDiscoveryPager";

export function useLegacyDiscoveryPager<T, M>(options: {
  key: string; ready: boolean; signal?: AbortSignal; isCurrent: () => boolean; load: LegacyDiscoveryLoad<T, M>;
}) {
  const latest = useRef(options); latest.current = options;
  const [pager] = useState(() => createLegacyDiscoveryPager<T, M>());
  const state = useSyncExternalStore(pager.subscribe, pager.getSnapshot, pager.getSnapshot);
  const {key, ready} = options;
  useEffect(() => {
    pager.reset({...latest.current, isCurrent: () => latest.current.key === key && latest.current.isCurrent(),
      load: (offset, signal, previous) => latest.current.load(offset, signal, previous)});
    return () => pager.retire();
  }, [pager, key, ready]);
  // Render gating also covers the interval before effect cleanup on a new
  // account/query. Old rows are never rendered using the next account's state.
  const view = state.key === key && options.isCurrent() ? state : emptyLegacyDiscovery<T, M>(key, ready);
  return {...view, loadMore: () => {if (state.key === key && options.isCurrent()) void pager.loadMore();},
    refresh: () => {if (state.key === key && options.isCurrent()) void pager.refresh();}};
}
