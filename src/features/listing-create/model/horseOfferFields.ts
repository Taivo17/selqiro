import {
  getHorseOfferTypeOption,
  type HorseOfferType,
} from "./horseOfferType";

export const HORSE_SEX_VALUES = {
  mare: "mare",
  gelding: "gelding",
  stallion: "stallion",
  unknown: "unknown",
} as const;

export type HorseSex =
  (typeof HORSE_SEX_VALUES)[keyof typeof HORSE_SEX_VALUES];

export type HorseOfferBasicFieldState = {
  horseName: string;
  birthYear: string;
  sex: HorseSex | "";
  breed: string;
  color: string;
  heightCm: string;
};

export const HORSE_OFFER_BASIC_FIELD_LIMITS = {
  horseName: 160,
  breed: 160,
  color: 120,
  minimumBirthYear: 1900,
  maximumHeightCm: 300,
} as const;

export function createHorseOfferBasicFieldState():
  HorseOfferBasicFieldState {
  return {
    horseName: "",
    birthYear: "",
    sex: "",
    breed: "",
    color: "",
    heightCm: "",
  };
}

export function horseOfferTypeRequiresSpecificHorse(
  offerType: HorseOfferType
): boolean {
  return Boolean(
    getHorseOfferTypeOption(offerType)
      ?.requiresSpecificHorse
  );
}
