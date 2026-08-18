import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import {
  ENERGY_LEDGER_EVENT_TYPES,
  type EnergyLedgerEntry,
  type EnergyLedgerEventType,
  type EnergyPublicMetadata,
  type EnergyWallet,
  type EnergyWalletSnapshot,
} from "../model/types";

type EnergyWalletRpcRow = {
  wallet_id?: string | null;
  identity_id?: string | null;
  available_paid?: number | string | null;
  available_bonus?: number | string | null;
  available_total?: number | string | null;
  reserved_paid?: number | string | null;
  reserved_bonus?: number | string | null;
  reserved_total?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EnergyLedgerRpcRow = {
  entry_id?: string | null;
  operation_key?: string | null;
  event_type?: string | null;
  feature?: string | null;
  available_paid_delta?:
    | number
    | string
    | null;
  available_bonus_delta?:
    | number
    | string
    | null;
  reserved_paid_delta?:
    | number
    | string
    | null;
  reserved_bonus_delta?:
    | number
    | string
    | null;
  public_metadata?: unknown;
  created_at?: string | null;
};

function firstRow<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function requiredText(
  value: string | null | undefined,
  fieldName: string
): string {
  const cleanValue =
    (value || "").trim();

  if (!cleanValue) {
    throw new Error(
      `Energy andmetest puudub väli: ${fieldName}.`
    );
  }

  return cleanValue;
}

function energyInteger(
  value:
    | number
    | string
    | null
    | undefined,
  fieldName: string
): number {
  const parsed = Number(
    value ?? 0
  );

  if (
    !Number.isSafeInteger(parsed)
  ) {
    throw new Error(
      `Energy andmeväli ${fieldName} ei ole korrektne täisarv.`
    );
  }

  return parsed;
}

function eventType(
  value: string | null | undefined
): EnergyLedgerEventType {
  const cleanValue =
    (value || "").trim();

  if (
    ENERGY_LEDGER_EVENT_TYPES.includes(
      cleanValue as EnergyLedgerEventType
    )
  ) {
    return cleanValue as
      EnergyLedgerEventType;
  }

  throw new Error(
    "Energy ajaloo sündmuse tüüp ei ole korrektne."
  );
}

function publicMetadata(
  value: unknown
): EnergyPublicMetadata {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as
      EnergyPublicMetadata;
  }

  return {};
}

function mapWalletRow(
  row: EnergyWalletRpcRow
): EnergyWallet {
  const wallet: EnergyWallet = {
    walletId: requiredText(
      row.wallet_id,
      "wallet_id"
    ),
    identityId: requiredText(
      row.identity_id,
      "identity_id"
    ),
    availablePaid: energyInteger(
      row.available_paid,
      "available_paid"
    ),
    availableBonus: energyInteger(
      row.available_bonus,
      "available_bonus"
    ),
    availableTotal: energyInteger(
      row.available_total,
      "available_total"
    ),
    reservedPaid: energyInteger(
      row.reserved_paid,
      "reserved_paid"
    ),
    reservedBonus: energyInteger(
      row.reserved_bonus,
      "reserved_bonus"
    ),
    reservedTotal: energyInteger(
      row.reserved_total,
      "reserved_total"
    ),
    createdAt: requiredText(
      row.created_at,
      "created_at"
    ),
    updatedAt: requiredText(
      row.updated_at,
      "updated_at"
    ),
  };

  if (
    wallet.availablePaid < 0 ||
    wallet.availableBonus < 0 ||
    wallet.availableTotal < 0 ||
    wallet.reservedPaid < 0 ||
    wallet.reservedBonus < 0 ||
    wallet.reservedTotal < 0
  ) {
    throw new Error(
      "Energy wallet tagastas negatiivse saldo."
    );
  }

  if (
    wallet.availableTotal !==
      wallet.availablePaid +
        wallet.availableBonus ||
    wallet.reservedTotal !==
      wallet.reservedPaid +
        wallet.reservedBonus
  ) {
    throw new Error(
      "Energy walleti koondsaldod ei ühti saldoämbritega."
    );
  }

  return wallet;
}

function mapLedgerRow(
  row: EnergyLedgerRpcRow
): EnergyLedgerEntry {
  return {
    entryId: requiredText(
      row.entry_id,
      "entry_id"
    ),
    operationKey: requiredText(
      row.operation_key,
      "operation_key"
    ),
    eventType: eventType(
      row.event_type
    ),
    feature: requiredText(
      row.feature,
      "feature"
    ),
    availablePaidDelta: energyInteger(
      row.available_paid_delta,
      "available_paid_delta"
    ),
    availableBonusDelta: energyInteger(
      row.available_bonus_delta,
      "available_bonus_delta"
    ),
    reservedPaidDelta: energyInteger(
      row.reserved_paid_delta,
      "reserved_paid_delta"
    ),
    reservedBonusDelta: energyInteger(
      row.reserved_bonus_delta,
      "reserved_bonus_delta"
    ),
    publicMetadata: publicMetadata(
      row.public_metadata
    ),
    createdAt: requiredText(
      row.created_at,
      "created_at"
    ),
  };
}

export async function
getMyEnergyWallet(): Promise<EnergyWallet> {
  const {
    data,
    error,
  } =
    await supabaseBrowserClient.rpc(
      "get_my_energy_wallet_v2"
    );

  if (error) {
    throw new Error(
      error.message ||
        "Energy walletit ei saanud laadida."
    );
  }

  const row = firstRow(
    data as
      | EnergyWalletRpcRow
      | EnergyWalletRpcRow[]
      | null
  );

  if (!row) {
    throw new Error(
      "Andmebaas ei tagastanud Energy walletit."
    );
  }

  return mapWalletRow(row);
}

export async function
getMyEnergyLedger(
  input: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<EnergyLedgerEntry[]> {
  const limit = Math.min(
    Math.max(
      Math.floor(
        input.limit ?? 50
      ),
      1
    ),
    100
  );

  const offset = Math.max(
    Math.floor(
      input.offset ?? 0
    ),
    0
  );

  const {
    data,
    error,
  } =
    await supabaseBrowserClient.rpc(
      "get_my_energy_ledger_v2",
      {
        p_limit: limit,
        p_offset: offset,
      }
    );

  if (error) {
    throw new Error(
      error.message ||
        "Energy ajalugu ei saanud laadida."
    );
  }

  return (
    (data || []) as EnergyLedgerRpcRow[]
  ).map(mapLedgerRow);
}

export async function
getMyEnergyWalletSnapshot(): Promise<EnergyWalletSnapshot> {
  const wallet =
    await getMyEnergyWallet();

  const entries =
    await getMyEnergyLedger({
      limit: 50,
      offset: 0,
    });

  return {
    wallet,
    entries,
  };
}
