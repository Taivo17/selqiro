import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { horseUuid, parsePublicHorse } from "../model/publicHorse";

export async function getPublicHorse(offerId: string, signal: AbortSignal) {
 if (!horseUuid(offerId)) return null;
 const { data, error } = await supabaseBrowserClient.rpc("get_public_horse_offer_v1", { p_offer_id: offerId }).abortSignal(signal);
 if (error) throw new Error("horse_public_read_unavailable");
 return parsePublicHorse(data, offerId);
}
