import {
  createClient,
} from "@supabase/supabase-js";

const PRODUCT_SHOWCASE_IMAGE_BUCKET =
  "product-showcase-images";

const STORAGE_REMOVE_BATCH_SIZE = 100;
const MAX_STORAGE_PATHS = 5000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

type SupabaseOperationError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

type PreparedDeletionManifest = {
  showcaseId: string;
  title: string | null;
  deletionToken: string;
  storagePaths: string[];
};

export type DeleteArchivedProductShowcaseResult = {
  deletedShowcaseId: string;
  title: string | null;
  deletedImageRows: number | null;
  storageObjectsDeleted: number;
  alreadyDeleted: boolean;
};

export class ProductShowcaseDeletionError
  extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly internalMessage: string | null;

  constructor(input: {
    message: string;
    status: number;
    code: string;
    retryable?: boolean;
    internalMessage?: string | null;
  }) {
    super(input.message);

    this.name =
      "ProductShowcaseDeletionError";

    this.status = input.status;
    this.code = input.code;
    this.retryable =
      input.retryable === true;

    this.internalMessage =
      input.internalMessage || null;
  }
}

function requiredEnvironmentVariable(
  name: string
): string {
  const value =
    process.env[name]?.trim() || "";

  if (!value) {
    throw new ProductShowcaseDeletionError({
      message:
        "Tootenäidise kustutamise serveriseadistus puudub.",
      status: 500,
      code: "server_configuration_missing",
      retryable: false,
      internalMessage:
        `Missing environment variable: ${name}`,
    });
  }

  return value;
}

function createAdminClient() {
  return createClient(
    requiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_URL"
    ),
    requiredEnvironmentVariable(
      "SUPABASE_SERVICE_ROLE_KEY"
    ),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

function createUserScopedClient(
  accessToken: string
) {
  return createClient(
    requiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_URL"
    ),
    requiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    ),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    }
  );
}

type ServerSupabaseClient =
  ReturnType<typeof createAdminClient>;

function normalizeUuid(
  value: string,
  message: string
): string {
  const cleanValue =
    value.trim().toLowerCase();

  if (!UUID_PATTERN.test(cleanValue)) {
    throw new ProductShowcaseDeletionError({
      message,
      status: 400,
      code: "invalid_showcase_id",
      retryable: false,
    });
  }

  return cleanValue;
}

function invalidServerResponse(
  internalMessage: string
): ProductShowcaseDeletionError {
  return new ProductShowcaseDeletionError({
    message:
      "Kustutamise serverivastus ei olnud korrektne.",
    status: 500,
    code: "invalid_server_response",
    retryable: true,
    internalMessage,
  });
}

function asRpcRecord(
  input: unknown
): JsonRecord {
  let value = input;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw invalidServerResponse(
        "RPC returned invalid JSON text."
      );
    }
  }

  if (Array.isArray(value)) {
    value = value[0] ?? null;
  }

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw invalidServerResponse(
      "RPC did not return a JSON object."
    );
  }

  return value as JsonRecord;
}

function normalizeNonNegativeInteger(
  value: unknown,
  fieldName: string
): number {
  const parsedValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 0
  ) {
    throw invalidServerResponse(
      `${fieldName} is not a non-negative integer.`
    );
  }

  return parsedValue;
}

function normalizeStoragePaths(
  value: unknown,
  showcaseId: string
): string[] {
  if (!Array.isArray(value)) {
    throw invalidServerResponse(
      "storage_paths is not an array."
    );
  }

  const uniquePaths =
    new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      throw invalidServerResponse(
        "Storage manifest contains a non-string path."
      );
    }

    const storagePath = item;

    if (
      !storagePath ||
      storagePath !== storagePath.trim() ||
      storagePath.length > 1000 ||
      storagePath.startsWith("/") ||
      storagePath.includes("\\") ||
      storagePath.includes("\0")
    ) {
      throw invalidServerResponse(
        "Storage manifest contains an invalid path."
      );
    }

    const parts =
      storagePath.split("/");

    if (
      parts.length < 3 ||
      parts[1] !== showcaseId ||
      parts.some(
        (part) =>
          !part ||
          part === "." ||
          part === ".."
      )
    ) {
      throw invalidServerResponse(
        "Storage manifest path is outside the expected showcase folder."
      );
    }

    uniquePaths.add(storagePath);

    if (
      uniquePaths.size >
      MAX_STORAGE_PATHS
    ) {
      throw new ProductShowcaseDeletionError({
        message:
          "Tootenäidise failide arv on automaatseks kustutamiseks liiga suur. Võta ühendust Selqiro toega.",
        status: 409,
        code: "storage_manifest_too_large",
        retryable: false,
        internalMessage:
          `Storage manifest exceeded ${MAX_STORAGE_PATHS} objects.`,
      });
    }
  }

  return [...uniquePaths];
}

function parsePreparedManifest(
  value: unknown,
  expectedShowcaseId: string
): PreparedDeletionManifest {
  const record = asRpcRecord(value);

  const showcaseId = normalizeUuid(
    String(
      record.showcase_id || ""
    ),
    "Kustutamise manifesti tootenäidise ID ei ole korrektne."
  );

  if (
    showcaseId !==
    expectedShowcaseId
  ) {
    throw invalidServerResponse(
      "Preparation RPC returned a different showcase ID."
    );
  }

  const deletionToken =
    normalizeUuid(
      String(
        record.deletion_token || ""
      ),
      "Kustutamise token ei ole korrektne."
    );

  const storagePaths =
    normalizeStoragePaths(
      record.storage_paths,
      expectedShowcaseId
    );

  if (
    record.storage_object_count !==
      undefined &&
    record.storage_object_count !== null
  ) {
    const expectedCount =
      normalizeNonNegativeInteger(
        record.storage_object_count,
        "storage_object_count"
      );

    if (
      expectedCount !==
      storagePaths.length
    ) {
      throw invalidServerResponse(
        "Storage manifest count does not match its path list."
      );
    }
  }

  return {
    showcaseId,
    deletionToken,
    storagePaths,
    title:
      typeof record.title === "string"
        ? record.title
        : null,
  };
}

function parseDeletedResult(
  value: unknown,
  expectedShowcaseId: string,
  fallbackTitle: string | null
): {
  deletedShowcaseId: string;
  title: string | null;
  deletedImageRows: number;
} {
  const record = asRpcRecord(value);

  const deletedShowcaseId =
    normalizeUuid(
      String(
        record.deleted_showcase_id || ""
      ),
      "Kustutatud tootenäidise ID ei ole korrektne."
    );

  if (
    deletedShowcaseId !==
    expectedShowcaseId
  ) {
    throw invalidServerResponse(
      "Final deletion RPC returned a different showcase ID."
    );
  }

  return {
    deletedShowcaseId,
    title:
      typeof record.title === "string"
        ? record.title
        : fallbackTitle,
    deletedImageRows:
      normalizeNonNegativeInteger(
        record.deleted_image_rows,
        "deleted_image_rows"
      ),
  };
}

function normalizeOperationError(
  error: unknown
): SupabaseOperationError {
  if (
    error &&
    typeof error === "object"
  ) {
    return error as
      SupabaseOperationError;
  }

  return {
    message: String(error || ""),
  };
}

function mapRpcError(
  error: unknown,
  phase: "prepare" | "finalize"
): ProductShowcaseDeletionError {
  const operationError =
    normalizeOperationError(error);

  const code =
    operationError.code || "";

  const rawMessage =
    operationError.message || "";

  const message =
    rawMessage.toLowerCase();

  const internalMessage = [
    `phase=${phase}`,
    `code=${code || "unknown"}`,
    `message=${rawMessage || "unknown"}`,
  ].join(" ");

  if (code === "42501") {
    return new ProductShowcaseDeletionError({
      message:
        phase === "prepare"
          ? "See tootenäidis ei kuulu aktiivsele identiteedile."
          : "Tootenäidise kustutamist ei saanud aktiivse identiteediga lõpetada.",
      status: 403,
      code: "showcase_access_denied",
      retryable: false,
      internalMessage,
    });
  }

  if (code === "22023") {
    if (
      message.includes(
        "only an archived"
      )
    ) {
      return new ProductShowcaseDeletionError({
        message:
          "Tootenäidis tuleb enne jäädavat kustutamist arhiveerida.",
        status: 409,
        code: "showcase_not_archived",
        retryable: false,
        internalMessage,
      });
    }

    if (
      message.includes(
        "active identity"
      )
    ) {
      return new ProductShowcaseDeletionError({
        message:
          "Aktiivne identiteet puudub või ei ole enam kasutatav.",
        status: 409,
        code: "active_identity_missing",
        retryable: false,
        internalMessage,
      });
    }

    return new ProductShowcaseDeletionError({
      message:
        "Tootenäidise kustutamise andmed ei ole korrektsed.",
      status: 400,
      code: "invalid_deletion_input",
      retryable: false,
      internalMessage,
    });
  }

  if (code === "40001") {
    return new ProductShowcaseDeletionError({
      message:
        "Tootenäidise kustutamise olek muutus. Proovi uuesti.",
      status: 409,
      code: "deletion_state_changed",
      retryable: true,
      internalMessage,
    });
  }

  if (code === "55000") {
    return new ProductShowcaseDeletionError({
      message:
        "Tootenäidise kustutamine jäi pooleli. Proovi kustutamist uuesti.",
      status: 409,
      code: "deletion_incomplete",
      retryable: true,
      internalMessage,
    });
  }

  return new ProductShowcaseDeletionError({
    message:
      "Tootenäidist ei saanud praegu jäädavalt kustutada.",
    status: 500,
    code:
      phase === "prepare"
        ? "deletion_prepare_failed"
        : "deletion_finalize_failed",
    retryable: true,
    internalMessage,
  });
}

async function authenticateAccessToken(
  adminClient: ServerSupabaseClient,
  accessToken: string
): Promise<void> {
  const {
    data: { user },
    error,
  } =
    await adminClient.auth.getUser(
      accessToken
    );

  if (error || !user) {
    throw new ProductShowcaseDeletionError({
      message:
        "Tootenäidise kustutamiseks logi uuesti sisse.",
      status: 401,
      code: "unauthorized",
      retryable: false,
      internalMessage:
        error?.message ||
        "Auth server returned no user.",
    });
  }
}

async function removeStorageObjects(
  adminClient: ServerSupabaseClient,
  storagePaths: string[]
): Promise<number> {
  for (
    let index = 0;
    index < storagePaths.length;
    index += STORAGE_REMOVE_BATCH_SIZE
  ) {
    const batch =
      storagePaths.slice(
        index,
        index +
          STORAGE_REMOVE_BATCH_SIZE
      );

    const { error } =
      await adminClient.storage
        .from(
          PRODUCT_SHOWCASE_IMAGE_BUCKET
        )
        .remove(batch);

    if (error) {
      throw new ProductShowcaseDeletionError({
        message:
          "Tootenäidise pildifailide eemaldamine jäi pooleli. Proovi kustutamist uuesti.",
        status: 502,
        code: "storage_cleanup_failed",
        retryable: true,
        internalMessage:
          error.message ||
          "Storage remove failed.",
      });
    }
  }

  return storagePaths.length;
}

async function productShowcaseStillExists(
  adminClient: ServerSupabaseClient,
  showcaseId: string
): Promise<boolean> {
  const { data, error } =
    await adminClient
      .from("product_showcases")
      .select("id")
      .eq("id", showcaseId)
      .maybeSingle();

  if (error) {
    throw new ProductShowcaseDeletionError({
      message:
        "Tootenäidise kustutamise lõppseisu ei saanud kontrollida.",
      status: 500,
      code:
        "deletion_result_check_failed",
      retryable: true,
      internalMessage:
        error.message ||
        "Product showcase existence check failed.",
    });
  }

  return Boolean(data);
}

export async function
deleteArchivedProductShowcase(input: {
  accessToken: string;
  showcaseId: string;
}): Promise<
  DeleteArchivedProductShowcaseResult
> {
  const accessToken =
    input.accessToken.trim();

  if (!accessToken) {
    throw new ProductShowcaseDeletionError({
      message:
        "Tootenäidise kustutamiseks logi sisse.",
      status: 401,
      code: "unauthorized",
      retryable: false,
    });
  }

  const showcaseId =
    normalizeUuid(
      input.showcaseId,
      "Tootenäidise ID ei ole korrektne."
    );

  /*
   * The privileged client is used only for:
   *
   * 1. verifying the supplied user JWT;
   * 2. deleting Storage objects returned by the
   *    database-generated manifest;
   * 3. resolving a narrow post-finalization race.
   */
  const adminClient =
    createAdminClient();

  await authenticateAccessToken(
    adminClient,
    accessToken
  );

  /*
   * Database RPCs must run with the user's JWT so
   * auth.uid(), the active identity and membership
   * checks remain authoritative.
   */
  const userClient =
    createUserScopedClient(
      accessToken
    );

  const {
    data: manifestData,
    error: manifestError,
  } = await userClient.rpc(
    "prepare_my_archived_product_showcase_delete_v2",
    {
      p_showcase_id: showcaseId,
    }
  );

  if (manifestError) {
    throw mapRpcError(
      manifestError,
      "prepare"
    );
  }

  const manifest =
    parsePreparedManifest(
      manifestData,
      showcaseId
    );

  const storageObjectsDeleted =
    await removeStorageObjects(
      adminClient,
      manifest.storagePaths
    );

  const {
    data: deletionData,
    error: deletionError,
  } = await userClient.rpc(
    "delete_my_archived_product_showcase_v2",
    {
      p_showcase_id:
        showcaseId,
      p_deletion_token:
        manifest.deletionToken,
    }
  );

  if (deletionError) {
    const operationError =
      normalizeOperationError(
        deletionError
      );

    /*
     * Two simultaneous retries may both remove the
     * same Storage objects. If one request has already
     * completed the database deletion, the second
     * request is treated as an idempotent success.
     */
    if (
      operationError.code === "42501" &&
      !(
        await productShowcaseStillExists(
          adminClient,
          showcaseId
        )
      )
    ) {
      return {
        deletedShowcaseId:
          showcaseId,
        title: manifest.title,
        deletedImageRows: null,
        storageObjectsDeleted,
        alreadyDeleted: true,
      };
    }

    throw mapRpcError(
      deletionError,
      "finalize"
    );
  }

  const deleted =
    parseDeletedResult(
      deletionData,
      showcaseId,
      manifest.title
    );

  return {
    ...deleted,
    storageObjectsDeleted,
    alreadyDeleted: false,
  };
}
