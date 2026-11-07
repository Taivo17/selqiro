import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import {
  supabaseBrowserClient,
} from "../../../shared/supabase/browserClient";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DeleteRoutePayload = {
  success?: boolean;
  error?: string;
  code?: string;
  retryable?: boolean;
  requestId?: string;
  deletedShowcaseId?: string;
  title?: string | null;
  deletedImageRows?: number | null;
  storageObjectsDeleted?: number;
  alreadyDeleted?: boolean;
};

export type DeleteMyArchivedProductShowcaseResult = {
  deletedShowcaseId: string;
  title: string | null;
  deletedImageRows: number | null;
  storageObjectsDeleted: number;
  alreadyDeleted: boolean;
};

function normalizeUuid(
  value: string,
  errorMessage: string
): string {
  const cleanValue =
    value.trim().toLowerCase();

  if (!UUID_PATTERN.test(cleanValue)) {
    throw new Error(errorMessage);
  }

  return cleanValue;
}

function normalizeCount(
  value: unknown,
  fieldName: string,
  allowNull = false
): number | null {
  if (
    allowNull &&
    value === null
  ) {
    return null;
  }

  const parsedValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 0
  ) {
    throw new Error(
      marketplaceMessage("showcase.the_deletion_response_field_value_is_invalid.0063ab", { p0: String(fieldName) })
    );
  }

  return parsedValue;
}

async function readRoutePayload(
  response: Response
): Promise<DeleteRoutePayload> {
  const rawBody =
    await response.text();

  if (!rawBody) {
    throw new Error(
      marketplaceMessage("showcase.the_deletion_server_returned_no_response.53e438")
    );
  }

  let value: unknown;

  try {
    value = JSON.parse(rawBody);
  } catch {
    throw new Error(
      marketplaceMessage("showcase.the_deletion_server_returned_an_invalid_response.dc5c30")
    );
  }

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      marketplaceMessage("showcase.the_deletion_server_returned_an_invalid_response.dc5c30")
    );
  }

  return value as DeleteRoutePayload;
}

export async function
deleteMyArchivedProductShowcase(input: {
  showcaseId: string;
}): Promise<
  DeleteMyArchivedProductShowcaseResult
> {
  const showcaseId =
    normalizeUuid(
      input.showcaseId,
      marketplaceMessage("showcase.the_product_showcase_id_is_invalid.2a98a1")
    );

  const {
    data: { session },
    error: sessionError,
  } =
    await supabaseBrowserClient.auth
      .getSession();

  const accessToken =
    session?.access_token?.trim() || "";

  if (
    sessionError ||
    !accessToken
  ) {
    throw new Error(
      marketplaceMessage("showcase.sign_in_again_to_delete_the_product_showcase.693b51")
    );
  }

  let response: Response;

  try {
    response = await fetch(
      "/api/product-showcases/delete",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Accept:
            "application/json",
          Authorization:
            `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          showcaseId,
        }),
        credentials:
          "same-origin",
        cache:
          "no-store",
      }
    );
  } catch {
    throw new Error(
      marketplaceMessage("showcase.the_deletion_server_could_not_be_reached_try.90f0f7")
    );
  }

  const payload =
    await readRoutePayload(response);

  if (
    !response.ok ||
    payload.success !== true
  ) {
    throw new Error(
      typeof payload.error === "string" &&
      payload.error.trim()
        ? payload.error
        : marketplaceMessage("showcase.the_product_showcase_could_not_be_permanently_deleted.6bd5cd")
    );
  }

  const deletedShowcaseId =
    normalizeUuid(
      payload.deletedShowcaseId || "",
      marketplaceMessage("showcase.the_deletion_server_returned_an_invalid_product_showcase.6955a5")
    );

  if (
    deletedShowcaseId !==
    showcaseId
  ) {
    throw new Error(
      marketplaceMessage("showcase.the_deletion_server_returned_an_unexpected_product_showcase.0a87ed")
    );
  }

  if (
    typeof payload.alreadyDeleted !==
    "boolean"
  ) {
    throw new Error(
      marketplaceMessage("showcase.the_deletion_response_was_incomplete.714094")
    );
  }

  return {
    deletedShowcaseId,
    title:
      typeof payload.title === "string"
        ? payload.title
        : null,
    deletedImageRows:
      normalizeCount(
        payload.deletedImageRows,
        "deletedImageRows",
        true
      ),
    storageObjectsDeleted:
      normalizeCount(
        payload.storageObjectsDeleted,
        "storageObjectsDeleted"
      ) as number,
    alreadyDeleted:
      payload.alreadyDeleted,
  };
}
