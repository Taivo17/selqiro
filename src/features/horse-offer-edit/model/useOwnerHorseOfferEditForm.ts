"use client";

import {
  useMemo,
} from "react";

import {
  useOwnerHorseOfferDetail,
} from "../../horse-offer-detail/model/useOwnerHorseOfferDetail";
import {
  hydrateOwnerHorseOfferEditForm,
  type OwnerHorseOfferEditFormState,
} from "./horseOfferEditHydration";

export type UseOwnerHorseOfferEditFormResult =
  ReturnType<typeof useOwnerHorseOfferDetail> & {
    form: OwnerHorseOfferEditFormState | null;
  };

export function useOwnerHorseOfferEditForm(
  offerId: string
): UseOwnerHorseOfferEditFormResult {
  const detailState =
    useOwnerHorseOfferDetail(offerId);

  const form = useMemo(
    () =>
      detailState.detail
        ? hydrateOwnerHorseOfferEditForm(
            detailState.detail
          )
        : null,
    [detailState.detail]
  );

  return {
    ...detailState,
    form,
  };
}
