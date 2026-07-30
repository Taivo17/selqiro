import {
  deleteArchivedProductShowcase,
  ProductShowcaseDeletionError,
} from "../../../../src/server/product-showcase/deleteArchivedProductShowcase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeleteRequestBody = {
  showcaseId?: unknown;
};

function jsonResponse(
  body: Record<string, unknown>,
  status: number
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control":
        "no-store, max-age=0",
    },
  });
}

function getBearerToken(
  request: Request
): string {
  const authorization =
    request.headers
      .get("authorization")
      ?.trim() || "";

  const match =
    /^Bearer\s+(.+)$/i.exec(
      authorization
    );

  const token =
    match?.[1]?.trim() || "";

  if (!token) {
    throw new ProductShowcaseDeletionError({
      message:
        "Tootenäidise kustutamiseks logi sisse.",
      status: 401,
      code: "unauthorized",
      retryable: false,
    });
  }

  return token;
}

async function getRequestBody(
  request: Request
): Promise<DeleteRequestBody> {
  let value: unknown;

  try {
    value = await request.json();
  } catch {
    throw new ProductShowcaseDeletionError({
      message:
        "Kustutamistaotluse sisu ei ole korrektne.",
      status: 400,
      code: "invalid_json",
      retryable: false,
    });
  }

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new ProductShowcaseDeletionError({
      message:
        "Kustutamistaotluse sisu ei ole korrektne.",
      status: 400,
      code: "invalid_request_body",
      retryable: false,
    });
  }

  return value as DeleteRequestBody;
}

function resolveRouteError(
  error: unknown
): ProductShowcaseDeletionError {
  if (
    error instanceof
    ProductShowcaseDeletionError
  ) {
    return error;
  }

  return new ProductShowcaseDeletionError({
    message:
      "Tootenäidist ei saanud praegu jäädavalt kustutada.",
    status: 500,
    code: "unexpected_server_error",
    retryable: true,
    internalMessage:
      error instanceof Error
        ? error.message
        : String(error),
  });
}

export async function POST(
  request: Request
) {
  const requestId =
    crypto.randomUUID();

  try {
    const accessToken =
      getBearerToken(request);

    const body =
      await getRequestBody(request);

    if (
      typeof body.showcaseId !==
      "string"
    ) {
      throw new ProductShowcaseDeletionError({
        message:
          "Tootenäidise ID puudub.",
        status: 400,
        code: "showcase_id_missing",
        retryable: false,
      });
    }

    const result =
      await deleteArchivedProductShowcase({
        accessToken,
        showcaseId:
          body.showcaseId,
      });

    return jsonResponse(
      {
        success: true,
        requestId,
        deletedShowcaseId:
          result.deletedShowcaseId,
        title: result.title,
        deletedImageRows:
          result.deletedImageRows,
        storageObjectsDeleted:
          result.storageObjectsDeleted,
        alreadyDeleted:
          result.alreadyDeleted,
      },
      200
    );
  } catch (error) {
    const resolvedError =
      resolveRouteError(error);

    if (
      resolvedError.status >= 500
    ) {
      console.error(
        "Product showcase permanent deletion failed.",
        {
          requestId,
          code: resolvedError.code,
          internalMessage:
            resolvedError.internalMessage,
        }
      );
    }

    return jsonResponse(
      {
        success: false,
        requestId,
        error:
          resolvedError.message,
        code:
          resolvedError.code,
        retryable:
          resolvedError.retryable,
      },
      resolvedError.status
    );
  }
}
