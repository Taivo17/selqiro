"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { getListingActivityActor } from "../../../entities/listing/api/getListingActivityActor";
import { renewMyListingActivity } from "../../../entities/listing/api/renewMyListingActivity";
import { updateListingStatus } from "../../../entities/listing/api/updateListingStatus";
import { ACTIVE_IDENTITY_CHANGED_EVENT } from "../../v2-shell/model/useV2IdentitySwitcher";
import { getMyAreaMarketplaceItemRows } from "./getMyAreaMarketplaceItemRows";
import { OwnerListingActivitySession, type OwnerListingActivityState } from "./ownerListingActivitySession";
import { ownerListingsFilterKey, type MyAreaListingsFilters } from "./myAreaListingsFilters";
export type { MyAreaListingsFilters, MyAreaListingsStatusFilter } from "./myAreaListingsFilters";
export type MyAreaListingsState = OwnerListingActivityState;

export function useMyAreaListings(filters: MyAreaListingsFilters = {}) {
  const [session] = useState(() => new OwnerListingActivitySession({ actor: getListingActivityActor,
    read: getMyAreaMarketplaceItemRows, renew: renewMyListingActivity, status: updateListingStatus }));
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const key = ownerListingsFilterKey(filters);
  const limit = filters.limit ?? 500, offset = filters.offset ?? 0;
  const statusFilter = filters.statusFilter ?? "all", searchQuery = filters.searchQuery ?? "";
  const storeCategoryFilter = filters.storeCategoryFilter ?? null;
  useEffect(() => {
    session.activate();
    let scheduled: ReturnType<typeof setTimeout> | undefined;
    const scheduleRead = () => {
      clearTimeout(scheduled);
      scheduled = setTimeout(() => { void session.reload(); }, 0);
    };
    const refresh = () => { session.invalidate(); scheduleRead(); };
    const { data: { subscription } } = supabaseBrowserClient.auth.onAuthStateChange((_event, next) => {
      // Synchronous invalidation only; never await Supabase inside its auth lock.
      if (session.authChanged(next?.user.id ?? null)) scheduleRead();
    });
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      session.deactivate(); clearTimeout(scheduled); subscription.unsubscribe();
      window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [session]);
  useEffect(() => {
    void session.load({ limit, offset, statusFilter, searchQuery, storeCategoryFilter });
  }, [session, limit, offset, statusFilter, searchQuery, storeCategoryFilter]);
  // No one-render stale controls after filter changes, before the effect has loaded.
  const matching = state.filterKey === key;
  return { ...state, listings: matching ? state.listings : [], loading: state.loading || !matching,
    confirmation: matching ? state.confirmation : null, session };
}
