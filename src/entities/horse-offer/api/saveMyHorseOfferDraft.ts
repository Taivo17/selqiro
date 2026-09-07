import {
  supabaseBrowserClient,
} from "../../../shared/supabase/browserClient";

import {
  HORSE_OFFER_DRAFT_OFFER_TYPES,
  type HorseOfferDraftOfferType,
  type SaveMyHorseOfferDraftInput,
  type SavedHorseOfferDraft,
} from "../model/types";

const HORSE_OFFER_DRAFT_SAVE_RPC =
  "save_my_horse_offer_draft_v1";

type HorseOfferDraftRpcError = {
  code?: string | null;
  message?: string | null;
};

type HorseOfferDraftRpcResult = {
  data: unknown;
  error: HorseOfferDraftRpcError | null;
};

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

type HorseOfferDraftRpcClient = {
  rpc: (
    name: typeof HORSE_OFFER_DRAFT_SAVE_RPC,
    args: HorseOfferDraftRpcArgs
  ) => PromiseLike<HorseOfferDraftRpcResult>;
};

export class HorseOfferDraftSaveError
  extends Error {
  readonly code: string | null;

  constructor(
    message: string,
    code: string | null = null
  ) {
    super(message);
    this.name = "HorseOfferDraftSaveError";
    this.code = code;
  }
}

function requireRecord(
  value: unknown
): Record<string, unknown> {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    throw new HorseOfferDraftSaveError(
      "Invalid horse offer draft response row."
    );
  }

  return value as Record<string, unknown>;
}

function requireString(
  row: Record<string, unknown>,
  key: string
): string {
  const value = row[key];

  if (
    typeof value !== "string"
    || value.length === 0
  ) {
    throw new HorseOfferDraftSaveError(
      `Invalid horse offer draft field: ${key}`
    );
  }

  return value;
}

function requireOfferType(
  value: unknown
): HorseOfferDraftOfferType {
  if (
    typeof value !== "string"
    || !HORSE_OFFER_DRAFT_OFFER_TYPES.includes(
      value as HorseOfferDraftOfferType
    )
  ) {
    throw new HorseOfferDraftSaveError(
      "Invalid horse offer draft type."
    );
  }

  return value as HorseOfferDraftOfferType;
}

function mapSavedHorseOfferDraft(
  value: unknown
): SavedHorseOfferDraft {
  const row = requireRecord(value);
  const status = requireString(row, "status");

  if (status !== "draft") {
    throw new HorseOfferDraftSaveError(
      "Horse offer draft RPC returned a non-draft row."
    );
  }

  return {
    offerId: requireString(row, "id"),
    identityId: requireString(
      row,
      "identity_id"
    ),
    offerType: requireOfferType(
      row.offer_type
    ),
    status: "draft",
    title:
      typeof row.title === "string"
        ? row.title
        : "",
    description:
      typeof row.description === "string"
        ? row.description
        : "",
    createdAt: requireString(
      row,
      "created_at"
    ),
    updatedAt: requireString(
      row,
      "updated_at"
    ),
  };
}

function toHorseOfferDraftRpcArgs(
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

export async function saveMyHorseOfferDraft(
  input: SaveMyHorseOfferDraftInput
): Promise<SavedHorseOfferDraft> {
  const client =
    supabaseBrowserClient as unknown as HorseOfferDraftRpcClient;

  const { data, error } = await client.rpc(
    HORSE_OFFER_DRAFT_SAVE_RPC,
    toHorseOfferDraftRpcArgs(input)
  );

  if (error) {
    throw new HorseOfferDraftSaveError(
      error.message
        || "Horse offer draft save failed.",
      error.code || null
    );
  }

  if (!Array.isArray(data) || data.length !== 1) {
    throw new HorseOfferDraftSaveError(
      "Horse offer draft save returned an unexpected record count."
    );
  }

  return mapSavedHorseOfferDraft(data[0]);
}
