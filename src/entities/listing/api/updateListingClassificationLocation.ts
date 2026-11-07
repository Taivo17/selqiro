import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";

export type UpdateListingClassificationLocationInput = {
  listingId: string;
  category: string;
  subcategory?: string | null;
  detailCategory?: string | null;
  country?: string | null;
  city?: string | null;
  listingLat?: number | null;
  listingLng?: number | null;
};

export type UpdateListingClassificationLocationResult = {
  listingId: string;
  category: string;
  subcategory: string | null;
  detailCategory: string | null;
  country: string | null;
  city: string | null;
  location: string | null;
  listingLat: number | null;
  listingLng: number | null;
  changed: boolean;
};

type UpdateListingClassificationLocationRpcRow = {
  listing_id?: string | number | null;
  category?: string | null;
  subcategory?: string | null;
  detail_category?: string | null;
  country?: string | null;
  city?: string | null;
  location?: string | null;
  listing_lat?: string | number | null;
  listing_lng?: string | number | null;
  changed?: boolean | null;
};

const LISTING_ID_PATTERN = /^[1-9][0-9]*$/;

function normalizeListingId(value: string): string {
  const cleanValue = value.trim();

  if (!LISTING_ID_PATTERN.test(cleanValue)) {
    throw new Error("listingIdInvalid");
  }

  return cleanValue;
}

function normalizeText(
  value: string | null | undefined
): string {
  return (value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeRequiredCategory(
  value: string
): string {
  const cleanValue = normalizeText(value);

  if (!cleanValue) {
    throw new Error("categoryRequired");
  }

  if (cleanValue.length > 120) {
    throw new Error(
      "categoryTooLong"
    );
  }

  return cleanValue;
}

function normalizeOptionalText(
  value: string | null | undefined,
  maximumLength: number,
  errorMessage: string
): string | null {
  const cleanValue = normalizeText(value);

  if (!cleanValue) {
    return null;
  }

  if (cleanValue.length > maximumLength) {
    throw new Error(errorMessage);
  }

  return cleanValue;
}

function normalizeCoordinate(
  value: number | null | undefined,
  input: {
    minimum: number;
    maximum: number;
    errorMessage: string;
  }
): number | null {
  if (
    value === null ||
    typeof value === "undefined"
  ) {
    return null;
  }

  if (
    !Number.isFinite(value) ||
    value < input.minimum ||
    value > input.maximum
  ) {
    throw new Error(input.errorMessage);
  }

  return value;
}

function normalizeReturnedCoordinate(
  value: string | number | null | undefined,
  fieldName: string
): number | null {
  if (
    value === null ||
    typeof value === "undefined" ||
    value === ""
  ) {
    return null;
  }

  const parsedValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(
      "responseInvalid"
    );
  }

  return parsedValue;
}

function firstRow(
  value:
    | UpdateListingClassificationLocationRpcRow
    | UpdateListingClassificationLocationRpcRow[]
    | null
    | undefined
): UpdateListingClassificationLocationRpcRow | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function getUpdateErrorMessage(error: {
  code?: string | null;
  message?: string | null;
}): string {
  const message =
    (error.message || "").toLowerCase();

  if (error.code === "42501") {
    if (message.includes("authentication")) {
      return "signInToChange";
    }

    if (
      message.includes("active identity") ||
      message.includes("does not belong")
    ) {
      return "activeIdentityEditForbidden";
    }

    return "editForbidden";
  }

  if (error.code === "22023") {
    if (
      message.includes("listing") &&
      message.includes("does not exist")
    ) {
      return "listingNotFound";
    }

    if (message.includes("active identity")) {
      return "activeIdentityUnavailable";
    }

    if (
      message.includes("latitude") ||
      message.includes("longitude")
    ) {
      return "coordinatesInvalid";
    }

    if (message.includes("category")) {
      return "categoryInvalid";
    }

    return "classificationInvalid";
  }

  return (
    error.message ||
    "classificationUpdateFailed"
  );
}

export async function updateListingClassificationLocation(
  input: UpdateListingClassificationLocationInput
): Promise<UpdateListingClassificationLocationResult> {
  const listingId =
    normalizeListingId(input.listingId);

  const category =
    normalizeRequiredCategory(input.category);

  const subcategory =
    normalizeOptionalText(
      input.subcategory,
      160,
      "subcategoryTooLong"
    );

  const detailCategory =
    normalizeOptionalText(
      input.detailCategory,
      160,
      "specificCategoryTooLong"
    );

  const country =
    normalizeOptionalText(
      input.country,
      120,
      "countryTooLong"
    );

  const city =
    normalizeOptionalText(
      input.city,
      160,
      "cityTooLong"
    );

  const listingLat =
    normalizeCoordinate(
      input.listingLat,
      {
        minimum: -90,
        maximum: 90,
        errorMessage:
          "latitudeInvalid",
      }
    );

  const listingLng =
    normalizeCoordinate(
      input.listingLng,
      {
        minimum: -180,
        maximum: 180,
        errorMessage:
          "longitudeInvalid",
      }
    );

  if (
    (listingLat === null) !==
    (listingLng === null)
  ) {
    throw new Error(
      "coordinatesNeedPair"
    );
  }

  const { data, error } =
    await supabaseBrowserClient.rpc(
      "update_my_listing_classification_location_v2",
      {
        p_listing_id: listingId,
        p_category: category,
        p_subcategory: subcategory,
        p_detail_category: detailCategory,
        p_country: country,
        p_city: city,
        p_listing_lat: listingLat,
        p_listing_lng: listingLng,
      }
    );

  if (error) {
    throw new Error(
      getUpdateErrorMessage(error)
    );
  }

  const row = firstRow(
    data as
      | UpdateListingClassificationLocationRpcRow
      | UpdateListingClassificationLocationRpcRow[]
      | null
  );

  if (!row?.listing_id) {
    throw new Error(
      "updatedListingMissing"
    );
  }

  const returnedListingId =
    String(row.listing_id);

  if (returnedListingId !== listingId) {
    throw new Error(
      "unexpectedListing"
    );
  }

  const returnedCategory =
    normalizeText(row.category);

  if (returnedCategory !== category) {
    throw new Error(
      "unexpectedCategory"
    );
  }

  const returnedListingLat =
    normalizeReturnedCoordinate(
      row.listing_lat,
      "listing_lat"
    );

  const returnedListingLng =
    normalizeReturnedCoordinate(
      row.listing_lng,
      "listing_lng"
    );

  if (
    returnedListingLat !== listingLat ||
    returnedListingLng !== listingLng
  ) {
    throw new Error(
      "unexpectedCoordinates"
    );
  }

  return {
    listingId: returnedListingId,
    category: returnedCategory,
    subcategory:
      normalizeOptionalText(
        row.subcategory,
        160,
        "responseSubcategoryTooLong"
      ),
    detailCategory:
      normalizeOptionalText(
        row.detail_category,
        160,
        "responseSpecificCategoryTooLong"
      ),
    country:
      normalizeOptionalText(
        row.country,
        120,
        "responseCountryTooLong"
      ),
    city:
      normalizeOptionalText(
        row.city,
        160,
        "responseCityTooLong"
      ),
    location:
      normalizeOptionalText(
        row.location,
        300,
        "responseLocationTooLong"
      ),
    listingLat: returnedListingLat,
    listingLng: returnedListingLng,
    changed: row.changed === true,
  };
}
