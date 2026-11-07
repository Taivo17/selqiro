import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
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
      marketplaceMessage("service.value_can_contain_up_to_value_characters.f04d6c", { p0: String(fieldLabel), p1: String(maximumLength) })
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
        marketplaceMessage("service.select_value.fe8fc7", { p0: String(fieldLabel.toLowerCase()) })
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
      marketplaceMessage("service.value_is_invalid.0527f5", { p0: String(fieldLabel) })
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
      marketplaceMessage("service.the_selected_price_type_is_invalid.38b891")
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
      marketplaceMessage("service.the_currency_must_be_a_three_letter_code.2a92cf")
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
      marketplaceMessage("service.enter_a_numeric_amount_for_the_selected_price.683a69")
    );
  }

  if (value < 0) {
    throw new Error(
      marketplaceMessage("service.the_service_price_cannot_be_negative.cd0ddf")
    );
  }

  if (value > SERVICE_PRICE_MAX) {
    throw new Error(
      marketplaceMessage("service.the_service_price_is_too_high.64ce08")
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
    marketplaceMessage("service.the_service_id_is_invalid.23000a")
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
      marketplaceMessage("service.the_title_must_contain_at_least_value_characters.154417", { p0: String(SERVICE_TITLE_MIN_LENGTH) })
    );
  }

  if (
    title.length >
    SERVICE_TITLE_MAX_LENGTH
  ) {
    throw new Error(
      marketplaceMessage("service.the_title_can_contain_up_to_value_characters.6b5ca7", { p0: String(SERVICE_TITLE_MAX_LENGTH) })
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
      marketplaceMessage("service.the_description_can_contain_up_to_value_characters.69b2ed", { p0: String(SERVICE_DESCRIPTION_MAX_LENGTH) })
    );
  }

  const category =
    normalizeCategoryCode(
      input.category,
      marketplaceMessage("category.parent_category.f3ddd3"),
      true
    ) as string;

  const subcategory =
    normalizeCategoryCode(
      input.subcategory,
      marketplaceMessage("category.subcategory.ee4371"),
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
        marketplaceMessage("service.country.8d7336")
      ),
    city:
      normalizeOptionalSingleLine(
        input.city,
        SERVICE_CITY_MAX_LENGTH,
        marketplaceMessage("service.town_or_region.a66ae4")
      ),
    location:
      normalizeOptionalSingleLine(
        input.location,
        SERVICE_LOCATION_MAX_LENGTH,
        marketplaceMessage("service.location_details.6c4b64")
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
    return marketplaceMessage("service.there_is_no_active_identity_or_you_do.6116cb");
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
    return marketplaceMessage("service.the_selected_service_category_or_subcategory_is_invalid.a1801c");
  }

  if (
    lowerMessage.includes(
      "service title"
    )
  ) {
    return marketplaceMessage("service.the_service_title_is_invalid.525aea");
  }

  if (
    lowerMessage.includes(
      "service description"
    )
  ) {
    return marketplaceMessage("service.the_service_description_is_too_long.008d3b");
  }

  if (
    lowerMessage.includes(
      "numeric price"
    )
  ) {
    return marketplaceMessage("service.enter_a_numeric_amount_for_the_selected_price.683a69");
  }

  if (
    lowerMessage.includes(
      "service price"
    )
  ) {
    return marketplaceMessage("service.the_service_price_is_invalid.ccff83");
  }

  if (
    lowerMessage.includes(
      "currency"
    )
  ) {
    return marketplaceMessage("service.the_service_currency_is_invalid.5c9776");
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
    return marketplaceMessage("service.the_service_location_details_are_invalid.bfe745");
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

  let preservedImageUrl:
    | string
    | null = null;
  let preservedServiceLat:
    | number
    | null = null;
  let preservedServiceLng:
    | number
    | null = null;

  if (normalized.serviceId) {
    const {
      data: currentData,
      error: currentError,
    } =
      await supabaseBrowserClient
        .from("services")
        .select(
          [
            "image_url",
            "service_lat",
            "service_lng",
          ].join(",")
        )
        .eq(
          "id",
          normalized.serviceId
        )
        .maybeSingle();

    if (currentError) {
      throw new Error(
        getSaveErrorMessage(
          currentError,
          marketplaceMessage("service.the_existing_service_details_could_not_be_checked.24f262")
        )
      );
    }

    const currentRow =
      (currentData || null) as {
        image_url?:
          | string
          | null;
        service_lat?:
          | number
          | string
          | null;
        service_lng?:
          | number
          | string
          | null;
      } | null;

    if (!currentRow) {
      throw new Error(
        marketplaceMessage("service.the_service_draft_to_edit_was_not_found.f33916")
      );
    }

    preservedImageUrl =
      currentRow.image_url
        ?.trim() || null;

    const parsedLat =
      currentRow.service_lat ===
        null ||
      currentRow.service_lat ===
        undefined
        ? null
        : Number(
            currentRow.service_lat
          );

    const parsedLng =
      currentRow.service_lng ===
        null ||
      currentRow.service_lng ===
        undefined
        ? null
        : Number(
            currentRow.service_lng
          );

    if (
      (
        parsedLat === null
      ) !== (
        parsedLng === null
      ) ||
      (
        parsedLat !== null &&
        !Number.isFinite(
          parsedLat
        )
      ) ||
      (
        parsedLng !== null &&
        !Number.isFinite(
          parsedLng
        )
      )
    ) {
      throw new Error(
        marketplaceMessage("service.the_service_s_existing_location_coordinates_are_invalid.bbe7dc")
      );
    }

    preservedServiceLat =
      parsedLat;
    preservedServiceLng =
      parsedLng;
  }

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
        p_image_url:
          preservedImageUrl,
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
        p_service_lat:
          preservedServiceLat,
        p_service_lng:
          preservedServiceLng,
      }
    );

  if (error) {
    throw new Error(
      getSaveErrorMessage(
        error,
        marketplaceMessage("service.the_service_could_not_be_saved.c93d3c")
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
      marketplaceMessage("service.the_database_did_not_return_the_saved_service.8d47d9")
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
      marketplaceMessage("service.the_database_returned_an_unexpected_service.124f9e")
    );
  }

  if (
    !normalized.serviceId &&
    service.status !== "draft"
  ) {
    throw new Error(
      marketplaceMessage("service.the_new_service_was_not_created_as_a.effbe2")
    );
  }

  return service;
}
