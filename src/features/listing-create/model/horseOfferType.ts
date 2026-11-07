import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
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
    label: marketplaceMessage("horse.sale.2879b9"),
    description:
      marketplaceMessage("horse.offer_a_specific_horse_for_sale.9bdee0"),
    requiresSpecificHorse: true,
  },
  {
    value:
      HORSE_OFFER_TYPES.freeTransfer,
    label: marketplaceMessage("horse.free_transfer.ccb86a"),
    description:
      marketplaceMessage("horse.transfer_a_specific_horse_to_a_new_responsible.2546f7"),
    requiresSpecificHorse: true,
  },
  {
    value: HORSE_OFFER_TYPES.lease,
    label: marketplaceMessage("horse.lease.f0268c"),
    description:
      marketplaceMessage("horse.offer_a_specific_horse_for_lease_or_agreed.cfefcf"),
    requiresSpecificHorse: true,
  },
  {
    value: HORSE_OFFER_TYPES.coRider,
    label: marketplaceMessage("horse.co_rider_wanted.0ddb2c"),
    description:
      marketplaceMessage("horse.find_a_suitable_co_rider_for_a_specific.0b5e9a"),
    requiresSpecificHorse: true,
  },
  {
    value: HORSE_OFFER_TYPES.wanted,
    label: marketplaceMessage("horse.horse_wanted.5f511d"),
    description:
      marketplaceMessage("horse.describe_the_horse_you_are_looking_for.a39e43"),
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
