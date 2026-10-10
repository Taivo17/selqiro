import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { getListingActivityActor } from "./getListingActivityActor";
import { classifyListingEditError, ListingEditError, parseListingEditRead, validateListingEditKey,
  type ListingEditActor, type ListingEditKey, type ListingEditSnapshot } from "../model/listingEditSnapshot";
import { listingEditRpcArguments, parseListingEditSaved, type ListingEditCommand, type ListingEditSaved } from "../model/listingEditCommand";

export type ListingEditRpc = (name: "get_my_listing_edit_v1" | "save_my_listing_edit_v1",
  args: Record<string, unknown>, signal: AbortSignal) => PromiseLike<{ data: unknown; error: unknown }>;
export type ListingEditApi = {
  read(key: ListingEditKey, signal?: AbortSignal): Promise<ListingEditSnapshot>;
  save(command: ListingEditCommand, signal?: AbortSignal): Promise<ListingEditSaved>;
};
/** Explicit injection permits contract tests; the live adapter reuses the one existing client. */
export function createListingEditApi(rpc: ListingEditRpc, actor: () => Promise<ListingEditActor>): ListingEditApi {
  async function checked<T>(key: ListingEditKey, writing: boolean,
    send: (signal: AbortSignal) => PromiseLike<{ data: unknown; error: unknown }>, parse: (data: unknown) => T, signal?: AbortSignal): Promise<T> {
    validateListingEditKey(key);
    let dispatched = false;
    const controller = new AbortController();
    let cancel: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const matches = (current: ListingEditActor) => current.userId === key.userId && current.identityId === key.identityId;
    const work = async (): Promise<T> => {
      try {
        if (!matches(await actor()) || controller.signal.aborted) throw new ListingEditError("context");
        dispatched = true;
        const { data, error } = await send(controller.signal);
        if (error) throw classifyListingEditError(error);
        const result = parse(data);
        let confirmed: ListingEditActor;
        try { confirmed = await actor(); }
        catch { throw new ListingEditError(writing ? "unknown" : "context"); }
        if (!matches(confirmed) || controller.signal.aborted) throw new ListingEditError(writing ? "unknown" : "context");
        return result;
      } catch (error) {
        if (!dispatched) throw new ListingEditError("context");
        throw classifyListingEditError(error);
      }
    };
    if (signal?.aborted) throw new ListingEditError("context");
    try {
      // Bound the whole preflight/RPC/postflight. A slow preflight cannot dispatch after timeout.
      // Abort is NOT proof of database rollback; an unconfirmed write stays unknown.
      const timeout = new Promise<never>((_, reject) => {
        cancel = () => { controller.abort(); reject(new ListingEditError(dispatched && writing ? "unknown" : "context")); };
        signal?.addEventListener("abort", cancel, { once: true });
        timer = setTimeout(cancel, 20_000);
      });
      return await Promise.race([work(), timeout]);
    } finally { if (timer !== undefined) clearTimeout(timer); if (cancel) signal?.removeEventListener("abort", cancel); }
  }
  return {
    read(key, signal) {
      const bound = Object.freeze({ ...key });
      return checked(bound, false, signal => rpc("get_my_listing_edit_v1", {
        p_listing_id: bound.listingId, p_expected_identity_id: bound.identityId, p_expected_actor_id: bound.userId,
      }, signal), data => parseListingEditRead(data, bound), signal);
    },
    save(command, signal) {
      // Copy and validate BEFORE yielding; caller mutation cannot change an in-flight command.
      const args = listingEditRpcArguments(command);
      const bound: ListingEditCommand = Object.freeze({ key: Object.freeze({ ...command.key }),
        baseline: parseListingEditRead({ schema_version: 1, actor_id: command.key.userId, snapshot: command.baseline }, command.key),
        basics: Object.freeze({ ...command.basics }),
        ...(command.priceChange === undefined ? {} : { priceChange: Object.freeze({ ...command.priceChange }) }) });
      return checked(bound.key, true, signal => rpc("save_my_listing_edit_v1", args, signal), data => parseListingEditSaved(data, bound), signal);
    },
  };
}
/** Not imported by a route yet. SQL adapter and legacy-writer cutover must be verified before activation. */
export const listingEditApi = createListingEditApi(
  (name, args, signal) => supabaseBrowserClient.rpc(name, args).abortSignal(signal),
  getListingActivityActor,
);
