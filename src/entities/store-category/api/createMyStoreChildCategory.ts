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
    return "Selle nimega alamrubriik on selle ülemrubriigi all juba olemas.";
  }

  if (error.code === "42501") {
    return "Sul puudub selle ülemrubriigi alla lisamise õigus.";
  }

  if (error.code === "22023") {
    if (message.includes("active identity")) {
      return "Aktiivne identiteet puudub.";
    }

    if (message.includes("does not exist")) {
      return "Valitud ülemrubriiki ei leitud.";
    }

    if (message.includes("only be added under a root")) {
      return "Alamrubriiki saab lisada ainult ülemrubriigi alla.";
    }

    return "Kontrolli alamrubriigi nime.";
  }

  return error.message || "Alamrubriiki ei saanud lisada.";
}

export async function createMyStoreChildCategory(input: {
  parentId: string;
  name: string;
}): Promise<StoreCategory> {
  const parentId = input.parentId.trim();
  const cleanName = normalizeStoreCategoryName(input.name);

  if (!parentId) {
    throw new Error("Valitud ülemrubriik puudub.");
  }

  if (!cleanName) {
    throw new Error("Sisesta alamrubriigi nimi.");
  }

  if (cleanName.length > STORE_CATEGORY_NAME_MAX_LENGTH) {
    throw new Error(
      `Alamrubriigi nimi võib olla kuni ${STORE_CATEGORY_NAME_MAX_LENGTH} tähemärki.`
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
    throw new Error("Andmebaas ei tagastanud loodud alamrubriiki.");
  }

  if (row.parent_id !== parentId) {
    throw new Error("Loodud alamrubriigi ülemrubriik ei vasta valikule.");
  }

  return {
    id: row.id,
    name: row.name,
    sort_order: row.sort_order ?? null,
    parent_id: row.parent_id,
  };
}
