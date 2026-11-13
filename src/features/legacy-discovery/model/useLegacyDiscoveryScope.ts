"use client";
import {useEffect, useRef, useState} from "react";
import {useViewerReadScope} from "../../../shared/provider-controls/useViewerReadScope";
import {viewerAccountStore, type ViewerAccountSnapshot} from "../../../shared/provider-controls/viewerAccountStore";
import {providerControlRevision} from "../../../shared/provider-controls/providerControlEvents";
import {ACTIVE_IDENTITY_CHANGED_EVENT, ACTIVE_IDENTITY_CHANGING_EVENT, ACTIVE_IDENTITY_STORAGE_KEY,
  identityChangePending} from "../../v2-shell/model/identityEvents";

export function isLegacyDiscoveryScopeCurrent(account: ViewerAccountSnapshot & {revision: number},
  expectedIdentityRevision: number, identityRevision: number) {
  if (!account.ready || account.error || identityRevision !== expectedIdentityRevision
    || providerControlRevision("discovery") !== account.revision
    || identityChangePending(account.actor?.userId ?? null)) return false;
  if (account.actor) return viewerAccountStore.isCurrent(account.actor);
  const now = viewerAccountStore.getSnapshot();
  return now.ready && !now.error && !now.actor && now.generation === account.generation;
}

export function useLegacyDiscoveryScope() {
  const account = useViewerReadScope("discovery"), identityVersion = useRef(0);
  const [identityRevision, setIdentityRevision] = useState(0);
  useEffect(() => {
    const invalidate = () => {identityVersion.current += 1; setIdentityRevision(identityVersion.current);};
    const storage = (event: StorageEvent) => {if (event.key === null || event.key === ACTIVE_IDENTITY_STORAGE_KEY) invalidate();};
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, invalidate);
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, invalidate); window.addEventListener("storage", storage);
    return () => {window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, invalidate);
      window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, invalidate); window.removeEventListener("storage", storage);};
  }, []);
  const ready = account.ready && !account.error && !identityChangePending(account.actor?.userId ?? null);
  const isCurrent = () => isLegacyDiscoveryScopeCurrent(account, identityRevision, identityVersion.current);
  return {...account, ready, isCurrent, key: `${account.key}:identity:${identityRevision}`};
}
