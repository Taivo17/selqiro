import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import {
  SERVICE_PRICE_TYPES,
  SERVICE_STATUSES,
  type Service,
  type ServicePriceType,
  type ServiceStatus,
} from "../model/types";
import type {
  PublicServiceImage,
} from "../model/public";
import {
  getServiceImages,
} from "./serviceImages";

export type ServiceRow = {
  id?: string | null;
  identity_id?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  image_url?: string | null;
  price_amount?: number | string | null;
  currency?: string | null;
  price_type?: string | null;
  country?: string | null;
  city?: string | null;
  location?: string | null;
  service_lat?: number | string | null;
  service_lng?: number | string | null;
  status?: string | null;
  sort_order?: number | string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_OWNER_SERVICE_ROWS = 500;

function normalizeUuid(
  value: string,
  errorMessage: string
): string {
  const cleanValue = value.trim();

  if (!UUID_PATTERN.test(cleanValue)) {
    throw new Error(errorMessage);
  }

  return cleanValue;
}

function requiredText(
  value: string | null | undefined,
  fieldName: string
): string {
  const cleanValue = String(
    value || ""
  ).trim();

  if (!cleanValue) {
    throw new Error(
      `Andmebaas ei tagastanud teenuse välja: ${fieldName}.`
    );
  }

  return cleanValue;
}

function optionalText(
  value: string | null | undefined
): string | null {
  const cleanValue = String(
    value || ""
  ).trim();

  return cleanValue || null;
}

function optionalNumber(
  value:
    | number
    | string
    | null
    | undefined
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function normalizeSortOrder(
  value:
    | number
    | string
    | null
    | undefined
): number {
  const parsedValue = Number(
    value ?? 0
  );

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0
  ) {
    return 0;
  }

  return Math.floor(parsedValue);
}

function normalizeStatus(
  value: string | null | undefined
): ServiceStatus {
  const cleanValue =
    String(value || "")
      .trim()
      .toLowerCase();

  return SERVICE_STATUSES.includes(
    cleanValue as ServiceStatus
  )
    ? (cleanValue as ServiceStatus)
    : "draft";
}

function normalizePriceType(
  value: string | null | undefined
): ServicePriceType {
  const cleanValue =
    String(value || "")
      .trim()
      .toLowerCase();

  return SERVICE_PRICE_TYPES.includes(
    cleanValue as ServicePriceType
  )
    ? (cleanValue as ServicePriceType)
    : "contact";
}

export function mapServiceRow(
  row: ServiceRow
): Service {
  return {
    id: requiredText(
      row.id,
      "id"
    ),
    identityId: requiredText(
      row.identity_id,
      "identity_id"
    ),
    title: requiredText(
      row.title,
      "title"
    ),
    description:
      row.description || "",
    category: optionalText(
      row.category
    ),
    subcategory: optionalText(
      row.subcategory
    ),
    imageUrl: optionalText(
      row.image_url
    ),
    priceAmount: optionalNumber(
      row.price_amount
    ),
    currency: requiredText(
      row.currency || "EUR",
      "currency"
    ).toUpperCase(),
    priceType: normalizePriceType(
      row.price_type
    ),
    country: optionalText(
      row.country
    ),
    city: optionalText(
      row.city
    ),
    location: optionalText(
      row.location
    ),
    serviceLat: optionalNumber(
      row.service_lat
    ),
    serviceLng: optionalNumber(
      row.service_lng
    ),
    status: normalizeStatus(
      row.status
    ),
    sortOrder: normalizeSortOrder(
      row.sort_order
    ),
    publishedAt:
      row.published_at || null,
    createdAt: requiredText(
      row.created_at,
      "created_at"
    ),
    updatedAt: requiredText(
      row.updated_at,
      "updated_at"
    ),
  };
}

function getServiceLoadErrorMessage(
  error: {
    code?: string | null;
    message?: string | null;
  }
): string {
  const message =
    String(error.message || "")
      .trim();

  const lowerMessage =
    message.toLowerCase();

  if (
    error.code === "42501" ||
    lowerMessage.includes(
      "permission"
    ) ||
    lowerMessage.includes(
      "policy"
    )
  ) {
    return "Sul ei ole õigust selle identiteedi teenuseid vaadata.";
  }

  return (
    message ||
    "Teenuseid ei saanud laadida."
  );
}

export async function getMyServices(input: {
  identityId: string;
  limit?: number;
}): Promise<Service[]> {
  const identityId = normalizeUuid(
    input.identityId,
    "Aktiivse identiteedi ID ei ole korrektne."
  );

  const requestedLimit = Number(
    input.limit ??
      MAX_OWNER_SERVICE_ROWS
  );

  const limit =
    Number.isFinite(requestedLimit)
      ? Math.min(
          MAX_OWNER_SERVICE_ROWS,
          Math.max(
            1,
            Math.floor(
              requestedLimit
            )
          )
        )
      : MAX_OWNER_SERVICE_ROWS;

  const { data, error } =
    await supabaseBrowserClient
      .from("services")
      .select(
        [
          "id",
          "identity_id",
          "title",
          "description",
          "category",
          "subcategory",
          "image_url",
          "price_amount",
          "currency",
          "price_type",
          "country",
          "city",
          "location",
          "service_lat",
          "service_lng",
          "status",
          "sort_order",
          "published_at",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq(
        "identity_id",
        identityId
      )
      .order(
        "sort_order",
        {
          ascending: true,
        }
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      )
      .limit(limit);

  if (error) {
    throw new Error(
      getServiceLoadErrorMessage(
        error
      )
    );
  }

  return (
    (data || []) as ServiceRow[]
  ).map(mapServiceRow);
}

export type MyServiceDetail =
  Service & {
    images:
      PublicServiceImage[];
  };

export async function getMyServiceDetail(input: {
  serviceId: string;
  identityId: string;
}): Promise<MyServiceDetail | null> {
  const serviceId = normalizeUuid(
    input.serviceId,
    "Teenuse ID ei ole korrektne."
  );

  const identityId = normalizeUuid(
    input.identityId,
    "Aktiivse identiteedi ID ei ole korrektne."
  );

  const {
    data: serviceData,
    error: serviceError,
  } =
    await supabaseBrowserClient
      .from("services")
      .select(
        [
          "id",
          "identity_id",
          "title",
          "description",
          "category",
          "subcategory",
          "image_url",
          "price_amount",
          "currency",
          "price_type",
          "country",
          "city",
          "location",
          "service_lat",
          "service_lng",
          "status",
          "sort_order",
          "published_at",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq("id", serviceId)
      .eq(
        "identity_id",
        identityId
      )
      .maybeSingle();

  if (serviceError) {
    throw new Error(
      getServiceLoadErrorMessage(
        serviceError
      )
    );
  }

  if (!serviceData) {
    return null;
  }

  const service = mapServiceRow(
    serviceData as ServiceRow
  );

  if (
    service.id !== serviceId ||
    service.identityId !== identityId
  ) {
    throw new Error(
      "Andmebaas tagastas ootamatu teenuse."
    );
  }

  const ownerImages =
    await getServiceImages(
      serviceId
    );

  for (const image of ownerImages) {
    if (
      image.serviceId !== serviceId ||
      image.identityId !== identityId
    ) {
      throw new Error(
        "Andmebaas tagastas ootamatu teenusepildi."
      );
    }
  }

  const images:
    PublicServiceImage[] =
    ownerImages.map((image) => ({
      id: image.id,
      serviceId: image.serviceId,
      originalUrl:
        image.originalUrl,
      mediumUrl: image.mediumUrl,
      thumbUrl: image.thumbUrl,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
      createdAt: image.createdAt,
    }));

  return {
    ...service,
    images,
  };
}
