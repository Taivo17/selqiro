"use client";
import { useCallback, useSyncExternalStore } from "react";
import { useViewerAccount } from "./useViewerAccount";
import { providerControlRevision, subscribeProviderControlChanges, type ProviderReadScope } from "./providerControlEvents";

export function useProviderControlRevision(scope: ProviderReadScope = "all") {
  const subscribe = useCallback((listener: () => void) => subscribeProviderControlChanges(listener, scope), [scope]);
  const getSnapshot = useCallback(() => providerControlRevision(scope), [scope]);
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
export function useViewerReadScope(scope: ProviderReadScope) {
  const account = useViewerAccount(), revision = useProviderControlRevision(scope);
  return {...account, revision, key: `${account.accountKey}:${revision}`};
}
