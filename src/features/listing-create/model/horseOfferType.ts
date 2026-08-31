export const HORSE_OFFER_TYPES = {
  sale: "sale",
  freeTransfer: "free_transfer",
  lease: "lease",
  coRider: "co_rider",
  wanted: "wanted",
} as const;

export type HorseOfferType =
  (typeof HORSE_OFFER_TYPES)[keyof typeof HORSE_OFFER_TYPES];

export type HorseOfferTypeOption = {
  value: HorseOfferType;
  label: string;
  description: string;
  requiresSpecificHorse: boolean;
};

export const HORSE_OFFER_TYPE_OPTIONS = [
  {
    value: HORSE_OFFER_TYPES.sale,
    label: "Müük",
    description:
      "Pakud konkreetset hobust müügiks.",
    requiresSpecificHorse: true,
  },
  {
    value:
      HORSE_OFFER_TYPES.freeTransfer,
    label: "Tasuta üleandmine",
    description:
      "Annad konkreetse hobuse tasuta uuele vastutavale omanikule.",
    requiresSpecificHorse: true,
  },
  {
    value: HORSE_OFFER_TYPES.lease,
    label: "Rent",
    description:
      "Pakud konkreetset hobust rendile või kokkulepitud kasutusse.",
    requiresSpecificHorse: true,
  },
  {
    value: HORSE_OFFER_TYPES.coRider,
    label: "Kaasratsaniku otsing",
    description:
      "Otsid konkreetsele hobusele sobivat kaasratsanikku.",
    requiresSpecificHorse: true,
  },
  {
    value: HORSE_OFFER_TYPES.wanted,
    label: "Otsin hobust",
    description:
      "Kirjeldad, millist hobust soovid leida.",
    requiresSpecificHorse: false,
  },
] as const satisfies readonly HorseOfferTypeOption[];

export function getHorseOfferTypeOption(
  value: HorseOfferType | null
): HorseOfferTypeOption | null {
  if (!value) {
    return null;
  }

  return (
    HORSE_OFFER_TYPE_OPTIONS.find(
      (option) =>
        option.value === value
    ) || null
  );
}
