"use client";
import {loadLegacyMarketplacePage} from "../../../entities/listing/api/legacyDiscoveryMarketplace";
import type {LegacyListing, LegacyMarketplaceMetadata} from "../../../entities/listing/model/legacyDiscoveryTypes";
import {useLegacyDiscoveryScope} from "./useLegacyDiscoveryScope";
import {useLegacyDiscoveryPager} from "./useLegacyDiscoveryPager";

export function useLegacyMarketplace(options: {nearOnly: boolean; searchNearCity: string; filterKey: string}) {
  const scope = useLegacyDiscoveryScope();
  const state = useLegacyDiscoveryPager<LegacyListing, LegacyMarketplaceMetadata>({key: `${scope.key}:${JSON.stringify(options)}`, ready: scope.ready,
    signal: scope.actor?.signal, isCurrent: scope.isCurrent,
    load: (offset, signal, previous) => loadLegacyMarketplacePage({actor: scope.actor, signal, isCurrent: scope.isCurrent}, options, offset, previous)});
  return {...state, loading: scope.ready ? state.loading : !scope.error, listings: state.items, currentProfile: state.metadata?.profile ?? null,
    searchNearCoords: state.metadata?.searchNearCoords ?? null};
}
