import type {ViewerAccountActor} from "../../../shared/provider-controls/viewerAccountStore";

export type LegacyDiscoveryReadContext = {
  actor: ViewerAccountActor | null; signal: AbortSignal; isCurrent: () => boolean;
};
export function assertLegacyDiscoveryCurrent(context: LegacyDiscoveryReadContext) {
  if (context.signal.aborted || !context.isCurrent()) throw new Error("Discovery context changed");
}
/** Bind this read to the captured account, including an explicitly anonymous
 * read. The SDK must not choose a different account during its late token read. */
export async function readLegacyDiscovery<T>(query: PromiseLike<{data: T | null; error: unknown}> & {
  abortSignal: (signal: AbortSignal) => unknown; setHeader: (name: string, value: string) => unknown;
}, context: LegacyDiscoveryReadContext): Promise<T | null> {
  assertLegacyDiscoveryCurrent(context);
  const token = context.actor?.accessToken ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token) throw new Error("Discovery configuration unavailable");
  query.abortSignal(context.signal);
  query.setHeader("Authorization", `Bearer ${token}`);
  const result = await query;
  assertLegacyDiscoveryCurrent(context);
  if (result.error) throw new Error("Discovery read unavailable");
  return result.data;
}
