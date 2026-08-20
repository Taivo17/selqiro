import "server-only";

import {
  getEnergyAdminClient,
} from "../energy/adminClient";
import {
  EnergyMutationError,
  type EnergyOperationKey,
} from "../energy/model";
import {
  isListingAiResult,
  isListingAiUsageSnapshot,
  type ListingAiResult,
  type ListingAiUsageSnapshot,
} from "./model";

type EnergyEventRow = {
  event_type?: string | null;
  created_at?: string | null;
  internal_metadata?: unknown;
};

export type ListingAiOperationState = {
  reserveCreatedAt: string | null;
  requestHash: string | null;
  committedResult:
    ListingAiResult | null;
  committedUsage:
    ListingAiUsageSnapshot | null;
  releasedFailureCode:
    string | null;
};

function asRecord(
  value: unknown
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as
    Record<string, unknown>;
}

function textValue(
  value: unknown
): string | null {
  const cleanValue =
    typeof value === "string"
      ? value.trim()
      : "";

  return cleanValue || null;
}

export async function
getListingAiOperationState(
  operationKey: EnergyOperationKey
): Promise<ListingAiOperationState> {
  const adminClient =
    getEnergyAdminClient();

  const {
    data,
    error,
  } =
    await adminClient
      .from(
        "energy_ledger_entries"
      )
      .select(
        [
          "event_type",
          "created_at",
          "internal_metadata",
        ].join(",")
      )
      .eq(
        "operation_key",
        operationKey
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

  if (error) {
    throw new EnergyMutationError({
      message:
        "Energy toimingu seisu ei saanud kontrollida.",
      status: 503,
      code:
        "database_unavailable",
      retryable: true,
      internalMessage:
        error.message ||
        "Failed to load Energy ledger operation state.",
      internalCause: error,
    });
  }

  let reserveCreatedAt:
    string | null = null;

  let requestHash:
    string | null = null;

  let committedResult:
    ListingAiResult | null =
      null;

  let committedUsage:
    ListingAiUsageSnapshot | null =
      null;

  let releasedFailureCode:
    string | null = null;

  for (
    const row
    of (
      data || []
    ) as EnergyEventRow[]
  ) {
    const eventType =
      textValue(
        row.event_type
      );

    const metadata =
      asRecord(
        row.internal_metadata
      ) || {};

    if (
      eventType === "reserve"
    ) {
      reserveCreatedAt =
        textValue(
          row.created_at
        );

      requestHash =
        textValue(
          metadata.request_hash
        );
    }

    if (
      eventType === "commit"
    ) {
      if (
        isListingAiResult(
          metadata.result_snapshot
        )
      ) {
        committedResult =
          metadata.result_snapshot;
      }

      if (
        isListingAiUsageSnapshot(
          metadata.openai_usage
        )
      ) {
        committedUsage =
          metadata.openai_usage;
      }
    }

    if (
      eventType === "release"
    ) {
      releasedFailureCode =
        textValue(
          metadata.failure_code
        );
    }
  }

  return {
    reserveCreatedAt,
    requestHash,
    committedResult,
    committedUsage,
    releasedFailureCode,
  };
}
