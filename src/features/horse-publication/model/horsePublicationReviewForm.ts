import type { SaveMyHorseOfferDraftInput } from "../../../entities/horse-offer/model/types";
import type { OwnerHorseDraftForm } from "../../horse-offer-edit/model/ownerHorseDraftForm";
import { createHorseOfferBasicFieldState } from "../../listing-create/model/horseOfferFields";
import { createHorseOfferUseFieldState } from "../../listing-create/model/horseOfferUseFields";
import { createHorseOfferDisclosureFieldState } from "../../listing-create/model/horseOfferDisclosureFields";
import { createHorseOfferPriceFieldState } from "../../listing-create/model/horseOfferPriceFields";
import { createHorseOfferLocationFieldState } from "../../listing-create/model/horseOfferLocationFields";

/** Read-only reconstruction of the captured intent, never a new server draft.
 * Recovery shows what will be published even after all original form state was lost. */
export function horsePublicationReviewForm(content: SaveMyHorseOfferDraftInput): OwnerHorseDraftForm {
  const basicFields = createHorseOfferBasicFieldState(), useFields = createHorseOfferUseFieldState();
  const disclosureFields = createHorseOfferDisclosureFieldState(), priceFields = createHorseOfferPriceFieldState();
  const locationFields = createHorseOfferLocationFieldState();
  const s = (value: unknown) => value === null || value === undefined ? "" : String(value);
  if (content.offerType === "wanted") {
    basicFields.sex = content.wantedPreferredSex || ""; basicFields.breed = s(content.wantedPreferredBreed);
    useFields.wanted = {preferredDiscipline: s(content.wantedPreferredDiscipline), preferredTrainingLevel: s(content.wantedPreferredTrainingLevel), intendedUse: s(content.wantedIntendedUse)};
    disclosureFields.wanted = {healthPreferences: s(content.wantedHealthPreferences), behaviorPreferences: s(content.wantedBehaviorPreferences)};
    priceFields.wanted = {mode: content.wantedBudgetMode || "contact", amount: s(content.wantedBudgetAmount), currency: "EUR"};
    locationFields.wanted = {...locationFields.wanted, cityOrMunicipality: s(content.wantedCity), region: s(content.wantedRegion)};
  } else {
    Object.assign(basicFields, {horseName: s(content.horseName), birthYear: s(content.birthYear), sex: content.sex || "",
      breed: s(content.breed), color: s(content.color), heightCm: s(content.heightCm)});
    useFields.specific = {discipline: s(content.discipline), trainingLevel: s(content.trainingLevel), suitability: s(content.suitability)};
    disclosureFields.specific = {healthNotes: s(content.healthNotes), behaviorNotes: s(content.behaviorNotes)};
    const branch = content.offerType === "lease" ? "lease" : content.offerType === "co_rider" ? "coRider" : "sale";
    priceFields[branch] = {mode: content.priceType === "free" ? "contact" : content.priceType, amount: s(content.priceAmount), currency: "EUR", period: content.recurringFeePeriod};
    locationFields.specific = {...locationFields.specific, cityOrMunicipality: s(content.city), region: s(content.region)};
  }
  return {offerId: content.offerId || "", offerType: content.offerType, title: content.title, description: content.description,
    basicFields, useFields, disclosureFields, priceFields, locationFields};
}
