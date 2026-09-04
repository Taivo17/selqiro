import {
  horseOfferTypeRequiresSpecificHorse,
} from "./horseOfferFields";
import {
  type HorseOfferType,
} from "./horseOfferType";

export const HORSE_OFFER_PUBLICATION_POLICY_KEYS = {
  general: "marketplace-general",
  horseEe: "horse-offer-ee",
} as const;

export const HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS = {
  age18OrOver:
    "publisher_confirms_age_18_or_over",
  informationAccurate:
    "publisher_confirms_information_accurate",
  transactionResponsibility:
    "publisher_accepts_transaction_responsibility",
  notForSlaughter:
    "publisher_confirms_not_for_slaughter",
  ownerOrAuthorized:
    "publisher_is_owner_or_authorized",
  horseIdentified:
    "publisher_confirms_horse_identified",
  passportAvailable:
    "publisher_confirms_passport_available",
} as const;

export type HorseOfferPublicationConfirmationKey =
  (typeof HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS)[keyof typeof HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS];

export type HorseOfferPublicationConfirmationState =
  Record<
    HorseOfferPublicationConfirmationKey,
    boolean
  >;

export const HORSE_OFFER_COMMON_PUBLICATION_CONFIRMATION_KEYS:
  readonly HorseOfferPublicationConfirmationKey[] = [
    HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
      .age18OrOver,
    HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
      .informationAccurate,
    HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
      .transactionResponsibility,
    HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
      .notForSlaughter,
  ];

export const HORSE_OFFER_SPECIFIC_PUBLICATION_CONFIRMATION_KEYS:
  readonly HorseOfferPublicationConfirmationKey[] = [
    HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
      .ownerOrAuthorized,
    HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
      .horseIdentified,
    HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
      .passportAvailable,
  ];

export function createHorseOfferPublicationConfirmationState():
  HorseOfferPublicationConfirmationState {
  return {
    [HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
      .age18OrOver]: false,
    [HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
      .informationAccurate]: false,
    [HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
      .transactionResponsibility]: false,
    [HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
      .notForSlaughter]: false,
    [HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
      .ownerOrAuthorized]: false,
    [HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
      .horseIdentified]: false,
    [HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
      .passportAvailable]: false,
  };
}

export function getHorseOfferRequiredPublicationConfirmationKeys(
  offerType: HorseOfferType
): readonly HorseOfferPublicationConfirmationKey[] {
  if (
    horseOfferTypeRequiresSpecificHorse(
      offerType
    )
  ) {
    return [
      ...HORSE_OFFER_COMMON_PUBLICATION_CONFIRMATION_KEYS,
      ...HORSE_OFFER_SPECIFIC_PUBLICATION_CONFIRMATION_KEYS,
    ];
  }

  return HORSE_OFFER_COMMON_PUBLICATION_CONFIRMATION_KEYS;
}

export function applyHorseOfferPublicationConfirmationGroupChange(
  offerType: HorseOfferType,
  checked: boolean
): HorseOfferPublicationConfirmationState {
  const next =
    createHorseOfferPublicationConfirmationState();

  if (!checked) {
    return next;
  }

  for (
    const key of
      getHorseOfferRequiredPublicationConfirmationKeys(
        offerType
      )
  ) {
    next[key] = true;
  }

  return next;
}

export function getHorseOfferPublicationConfirmationProgress(
  offerType: HorseOfferType,
  value: HorseOfferPublicationConfirmationState
): {
  confirmedCount: number;
  requiredCount: number;
  complete: boolean;
} {
  const requiredKeys =
    getHorseOfferRequiredPublicationConfirmationKeys(
      offerType
    );

  const confirmedCount =
    requiredKeys.filter(
      (key) => value[key]
    ).length;

  return {
    confirmedCount,
    requiredCount: requiredKeys.length,
    complete:
      confirmedCount ===
      requiredKeys.length,
  };
}
