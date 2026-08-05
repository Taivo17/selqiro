import {
  CONTENT_IMAGE_LIMIT,
  validateContentImageFile,
} from "../../../shared/media/imageRules";
import {
  supabaseBrowserClient,
} from "../../../shared/supabase/browserClient";
import {
  mapServiceImageRow,
  sortServiceImages,
  type ServiceImage,
  type ServiceImageRow,
} from "../model/image";

export const SERVICE_IMAGE_LIMIT =
  CONTENT_IMAGE_LIMIT;

export const SERVICE_IMAGE_BUCKET =
  "service-images";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

type DeleteServiceImageRouteResult = {
  deletedImageId?: string | null;
  storagePath?: string | null;
  fallbackImage?: string | null;
  primaryImageId?: string | null;
  remainingCount?: number | string | null;
  storageCleanupFailed?: boolean | null;
};

type DeleteServiceImageRouteResponse = {
  success?: boolean;
  error?: string | null;
  result?:
    | DeleteServiceImageRouteResult
    | null;
};

export type DeleteServiceImageResult = {
  deletedImageId: string;
  storagePath: string | null;
  fallbackImage: string | null;
  primaryImageId: string | null;
  remainingCount: number;
  storageCleanupFailed: boolean;
};

function normalizeUuid(
  value: string,
  fieldLabel: string
): string {
  const cleanValue =
    value.trim();

  if (!UUID_PATTERN.test(cleanValue)) {
    throw new Error(
      `${fieldLabel} ei ole korrektne.`
    );
  }

  return cleanValue;
}

function optionalText(
  value: string | null | undefined
): string | null {
  const cleanValue =
    (value || "").trim();

  return cleanValue || null;
}

function firstValue<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function normalizeCount(
  value:
    | number
    | string
    | null
    | undefined
): number {
  const parsedValue =
    Number(value ?? 0);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0
  ) {
    return 0;
  }

  return Math.floor(parsedValue);
}

function getImageErrorMessage(
  error: SupabaseErrorLike,
  fallback: string
): string {
  const message =
    (error.message || "")
      .toLowerCase();

  if (error.code === "42501") {
    if (
      message.includes(
        "authentication"
      )
    ) {
      return (
        "Teenuse piltide muutmiseks " +
        "logi sisse."
      );
    }

    return (
      "Sul ei ole õigust selle " +
      "teenuse pilte aktiivse " +
      "identiteediga muuta."
    );
  }

  if (
    message.includes(
      "only while the service is a draft"
    ) ||
    (
      message.includes("draft") &&
      message.includes("service image")
    )
  ) {
    return (
      "Teenuse pilte saab muuta " +
      "ainult mustandteenusel."
    );
  }

  if (
    message.includes(
      "at most 10 images"
    ) ||
    message.includes(
      "ten-image"
    )
  ) {
    return (
      `Teenusele saab lisada kuni ` +
      `${SERVICE_IMAGE_LIMIT} pilti.`
    );
  }

  if (
    message.includes(
      "storage path"
    )
  ) {
    return (
      "Teenuse pildi salvestustee " +
      "ei ole korrektne."
    );
  }

  if (
    message.includes(
      "not found"
    ) ||
    message.includes(
      "does not exist"
    )
  ) {
    return (
      "Teenust või teenuse pilti " +
      "ei leitud."
    );
  }

  return (
    error.message ||
    fallback
  );
}

const APPLE_HIGH_EFFICIENCY_IMAGE_TYPES =
  new Set([
    "image/heic",
    "image/heif",
    "image/heic-sequence",
    "image/heif-sequence",
  ]);

const STANDARD_IMAGE_TYPE_BY_EXTENSION:
  Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

function fileExtension(
  fileName: string
): string {
  return (
    fileName
      .split(".")
      .pop()
      ?.trim()
      .toLowerCase() || ""
  );
}

function isAppleHighEfficiencyImage(
  file: File
): boolean {
  const type =
    file.type
      .trim()
      .toLowerCase();

  const extension =
    fileExtension(
      file.name
    );

  return (
    APPLE_HIGH_EFFICIENCY_IMAGE_TYPES
      .has(type) ||
    extension === "heic" ||
    extension === "heif"
  );
}

function withKnownStandardImageType(
  file: File
): File {
  const extension =
    fileExtension(
      file.name
    );

  const inferredType =
    STANDARD_IMAGE_TYPE_BY_EXTENSION[
      extension
    ];

  if (
    !inferredType ||
    file.type === inferredType
  ) {
    return file;
  }

  return new File(
    [
      file,
    ],
    file.name,
    {
      type:
        inferredType,
      lastModified:
        file.lastModified,
    }
  );
}

function imageFileBaseName(
  fileName: string
): string {
  const withoutExtension =
    fileName.replace(
      /\.[^/.]+$/,
      ""
    );

  const cleanName =
    withoutExtension
      .trim()
      .replace(
        /[^a-zA-Z0-9_-]+/g,
        "-"
      )
      .replace(
        /^[-_]+|[-_]+$/g,
        ""
      );

  return (
    cleanName ||
    `mobile-photo-${Date.now()}`
  );
}

async function loadBrowserImage(
  file: File
): Promise<{
  image: HTMLImageElement;
  objectUrl: string;
}> {
  const objectUrl =
    URL.createObjectURL(
      file
    );

  const image =
    new Image();

  try {
    await new Promise<void>(
      (
        resolve,
        reject
      ) => {
        image.onload =
          () => resolve();

        image.onerror =
          () => {
            reject(
              new Error(
                "Apple'i pildifaili ei saanud brauseris avada."
              )
            );
          };

        image.src =
          objectUrl;
      }
    );

    return {
      image,
      objectUrl,
    };
  } catch (error) {
    URL.revokeObjectURL(
      objectUrl
    );

    throw error;
  }
}

async function canvasToJpegBlob(
  canvas: HTMLCanvasElement
): Promise<Blob> {
  const blob =
    await new Promise<
      Blob | null
    >((resolve) => {
      canvas.toBlob(
        resolve,
        "image/jpeg",
        0.88
      );
    });

  if (!blob) {
    throw new Error(
      "Apple'i pildifaili JPG-ks teisendamine ebaõnnestus."
    );
  }

  return blob;
}

async function convertAppleImageToJpeg(
  file: File
): Promise<File> {
  const {
    image,
    objectUrl,
  } =
    await loadBrowserImage(
      file
    );

  try {
    const sourceWidth =
      image.naturalWidth;

    const sourceHeight =
      image.naturalHeight;

    if (
      !sourceWidth ||
      !sourceHeight
    ) {
      throw new Error(
        "Apple'i pildifaili mõõtmeid ei saanud lugeda."
      );
    }

    /*
     * Suure eraldusvõimega telefoni HEIC/HEIF-fotod võivad
     * mobiilibrauseri mälu kiiresti täita. Teenuse
     * veebipildi jaoks piisab 3200 px pikemast küljest.
     */
    const maximumDimension =
      3200;

    const scale =
      Math.min(
        1,
        maximumDimension /
          Math.max(
            sourceWidth,
            sourceHeight
          )
      );

    const targetWidth =
      Math.max(
        1,
        Math.round(
          sourceWidth *
          scale
        )
      );

    const targetHeight =
      Math.max(
        1,
        Math.round(
          sourceHeight *
          scale
        )
      );

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      targetWidth;

    canvas.height =
      targetHeight;

    const context =
      canvas.getContext(
        "2d"
      );

    if (!context) {
      throw new Error(
        "Brauser ei võimalda pildi teisendamist."
      );
    }

    context.drawImage(
      image,
      0,
      0,
      targetWidth,
      targetHeight
    );

    const blob =
      await canvasToJpegBlob(
        canvas
      );

    return new File(
      [
        blob,
      ],
      `${imageFileBaseName(
        file.name
      )}.jpg`,
      {
        type:
          "image/jpeg",
        lastModified:
          file.lastModified ||
          Date.now(),
      }
    );
  } finally {
    URL.revokeObjectURL(
      objectUrl
    );
  }
}

async function prepareServiceImageFile(
  file: File
): Promise<File> {
  if (
    isAppleHighEfficiencyImage(
      file
    )
  ) {
    try {
      return await convertAppleImageToJpeg(
        file
      );
    } catch (error) {
      const detail =
        error instanceof Error &&
        error.message
          ? ` ${error.message}`
          : "";

      throw new Error(
        `HEIC/HEIF pilti ei saanud brauseris JPG-ks teisendada.${detail} ` +
        "Proovi telefoni kaamera seadetes kasutada JPEG/JPG vormingut või vali JPG/PNG/WEBP fail."
      );
    }
  }

  return withKnownStandardImageType(
    file
  );
}

function extensionFromFile(
  file: File
): string {
  const fromName =
    fileExtension(
      file.name
    );

  if (
    [
      "jpg",
      "jpeg",
      "png",
      "webp",
    ].includes(
      fromName
    )
  ) {
    return fromName === "jpeg"
      ? "jpg"
      : fromName;
  }

  if (
    file.type === "image/png"
  ) {
    return "png";
  }

  if (
    file.type === "image/webp"
  ) {
    return "webp";
  }

  return "jpg";
}

function buildServiceImageStoragePath(
  input: {
    userId: string;
    serviceId: string;
    file: File;
  }
): string {
  const extension =
    extensionFromFile(input.file);

  const randomPart =
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
      ? crypto.randomUUID()
      : (
          `${Date.now()}-` +
          Math.random()
            .toString(16)
            .slice(2)
        );

  return (
    `${input.userId}/` +
    `${input.serviceId}/` +
    `${Date.now()}-` +
    `${randomPart}.` +
    extension
  );
}

async function removeUploadedFile(
  storagePath: string
): Promise<boolean> {
  const { error } =
    await supabaseBrowserClient
      .storage
      .from(
        SERVICE_IMAGE_BUCKET
      )
      .remove([
        storagePath,
      ]);

  if (error) {
    console.warn(
      "Teenusepildi üleslaadimise " +
      "kompensatsioon ebaõnnestus:",
      error.message
    );

    return false;
  }

  return true;
}

export async function getServiceImages(
  serviceId: string
): Promise<ServiceImage[]> {
  const cleanServiceId =
    normalizeUuid(
      serviceId,
      "Teenuse ID"
    );

  const { data, error } =
    await supabaseBrowserClient
      .from("service_images")
      .select(
        [
          "id",
          "service_id",
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
      .eq(
        "service_id",
        cleanServiceId
      )
      .order(
        "is_primary",
        {
          ascending: false,
        }
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
      .order(
        "id",
        {
          ascending: true,
        }
      );

  if (error) {
    throw new Error(
      getImageErrorMessage(
        error,
        "Teenuse pilte ei saanud laadida."
      )
    );
  }

  const images = (
    (data || []) as
      ServiceImageRow[]
  ).map(mapServiceImageRow);

  return sortServiceImages(
    images
  );
}

export async function uploadServiceImage(
  input: {
    serviceId: string;
    file: File;
  }
): Promise<ServiceImage> {
  const serviceId =
    normalizeUuid(
      input.serviceId,
      "Teenuse ID"
    );

  const preparedFile =
    await prepareServiceImageFile(
      input.file
    );

  validateContentImageFile(
    preparedFile
  );

  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabaseBrowserClient
      .auth
      .getUser();

  if (
    userError ||
    !user?.id
  ) {
    throw new Error(
      "Teenuse pildi lisamiseks logi sisse."
    );
  }

  const storagePath =
    buildServiceImageStoragePath({
      userId: user.id,
      serviceId,
      file: preparedFile,
    });

  const { error: uploadError } =
    await supabaseBrowserClient
      .storage
      .from(
        SERVICE_IMAGE_BUCKET
      )
      .upload(
        storagePath,
        preparedFile,
        {
          cacheControl:
            "31536000",
          upsert: false,
          contentType:
            preparedFile.type,
        }
      );

  if (uploadError) {
    throw new Error(
      getImageErrorMessage(
        uploadError,
        "Teenuse pildi üleslaadimine ebaõnnestus."
      )
    );
  }

  const {
    data: publicUrlData,
  } =
    supabaseBrowserClient
      .storage
      .from(
        SERVICE_IMAGE_BUCKET
      )
      .getPublicUrl(
        storagePath
      );

  const publicUrl =
    publicUrlData
      .publicUrl
      ?.trim() || "";

  if (!publicUrl) {
    await removeUploadedFile(
      storagePath
    );

    throw new Error(
      "Teenuse pildi avalikku aadressi ei saanud luua."
    );
  }

  let databaseRegistered =
    false;

  try {
    const { data, error } =
      await supabaseBrowserClient.rpc(
        "add_my_service_image_v2",
        {
          p_service_id:
            serviceId,
          p_original_url:
            publicUrl,
          p_storage_path:
            storagePath,
          p_medium_url:
            null,
          p_thumb_url:
            null,
        }
      );

    if (error) {
      throw new Error(
        getImageErrorMessage(
          error,
          "Teenuse pilti ei saanud registreerida."
        )
      );
    }

    databaseRegistered = true;

    const row = firstValue(
      data as
        | ServiceImageRow
        | ServiceImageRow[]
        | null
    );

    if (!row) {
      throw new Error(
        "Andmebaas ei tagastanud lisatud teenusepilti."
      );
    }

    const image =
      mapServiceImageRow(
        row
      );

    if (
      image.serviceId !==
        serviceId ||
      image.uploadedByUserId !==
        user.id ||
      image.storagePath !==
        storagePath
    ) {
      throw new Error(
        "Andmebaas tagastas ootamatu teenusepildi."
      );
    }

    return image;
  } catch (error) {
    /*
     * Pärast edukat RPC commit'i ei tohi
     * Storage'i objekti enam kompenseerivalt
     * kustutada. Vastasel juhul jääks
     * andmebaasirida puuduvale failile viitama.
     */
    if (!databaseRegistered) {
      await removeUploadedFile(
        storagePath
      );
    }

    throw error;
  }
}

export async function setServicePrimaryImage(
  input: {
    serviceId: string;
    imageId: string;
  }
): Promise<ServiceImage> {
  const serviceId =
    normalizeUuid(
      input.serviceId,
      "Teenuse ID"
    );

  const imageId =
    normalizeUuid(
      input.imageId,
      "Teenusepildi ID"
    );

  const { data, error } =
    await supabaseBrowserClient.rpc(
      "set_my_service_primary_image_v2",
      {
        p_service_id:
          serviceId,
        p_image_id:
          imageId,
      }
    );

  if (error) {
    throw new Error(
      getImageErrorMessage(
        error,
        "Teenuse põhipilti ei saanud muuta."
      )
    );
  }

  const row = firstValue(
    data as
      | ServiceImageRow
      | ServiceImageRow[]
      | null
  );

  if (!row) {
    throw new Error(
      "Andmebaas ei tagastanud muudetud teenusepilti."
    );
  }

  const image =
    mapServiceImageRow(
      row
    );

  if (
    image.serviceId !==
      serviceId ||
    image.id !==
      imageId ||
    !image.isPrimary ||
    image.sortOrder !== 0
  ) {
    throw new Error(
      "Andmebaas tagastas ootamatu põhipildi."
    );
  }

  return image;
}

export async function deleteServiceImage(
  input: {
    serviceId: string;
    imageId: string;
  }
): Promise<DeleteServiceImageResult> {
  const serviceId =
    normalizeUuid(
      input.serviceId,
      "Teenuse ID"
    );

  const imageId =
    normalizeUuid(
      input.imageId,
      "Teenusepildi ID"
    );

  const {
    data: {
      session,
    },
    error: sessionError,
  } =
    await supabaseBrowserClient
      .auth
      .getSession();

  const accessToken =
    session
      ?.access_token
      ?.trim() || "";

  if (
    sessionError ||
    !accessToken
  ) {
    throw new Error(
      "Teenuse pildi kustutamiseks logi sisse."
    );
  }

  const response =
    await fetch(
      "/api/v2/service-images/delete",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          serviceId,
          imageId,
        }),
      }
    );

  let payload:
    | DeleteServiceImageRouteResponse
    | null = null;

  try {
    payload =
      await response.json() as
        DeleteServiceImageRouteResponse;
  } catch {
    payload = null;
  }

  if (
    !response.ok ||
    payload?.success !== true ||
    !payload.result
  ) {
    throw new Error(
      payload?.error ||
      "Teenuse pilti ei saanud kustutada."
    );
  }

  const result =
    payload.result;

  const deletedImageId =
    normalizeUuid(
      result.deletedImageId || "",
      "Kustutatud teenusepildi ID"
    );

  if (
    deletedImageId !==
    imageId
  ) {
    throw new Error(
      "Server tagastas ootamatu kustutatud teenusepildi."
    );
  }

  return {
    deletedImageId,
    storagePath:
      optionalText(
        result.storagePath
      ),
    fallbackImage:
      optionalText(
        result.fallbackImage
      ),
    primaryImageId:
      optionalText(
        result.primaryImageId
      ),
    remainingCount:
      normalizeCount(
        result.remainingCount
      ),
    storageCleanupFailed:
      result.storageCleanupFailed ===
      true,
  };
}
