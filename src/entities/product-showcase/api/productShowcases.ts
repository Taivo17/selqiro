import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type {
  PublicProductShowcaseImage,
} from "../model/public";
import {
  PRODUCT_SHOWCASE_CATEGORY_MAX_LENGTH,
  PRODUCT_SHOWCASE_DESCRIPTION_MAX_LENGTH,
  PRODUCT_SHOWCASE_STATUSES,
  PRODUCT_SHOWCASE_TITLE_MAX_LENGTH,
  PRODUCT_SHOWCASE_TITLE_MIN_LENGTH,
  PRODUCT_SHOWCASE_URL_MAX_LENGTH,
  type ProductShowcase,
  type ProductShowcaseStatus,
  type SaveProductShowcaseInput,
} from "../model/types";

type ProductShowcaseRow = {
  id?: string | null;
  identity_id?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  image_url?: string | null;
  external_url?: string | null;
  status?: string | null;
  sort_order?: string | number | null;
  published_at?: string | null;
  last_confirmed_at?: string | null;
  active_until?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

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
  value: string,
  errorMessage: string
): string {
  const cleanValue = value.trim();

  if (!UUID_PATTERN.test(cleanValue)) {
    throw new Error(errorMessage);
  }

  return cleanValue;
}

function normalizeSingleLine(
  value: string | null | undefined
): string {
  return (value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeOptionalSingleLine(
  value: string | null | undefined,
  maximumLength: number,
  errorMessage: string
): string | null {
  const cleanValue = normalizeSingleLine(value);

  if (!cleanValue) {
    return null;
  }

  if (cleanValue.length > maximumLength) {
    throw new Error(errorMessage);
  }

  return cleanValue;
}

function normalizeOptionalUrl(
  value: string | null | undefined,
  label: string
): string | null {
  const cleanValue = (value || "").trim();

  if (!cleanValue) {
    return null;
  }

  if (cleanValue.length > PRODUCT_SHOWCASE_URL_MAX_LENGTH) {
    throw new Error(
      marketplaceMessage("service.value_can_contain_up_to_value_characters.f04d6c", { p0: String(label), p1: String(PRODUCT_SHOWCASE_URL_MAX_LENGTH) })
    );
  }

  return cleanValue;
}

function normalizeStatus(
  value: string | null | undefined
): ProductShowcaseStatus {
  if (
    value &&
    PRODUCT_SHOWCASE_STATUSES.includes(
      value as ProductShowcaseStatus
    )
  ) {
    return value as ProductShowcaseStatus;
  }

  throw new Error(
    marketplaceMessage("showcase.the_database_returned_an_unknown_product_showcase_status.bbfc1c")
  );
}

function normalizeSortOrder(
  value: string | number | null | undefined
): number {
  const parsedValue = Number(value ?? 0);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0
  ) {
    return 0;
  }

  return Math.floor(parsedValue);
}

function mapProductShowcaseRow(
  row: ProductShowcaseRow
): ProductShowcase {
  if (
    !row.id ||
    !row.identity_id ||
    !row.title ||
    !row.created_at ||
    !row.updated_at
  ) {
    throw new Error(
      marketplaceMessage("showcase.the_database_returned_incomplete_product_showcase_details.a6cab7")
    );
  }

  return {
    id: String(row.id),
    identityId: String(row.identity_id),
    title: String(row.title),
    description: row.description || "",
    category: row.category || null,
    imageUrl: row.image_url || null,
    externalUrl: row.external_url || null,
    status: normalizeStatus(row.status),
    sortOrder: normalizeSortOrder(row.sort_order),
    publishedAt: row.published_at || null,
    lastConfirmedAt:
      row.last_confirmed_at || null,
    activeUntil:
      row.active_until || null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function normalizeSaveInput(
  input: SaveProductShowcaseInput
) {
  const title = normalizeSingleLine(input.title);
  const description = (input.description || "").trim();

  if (
    title.length <
    PRODUCT_SHOWCASE_TITLE_MIN_LENGTH
  ) {
    throw new Error(
      marketplaceMessage("service.the_title_must_contain_at_least_value_characters.154417", { p0: String(PRODUCT_SHOWCASE_TITLE_MIN_LENGTH) })
    );
  }

  if (
    title.length >
    PRODUCT_SHOWCASE_TITLE_MAX_LENGTH
  ) {
    throw new Error(
      marketplaceMessage("service.the_title_can_contain_up_to_value_characters.6b5ca7", { p0: String(PRODUCT_SHOWCASE_TITLE_MAX_LENGTH) })
    );
  }

  if (
    description.length >
    PRODUCT_SHOWCASE_DESCRIPTION_MAX_LENGTH
  ) {
    throw new Error(
      marketplaceMessage("service.the_description_can_contain_up_to_value_characters.69b2ed", { p0: String(PRODUCT_SHOWCASE_DESCRIPTION_MAX_LENGTH) })
    );
  }

  return {
    showcaseId: input.showcaseId
      ? normalizeUuid(
          input.showcaseId,
          marketplaceMessage("showcase.the_product_showcase_id_is_invalid.2a98a1")
        )
      : null,
    title,
    description,
    category: normalizeOptionalSingleLine(
      input.category,
      PRODUCT_SHOWCASE_CATEGORY_MAX_LENGTH,
      marketplaceMessage("showcase.the_category_can_contain_up_to_value_characters.e2f868", { p0: String(PRODUCT_SHOWCASE_CATEGORY_MAX_LENGTH) })
    ),
    imageUrl: normalizeOptionalUrl(
      input.imageUrl,
      marketplaceMessage("showcase.image_url.b4c64d")
    ),
    externalUrl: normalizeOptionalUrl(
      input.externalUrl,
      marketplaceMessage("showcase.more_information_url.822c9c")
    ),
  };
}

function getOperationErrorMessage(
  error: SupabaseOperationError,
  fallback: string
): string {
  const message = (
    error.message || ""
  ).toLowerCase();

  if (error.code === "42501") {
    if (
      message.includes("authentication")
    ) {
      return marketplaceMessage("showcase.sign_in_to_manage_the_product_showcase.a81c81");
    }

    if (
      message.includes("active identity") ||
      message.includes("does not belong")
    ) {
      return marketplaceMessage("showcase.this_product_showcase_does_not_belong_to_the.9169f5");
    }

    return marketplaceMessage("showcase.you_do_not_have_permission_to_edit_this.e776c7");
  }

  if (error.code === "22023") {
    if (message.includes("title")) {
      return marketplaceMessage("showcase.the_product_showcase_title_is_invalid.0668ae");
    }

    if (message.includes("description")) {
      return marketplaceMessage("showcase.the_product_showcase_description_is_too_long.76baf2");
    }

    if (message.includes("category")) {
      return marketplaceMessage("showcase.the_product_showcase_category_is_invalid.342c7f");
    }

    if (
      message.includes(
        "must contain at least one image"
      )
    ) {
      return (
        marketplaceMessage("showcase.before_publishing_add.64b68d") +
        marketplaceMessage("showcase.at_least_one_image_to_the_product_showcase.bf398a")
      );
    }

    if (message.includes("image")) {
      return marketplaceMessage("showcase.the_product_showcase_image_details_are_invalid.a0a171");
    }

    if (
      message.includes("external") ||
      message.includes("url")
    ) {
      return marketplaceMessage("showcase.the_product_showcase_information_url_is_invalid.6deecf");
    }

    if (message.includes("status")) {
      return marketplaceMessage("showcase.the_selected_product_showcase_status_is_invalid.9e1052");
    }

    return marketplaceMessage("showcase.the_product_showcase_details_are_invalid.d98998");
  }

  return safeMarketplaceError(error, fallback);
}

export async function getMyProductShowcases(input: {
  identityId: string;
}): Promise<ProductShowcase[]> {
  const identityId = normalizeUuid(
    input.identityId,
    marketplaceMessage("service.the_active_identity_id_is_invalid.9dcd11")
  );

  const { data, error } =
    await supabaseBrowserClient
      .from("product_showcases")
      .select(
        [
          "id",
          "identity_id",
          "title",
          "description",
          "category",
          "image_url",
          "external_url",
          "status",
          "sort_order",
          "published_at",
          "last_confirmed_at",
          "active_until",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq("identity_id", identityId)
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      getOperationErrorMessage(
        error,
        marketplaceMessage("showcase.product_showcases_could_not_be_loaded.bb4a17")
      )
    );
  }

  return (
    (data || []) as ProductShowcaseRow[]
  ).map(mapProductShowcaseRow);
}

export async function saveMyProductShowcase(
  input: SaveProductShowcaseInput
): Promise<ProductShowcase> {
  const normalized =
    normalizeSaveInput(input);

  const { data, error } =
    await supabaseBrowserClient.rpc(
      "save_my_product_showcase_v2",
      {
        p_showcase_id:
          normalized.showcaseId,
        p_title: normalized.title,
        p_description:
          normalized.description,
        p_category:
          normalized.category,
        p_image_url:
          normalized.imageUrl,
        p_external_url:
          normalized.externalUrl,
      }
    );

  if (error) {
    throw new Error(
      getOperationErrorMessage(
        error,
        marketplaceMessage("showcase.the_product_showcase_could_not_be_saved.8e58b1")
      )
    );
  }

  const row = firstRow(
    data as
      | ProductShowcaseRow
      | ProductShowcaseRow[]
      | null
  );

  if (!row) {
    throw new Error(
      marketplaceMessage("showcase.the_database_did_not_return_the_saved_product.4294e5")
    );
  }

  const showcase =
    mapProductShowcaseRow(row);

  if (
    normalized.showcaseId &&
    showcase.id !==
      normalized.showcaseId
  ) {
    throw new Error(
      marketplaceMessage("showcase.the_database_returned_an_unexpected_product_showcase.29a46a")
    );
  }

  return showcase;
}

export async function setMyProductShowcaseStatus(
  input: {
    showcaseId: string;
    status: ProductShowcaseStatus;
  }
): Promise<ProductShowcase> {
  const showcaseId = normalizeUuid(
    input.showcaseId,
    marketplaceMessage("showcase.the_product_showcase_id_is_invalid.2a98a1")
  );

  if (
    !PRODUCT_SHOWCASE_STATUSES.includes(
      input.status
    )
  ) {
    throw new Error(
      marketplaceMessage("showcase.the_selected_product_showcase_status_is_invalid.9e1052")
    );
  }

  const { data, error } =
    await supabaseBrowserClient.rpc(
      "set_my_product_showcase_status_v2",
      {
        p_showcase_id: showcaseId,
        p_status: input.status,
      }
    );

  if (error) {
    throw new Error(
      getOperationErrorMessage(
        error,
        marketplaceMessage("showcase.the_product_showcase_status_could_not_be_changed.da945d")
      )
    );
  }

  const row = firstRow(
    data as
      | ProductShowcaseRow
      | ProductShowcaseRow[]
      | null
  );

  if (!row) {
    throw new Error(
      marketplaceMessage("showcase.the_database_did_not_return_the_updated_product.ce15f8")
    );
  }

  const showcase =
    mapProductShowcaseRow(row);

  if (
    showcase.id !== showcaseId ||
    showcase.status !== input.status
  ) {
    throw new Error(
      marketplaceMessage("showcase.the_database_returned_an_unexpected_product_showcase_status.f3bb99")
    );
  }

  return showcase;
}

type MyProductShowcaseDetailImageRow = {
  id?: string | null;
  showcase_id?: string | null;
  original_url?: string | null;
  medium_url?: string | null;
  thumb_url?: string | null;
  sort_order?: number | string | null;
  is_primary?: boolean | null;
  created_at?: string | null;
};

export type MyProductShowcaseDetail =
  ProductShowcase & {
    images:
      PublicProductShowcaseImage[];
  };

function normalizeDetailImageUrl(
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

function mapDetailImageRow(
  row: MyProductShowcaseDetailImageRow,
  expectedShowcaseId: string
): PublicProductShowcaseImage | null {
  const id =
    row.id?.trim() || "";

  const showcaseId =
    row.showcase_id?.trim() || "";

  const originalUrl =
    normalizeDetailImageUrl(
      row.original_url
    ) ||
    normalizeDetailImageUrl(
      row.medium_url
    ) ||
    normalizeDetailImageUrl(
      row.thumb_url
    );

  if (
    !id ||
    !showcaseId ||
    showcaseId !==
      expectedShowcaseId ||
    !originalUrl
  ) {
    return null;
  }

  return {
    id,
    showcaseId,
    originalUrl,
    mediumUrl:
      normalizeDetailImageUrl(
        row.medium_url
      ),
    thumbUrl:
      normalizeDetailImageUrl(
        row.thumb_url
      ),
    sortOrder:
      normalizeSortOrder(
        row.sort_order
      ),
    isPrimary:
      row.is_primary === true,
    createdAt:
      row.created_at || null,
  };
}

function compareDetailImages(
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

  return (
    first.createdAt || ""
  ).localeCompare(
    second.createdAt || ""
  );
}

function buildLegacyDetailImage(
  showcase: ProductShowcase
): PublicProductShowcaseImage[] {
  if (!showcase.imageUrl) {
    return [];
  }

  return [
    {
      id: `legacy-${showcase.id}`,
      showcaseId: showcase.id,
      originalUrl:
        showcase.imageUrl,
      mediumUrl: null,
      thumbUrl: null,
      sortOrder: 0,
      isPrimary: true,
      createdAt:
        showcase.createdAt,
    },
  ];
}

export async function
getMyProductShowcaseDetail(input: {
  showcaseId: string;
  identityId: string;
}): Promise<
  MyProductShowcaseDetail | null
> {
  const showcaseId =
    normalizeUuid(
      input.showcaseId,
      marketplaceMessage("showcase.the_product_showcase_id_is_invalid.2a98a1")
    );

  const identityId =
    normalizeUuid(
      input.identityId,
      marketplaceMessage("service.the_active_identity_id_is_invalid.9dcd11")
    );

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
          "image_url",
          "external_url",
          "status",
          "sort_order",
          "published_at",
          "last_confirmed_at",
          "active_until",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq("id", showcaseId)
      .eq(
        "identity_id",
        identityId
      )
      .maybeSingle();

  if (showcaseError) {
    throw new Error(
      getOperationErrorMessage(
        showcaseError,
        marketplaceMessage("showcase.the_product_showcase_could_not_be_loaded.20097b")
      )
    );
  }

  if (!showcaseData) {
    return null;
  }

  const showcase =
    mapProductShowcaseRow(
      showcaseData as
        ProductShowcaseRow
    );

  if (
    showcase.id !== showcaseId ||
    showcase.identityId !==
      identityId
  ) {
    throw new Error(
      marketplaceMessage("showcase.the_database_returned_an_unexpected_product_showcase.29a46a")
    );
  }

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
        "showcase_id",
        showcaseId
      )
      .eq(
        "identity_id",
        identityId
      )
      .order("is_primary", {
        ascending: false,
      })
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      })
      .limit(10);

  if (imageError) {
    throw new Error(
      getOperationErrorMessage(
        imageError,
        marketplaceMessage("showcase.the_product_showcase_images_could_not_be_loaded.2cb0dc")
      )
    );
  }

  const images = (
    (
      imageData || []
    ) as MyProductShowcaseDetailImageRow[]
  )
    .map((row) =>
      mapDetailImageRow(
        row,
        showcaseId
      )
    )
    .filter(
      (
        image
      ): image is PublicProductShowcaseImage =>
        image !== null
    )
    .sort(compareDetailImages);

  return {
    ...showcase,
    images:
      images.length > 0
        ? images
        : buildLegacyDetailImage(
            showcase
          ),
  };
}
