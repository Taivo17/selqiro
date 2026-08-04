import { SERVICE_CATEGORY_CODE_PATTERN } from "../../service-category/model/types";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import {
  SERVICE_CITY_MAX_LENGTH,
  SERVICE_COUNTRY_MAX_LENGTH,
  SERVICE_CURRENCY_LENGTH,
  SERVICE_DESCRIPTION_MAX_LENGTH,
  SERVICE_LOCATION_MAX_LENGTH,
  SERVICE_PRICE_MAX,
  SERVICE_PRICE_TYPES,
  SERVICE_TITLE_MAX_LENGTH,
  SERVICE_TITLE_MIN_LENGTH,
  type SaveServiceInput,
  type Service,
  type ServicePriceType,
} from "../model/types";
import {
  mapServiceRow,
  type ServiceRow,
} from "./getMyServices";

type SupabaseOperationError = {
  code?: string | null;
  message?: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstRow<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function normalizeUuid(
  value: string | null | undefined,
  errorMessage: string
): string | null {
  const cleanValue =
    value?.trim() || "";

  if (!cleanValue) {
    return null;
  }

  if (!UUID_PATTERN.test(cleanValue)) {
    throw new Error(errorMessage);
  }

  return cleanValue;
}

function normalizeSingleLine(
  value: string | null | undefined
): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeOptionalSingleLine(
  value: string | null | undefined,
  maximumLength: number,
  fieldLabel: string
): string | null {
  const cleanValue =
    normalizeSingleLine(value);

  if (!cleanValue) {
    return null;
  }

  if (
    cleanValue.length >
    maximumLength
  ) {
    throw new Error(
      `${fieldLabel} võib olla kuni ${maximumLength} tähemärki.`
    );
  }

  return cleanValue;
}

function normalizeCategoryCode(
  value: string | null | undefined,
  fieldLabel: string,
  required: boolean
): string | null {
  const cleanValue =
    normalizeSingleLine(value);

  if (!cleanValue) {
    if (required) {
      throw new Error(
        `Vali ${fieldLabel.toLowerCase()}.`
      );
    }

    return null;
  }

  if (
    !SERVICE_CATEGORY_CODE_PATTERN.test(
      cleanValue
    )
  ) {
    throw new Error(
      `${fieldLabel} ei ole korrektne.`
    );
  }

  return cleanValue;
}

function normalizePriceType(
  value:
    | ServicePriceType
    | null
    | undefined
): ServicePriceType {
  const cleanValue =
    String(value || "contact")
      .trim()
      .toLowerCase();

  if (
    !SERVICE_PRICE_TYPES.includes(
      cleanValue as ServicePriceType
    )
  ) {
    throw new Error(
      "Valitud hinnatüüp ei ole korrektne."
    );
  }

  return cleanValue as ServicePriceType;
}

function normalizeCurrency(
  value: string | null | undefined
): string {
  const cleanValue =
    String(value || "EUR")
      .trim()
      .toUpperCase();

  if (
    cleanValue.length !==
      SERVICE_CURRENCY_LENGTH ||
    !/^[A-Z]{3}$/.test(cleanValue)
  ) {
    throw new Error(
      "Valuuta peab olema kolmetäheline kood."
    );
  }

  return cleanValue;
}

function normalizePriceAmount(
  value: number | null | undefined,
  priceType: ServicePriceType
): number | null {
  if (priceType === "contact") {
    return null;
  }

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      "Sisesta valitud hinnatüübi jaoks numbriline hind."
    );
  }

  if (value < 0) {
    throw new Error(
      "Teenuse hind ei saa olla negatiivne."
    );
  }

  if (value > SERVICE_PRICE_MAX) {
    throw new Error(
      "Teenuse hind on liiga suur."
    );
  }

  return Math.round(
    value * 100
  ) / 100;
}

function normalizeSaveInput(
  input: SaveServiceInput
) {
  const serviceId = normalizeUuid(
    input.serviceId,
    "Teenuse ID ei ole korrektne."
  );

  const title =
    normalizeSingleLine(
      input.title
    );

  if (
    title.length <
    SERVICE_TITLE_MIN_LENGTH
  ) {
    throw new Error(
      `Pealkiri peab olema vähemalt ${SERVICE_TITLE_MIN_LENGTH} tähemärki.`
    );
  }

  if (
    title.length >
    SERVICE_TITLE_MAX_LENGTH
  ) {
    throw new Error(
      `Pealkiri võib olla kuni ${SERVICE_TITLE_MAX_LENGTH} tähemärki.`
    );
  }

  const description =
    String(
      input.description || ""
    ).trim();

  if (
    description.length >
    SERVICE_DESCRIPTION_MAX_LENGTH
  ) {
    throw new Error(
      `Kirjeldus võib olla kuni ${SERVICE_DESCRIPTION_MAX_LENGTH} tähemärki.`
    );
  }

  const category =
    normalizeCategoryCode(
      input.category,
      "Ülemrubriik",
      true
    ) as string;

  const subcategory =
    normalizeCategoryCode(
      input.subcategory,
      "Alamrubriik",
      false
    );

  const priceType =
    normalizePriceType(
      input.priceType
    );

  const priceAmount =
    normalizePriceAmount(
      input.priceAmount,
      priceType
    );

  return {
    serviceId,
    title,
    description,
    category,
    subcategory,
    priceAmount,
    currency:
      normalizeCurrency(
        input.currency
      ),
    priceType,
    country:
      normalizeOptionalSingleLine(
        input.country,
        SERVICE_COUNTRY_MAX_LENGTH,
        "Riik"
      ),
    city:
      normalizeOptionalSingleLine(
        input.city,
        SERVICE_CITY_MAX_LENGTH,
        "Linn või piirkond"
      ),
    location:
      normalizeOptionalSingleLine(
        input.location,
        SERVICE_LOCATION_MAX_LENGTH,
        "Asukoha täpsustus"
      ),
  };
}

function getSaveErrorMessage(
  error: SupabaseOperationError,
  fallback: string
): string {
  const message =
    String(error.message || "")
      .trim();

  const lowerMessage =
    message.toLowerCase();

  if (
    error.code === "42501" ||
    lowerMessage.includes(
      "active identity"
    ) ||
    lowerMessage.includes(
      "does not belong"
    ) ||
    lowerMessage.includes(
      "permission"
    )
  ) {
    return "Aktiivne identiteet puudub või sul ei ole õigust seda teenust muuta.";
  }

  if (
    lowerMessage.includes(
      "category selection is invalid"
    ) ||
    lowerMessage.includes(
      "service category"
    ) ||
    lowerMessage.includes(
      "service subcategory"
    )
  ) {
    return "Valitud teenuserubriik või alamrubriik ei ole korrektne.";
  }

  if (
    lowerMessage.includes(
      "service title"
    )
  ) {
    return "Teenuse pealkiri ei ole korrektne.";
  }

  if (
    lowerMessage.includes(
      "service description"
    )
  ) {
    return "Teenuse kirjeldus on liiga pikk.";
  }

  if (
    lowerMessage.includes(
      "numeric price"
    )
  ) {
    return "Sisesta valitud hinnatüübi jaoks numbriline hind.";
  }

  if (
    lowerMessage.includes(
      "service price"
    )
  ) {
    return "Teenuse hind ei ole korrektne.";
  }

  if (
    lowerMessage.includes(
      "currency"
    )
  ) {
    return "Teenuse valuuta ei ole korrektne.";
  }

  if (
    lowerMessage.includes(
      "country"
    ) ||
    lowerMessage.includes(
      "city"
    ) ||
    lowerMessage.includes(
      "location"
    )
  ) {
    return "Teenuse asukoha andmed ei ole korrektsed.";
  }

  return (
    message ||
    fallback
  );
}

export async function saveMyService(
  input: SaveServiceInput
): Promise<Service> {
  const normalized =
    normalizeSaveInput(input);

  const { data, error } =
    await supabaseBrowserClient.rpc(
      "save_my_service_v2",
      {
        p_service_id:
          normalized.serviceId,
        p_title:
          normalized.title,
        p_description:
          normalized.description,
        p_category:
          normalized.category,
        p_subcategory:
          normalized.subcategory,
        p_image_url: null,
        p_price_amount:
          normalized.priceAmount,
        p_currency:
          normalized.currency,
        p_price_type:
          normalized.priceType,
        p_country:
          normalized.country,
        p_city:
          normalized.city,
        p_location:
          normalized.location,
        p_service_lat: null,
        p_service_lng: null,
      }
    );

  if (error) {
    throw new Error(
      getSaveErrorMessage(
        error,
        "Teenust ei saanud salvestada."
      )
    );
  }

  const row = firstRow(
    data as
      | ServiceRow
      | ServiceRow[]
      | null
  );

  if (!row) {
    throw new Error(
      "Andmebaas ei tagastanud salvestatud teenust."
    );
  }

  const service =
    mapServiceRow(row);

  if (
    normalized.serviceId &&
    service.id !==
      normalized.serviceId
  ) {
    throw new Error(
      "Andmebaas tagastas ootamatu teenuse."
    );
  }

  if (
    !normalized.serviceId &&
    service.status !== "draft"
  ) {
    throw new Error(
      "Uus teenus ei loodud mustandina."
    );
  }

  return service;
}
