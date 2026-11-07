import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { HORSE_DRAFT_CHANGE_KEYS, isHorseDraftUuid, isHorseDraftRevision, isExpectedHorseDraftRevision,
  type HorseDraftUpdateInput, type HorseDraftUpdateResult, type HorseDraftChanges } from "../model/draftEdit";
import { HorseDraftWriteError, horseDraftRpcError, singleHorseDraftRow, type HorseDraftRpcResult } from "../model/draftWriteError";

export async function updateMyHorseOfferDraft(input: HorseDraftUpdateInput): Promise<HorseDraftUpdateResult> {
  const changes = input.changes;
  if (!isHorseDraftUuid(input.offerId) || !isHorseDraftRevision(input.editRevision)
    || !changes || Array.isArray(changes) || typeof changes !== "object"
    || Object.keys(changes).length === 0 || Object.entries(changes).some(([key, value]) =>
      !HORSE_DRAFT_CHANGE_KEYS.includes(key as typeof HORSE_DRAFT_CHANGE_KEYS[number])
      || !(value === null || typeof value === "string" || (typeof value === "number" && Number.isFinite(value))))) {
    throw new HorseDraftWriteError(marketplaceMessage("horse.the_draft_changes_have_an_invalid_format.f63800"), "not_sent");
  }
  const client = supabaseBrowserClient as unknown as {
    rpc(name: "update_my_horse_offer_draft_v1", args: { p_offer_id: string; p_expected_edit_revision: string; p_changes: HorseDraftChanges }): PromiseLike<HorseDraftRpcResult>;
  };
  const { data, error } = await client.rpc("update_my_horse_offer_draft_v1", {
    p_offer_id: input.offerId, p_expected_edit_revision: input.editRevision, p_changes: changes,
  });
  if (error) throw horseDraftRpcError(error);
  const row = singleHorseDraftRow(data);
  if (!row || row.offer_id !== input.offerId
    || !isExpectedHorseDraftRevision(input.editRevision, row.edit_revision)
    || typeof row.updated_at !== "string" || !Number.isFinite(Date.parse(row.updated_at))) {
    throw new HorseDraftWriteError(marketplaceMessage("horse.the_update_result_could_not_be_confirmed.fde540"), "unknown", null, input.offerId);
  }
  return { offerId: row.offer_id, editRevision: row.edit_revision, updatedAt: row.updated_at };
}
