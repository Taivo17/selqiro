export const EE_HORSE_OFFER_MARKET_COUNTRY_CODE =
  "EE" as const;

export const EE_HORSE_OFFER_CURRENCY =
  "EUR" as const;

export const HORSE_OFFER_DRAFT_OFFER_TYPES = [
  "sale",
  "free_transfer",
  "lease",
  "co_rider",
  "wanted",
] as const;

export type HorseOfferDraftOfferType =
  (typeof HORSE_OFFER_DRAFT_OFFER_TYPES)[number];

export type HorseOfferDraftPriceType =
  | "fixed"
  | "from"
  | "contact"
  | "free";

export type HorseOfferDraftSex =
  | "mare"
  | "gelding"
  | "stallion"
  | "unknown";

export type HorseOfferDraftRecurringFeePeriod =
  | "day"
  | "week"
  | "month"
  | "agreed_period";

export type HorseOfferDraftWantedBudgetMode =
  | "maximum"
  | "contact";

export type SaveMyHorseOfferDraftInput = {
  offerId: string | null;
  offerType: HorseOfferDraftOfferType;
  marketCountryCode:
    typeof EE_HORSE_OFFER_MARKET_COUNTRY_CODE;
  horseLocationCountryCode:
    typeof EE_HORSE_OFFER_MARKET_COUNTRY_CODE;
  title: string;
  description: string;
  priceAmount: number | null;
  priceType: HorseOfferDraftPriceType;
  currency: typeof EE_HORSE_OFFER_CURRENCY;
  horseName: string | null;
  birthYear: number | null;
  sex: HorseOfferDraftSex | null;
  breed: string | null;
  color: string | null;
  heightCm: number | null;
  discipline: string | null;
  trainingLevel: string | null;
  suitability: string | null;
  healthNotes: string | null;
  behaviorNotes: string | null;
  city: string | null;
  region: string | null;
  locationText: string | null;
  horseLat: number | null;
  horseLng: number | null;
  recurringFeePeriod:
    HorseOfferDraftRecurringFeePeriod | null;
  wantedPreferredSex:
    HorseOfferDraftSex | null;
  wantedPreferredBreed: string | null;
  wantedPreferredDiscipline: string | null;
  wantedPreferredTrainingLevel:
    string | null;
  wantedIntendedUse: string | null;
  wantedHealthPreferences: string | null;
  wantedBehaviorPreferences: string | null;
  wantedBudgetMode:
    HorseOfferDraftWantedBudgetMode;
  wantedBudgetAmount: number | null;
  wantedCity: string | null;
  wantedRegion: string | null;
};

export type SavedHorseOfferDraft = {
  offerId: string;
  identityId: string;
  offerType: HorseOfferDraftOfferType;
  status: "draft";
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

// SELQIRO_OWNER_HORSE_OFFER_DETAIL_CLIENT_V1
export const OWNER_HORSE_OFFER_CONTENT_TYPE =
  "horse_offer" as const;

export const OWNER_HORSE_OFFER_STATUSES = [
  "draft",
  "published",
  "held_for_review",
  "paused",
  "closed",
  "rejected",
  "archived",
] as const;

export type OwnerHorseOfferStatus =
  (typeof OWNER_HORSE_OFFER_STATUSES)[number];

export type OwnerHorseOfferImage = {
  id: string;
  url: string;
  originalUrl: string;
  mediumUrl: string | null;
  thumbUrl: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type OwnerHorseOfferDetail = {
  contentType:
    typeof OWNER_HORSE_OFFER_CONTENT_TYPE;
  contentId: string;
  offerId: string;
  identityId: string;
  offerType: HorseOfferDraftOfferType;
  status: OwnerHorseOfferStatus;
  marketCountryCode:
    typeof EE_HORSE_OFFER_MARKET_COUNTRY_CODE;
  horseLocationCountryCode:
    typeof EE_HORSE_OFFER_MARKET_COUNTRY_CODE;
  title: string;
  description: string;
  priceAmount: number | null;
  priceType: HorseOfferDraftPriceType;
  currency: typeof EE_HORSE_OFFER_CURRENCY;
  imageUrl: string | null;
  horseName: string | null;
  birthYear: number | null;
  sex: HorseOfferDraftSex | null;
  breed: string | null;
  color: string | null;
  heightCm: number | null;
  discipline: string | null;
  trainingLevel: string | null;
  suitability: string | null;
  healthNotes: string | null;
  behaviorNotes: string | null;
  city: string | null;
  region: string | null;
  locationText: string | null;
  horseLat: number | null;
  horseLng: number | null;
  details: Record<string, unknown>;
  publishedAt: string | null;
  heldAt: string | null;
  pausedAt: string | null;
  closedAt: string | null;
  rejectedAt: string | null;
  archivedAt: string | null;
  activeUntil: string | null;
  createdAt: string;
  updatedAt: string;
  images: OwnerHorseOfferImage[];
};
