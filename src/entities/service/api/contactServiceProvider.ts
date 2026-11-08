import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { serviceUuid } from "../model/publicService";
import { ensure, record } from "../../listing/model/publicRead/priceRead";
import { isConversationId } from "../../conversation/model/listingContact";
export type ServiceContactCommand = Readonly<{expectedUserId: string; expectedIdentityId: string; requestKey: string; serviceId: string}>;
export async function contactServiceProvider(command: ServiceContactCommand, signal: AbortSignal): Promise<string> {
  ensure(serviceUuid(command.expectedUserId) && serviceUuid(command.expectedIdentityId) && serviceUuid(command.requestKey) && serviceUuid(command.serviceId));
  const {data, error} = await supabaseBrowserClient.rpc("contact_my_service_provider_v1", {
    p_expected_user_id: command.expectedUserId, p_expected_identity_id: command.expectedIdentityId, p_request_key: command.requestKey, p_service_id: command.serviceId,
  }).abortSignal(signal);
  if (error) throw new Error("service_contact_unconfirmed");
  const result = record(data, ["schema_version", "actor_user_id", "identity_id", "request_key", "service_id", "conversation_id", "replayed"]);
  ensure(result.schema_version === 1 && result.actor_user_id === command.expectedUserId && result.identity_id === command.expectedIdentityId
    && result.request_key === command.requestKey && result.service_id === command.serviceId && typeof result.replayed === "boolean" && isConversationId(result.conversation_id));
  return result.conversation_id;
}
