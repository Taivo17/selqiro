"use client";
import { useSyncExternalStore } from "react";
import { viewerAccountStore } from "./viewerAccountStore";

export function useViewerAccount() {
  const state = useSyncExternalStore(viewerAccountStore.subscribe, viewerAccountStore.getSnapshot, viewerAccountStore.getServerSnapshot);
  return {...state, anonymous: state.ready && !state.actor, refresh: viewerAccountStore.refresh,
    isCurrent: viewerAccountStore.isCurrent, accountKey: `${state.generation}:${state.actor?.userId ?? "anonymous"}`};
}
