"use client";
import {loadLegacyFeedPage} from "../../../entities/listing/api/legacyDiscoveryFeed";
import type {LegacyFeedMetadata, LegacyListing} from "../../../entities/listing/model/legacyDiscoveryTypes";
import {useLegacyDiscoveryScope} from "./useLegacyDiscoveryScope";
import {useLegacyDiscoveryPager} from "./useLegacyDiscoveryPager";

export function useLegacyFeed() {
  const scope = useLegacyDiscoveryScope();
  const state = useLegacyDiscoveryPager<LegacyListing, LegacyFeedMetadata>({key: scope.key, ready: scope.ready && !!scope.actor,
    signal: scope.actor?.signal, isCurrent: scope.isCurrent,
    load: (offset, signal, previous) => loadLegacyFeedPage({actor: scope.actor, signal, isCurrent: scope.isCurrent}, offset, previous)});
  return {...state, currentProfile: state.metadata?.profile ?? null, user: scope.actor ? {id: scope.actor.userId} : null,
    authLoading: !scope.ready && !scope.error};
}
