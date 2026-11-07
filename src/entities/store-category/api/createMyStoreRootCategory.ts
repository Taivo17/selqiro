import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import {
  normalizeStoreCategoryName,
  STORE_CATEGORY_NAME_MAX_LENGTH,
  type StoreCategory,
} from "../model/types";

type CreateRootCategoryRpcRow = {
  id?: string | null;
  name?: string | null;
  sort_order?: number | null;
  parent_id?: string | null;
};

function firstRow(
  value:
    | CreateRootCategoryRpcRow
    | CreateRootCategoryRpcRow[]
    | null
    | undefined
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function getCreateErrorMessage(error: {
  code?: string | null;
  message?: string | null;
}) {
  if (error.code === "23505") {
    return marketplaceMessage("category.a_parent_category_with_this_name_already_exists.75499c");
  }

  if (error.code === "42501") {
    return marketplaceMessage("category.you_do_not_have_permission_to_change_this.22a348");
  }

  if (error.code === "22023") {
    if (error.message?.toLowerCase().includes("active identity")) {
      return marketplaceMessage("service.no_active_identity.80f933");
    }

    return marketplaceMessage("category.check_the_category_name.21b417");
  }

  return safeMarketplaceError(error, marketplaceMessage("category.the_parent_category_could_not_be_added.fb0b3a"));
}

export async function createMyStoreRootCategory(
  name: string
): Promise<StoreCategory> {
  const cleanName = normalizeStoreCategoryName(name);

  if (!cleanName) {
    throw new Error(marketplaceMessage("category.enter_a_category_name.730cbc"));
  }

  if (cleanName.length > STORE_CATEGORY_NAME_MAX_LENGTH) {
    throw new Error(
      marketplaceMessage("category.the_category_name_can_contain_up_to_value.0188e5", { p0: String(STORE_CATEGORY_NAME_MAX_LENGTH) })
    );
  }

  const { data, error } = await supabaseBrowserClient.rpc(
    "create_my_store_root_category_v2",
    {
      p_name: cleanName,
    }
  );

  if (error) {
    throw new Error(getCreateErrorMessage(error));
  }

  const row = firstRow(
    data as
      | CreateRootCategoryRpcRow
      | CreateRootCategoryRpcRow[]
      | null
  );

  if (!row?.id || !row.name) {
    throw new Error(marketplaceMessage("category.the_database_did_not_return_the_created_category.023132"));
  }

  return {
    id: row.id,
    name: row.name,
    sort_order: row.sort_order ?? null,
    parent_id: row.parent_id ?? null,
  };
}
