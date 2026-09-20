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
  mare: "Mära", gelding: "Ruun", stallion: "Täkk", unknown: "Täpsustamata",
};
const sexLabel = (value: unknown) => typeof value === "string" ? SEX[value] || null : null;
const money = (value: number, currency: string) => new Intl.NumberFormat("et-EE", {
  style: "currency", currency, useGrouping: true, minimumFractionDigits: 0, maximumFractionDigits: 2,
}).format(value);

function location(city: unknown, region: unknown): string | null {
  // Identical locality/region text appears only once. Do not guess its administrative level.
  const parts = [text(city), text(region)].filter((part): part is string => part !== null);
  return [...new Set(parts)].join(" · ") || null;
}

function supportedAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    && value <= 9999999999.99 && /^\d+(?:\.\d{1,2})?$/.test(String(value));
}

function wantedPresentation(detail: OwnerHorseOfferDetail): OwnerHorsePresentation {
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
  const priceLabel = !validBudget ? "Eelarve vajab kontrollimist"
    : budget!.mode === "contact" ? "Eelarve on paindlik"
    : `Eelarve kuni ${money(budget!.amount as number, "EUR")}`;
  const locationLabel = validArea
    ? location(area!.city_or_municipality, area!.region) || "Otsingupiirkond lisamata"
    : "Otsingupiirkond vajab kontrollimist";
  // No fallback to seller price, horse location, facts or disclosures on the wanted branch.
  return {
    isWanted: true, priceHeading: "Ostueelarve", priceLabel,
    locationHeading: "Otsingupiirkond", locationLabel,
    basics: [
      { label: "Soovitud sugu", value: sexLabel(wanted?.preferred_sex) },
      { label: "Soovitud tõug", value: text(wanted?.preferred_breed) },
    ],
    use: [
      { label: "Soovitud kasutusala", value: text(wanted?.preferred_discipline) },
      { label: "Soovitud väljaõpe", value: text(wanted?.preferred_training_level) },
      { label: "Kavandatud kasutus", value: text(wanted?.intended_use) },
    ],
    disclosures: [
      { label: "Tervisega seotud eelistused", value: text(wanted?.health_preferences) },
      { label: "Käitumisega seotud eelistused", value: text(wanted?.behavior_preferences) },
    ],
    warning: validBudget && validArea && validPreferences ? null
      : "Osa salvestatud otsinguandmeid ei vasta selle vaate toetatud vormingule. Andmeid ei ole muudetud.",
  };
}

export function getOwnerHorsePresentation(detail: OwnerHorseOfferDetail): OwnerHorsePresentation {
  if (detail.offerType === "wanted") return wantedPresentation(detail);
  let priceLabel: string;
  if (detail.offerType === "free_transfer" || detail.priceType === "free") priceLabel = "Tasuta";
  else if (detail.priceAmount === null) priceLabel = detail.priceType === "contact" ? "Hind kokkuleppel" : "Hind lisamata";
  else priceLabel = `${detail.priceType === "from" ? "Alates " : ""}${money(detail.priceAmount, detail.currency)}`;
  return {
    isWanted: false, priceHeading: "Hind", priceLabel,
    locationHeading: "Avalik asukoht",
    locationLabel: location(detail.city, detail.region) || "Asukoht lisamata",
    basics: [
      { label: "Hobuse nimi", value: detail.horseName },
      { label: "Sünniaasta", value: detail.birthYear },
      { label: "Sugu", value: sexLabel(detail.sex) },
      { label: "Tõug", value: detail.breed },
      { label: "Värvus", value: detail.color },
      { label: "Turjakõrgus", value: detail.heightCm === null ? null : `${detail.heightCm} cm` },
    ],
    use: [
      { label: "Distsipliin", value: detail.discipline },
      { label: "Treeningutase", value: detail.trainingLevel },
      { label: "Sobivus", value: detail.suitability },
    ],
    disclosures: [
      { label: "Tervis", value: detail.healthNotes },
      { label: "Käitumine", value: detail.behaviorNotes },
    ],
    warning: null,
  };
}
