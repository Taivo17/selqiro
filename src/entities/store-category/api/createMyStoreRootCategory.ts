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
    return "Selle nimega ülemrubriik on juba olemas.";
  }

  if (error.code === "42501") {
    return "Sul puudub selle identiteedi rubriikide muutmise õigus.";
  }

  if (error.code === "22023") {
    if (error.message?.toLowerCase().includes("active identity")) {
      return "Aktiivne identiteet puudub.";
    }

    return "Kontrolli rubriigi nime.";
  }

  return error.message || "Ülemrubriiki ei saanud lisada.";
}

export async function createMyStoreRootCategory(
  name: string
): Promise<StoreCategory> {
  const cleanName = normalizeStoreCategoryName(name);

  if (!cleanName) {
    throw new Error("Sisesta rubriigi nimi.");
  }

  if (cleanName.length > STORE_CATEGORY_NAME_MAX_LENGTH) {
    throw new Error(
      `Rubriigi nimi võib olla kuni ${STORE_CATEGORY_NAME_MAX_LENGTH} tähemärki.`
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
    throw new Error("Andmebaas ei tagastanud loodud rubriiki.");
  }

  return {
    id: row.id,
    name: row.name,
    sort_order: row.sort_order ?? null,
    parent_id: row.parent_id ?? null,
  };
}
