import type {LegacyDiscoveryPage} from "../../../entities/listing/model/legacyDiscoveryTypes";

export type LegacyDiscoveryView<T, M> = {
  key: string; items: T[]; metadata: M | null; loading: boolean; loadingMore: boolean;
  hasMore: boolean; nextOffset: number; error: boolean;
};
export type LegacyDiscoveryLoad<T, M> = (offset: number, signal: AbortSignal, previous: M | null) => Promise<LegacyDiscoveryPage<T, M>>;
type Context<T, M> = {key: string; ready: boolean; signal?: AbortSignal; isCurrent: () => boolean; load: LegacyDiscoveryLoad<T, M>};
export function emptyLegacyDiscovery<T, M>(key = "", loading = true): LegacyDiscoveryView<T, M> {
  return {key, items: [], metadata: null, loading, loadingMore: false, hasMore: false, nextOffset: 0, error: false};
}
/** One serial page sequence. Reset retires the request before publishing empty
 * state; a promise that ignores abort still cannot append to another sequence. */
export function createLegacyDiscoveryPager<T, M>() {
  let view = emptyLegacyDiscovery<T, M>(), generation = 0;
  let context: Context<T, M> | null = null, controller: AbortController | null = null;
  const listeners = new Set<() => void>();
  const emit = (next: LegacyDiscoveryView<T, M>) => {view = next; for (const listener of listeners) listener();};
  function retire() {generation += 1; controller?.abort(); controller = null;}
  async function read(offset: number) {
    const own = context, version = generation;
    if (!own?.ready || !own.isCurrent() || controller) return;
    const request = new AbortController(); controller = request;
    const abort = () => request.abort(); own.signal?.addEventListener("abort", abort, {once: true});
    const current = () => version === generation && context === own && !request.signal.aborted && own.isCurrent();
    emit({...view, loading: offset === 0, loadingMore: offset > 0, error: false});
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let abortRead: (() => void) | undefined;
    try {
      if (own.signal?.aborted) request.abort();
      if (!current()) return;
      const page = await Promise.race([own.load(offset, request.signal, offset === 0 ? null : view.metadata),
        new Promise<never>((_, reject) => {abortRead = () => reject(new Error("Discovery retired"));
          request.signal.addEventListener("abort", abortRead, {once: true});}),
        new Promise<never>((_, reject) => {timeout = setTimeout(() => reject(new Error("Discovery timeout")), 30000);})]);
      if (!current()) return;
      if (!Number.isSafeInteger(page.nextOffset) || page.nextOffset !== offset + page.items.length
        || (page.hasMore && page.items.length === 0)) throw new Error("Invalid discovery page");
      emit({...view, items: offset === 0 ? page.items : [...view.items, ...page.items], metadata: page.metadata,
        nextOffset: page.nextOffset, hasMore: page.hasMore, loading: false, loadingMore: false, error: false});
    } catch {
      if (current()) emit({...view, loading: false, loadingMore: false, hasMore: false, error: true});
    } finally {
      if (timeout) clearTimeout(timeout);
      if (abortRead) request.signal.removeEventListener("abort", abortRead);
      own.signal?.removeEventListener("abort", abort); request.abort();
      if (controller === request) controller = null;
    }
  }
  return {
    getSnapshot: () => view,
    subscribe(listener: () => void) {listeners.add(listener); return () => {listeners.delete(listener);};},
    reset(next: Context<T, M>) {
      retire(); context = next; emit(emptyLegacyDiscovery(next.key, next.ready));
      if (next.ready) void read(0);
    },
    loadMore() {if (!view.loading && !view.loadingMore && view.hasMore) return read(view.nextOffset);},
    refresh() {if (context) {retire(); emit(emptyLegacyDiscovery(context.key, context.ready)); return read(0);}},
    retire,
  };
}
