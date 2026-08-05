import {
  NextResponse,
} from "next/server";
import {
  createClient,
} from "@supabase/supabase-js";

export const runtime =
  "nodejs";

const SERVICE_IMAGE_BUCKET =
  "service-images";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DeleteRequestBody = {
  serviceId?: unknown;
  imageId?: unknown;
};

type DeleteServiceImageRpcResult = {
  deleted_image_id?: string | null;
  storage_path?: string | null;
  fallback_image?: string | null;
  primary_image_id?: string | null;
  remaining_count?:
    | number
    | string
    | null;
};

function cleanText(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
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

function errorResponse(
  status: number,
  error: string
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    {
      status,
    }
  );
}

function getBearerToken(
  request: Request
): string {
  const authorization =
    request.headers
      .get("authorization")
      ?.trim() || "";

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return "";
  }

  return authorization
    .slice(7)
    .trim();
}

function getRpcErrorResponse(
  error: {
    code?: string | null;
    message?: string | null;
  }
) {
  const message =
    (error.message || "")
      .toLowerCase();

  if (
    error.code === "42501"
  ) {
    if (
      message.includes(
        "authentication"
      )
    ) {
      return errorResponse(
        401,
        "Teenuse pildi kustutamiseks logi sisse."
      );
    }

    return errorResponse(
      403,
      "Sul ei ole õigust selle teenuse pilti kustutada."
    );
  }

  if (
    error.code === "22023"
  ) {
    if (
      message.includes(
        "only while the service is a draft"
      ) ||
      (
        message.includes("draft") &&
        message.includes("service image")
      )
    ) {
      return errorResponse(
        400,
        "Teenuse pilte saab muuta ainult mustandteenusel."
      );
    }

    if (
      message.includes(
        "not found"
      )
    ) {
      return errorResponse(
        404,
        "Teenuse pilti ei leitud."
      );
    }

    return errorResponse(
      400,
      "Teenuse pildi andmed ei ole korrektsed."
    );
  }

  console.error(
    "delete_my_service_image_v2 failed:",
    error
  );

  return errorResponse(
    500,
    "Teenuse pilti ei saanud kustutada."
  );
}

function isSafeStoragePath(
  storagePath: string,
  serviceId: string
): boolean {
  if (
    !storagePath ||
    storagePath.startsWith("/") ||
    storagePath.includes("\\") ||
    storagePath.includes("..") ||
    storagePath.includes("//")
  ) {
    return false;
  }

  const parts =
    storagePath.split("/");

  return (
    parts.length >= 3 &&
    UUID_PATTERN.test(
      parts[0] || ""
    ) &&
    parts[1] === serviceId &&
    Boolean(
      parts
        .slice(2)
        .join("/")
        .trim()
    )
  );
}

export async function POST(
  request: Request
) {
  try {
    const token =
      getBearerToken(
        request
      );

    if (!token) {
      return errorResponse(
        401,
        "Teenuse pildi kustutamiseks logi sisse."
      );
    }

    let body:
      | DeleteRequestBody
      | null = null;

    try {
      body =
        await request.json() as
          DeleteRequestBody;
    } catch {
      return errorResponse(
        400,
        "Päringu sisu ei ole korrektne."
      );
    }

    const serviceId =
      cleanText(
        body?.serviceId
      );

    const imageId =
      cleanText(
        body?.imageId
      );

    if (
      !UUID_PATTERN.test(
        serviceId
      ) ||
      !UUID_PATTERN.test(
        imageId
      )
    ) {
      return errorResponse(
        400,
        "Teenuse või teenusepildi ID ei ole korrektne."
      );
    }

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL
        ?.trim() || "";

    const anonKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY
        ?.trim() || "";

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY
        ?.trim() || "";

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      console.error(
        "Service image delete route environment is incomplete."
      );

      return errorResponse(
        500,
        "Teenuse pildi serveriseadistus puudub."
      );
    }

    const adminClient =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );

    const {
      data: {
        user,
      },
      error: authError,
    } =
      await adminClient
        .auth
        .getUser(
          token
        );

    if (
      authError ||
      !user?.id
    ) {
      return errorResponse(
        401,
        "Sisselogimise sessioon ei ole kehtiv."
      );
    }

    const userClient =
      createClient(
        supabaseUrl,
        anonKey,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );

    const {
      data,
      error,
    } =
      await userClient.rpc(
        "delete_my_service_image_v2",
        {
          p_service_id:
            serviceId,
          p_image_id:
            imageId,
        }
      );

    if (error) {
      return getRpcErrorResponse(
        error
      );
    }

    const result =
      firstValue(
        data as
          | DeleteServiceImageRpcResult
          | DeleteServiceImageRpcResult[]
          | null
      );

    if (!result) {
      return errorResponse(
        500,
        "Andmebaas ei tagastanud kustutamise tulemust."
      );
    }

    const deletedImageId =
      cleanText(
        result.deleted_image_id
      );

    if (
      deletedImageId !==
      imageId
    ) {
      console.error(
        "Service image delete RPC returned an unexpected image ID.",
        {
          expected: imageId,
          received:
            deletedImageId,
        }
      );

      return errorResponse(
        500,
        "Andmebaas tagastas ootamatu teenusepildi."
      );
    }

    const storagePath =
      cleanText(
        result.storage_path
      );

    let storageCleanupFailed =
      false;

    if (storagePath) {
      if (
        !isSafeStoragePath(
          storagePath,
          serviceId
        )
      ) {
        storageCleanupFailed =
          true;

        console.error(
          "Service image delete RPC returned an unsafe Storage path.",
          {
            serviceId,
            imageId,
            storagePath,
          }
        );
      } else {
        const {
          error:
            storageDeleteError,
        } =
          await adminClient
            .storage
            .from(
              SERVICE_IMAGE_BUCKET
            )
            .remove([
              storagePath,
            ]);

        if (storageDeleteError) {
          storageCleanupFailed =
            true;

          console.error(
            "Service image Storage cleanup failed:",
            storageDeleteError.message
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      result: {
        deletedImageId,
        storagePath:
          storagePath || null,
        fallbackImage:
          cleanText(
            result.fallback_image
          ) || null,
        primaryImageId:
          cleanText(
            result.primary_image_id
          ) || null,
        remainingCount:
          normalizeCount(
            result.remaining_count
          ),
        storageCleanupFailed,
      },
    });
  } catch (error) {
    console.error(
      "Unexpected service image delete route error:",
      error
    );

    return errorResponse(
      500,
      "Teenuse pilti ei saanud kustutada."
    );
  }
}
