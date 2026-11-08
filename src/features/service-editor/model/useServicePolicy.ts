"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMyRequiredPublicationPolicyStatus } from "../../../entities/publication-policy/api/getMyRequiredPublicationPolicyStatus";
import { acceptPublicationPolicy } from "../../../entities/publication-policy/api/acceptPublicationPolicy";
import { getListingActivityActor } from "../../../entities/listing/api/getListingActivityActor";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import type { PublicationPolicyStatus } from "../../../entities/publication-policy/model/types";
import type { ServicePolicySnapshot } from "../../../entities/service/model/servicePublication";

type State = {key: string; policy: PublicationPolicyStatus | null; loading: boolean; accepting: boolean; error: boolean};
export function useServicePolicy(actor: PublicationActor | null, active: boolean, canAct: () => boolean) {
  const key = actor ? `${actor.userId}:${actor.identityId}` : "", generation = useRef(0), mounted = useRef(false), permitted = useRef(canAct);
  const accepting = useRef(false);
  permitted.current = canAct;
  const [state, setState] = useState<State>({key, policy: null, loading: true, accepting: false, error: false});
  const [retryNumber, setRetryNumber] = useState(0);
  const userId = actor?.userId, identityId = actor?.identityId;
  const refresh = useCallback(() => setRetryNumber(value => value + 1), []);
  const invalidate = useCallback(() => {mounted.current = false; generation.current += 1;}, []);
  useEffect(() => {
    mounted.current = true; const ticket = ++generation.current;
    if (!active || !userId || !identityId) {setState({key, policy: null, loading: true, accepting: false, error: false}); return invalidate;}
    const current = () => mounted.current && ticket === generation.current && permitted.current();
    setState({key, policy: null, loading: true, accepting: false, error: false});
    void (async () => {
      try {
        const before = await getListingActivityActor();
        if (!current() || before.userId !== userId || before.identityId !== identityId) return;
        const policies = await getMyRequiredPublicationPolicyStatus({contentType: "service", countryCode: "EE", locale: "et-EE"});
        const after = await getListingActivityActor();
        if (!current() || after.userId !== userId || after.identityId !== identityId) return;
        if (policies.length !== 1 || policies[0].policyKey !== "marketplace-general") throw new Error("service_policy_unavailable");
        setState({key, policy: policies[0], loading: false, accepting: false, error: false});
      } catch {if (current()) setState({key, policy: null, loading: false, accepting: false, error: true});}
    })();
    return invalidate;
  }, [key, active, userId, identityId, retryNumber, invalidate]);
  const accept = async () => {
    const policy = state.policy, ticket = generation.current;
    if (!active || !userId || !identityId || state.key !== key || !policy || policy.accepted || state.accepting || accepting.current || !permitted.current()) return;
    accepting.current = true;
    const current = () => mounted.current && ticket === generation.current && permitted.current();
    setState(current => ({...current, accepting: true, error: false}));
    try {
      const before = await getListingActivityActor();
      if (!current() || before.userId !== userId || before.identityId !== identityId) return;
      await acceptPublicationPolicy({policyDocumentId: policy.policyDocumentId, policyVersion: policy.policyVersion, contentHash: policy.contentHash, identityId});
      if (current()) refresh();
    } catch {if (current()) {setState(previous => ({...previous, accepting: false, error: true}));}}
    finally {accepting.current = false;}
  };
  const current = active && state.key === key ? state : {key, policy: null, loading: true, accepting: false, error: false};
  const snapshot = useMemo<readonly ServicePolicySnapshot[] | null>(() => current.policy?.accepted && !current.loading && !current.error
    ? [{documentId: current.policy.policyDocumentId, version: current.policy.policyVersion, contentHash: current.policy.contentHash, accepted: true}] : null,
    [current.policy, current.loading, current.error]);
  return {...current, snapshot, accept, refresh};
}
