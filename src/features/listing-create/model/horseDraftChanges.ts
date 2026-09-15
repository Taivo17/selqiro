import type { SaveMyHorseOfferDraftInput } from "../../../entities/horse-offer/model/types";
import type { HorseDraftChanges, HorseDraftChangeKey } from "../../../entities/horse-offer/model/draftEdit";

type FieldPair = readonly [keyof SaveMyHorseOfferDraftInput, HorseDraftChangeKey];
const common: FieldPair[] = [["title", "title"], ["description", "description"]];
const specific: FieldPair[] = [
  ["horseName", "horse_name"], ["birthYear", "birth_year"], ["sex", "sex"],
  ["breed", "breed"], ["color", "color"], ["heightCm", "height_cm"],
  ["discipline", "discipline"], ["trainingLevel", "training_level"], ["suitability", "suitability"],
  ["healthNotes", "health_notes"], ["behaviorNotes", "behavior_notes"],
  ["priceType", "price_type"], ["priceAmount", "price_amount"], ["city", "city"], ["region", "region"],
];
const wanted: FieldPair[] = [
  ["wantedPreferredSex", "wanted_preferred_sex"], ["wantedPreferredBreed", "wanted_preferred_breed"],
  ["wantedPreferredDiscipline", "wanted_preferred_discipline"],
  ["wantedPreferredTrainingLevel", "wanted_preferred_training_level"], ["wantedIntendedUse", "wanted_intended_use"],
  ["wantedHealthPreferences", "wanted_health_preferences"], ["wantedBehaviorPreferences", "wanted_behavior_preferences"],
  ["wantedBudgetMode", "wanted_budget_mode"], ["wantedBudgetAmount", "wanted_budget_amount"],
  ["wantedCity", "wanted_city"], ["wantedRegion", "wanted_region"],
];
/** Baseline is the submitted form paired with THAT write's acknowledgement. */
export function buildHorseDraftChanges(before: SaveMyHorseOfferDraftInput, after: SaveMyHorseOfferDraftInput): HorseDraftChanges {
  if (before.offerType !== after.offerType) throw new Error("Salvestatud pakkumise liiki ei saa selles vormis muuta.");
  const fields = [...common, ...(after.offerType === "wanted" ? wanted : specific)];
  if (after.offerType === "lease" || after.offerType === "co_rider") fields.push(["recurringFeePeriod", "recurring_fee_period"]);
  const changes: HorseDraftChanges = {};
  for (const [source, target] of fields) {
    if (before[source] !== after[source]) changes[target] = after[source];
  }
  return changes;
}
