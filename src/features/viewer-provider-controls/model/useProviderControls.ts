"use client";
import { useEffect, useRef, useState } from "react";
import { useViewerAccount } from "../../../shared/provider-controls/useViewerAccount";
import { viewerAccountStore } from "../../../shared/provider-controls/viewerAccountStore";
import { notifyProviderControlsChanged } from "../../../shared/provider-controls/providerControlEvents";
import { EMPTY_PROVIDER_CONTROL_VIEW, ProviderControlSession, type ProviderControlView } from "./providerControlSession";

export type ProviderControlsScope = Readonly<{key: string; isCurrent: () => boolean; signal?: AbortSignal}>;

export function useProviderControls(scope?: ProviderControlsScope) {
  const account = useViewerAccount();
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const scopeKey = scope?.key ?? "account", key = `${account.accountKey}:${scopeKey}`;
  const current = useRef<{key: string; session: ProviderControlSession} | null>(null);
  const [state, setState] = useState<{key: string; view: ProviderControlView}>({key: "", view: EMPTY_PROVIDER_CONTROL_VIEW});
  const scopeCurrent = () => (scopeRef.current?.key ?? "account") === scopeKey
    && (!scopeRef.current || (!scopeRef.current.signal?.aborted && scopeRef.current.isCurrent()));
  useEffect(() => {
    const session = new ProviderControlSession({
      getActor: () => scopeCurrent() ? viewerAccountStore.getSnapshot().actor : null,
      isCurrent: actor => scopeCurrent() && viewerAccountStore.isCurrent(actor)
        && `${actor.generation}:${actor.userId}:${scopeKey}` === key,
      changed: action => notifyProviderControlsChanged(action === "hide" || action === "unhide" ? "hidden" : "blocked"),
    });
    current.current = {key, session};
    const update = () => setState({key, view: session.getSnapshot()});
    const unsubscribe = session.subscribe(update); update();
    const signal = scopeRef.current?.signal;
    const retire = () => {session.retire(); setState({key, view: EMPTY_PROVIDER_CONTROL_VIEW});};
    signal?.addEventListener("abort", retire, {once: true}); if (signal?.aborted) retire();
    return () => {signal?.removeEventListener("abort", retire); unsubscribe(); session.retire();
      if (current.current?.session === session) current.current = null;};
    // The key captures account and optional conversation generations; refs guard
    // synchronous invalidation before React commits the following effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const get = () => current.current?.key === key && scopeCurrent() ? current.current.session : null;
  const session = {
    open: (...args: Parameters<ProviderControlSession["open"]>) => get()?.open(...args),
    openBlockRemoval: (...args: Parameters<ProviderControlSession["openBlockRemoval"]>) => get()?.openBlockRemoval(...args),
    close: () => get()?.close(), reopen: () => get()?.reopen(), dismissNotice: () => get()?.dismissNotice(),
    check: () => get()?.check(), confirm: () => get()?.confirm(), undo: () => get()?.undo(),
  };
  const view = state.key === key ? state.view : EMPTY_PROVIDER_CONTROL_VIEW;
  return {account, session, view};
}
export type ProviderControls = ReturnType<typeof useProviderControls>;
