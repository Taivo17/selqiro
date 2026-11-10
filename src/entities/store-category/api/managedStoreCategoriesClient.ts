import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { bindManagedStoreCategoryKey, parseManagedStoreCategoryRows, parseManagedStoreCategoryReceipt,
  prepareManagedStoreCategoryCommand, StoreCategoryManagementError, type ManagedStoreCategoryKey,
  type ManagedStoreCategoryCommand, type ManagedStoreCategorySnapshot, type ManagedStoreCategoryReceipt } from "../model/managedStoreCategories";

export type ManagedStoreCategoryApi = {
  read(key: ManagedStoreCategoryKey, signal?: AbortSignal): Promise<ManagedStoreCategorySnapshot>;
  mutate(key: ManagedStoreCategoryKey, command: ManagedStoreCategoryCommand, signal?: AbortSignal): Promise<ManagedStoreCategoryReceipt>;
};
const pageSize = 500;
function alive(signal: AbortSignal) { if (signal.aborted) throw new StoreCategoryManagementError("context"); }
function rejectWrite(error: unknown): never {
  const row = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {};
  if (row.code === "42501") throw new StoreCategoryManagementError(row.message === "store_category_context_changed" ? "context" : "forbidden");
  if (row.code === "23505") throw new StoreCategoryManagementError("duplicate");
  if (row.code === "40001" && row.message === "store_category_stale") throw new StoreCategoryManagementError("stale");
  if (row.code === "23503" && row.message === "store_category_has_children") throw new StoreCategoryManagementError("has_children");
  if (["22023", "22P02", "22003", "23503", "23514"].includes(String(row.code))) throw new StoreCategoryManagementError("invalid");
  throw new StoreCategoryManagementError("unknown");
}
async function verifyScope(key: ManagedStoreCategoryKey, token: string, signal: AbortSignal) {
  alive(signal);
  const session = await supabaseBrowserClient.auth.getSession();
  alive(signal);
  if (session.error) throw new StoreCategoryManagementError("read");
  if (session.data.session?.user.id !== key.userId) throw new StoreCategoryManagementError("context");
  const authorization = `Bearer ${token}`;
  const [profile, access] = await Promise.all([
    supabaseBrowserClient.from("profiles").select("active_identity_id").eq("id", key.userId)
      .setHeader("Authorization", authorization).abortSignal(signal).maybeSingle(),
    supabaseBrowserClient.rpc("current_user_has_identity_access", { p_identity_id: key.identityId })
      .setHeader("Authorization", authorization).abortSignal(signal),
  ]);
  alive(signal);
  if (profile.error || access.error) throw new StoreCategoryManagementError("read");
  if (profile.data?.active_identity_id !== key.identityId || access.data !== true) throw new StoreCategoryManagementError("context");
}
/** Capture and verify a token once, then pin it on every request in this operation. */
async function scoped<T>(key: ManagedStoreCategoryKey, writing: boolean,
  work: (token: string, signal: AbortSignal, dispatched: () => void) => Promise<T>, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let dispatched = false, acknowledged = false;
  const run = async () => {
    alive(controller.signal);
    const session = await supabaseBrowserClient.auth.getSession();
    alive(controller.signal);
    const token = session.data.session?.access_token;
    if (session.error) throw new StoreCategoryManagementError("read");
    if (session.data.session?.user.id !== key.userId || typeof token !== "string" || !token
      || token.length > 8192 || /\s/.test(token)) throw new StoreCategoryManagementError("context");
    const user = await supabaseBrowserClient.auth.getUser(token);
    alive(controller.signal);
    if (user.error) throw new StoreCategoryManagementError("read");
    if (user.data.user?.id !== key.userId) throw new StoreCategoryManagementError("context");
    await verifyScope(key, token, controller.signal);
    const result = await work(token, controller.signal, () => { alive(controller.signal); dispatched = true; });
    acknowledged = writing;
    await verifyScope(key, token, controller.signal);
    alive(controller.signal);
    return result;
  };
  let cancel = () => {}, timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (signal?.aborted) throw new StoreCategoryManagementError("context");
    const cancelled = new Promise<never>((_resolve, reject) => {
      cancel = () => { controller.abort(); reject(new StoreCategoryManagementError(dispatched && writing ? "unknown" : "read")); };
      signal?.addEventListener("abort", cancel, { once: true }); timer = setTimeout(cancel, 20000);
    });
    return await Promise.race([run(), cancelled]);
  } catch (error) {
    if (acknowledged || writing && dispatched && !(error instanceof StoreCategoryManagementError)) throw new StoreCategoryManagementError("unknown");
    if (error instanceof StoreCategoryManagementError && (dispatched || error.code !== "unknown")) throw error;
    throw new StoreCategoryManagementError("read");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener("abort", cancel); controller.abort();
  }
}
export const managedStoreCategoryApi: ManagedStoreCategoryApi = {
  read(input, signal) {
    const key = bindManagedStoreCategoryKey(input);
    return scoped(key, false, async (token, active) => {
      const rows: unknown[] = []; let total: number | null = null;
      do {
        alive(active);
        const page = await supabaseBrowserClient.from("store_categories")
          .select("id,identity_id,name,sort_order,parent_id", { count: "exact" }).eq("identity_id", key.identityId)
          .order("id", { ascending: true }).range(rows.length, rows.length + pageSize - 1)
          .setHeader("Authorization", `Bearer ${token}`).abortSignal(active);
        alive(active);
        if (page.error || !Array.isArray(page.data) || page.data.length > pageSize || !Number.isSafeInteger(page.count)
          || page.count === null || page.count < 0 || total !== null && page.count !== total
          || rows.length + page.data.length > page.count || page.data.length === 0 && rows.length < page.count)
          throw new StoreCategoryManagementError("read");
        total = page.count; rows.push(...page.data);
      } while (rows.length < total);
      return { key, categories: parseManagedStoreCategoryRows(rows, key) };
    }, signal);
  },
  mutate(input, requested, signal) {
    const key = bindManagedStoreCategoryKey(input), command = prepareManagedStoreCategoryCommand(requested);
    return scoped(key, true, async (token, active, dispatched) => {
      dispatched();
      const result = await supabaseBrowserClient.rpc("manage_my_store_category_v1", {
        p_expected_user_id: key.userId, p_expected_identity_id: key.identityId, p_operation: command.operation,
        p_category_id: command.categoryId, p_parent_id: command.parentId, p_name: command.name, p_expected_name: command.expectedName,
      }).setHeader("Authorization", `Bearer ${token}`).abortSignal(active);
      if (result.error) rejectWrite(result.error);
      return parseManagedStoreCategoryReceipt(result.data, key, command);
    }, signal);
  },
};
