"use client";
import { useEffect, useRef, useState } from "react";
import { useViewerAccount } from "../../../shared/provider-controls/useViewerAccount";
import { viewerAccountStore } from "../../../shared/provider-controls/viewerAccountStore";
import { notifyProviderControlsChanged } from "../../../shared/provider-controls/providerControlEvents";
import { EMPTY_PROVIDER_CONTROL_VIEW, ProviderControlSession, type ProviderControlView } from "./providerControlSession";

export function useProviderControls() {
  const account = useViewerAccount();
  const key = account.accountKey, current = useRef<{key: string; session: ProviderControlSession} | null>(null);
  const [state, setState] = useState<{key: string; view: ProviderControlView}>({key: "", view: EMPTY_PROVIDER_CONTROL_VIEW});
  useEffect(() => {
    const session = new ProviderControlSession({
      getActor: () => viewerAccountStore.getSnapshot().actor,
      isCurrent: actor => viewerAccountStore.isCurrent(actor) && `${actor.generation}:${actor.userId}` === key,
      changed: action => notifyProviderControlsChanged(action === "hide" || action === "unhide" ? "hidden" : "blocked"),
    });
    current.current = {key, session};
    const update = () => setState({key, view: session.getSnapshot()});
    const unsubscribe = session.subscribe(update); update();
    return () => {unsubscribe(); session.retire(); if (current.current?.session === session) current.current = null;};
  }, [key]);
  const get = () => current.current?.key === key ? current.current.session : null;
  const session = {
    open: (...args: Parameters<ProviderControlSession["open"]>) => get()?.open(...args),
    close: () => get()?.close(), reopen: () => get()?.reopen(), dismissNotice: () => get()?.dismissNotice(),
    check: () => get()?.check(), confirm: () => get()?.confirm(), undo: () => get()?.undo(),
  };
  const view = state.key === key ? state.view : EMPTY_PROVIDER_CONTROL_VIEW;
  return {account, session, view};
}
export type ProviderControls = ReturnType<typeof useProviderControls>;
