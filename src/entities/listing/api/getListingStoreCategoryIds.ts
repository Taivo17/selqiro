import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";

type ListingStoreCategoryRow = {
  store_category_id?: string | null;
};

function normalizeListingId(value: string): string {
  const cleanValue = value.trim();

  if (!/^[1-9][0-9]*$/.test(cleanValue)) {
    throw new Error("Kuulutuse ID ei ole korrektne.");
  }

  return cleanValue;
}

function normalizeCategoryIds(
  values: Array<string | null | undefined>
): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim() || "")
        .filter(Boolean)
    )
  ).sort((first, second) => first.localeCompare(second));
}

export async function getListingStoreCategoryIds(
  listingId: string
): Promise<string[]> {
  const cleanListingId = normalizeListingId(listingId);

  const { data, error } = await supabaseBrowserClient
    .from("listing_store_categories")
    .select("store_category_id")
    .eq("listing_id", cleanListingId);

  if (error) {
    throw new Error(
      error.message ||
        "Kuulutuse poe-rubriike ei saanud laadida."
    );
  }

  return normalizeCategoryIds(
    ((data || []) as ListingStoreCategoryRow[]).map(
      (row) => row.store_category_id
    )
  );
}
