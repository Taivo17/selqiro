import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { bindContentStoreCategoryKey, ContentStoreCategoryError, parseContentCategoryIds, parseContentStoreCategories,
  parseContentStoreCategoryRead, parseContentStoreCategoryReceipt, type ContentStoreCategoryKey,
  type ContentStoreCategorySnapshot, type ContentStoreCategoryReceipt } from "../model/contentCategories";

export type ContentStoreCategoryApi = {
  read(key: ContentStoreCategoryKey, signal?: AbortSignal): Promise<ContentStoreCategorySnapshot>;
  save(key: ContentStoreCategoryKey, categoryIds: readonly string[], signal?: AbortSignal): Promise<ContentStoreCategoryReceipt>;
};
const pageSize = 500;
function alive(signal: AbortSignal) { if (signal.aborted) throw new ContentStoreCategoryError("context"); }
function rejectRpc(error: unknown, writing: boolean, contextError: string): never {
  const problem = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {};
  if (problem.code === "42501") throw new ContentStoreCategoryError(problem.message === contextError ? "context" : "forbidden");
  if (["22023", "22P02", "22003", "23503", "23514"].includes(String(problem.code))) throw new ContentStoreCategoryError("invalid");
  throw new ContentStoreCategoryError(writing ? "unknown" : "read");
}
/** UI pre/postflight only; each canonical-content RPC independently authorizes ownership. */
async function verifyScope(key: ContentStoreCategoryKey, token: string, signal: AbortSignal) {
  alive(signal);
  const session = await supabaseBrowserClient.auth.getSession();
  alive(signal);
  if (session.error) throw new ContentStoreCategoryError("read");
  if (session.data.session?.user.id !== key.userId) throw new ContentStoreCategoryError("context");
  const [profile, access] = await Promise.all([
    supabaseBrowserClient.from("profiles").select("active_identity_id").eq("id", key.userId)
      .setHeader("Authorization", `Bearer ${token}`).abortSignal(signal).maybeSingle(),
    supabaseBrowserClient.rpc("current_user_has_identity_access", { p_identity_id: key.identityId })
      .setHeader("Authorization", `Bearer ${token}`).abortSignal(signal),
  ]);
  alive(signal);
  if (profile.error || access.error) throw new ContentStoreCategoryError("read");
  if (profile.data?.active_identity_id !== key.identityId || access.data !== true) throw new ContentStoreCategoryError("context");
}
async function scoped<T>(key: ContentStoreCategoryKey, writing: boolean,
  work: (token: string, signal: AbortSignal, dispatched: () => void) => Promise<T>, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let dispatched = false, acknowledged = false;
  const run = async () => {
    alive(controller.signal);
    const session = await supabaseBrowserClient.auth.getSession();
    alive(controller.signal);
    const token = session.data.session?.access_token;
    if (session.error) throw new ContentStoreCategoryError("read");
    if (session.data.session?.user.id !== key.userId || typeof token !== "string" || !token
      || token.length > 8192 || /\s/.test(token)) throw new ContentStoreCategoryError("context");
    const user = await supabaseBrowserClient.auth.getUser(token);
    alive(controller.signal);
    if (user.error) throw new ContentStoreCategoryError("read");
    if (user.data.user?.id !== key.userId) throw new ContentStoreCategoryError("context");
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
    if (signal?.aborted) throw new ContentStoreCategoryError("context");
    const cancelled = new Promise<never>((_resolve, reject) => {
      cancel = () => { controller.abort(); reject(new ContentStoreCategoryError(dispatched && writing ? "unknown" : "read")); };
      signal?.addEventListener("abort", cancel, { once: true });
      timer = setTimeout(cancel, 20000);
    });
    return await Promise.race([run(), cancelled]);
  } catch (error) {
    if (acknowledged || writing && dispatched && !(error instanceof ContentStoreCategoryError)) throw new ContentStoreCategoryError("unknown");
    if (error instanceof ContentStoreCategoryError && (dispatched || error.code !== "unknown")) throw error;
    throw new ContentStoreCategoryError("read");
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
      throw new ContentStoreCategoryError("read");
    total = page.count; rows.push(...page.data);
  } while (rows.length < total);
  return parseContentStoreCategories(rows, identityId);
}
type Contract = Readonly<{readRpc: string; saveRpc: string; idParameter: string; idField: string; contextError: string}>;
/** One authenticated transport; adapters keep canonical horse and service IDs distinct. */
export function createContentStoreCategoryApi(contract: Contract): ContentStoreCategoryApi {
  return {
  read(input, signal) {
    const key = bindContentStoreCategoryKey(input);
    return scoped(key, false, async (token, active) => {
      const [available, assignments] = await Promise.all([
        categories(key.identityId, token, active),
        supabaseBrowserClient.rpc(contract.readRpc, {
          [contract.idParameter]: key.contentId, p_expected_identity_id: key.identityId,
        }).setHeader("Authorization", `Bearer ${token}`).abortSignal(active),
      ]);
      if (assignments.error) rejectRpc(assignments.error, false, contract.contextError);
      return { key, categories: available, categoryIds: parseContentStoreCategoryRead(assignments.data, key, contract.idField) };
    }, signal);
  },
  save(input, selected, signal) {
    const key = bindContentStoreCategoryKey(input);
    let categoryIds: string[];
    try { categoryIds = parseContentCategoryIds(selected); } catch { throw new ContentStoreCategoryError("invalid"); }
    return scoped(key, true, async (token, active, dispatched) => {
      dispatched();
      const result = await supabaseBrowserClient.rpc(contract.saveRpc, {
        [contract.idParameter]: key.contentId, p_expected_identity_id: key.identityId, p_category_ids: categoryIds,
      }).setHeader("Authorization", `Bearer ${token}`).abortSignal(active);
      if (result.error) rejectRpc(result.error, true, contract.contextError);
      return parseContentStoreCategoryReceipt(result.data, key, categoryIds, contract.idField);
    }, signal);
  },
};
}
