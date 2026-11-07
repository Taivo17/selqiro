import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";

type DeleteStoreCategoryRpcRow = {
  deleted_category_id?: string | null;
  deleted_name?: string | null;
  deleted_parent_id?: string | null;
  deleted_level?: string | null;
  removed_listing_links?: number | null;
};

export type DeletedStoreCategory = {
  id: string;
  name: string;
  parentId: string | null;
  level: "root" | "child";
  removedListingLinks: number;
};

function firstRow(
  value:
    | DeleteStoreCategoryRpcRow
    | DeleteStoreCategoryRpcRow[]
    | null
    | undefined
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function getDeleteErrorMessage(error: {
  code?: string | null;
  message?: string | null;
}) {
  const message = (error.message || "").toLowerCase();

  if (
    error.code === "23503" ||
    message.includes("has child categories")
  ) {
    return marketplaceMessage("category.remove_the_subcategories_before_deleting_this_parent_category.137a73");
  }

  if (error.code === "42501") {
    return marketplaceMessage("category.you_do_not_have_permission_to_delete_this.2d93c2");
  }

  if (error.code === "22023") {
    if (message.includes("active identity")) {
      return marketplaceMessage("service.no_active_identity.80f933");
    }

    return marketplaceMessage("category.the_category_to_delete_is_missing.e8f8cc");
  }

  return safeMarketplaceError(error, marketplaceMessage("category.the_category_could_not_be_deleted.67c79b"));
}

export async function deleteMyStoreCategory(
  categoryId: string
): Promise<DeletedStoreCategory> {
  const cleanCategoryId = categoryId.trim();

  if (!cleanCategoryId) {
    throw new Error(marketplaceMessage("category.the_category_to_delete_is_missing.e8f8cc"));
  }

  const { data, error } = await supabaseBrowserClient.rpc(
    "delete_my_store_category_v2",
    {
      p_category_id: cleanCategoryId,
    }
  );

  if (error) {
    throw new Error(getDeleteErrorMessage(error));
  }

  const row = firstRow(
    data as
      | DeleteStoreCategoryRpcRow
      | DeleteStoreCategoryRpcRow[]
      | null
  );

  if (!row?.deleted_category_id || !row.deleted_name) {
    throw new Error(marketplaceMessage("category.the_database_did_not_return_the_deleted_category.fb4aeb"));
  }

  if (row.deleted_category_id !== cleanCategoryId) {
    throw new Error(marketplaceMessage("category.the_database_returned_an_unexpected_category.cd850c"));
  }

  const level =
    row.deleted_level === "child" ? "child" : "root";

  return {
    id: row.deleted_category_id,
    name: row.deleted_name,
    parentId: row.deleted_parent_id ?? null,
    level,
    removedListingLinks: Math.max(
      0,
      Number(row.removed_listing_links ?? 0)
    ),
  };
}
