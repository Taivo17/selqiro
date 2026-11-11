import { createContentStoreCategoryApi } from "../../store-category/api/contentStoreCategoriesClient";

/** This endpoint accepts only canonical services UUIDs; it never writes a listing copy. */
export const serviceStoreCategoryApi = createContentStoreCategoryApi({
  readRpc: "get_my_service_store_categories_v1", saveRpc: "set_my_service_store_categories_v1",
  idParameter: "p_service_id", idField: "service_id", contextError: "service_store_category_context_changed",
});
