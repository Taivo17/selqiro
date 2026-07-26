export type ProductShowcaseImage = {
  id: string;
  showcaseId: string;
  identityId: string;
  uploadedByUserId: string;
  originalUrl: string;
  mediumUrl: string | null;
  thumbUrl: string | null;
  storagePath: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string | null;
};

export type ProductShowcaseImageRow = {
  id?: string | null;
  showcase_id?: string | null;
  identity_id?: string | null;
  uploaded_by_user_id?: string | null;
  original_url?: string | null;
  medium_url?: string | null;
  thumb_url?: string | null;
  storage_path?: string | null;
  sort_order?: number | string | null;
  is_primary?: boolean | null;
  created_at?: string | null;
};

function requiredText(
  value: string | null | undefined,
  fieldName: string
): string {
  const cleanValue = (value || "").trim();

  if (!cleanValue) {
    throw new Error(
      `Andmebaas ei tagastanud välja: ${fieldName}.`
    );
  }

  return cleanValue;
}

export function mapProductShowcaseImageRow(
  row: ProductShowcaseImageRow
): ProductShowcaseImage {
  const parsedSortOrder =
    Number(row.sort_order ?? 0);

  return {
    id: requiredText(row.id, "id"),
    showcaseId: requiredText(
      row.showcase_id,
      "showcase_id"
    ),
    identityId: requiredText(
      row.identity_id,
      "identity_id"
    ),
    uploadedByUserId: requiredText(
      row.uploaded_by_user_id,
      "uploaded_by_user_id"
    ),
    originalUrl: requiredText(
      row.original_url,
      "original_url"
    ),
    mediumUrl: row.medium_url || null,
    thumbUrl: row.thumb_url || null,
    storagePath: requiredText(
      row.storage_path,
      "storage_path"
    ),
    sortOrder: Number.isFinite(parsedSortOrder)
      ? Math.max(0, parsedSortOrder)
      : 0,
    isPrimary: row.is_primary === true,
    createdAt: row.created_at || null,
  };
}

export function sortProductShowcaseImages(
  images: ProductShowcaseImage[]
): ProductShowcaseImage[] {
  return [...images].sort((first, second) => {
    if (first.isPrimary !== second.isPrimary) {
      return first.isPrimary ? -1 : 1;
    }

    if (first.sortOrder !== second.sortOrder) {
      return first.sortOrder - second.sortOrder;
    }

    const firstTime = first.createdAt || "";
    const secondTime = second.createdAt || "";

    if (firstTime !== secondTime) {
      return firstTime.localeCompare(secondTime);
    }

    return first.id.localeCompare(second.id);
  });
}

export function getProductShowcaseImageUrl(
  image: ProductShowcaseImage
): string {
  return (
    image.mediumUrl ||
    image.originalUrl ||
    image.thumbUrl ||
    ""
  );
}
