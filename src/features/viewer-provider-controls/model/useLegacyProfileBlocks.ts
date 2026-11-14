"use client";
import {useEffect, useState} from "react";
import {providerControlsClient} from "../../../entities/viewer-provider-controls/api/providerControlsClient";
import type {ProviderControlState} from "../../../entities/viewer-provider-controls/model/types";
import {useViewerReadScope} from "../../../shared/provider-controls/useViewerReadScope";
import {useProviderControls} from "./useProviderControls";

/** The profile resolver defines both creation and removal. Identity UUIDs are never treated as account IDs. */
export function useLegacyProfileBlocks(identityId: string | null, expectedUserId: string | null) {
  const account = useViewerReadScope("visibility"), [retry, setRetry] = useState(0);
  const key = `${account.key}:${identityId}:${expectedUserId}:${retry}`;
  const [read, setRead] = useState<{key: string; state: ProviderControlState | null; error: boolean}>({key: "", state: null, error: false});
  const controls = useProviderControls({key: `profile:${identityId}:${expectedUserId}:${account.accountKey}`,
    signal: account.actor?.signal,
    isCurrent: () => !!identityId && !!account.actor && account.actor.userId === expectedUserId && account.isCurrent(account.actor),
  });
  useEffect(() => {
    const actor = account.actor;
    if (!identityId || !actor || actor.userId !== expectedUserId || !account.isCurrent(actor)) return;
    const controller = new AbortController(), abort = () => controller.abort();
    actor.signal.addEventListener("abort", abort, {once: true}); if (actor.signal.aborted) abort();
    void providerControlsClient.get(actor, {type: "profile", id: identityId}, controller.signal).then(state => {
      if (!controller.signal.aborted && account.isCurrent(actor)) setRead({key, state, error: false});
    }).catch(() => {if (!controller.signal.aborted && account.isCurrent(actor)) setRead({key, state: null, error: true});});
    return () => {controller.abort(); actor.signal.removeEventListener("abort", abort);};
    // Key includes the account generation, provider, preference revision and explicit read retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const visible = account.actor?.userId === expectedUserId && account.ready && read.key === key;
  const snapshot = visible ? read.state : null;
  const loading = !!identityId && !!expectedUserId && !account.error && !visible;
  const error = account.error || (visible && read.error);
  // The current store RPC always returns an identity, but a legacy/malformed
  // identity-less view must not become an endless loading screen. Its new block
  // actions remain unavailable; we never guess an account from profile.id.
  const restricted = !!identityId && !!expectedUserId && (!snapshot?.targetAvailable || snapshot.blockedByMe || snapshot.blockedByOther);
  return {controls, snapshot, loading, error, restricted, refresh: () => account.error ? account.refresh() : setRetry(value => value + 1),
    openBlock: () => {if (identityId && snapshot?.canBlock) controls.session.open({type: "profile", id: identityId}, "block", snapshot.provider.displayName);},
    openUnblock: () => {if (snapshot?.blockedByMe) controls.session.openBlockRemoval(snapshot);}};
}
export type LegacyProfileBlocks = ReturnType<typeof useLegacyProfileBlocks>;
