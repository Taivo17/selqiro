import type { ProductListingDetail } from "../../../entities/listing/model/types";

export type ListingBasicsForm = {
  title: string;
  description: string;
  price: string;
  condition: string;
};

function originalPriceInput(listing: ProductListingDetail | null): string {
  // Preserve explicit text, including empty text and "Hind kokkuleppel".
  if (typeof listing?.rawPrice === "string") return listing.rawPrice;
  // Amount-only historical rows remain editable without using a formatted label.
  // Keeping this initial value unchanged still omits BOTH price fields on save.
  // This is not a new exact-decimal persistence contract or currency inference.
  const amount: unknown = listing?.priceAmount;
  if (typeof amount === "string") return amount;
  return typeof amount === "number" && Number.isFinite(amount) ? String(amount) : "";
}

export function buildInitialListingBasicsForm(
  listing: ProductListingDetail | null
): ListingBasicsForm {
  return {
    title: listing?.title || "",
    description: listing?.description || "",
    price: originalPriceInput(listing),
    condition: listing?.condition || "used",
  };
}

export function listingPriceEditPatch(
  current: string,
  initial: string
): { price?: string } {
  // Compare exact input text. A change and a revert are not a price edit.
  return current === initial ? {} : { price: current };
}
