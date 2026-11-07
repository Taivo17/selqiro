import { uiMessage } from "../../../../lib/i18n/interfaceMessage";
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
      uiMessage("identity_id_invalid")
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
      return uiMessage("identity_sign_in");
    }

    return uiMessage("you_do_not_have_access_to_the_selected_identity");
  }

  if (error.code === "22023") {
    if (message.includes("inactive")) {
      return uiMessage("identity_inactive");
    }

    if (message.includes("profile")) {
      return uiMessage("profile_missing");
    }

    return uiMessage("identity_missing");
  }

  return (
    uiMessage("could_not_switch_identity")
  );
}

export async function setActiveIdentity(input: {
  identityId: string;
  expectedUserId?: string;
}): Promise<SetActiveIdentityResult> {
  const cleanIdentityId =
    normalizeIdentityId(input.identityId);

  if (input.expectedUserId !== undefined && !UUID_PATTERN.test(input.expectedUserId)) {
    throw new Error(uiMessage("account_id_invalid"));
  }
  const sessionResult = await supabaseBrowserClient.auth.getSession();
  const session = sessionResult.data.session;
  if (sessionResult.error || !session?.access_token || !session.user?.id) {
    throw new Error(uiMessage("identity_sign_in"));
  }
  const expectedUserId = input.expectedUserId ?? session.user.id;
  const accessToken = session.access_token;
  if (session.user.id !== expectedUserId) {
    throw new Error(uiMessage("the_signed_in_account_changed_check_your_account_again"));
  }
  // Verify the captured token itself. A later session change must not select
  // a different account while Supabase resolves its request authorization.
  const userResult = await supabaseBrowserClient.auth.getUser(accessToken);
  if (userResult.error || userResult.data.user?.id !== expectedUserId) {
    throw new Error(uiMessage("account_verify_again"));
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
      uiMessage("identity_not_returned")
    );
  }

  const returnedIdentityId =
    String(row.identity_id);

  if (
    returnedIdentityId !== cleanIdentityId
  ) {
    throw new Error(
      uiMessage("identity_unexpected")
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
        "",
      avatarUrl:
        row.avatar_url || null,
      slug: row.slug || null,
    },
    changed: row.changed === true,
  };
}
