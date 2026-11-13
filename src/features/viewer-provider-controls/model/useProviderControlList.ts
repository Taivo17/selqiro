"use client";
import { useEffect, useState } from "react";
import { providerControlsClient } from "../../../entities/viewer-provider-controls/api/providerControlsClient";
import { PROVIDER_CONTROLS_PAGE_SIZE, type ProviderControlKind, type ProviderControlPage } from "../../../entities/viewer-provider-controls/model/types";
import { useViewerReadScope } from "../../../shared/provider-controls/useViewerReadScope";
import { notifyProviderControlsChanged } from "../../../shared/provider-controls/providerControlEvents";

export function useProviderControlList(kind: ProviderControlKind) {
  const account = useViewerReadScope("all"), [position, setPosition] = useState({accountKey: "", offset: 0});
  const offset = position.accountKey === account.accountKey ? position.offset : 0;
  const [retry, setRetry] = useState(0), key = `${account.key}:${kind}:${offset}:${retry}`;
  const [state, setState] = useState<{key: string; page: ProviderControlPage | null; error: boolean}>({key: "", page: null, error: false});
  useEffect(() => {
    const actor = account.actor; if (!account.ready || !actor) return;
    const controller = new AbortController(), abort = () => controller.abort();
    actor.signal.addEventListener("abort", abort, {once: true}); if (actor.signal.aborted) abort();
    let timer: ReturnType<typeof setTimeout> | undefined;
    void providerControlsClient.list(actor, kind, offset, controller.signal).then(page => {
      if (controller.signal.aborted || !account.isCurrent(actor)) return;
      if (!page.items.length && offset > 0) {setPosition({accountKey: account.accountKey, offset: 0}); return;}
      setState({key, page, error: false});
      if (kind === "hidden" && page.items.length) {
        const remaining = page.items.filter(item => item.hidden && item.hiddenUntil)
          .map(item => Date.parse(item.hiddenUntil!) - Date.parse(item.serverNow));
        if (remaining.length) timer = setTimeout(() => {
          if (!controller.signal.aborted && account.isCurrent(actor)) notifyProviderControlsChanged("hidden");
        }, Math.min(2147483000, Math.max(100, Math.min(...remaining) + 100)));
      }
    }).catch(() => {if (!controller.signal.aborted && account.isCurrent(actor)) setState({key, page: null, error: true});});
    return () => {controller.abort(); actor.signal.removeEventListener("abort", abort); if (timer) clearTimeout(timer);};
    // Account generation, server-preference revision, kind and pagination form one read scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, account.ready]);
  const visible = !!account.actor && account.ready && state.key === key;
  const page = visible ? state.page : null;
  return {account, page, offset, loading: !!account.actor && account.ready && !visible,
    error: account.error || (visible && state.error), refresh: () => setRetry(value => value + 1),
    previous: () => setPosition({accountKey: account.accountKey, offset: Math.max(0, offset - PROVIDER_CONTROLS_PAGE_SIZE)}),
    next: () => {if (page?.nextOffset !== null && page?.nextOffset !== undefined) setPosition({accountKey: account.accountKey, offset: page.nextOffset});}};
}
