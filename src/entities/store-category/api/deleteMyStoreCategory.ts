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
    return "Ülemrubriiki ei saa kustutada enne selle alamrubriikide eemaldamist.";
  }

  if (error.code === "42501") {
    return "Sul puudub selle rubriigi kustutamise õigus.";
  }

  if (error.code === "22023") {
    if (message.includes("active identity")) {
      return "Aktiivne identiteet puudub.";
    }

    return "Kustutatav rubriik puudub.";
  }

  return error.message || "Rubriiki ei saanud kustutada.";
}

export async function deleteMyStoreCategory(
  categoryId: string
): Promise<DeletedStoreCategory> {
  const cleanCategoryId = categoryId.trim();

  if (!cleanCategoryId) {
    throw new Error("Kustutatav rubriik puudub.");
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
    throw new Error("Andmebaas ei tagastanud kustutatud rubriiki.");
  }

  if (row.deleted_category_id !== cleanCategoryId) {
    throw new Error("Andmebaas tagastas ootamatu rubriigi.");
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
