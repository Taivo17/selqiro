import {
  Buffer,
} from "node:buffer";
import {
  randomUUID,
} from "node:crypto";

export const ENERGY_OPERATION_STATUSES = [
  "reserved",
  "committed",
  "released",
] as const;

export type EnergyOperationStatus =
  (typeof ENERGY_OPERATION_STATUSES)[number];

export const ENERGY_MUTATION_ERROR_CODES = [
  "unauthorized",
  "server_configuration",
  "invalid_feature",
  "invalid_operation_key",
  "invalid_metadata",
  "active_identity_required",
  "insufficient_energy",
  "operation_conflict",
  "operation_forbidden",
  "operation_not_found",
  "operation_already_committed",
  "operation_already_released",
  "unexpected_database_result",
  "database_unavailable",
] as const;

export type EnergyMutationErrorCode =
  (typeof ENERGY_MUTATION_ERROR_CODES)[number];

declare const energyOperationKeyBrand:
  unique symbol;

export type EnergyOperationKey =
  string & {
    readonly [energyOperationKeyBrand]:
      true;
  };

export type JsonPrimitive =
  | string
  | number
  | boolean
  | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

export type EnergyMetadata =
  Record<string, JsonValue>;

export type EnergyMutationResult = {
  operationKey: EnergyOperationKey;
  operationStatus:
    EnergyOperationStatus;
  feature: string;
  amount: number;
  paidAmount: number;
  bonusAmount: number;
  walletId: string;
  identityId: string;
  availablePaid: number;
  availableBonus: number;
  availableTotal: number;
  reservedPaid: number;
  reservedBonus: number;
  reservedTotal: number;
  ledgerEntryId: string;
  eventCreatedAt: string;
  idempotent: boolean;
};

export type EnergyMutationExpectation = {
  operationKey: EnergyOperationKey;
  allowedStatuses:
    readonly EnergyOperationStatus[];
  feature?: string;
  amount?: number;
};

type EnergyMutationErrorInput = {
  message: string;
  status: number;
  code: EnergyMutationErrorCode;
  retryable: boolean;
  internalMessage?: string;
  internalCause?: unknown;
};

export class EnergyMutationError
  extends Error {
  readonly status: number;
  readonly code:
    EnergyMutationErrorCode;
  readonly retryable: boolean;
  readonly internalMessage:
    string | null;
  readonly internalCause: unknown;

  constructor(
    input: EnergyMutationErrorInput
  ) {
    super(input.message);

    this.name =
      "EnergyMutationError";
    this.status = input.status;
    this.code = input.code;
    this.retryable =
      input.retryable;
    this.internalMessage =
      input.internalMessage || null;
    this.internalCause =
      input.internalCause;
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ENERGY_FEATURE_PATTERN =
  /^[a-z0-9][a-z0-9_:-]{0,79}$/;

const ENERGY_OPERATION_KEY_PATTERN =
  /^energy:[a-z0-9][a-z0-9_:-]{0,79}:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TRANSIENT_DATABASE_CODES =
  new Set([
    "08000",
    "08003",
    "08006",
    "53300",
    "57014",
    "57P01",
    "57P02",
    "57P03",
  ]);

function invalidInput(
  input: Omit<
    EnergyMutationErrorInput,
    "retryable"
  >
): EnergyMutationError {
  return new EnergyMutationError({
    ...input,
    retryable: false,
  });
}

function unexpectedResult(
  internalMessage: string
): EnergyMutationError {
  return new EnergyMutationError({
    message:
      "Energy server tagastas ootamatu tulemuse.",
    status: 500,
    code:
      "unexpected_database_result",
    retryable: false,
    internalMessage,
  });
}

function requiredText(
  value: unknown,
  fieldName: string
): string {
  const cleanValue =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!cleanValue) {
    throw unexpectedResult(
      `Energy mutation result is missing ${fieldName}.`
    );
  }

  return cleanValue;
}

function requiredUuid(
  value: unknown,
  fieldName: string
): string {
  const cleanValue =
    requiredText(
      value,
      fieldName
    );

  if (
    !UUID_PATTERN.test(
      cleanValue
    )
  ) {
    throw unexpectedResult(
      `Energy mutation result field ${fieldName} is not a UUID.`
    );
  }

  return cleanValue;
}

function safeInteger(
  value: unknown,
  fieldName: string
): number {
  const parsed =
    typeof value === "number" ||
    typeof value === "string"
      ? Number(value)
      : Number.NaN;

  if (
    !Number.isSafeInteger(
      parsed
    )
  ) {
    throw unexpectedResult(
      `Energy mutation result field ${fieldName} is not a safe integer.`
    );
  }

  return parsed;
}

function nonNegativeInteger(
  value: unknown,
  fieldName: string
): number {
  const parsed =
    safeInteger(
      value,
      fieldName
    );

  if (parsed < 0) {
    throw unexpectedResult(
      `Energy mutation result field ${fieldName} is negative.`
    );
  }

  return parsed;
}

function positiveInteger(
  value: unknown,
  fieldName: string
): number {
  const parsed =
    safeInteger(
      value,
      fieldName
    );

  if (parsed <= 0) {
    throw unexpectedResult(
      `Energy mutation result field ${fieldName} is not positive.`
    );
  }

  return parsed;
}

function requiredBoolean(
  value: unknown,
  fieldName: string
): boolean {
  if (typeof value !== "boolean") {
    throw unexpectedResult(
      `Energy mutation result field ${fieldName} is not boolean.`
    );
  }

  return value;
}

function requiredTimestamp(
  value: unknown,
  fieldName: string
): string {
  const cleanValue =
    requiredText(
      value,
      fieldName
    );

  if (
    Number.isNaN(
      Date.parse(cleanValue)
    )
  ) {
    throw unexpectedResult(
      `Energy mutation result field ${fieldName} is not a timestamp.`
    );
  }

  return cleanValue;
}

function recordValue(
  value: unknown
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw unexpectedResult(
      "Energy mutation RPC did not return an object."
    );
  }

  return value as
    Record<string, unknown>;
}

function normalizeJsonValue(
  value: unknown,
  path: string,
  depth: number,
  seen: WeakSet<object>
): JsonValue {
  if (depth > 8) {
    throw invalidInput({
      message:
        "Energy metadata on liiga sügav.",
      status: 400,
      code: "invalid_metadata",
      internalMessage:
        `${path} exceeded the maximum depth.`,
    });
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value as JsonPrimitive;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw invalidInput({
        message:
          "Energy metadata sisaldab vigast arvu.",
        status: 400,
        code: "invalid_metadata",
        internalMessage:
          `${path} is not a finite number.`,
      });
    }

    return value;
  }

  if (Array.isArray(value)) {
    if (value.length > 100) {
      throw invalidInput({
        message:
          "Energy metadata loend on liiga pikk.",
        status: 400,
        code: "invalid_metadata",
        internalMessage:
          `${path} contains more than 100 items.`,
      });
    }

    return value.map(
      (item, index) =>
        normalizeJsonValue(
          item,
          `${path}[${index}]`,
          depth + 1,
          seen
        )
    );
  }

  if (
    typeof value !== "object" ||
    value === undefined
  ) {
    throw invalidInput({
      message:
        "Energy metadata sisaldab lubamatut väärtust.",
      status: 400,
      code: "invalid_metadata",
      internalMessage:
        `${path} is not JSON-compatible.`,
    });
  }

  const prototype =
    Object.getPrototypeOf(
      value
    );

  if (
    prototype !==
      Object.prototype &&
    prototype !== null
  ) {
    throw invalidInput({
      message:
        "Energy metadata sisaldab lubamatut objekti.",
      status: 400,
      code: "invalid_metadata",
      internalMessage:
        `${path} is not a plain object.`,
    });
  }

  if (seen.has(value)) {
    throw invalidInput({
      message:
        "Energy metadata sisaldab tsüklilist viidet.",
      status: 400,
      code: "invalid_metadata",
      internalMessage:
        `${path} contains a circular reference.`,
    });
  }

  seen.add(value);

  const entries =
    Object.entries(value);

  if (entries.length > 100) {
    seen.delete(value);

    throw invalidInput({
      message:
        "Energy metadata objekt on liiga suur.",
      status: 400,
      code: "invalid_metadata",
      internalMessage:
        `${path} contains more than 100 keys.`,
    });
  }

  const normalized:
    Record<string, JsonValue> = {};

  for (
    const [key, item]
    of entries
  ) {
    const cleanKey =
      key.trim();

    if (
      !cleanKey ||
      cleanKey.length > 120
    ) {
      seen.delete(value);

      throw invalidInput({
        message:
          "Energy metadata välja nimi ei ole korrektne.",
        status: 400,
        code: "invalid_metadata",
        internalMessage:
          `${path} contains an invalid key.`,
      });
    }

    normalized[cleanKey] =
      normalizeJsonValue(
        item,
        `${path}.${cleanKey}`,
        depth + 1,
        seen
      );
  }

  seen.delete(value);

  return normalized;
}

export function normalizeEnergyMetadata(
  value: unknown,
  label = "metadata",
  maxBytes = 16_384
): EnergyMetadata {
  if (
    value === undefined ||
    value === null
  ) {
    return {};
  }

  if (
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw invalidInput({
      message:
        "Energy metadata peab olema objekt.",
      status: 400,
      code: "invalid_metadata",
      internalMessage:
        `${label} is not an object.`,
    });
  }

  const normalized =
    normalizeJsonValue(
      value,
      label,
      0,
      new WeakSet()
    ) as EnergyMetadata;

  const encoded =
    JSON.stringify(
      normalized
    );

  if (
    Buffer.byteLength(
      encoded,
      "utf8"
    ) > maxBytes
  ) {
    throw invalidInput({
      message:
        "Energy metadata on liiga mahukas.",
      status: 400,
      code: "invalid_metadata",
      internalMessage:
        `${label} exceeds ${maxBytes} bytes.`,
    });
  }

  return normalized;
}

export function createEnergyOperationKey(
  feature: string
): EnergyOperationKey {
  const cleanFeature =
    feature.trim();

  if (
    !ENERGY_FEATURE_PATTERN.test(
      cleanFeature
    )
  ) {
    throw invalidInput({
      message:
        "Energy tegevus ei ole korrektne.",
      status: 400,
      code: "invalid_feature",
      internalMessage:
        "Cannot create an operation key for an invalid feature.",
    });
  }

  return (
    `energy:${cleanFeature}:${randomUUID()}`
  ) as EnergyOperationKey;
}

export function assertEnergyOperationKey(
  value: string
): EnergyOperationKey {
  const cleanValue =
    value.trim();

  if (
    !ENERGY_OPERATION_KEY_PATTERN.test(
      cleanValue
    ) ||
    cleanValue.length > 200
  ) {
    throw invalidInput({
      message:
        "Energy toimingu võti ei ole korrektne.",
      status: 400,
      code:
        "invalid_operation_key",
      internalMessage:
        "Energy operation key failed validation.",
    });
  }

  return cleanValue as
    EnergyOperationKey;
}

export function mapEnergyMutationResult(
  rawValue: unknown,
  expected:
    EnergyMutationExpectation
): EnergyMutationResult {
  const row =
    recordValue(rawValue);

  const operationKey =
    assertEnergyOperationKey(
      requiredText(
        row.operation_key,
        "operation_key"
      )
    );

  if (
    operationKey !==
    expected.operationKey
  ) {
    throw unexpectedResult(
      "Energy mutation RPC returned another operation key."
    );
  }

  const operationStatusValue =
    requiredText(
      row.operation_status,
      "operation_status"
    );

  if (
    !ENERGY_OPERATION_STATUSES.includes(
      operationStatusValue as
        EnergyOperationStatus
    )
  ) {
    throw unexpectedResult(
      "Energy mutation RPC returned an unknown status."
    );
  }

  const operationStatus =
    operationStatusValue as
      EnergyOperationStatus;

  if (
    !expected.allowedStatuses.includes(
      operationStatus
    )
  ) {
    throw unexpectedResult(
      `Energy mutation RPC returned forbidden status ${operationStatus}.`
    );
  }

  const feature =
    requiredText(
      row.feature,
      "feature"
    );

  if (
    !ENERGY_FEATURE_PATTERN.test(
      feature
    )
  ) {
    throw unexpectedResult(
      "Energy mutation RPC returned an invalid feature."
    );
  }

  if (
    expected.feature &&
    feature !== expected.feature
  ) {
    throw unexpectedResult(
      "Energy mutation RPC returned another feature."
    );
  }

  const amount =
    positiveInteger(
      row.amount,
      "amount"
    );

  if (
    expected.amount !== undefined &&
    amount !== expected.amount
  ) {
    throw unexpectedResult(
      "Energy mutation RPC returned another amount."
    );
  }

  const paidAmount =
    nonNegativeInteger(
      row.paid_amount,
      "paid_amount"
    );

  const bonusAmount =
    nonNegativeInteger(
      row.bonus_amount,
      "bonus_amount"
    );

  if (
    paidAmount +
      bonusAmount !==
    amount
  ) {
    throw unexpectedResult(
      "Energy mutation paid and bonus amounts do not sum to the total amount."
    );
  }

  const availablePaid =
    nonNegativeInteger(
      row.available_paid,
      "available_paid"
    );

  const availableBonus =
    nonNegativeInteger(
      row.available_bonus,
      "available_bonus"
    );

  const availableTotal =
    nonNegativeInteger(
      row.available_total,
      "available_total"
    );

  const reservedPaid =
    nonNegativeInteger(
      row.reserved_paid,
      "reserved_paid"
    );

  const reservedBonus =
    nonNegativeInteger(
      row.reserved_bonus,
      "reserved_bonus"
    );

  const reservedTotal =
    nonNegativeInteger(
      row.reserved_total,
      "reserved_total"
    );

  if (
    availableTotal !==
      availablePaid +
        availableBonus ||
    reservedTotal !==
      reservedPaid +
        reservedBonus
  ) {
    throw unexpectedResult(
      "Energy mutation wallet totals do not match the bucket values."
    );
  }

  return {
    operationKey,
    operationStatus,
    feature,
    amount,
    paidAmount,
    bonusAmount,
    walletId: requiredUuid(
      row.wallet_id,
      "wallet_id"
    ),
    identityId: requiredUuid(
      row.identity_id,
      "identity_id"
    ),
    availablePaid,
    availableBonus,
    availableTotal,
    reservedPaid,
    reservedBonus,
    reservedTotal,
    ledgerEntryId:
      requiredUuid(
        row.ledger_entry_id,
        "ledger_entry_id"
      ),
    eventCreatedAt:
      requiredTimestamp(
        row.event_created_at,
        "event_created_at"
      ),
    idempotent:
      requiredBoolean(
        row.idempotent,
        "idempotent"
      ),
  };
}

function rpcErrorParts(
  error: unknown
): {
  code: string;
  message: string;
  details: string;
  hint: string;
} {
  if (
    !error ||
    typeof error !== "object"
  ) {
    return {
      code: "",
      message:
        error instanceof Error
          ? error.message
          : String(error),
      details: "",
      hint: "",
    };
  }

  const row =
    error as
      Record<string, unknown>;

  return {
    code:
      typeof row.code === "string"
        ? row.code
        : "",
    message:
      typeof row.message === "string"
        ? row.message
        : "",
    details:
      typeof row.details === "string"
        ? row.details
        : "",
    hint:
      typeof row.hint === "string"
        ? row.hint
        : "",
  };
}

export function mapEnergyMutationRpcError(
  error: unknown
): EnergyMutationError {
  if (
    error instanceof
    EnergyMutationError
  ) {
    return error;
  }

  const {
    code,
    message,
    details,
    hint,
  } = rpcErrorParts(error);

  const normalized =
    `${message} ${details} ${hint}`
      .toLowerCase();

  const internalMessage =
    [
      code,
      message,
      details,
      hint,
    ]
      .filter(Boolean)
      .join(" | ") ||
    "Unknown Energy RPC error.";

  if (
    normalized.includes(
      "energy_insufficient_balance"
    )
  ) {
    return new EnergyMutationError({
      message:
        "Energy't ei ole selle tegevuse jaoks piisavalt.",
      status: 402,
      code:
        "insufficient_energy",
      retryable: false,
      internalMessage,
      internalCause: error,
    });
  }

  if (
    normalized.includes(
      "energy_active_identity_missing"
    )
  ) {
    return new EnergyMutationError({
      message:
        "Vali enne aktiivne identiteet.",
      status: 409,
      code:
        "active_identity_required",
      retryable: false,
      internalMessage,
      internalCause: error,
    });
  }

  if (
    normalized.includes(
      "energy_operation_forbidden"
    ) ||
    normalized.includes(
      "energy_active_identity_forbidden"
    ) ||
    code === "42501"
  ) {
    return new EnergyMutationError({
      message:
        "Sul ei ole õigust seda Energy toimingut kasutada.",
      status: 403,
      code:
        "operation_forbidden",
      retryable: false,
      internalMessage,
      internalCause: error,
    });
  }

  if (
    normalized.includes(
      "energy_operation_key_conflict"
    ) ||
    code === "23505"
  ) {
    return new EnergyMutationError({
      message:
        "Sama Energy toimingu võti on juba kasutusel teise tegevuse jaoks.",
      status: 409,
      code:
        "operation_conflict",
      retryable: false,
      internalMessage,
      internalCause: error,
    });
  }

  if (
    normalized.includes(
      "energy_reservation_missing"
    ) ||
    code === "P0002"
  ) {
    return new EnergyMutationError({
      message:
        "Energy reserveeringut ei leitud.",
      status: 404,
      code:
        "operation_not_found",
      retryable: false,
      internalMessage,
      internalCause: error,
    });
  }

  if (
    normalized.includes(
      "energy_operation_already_committed"
    )
  ) {
    return new EnergyMutationError({
      message:
        "Energy toiming on juba lõplikult kinnitatud.",
      status: 409,
      code:
        "operation_already_committed",
      retryable: false,
      internalMessage,
      internalCause: error,
    });
  }

  if (
    normalized.includes(
      "energy_operation_already_released"
    )
  ) {
    return new EnergyMutationError({
      message:
        "Energy reserveering on juba vabastatud.",
      status: 409,
      code:
        "operation_already_released",
      retryable: false,
      internalMessage,
      internalCause: error,
    });
  }

  if (
    normalized.includes(
      "energy_operation_key_invalid"
    )
  ) {
    return invalidInput({
      message:
        "Energy toimingu võti ei ole korrektne.",
      status: 400,
      code:
        "invalid_operation_key",
      internalMessage,
      internalCause: error,
    });
  }

  if (
    normalized.includes(
      "energy_feature_invalid"
    ) ||
    normalized.includes(
      "energy_amount_invalid"
    )
  ) {
    return invalidInput({
      message:
        "Energy tegevuse seadistus ei ole korrektne.",
      status: 500,
      code:
        "server_configuration",
      internalMessage,
      internalCause: error,
    });
  }

  if (
    normalized.includes(
      "energy_metadata_invalid"
    )
  ) {
    return invalidInput({
      message:
        "Energy metadata ei ole korrektne.",
      status: 400,
      code:
        "invalid_metadata",
      internalMessage,
      internalCause: error,
    });
  }

  if (
    normalized.includes(
      "energy_reservation_corrupt"
    ) ||
    normalized.includes(
      "energy_final_event_corrupt"
    ) ||
    normalized.includes(
      "energy_reserved_balance_mismatch"
    ) ||
    normalized.includes(
      "energy_reservation_wallet_missing"
    ) ||
    normalized.includes(
      "energy_wallet_missing"
    ) ||
    code === "23514"
  ) {
    return unexpectedResult(
      internalMessage
    );
  }

  if (
    TRANSIENT_DATABASE_CODES.has(
      code
    )
  ) {
    return new EnergyMutationError({
      message:
        "Energy teenus ei ole praegu ajutiselt saadaval.",
      status: 503,
      code:
        "database_unavailable",
      retryable: true,
      internalMessage,
      internalCause: error,
    });
  }

  return new EnergyMutationError({
    message:
      "Energy toiming ebaõnnestus.",
    status: 500,
    code:
      "database_unavailable",
    retryable: true,
    internalMessage,
    internalCause: error,
  });
}

export function ensureEnergyMutationError(
  error: unknown
): EnergyMutationError {
  if (
    error instanceof
    EnergyMutationError
  ) {
    return error;
  }

  return mapEnergyMutationRpcError(
    error
  );
}
