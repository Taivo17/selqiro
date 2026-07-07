import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";

export async function setActiveIdentity(input: {
  userId: string;
  identityId: string;
}): Promise<void> {
  const { userId, identityId } = input;

  const { error } = await supabaseBrowserClient
    .from("profiles")
    .update({ active_identity_id: identityId })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message || "Failed to set active identity");
  }
}
