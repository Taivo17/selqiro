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
      `Kustutamise serverivastuse väli ${fieldName} ei ole korrektne.`
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
      "Kustutamise server ei tagastanud vastust."
    );
  }

  let value: unknown;

  try {
    value = JSON.parse(rawBody);
  } catch {
    throw new Error(
      "Kustutamise serverivastus ei olnud korrektne."
    );
  }

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Kustutamise serverivastus ei olnud korrektne."
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
      "Tootenäidise ID ei ole korrektne."
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
      "Tootenäidise kustutamiseks logi uuesti sisse."
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
      "Kustutamise serveriga ei saanud ühendust. Proovi uuesti."
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
        : "Tootenäidist ei saanud jäädavalt kustutada."
    );
  }

  const deletedShowcaseId =
    normalizeUuid(
      payload.deletedShowcaseId || "",
      "Kustutamise server tagastas vigase tootenäidise ID."
    );

  if (
    deletedShowcaseId !==
    showcaseId
  ) {
    throw new Error(
      "Kustutamise server tagastas ootamatu tootenäidise."
    );
  }

  if (
    typeof payload.alreadyDeleted !==
    "boolean"
  ) {
    throw new Error(
      "Kustutamise serverivastus ei olnud täielik."
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
