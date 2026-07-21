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
    throw new Error("Kuulutuse ID ei ole korrektne.");
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
    throw new Error("Vali Selqiro üldkategooria.");
  }

  if (cleanValue.length > 120) {
    throw new Error(
      "Selqiro üldkategooria väärtus on liiga pikk."
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
      `Andmebaas tagastas vigase välja: ${fieldName}.`
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
      return "Kuulutuse muutmiseks logi sisse.";
    }

    if (
      message.includes("active identity") ||
      message.includes("does not belong")
    ) {
      return "Sul ei ole õigust seda kuulutust aktiivse identiteediga muuta.";
    }

    return "Sul ei ole õigust seda kuulutust muuta.";
  }

  if (error.code === "22023") {
    if (
      message.includes("listing") &&
      message.includes("does not exist")
    ) {
      return "Kuulutust ei leitud.";
    }

    if (message.includes("active identity")) {
      return "Aktiivne identiteet puudub või ei ole ligipääsetav.";
    }

    if (
      message.includes("latitude") ||
      message.includes("longitude")
    ) {
      return "Valitud asukoha koordinaadid ei ole korrektsed.";
    }

    if (message.includes("category")) {
      return "Valitud Selqiro kategooria ei ole korrektne.";
    }

    return "Kategooria või asukoha andmed ei ole korrektsed.";
  }

  return (
    error.message ||
    "Kuulutuse kategooriat ja asukohta ei saanud salvestada."
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
      "Selqiro alamkategooria väärtus on liiga pikk."
    );

  const detailCategory =
    normalizeOptionalText(
      input.detailCategory,
      160,
      "Selqiro täpsustava kategooria väärtus on liiga pikk."
    );

  const country =
    normalizeOptionalText(
      input.country,
      120,
      "Riigi nimi on liiga pikk."
    );

  const city =
    normalizeOptionalText(
      input.city,
      160,
      "Linna või piirkonna nimi on liiga pikk."
    );

  const listingLat =
    normalizeCoordinate(
      input.listingLat,
      {
        minimum: -90,
        maximum: 90,
        errorMessage:
          "Valitud laiuskraad ei ole korrektne.",
      }
    );

  const listingLng =
    normalizeCoordinate(
      input.listingLng,
      {
        minimum: -180,
        maximum: 180,
        errorMessage:
          "Valitud pikkuskraad ei ole korrektne.",
      }
    );

  if (
    (listingLat === null) !==
    (listingLng === null)
  ) {
    throw new Error(
      "Asukoha laius- ja pikkuskraad peavad olema määratud koos."
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
      "Andmebaas ei tagastanud muudetud kuulutust."
    );
  }

  const returnedListingId =
    String(row.listing_id);

  if (returnedListingId !== listingId) {
    throw new Error(
      "Andmebaas tagastas ootamatu kuulutuse."
    );
  }

  const returnedCategory =
    normalizeText(row.category);

  if (returnedCategory !== category) {
    throw new Error(
      "Andmebaas tagastas ootamatu Selqiro kategooria."
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
      "Andmebaas tagastas ootamatud asukoha koordinaadid."
    );
  }

  return {
    listingId: returnedListingId,
    category: returnedCategory,
    subcategory:
      normalizeOptionalText(
        row.subcategory,
        160,
        "Andmebaas tagastas liiga pika alamkategooria."
      ),
    detailCategory:
      normalizeOptionalText(
        row.detail_category,
        160,
        "Andmebaas tagastas liiga pika täpsustava kategooria."
      ),
    country:
      normalizeOptionalText(
        row.country,
        120,
        "Andmebaas tagastas liiga pika riigi nime."
      ),
    city:
      normalizeOptionalText(
        row.city,
        160,
        "Andmebaas tagastas liiga pika linna nime."
      ),
    location:
      normalizeOptionalText(
        row.location,
        300,
        "Andmebaas tagastas liiga pika asukoha."
      ),
    listingLat: returnedListingLat,
    listingLng: returnedListingLng,
    changed: row.changed === true,
  };
}
