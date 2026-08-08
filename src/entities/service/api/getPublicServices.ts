import {
  supabaseBrowserClient,
} from "../../../shared/supabase/browserClient";
import {
  getPublicServiceImageUrl,
  type PublicService,
  type PublicServiceImage,
} from "../model/public";
import {
  SERVICE_PRICE_TYPES,
  type ServicePriceType,
} from "../model/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_PUBLIC_SERVICE_LIMIT = 80;
const MAX_PUBLIC_SERVICE_LIMIT = 80;
const PUBLIC_IMAGES_PER_SERVICE_LIMIT = 10;

type PublicServiceRow = {
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
  status?: string | null;
  sort_order?: number | string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PublicServiceImageRow = {
  id?: string | null;
  service_id?: string | null;
  original_url?: string | null;
  medium_url?: string | null;
  thumb_url?: string | null;
  sort_order?: number | string | null;
  is_primary?: boolean | null;
  created_at?: string | null;
};

type PublicServiceBase =
  Omit<
    PublicService,
    "images"
  >;

function normalizeIdentityId(
  value: string | null | undefined
): string | null {
  const cleanValue =
    value?.trim().toLowerCase() || "";

  if (!cleanValue) {
    return null;
  }

  if (!UUID_PATTERN.test(cleanValue)) {
    throw new Error(
      "Avaliku profiili identiteedi ID ei ole korrektne."
    );
  }

  return cleanValue;
}

function normalizeLimit(
  value: number | null | undefined
): number {
  const parsedValue = Number(
    value ??
      DEFAULT_PUBLIC_SERVICE_LIMIT
  );

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1
  ) {
    return DEFAULT_PUBLIC_SERVICE_LIMIT;
  }

  return Math.min(
    parsedValue,
    MAX_PUBLIC_SERVICE_LIMIT
  );
}

function normalizeRequiredText(
  value: string | null | undefined
): string | null {
  const cleanValue =
    value?.trim() || "";

  return cleanValue || null;
}

function normalizeOptionalText(
  value: string | null | undefined
): string | null {
  return normalizeRequiredText(value);
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

function normalizeOptionalNumber(
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

function normalizeDate(
  value: string | null | undefined
): string | null {
  const cleanValue =
    value?.trim() || "";

  if (
    !cleanValue ||
    Number.isNaN(
      Date.parse(cleanValue)
    )
  ) {
    return null;
  }

  return cleanValue;
}

function normalizeCurrency(
  value: string | null | undefined
): string {
  const cleanValue =
    value?.trim().toUpperCase() ||
    "EUR";

  return /^[A-Z]{3}$/.test(cleanValue)
    ? cleanValue
    : "EUR";
}

function normalizePriceType(
  value: string | null | undefined
): ServicePriceType {
  const cleanValue =
    value?.trim().toLowerCase() ||
    "contact";

  return SERVICE_PRICE_TYPES.includes(
    cleanValue as ServicePriceType
  )
    ? (cleanValue as ServicePriceType)
    : "contact";
}

function normalizePublicImageUrl(
  value: string | null | undefined
): string | null {
  const cleanValue =
    value?.trim() || "";

  if (!cleanValue) {
    return null;
  }

  try {
    const parsedUrl =
      new URL(cleanValue);

    if (
      parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:"
    ) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function mapPublicServiceRow(
  row: PublicServiceRow,
  expectedIdentityId: string
): PublicServiceBase | null {
  const id =
    normalizeRequiredText(row.id);

  const identityId =
    normalizeRequiredText(
      row.identity_id
    );

  const title =
    normalizeRequiredText(
      row.title
    );

  const publishedAt =
    normalizeDate(
      row.published_at
    );

  const createdAt =
    normalizeDate(
      row.created_at
    );

  const updatedAt =
    normalizeDate(
      row.updated_at
    );

  if (
    !id ||
    !UUID_PATTERN.test(id) ||
    !identityId ||
    identityId !==
      expectedIdentityId ||
    row.status !== "published" ||
    !title ||
    !publishedAt ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    identityId,
    title,
    description:
      row.description?.trim() || "",
    category:
      normalizeOptionalText(
        row.category
      ),
    subcategory:
      normalizeOptionalText(
        row.subcategory
      ),
    imageUrl:
      normalizePublicImageUrl(
        row.image_url
      ),
    priceAmount:
      normalizeOptionalNumber(
        row.price_amount
      ),
    currency:
      normalizeCurrency(
        row.currency
      ),
    priceType:
      normalizePriceType(
        row.price_type
      ),
    country:
      normalizeOptionalText(
        row.country
      ),
    city:
      normalizeOptionalText(
        row.city
      ),
    location:
      normalizeOptionalText(
        row.location
      ),
    status: "published",
    sortOrder:
      normalizeSortOrder(
        row.sort_order
      ),
    publishedAt,
    createdAt,
    updatedAt,
  };
}

function mapPublicServiceImageRow(
  row: PublicServiceImageRow,
  allowedServiceIds: Set<string>
): PublicServiceImage | null {
  const id =
    normalizeRequiredText(row.id);

  const serviceId =
    normalizeRequiredText(
      row.service_id
    );

  const originalUrl =
    normalizePublicImageUrl(
      row.original_url
    );

  if (
    !id ||
    !UUID_PATTERN.test(id) ||
    !serviceId ||
    !allowedServiceIds.has(
      serviceId
    ) ||
    !originalUrl
  ) {
    return null;
  }

  return {
    id,
    serviceId,
    originalUrl,
    mediumUrl:
      normalizePublicImageUrl(
        row.medium_url
      ),
    thumbUrl:
      normalizePublicImageUrl(
        row.thumb_url
      ),
    sortOrder:
      normalizeSortOrder(
        row.sort_order
      ),
    isPrimary:
      row.is_primary === true,
    createdAt:
      normalizeDate(
        row.created_at
      ),
  };
}

function comparePublicServiceImages(
  first: PublicServiceImage,
  second: PublicServiceImage
): number {
  if (
    first.isPrimary !==
    second.isPrimary
  ) {
    return first.isPrimary
      ? -1
      : 1;
  }

  if (
    first.sortOrder !==
    second.sortOrder
  ) {
    return (
      first.sortOrder -
      second.sortOrder
    );
  }

  const firstCreatedAt =
    first.createdAt || "";

  const secondCreatedAt =
    second.createdAt || "";

  if (
    firstCreatedAt !==
    secondCreatedAt
  ) {
    return firstCreatedAt.localeCompare(
      secondCreatedAt
    );
  }

  return first.id.localeCompare(
    second.id
  );
}

export async function getPublicServices(input: {
  identityId:
    | string
    | null
    | undefined;
  limit?: number;
}): Promise<PublicService[]> {
  const identityId =
    normalizeIdentityId(
      input.identityId
    );

  if (!identityId) {
    return [];
  }

  const limit =
    normalizeLimit(input.limit);

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
      .eq("status", "published")
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      })
      .limit(limit);

  if (serviceError) {
    throw new Error(
      serviceError.message ||
        "Avaliku profiili teenuseid ei saanud laadida."
    );
  }

  const services = (
    (
      serviceData || []
    ) as PublicServiceRow[]
  )
    .map((row) =>
      mapPublicServiceRow(
        row,
        identityId
      )
    )
    .filter(
      (
        service
      ): service is PublicServiceBase =>
        service !== null
    );

  if (services.length === 0) {
    return [];
  }

  const serviceIds =
    services.map(
      (service) =>
        service.id
    );

  const allowedServiceIds =
    new Set(serviceIds);

  const {
    data: imageData,
    error: imageError,
  } =
    await supabaseBrowserClient
      .from("service_images")
      .select(
        [
          "id",
          "service_id",
          "original_url",
          "medium_url",
          "thumb_url",
          "sort_order",
          "is_primary",
          "created_at",
        ].join(",")
      )
      .eq(
        "identity_id",
        identityId
      )
      .in(
        "service_id",
        serviceIds
      )
      .order("service_id", {
        ascending: true,
      })
      .order("is_primary", {
        ascending: false,
      })
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      })
      .limit(
        serviceIds.length *
          PUBLIC_IMAGES_PER_SERVICE_LIMIT
      );

  if (imageError) {
    throw new Error(
      imageError.message ||
        "Avaliku profiili teenuste pilte ei saanud laadida."
    );
  }

  const imagesByServiceId =
    new Map<
      string,
      PublicServiceImage[]
    >();

  for (
    const row of (
      imageData || []
    ) as PublicServiceImageRow[]
  ) {
    const image =
      mapPublicServiceImageRow(
        row,
        allowedServiceIds
      );

    if (!image) {
      continue;
    }

    const currentImages =
      imagesByServiceId.get(
        image.serviceId
      ) || [];

    currentImages.push(image);

    imagesByServiceId.set(
      image.serviceId,
      currentImages
    );
  }

  return services.map((service) => {
    const images = [
      ...(
        imagesByServiceId.get(
          service.id
        ) || []
      ),
    ].sort(
      comparePublicServiceImages
    );

    const primaryImageUrl =
      images.length > 0
        ? getPublicServiceImageUrl(
            images[0]
          ) || null
        : null;

    return {
      ...service,
      imageUrl:
        primaryImageUrl ||
        service.imageUrl,
      images,
    };
  });
}
