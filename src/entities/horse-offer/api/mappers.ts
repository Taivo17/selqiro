import {
  EE_HORSE_OFFER_CURRENCY,
  EE_HORSE_OFFER_MARKET_COUNTRY_CODE,
  HORSE_OFFER_DRAFT_OFFER_TYPES,
  OWNER_HORSE_OFFER_CONTENT_TYPE,
  OWNER_HORSE_OFFER_STATUSES,
  type HorseOfferDraftOfferType,
  type HorseOfferDraftPriceType,
  type HorseOfferDraftSex,
  type OwnerHorseOfferDetail,
  type OwnerHorseOfferImage,
  type OwnerHorseOfferStatus,
} from "../model/types";

const HORSE_OFFER_PRICE_TYPES = [
  "fixed",
  "from",
  "contact",
  "free",
] as const satisfies readonly HorseOfferDraftPriceType[];

const HORSE_OFFER_SEX_VALUES = [
  "mare",
  "gelding",
  "stallion",
  "unknown",
] as const satisfies readonly HorseOfferDraftSex[];

export class OwnerHorseOfferDetailMappingError
  extends Error {
  readonly field: string;

  constructor(
    field: string,
    message: string
  ) {
    super(message);
    this.name =
      "OwnerHorseOfferDetailMappingError";
    this.field = field;
  }
}

function invalidField(
  field: string,
  message = "Unexpected owner horse offer detail field."
): never {
  throw new OwnerHorseOfferDetailMappingError(
    field,
    `${message} Field: ${field}`
  );
}

function requireRecord(
  value: unknown,
  field: string
): Record<string, unknown> {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    return invalidField(
      field,
      "Expected an object."
    );
  }

  return value as Record<string, unknown>;
}

function requireString(
  value: unknown,
  field: string,
  options: {
    allowEmpty?: boolean;
  } = {}
): string {
  if (typeof value !== "string") {
    return invalidField(
      field,
      "Expected a string."
    );
  }

  if (
    !options.allowEmpty
    && value.trim().length === 0
  ) {
    return invalidField(
      field,
      "Expected a non-empty string."
    );
  }

  return value;
}

function optionalString(
  value: unknown,
  field: string
): string | null {
  if (value === null) {
    return null;
  }

  return requireString(value, field, {
    allowEmpty: true,
  });
}

function parseFiniteNumber(
  value: unknown,
  field: string
): number {
  let parsed: number;

  if (typeof value === "number") {
    parsed = value;
  } else if (
    typeof value === "string"
    && value.trim().length > 0
  ) {
    parsed = Number(value);
  } else {
    return invalidField(
      field,
      "Expected a finite number."
    );
  }

  if (!Number.isFinite(parsed)) {
    return invalidField(
      field,
      "Expected a finite number."
    );
  }

  return parsed;
}

function optionalNumber(
  value: unknown,
  field: string
): number | null {
  if (value === null) {
    return null;
  }

  return parseFiniteNumber(value, field);
}

function optionalInteger(
  value: unknown,
  field: string
): number | null {
  const parsed = optionalNumber(value, field);

  if (
    parsed !== null
    && !Number.isInteger(parsed)
  ) {
    return invalidField(
      field,
      "Expected an integer."
    );
  }

  return parsed;
}

function requireNonNegativeInteger(
  value: unknown,
  field: string
): number {
  const parsed = parseFiniteNumber(
    value,
    field
  );

  if (
    !Number.isInteger(parsed)
    || parsed < 0
  ) {
    return invalidField(
      field,
      "Expected a non-negative integer."
    );
  }

  return parsed;
}

function requireBoolean(
  value: unknown,
  field: string
): boolean {
  if (typeof value !== "boolean") {
    return invalidField(
      field,
      "Expected a boolean."
    );
  }

  return value;
}

function requireLiteral<
  const TValue extends string,
>(
  value: unknown,
  expected: TValue,
  field: string
): TValue {
  if (value !== expected) {
    return invalidField(
      field,
      `Expected ${expected}.`
    );
  }

  return expected;
}

function requireEnumValue<
  TValue extends string,
>(
  value: unknown,
  allowed: readonly TValue[],
  field: string
): TValue {
  if (
    typeof value !== "string"
    || !allowed.includes(value as TValue)
  ) {
    return invalidField(
      field,
      "Unexpected enum value."
    );
  }

  return value as TValue;
}

function optionalEnumValue<
  TValue extends string,
>(
  value: unknown,
  allowed: readonly TValue[],
  field: string
): TValue | null {
  if (value === null) {
    return null;
  }

  return requireEnumValue(
    value,
    allowed,
    field
  );
}

function requireJsonObject(
  value: unknown,
  field: string
): Record<string, unknown> {
  return {
    ...requireRecord(value, field),
  };
}

function mapOwnerHorseOfferImage(
  value: unknown,
  index: number
): OwnerHorseOfferImage {
  const field = `images[${index}]`;
  const row = requireRecord(value, field);

  return {
    id: requireString(
      row.id,
      `${field}.id`
    ),
    url: requireString(
      row.url,
      `${field}.url`
    ),
    originalUrl: requireString(
      row.original_url,
      `${field}.original_url`
    ),
    mediumUrl: optionalString(
      row.medium_url,
      `${field}.medium_url`
    ),
    thumbUrl: optionalString(
      row.thumb_url,
      `${field}.thumb_url`
    ),
    isPrimary: requireBoolean(
      row.is_primary,
      `${field}.is_primary`
    ),
    sortOrder: requireNonNegativeInteger(
      row.sort_order,
      `${field}.sort_order`
    ),
  };
}

function mapOwnerHorseOfferImages(
  value: unknown
): OwnerHorseOfferImage[] {
  if (!Array.isArray(value)) {
    return invalidField(
      "images",
      "Expected an image array."
    );
  }

  return value.map(
    mapOwnerHorseOfferImage
  );
}

export function mapOwnerHorseOfferDetail(
  value: unknown
): OwnerHorseOfferDetail {
  const row = requireRecord(
    value,
    "ownerHorseOfferDetail"
  );

  const contentType = requireLiteral(
    row.content_type,
    OWNER_HORSE_OFFER_CONTENT_TYPE,
    "content_type"
  );
  const contentId = requireString(
    row.content_id,
    "content_id"
  );
  const offerId = requireString(
    row.offer_id,
    "offer_id"
  );

  if (contentId !== offerId) {
    return invalidField(
      "content_id",
      "The shared content ID does not match the horse offer ID."
    );
  }

  return {
    contentType,
    contentId,
    offerId,
    identityId: requireString(
      row.identity_id,
      "identity_id"
    ),
    offerType: requireEnumValue<
      HorseOfferDraftOfferType
    >(
      row.offer_type,
      HORSE_OFFER_DRAFT_OFFER_TYPES,
      "offer_type"
    ),
    status: requireEnumValue<
      OwnerHorseOfferStatus
    >(
      row.status,
      OWNER_HORSE_OFFER_STATUSES,
      "status"
    ),
    marketCountryCode: requireLiteral(
      row.market_country_code,
      EE_HORSE_OFFER_MARKET_COUNTRY_CODE,
      "market_country_code"
    ),
    horseLocationCountryCode:
      requireLiteral(
        row.horse_location_country_code,
        EE_HORSE_OFFER_MARKET_COUNTRY_CODE,
        "horse_location_country_code"
      ),
    title: requireString(
      row.title,
      "title",
      {
        allowEmpty: true,
      }
    ),
    description: requireString(
      row.description,
      "description",
      {
        allowEmpty: true,
      }
    ),
    priceAmount: optionalNumber(
      row.price_amount,
      "price_amount"
    ),
    priceType: requireEnumValue<
      HorseOfferDraftPriceType
    >(
      row.price_type,
      HORSE_OFFER_PRICE_TYPES,
      "price_type"
    ),
    currency: requireLiteral(
      row.currency,
      EE_HORSE_OFFER_CURRENCY,
      "currency"
    ),
    imageUrl: optionalString(
      row.image_url,
      "image_url"
    ),
    horseName: optionalString(
      row.horse_name,
      "horse_name"
    ),
    birthYear: optionalInteger(
      row.birth_year,
      "birth_year"
    ),
    sex: optionalEnumValue<
      HorseOfferDraftSex
    >(
      row.sex,
      HORSE_OFFER_SEX_VALUES,
      "sex"
    ),
    breed: optionalString(
      row.breed,
      "breed"
    ),
    color: optionalString(
      row.color,
      "color"
    ),
    heightCm: optionalNumber(
      row.height_cm,
      "height_cm"
    ),
    discipline: optionalString(
      row.discipline,
      "discipline"
    ),
    trainingLevel: optionalString(
      row.training_level,
      "training_level"
    ),
    suitability: optionalString(
      row.suitability,
      "suitability"
    ),
    healthNotes: optionalString(
      row.health_notes,
      "health_notes"
    ),
    behaviorNotes: optionalString(
      row.behavior_notes,
      "behavior_notes"
    ),
    city: optionalString(
      row.city,
      "city"
    ),
    region: optionalString(
      row.region,
      "region"
    ),
    locationText: optionalString(
      row.location_text,
      "location_text"
    ),
    horseLat: optionalNumber(
      row.horse_lat,
      "horse_lat"
    ),
    horseLng: optionalNumber(
      row.horse_lng,
      "horse_lng"
    ),
    details: requireJsonObject(
      row.details,
      "details"
    ),
    publishedAt: optionalString(
      row.published_at,
      "published_at"
    ),
    heldAt: optionalString(
      row.held_at,
      "held_at"
    ),
    pausedAt: optionalString(
      row.paused_at,
      "paused_at"
    ),
    closedAt: optionalString(
      row.closed_at,
      "closed_at"
    ),
    rejectedAt: optionalString(
      row.rejected_at,
      "rejected_at"
    ),
    archivedAt: optionalString(
      row.archived_at,
      "archived_at"
    ),
    activeUntil: optionalString(
      row.active_until,
      "active_until"
    ),
    createdAt: requireString(
      row.created_at,
      "created_at"
    ),
    updatedAt: requireString(
      row.updated_at,
      "updated_at"
    ),
    images: mapOwnerHorseOfferImages(
      row.images
    ),
  };
}
