import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { buildListingSearchText } from "../model/buildListingSearchText";

export type UpdateListingBasicsInput = {
  listingId: string;
  userId: string | null;
  activeIdentityId: string | null;
  title: string;
  description: string;
  /** Omit when unchanged. Empty text is an explicit existing clear operation. */
  price?: string;
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
    throw new Error("authMissing");
  }

  if (!input.listingId) {
    throw new Error("listingIdMissingLower");
  }

  if (title.length < 2) {
    throw new Error("titleTooShort");
  }

  if (title.length > 140) {
    throw new Error("titleTooLong");
  }

  if (input.price !== undefined && typeof input.price !== "string") {
    throw new Error("priceMustBeText");
  }

  if (input.description.length > 5000) {
    throw new Error("descriptionTooLong");
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
    throw new Error(ownerError.message || "listingCheckFailed");
  }

  if (!ownerRow) {
    throw new Error("listingNotFound");
  }

  if (
    !canEditListing({
      row: ownerRow as ListingOwnerRow,
      userId,
      activeIdentityId,
    })
  ) {
    throw new Error("editForbidden");
  }

  const title = normalizeText(input.title);
  const description = normalizeLongText(input.description);
  // An unrelated edit must preserve both stored price fields, even if another
  // session changed them after this form loaded. Explicit price edits keep the
  // existing parser; canonical amount/currency validation is a separate step.
  const price = input.price === undefined ? undefined : normalizeText(input.price);

  const payload = {
    title,
    description,
    ...(price === undefined ? {} : { price, price_amount: parsePriceAmount(price) }),
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
    throw new Error(updateError.message || "listingSaveFailed");
  }
}
