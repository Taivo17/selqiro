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
      `${fieldLabel} ei ole korrektne.`
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
      return "Toimingu tegemiseks logi sisse.";
    }

    return (
      "Sul ei ole õigust selle tootenäidise " +
      "pilte aktiivse identiteediga muuta."
    );
  }

  if (
    message.includes("at most 10") ||
    message.includes("max_images")
  ) {
    return (
      `Tootenäidisele saab lisada kuni ` +
      `${CONTENT_IMAGE_LIMIT} pilti.`
    );
  }

  if (
    message.includes("must keep at least one image")
  ) {
    return (
      "Avaldatud tootenäidise viimast pilti " +
      "ei saa kustutada."
    );
  }

  if (
    message.includes(
      "must contain at least one image"
    )
  ) {
    return (
      "Enne avaldamist lisa tootenäidisele " +
      "vähemalt üks pilt."
    );
  }

  if (
    message.includes("does not belong") ||
    message.includes("active identity")
  ) {
    return (
      "See tootenäidis ei kuulu aktiivsele " +
      "identiteedile."
    );
  }

  if (
    message.includes("image was not found") ||
    message.includes("image was not found in storage")
  ) {
    return "Tootenäidise pilti ei leitud.";
  }

  if (message.includes("storage path")) {
    return "Pildi salvestustee ei ole korrektne.";
  }

  return error.message || fallback;
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
    "Tootenäidise ID"
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
        "Tootenäidise pilte ei saanud laadida."
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
    "Tootenäidise ID"
  );

  validateContentImageFile(input.file);

  const {
    data: { user },
    error: userError,
  } =
    await supabaseBrowserClient.auth.getUser();

  if (userError || !user?.id) {
    throw new Error("Sisselogimine puudub.");
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
        "Pildi üleslaadimine ebaõnnestus."
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
      "Pildi avalikku aadressi ei saanud luua."
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
          "Pilti ei saanud tootenäidisega siduda."
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
        "Andmebaas ei tagastanud lisatud pilti."
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
    "Tootenäidise ID"
  );

  const imageId = normalizeUuid(
    input.imageId,
    "Pildi ID"
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
        "Põhipilti ei saanud muuta."
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
      "Andmebaas ei tagastanud põhipilti."
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
    "Tootenäidise ID"
  );

  const imageId = normalizeUuid(
    input.imageId,
    "Pildi ID"
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
        "Pilti ei saanud kustutada."
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
      "Andmebaas ei tagastanud kustutatud pilti."
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
