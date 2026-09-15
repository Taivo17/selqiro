import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { HORSE_OFFER_DRAFT_OFFER_TYPES, type SaveMyHorseOfferDraftInput, type SavedHorseOfferDraft, type HorseOfferDraftOfferType } from "../model/types";
import { isHorseDraftUuid } from "../model/draftEdit";
import { HorseDraftWriteError, horseDraftRpcError, singleHorseDraftRow, type HorseDraftRpcResult } from "../model/draftWriteError";
import { toHorseOfferDraftRpcArgs } from "./horseDraftCreateArgs";

/** Compatibility path: creation only. Never use legacy same-ID updates. */
export async function saveMyHorseOfferDraft(input: SaveMyHorseOfferDraftInput): Promise<SavedHorseOfferDraft> {
  if (input.offerId !== null) {
    throw new HorseDraftWriteError("Olemasolev mustand vajab versioonikontrolliga uuendamist.", "not_sent");
  }
  const client = supabaseBrowserClient as unknown as {
    rpc(name: "save_my_horse_offer_draft_v1", args: ReturnType<typeof toHorseOfferDraftRpcArgs>): PromiseLike<HorseDraftRpcResult>;
  };
  const { data, error } = await client.rpc("save_my_horse_offer_draft_v1", toHorseOfferDraftRpcArgs(input));
  if (error) throw horseDraftRpcError(error);
  const row = singleHorseDraftRow(data);
  const knownId = isHorseDraftUuid(row?.id) ? row.id : null;
  if (!row || !knownId || !isHorseDraftUuid(row.identity_id)
    || !isHorseDraftUuid(row.created_by_user_id) || row.status !== "draft"
    || row.market_country_code !== "EE" || row.horse_location_country_code !== "EE" || row.currency !== "EUR"
    || !HORSE_OFFER_DRAFT_OFFER_TYPES.includes(row.offer_type as HorseOfferDraftOfferType)
    || (row.edit_revision !== 1 && row.edit_revision !== "1")
    || typeof row.title !== "string" || typeof row.description !== "string"
    || typeof row.created_at !== "string" || !Number.isFinite(Date.parse(row.created_at))
    || typeof row.updated_at !== "string" || !Number.isFinite(Date.parse(row.updated_at))) {
    throw new HorseDraftWriteError("Loomise vastust ei saanud kinnitada.", "unknown", null, knownId);
  }
  return {
    offerId: knownId, identityId: row.identity_id, createdByUserId: row.created_by_user_id,
    offerType: row.offer_type as HorseOfferDraftOfferType, status: "draft", title: row.title, description: row.description,
    createdAt: row.created_at, updatedAt: row.updated_at, editRevision: "1",
  };
}
