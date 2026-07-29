import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
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
      `${label} võib olla kuni ${PRODUCT_SHOWCASE_URL_MAX_LENGTH} tähemärki.`
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
    "Andmebaas tagastas tundmatu tootenäidise staatuse."
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
      "Andmebaas tagastas puudulikud tootenäidise andmed."
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
      `Pealkiri peab olema vähemalt ${PRODUCT_SHOWCASE_TITLE_MIN_LENGTH} tähemärki.`
    );
  }

  if (
    title.length >
    PRODUCT_SHOWCASE_TITLE_MAX_LENGTH
  ) {
    throw new Error(
      `Pealkiri võib olla kuni ${PRODUCT_SHOWCASE_TITLE_MAX_LENGTH} tähemärki.`
    );
  }

  if (
    description.length >
    PRODUCT_SHOWCASE_DESCRIPTION_MAX_LENGTH
  ) {
    throw new Error(
      `Kirjeldus võib olla kuni ${PRODUCT_SHOWCASE_DESCRIPTION_MAX_LENGTH} tähemärki.`
    );
  }

  return {
    showcaseId: input.showcaseId
      ? normalizeUuid(
          input.showcaseId,
          "Tootenäidise ID ei ole korrektne."
        )
      : null,
    title,
    description,
    category: normalizeOptionalSingleLine(
      input.category,
      PRODUCT_SHOWCASE_CATEGORY_MAX_LENGTH,
      `Kategooria võib olla kuni ${PRODUCT_SHOWCASE_CATEGORY_MAX_LENGTH} tähemärki.`
    ),
    imageUrl: normalizeOptionalUrl(
      input.imageUrl,
      "Pildi aadress"
    ),
    externalUrl: normalizeOptionalUrl(
      input.externalUrl,
      "Lisainfo aadress"
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
      return "Tootenäidise haldamiseks logi sisse.";
    }

    if (
      message.includes("active identity") ||
      message.includes("does not belong")
    ) {
      return "See tootenäidis ei kuulu aktiivsele identiteedile.";
    }

    return "Sul ei ole õigust seda tootenäidist muuta.";
  }

  if (error.code === "22023") {
    if (message.includes("title")) {
      return "Tootenäidise pealkiri ei ole korrektne.";
    }

    if (message.includes("description")) {
      return "Tootenäidise kirjeldus on liiga pikk.";
    }

    if (message.includes("category")) {
      return "Tootenäidise kategooria ei ole korrektne.";
    }

    if (
      message.includes(
        "must contain at least one image"
      )
    ) {
      return (
        "Enne avaldamist lisa " +
        "tootenäidisele vähemalt üks pilt."
      );
    }

    if (message.includes("image")) {
      return "Tootenäidise pildi andmed ei ole korrektsed.";
    }

    if (
      message.includes("external") ||
      message.includes("url")
    ) {
      return "Tootenäidise lisainfo aadress ei ole korrektne.";
    }

    if (message.includes("status")) {
      return "Valitud tootenäidise staatus ei ole korrektne.";
    }

    return "Tootenäidise andmed ei ole korrektsed.";
  }

  return error.message || fallback;
}

export async function getMyProductShowcases(input: {
  identityId: string;
}): Promise<ProductShowcase[]> {
  const identityId = normalizeUuid(
    input.identityId,
    "Aktiivse identiteedi ID ei ole korrektne."
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
        "Tootenäidiseid ei saanud laadida."
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
        "Tootenäidist ei saanud salvestada."
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
      "Andmebaas ei tagastanud salvestatud tootenäidist."
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
      "Andmebaas tagastas ootamatu tootenäidise."
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
    "Tootenäidise ID ei ole korrektne."
  );

  if (
    !PRODUCT_SHOWCASE_STATUSES.includes(
      input.status
    )
  ) {
    throw new Error(
      "Valitud tootenäidise staatus ei ole korrektne."
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
        "Tootenäidise staatust ei saanud muuta."
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
      "Andmebaas ei tagastanud muudetud tootenäidist."
    );
  }

  const showcase =
    mapProductShowcaseRow(row);

  if (
    showcase.id !== showcaseId ||
    showcase.status !== input.status
  ) {
    throw new Error(
      "Andmebaas tagastas ootamatu tootenäidise staatuse."
    );
  }

  return showcase;
}
