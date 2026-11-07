import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";

type SetListingStoreCategoriesRpcRow = {
  listing_id?: string | number | null;
  category_ids?: unknown;
  assigned_count?: number | null;
  removed_previous_links?: number | null;
};

export type SetListingStoreCategoriesResult = {
  listingId: string;
  categoryIds: string[];
  assignedCount: number;
  removedPreviousLinks: number;
};

function normalizeListingId(value: string): string {
  const cleanValue = value.trim();

  if (!/^[1-9][0-9]*$/.test(cleanValue)) {
    throw new Error("listingIdInvalid");
  }

  return cleanValue;
}

function normalizeCategoryIds(value: unknown): string[] {
  let rawValues: unknown[] = [];

  if (Array.isArray(value)) {
    rawValues = value;
  } else if (
    typeof value === "string" &&
    value.startsWith("{") &&
    value.endsWith("}")
  ) {
    const content = value.slice(1, -1).trim();

    rawValues = content
      ? content.split(",").map((item) =>
          item.replace(/^"|"$/g, "")
        )
      : [];
  }

  return Array.from(
    new Set(
      rawValues
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).sort((first, second) => first.localeCompare(second));
}

function normalizeInputCategoryIds(
  categoryIds: string[]
): string[] {
  return Array.from(
    new Set(
      categoryIds
        .map((categoryId) => categoryId.trim())
        .filter(Boolean)
    )
  ).sort((first, second) => first.localeCompare(second));
}

function firstRow(
  value:
    | SetListingStoreCategoriesRpcRow
    | SetListingStoreCategoriesRpcRow[]
    | null
    | undefined
): SetListingStoreCategoriesRpcRow | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function getAssignmentErrorMessage(error: {
  code?: string | null;
  message?: string | null;
}): string {
  const message = (error.message || "").toLowerCase();

  if (error.code === "42501") {
    if (message.includes("listing")) {
      return "storeAssignmentForbidden";
    }

    if (message.includes("categor")) {
      return "storeSectionOwnerMismatch";
    }

    return "actionForbidden";
  }

  if (error.code === "22023") {
    if (message.includes("active identity")) {
      return "activeIdentityMissing";
    }

    if (message.includes("does not exist")) {
      return "listingNotFound";
    }

    return "storeAssignmentInvalid";
  }

  return (
    error.message ||
    "storeAssignmentSaveFailed"
  );
}

export async function setListingStoreCategories(input: {
  listingId: string;
  categoryIds: string[];
}): Promise<SetListingStoreCategoriesResult> {
  const cleanListingId = normalizeListingId(input.listingId);
  const cleanCategoryIds = normalizeInputCategoryIds(
    input.categoryIds
  );

  const { data, error } = await supabaseBrowserClient.rpc(
    "set_my_listing_store_categories_v2",
    {
      p_listing_id: cleanListingId,
      p_category_ids: cleanCategoryIds,
    }
  );

  if (error) {
    throw new Error(getAssignmentErrorMessage(error));
  }

  const row = firstRow(
    data as
      | SetListingStoreCategoriesRpcRow
      | SetListingStoreCategoriesRpcRow[]
      | null
  );

  if (!row?.listing_id) {
    throw new Error(
      "savedListingMissing"
    );
  }

  const returnedListingId = String(row.listing_id);

  if (returnedListingId !== cleanListingId) {
    throw new Error(
      "unexpectedListing"
    );
  }

  const returnedCategoryIds = normalizeCategoryIds(
    row.category_ids
  );

  const assignedCount = Math.max(
    0,
    Number(row.assigned_count ?? returnedCategoryIds.length)
  );

  if (assignedCount !== returnedCategoryIds.length) {
    throw new Error(
      "storeAssignmentCountMismatch"
    );
  }

  return {
    listingId: returnedListingId,
    categoryIds: returnedCategoryIds,
    assignedCount,
    removedPreviousLinks: Math.max(
      0,
      Number(row.removed_previous_links ?? 0)
    ),
  };
}
