import type { Language } from "../../../../lib/i18n/translations";
import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { formatOwnerHorseMoney as money } from "./ownerMoney";
import type { OwnerHorseOfferDetail } from "./types";

export type HorseDetailField = { label: string; value: string | number | null };
export type OwnerHorsePresentation = {
  isWanted: boolean;
  priceHeading: string;
  priceLabel: string;
  locationHeading: string;
  locationLabel: string;
  basics: HorseDetailField[];
  use: HorseDetailField[];
  disclosures: HorseDetailField[];
  warning: string | null;
};

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue : null;
const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const SEX: Record<string, string> = {
  mare: marketplaceMessage("horse.mare.67d254"), gelding: marketplaceMessage("horse.gelding.6a1963"), stallion: marketplaceMessage("horse.stallion.4dcb92"), unknown: marketplaceMessage("category.unspecified.99fb9b"),
};
const sexLabel = (value: unknown) => typeof value === "string" ? SEX[value] || null : null;

function location(city: unknown, region: unknown): string | null {
  // Identical locality/region text appears only once. Do not guess its administrative level.
  const parts = [text(city), text(region)].filter((part): part is string => part !== null);
  return [...new Set(parts)].join(" · ") || null;
}

function supportedAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    && value <= 9999999999.99 && /^\d+(?:\.\d{1,2})?$/.test(String(value));
}

function wantedPresentation(detail: OwnerHorseOfferDetail, language: Language): OwnerHorsePresentation {
  const shapeOK = detail.details.schema_version === 1 && detail.details.branch === "wanted";
  const wanted = shapeOK ? record(detail.details.wanted) : null;
  const budget = record(wanted?.budget);
  const area = record(wanted?.search_area);
  const validBudget = budget?.currency === "EUR" && (
    (budget.mode === "maximum" && supportedAmount(budget.amount))
    || (budget.mode === "contact" && (budget.amount === undefined || budget.amount === null))
  );
  const validArea = area?.country_code === "EE"
    && [area.city_or_municipality, area.region].every(value => value == null || typeof value === "string");
  const preferenceKeys = ["preferred_sex", "preferred_breed", "preferred_discipline",
    "preferred_training_level", "intended_use", "health_preferences", "behavior_preferences"];
  const validPreferences = wanted !== null && preferenceKeys.every(key =>
    wanted[key] == null || typeof wanted[key] === "string")
    && (wanted.preferred_sex == null || sexLabel(wanted.preferred_sex) !== null);
  const priceLabel = !validBudget ? marketplaceMessage("horse.budget_needs_review.d3858b")
    : budget!.mode === "contact" ? marketplaceMessage("horse.flexible_budget.20da6f")
    : marketplaceMessage("horse.budget_up_to_value.82a955", { p0: String(money(budget!.amount as number, "EUR", language)) });
  const locationLabel = validArea
    ? location(area!.city_or_municipality, area!.region) || marketplaceMessage("horse.search_area_not_added.085cfe")
    : marketplaceMessage("horse.search_area_needs_review.9e6629");
  // No fallback to seller price, horse location, facts or disclosures on the wanted branch.
  return {
    isWanted: true, priceHeading: marketplaceMessage("horse.purchase_budget.943f7e"), priceLabel,
    locationHeading: marketplaceMessage("horse.search_area.6c28ce"), locationLabel,
    basics: [
      { label: marketplaceMessage("horse.preferred_sex.023ced"), value: sexLabel(wanted?.preferred_sex) },
      { label: marketplaceMessage("horse.preferred_breed.fa271b"), value: text(wanted?.preferred_breed) },
    ],
    use: [
      { label: marketplaceMessage("horse.preferred_discipline.752b6f"), value: text(wanted?.preferred_discipline) },
      { label: marketplaceMessage("horse.preferred_training.10bb84"), value: text(wanted?.preferred_training_level) },
      { label: marketplaceMessage("horse.intended_use.3733e9"), value: text(wanted?.intended_use) },
    ],
    disclosures: [
      { label: marketplaceMessage("horse.health_preferences.189805"), value: text(wanted?.health_preferences) },
      { label: marketplaceMessage("horse.behaviour_preferences.4d0ce4"), value: text(wanted?.behavior_preferences) },
    ],
    warning: validBudget && validArea && validPreferences ? null
      : marketplaceMessage("horse.some_saved_search_details_are_not_in_a.0f0482"),
  };
}

export function getOwnerHorsePresentation(detail: OwnerHorseOfferDetail, language: Language = "et"): OwnerHorsePresentation {
  if (detail.offerType === "wanted") return wantedPresentation(detail, language);
  let priceLabel: string;
  if (detail.offerType === "free_transfer" || detail.priceType === "free") priceLabel = marketplaceMessage("horse.free.e5aa0d");
  else if (detail.priceAmount === null) priceLabel = detail.priceType === "contact" ? marketplaceMessage("service.price_by_agreement.299166") : marketplaceMessage("horse.price_not_added.5d5a00");
  else priceLabel = `${detail.priceType === "from" ? marketplaceMessage("horse.from.5aab60") : ""}${money(detail.priceAmount, detail.currency, language)}`;
  return {
    isWanted: false, priceHeading: marketplaceMessage("service.price.ee7887"), priceLabel,
    locationHeading: marketplaceMessage("horse.public_location.b377a0"),
    locationLabel: location(detail.city, detail.region) || marketplaceMessage("horse.location_not_added.8c8234"),
    basics: [
      { label: marketplaceMessage("horse.horse_name.b4ca2f"), value: detail.horseName },
      { label: marketplaceMessage("horse.year_of_birth.9b64d1"), value: detail.birthYear },
      { label: marketplaceMessage("horse.sex.b95704"), value: sexLabel(detail.sex) },
      { label: marketplaceMessage("horse.breed.482c80"), value: detail.breed },
      { label: marketplaceMessage("horse.colour.fba70e"), value: detail.color },
      { label: marketplaceMessage("horse.height_at_withers.51b51c"), value: detail.heightCm === null ? null : `${detail.heightCm} cm` },
    ],
    use: [
      { label: marketplaceMessage("horse.discipline.34a249"), value: detail.discipline },
      { label: marketplaceMessage("horse.training_level.aca1d2"), value: detail.trainingLevel },
      { label: marketplaceMessage("horse.suitability.4a8410"), value: detail.suitability },
    ],
    disclosures: [
      { label: marketplaceMessage("horse.health.381624"), value: detail.healthNotes },
      { label: marketplaceMessage("horse.behaviour.b71ee4"), value: detail.behaviorNotes },
    ],
    warning: null,
  };
}
