import {
  EE_HORSE_OFFER_CURRENCY,
  EE_HORSE_OFFER_MARKET_COUNTRY_CODE,
  type HorseOfferDraftPriceType,
  type HorseOfferDraftRecurringFeePeriod,
  type SaveMyHorseOfferDraftInput,
} from "../../../entities/horse-offer/model/types";
import {
  horseOfferTypeRequiresSpecificHorse,
  type HorseOfferBasicFieldState,
} from "./horseOfferFields";
import {
  type HorseOfferDisclosureFieldState,
} from "./horseOfferDisclosureFields";
import {
  getHorseOfferLocationBranch,
  type HorseOfferLocationFieldState,
} from "./horseOfferLocationFields";
import {
  type HorseOfferPriceFieldState,
  type HorseSellerPriceFieldState,
} from "./horseOfferPriceFields";
import {
  type HorseOfferType,
} from "./horseOfferType";
import {
  type HorseOfferUseFieldState,
} from "./horseOfferUseFields";

export const HORSE_OFFER_DRAFT_SAVE_CLIENT_CONTRACT_VERSION =
  1 as const;

export type HorseOfferDraftFormSnapshot = {
  offerId?: string | null;
  offerType: HorseOfferType;
  title: string;
  description: string;
  basicFields: HorseOfferBasicFieldState;
  useFields: HorseOfferUseFieldState;
  disclosureFields:
    HorseOfferDisclosureFieldState;
  priceFields: HorseOfferPriceFieldState;
  locationFields:
    HorseOfferLocationFieldState;
};

export type HorseOfferDraftPayloadField =
  | "birthYear"
  | "heightCm"
  | "priceAmount"
  | "recurringFeePeriod"
  | "wantedBudgetAmount"
  | "locationCountry";

export class HorseOfferDraftPayloadError
  extends Error {
  readonly field: HorseOfferDraftPayloadField;

  constructor(
    field: HorseOfferDraftPayloadField,
    message: string
  ) {
    super(message);
    this.name = "HorseOfferDraftPayloadError";
    this.field = field;
  }
}

const MAX_MONEY_AMOUNT = 9_999_999_999.99;

function optionalText(
  value: string
): string | null {
  const normalized = value.trim();
  return normalized.length > 0
    ? normalized
    : null;
}

function parseOptionalInteger(
  value: string,
  field: "birthYear",
  minimum: number,
  maximum: number
): number | null {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  if (!/^\d+$/.test(normalized)) {
    throw new HorseOfferDraftPayloadError(
      field,
      "Birth year must be a whole number."
    );
  }

  const parsed = Number(normalized);

  if (
    !Number.isSafeInteger(parsed)
    || parsed < minimum
    || parsed > maximum
  ) {
    throw new HorseOfferDraftPayloadError(
      field,
      `Birth year must be between ${minimum} and ${maximum}.`
    );
  }

  return parsed;
}

function parseOptionalHeight(
  value: string
): number | null {
  const normalized =
    value.trim().replace(",", ".");

  if (normalized.length === 0) {
    return null;
  }

  if (!/^\d{1,3}(?:\.\d)?$/.test(normalized)) {
    throw new HorseOfferDraftPayloadError(
      "heightCm",
      "Horse height must be a number with at most one decimal place."
    );
  }

  const parsed = Number(normalized);

  if (
    !Number.isFinite(parsed)
    || parsed < 1
    || parsed > 300
  ) {
    throw new HorseOfferDraftPayloadError(
      "heightCm",
      "Horse height must be between 1 and 300 cm."
    );
  }

  return parsed;
}

function parseOptionalMoney(
  value: string,
  field:
    | "priceAmount"
    | "wantedBudgetAmount"
): number | null {
  const normalized =
    value.trim().replace(",", ".");

  if (normalized.length === 0) {
    return null;
  }

  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) {
    throw new HorseOfferDraftPayloadError(
      field,
      "Amount must contain up to ten whole-number digits and at most two decimals."
    );
  }

  const parsed = Number(normalized);

  if (
    !Number.isFinite(parsed)
    || parsed < 0
    || parsed > MAX_MONEY_AMOUNT
  ) {
    throw new HorseOfferDraftPayloadError(
      field,
      "Amount is outside the supported range."
    );
  }

  return parsed;
}

function requireMoney(
  value: string,
  field:
    | "priceAmount"
    | "wantedBudgetAmount"
): number {
  const amount = parseOptionalMoney(
    value,
    field
  );

  if (amount === null) {
    throw new HorseOfferDraftPayloadError(
      field,
      "Selected price mode requires an amount."
    );
  }

  return amount;
}

function mapSellerPrice(
  state: HorseSellerPriceFieldState
): {
  priceAmount: number | null;
  priceType: HorseOfferDraftPriceType;
} {
  if (state.mode === "contact") {
    return {
      priceAmount: null,
      priceType: "contact",
    };
  }

  return {
    priceAmount: requireMoney(
      state.amount,
      "priceAmount"
    ),
    priceType: state.mode,
  };
}

function requireRecurringFeePeriod(
  value: HorseOfferDraftRecurringFeePeriod | null
): HorseOfferDraftRecurringFeePeriod {
  if (!value) {
    throw new HorseOfferDraftPayloadError(
      "recurringFeePeriod",
      "Lease and co-rider drafts require a fee period."
    );
  }

  return value;
}

function getSpecificPriceContract(
  offerType: HorseOfferType,
  priceFields: HorseOfferPriceFieldState
): {
  priceAmount: number | null;
  priceType: HorseOfferDraftPriceType;
  recurringFeePeriod:
    HorseOfferDraftRecurringFeePeriod | null;
} {
  if (offerType === "free_transfer") {
    return {
      priceAmount: null,
      priceType: "free",
      recurringFeePeriod: null,
    };
  }

  if (offerType === "lease") {
    return {
      ...mapSellerPrice(priceFields.lease),
      recurringFeePeriod:
        requireRecurringFeePeriod(
          priceFields.lease.period
        ),
    };
  }

  if (offerType === "co_rider") {
    return {
      ...mapSellerPrice(priceFields.coRider),
      recurringFeePeriod:
        requireRecurringFeePeriod(
          priceFields.coRider.period
        ),
    };
  }

  return {
    ...mapSellerPrice(priceFields.sale),
    recurringFeePeriod: null,
  };
}

function requireEstoniaLocation(
  countryCode: string
): void {
  if (
    countryCode
    !== EE_HORSE_OFFER_MARKET_COUNTRY_CODE
  ) {
    throw new HorseOfferDraftPayloadError(
      "locationCountry",
      "The Estonia horse-offer pilot accepts only EE locations."
    );
  }
}

export function buildHorseOfferDraftSaveInput(
  snapshot: HorseOfferDraftFormSnapshot
): SaveMyHorseOfferDraftInput {
  const {
    offerId = null,
    offerType,
    title,
    description,
    basicFields,
    useFields,
    disclosureFields,
    priceFields,
    locationFields,
  } = snapshot;

  const specificHorse =
    horseOfferTypeRequiresSpecificHorse(
      offerType
    );
  const locationBranch =
    getHorseOfferLocationBranch(offerType);
  const selectedLocation =
    locationFields[locationBranch];

  requireEstoniaLocation(
    selectedLocation.countryCode
  );

  if (!specificHorse) {
    const wantedBudget = priceFields.wanted;
    const wantedBudgetAmount =
      wantedBudget.mode === "maximum"
        ? requireMoney(
            wantedBudget.amount,
            "wantedBudgetAmount"
          )
        : null;

    return {
      offerId,
      offerType,
      marketCountryCode:
        EE_HORSE_OFFER_MARKET_COUNTRY_CODE,
      horseLocationCountryCode:
        EE_HORSE_OFFER_MARKET_COUNTRY_CODE,
      title,
      description,
      priceAmount: null,
      priceType: "contact",
      currency: EE_HORSE_OFFER_CURRENCY,
      horseName: null,
      birthYear: null,
      sex: null,
      breed: null,
      color: null,
      heightCm: null,
      discipline: null,
      trainingLevel: null,
      suitability: null,
      healthNotes: null,
      behaviorNotes: null,
      city: null,
      region: null,
      locationText: null,
      horseLat: null,
      horseLng: null,
      recurringFeePeriod: null,
      wantedPreferredSex:
        basicFields.sex || null,
      wantedPreferredBreed:
        optionalText(basicFields.breed),
      wantedPreferredDiscipline:
        optionalText(
          useFields.wanted
            .preferredDiscipline
        ),
      wantedPreferredTrainingLevel:
        optionalText(
          useFields.wanted
            .preferredTrainingLevel
        ),
      wantedIntendedUse:
        optionalText(
          useFields.wanted.intendedUse
        ),
      wantedHealthPreferences:
        optionalText(
          disclosureFields.wanted
            .healthPreferences
        ),
      wantedBehaviorPreferences:
        optionalText(
          disclosureFields.wanted
            .behaviorPreferences
        ),
      wantedBudgetMode:
        wantedBudget.mode,
      wantedBudgetAmount,
      wantedCity: optionalText(
        selectedLocation
          .cityOrMunicipality
      ),
      wantedRegion: optionalText(
        selectedLocation.region
      ),
    };
  }

  const specificPrice =
    getSpecificPriceContract(
      offerType,
      priceFields
    );

  return {
    offerId,
    offerType,
    marketCountryCode:
      EE_HORSE_OFFER_MARKET_COUNTRY_CODE,
    horseLocationCountryCode:
      EE_HORSE_OFFER_MARKET_COUNTRY_CODE,
    title,
    description,
    priceAmount:
      specificPrice.priceAmount,
    priceType: specificPrice.priceType,
    currency: EE_HORSE_OFFER_CURRENCY,
    horseName: optionalText(
      basicFields.horseName
    ),
    birthYear: parseOptionalInteger(
      basicFields.birthYear,
      "birthYear",
      1900,
      2100
    ),
    sex: basicFields.sex || null,
    breed: optionalText(
      basicFields.breed
    ),
    color: optionalText(
      basicFields.color
    ),
    heightCm: parseOptionalHeight(
      basicFields.heightCm
    ),
    discipline: optionalText(
      useFields.specific.discipline
    ),
    trainingLevel: optionalText(
      useFields.specific.trainingLevel
    ),
    suitability: optionalText(
      useFields.specific.suitability
    ),
    healthNotes: optionalText(
      disclosureFields.specific.healthNotes
    ),
    behaviorNotes: optionalText(
      disclosureFields.specific
        .behaviorNotes
    ),
    city: optionalText(
      selectedLocation.cityOrMunicipality
    ),
    region: optionalText(
      selectedLocation.region
    ),
    locationText: null,
    horseLat: null,
    horseLng: null,
    recurringFeePeriod:
      specificPrice.recurringFeePeriod,
    wantedPreferredSex: null,
    wantedPreferredBreed: null,
    wantedPreferredDiscipline: null,
    wantedPreferredTrainingLevel: null,
    wantedIntendedUse: null,
    wantedHealthPreferences: null,
    wantedBehaviorPreferences: null,
    wantedBudgetMode: "contact",
    wantedBudgetAmount: null,
    wantedCity: null,
    wantedRegion: null,
  };
}
