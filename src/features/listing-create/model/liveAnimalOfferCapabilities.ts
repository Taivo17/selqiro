import {
  LISTING_CREATE_CONTENT_TYPES,
  type ListingCreateContentType,
} from "./contentType";

export const LIVE_ANIMAL_SPECIES = {
  horse: "horse",
} as const;

export type LiveAnimalSpecies =
  (typeof LIVE_ANIMAL_SPECIES)[keyof typeof LIVE_ANIMAL_SPECIES];

export const LIVE_ANIMAL_MARKET_COUNTRY_CODES = {
  estonia: "EE",
} as const;

export type LiveAnimalMarketCountryCode =
  (typeof LIVE_ANIMAL_MARKET_COUNTRY_CODES)[keyof typeof LIVE_ANIMAL_MARKET_COUNTRY_CODES];

export const DEFAULT_LIVE_ANIMAL_MARKET_COUNTRY_CODE:
  LiveAnimalMarketCountryCode =
    LIVE_ANIMAL_MARKET_COUNTRY_CODES.estonia;

type LiveAnimalListingCreateContentType = Exclude<
  ListingCreateContentType,
  typeof LISTING_CREATE_CONTENT_TYPES.listing
>;

export type LiveAnimalOfferCapability = {
  contentType:
    LiveAnimalListingCreateContentType;
  species: LiveAnimalSpecies;
  marketCountryCode:
    LiveAnimalMarketCountryCode;
  enabled: boolean;
  label: string;
  description: string;
  selectedTitle: string;
  selectedDescription: string;
};

export const LIVE_ANIMAL_OFFER_CAPABILITIES = [
  {
    contentType:
      LISTING_CREATE_CONTENT_TYPES.horseOffer,
    species: LIVE_ANIMAL_SPECIES.horse,
    marketCountryCode:
      LIVE_ANIMAL_MARKET_COUNTRY_CODES.estonia,
    enabled: true,
    label: "Hobusepakkumine",
    description:
      "Elushobuse müük, tasuta üleandmine, rent, kaasratsaniku või hobuse otsing.",
    selectedTitle:
      "Hobuse režiim on valitud",
    selectedDescription:
      "Jätkad samas vormis. Järgmistes väikestes etappides lisanduvad hobuse andmed ja enne avaldamist pakkumise liigile vastavad kinnitused, sealhulgas vähemalt 18-aastaseks olemise kinnitus. Selles checkpoint'is salvestamis- ega avaldamisloogika ei muutu.",
  },
] as const satisfies readonly LiveAnimalOfferCapability[];

export function
getEnabledLiveAnimalOfferCapabilities(
  marketCountryCode:
    LiveAnimalMarketCountryCode
): readonly LiveAnimalOfferCapability[] {
  return LIVE_ANIMAL_OFFER_CAPABILITIES.filter(
    (capability) =>
      capability.enabled &&
      capability.marketCountryCode ===
        marketCountryCode
  );
}

export function getLiveAnimalOfferCapability(
  contentType: ListingCreateContentType,
  marketCountryCode:
    LiveAnimalMarketCountryCode =
      DEFAULT_LIVE_ANIMAL_MARKET_COUNTRY_CODE
): LiveAnimalOfferCapability | null {
  return (
    LIVE_ANIMAL_OFFER_CAPABILITIES.find(
      (capability) =>
        capability.enabled &&
        capability.contentType ===
          contentType &&
        capability.marketCountryCode ===
          marketCountryCode
    ) || null
  );
}

export function isLiveAnimalOfferContentType(
  contentType: ListingCreateContentType,
  marketCountryCode?:
    LiveAnimalMarketCountryCode
): boolean {
  return Boolean(
    getLiveAnimalOfferCapability(
      contentType,
      marketCountryCode
    )
  );
}
