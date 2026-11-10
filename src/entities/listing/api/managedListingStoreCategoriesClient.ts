import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { bindStoreCategoryAssignmentKey, confirmStoreCategoryListing, parseManagedStoreCategories,
  parseManagedStoreCategoryAssignments, parseManagedStoreCategorySaved, parseStoreCategoryIds,
  StoreCategoryAssignmentError, type StoreCategoryAssignmentKey, type StoreCategoryAssignmentSnapshot,
  type StoreCategoryAssignmentReceipt } from "../model/managedListingStoreCategories";

export type ManagedListingStoreCategoryApi = {
  read(key: StoreCategoryAssignmentKey, signal?: AbortSignal): Promise<StoreCategoryAssignmentSnapshot>;
  save(key: StoreCategoryAssignmentKey, categoryIds: readonly string[], signal?: AbortSignal): Promise<StoreCategoryAssignmentReceipt>;
};
type Page = { data: unknown; error: unknown; count: number | null };
const pageSize = 500;
function alive(signal: AbortSignal) { if (signal.aborted) throw new StoreCategoryAssignmentError("context"); }
function rejectWrite(error: unknown): never {
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  if (code === "42501") throw new StoreCategoryAssignmentError("forbidden");
  if (["22023", "22P02", "22003", "23503", "23514"].includes(String(code))) throw new StoreCategoryAssignmentError("invalid");
  throw new StoreCategoryAssignmentError("unknown");
}
async function readPages(send: (offset: number) => PromiseLike<Page>, signal: AbortSignal): Promise<unknown[]> {
  const rows: unknown[] = [];
  let total: number | null = null;
  do {
    alive(signal);
    const page = await send(rows.length);
    alive(signal);
    if (page.error || !Array.isArray(page.data) || page.data.length > pageSize || !Number.isSafeInteger(page.count)
      || page.count === null || page.count < 0 || total !== null && page.count !== total
      || rows.length + page.data.length > page.count || page.data.length === 0 && rows.length < page.count)
      throw new StoreCategoryAssignmentError("read");
    total = page.count; rows.push(...page.data);
  } while (rows.length < total);
  return rows;
}
/** The exact token is captured once and attached to every query. A global client
 * session change cannot select another actor while a request is being sent. */
async function verifyScope(key: StoreCategoryAssignmentKey, token: string, signal: AbortSignal) {
  alive(signal);
  const session = await supabaseBrowserClient.auth.getSession();
  alive(signal);
  if (session.error) throw new StoreCategoryAssignmentError("read");
  if (session.data.session?.user.id !== key.userId) throw new StoreCategoryAssignmentError("context");
  const authorization = `Bearer ${token}`;
  const [profile, access, listing] = await Promise.all([
    supabaseBrowserClient.from("profiles").select("active_identity_id").eq("id", key.userId)
      .setHeader("Authorization", authorization).abortSignal(signal).maybeSingle(),
    supabaseBrowserClient.rpc("current_user_has_identity_access", { p_identity_id: key.identityId })
      .setHeader("Authorization", authorization).abortSignal(signal),
    supabaseBrowserClient.from("listings").select("id,identity_id").eq("id", key.listingId).eq("identity_id", key.identityId)
      .setHeader("Authorization", authorization).abortSignal(signal).maybeSingle(),
  ]);
  alive(signal);
  if (profile.error || access.error || listing.error) throw new StoreCategoryAssignmentError("read");
  if (profile.data?.active_identity_id !== key.identityId || access.data !== true || !listing.data) throw new StoreCategoryAssignmentError("context");
  confirmStoreCategoryListing(listing.data, key);
}
async function scoped<T>(key: StoreCategoryAssignmentKey, writing: boolean,
  work: (token: string, signal: AbortSignal, dispatched: () => void) => Promise<T>, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let dispatched = false, acknowledged = false;
  const run = async () => {
    alive(controller.signal);
    const session = await supabaseBrowserClient.auth.getSession();
    alive(controller.signal);
    const token = session.data.session?.access_token;
    if (session.error) throw new StoreCategoryAssignmentError("read");
    if (session.data.session?.user.id !== key.userId || typeof token !== "string" || !token
      || token.length > 8192 || /\s/.test(token)) throw new StoreCategoryAssignmentError("context");
    const user = await supabaseBrowserClient.auth.getUser(token);
    alive(controller.signal);
    if (user.error) throw new StoreCategoryAssignmentError("read");
    if (user.data.user?.id !== key.userId) throw new StoreCategoryAssignmentError("context");
    await verifyScope(key, token, controller.signal);
    alive(controller.signal);
    const result = await work(token, controller.signal, () => { alive(controller.signal); dispatched = true; });
    acknowledged = writing;
    await verifyScope(key, token, controller.signal);
    alive(controller.signal);
    return result;
  };
  let cancel = () => {}, timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (signal?.aborted) throw new StoreCategoryAssignmentError("context");
    const cancelled = new Promise<never>((_resolve, reject) => {
      cancel = () => {
        controller.abort();
        reject(new StoreCategoryAssignmentError(dispatched && writing ? "unknown" : "read"));
      };
      signal?.addEventListener("abort", cancel, { once: true });
      timer = setTimeout(cancel, 20000);
    });
    return await Promise.race([run(), cancelled]);
  } catch (error) {
    // Cancellation/postflight failure cannot prove that a dispatched write rolled back.
    if (acknowledged || writing && dispatched && !(error instanceof StoreCategoryAssignmentError))
      throw new StoreCategoryAssignmentError("unknown");
    if (error instanceof StoreCategoryAssignmentError && (dispatched || error.code !== "unknown")) throw error;
    throw new StoreCategoryAssignmentError("read");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener("abort", cancel); controller.abort();
  }
}
export const managedListingStoreCategoryApi: ManagedListingStoreCategoryApi = {
  read(input, signal) {
    const key = bindStoreCategoryAssignmentKey(input);
    return scoped(key, false, async (token, active) => {
      const authorization = `Bearer ${token}`;
      const [categories, assignments] = await Promise.all([
        readPages(offset => supabaseBrowserClient.from("store_categories")
          .select("id,identity_id,name,sort_order,parent_id", { count: "exact" }).eq("identity_id", key.identityId)
          .order("id", { ascending: true }).range(offset, offset + pageSize - 1)
          .setHeader("Authorization", authorization).abortSignal(active), active),
        readPages(offset => supabaseBrowserClient.from("listing_store_categories")
          .select("listing_id,store_category_id,listings!inner(identity_id)", { count: "exact" })
          .eq("listing_id", key.listingId).eq("listings.identity_id", key.identityId)
          .order("store_category_id", { ascending: true }).range(offset, offset + pageSize - 1)
          .setHeader("Authorization", authorization).abortSignal(active), active),
      ]);
      return { key, categories: parseManagedStoreCategories(categories, key),
        categoryIds: parseManagedStoreCategoryAssignments(assignments, key) };
    }, signal);
  },
  save(input, selected, signal) {
    const key = bindStoreCategoryAssignmentKey(input);
    let categoryIds: string[];
    try { categoryIds = parseStoreCategoryIds(selected); }
    catch { throw new StoreCategoryAssignmentError("invalid"); }
    return scoped(key, true, async (token, active, dispatched) => {
      dispatched();
      const result = await supabaseBrowserClient.rpc("set_my_listing_store_categories_v2", {
        p_listing_id: key.listingId, p_category_ids: categoryIds,
      }).setHeader("Authorization", `Bearer ${token}`).abortSignal(active);
      if (result.error) rejectWrite(result.error);
      return parseManagedStoreCategorySaved(result.data, key, categoryIds);
    }, signal);
  },
};
