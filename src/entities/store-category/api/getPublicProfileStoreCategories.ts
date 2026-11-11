import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { publicProfileCategoriesRequest, parsePublicProfileCategoriesV2,
  type PublicCategoryScope } from "../model/publicProfileCategoriesV2";
import type { StoreCategory } from "../model/types";

/** Read the entire contextual tree, independently of the selected result page. */
export async function getPublicProfileStoreCategories(input: {identityId: string; sellerSlug: string; scope: PublicCategoryScope}, signal: AbortSignal) {
  const rows: StoreCategory[] = [], seen = new Set<string>();
  let total: string | null = null, offset = 0;
  const base = {...input};
  for (;;) {
    const request = publicProfileCategoriesRequest({...base, limit: 100, offset});
    if (signal.aborted) throw new Error("public_profile_categories_unavailable");
    const {data, error} = await supabaseBrowserClient.rpc("get_public_profile_store_categories_v2", {
      p_seller_slug: request.sellerSlug, p_content_scope: request.scope,
      p_result_limit: request.limit, p_result_offset: request.offset,
    }).abortSignal(signal);
    if (error || signal.aborted) throw new Error("public_profile_categories_unavailable");
    const page = parsePublicProfileCategoriesV2(data, request);
    if (total !== null && total !== page.totalCount || page.windowLimitReached) throw new Error("public_profile_categories_changed");
    total = page.totalCount;
    for (const category of page.items) {
      if (seen.has(category.id)) throw new Error("public_profile_categories_changed");
      seen.add(category.id); rows.push(category);
    }
    if (page.nextOffset === null) break;
    offset = page.nextOffset;
  }
  const byId = new Map(rows.map(row => [row.id, row]));
  for (const row of rows) {
    let parent = row.parent_id;
    const ancestors = new Set([row.id]);
    while (parent) {
      if (!byId.has(parent) || ancestors.has(parent)) throw new Error("public_profile_categories_incomplete");
      ancestors.add(parent); parent = byId.get(parent)!.parent_id;
    }
  }
  return rows;
}
