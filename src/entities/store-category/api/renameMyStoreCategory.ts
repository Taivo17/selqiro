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
    return "Selle nimega rubriik on samal tasemel juba olemas.";
  }

  if (error.code === "42501") {
    return "Sul puudub selle rubriigi muutmise õigus.";
  }

  if (error.code === "22023") {
    if (message.includes("active identity")) {
      return "Aktiivne identiteet puudub.";
    }

    return "Kontrolli rubriigi nime.";
  }

  return error.message || "Rubriigi nime ei saanud muuta.";
}

export async function renameMyStoreCategory(input: {
  categoryId: string;
  name: string;
}): Promise<StoreCategory> {
  const categoryId = input.categoryId.trim();
  const cleanName = normalizeStoreCategoryName(input.name);

  if (!categoryId) {
    throw new Error("Muudetav rubriik puudub.");
  }

  if (!cleanName) {
    throw new Error("Sisesta rubriigi nimi.");
  }

  if (cleanName.length > STORE_CATEGORY_NAME_MAX_LENGTH) {
    throw new Error(
      `Rubriigi nimi võib olla kuni ${STORE_CATEGORY_NAME_MAX_LENGTH} tähemärki.`
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
    throw new Error("Andmebaas ei tagastanud muudetud rubriiki.");
  }

  if (row.id !== categoryId) {
    throw new Error("Andmebaas tagastas ootamatu rubriigi.");
  }

  return {
    id: row.id,
    name: row.name,
    sort_order: row.sort_order ?? null,
    parent_id: row.parent_id ?? null,
  };
}
