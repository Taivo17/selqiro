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
  expectedUserId?: string;
}): Promise<SetActiveIdentityResult> {
  const cleanIdentityId =
    normalizeIdentityId(input.identityId);

  if (input.expectedUserId !== undefined && !UUID_PATTERN.test(input.expectedUserId)) {
    throw new Error("Sisselogitud konto ID ei ole korrektne.");
  }
  const sessionResult = await supabaseBrowserClient.auth.getSession();
  const session = sessionResult.data.session;
  if (sessionResult.error || !session?.access_token || !session.user?.id) {
    throw new Error("Identiteedi vahetamiseks logi sisse.");
  }
  const expectedUserId = input.expectedUserId ?? session.user.id;
  const accessToken = session.access_token;
  if (session.user.id !== expectedUserId) {
    throw new Error("Sisselogitud konto muutus. Kontrolli kontot uuesti.");
  }
  // Verify the captured token itself. A later session change must not select
  // a different account while Supabase resolves its request authorization.
  const userResult = await supabaseBrowserClient.auth.getUser(accessToken);
  if (userResult.error || userResult.data.user?.id !== expectedUserId) {
    throw new Error("Sisselogitud kontot ei saanud kinnitada. Kontrolli kontot uuesti.");
  }

  const { data, error } =
    await supabaseBrowserClient.rpc(
      "set_my_active_identity_v2",
      {
        p_identity_id: cleanIdentityId,
      }
    ).setHeader("Authorization", `Bearer ${accessToken}`);

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
