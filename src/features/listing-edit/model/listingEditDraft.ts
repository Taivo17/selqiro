import { normalizeListingEditableBasics, type ListingEditableBasics, type ListingEditCommand } from "../../../entities/listing/model/listingEditCommand";
import { type ListingEditKey, type ListingEditSnapshot } from "../../../entities/listing/model/listingEditSnapshot";
import { buildListingPriceDraft, getListingPriceDraftChange, type ListingPriceDraft } from "./listingPriceDraft";

export type ListingEditDraft = Readonly<ListingEditableBasics & { price: ListingPriceDraft }>;
export function buildListingEditDraft(snapshot: ListingEditSnapshot): ListingEditDraft {
  return Object.freeze({ title: snapshot.basics.title ?? "", description: snapshot.basics.description ?? "",
    condition: snapshot.basics.condition, price: Object.freeze(buildListingPriceDraft(snapshot.price)) });
}
export function listingEditDraftDirty(current: ListingEditDraft, initial: ListingEditDraft): boolean {
  return current.title !== initial.title || current.description !== initial.description || current.condition !== initial.condition
    || current.price.kind !== initial.price.kind || current.price.amountInput !== initial.price.amountInput
    || current.price.currencyInput !== initial.price.currencyInput || current.price.legacyText !== initial.price.legacyText;
}
export function buildListingEditCommand(key: ListingEditKey, baseline: ListingEditSnapshot, draft: ListingEditDraft): ListingEditCommand {
  const price = getListingPriceDraftChange(draft.price, buildListingPriceDraft(baseline.price));
  return Object.freeze({ key, baseline, basics: normalizeListingEditableBasics(draft),
    ...(price.changed ? { priceChange: price.price } : {}) });
}
