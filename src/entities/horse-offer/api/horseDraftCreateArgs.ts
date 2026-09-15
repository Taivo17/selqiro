import type { HorseOfferDraftOfferType, SaveMyHorseOfferDraftInput } from "../model/types";

type HorseOfferDraftRpcArgs = {
  p_offer_id: string | null;
  p_offer_type: HorseOfferDraftOfferType;
  p_market_country_code: "EE";
  p_horse_location_country_code: "EE";
  p_title: string;
  p_description: string;
  p_price_amount: number | null;
  p_price_type:
    SaveMyHorseOfferDraftInput["priceType"];
  p_currency: "EUR";
  p_horse_name: string | null;
  p_birth_year: number | null;
  p_sex: SaveMyHorseOfferDraftInput["sex"];
  p_breed: string | null;
  p_color: string | null;
  p_height_cm: number | null;
  p_discipline: string | null;
  p_training_level: string | null;
  p_suitability: string | null;
  p_health_notes: string | null;
  p_behavior_notes: string | null;
  p_city: string | null;
  p_region: string | null;
  p_location_text: string | null;
  p_horse_lat: number | null;
  p_horse_lng: number | null;
  p_recurring_fee_period:
    SaveMyHorseOfferDraftInput["recurringFeePeriod"];
  p_wanted_preferred_sex:
    SaveMyHorseOfferDraftInput["wantedPreferredSex"];
  p_wanted_preferred_breed: string | null;
  p_wanted_preferred_discipline: string | null;
  p_wanted_preferred_training_level:
    string | null;
  p_wanted_intended_use: string | null;
  p_wanted_health_preferences: string | null;
  p_wanted_behavior_preferences: string | null;
  p_wanted_budget_mode:
    SaveMyHorseOfferDraftInput["wantedBudgetMode"];
  p_wanted_budget_amount: number | null;
  p_wanted_city: string | null;
  p_wanted_region: string | null;
};

export function toHorseOfferDraftRpcArgs(
  input: SaveMyHorseOfferDraftInput
): HorseOfferDraftRpcArgs {
  return {
    p_offer_id: input.offerId,
    p_offer_type: input.offerType,
    p_market_country_code:
      input.marketCountryCode,
    p_horse_location_country_code:
      input.horseLocationCountryCode,
    p_title: input.title,
    p_description: input.description,
    p_price_amount: input.priceAmount,
    p_price_type: input.priceType,
    p_currency: input.currency,
    p_horse_name: input.horseName,
    p_birth_year: input.birthYear,
    p_sex: input.sex,
    p_breed: input.breed,
    p_color: input.color,
    p_height_cm: input.heightCm,
    p_discipline: input.discipline,
    p_training_level: input.trainingLevel,
    p_suitability: input.suitability,
    p_health_notes: input.healthNotes,
    p_behavior_notes: input.behaviorNotes,
    p_city: input.city,
    p_region: input.region,
    p_location_text: input.locationText,
    p_horse_lat: input.horseLat,
    p_horse_lng: input.horseLng,
    p_recurring_fee_period:
      input.recurringFeePeriod,
    p_wanted_preferred_sex:
      input.wantedPreferredSex,
    p_wanted_preferred_breed:
      input.wantedPreferredBreed,
    p_wanted_preferred_discipline:
      input.wantedPreferredDiscipline,
    p_wanted_preferred_training_level:
      input.wantedPreferredTrainingLevel,
    p_wanted_intended_use:
      input.wantedIntendedUse,
    p_wanted_health_preferences:
      input.wantedHealthPreferences,
    p_wanted_behavior_preferences:
      input.wantedBehaviorPreferences,
    p_wanted_budget_mode:
      input.wantedBudgetMode,
    p_wanted_budget_amount:
      input.wantedBudgetAmount,
    p_wanted_city: input.wantedCity,
    p_wanted_region: input.wantedRegion,
  };
}
