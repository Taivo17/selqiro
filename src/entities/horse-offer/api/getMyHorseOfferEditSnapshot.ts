import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { isHorseDraftRevision, isHorseDraftUuid } from "../model/draftEdit";
import type { HorseDraftRpcResult } from "../model/draftWriteError";
import type { OwnerHorseOfferEditSnapshot } from "../model/editSnapshot";
import { mapOwnerHorseOfferDetail } from "./mappers";

export class OwnerHorseOfferEditReadError extends Error {
  constructor(message: string, readonly code: string | null = null) {
    super(message);
    this.name = "OwnerHorseOfferEditReadError";
  }
}

/** A read-only adapter: never calls the ordinary detail RPC to fetch a token later. */
export async function getMyHorseOfferEditSnapshot(
  offerId: string,
): Promise<OwnerHorseOfferEditSnapshot | null> {
  const id = offerId.trim().toLowerCase();
  if (!isHorseDraftUuid(id)) {
    throw new OwnerHorseOfferEditReadError("Pakkumise ID ei sobi.", "INVALID_ID");
  }
  const client = supabaseBrowserClient as unknown as {
    rpc(name: "get_my_horse_offer_edit_snapshot_v1", args: { p_offer_id: string }): PromiseLike<HorseDraftRpcResult>;
  };
  const { data, error } = await client.rpc("get_my_horse_offer_edit_snapshot_v1", { p_offer_id: id });
  if (error) throw new OwnerHorseOfferEditReadError("Mustandi andmeid ei saanud laadida.", error.code || null);
  if (!Array.isArray(data) || data.length > 1) {
    throw new OwnerHorseOfferEditReadError("Mustandi lugemise vastus ei sobi.", "INVALID_RESPONSE");
  }
  if (data.length === 0) return null;
  const row: unknown = data[0];
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new OwnerHorseOfferEditReadError("Mustandi andmeversioon puudub.", "INVALID_RESPONSE");
  }
  const record = row as Record<string, unknown>;
  if (!isHorseDraftRevision(record.edit_revision)) {
    throw new OwnerHorseOfferEditReadError("Mustandi andmeversioon ei sobi.", "INVALID_REVISION");
  }
  const detail = mapOwnerHorseOfferDetail(record.offer);
  if (detail.offerId !== id || detail.contentId !== id || !isHorseDraftUuid(detail.identityId)) {
    throw new OwnerHorseOfferEditReadError("Mustandi vastus ei kuulu küsitud pakkumisele.", "INVALID_IDENTITY");
  }
  return { detail, editRevision: record.edit_revision };
}
