import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { bindHorseStoreCategoryKey, HorseStoreCategoryError, parseHorseCategoryIds, parseHorseStoreCategories,
  parseHorseStoreCategoryRead, parseHorseStoreCategoryReceipt, type HorseStoreCategoryKey,
  type HorseStoreCategorySnapshot, type HorseStoreCategoryReceipt } from "../model/storeCategories";

export type HorseStoreCategoryApi = {
  read(key: HorseStoreCategoryKey, signal?: AbortSignal): Promise<HorseStoreCategorySnapshot>;
  save(key: HorseStoreCategoryKey, categoryIds: readonly string[], signal?: AbortSignal): Promise<HorseStoreCategoryReceipt>;
};
const pageSize = 500;
function alive(signal: AbortSignal) { if (signal.aborted) throw new HorseStoreCategoryError("context"); }
function rejectRpc(error: unknown, writing: boolean): never {
  const problem = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {};
  if (problem.code === "42501") throw new HorseStoreCategoryError(problem.message === "horse_store_category_context_changed" ? "context" : "forbidden");
  if (["22023", "22P02", "22003", "23503", "23514"].includes(String(problem.code))) throw new HorseStoreCategoryError("invalid");
  throw new HorseStoreCategoryError(writing ? "unknown" : "read");
}
/** UI pre/postflight only; both horse RPCs independently authorize ownership. */
async function verifyScope(key: HorseStoreCategoryKey, token: string, signal: AbortSignal) {
  alive(signal);
  const session = await supabaseBrowserClient.auth.getSession();
  alive(signal);
  if (session.error) throw new HorseStoreCategoryError("read");
  if (session.data.session?.user.id !== key.userId) throw new HorseStoreCategoryError("context");
  const [profile, access] = await Promise.all([
    supabaseBrowserClient.from("profiles").select("active_identity_id").eq("id", key.userId)
      .setHeader("Authorization", `Bearer ${token}`).abortSignal(signal).maybeSingle(),
    supabaseBrowserClient.rpc("current_user_has_identity_access", { p_identity_id: key.identityId })
      .setHeader("Authorization", `Bearer ${token}`).abortSignal(signal),
  ]);
  alive(signal);
  if (profile.error || access.error) throw new HorseStoreCategoryError("read");
  if (profile.data?.active_identity_id !== key.identityId || access.data !== true) throw new HorseStoreCategoryError("context");
}
async function scoped<T>(key: HorseStoreCategoryKey, writing: boolean,
  work: (token: string, signal: AbortSignal, dispatched: () => void) => Promise<T>, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let dispatched = false, acknowledged = false;
  const run = async () => {
    alive(controller.signal);
    const session = await supabaseBrowserClient.auth.getSession();
    alive(controller.signal);
    const token = session.data.session?.access_token;
    if (session.error) throw new HorseStoreCategoryError("read");
    if (session.data.session?.user.id !== key.userId || typeof token !== "string" || !token
      || token.length > 8192 || /\s/.test(token)) throw new HorseStoreCategoryError("context");
    const user = await supabaseBrowserClient.auth.getUser(token);
    alive(controller.signal);
    if (user.error) throw new HorseStoreCategoryError("read");
    if (user.data.user?.id !== key.userId) throw new HorseStoreCategoryError("context");
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
    if (signal?.aborted) throw new HorseStoreCategoryError("context");
    const cancelled = new Promise<never>((_resolve, reject) => {
      cancel = () => { controller.abort(); reject(new HorseStoreCategoryError(dispatched && writing ? "unknown" : "read")); };
      signal?.addEventListener("abort", cancel, { once: true });
      timer = setTimeout(cancel, 20000);
    });
    return await Promise.race([run(), cancelled]);
  } catch (error) {
    if (acknowledged || writing && dispatched && !(error instanceof HorseStoreCategoryError)) throw new HorseStoreCategoryError("unknown");
    if (error instanceof HorseStoreCategoryError && (dispatched || error.code !== "unknown")) throw error;
    throw new HorseStoreCategoryError("read");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener("abort", cancel); controller.abort();
  }
}
async function categories(identityId: string, token: string, signal: AbortSignal) {
  const rows: unknown[] = [];
  let total: number | null = null;
  do {
    alive(signal);
    const page = await supabaseBrowserClient.from("store_categories")
      .select("id,identity_id,name,sort_order,parent_id", { count: "exact" }).eq("identity_id", identityId)
      .order("id", { ascending: true }).range(rows.length, rows.length + pageSize - 1)
      .setHeader("Authorization", `Bearer ${token}`).abortSignal(signal);
    alive(signal);
    if (page.error || !Array.isArray(page.data) || page.data.length > pageSize || !Number.isSafeInteger(page.count)
      || page.count === null || page.count < 0 || total !== null && page.count !== total
      || rows.length + page.data.length > page.count || page.data.length === 0 && rows.length < page.count)
      throw new HorseStoreCategoryError("read");
    total = page.count; rows.push(...page.data);
  } while (rows.length < total);
  return parseHorseStoreCategories(rows, identityId);
}
export const horseStoreCategoryApi: HorseStoreCategoryApi = {
  read(input, signal) {
    const key = bindHorseStoreCategoryKey(input);
    return scoped(key, false, async (token, active) => {
      const [available, assignments] = await Promise.all([
        categories(key.identityId, token, active),
        supabaseBrowserClient.rpc("get_my_horse_offer_store_categories_v1", {
          p_offer_id: key.offerId, p_expected_identity_id: key.identityId,
        }).setHeader("Authorization", `Bearer ${token}`).abortSignal(active),
      ]);
      if (assignments.error) rejectRpc(assignments.error, false);
      return { key, categories: available, categoryIds: parseHorseStoreCategoryRead(assignments.data, key) };
    }, signal);
  },
  save(input, selected, signal) {
    const key = bindHorseStoreCategoryKey(input);
    let categoryIds: string[];
    try { categoryIds = parseHorseCategoryIds(selected); } catch { throw new HorseStoreCategoryError("invalid"); }
    return scoped(key, true, async (token, active, dispatched) => {
      dispatched();
      const result = await supabaseBrowserClient.rpc("set_my_horse_offer_store_categories_v1", {
        p_offer_id: key.offerId, p_expected_identity_id: key.identityId, p_category_ids: categoryIds,
      }).setHeader("Authorization", `Bearer ${token}`).abortSignal(active);
      if (result.error) rejectRpc(result.error, true);
      return parseHorseStoreCategoryReceipt(result.data, key, categoryIds);
    }, signal);
  },
};
