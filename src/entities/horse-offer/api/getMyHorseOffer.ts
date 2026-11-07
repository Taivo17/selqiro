import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import {
  supabaseBrowserClient,
} from "../../../shared/supabase/browserClient";

import {
  mapOwnerHorseOfferDetail,
} from "./mappers";
import {
  type OwnerHorseOfferDetail,
} from "../model/types";

const OWNER_HORSE_OFFER_DETAIL_RPC =
  "get_my_horse_offer_v1";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OwnerHorseOfferDetailRpcError = {
  code?: string | null;
  message?: string | null;
};

type OwnerHorseOfferDetailRpcResult = {
  data: unknown;
  error:
    OwnerHorseOfferDetailRpcError | null;
};

type OwnerHorseOfferDetailRpcArgs = {
  p_offer_id: string;
};

type OwnerHorseOfferDetailRpcClient = {
  rpc: (
    name:
      typeof OWNER_HORSE_OFFER_DETAIL_RPC,
    args: OwnerHorseOfferDetailRpcArgs
  ) => PromiseLike<
    OwnerHorseOfferDetailRpcResult
  >;
};

export class OwnerHorseOfferDetailReadError
  extends Error {
  readonly code: string | null;

  constructor(
    message: string,
    code: string | null = null
  ) {
    super(message);
    this.name =
      "OwnerHorseOfferDetailReadError";
    this.code = code;
  }
}

function normalizeHorseOfferId(
  offerId: string
): string {
  const normalized = offerId.trim();

  if (!UUID_PATTERN.test(normalized)) {
    throw new OwnerHorseOfferDetailReadError(
      marketplaceMessage("horse.the_horse_listing_id_is_invalid.8f70aa"),
      "INVALID_HORSE_OFFER_ID"
    );
  }

  return normalized.toLowerCase();
}

export async function getMyHorseOffer(
  offerId: string
): Promise<OwnerHorseOfferDetail | null> {
  const normalizedOfferId =
    normalizeHorseOfferId(offerId);
  const client =
    supabaseBrowserClient as unknown as
      OwnerHorseOfferDetailRpcClient;

  const { data, error } = await client.rpc(
    OWNER_HORSE_OFFER_DETAIL_RPC,
    {
      p_offer_id: normalizedOfferId,
    }
  );

  if (error) {
    throw new OwnerHorseOfferDetailReadError(
      safeMarketplaceError(error, marketplaceMessage("horse.the_horse_listing_details_could_not_be_loaded.fbe973")),
      error.code || null
    );
  }

  if (!Array.isArray(data)) {
    throw new OwnerHorseOfferDetailReadError(
      marketplaceMessage("horse.the_horse_listing_response_has_an_invalid_format.064bfa")
    );
  }

  if (data.length === 0) {
    return null;
  }

  if (data.length !== 1) {
    throw new OwnerHorseOfferDetailReadError(
      marketplaceMessage("horse.the_horse_listing_response_contained_an_unexpected_number.52d9db")
    );
  }

  return mapOwnerHorseOfferDetail(data[0]);
}
