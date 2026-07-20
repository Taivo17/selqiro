import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type {
  IdentitySummary,
  IdentityType,
} from "../model/types";

type SetActiveIdentityRpcRow = {
  identity_id?: string | null;
  identity_type?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  slug?: string | null;
  changed?: boolean | null;
};

export type SetActiveIdentityResult = {
  identity: IdentitySummary;
  changed: boolean;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstRow(
  value:
    | SetActiveIdentityRpcRow
    | SetActiveIdentityRpcRow[]
    | null
    | undefined
): SetActiveIdentityRpcRow | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function normalizeIdentityType(
  value?: string | null
): IdentityType {
  return value === "business"
    ? "business"
    : "private";
}

function normalizeIdentityId(
  value: string
): string {
  const cleanValue = value.trim();

  if (!UUID_PATTERN.test(cleanValue)) {
    throw new Error(
      "Valitud identiteedi ID ei ole korrektne."
    );
  }

  return cleanValue;
}

function getSwitchErrorMessage(error: {
  code?: string | null;
  message?: string | null;
}): string {
  const message =
    (error.message || "").toLowerCase();

  if (error.code === "42501") {
    if (
      message.includes("authentication")
    ) {
      return "Identiteedi vahetamiseks logi sisse.";
    }

    return "Sul puudub ligipääs valitud identiteedile.";
  }

  if (error.code === "22023") {
    if (message.includes("inactive")) {
      return "Valitud identiteet ei ole aktiivne.";
    }

    if (message.includes("profile")) {
      return "Kasutajaprofiili ei leitud.";
    }

    return "Valitud identiteeti ei leitud või selle andmed ei ole korrektsed.";
  }

  return (
    error.message ||
    "Aktiivset identiteeti ei saanud vahetada."
  );
}

export async function setActiveIdentity(input: {
  identityId: string;
}): Promise<SetActiveIdentityResult> {
  const cleanIdentityId =
    normalizeIdentityId(input.identityId);

  const { data, error } =
    await supabaseBrowserClient.rpc(
      "set_my_active_identity_v2",
      {
        p_identity_id: cleanIdentityId,
      }
    );

  if (error) {
    throw new Error(
      getSwitchErrorMessage(error)
    );
  }

  const row = firstRow(
    data as
      | SetActiveIdentityRpcRow
      | SetActiveIdentityRpcRow[]
      | null
  );

  if (!row?.identity_id) {
    throw new Error(
      "Andmebaas ei tagastanud valitud identiteeti."
    );
  }

  const returnedIdentityId =
    String(row.identity_id);

  if (
    returnedIdentityId !== cleanIdentityId
  ) {
    throw new Error(
      "Andmebaas tagastas ootamatu identiteedi."
    );
  }

  return {
    identity: {
      id: returnedIdentityId,
      type: normalizeIdentityType(
        row.identity_type
      ),
      displayName:
        row.display_name?.trim() ||
        "Identiteet",
      avatarUrl:
        row.avatar_url || null,
      slug: row.slug || null,
    },
    changed: row.changed === true,
  };
}
