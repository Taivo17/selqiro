import type {
  OwnerHorseOfferDetail,
} from "../../../entities/horse-offer/model/types";
import {
  createHorseOfferBasicFieldState,
  type HorseOfferBasicFieldState,
  type HorseSex,
} from "../../listing-create/model/horseOfferFields";
import {
  createHorseOfferDisclosureFieldState,
  type HorseOfferDisclosureFieldState,
} from "../../listing-create/model/horseOfferDisclosureFields";
import {
  createHorseOfferLocationFieldState,
  type HorseOfferLocationFieldState,
} from "../../listing-create/model/horseOfferLocationFields";
import {
  createHorseOfferPriceFieldState,
  type HorseOfferPriceFieldState,
  type HorseRecurringPricePeriod,
  type HorseSellerPriceMode,
  type HorseWantedBudgetMode,
} from "../../listing-create/model/horseOfferPriceFields";
import type {
  HorseOfferType,
} from "../../listing-create/model/horseOfferType";
import {
  createHorseOfferUseFieldState,
  type HorseOfferUseFieldState,
} from "../../listing-create/model/horseOfferUseFields";

export type OwnerHorseOfferEditFormState = {
  offerId: string;
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

type JsonRecord = Record<string, unknown>;

function readRecord(
  value: unknown
): JsonRecord | null {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    return null;
  }

  return value as JsonRecord;
}

function readText(
  record: JsonRecord | null,
  key: string
): string {
  const value = record?.[key];
  return typeof value === "string"
    ? value
    : "";
}

function readNumber(
  record: JsonRecord | null,
  key: string
): number | null {
  const value = record?.[key];

  if (
    typeof value === "number"
    && Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string"
    && value.trim().length > 0
  ) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function toNumberInput(
  value: number | null
): string {
  return value === null
    ? ""
    : String(value);
}

function readSpecificHorseSex(
  value: unknown
): HorseSex | "" {
  switch (value) {
    case "mare":
    case "gelding":
    case "stallion":
    case "unknown":
      return value;
    default:
      return "";
  }
}

function readWantedHorseSex(
  value: unknown
): HorseSex | "" {
  switch (value) {
    case "mare":
    case "gelding":
    case "stallion":
      return value;
    default:
      return "";
  }
}

function readSellerPriceMode(
  value: unknown
): HorseSellerPriceMode {
  return value === "fixed"
    || value === "from"
    ? value
    : "contact";
}

function readWantedBudgetMode(
  value: unknown
): HorseWantedBudgetMode {
  return value === "maximum"
    ? "maximum"
    : "contact";
}

function readRecurringFeePeriod(
  value: unknown
): HorseRecurringPricePeriod | null {
  switch (value) {
    case "day":
    case "week":
    case "month":
    case "agreed_period":
      return value;
    default:
      return null;
  }
}

export function hydrateOwnerHorseOfferEditForm(
  detail: OwnerHorseOfferDetail
): OwnerHorseOfferEditFormState {
  const basicFields =
    createHorseOfferBasicFieldState();
  const useFields =
    createHorseOfferUseFieldState();
  const disclosureFields =
    createHorseOfferDisclosureFieldState();
  const priceFields =
    createHorseOfferPriceFieldState();
  const locationFields =
    createHorseOfferLocationFieldState();

  if (detail.offerType === "wanted") {
    const wanted = readRecord(
      detail.details.wanted
    );
    const budget = readRecord(
      wanted?.budget
    );
    const searchArea = readRecord(
      wanted?.search_area
    );
    const budgetMode =
      readWantedBudgetMode(
        budget?.mode
      );

    basicFields.sex =
      readWantedHorseSex(
        wanted?.preferred_sex
      );
    basicFields.breed = readText(
      wanted,
      "preferred_breed"
    );

    useFields.wanted = {
      preferredDiscipline: readText(
        wanted,
        "preferred_discipline"
      ),
      preferredTrainingLevel: readText(
        wanted,
        "preferred_training_level"
      ),
      intendedUse: readText(
        wanted,
        "intended_use"
      ),
    };

    disclosureFields.wanted = {
      healthPreferences: readText(
        wanted,
        "health_preferences"
      ),
      behaviorPreferences: readText(
        wanted,
        "behavior_preferences"
      ),
    };

    priceFields.wanted = {
      ...priceFields.wanted,
      mode: budgetMode,
      amount:
        budgetMode === "maximum"
          ? toNumberInput(
              readNumber(
                budget,
                "amount"
              )
            )
          : "",
    };

    locationFields.wanted = {
      ...locationFields.wanted,
      cityOrMunicipality: readText(
        searchArea,
        "city_or_municipality"
      ),
      region: readText(
        searchArea,
        "region"
      ),
    };
  } else {
    basicFields.horseName =
      detail.horseName || "";
    basicFields.birthYear =
      detail.birthYear === null
        ? ""
        : String(detail.birthYear);
    basicFields.sex =
      readSpecificHorseSex(
        detail.sex
      );
    basicFields.breed =
      detail.breed || "";
    basicFields.color =
      detail.color || "";
    basicFields.heightCm =
      toNumberInput(detail.heightCm);

    useFields.specific = {
      discipline:
        detail.discipline || "",
      trainingLevel:
        detail.trainingLevel || "",
      suitability:
        detail.suitability || "",
    };

    disclosureFields.specific = {
      healthNotes:
        detail.healthNotes || "",
      behaviorNotes:
        detail.behaviorNotes || "",
    };

    const sellerPrice = {
      mode: readSellerPriceMode(
        detail.priceType
      ),
      amount:
        detail.priceType === "fixed"
        || detail.priceType === "from"
          ? toNumberInput(
              detail.priceAmount
            )
          : "",
      currency: "EUR" as const,
      period: null,
    };
    const recurringFee = readRecord(
      detail.details.recurring_fee
    );
    const recurringFeePeriod =
      readRecurringFeePeriod(
        recurringFee?.period
      );

    if (detail.offerType === "sale") {
      priceFields.sale = {
        ...priceFields.sale,
        ...sellerPrice,
      };
    } else if (
      detail.offerType === "lease"
    ) {
      priceFields.lease = {
        ...priceFields.lease,
        ...sellerPrice,
        period:
          recurringFeePeriod
          || priceFields.lease.period,
      };
    } else if (
      detail.offerType === "co_rider"
    ) {
      priceFields.coRider = {
        ...priceFields.coRider,
        ...sellerPrice,
        period:
          recurringFeePeriod
          || priceFields.coRider.period,
      };
    }

    locationFields.specific = {
      ...locationFields.specific,
      cityOrMunicipality:
        detail.city || "",
      region:
        detail.region || "",
    };
  }

  return {
    offerId: detail.offerId,
    offerType: detail.offerType,
    title: detail.title,
    description: detail.description,
    basicFields,
    useFields,
    disclosureFields,
    priceFields,
    locationFields,
  };
}
