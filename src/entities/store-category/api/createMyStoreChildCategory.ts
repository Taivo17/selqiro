import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import {
  normalizeStoreCategoryName,
  STORE_CATEGORY_NAME_MAX_LENGTH,
  type StoreCategory,
} from "../model/types";

type CreateChildCategoryRpcRow = {
  id?: string | null;
  name?: string | null;
  sort_order?: number | null;
  parent_id?: string | null;
};

function firstRow(
  value:
    | CreateChildCategoryRpcRow
    | CreateChildCategoryRpcRow[]
    | null
    | undefined
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function getCreateChildErrorMessage(error: {
  code?: string | null;
  message?: string | null;
}) {
  const message = (error.message || "").toLowerCase();

  if (error.code === "23505") {
    return marketplaceMessage("category.a_subcategory_with_this_name_already_exists_under.bdca8e");
  }

  if (error.code === "42501") {
    return marketplaceMessage("category.you_do_not_have_permission_to_add_a.b5fd8d");
  }

  if (error.code === "22023") {
    if (message.includes("active identity")) {
      return marketplaceMessage("service.no_active_identity.80f933");
    }

    if (message.includes("does not exist")) {
      return marketplaceMessage("category.the_selected_parent_category_was_not_found.9093eb");
    }

    if (message.includes("only be added under a root")) {
      return marketplaceMessage("category.subcategories_can_only_be_added_under_a_parent.0c7217");
    }

    return marketplaceMessage("category.check_the_subcategory_name.ee9ba9");
  }

  return safeMarketplaceError(error, marketplaceMessage("category.the_subcategory_could_not_be_added.33d624"));
}

export async function createMyStoreChildCategory(input: {
  parentId: string;
  name: string;
}): Promise<StoreCategory> {
  const parentId = input.parentId.trim();
  const cleanName = normalizeStoreCategoryName(input.name);

  if (!parentId) {
    throw new Error(marketplaceMessage("category.no_parent_category_is_selected.84730a"));
  }

  if (!cleanName) {
    throw new Error(marketplaceMessage("category.enter_a_subcategory_name.dfbd9a"));
  }

  if (cleanName.length > STORE_CATEGORY_NAME_MAX_LENGTH) {
    throw new Error(
      marketplaceMessage("category.the_subcategory_name_can_contain_up_to_value.6921e5", { p0: String(STORE_CATEGORY_NAME_MAX_LENGTH) })
    );
  }

  const { data, error } = await supabaseBrowserClient.rpc(
    "create_my_store_child_category_v2",
    {
      p_parent_id: parentId,
      p_name: cleanName,
    }
  );

  if (error) {
    throw new Error(getCreateChildErrorMessage(error));
  }

  const row = firstRow(
    data as
      | CreateChildCategoryRpcRow
      | CreateChildCategoryRpcRow[]
      | null
  );

  if (!row?.id || !row.name || !row.parent_id) {
    throw new Error(marketplaceMessage("category.the_database_did_not_return_the_created_subcategory.afd584"));
  }

  if (row.parent_id !== parentId) {
    throw new Error(marketplaceMessage("category.the_created_subcategory_does_not_belong_to_the.0afc4e"));
  }

  return {
    id: row.id,
    name: row.name,
    sort_order: row.sort_order ?? null,
    parent_id: row.parent_id,
  };
}
