import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import {
  buildContentImageStoragePath,
  CONTENT_IMAGE_LIMIT,
  validateContentImageFile,
} from "../../../shared/media/imageRules";
import {
  mapProductShowcaseImageRow,
  sortProductShowcaseImages,
  type ProductShowcaseImage,
  type ProductShowcaseImageRow,
} from "../model/image";

const PRODUCT_SHOWCASE_IMAGE_BUCKET =
  "product-showcase-images";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

type DeleteProductShowcaseImageRpcResult = {
  deleted_image_id?: string | null;
  storage_path?: string | null;
  fallback_image?: string | null;
  remaining_count?: number | string | null;
};

export type DeleteProductShowcaseImageResult = {
  deletedImageId: string;
  storagePath: string | null;
  fallbackImage: string | null;
  remainingCount: number;
  storageCleanupFailed: boolean;
};

function normalizeUuid(
  value: string,
  fieldLabel: string
): string {
  const cleanValue = value.trim();

  if (!UUID_PATTERN.test(cleanValue)) {
    throw new Error(
      marketplaceMessage("service.value_is_invalid.0527f5", { p0: String(fieldLabel) })
    );
  }

  return cleanValue;
}

function firstValue<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function getImageErrorMessage(
  error: SupabaseErrorLike,
  fallback: string
): string {
  const message =
    (error.message || "").toLowerCase();

  if (error.code === "42501") {
    if (message.includes("authentication")) {
      return marketplaceMessage("showcase.sign_in_to_continue.88be83");
    }

    return (
      marketplaceMessage("showcase.you_do_not_have_permission_to_edit_this.12f884") +
      marketplaceMessage("showcase.images_as_the_active_identity.8e1f15")
    );
  }

  if (
    message.includes("at most 10") ||
    message.includes("max_images")
  ) {
    return (
      marketplaceMessage("showcase.a_product_showcase_can_have_up_to.2e1638") +
      marketplaceMessage("showcase.value_images.a82b8e", { p0: String(CONTENT_IMAGE_LIMIT) })
    );
  }

  if (
    message.includes("must keep at least one image")
  ) {
    return (
      marketplaceMessage("showcase.the_last_image_of_a_published_product_showcase.9d7b91") +
      marketplaceMessage("showcase.cannot_be_deleted.8b7d15")
    );
  }

  if (
    message.includes(
      "must contain at least one image"
    )
  ) {
    return (
      marketplaceMessage("showcase.before_publishing_add.787cf9") +
      marketplaceMessage("showcase.at_least_one_image_to_the_product_showcase.e6f272")
    );
  }

  if (
    message.includes("does not belong") ||
    message.includes("active identity")
  ) {
    return (
      marketplaceMessage("showcase.this_product_showcase_does_not_belong_to_the.6d2fc3") +
      marketplaceMessage("showcase.identity")
    );
  }

  if (
    message.includes("image was not found") ||
    message.includes("image was not found in storage")
  ) {
    return marketplaceMessage("showcase.the_product_showcase_image_was_not_found.fb9532");
  }

  if (message.includes("storage path")) {
    return marketplaceMessage("showcase.the_image_storage_path_is_invalid.26dab3");
  }

  return safeMarketplaceError(error, fallback);
}

async function removeStorageObject(
  storagePath: string
): Promise<boolean> {
  const { error } =
    await supabaseBrowserClient.storage
      .from(PRODUCT_SHOWCASE_IMAGE_BUCKET)
      .remove([storagePath]);

  if (error) {
    console.warn(
      "Product showcase image Storage cleanup failed:",
      error.message
    );

    return false;
  }

  return true;
}

export async function getProductShowcaseImages(
  showcaseId: string
): Promise<ProductShowcaseImage[]> {
  const cleanShowcaseId = normalizeUuid(
    showcaseId,
    marketplaceMessage("showcase.product_showcase_id.9c2d29")
  );

  const { data, error } =
    await supabaseBrowserClient
      .from("product_showcase_images")
      .select(
        [
          "id",
          "showcase_id",
          "identity_id",
          "uploaded_by_user_id",
          "original_url",
          "medium_url",
          "thumb_url",
          "storage_path",
          "sort_order",
          "is_primary",
          "created_at",
        ].join(",")
      )
      .eq("showcase_id", cleanShowcaseId)
      .order("is_primary", {
        ascending: false,
      })
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      getImageErrorMessage(
        error,
        marketplaceMessage("showcase.the_product_showcase_images_could_not_be_loaded.2cb0dc")
      )
    );
  }

  const images = (
    (data || []) as ProductShowcaseImageRow[]
  ).map(mapProductShowcaseImageRow);

  return sortProductShowcaseImages(images);
}

export async function uploadProductShowcaseImage(
  input: {
    showcaseId: string;
    file: File;
  }
): Promise<ProductShowcaseImage> {
  const showcaseId = normalizeUuid(
    input.showcaseId,
    marketplaceMessage("showcase.product_showcase_id.9c2d29")
  );

  validateContentImageFile(input.file);

  const {
    data: { user },
    error: userError,
  } =
    await supabaseBrowserClient.auth.getUser();

  if (userError || !user?.id) {
    throw new Error(marketplaceMessage("showcase.you_are_not_signed_in.bd3a1b"));
  }

  const storagePath =
    buildContentImageStoragePath({
      userId: user.id,
      contentId: showcaseId,
      file: input.file,
    });

  const { error: uploadError } =
    await supabaseBrowserClient.storage
      .from(PRODUCT_SHOWCASE_IMAGE_BUCKET)
      .upload(storagePath, input.file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: input.file.type,
      });

  if (uploadError) {
    throw new Error(
      getImageErrorMessage(
        uploadError,
        marketplaceMessage("showcase.the_image_upload_failed.3c0152")
      )
    );
  }

  const { data: publicUrlData } =
    supabaseBrowserClient.storage
      .from(PRODUCT_SHOWCASE_IMAGE_BUCKET)
      .getPublicUrl(storagePath);

  const publicUrl =
    publicUrlData.publicUrl?.trim() || "";

  if (!publicUrl) {
    await removeStorageObject(storagePath);

    throw new Error(
      marketplaceMessage("showcase.the_public_image_address_could_not_be_created.14b12a")
    );
  }

  try {
    const { data, error } =
      await supabaseBrowserClient.rpc(
        "add_my_product_showcase_image_v2",
        {
          p_showcase_id: showcaseId,
          p_original_url: publicUrl,
          p_storage_path: storagePath,
          p_medium_url: null,
          p_thumb_url: null,
          p_max_images: CONTENT_IMAGE_LIMIT,
        }
      );

    if (error) {
      throw new Error(
        getImageErrorMessage(
          error,
          marketplaceMessage("showcase.the_image_could_not_be_linked_to_the.66493e")
        )
      );
    }

    const row = firstValue(
      data as
        | ProductShowcaseImageRow
        | ProductShowcaseImageRow[]
        | null
    );

    if (!row) {
      throw new Error(
        marketplaceMessage("showcase.the_database_did_not_return_the_added_image.1b1026")
      );
    }

    return mapProductShowcaseImageRow(row);
  } catch (error) {
    await removeStorageObject(storagePath);
    throw error;
  }
}

export async function setProductShowcasePrimaryImage(
  input: {
    showcaseId: string;
    imageId: string;
  }
): Promise<ProductShowcaseImage> {
  const showcaseId = normalizeUuid(
    input.showcaseId,
    marketplaceMessage("showcase.product_showcase_id.9c2d29")
  );

  const imageId = normalizeUuid(
    input.imageId,
    marketplaceMessage("showcase.image_id.8a922d")
  );

  const { data, error } =
    await supabaseBrowserClient.rpc(
      "set_my_product_showcase_primary_image_v2",
      {
        p_showcase_id: showcaseId,
        p_image_id: imageId,
      }
    );

  if (error) {
    throw new Error(
      getImageErrorMessage(
        error,
        marketplaceMessage("showcase.the_main_image_could_not_be_changed.9d1e42")
      )
    );
  }

  const row = firstValue(
    data as
      | ProductShowcaseImageRow
      | ProductShowcaseImageRow[]
      | null
  );

  if (!row) {
    throw new Error(
      marketplaceMessage("showcase.the_database_did_not_return_the_main_image.fdafc2")
    );
  }

  return mapProductShowcaseImageRow(row);
}

export async function deleteProductShowcaseImage(
  input: {
    showcaseId: string;
    imageId: string;
  }
): Promise<DeleteProductShowcaseImageResult> {
  const showcaseId = normalizeUuid(
    input.showcaseId,
    marketplaceMessage("showcase.product_showcase_id.9c2d29")
  );

  const imageId = normalizeUuid(
    input.imageId,
    marketplaceMessage("showcase.image_id.8a922d")
  );

  const { data, error } =
    await supabaseBrowserClient.rpc(
      "delete_my_product_showcase_image_v2",
      {
        p_showcase_id: showcaseId,
        p_image_id: imageId,
      }
    );

  if (error) {
    throw new Error(
      getImageErrorMessage(
        error,
        marketplaceMessage("showcase.the_image_could_not_be_deleted.9acfb9")
      )
    );
  }

  const result = firstValue(
    data as
      | DeleteProductShowcaseImageRpcResult
      | DeleteProductShowcaseImageRpcResult[]
      | null
  );

  const deletedImageId =
    result?.deleted_image_id?.trim() || "";

  if (!deletedImageId) {
    throw new Error(
      marketplaceMessage("showcase.the_database_did_not_return_the_deleted_image.9fa502")
    );
  }

  const storagePath =
    result?.storage_path?.trim() || null;

  let storageCleanupFailed = false;

  if (storagePath) {
    storageCleanupFailed =
      !(await removeStorageObject(storagePath));
  }

  const parsedRemainingCount = Number(
    result?.remaining_count ?? 0
  );

  return {
    deletedImageId,
    storagePath,
    fallbackImage:
      result?.fallback_image || null,
    remainingCount:
      Number.isFinite(parsedRemainingCount)
        ? Math.max(0, parsedRemainingCount)
        : 0,
    storageCleanupFailed,
  };
}
