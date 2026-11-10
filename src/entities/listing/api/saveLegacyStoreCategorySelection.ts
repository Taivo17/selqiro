import { managedListingStoreCategoryApi } from "./managedListingStoreCategoriesClient";
import { StoreCategoryAssignmentError } from "../model/managedListingStoreCategories";

export type LegacyStoreCategoryIntent = Readonly<{
  userId: string;
  identityId: string | null;
  categoryIds: readonly string[];
}>;

export type LegacyStoreCategorySaveResult =
  | Readonly<{ status: "saved" }>
  | Readonly<{ status: "not_requested" }>
  | Readonly<{ status: "not_saved"; reason: "identity" | "rejected" }>
  | Readonly<{ status: "unconfirmed" }>;

/** Capture the form's actor and selection before its other asynchronous saves. */
export function captureLegacyStoreCategoryIntent(
  userId: string,
  identityId: string | null | undefined,
  selectedCategoryId: string,
): LegacyStoreCategoryIntent {
  return Object.freeze({
    userId,
    identityId: identityId ?? null,
    categoryIds: Object.freeze(selectedCategoryId ? [selectedCategoryId] : []),
  });
}

/** The existing atomic RPC is the only writer. No direct DELETE/INSERT fallback
 * or automatic retry is allowed, including after a lost acknowledgement. */
export async function saveLegacyStoreCategorySelection(
  intent: LegacyStoreCategoryIntent,
  listingId: string | number,
  operation: "create" | "edit",
): Promise<LegacyStoreCategorySaveResult> {
  if (operation === "create" && intent.categoryIds.length === 0) {
    return { status: "not_requested" };
  }
  if (!intent.identityId) {
    return { status: "not_saved", reason: "identity" };
  }
  if (typeof listingId === "number" && (!Number.isSafeInteger(listingId) || listingId <= 0)) {
    return { status: "not_saved", reason: "rejected" };
  }

  try {
    await managedListingStoreCategoryApi.save({
      userId: intent.userId,
      identityId: intent.identityId,
      listingId: String(listingId),
    }, intent.categoryIds);
    return { status: "saved" };
  } catch (error) {
    if (error instanceof StoreCategoryAssignmentError && error.code !== "unknown") {
      return { status: "not_saved", reason: error.code === "context" ? "identity" : "rejected" };
    }
    return { status: "unconfirmed" };
  }
}
