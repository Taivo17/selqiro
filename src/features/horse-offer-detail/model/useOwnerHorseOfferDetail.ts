"use client";

import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getMyHorseOffer,
} from "../../../entities/horse-offer/api/getMyHorseOffer";
import type {
  OwnerHorseOfferDetail,
} from "../../../entities/horse-offer/model/types";

type OwnerHorseOfferDetailState = {
  detail: OwnerHorseOfferDetail | null;
  errorMessage: string | null;
  isLoading: boolean;
  isNotFound: boolean;
};

export type UseOwnerHorseOfferDetailResult =
  OwnerHorseOfferDetailState & {
    reload: () => void;
  };

const initialState: OwnerHorseOfferDetailState = {
  detail: null,
  errorMessage: null,
  isLoading: true,
  isNotFound: false,
};

function getReadErrorMessage(
  error: unknown
): string {
  return safeMarketplaceError(error, marketplaceMessage("horse.the_horse_listing_could_not_be_loaded.154fe9"));
}

export function useOwnerHorseOfferDetail(
  offerId: string
): UseOwnerHorseOfferDetailResult {
  const [
    state,
    setState,
  ] = useState<OwnerHorseOfferDetailState>(
    initialState
  );
  const [
    reloadRevision,
    setReloadRevision,
  ] = useState(0);

  const reload = useCallback(() => {
    setReloadRevision((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const normalizedOfferId = offerId.trim();

    if (!normalizedOfferId) {
      setState({
        detail: null,
        errorMessage:
          marketplaceMessage("horse.the_horse_listing_id_is_missing.0c601d"),
        isLoading: false,
        isNotFound: false,
      });

      return () => {
        cancelled = true;
      };
    }

    setState({
      detail: null,
      errorMessage: null,
      isLoading: true,
      isNotFound: false,
    });

    void getMyHorseOffer(
      normalizedOfferId
    )
      .then((detail) => {
        if (cancelled) {
          return;
        }

        if (!detail) {
          setState({
            detail: null,
            errorMessage: null,
            isLoading: false,
            isNotFound: true,
          });

          return;
        }

        setState({
          detail,
          errorMessage: null,
          isLoading: false,
          isNotFound: false,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setState({
          detail: null,
          errorMessage:
            getReadErrorMessage(error),
          isLoading: false,
          isNotFound: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    offerId,
    reloadRevision,
  ]);

  return {
    ...state,
    reload,
  };
}
