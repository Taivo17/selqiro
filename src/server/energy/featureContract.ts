import "server-only";

import {
  EnergyMutationError,
} from "./model";

export const ENERGY_FEATURES = [
  "listing_ai_analysis",
] as const;

export type EnergyFeature =
  (typeof ENERGY_FEATURES)[number];

type EnergyFeatureDefinition = {
  ledgerFeature: string;
  publicLabel: string;
  costEnvironmentVariable:
    "SELQIRO_ENERGY_COST_LISTING_AI_ANALYSIS";
};

export type ResolvedEnergyFeatureContract = {
  feature: EnergyFeature;
  ledgerFeature: string;
  publicLabel: string;
  amount: number;
  costEnvironmentVariable:
    EnergyFeatureDefinition[
      "costEnvironmentVariable"
    ];
};

const FEATURE_DEFINITIONS:
  Record<
    EnergyFeature,
    EnergyFeatureDefinition
  > = {
    listing_ai_analysis: {
      ledgerFeature:
        "listing_ai_analysis",
      publicLabel:
        "Kuulutuse AI analüüs",
      costEnvironmentVariable:
        "SELQIRO_ENERGY_COST_LISTING_AI_ANALYSIS",
    },
  };

export function isEnergyFeature(
  value: unknown
): value is EnergyFeature {
  return (
    typeof value === "string" &&
    ENERGY_FEATURES.includes(
      value as EnergyFeature
    )
  );
}

function configuredEnergyAmount(
  environmentVariable:
    EnergyFeatureDefinition[
      "costEnvironmentVariable"
    ]
): number {
  const rawValue =
    process.env[
      environmentVariable
    ]?.trim() || "";

  const parsed =
    Number(rawValue);

  if (
    !rawValue ||
    !Number.isSafeInteger(
      parsed
    ) ||
    parsed <= 0 ||
    parsed >
      1_000_000_000
  ) {
    throw new EnergyMutationError({
      message:
        "Energy hinna serveriseadistus puudub.",
      status: 500,
      code:
        "server_configuration",
      retryable: false,
      internalMessage:
        `${environmentVariable} must be a positive safe integer no greater than 1000000000.`,
    });
  }

  return parsed;
}

export function resolveEnergyFeatureContract(
  feature: EnergyFeature
): ResolvedEnergyFeatureContract {
  const definition =
    FEATURE_DEFINITIONS[
      feature
    ];

  if (!definition) {
    throw new EnergyMutationError({
      message:
        "Energy tegevus ei ole toetatud.",
      status: 400,
      code: "invalid_feature",
      retryable: false,
      internalMessage:
        `Unknown Energy feature: ${String(feature)}.`,
    });
  }

  return Object.freeze({
    feature,
    ledgerFeature:
      definition.ledgerFeature,
    publicLabel:
      definition.publicLabel,
    amount:
      configuredEnergyAmount(
        definition
          .costEnvironmentVariable
      ),
    costEnvironmentVariable:
      definition
        .costEnvironmentVariable,
  });
}
