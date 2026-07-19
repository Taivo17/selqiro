import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { StoreCategory } from "../model/types";

type PublicStoreCategoryRow = {
  id?: string | null;
  name?: string | null;
  sort_order?: number | null;
  parent_id?: string | null;
};

function compareCategories(
  first: StoreCategory,
  second: StoreCategory
) {
  const firstOrder =
    typeof first.sort_order === "number"
      ? first.sort_order
      : 0;

  const secondOrder =
    typeof second.sort_order === "number"
      ? second.sort_order
      : 0;

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder;
  }

  return first.name.localeCompare(
    second.name,
    "et"
  );
}

export async function getPublicStoreCategories(
  identityId: string | null | undefined
): Promise<StoreCategory[]> {
  const cleanIdentityId =
    identityId?.trim() || "";

  /*
   * Legacy profile without identity ownership does not
   * have an identity-scoped V2 store-category tree.
   */
  if (!cleanIdentityId) {
    return [];
  }

  const { data, error } =
    await supabaseBrowserClient
      .from("store_categories")
      .select(
        "id, name, sort_order, parent_id"
      )
      .eq("identity_id", cleanIdentityId)
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      error.message ||
        "Avaliku profiili poe-rubriike ei saanud laadida."
    );
  }

  return (
    (data || []) as PublicStoreCategoryRow[]
  )
    .filter(
      (
        row
      ): row is PublicStoreCategoryRow & {
        id: string;
        name: string;
      } =>
        Boolean(row.id && row.name)
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      sort_order: row.sort_order ?? null,
      parent_id: row.parent_id ?? null,
    }))
    .sort(compareCategories);
}
