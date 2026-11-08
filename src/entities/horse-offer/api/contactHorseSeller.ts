import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { horseUuid } from "../model/publicHorse";
import { ensure, record } from "../../listing/model/publicRead/priceRead";
import { isConversationId } from "../../conversation/model/listingContact";
export type HorseContactCommand = Readonly<{ expectedUserId: string; expectedIdentityId: string; requestKey: string; offerId: string }>;
export async function contactHorseSeller(c: HorseContactCommand, signal: AbortSignal): Promise<string> {
 ensure(horseUuid(c.expectedUserId) && horseUuid(c.expectedIdentityId) && horseUuid(c.requestKey) && horseUuid(c.offerId));
 const { data, error } = await supabaseBrowserClient.rpc("contact_my_horse_seller_v1", {
  p_expected_user_id: c.expectedUserId, p_expected_identity_id: c.expectedIdentityId, p_request_key: c.requestKey, p_offer_id: c.offerId,
 }).abortSignal(signal);
 if (error) throw new Error("horse_contact_unconfirmed");
 const r = record(data, ["schema_version", "actor_user_id", "identity_id", "request_key", "horse_offer_id", "conversation_id", "replayed"]);
 ensure(r.schema_version === 1 && r.actor_user_id === c.expectedUserId && r.identity_id === c.expectedIdentityId
  && r.request_key === c.requestKey && r.horse_offer_id === c.offerId && typeof r.replayed === "boolean" && isConversationId(r.conversation_id));
 return r.conversation_id;
}
