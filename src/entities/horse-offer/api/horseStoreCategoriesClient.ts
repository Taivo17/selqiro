import { createContentStoreCategoryApi } from "../../store-category/api/contentStoreCategoriesClient";
import { bindHorseStoreCategoryKey, horseCategoryContentKey, type HorseStoreCategoryKey,
  type HorseStoreCategorySnapshot, type HorseStoreCategoryReceipt } from "../model/storeCategories";

export type HorseStoreCategoryApi = {
  read(key: HorseStoreCategoryKey, signal?: AbortSignal): Promise<HorseStoreCategorySnapshot>;
  save(key: HorseStoreCategoryKey, categoryIds: readonly string[], signal?: AbortSignal): Promise<HorseStoreCategoryReceipt>;
};
export const horseContentCategoryApi = createContentStoreCategoryApi({
  readRpc: "get_my_horse_offer_store_categories_v1", saveRpc: "set_my_horse_offer_store_categories_v1",
  idParameter: "p_offer_id", idField: "offer_id", contextError: "horse_store_category_context_changed",
});
/** Keep the accepted horse-specific API contract while sharing transport only. */
export const horseStoreCategoryApi: HorseStoreCategoryApi = {
  read(input, signal) {
    const key = bindHorseStoreCategoryKey(input);
    return horseContentCategoryApi.read(horseCategoryContentKey(key), signal).then(snapshot => ({...snapshot, key}));
  },
  save(input, categoryIds, signal) {
    const key = horseCategoryContentKey(input);
    return horseContentCategoryApi.save(key, categoryIds, signal).then(({contentId, ...receipt}) => ({...receipt, offerId: contentId}));
  },
};
