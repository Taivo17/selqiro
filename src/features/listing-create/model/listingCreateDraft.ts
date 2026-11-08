import { DEFAULT_LISTING_CREATE_CONTENT_TYPE, type ListingCreateContentType } from "./contentType";
import { createListingCreateTextField } from "./fieldProvenance";
import { createOrdinaryListingFieldState } from "./ordinaryListingFields";
import { createHorseOfferBasicFieldState } from "./horseOfferFields";
import { createHorseOfferUseFieldState } from "./horseOfferUseFields";
import { createHorseOfferDisclosureFieldState } from "./horseOfferDisclosureFields";
import { createHorseOfferPriceFieldState } from "./horseOfferPriceFields";
import { createHorseOfferLocationFieldState } from "./horseOfferLocationFields";
import { createHorseOfferPublicationConfirmationState } from "./horseOfferPublicationGate";
import type { HorseOfferType } from "./horseOfferType";

/** Editable values stay in memory. Publication captures a separate immutable horse intent for recovery; image bytes stay in memory. */
export function createListingCreateDraft() {
  return {
    contentType: DEFAULT_LISTING_CREATE_CONTENT_TYPE as ListingCreateContentType,
    title: createListingCreateTextField(), description: createListingCreateTextField(),
    files: [] as File[], ordinaryFields: createOrdinaryListingFieldState(),
    horseOfferType: null as HorseOfferType | null,
    horseOfferFields: createHorseOfferBasicFieldState(),
    horseOfferUseFields: createHorseOfferUseFieldState(),
    horseOfferDisclosureFields: createHorseOfferDisclosureFieldState(),
    horseOfferPriceFields: createHorseOfferPriceFieldState(),
    horseOfferLocationFields: createHorseOfferLocationFieldState(),
    horseOfferPublicationConfirmations: createHorseOfferPublicationConfirmationState(),
  };
}
export type ListingCreateDraft = ReturnType<typeof createListingCreateDraft>;
