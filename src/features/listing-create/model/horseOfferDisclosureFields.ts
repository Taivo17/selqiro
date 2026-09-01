export type SpecificHorseDisclosureFieldState = {
  healthNotes: string;
  behaviorNotes: string;
};

export type WantedHorseDisclosurePreferenceState = {
  healthPreferences: string;
  behaviorPreferences: string;
};

export type HorseOfferDisclosureFieldState = {
  specific: SpecificHorseDisclosureFieldState;
  wanted: WantedHorseDisclosurePreferenceState;
};

export const HORSE_OFFER_DISCLOSURE_FIELD_LIMITS = {
  health: 3000,
  behavior: 3000,
} as const;

export function
createHorseOfferDisclosureFieldState():
  HorseOfferDisclosureFieldState {
  return {
    specific: {
      healthNotes: "",
      behaviorNotes: "",
    },
    wanted: {
      healthPreferences: "",
      behaviorPreferences: "",
    },
  };
}
