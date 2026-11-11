import type { HorseDraftActor } from "./draftEdit";
import type { StoreCategory } from "../../store-category/model/types";
import { bindContentStoreCategoryKey, parseContentStoreCategoryRead, parseContentStoreCategoryReceipt } from "../../store-category/model/contentCategories";
export { ContentStoreCategoryError as HorseStoreCategoryError, parseContentCategoryIds as parseHorseCategoryIds,
  sameContentCategoryIds as sameHorseCategoryIds, parseContentStoreCategories as parseHorseStoreCategories } from "../../store-category/model/contentCategories";
export type { ContentStoreCategoryProblem as HorseStoreCategoryProblem } from "../../store-category/model/contentCategories";

export type HorseStoreCategoryKey = HorseDraftActor & { offerId: string };
export type HorseStoreCategorySnapshot = {key: HorseStoreCategoryKey; categories: StoreCategory[]; categoryIds: string[]};
export type HorseStoreCategoryReceipt = {offerId: string; identityId: string; categoryIds: string[]; assignedCount: number};
export function horseCategoryContentKey(key: HorseStoreCategoryKey) {
  return bindContentStoreCategoryKey({userId: key?.userId, identityId: key?.identityId, contentId: key?.offerId});
}
export function bindHorseStoreCategoryKey(value: HorseStoreCategoryKey): HorseStoreCategoryKey {
  const key = horseCategoryContentKey(value);
  return Object.freeze({userId: key.userId, identityId: key.identityId, offerId: key.contentId});
}
export function parseHorseStoreCategoryRead(value: unknown, key: HorseStoreCategoryKey) {
  return parseContentStoreCategoryRead(value, horseCategoryContentKey(key), "offer_id");
}
export function parseHorseStoreCategoryReceipt(value: unknown, key: HorseStoreCategoryKey, requested: readonly string[]): HorseStoreCategoryReceipt {
  const {contentId, ...receipt} = parseContentStoreCategoryReceipt(value, horseCategoryContentKey(key), requested, "offer_id");
  return {...receipt, offerId: contentId};
}
