import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { AccountStateError, accountStateFailure, isAccountAccessToken, isAccountId, parseAccountState,
  type AccountReadContext } from "../model/accountState";

export async function getMyAccountState(context: AccountReadContext) {
  if (context.signal.aborted) throw new AccountStateError("cancelled");
  if (!isAccountId(context.userId) || !isAccountAccessToken(context.accessToken))
    throw new AccountStateError("authChanged");
  const controller = new AbortController(), abort = () => controller.abort();
  context.signal.addEventListener("abort", abort, {once: true});
  const deadline = setTimeout(abort, 20_000);
  try {
    const {data, error} = await supabaseBrowserClient.rpc("get_my_account_state_v1", {p_expected_user_id: context.userId})
      .setHeader("Authorization", `Bearer ${context.accessToken}`).abortSignal(controller.signal);
    if (context.signal.aborted) throw new AccountStateError("cancelled");
    if (controller.signal.aborted) throw new AccountStateError("readError");
    if (error) throw accountStateFailure(error);
    return parseAccountState(data, context.userId);
  } catch (error) {
    if (context.signal.aborted) throw new AccountStateError("cancelled");
    throw accountStateFailure(error);
  } finally {
    clearTimeout(deadline);
    context.signal.removeEventListener("abort", abort);
  }
}
