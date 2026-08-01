import {
  supabaseBrowserClient,
} from "../../../shared/supabase/browserClient";
import {
  getPublicProductShowcaseImageUrl,
  type PublicProductShowcase,
  type PublicProductShowcaseImage,
} from "../model/public";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_PUBLIC_SHOWCASE_LIMIT = 80;
const MAX_PUBLIC_SHOWCASE_LIMIT = 80;
const PUBLIC_IMAGES_PER_SHOWCASE_LIMIT = 10;

type PublicProductShowcaseRow = {
  id?: string | null;
  identity_id?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  status?: string | null;
  sort_order?: number | string | null;
  published_at?: string | null;
  active_until?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PublicProductShowcaseImageRow = {
  id?: string | null;
  showcase_id?: string | null;
  original_url?: string | null;
  medium_url?: string | null;
  thumb_url?: string | null;
  sort_order?: number | string | null;
  is_primary?: boolean | null;
  created_at?: string | null;
};

type PublicProductShowcaseBase =
  Omit<
    PublicProductShowcase,
    "imageUrl" | "images"
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
      DEFAULT_PUBLIC_SHOWCASE_LIMIT
  );

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1
  ) {
    return DEFAULT_PUBLIC_SHOWCASE_LIMIT;
  }

  return Math.min(
    parsedValue,
    MAX_PUBLIC_SHOWCASE_LIMIT
  );
}

function normalizeSortOrder(
  value: number | string | null | undefined
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

function mapPublicShowcaseRow(
  row: PublicProductShowcaseRow,
  expectedIdentityId: string,
  requestedAt: number
): PublicProductShowcaseBase | null {
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

  const activeUntil =
    normalizeDate(
      row.active_until
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
    !activeUntil ||
    Date.parse(activeUntil) <=
      requestedAt ||
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
    status: "published",
    sortOrder:
      normalizeSortOrder(
        row.sort_order
      ),
    publishedAt:
      normalizeDate(
        row.published_at
      ),
    activeUntil,
    createdAt,
    updatedAt,
  };
}

function mapPublicImageRow(
  row: PublicProductShowcaseImageRow,
  allowedShowcaseIds: Set<string>
): PublicProductShowcaseImage | null {
  const id =
    normalizeRequiredText(row.id);

  const showcaseId =
    normalizeRequiredText(
      row.showcase_id
    );

  const originalUrl =
    normalizePublicImageUrl(
      row.original_url
    );

  if (
    !id ||
    !UUID_PATTERN.test(id) ||
    !showcaseId ||
    !allowedShowcaseIds.has(
      showcaseId
    ) ||
    !originalUrl
  ) {
    return null;
  }

  return {
    id,
    showcaseId,
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

function comparePublicImages(
  first: PublicProductShowcaseImage,
  second: PublicProductShowcaseImage
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

export async function
getPublicProductShowcases(input: {
  identityId:
    | string
    | null
    | undefined;
  limit?: number;
}): Promise<
  PublicProductShowcase[]
> {
  const identityId =
    normalizeIdentityId(
      input.identityId
    );

  if (!identityId) {
    return [];
  }

  const limit =
    normalizeLimit(input.limit);

  const requestedAt =
    Date.now();

  const requestedAtIso =
    new Date(
      requestedAt
    ).toISOString();

  const {
    data: showcaseData,
    error: showcaseError,
  } =
    await supabaseBrowserClient
      .from("product_showcases")
      .select(
        [
          "id",
          "identity_id",
          "title",
          "description",
          "category",
          "status",
          "sort_order",
          "published_at",
          "active_until",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq(
        "identity_id",
        identityId
      )
      .eq("status", "published")
      .gt(
        "active_until",
        requestedAtIso
      )
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      })
      .limit(limit);

  if (showcaseError) {
    throw new Error(
      showcaseError.message ||
        "Avaliku profiili tootenäidiseid ei saanud laadida."
    );
  }

  const showcases = (
    (
      showcaseData || []
    ) as PublicProductShowcaseRow[]
  )
    .map((row) =>
      mapPublicShowcaseRow(
        row,
        identityId,
        requestedAt
      )
    )
    .filter(
      (
        showcase
      ): showcase is PublicProductShowcaseBase =>
        showcase !== null
    );

  if (
    showcases.length === 0
  ) {
    return [];
  }

  const showcaseIds =
    showcases.map(
      (showcase) =>
        showcase.id
    );

  const allowedShowcaseIds =
    new Set(showcaseIds);

  const {
    data: imageData,
    error: imageError,
  } =
    await supabaseBrowserClient
      .from(
        "product_showcase_images"
      )
      .select(
        [
          "id",
          "showcase_id",
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
        "showcase_id",
        showcaseIds
      )
      .order("showcase_id", {
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
        showcaseIds.length *
          PUBLIC_IMAGES_PER_SHOWCASE_LIMIT
      );

  if (imageError) {
    throw new Error(
      imageError.message ||
        "Avaliku profiili tootenäidiste pilte ei saanud laadida."
    );
  }

  const imagesByShowcaseId =
    new Map<
      string,
      PublicProductShowcaseImage[]
    >();

  for (
    const row of (
      imageData || []
    ) as PublicProductShowcaseImageRow[]
  ) {
    const image =
      mapPublicImageRow(
        row,
        allowedShowcaseIds
      );

    if (!image) {
      continue;
    }

    const currentImages =
      imagesByShowcaseId.get(
        image.showcaseId
      ) || [];

    currentImages.push(image);

    imagesByShowcaseId.set(
      image.showcaseId,
      currentImages
    );
  }

  const result:
    PublicProductShowcase[] = [];

  for (const showcase of showcases) {
    const images = [
      ...(
        imagesByShowcaseId.get(
          showcase.id
        ) || []
      ),
    ].sort(comparePublicImages);

    if (images.length === 0) {
      continue;
    }

    const imageUrl =
      getPublicProductShowcaseImageUrl(
        images[0]
      );

    if (!imageUrl) {
      continue;
    }

    result.push({
      ...showcase,
      imageUrl,
      images,
    });
  }

  return result;
}
