import {
  horseOfferTypeRequiresSpecificHorse,
} from "./horseOfferFields";
import {
  type HorseOfferType,
} from "./horseOfferType";
import {
  LIVE_ANIMAL_MARKET_COUNTRY_CODES,
} from "./liveAnimalOfferCapabilities";

export const HORSE_OFFER_LOCATION_COUNTRY_CODE =
  LIVE_ANIMAL_MARKET_COUNTRY_CODES.estonia;

export const HORSE_OFFER_LOCATION_VALUE_MAX_LENGTH =
  160;

export type HorseOfferLocationBranch =
  | "specific"
  | "wanted";

export type HorseOfferLocationValue = {
  countryCode:
    typeof HORSE_OFFER_LOCATION_COUNTRY_CODE;
  cityOrMunicipality: string;
  region: string;
};

export type HorseOfferLocationFieldState = {
  specific: HorseOfferLocationValue;
  wanted: HorseOfferLocationValue;
};

export type HorseOfferLocationFieldChange = {
  branch: HorseOfferLocationBranch;
  patch: Partial<HorseOfferLocationValue>;
};

function createHorseOfferLocationValue():
  HorseOfferLocationValue {
  return {
    countryCode:
      HORSE_OFFER_LOCATION_COUNTRY_CODE,
    cityOrMunicipality: "",
    region: "",
  };
}

export function createHorseOfferLocationFieldState():
  HorseOfferLocationFieldState {
  return {
    specific:
      createHorseOfferLocationValue(),
    wanted:
      createHorseOfferLocationValue(),
  };
}

export function getHorseOfferLocationBranch(
  offerType: HorseOfferType
): HorseOfferLocationBranch {
  return horseOfferTypeRequiresSpecificHorse(
    offerType
  )
    ? "specific"
    : "wanted";
}

export function limitHorseOfferLocationText(
  value: string
): string {
  return value.slice(
    0,
    HORSE_OFFER_LOCATION_VALUE_MAX_LENGTH
  );
}

export function applyHorseOfferLocationFieldChange(
  current: HorseOfferLocationFieldState,
  change: HorseOfferLocationFieldChange
): HorseOfferLocationFieldState {
  return {
    ...current,
    [change.branch]: {
      ...current[change.branch],
      ...change.patch,
      countryCode:
        HORSE_OFFER_LOCATION_COUNTRY_CODE,
    },
  };
}
