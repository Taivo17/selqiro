"use client";

import { useCallback, useEffect, useState } from "react";
import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { getMyHorseOffer } from "../../../entities/horse-offer/api/getMyHorseOffer";
import type { OwnerHorseOfferDetail } from "../../../entities/horse-offer/model/types";
import { getListingActivityActor } from "../../../entities/listing/api/getListingActivityActor";
import { sameListingActor, type ListingActivityActor } from "../../../entities/listing/model/listingRenewal";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { ACTIVE_IDENTITY_CHANGED_EVENT, ACTIVE_IDENTITY_CHANGING_EVENT, ACTIVE_IDENTITY_STORAGE_KEY,
  identityChangePending } from "../../v2-shell/model/identityEvents";

type OwnerHorseOfferDetailState = {
  detail: OwnerHorseOfferDetail | null;
  actor: ListingActivityActor | null;
  errorMessage: string | null;
  isLoading: boolean;
  isNotFound: boolean;
};
export type UseOwnerHorseOfferDetailResult = OwnerHorseOfferDetailState & { reload: () => void };
const initialState: OwnerHorseOfferDetailState = {
  detail: null, actor: null, errorMessage: null, isLoading: true, isNotFound: false,
};

/** Private read-only detail and photo authority belong to one account/identity.
 * A changed account or identity clears them before another request begins. */
export function useOwnerHorseOfferDetail(offerId: string): UseOwnerHorseOfferDetailResult {
  const [state, setState] = useState<OwnerHorseOfferDetailState>(initialState);
  const [reloadRevision, setReloadRevision] = useState(0);
  const reload = useCallback(() => setReloadRevision(value => value + 1), []);
  useEffect(() => {
    let live = true, ticket = 0;
    let acceptedActor: ListingActivityActor | null = null;
    const clear = () => { ++ticket; acceptedActor = null; setState({ ...initialState }); };
    const refresh = () => {
      clear();
      const current = ticket;
      if (identityChangePending(null)) return;
      const valid = () => live && current === ticket && !identityChangePending(null);
      // Supabase auth callbacks never await network work while holding their lock.
      queueMicrotask(() => { void (async () => {
        try {
          const actor = await getListingActivityActor();
          if (!valid()) return;
          const detail = await getMyHorseOffer(offerId);
          if (!valid()) return;
          const after = await getListingActivityActor();
          if (!valid()) return;
          if (!sameListingActor(actor, after) || detail && detail.identityId !== actor.identityId) {
            throw new Error(marketplaceMessage("horse.the_listing_does_not_exist_or_does_not.7a2246"));
          }
          acceptedActor = actor;
          setState({ detail, actor, errorMessage: null, isLoading: false, isNotFound: detail === null });
        } catch (error) {
          if (!valid()) return;
          setState({ detail: null, actor: null, isLoading: false, isNotFound: false,
            errorMessage: safeMarketplaceError(error, marketplaceMessage("horse.the_horse_listing_could_not_be_loaded.154fe9")) });
        }
      })(); });
    };
    const storage = (event: StorageEvent) => { if (event.key === ACTIVE_IDENTITY_STORAGE_KEY || event.key?.startsWith("sb-")) refresh(); };
    const subscription = supabaseBrowserClient.auth.onAuthStateChange((event, session) => {
      if (event !== "INITIAL_SESSION" && (event === "SIGNED_OUT" || session?.user.id !== acceptedActor?.userId)) refresh();
    }).data.subscription;
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, clear);
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, refresh);
    window.addEventListener("storage", storage);
    window.addEventListener("focus", refresh);
    refresh();
    return () => { live = false; ++ticket; subscription.unsubscribe();
      window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, clear);
      window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", refresh);
    };
  }, [offerId, reloadRevision]);
  return { ...state, reload };
}
