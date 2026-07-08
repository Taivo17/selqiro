import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { buildListingSearchText } from "../model/buildListingSearchText";

export type UpdateListingBasicsInput = {
  listingId: string;
  userId: string | null;
  activeIdentityId: string | null;
  title: string;
  description: string;
  price: string;
  condition: string;
  category: string | null;
  subcategory: string | null;
  details: Record<string, unknown>;
};

type ListingOwnerRow = {
  id: string | number;
  identity_id?: string | null;
  user_id?: string | null;
};

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeLongText(value: string): string {
  return value.trim();
}

function parsePriceAmount(value: string): number | null {
  const cleaned = value
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  if (!cleaned) return null;

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

function validateInput(input: UpdateListingBasicsInput) {
  const title = normalizeText(input.title);

  if (!input.userId) {
    throw new Error("Sisselogimine puudub.");
  }

  if (!input.listingId) {
    throw new Error("Kuulutuse id puudub.");
  }

  if (title.length < 2) {
    throw new Error("Pealkiri peab olema vähemalt 2 tähemärki.");
  }

  if (title.length > 140) {
    throw new Error("Pealkiri on liiga pikk.");
  }

  if (input.description.length > 5000) {
    throw new Error("Kirjeldus on liiga pikk.");
  }
}

function canEditListing(input: {
  row: ListingOwnerRow;
  userId: string;
  activeIdentityId: string | null;
}): boolean {
  const rowIdentityId = input.row.identity_id || null;
  const rowUserId = input.row.user_id || null;

  if (rowIdentityId) {
    return Boolean(input.activeIdentityId && rowIdentityId === input.activeIdentityId);
  }

  return Boolean(rowUserId && rowUserId === input.userId);
}

export async function updateListingBasics(
  input: UpdateListingBasicsInput
): Promise<void> {
  validateInput(input);

  const userId = input.userId as string;
  const activeIdentityId =
    input.activeIdentityId && input.activeIdentityId !== "fallback-private"
      ? input.activeIdentityId
      : null;

  const { data: ownerRow, error: ownerError } = await supabaseBrowserClient
    .from("listings")
    .select("id, identity_id, user_id")
    .eq("id", input.listingId)
    .maybeSingle();

  if (ownerError) {
    throw new Error(ownerError.message || "Kuulutuse kontroll ebaõnnestus.");
  }

  if (!ownerRow) {
    throw new Error("Kuulutust ei leitud.");
  }

  if (
    !canEditListing({
      row: ownerRow as ListingOwnerRow,
      userId,
      activeIdentityId,
    })
  ) {
    throw new Error("Sul ei ole õigust seda kuulutust muuta.");
  }

  const title = normalizeText(input.title);
  const description = normalizeLongText(input.description);
  const price = normalizeText(input.price);
  const priceAmount = parsePriceAmount(price);

  const payload = {
    title,
    description,
    price,
    price_amount: priceAmount,
    condition: input.condition || null,
    search_text: buildListingSearchText({
      title,
      description,
      category: input.category,
      subcategory: input.subcategory,
      condition: input.condition,
      details: input.details,
    }),
  };

  const { error: updateError } = await supabaseBrowserClient
    .from("listings")
    .update(payload)
    .eq("id", input.listingId);

  if (updateError) {
    throw new Error(updateError.message || "Kuulutuse salvestamine ebaõnnestus.");
  }
}
