import { supabaseBrowserClient } from "../supabase/browserClient";

/** Both directed rows matter. Removing the caller's row does not remove or
 * override the other account's independent block. This helper never writes. */
export async function readLegacyAccountBlocks(viewerId: string, peerId: string) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(viewerId) || !uuid.test(peerId)) throw new Error("block_state_unavailable");
  const {data, error} = await supabaseBrowserClient.from("user_blocks").select("blocker_id,blocked_id")
    .or(`and(blocker_id.eq.${viewerId},blocked_id.eq.${peerId}),and(blocker_id.eq.${peerId},blocked_id.eq.${viewerId})`);
  if (error || !Array.isArray(data)) throw new Error("block_state_unavailable");
  const blockedByMe = data.some(row => row.blocker_id === viewerId && row.blocked_id === peerId);
  const blockedByOther = data.some(row => row.blocker_id === peerId && row.blocked_id === viewerId);
  return {blockedByMe, blockedByOther, blocked: blockedByMe || blockedByOther};
}
