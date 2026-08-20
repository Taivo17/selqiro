import "server-only";

import {
  getEnergyAdminClient,
} from "./adminClient";
import {
  type VerifiedEnergyActor,
} from "./auth";
import {
  resolveEnergyFeatureContract,
  type EnergyFeature,
} from "./featureContract";
import {
  assertEnergyOperationKey,
  createEnergyOperationKey,
  ensureEnergyMutationError,
  mapEnergyMutationResult,
  mapEnergyMutationRpcError,
  normalizeEnergyMetadata,
  type EnergyMetadata,
  type EnergyMutationResult,
  type EnergyOperationKey,
  EnergyMutationError,
} from "./model";

type ReserveEnergyInput = {
  actor: VerifiedEnergyActor;
  feature: EnergyFeature;
  operationKey?:
    EnergyOperationKey;
  publicMetadata?: unknown;
  internalMetadata?: unknown;
};

type FinalizeEnergyInput = {
  actor: VerifiedEnergyActor;
  operationKey:
    EnergyOperationKey;
  publicMetadata?: unknown;
  internalMetadata?: unknown;
};

type EnergyRpcName =
  | "reserve_user_energy_v2"
  | "commit_user_energy_v2"
  | "release_user_energy_v2";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertVerifiedActor(
  actor: VerifiedEnergyActor
): void {
  if (
    !actor ||
    typeof actor !== "object" ||
    !UUID_PATTERN.test(
      actor.userId
    )
  ) {
    throw new EnergyMutationError({
      message:
        "Energy toimingu kasutamiseks logi sisse.",
      status: 401,
      code: "unauthorized",
      retryable: false,
      internalMessage:
        "Energy mutation received an invalid verified actor.",
    });
  }
}

function firstRow(
  value: unknown
): unknown {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function metadataWithServerFields(
  value: unknown,
  fields: EnergyMetadata
): EnergyMetadata {
  const normalized =
    normalizeEnergyMetadata(
      value,
      "internal_metadata",
      16_384
    );

  return normalizeEnergyMetadata(
    {
      ...normalized,
      ...fields,
    },
    "internal_metadata",
    16_384
  );
}

async function callEnergyRpc(
  rpcName: EnergyRpcName,
  args: Record<
    string,
    unknown
  >,
  expected:
    Parameters<
      typeof mapEnergyMutationResult
    >[1]
): Promise<EnergyMutationResult> {
  try {
    const adminClient =
      getEnergyAdminClient();

    const {
      data,
      error,
    } =
      await adminClient.rpc(
        rpcName,
        args
      );

    if (error) {
      throw mapEnergyMutationRpcError(
        error
      );
    }

    const row =
      firstRow(data);

    if (!row) {
      throw new EnergyMutationError({
        message:
          "Energy server ei tagastanud toimingu tulemust.",
        status: 500,
        code:
          "unexpected_database_result",
        retryable: false,
        internalMessage:
          `${rpcName} returned no row.`,
      });
    }

    return mapEnergyMutationResult(
      row,
      expected
    );
  } catch (error) {
    throw ensureEnergyMutationError(
      error
    );
  }
}

export async function reserveEnergy(
  input: ReserveEnergyInput
): Promise<EnergyMutationResult> {
  assertVerifiedActor(
    input.actor
  );

  const contract =
    resolveEnergyFeatureContract(
      input.feature
    );

  const operationKey =
    input.operationKey
      ? assertEnergyOperationKey(
          input.operationKey
        )
      : createEnergyOperationKey(
          contract.ledgerFeature
        );

  const publicMetadata =
    normalizeEnergyMetadata(
      input.publicMetadata,
      "public_metadata",
      8_192
    );

  const internalMetadata =
    metadataWithServerFields(
      input.internalMetadata,
      {
        selqiro_feature_key:
          contract.feature,
        selqiro_cost_source:
          contract
            .costEnvironmentVariable,
        selqiro_energy_action:
          "reserve",
      }
    );

  return callEnergyRpc(
    "reserve_user_energy_v2",
    {
      p_user_id:
        input.actor.userId,
      p_operation_key:
        operationKey,
      p_feature:
        contract.ledgerFeature,
      p_amount:
        contract.amount,
      p_public_metadata:
        publicMetadata,
      p_internal_metadata:
        internalMetadata,
    },
    {
      operationKey,
      allowedStatuses: [
        "reserved",
        "committed",
        "released",
      ],
      feature:
        contract.ledgerFeature,
      amount:
        contract.amount,
    }
  );
}

export async function commitEnergy(
  input: FinalizeEnergyInput
): Promise<EnergyMutationResult> {
  assertVerifiedActor(
    input.actor
  );

  const operationKey =
    assertEnergyOperationKey(
      input.operationKey
    );

  return callEnergyRpc(
    "commit_user_energy_v2",
    {
      p_user_id:
        input.actor.userId,
      p_operation_key:
        operationKey,
      p_public_metadata:
        normalizeEnergyMetadata(
          input.publicMetadata,
          "public_metadata",
          8_192
        ),
      p_internal_metadata:
        metadataWithServerFields(
          input.internalMetadata,
          {
            selqiro_energy_action:
              "commit",
          }
        ),
    },
    {
      operationKey,
      allowedStatuses: [
        "committed",
      ],
    }
  );
}

export async function releaseEnergy(
  input: FinalizeEnergyInput
): Promise<EnergyMutationResult> {
  assertVerifiedActor(
    input.actor
  );

  const operationKey =
    assertEnergyOperationKey(
      input.operationKey
    );

  return callEnergyRpc(
    "release_user_energy_v2",
    {
      p_user_id:
        input.actor.userId,
      p_operation_key:
        operationKey,
      p_public_metadata:
        normalizeEnergyMetadata(
          input.publicMetadata,
          "public_metadata",
          8_192
        ),
      p_internal_metadata:
        metadataWithServerFields(
          input.internalMetadata,
          {
            selqiro_energy_action:
              "release",
          }
        ),
    },
    {
      operationKey,
      allowedStatuses: [
        "released",
      ],
    }
  );
}
