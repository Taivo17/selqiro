import {
  getMyMarketplaceItems,
} from "../../../entities/marketplace-item/api/getMyMarketplaceItems";
import type {
  GetMyMarketplaceItemsInput,
} from "../../../entities/marketplace-item/model/types";
import {
  mapMyAreaMarketplaceItemRows,
} from "./mapMyAreaMarketplaceItemRow";
import type {
  MyAreaMarketplaceItemRow,
} from "./myAreaMarketplaceItemRow";

type LegacyGetMyIdentityListings = typeof import(
  "../../../entities/listing/api/getMyIdentityListings"
).getMyIdentityListings;

type LegacyOwnerListingsArgs =
  Parameters<LegacyGetMyIdentityListings>;

type UnknownRecord = Record<string, unknown>;

function isRecord(
  value: unknown
): value is UnknownRecord {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
  );
}

function getObjectInput(
  args: readonly unknown[]
): UnknownRecord | null {
  if (args.length !== 1 || !isRecord(args[0])) {
    return null;
  }

  return args[0];
}

function readObjectValue(
  input: UnknownRecord | null,
  keys: readonly string[]
): unknown {
  if (!input) {
    return undefined;
  }

  for (const key of keys) {
    if (key in input) {
      return input[key];
    }
  }

  return undefined;
}

function readNumber(
  value: unknown,
  fallback: number
): number {
  if (
    typeof value === "number"
    && Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string"
    && value.trim()
    && Number.isFinite(Number(value))
  ) {
    return Number(value);
  }

  return fallback;
}

function readText(
  value: unknown,
  fallback: string
): string {
  return typeof value === "string"
    ? value
    : fallback;
}

function readNullableText(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function toSharedReadInput(
  legacyArgs: LegacyOwnerListingsArgs
): GetMyMarketplaceItemsInput {
  const args: readonly unknown[] =
    legacyArgs;
  const objectInput = getObjectInput(args);

  const limitValue =
    readObjectValue(
      objectInput,
      ["resultLimit", "limit"]
    )
    ?? args[0];

  const offsetValue =
    readObjectValue(
      objectInput,
      ["resultOffset", "offset"]
    )
    ?? args[1];

  const statusValue =
    readObjectValue(
      objectInput,
      ["statusFilter", "status"]
    )
    ?? args[2];

  const searchValue =
    readObjectValue(
      objectInput,
      ["searchQuery", "search"]
    )
    ?? args[3];

  const storeCategoryValue =
    readObjectValue(
      objectInput,
      [
        "storeCategoryFilter",
        "storeCategoryId",
      ]
    )
    ?? args[4];

  return {
    limit: readNumber(limitValue, 500),
    offset: readNumber(offsetValue, 0),
    status: readText(statusValue, "all"),
    search: readText(searchValue, ""),
    storeCategoryId:
      readNullableText(storeCategoryValue),
  };
}

export async function getMyAreaMarketplaceItemRows(
  ...legacyArgs: LegacyOwnerListingsArgs
): Promise<MyAreaMarketplaceItemRow[]> {
  const items = await getMyMarketplaceItems(
    toSharedReadInput(legacyArgs)
  );

  return mapMyAreaMarketplaceItemRows(items);
}
