export const ENERGY_LEDGER_EVENT_TYPES = [
  "paid_grant",
  "bonus_grant",
  "reserve",
  "commit",
  "release",
  "adjustment",
] as const;

export type EnergyLedgerEventType =
  (typeof ENERGY_LEDGER_EVENT_TYPES)[number];

export type EnergyPublicMetadata =
  Record<string, unknown>;

export type EnergyWallet = {
  walletId: string;
  identityId: string;
  availablePaid: number;
  availableBonus: number;
  availableTotal: number;
  reservedPaid: number;
  reservedBonus: number;
  reservedTotal: number;
  createdAt: string;
  updatedAt: string;
};

export type EnergyLedgerEntry = {
  entryId: string;
  operationKey: string;
  eventType: EnergyLedgerEventType;
  feature: string;
  availablePaidDelta: number;
  availableBonusDelta: number;
  reservedPaidDelta: number;
  reservedBonusDelta: number;
  publicMetadata: EnergyPublicMetadata;
  createdAt: string;
};

export type EnergyWalletSnapshot = {
  wallet: EnergyWallet;
  entries: EnergyLedgerEntry[];
};
