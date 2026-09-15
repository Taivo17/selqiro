import type { HorseOfferDraftOfferType } from "./types";

export type HorseDraftActor = { userId: string; identityId: string };
export const HORSE_DRAFT_CHANGE_KEYS = [
  "title", "description", "horse_name", "birth_year", "sex", "breed", "color",
  "height_cm", "discipline", "training_level", "suitability", "health_notes",
  "behavior_notes", "price_type", "price_amount", "city", "region",
  "recurring_fee_period", "wanted_preferred_sex", "wanted_preferred_breed",
  "wanted_preferred_discipline", "wanted_preferred_training_level", "wanted_intended_use",
  "wanted_health_preferences", "wanted_behavior_preferences", "wanted_budget_mode",
  "wanted_budget_amount", "wanted_city", "wanted_region",
] as const;
export type HorseDraftChangeKey = typeof HORSE_DRAFT_CHANGE_KEYS[number];
export type HorseDraftChanges = Partial<Record<HorseDraftChangeKey, string | number | null>>;
export type HorseDraftUpdateInput = {
  offerId: string; editRevision: string; changes: HorseDraftChanges;
};
export type HorseDraftUpdateResult = {
  offerId: string; editRevision: string; updatedAt: string;
};
export type HorseDraftAcknowledgement = HorseDraftUpdateResult & {
  identityId: string; userId: string; offerType: HorseOfferDraftOfferType;
};
export function isHorseDraftUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function isHorseDraftRevision(value: unknown): value is string {
  return typeof value === "string" && /^[1-9][0-9]{0,18}$/.test(value)
    && BigInt(value) <= BigInt("9223372036854775807");
}
export function isExpectedHorseDraftRevision(previous: string, next: unknown): next is string {
  return isHorseDraftRevision(previous) && isHorseDraftRevision(next)
    && (next === previous || BigInt(next) === BigInt(previous) + BigInt(1));
}
