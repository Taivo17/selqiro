import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import {
  normalizeStoreCategoryName,
  STORE_CATEGORY_NAME_MAX_LENGTH,
  type StoreCategory,
} from "../model/types";

type RenameStoreCategoryRpcRow = {
  id?: string | null;
  name?: string | null;
  sort_order?: number | null;
  parent_id?: string | null;
};

function firstRow(
  value:
    | RenameStoreCategoryRpcRow
    | RenameStoreCategoryRpcRow[]
    | null
    | undefined
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function getRenameErrorMessage(error: {
  code?: string | null;
  message?: string | null;
}) {
  const message = (error.message || "").toLowerCase();

  if (error.code === "23505") {
    return marketplaceMessage("category.a_category_with_this_name_already_exists_at.74381a");
  }

  if (error.code === "42501") {
    return marketplaceMessage("category.you_do_not_have_permission_to_edit_this.a16e2a");
  }

  if (error.code === "22023") {
    if (message.includes("active identity")) {
      return marketplaceMessage("service.no_active_identity.80f933");
    }

    return marketplaceMessage("category.check_the_category_name.21b417");
  }

  return safeMarketplaceError(error, marketplaceMessage("category.the_category_could_not_be_renamed.c0c08e"));
}

export async function renameMyStoreCategory(input: {
  categoryId: string;
  name: string;
}): Promise<StoreCategory> {
  const categoryId = input.categoryId.trim();
  const cleanName = normalizeStoreCategoryName(input.name);

  if (!categoryId) {
    throw new Error(marketplaceMessage("category.the_category_to_edit_is_missing.19c8bb"));
  }

  if (!cleanName) {
    throw new Error(marketplaceMessage("category.enter_a_category_name.730cbc"));
  }

  if (cleanName.length > STORE_CATEGORY_NAME_MAX_LENGTH) {
    throw new Error(
      marketplaceMessage("category.the_category_name_can_contain_up_to_value.0188e5", { p0: String(STORE_CATEGORY_NAME_MAX_LENGTH) })
    );
  }

  const { data, error } = await supabaseBrowserClient.rpc(
    "rename_my_store_category_v2",
    {
      p_category_id: categoryId,
      p_name: cleanName,
    }
  );

  if (error) {
    throw new Error(getRenameErrorMessage(error));
  }

  const row = firstRow(
    data as
      | RenameStoreCategoryRpcRow
      | RenameStoreCategoryRpcRow[]
      | null
  );

  if (!row?.id || !row.name) {
    throw new Error(marketplaceMessage("category.the_database_did_not_return_the_updated_category.d73f0f"));
  }

  if (row.id !== categoryId) {
    throw new Error(marketplaceMessage("category.the_database_returned_an_unexpected_category.cd850c"));
  }

  return {
    id: row.id,
    name: row.name,
    sort_order: row.sort_order ?? null,
    parent_id: row.parent_id ?? null,
  };
}
