export type SpecificHorseUseFieldState = {
  discipline: string;
  trainingLevel: string;
  suitability: string;
};

export type WantedHorseUsePreferenceState = {
  preferredDiscipline: string;
  preferredTrainingLevel: string;
  intendedUse: string;
};

export type HorseOfferUseFieldState = {
  specific: SpecificHorseUseFieldState;
  wanted: WantedHorseUsePreferenceState;
};

export const HORSE_OFFER_USE_FIELD_LIMITS = {
  discipline: 240,
  trainingLevel: 500,
  suitability: 2000,
} as const;

export function createHorseOfferUseFieldState():
  HorseOfferUseFieldState {
  return {
    specific: {
      discipline: "",
      trainingLevel: "",
      suitability: "",
    },
    wanted: {
      preferredDiscipline: "",
      preferredTrainingLevel: "",
      intendedUse: "",
    },
  };
}
