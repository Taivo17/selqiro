import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type {
  IdentitySummary,
  IdentityType,
} from "../model/types";

type IdentityRpcRow = {
  id?: string | null;
  type?: string | null;
  identity_type?: string | null;
  display_name?: string | null;
  store_name?: string | null;
  avatar_url?: string | null;
  slug?: string | null;
};

function normalizeIdentityType(
  value?: string | null
): IdentityType {
  return value === "business"
    ? "business"
    : "private";
}

export async function getMyIdentities(): Promise<
  IdentitySummary[]
> {
  /*
   * get_my_identities already returns the public
   * profile slug together with every accessible
   * identity.
   *
   * Do not query identity_profiles separately here.
   * Besides being redundant, that browser-side query
   * may enter recursive business-membership RLS.
   */
  const { data, error } =
    await supabaseBrowserClient.rpc(
      "get_my_identities"
    );

  if (error) {
    throw new Error(
      error.message ||
        "Identiteete ei saanud laadida."
    );
  }

  return (
    (data || []) as IdentityRpcRow[]
  )
    .filter(
      (
        item
      ): item is IdentityRpcRow & {
        id: string;
      } => Boolean(item.id)
    )
    .map((item) => {
      const displayName =
        (
          item.display_name ||
          item.store_name ||
          "Identiteet"
        ).trim() || "Identiteet";

      return {
        id: item.id,
        type: normalizeIdentityType(
          item.type ||
            item.identity_type
        ),
        displayName,
        avatarUrl:
          item.avatar_url || null,
        slug: item.slug || null,
      };
    });
}
