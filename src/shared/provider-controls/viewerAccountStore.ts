import { supabaseBrowserClient } from "../supabase/browserClient";

export type ViewerAccountActor = Readonly<{ userId: string; accessToken: string; generation: number; signal: AbortSignal }>;
export type ViewerAccountSnapshot = Readonly<{ actor: ViewerAccountActor | null; ready: boolean; error: boolean; generation: number }>;
type Session = { user: { id: string }; access_token: string } | null;
type Auth = {
  getSession: () => PromiseLike<{ data: { session: Session }; error: unknown }>;
  onAuthStateChange: (callback: (event: string, session: Session) => void) => { data: { subscription: { unsubscribe: () => void } } };
};
const initial: ViewerAccountSnapshot = Object.freeze({actor: null, ready: false, error: false, generation: 0});
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** One account observation for all result cards and private controls. No identity
 * lookup is needed: these preferences belong to the signed-in account. */
export function createViewerAccountStore(auth: Auth) {
  let snapshot = initial, generation = 0, readVersion = 0;
  let controller: AbortController | null = null, subscription: {unsubscribe: () => void} | null = null;
  let deadline: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();
  const emit = (next: ViewerAccountSnapshot) => {snapshot = Object.freeze(next); for (const listener of listeners) listener();};
  function retire() {controller?.abort(); controller = null; generation += 1;}
  function accept(session: Session) {
    if (deadline) clearTimeout(deadline); deadline = null;
    const userId = session?.user.id ?? null;
    if (session && (!uuid(userId!) || !session.access_token)) return fail();
    if (!snapshot.ready || snapshot.error || snapshot.actor?.userId !== userId) retire();
    if (session) {
      controller ??= new AbortController();
      const actor = Object.freeze({userId: session.user.id, accessToken: session.access_token, generation, signal: controller.signal});
      emit({actor, ready: true, error: false, generation});
    } else emit({actor: null, ready: true, error: false, generation});
  }
  function fail() {
    if (deadline) clearTimeout(deadline); deadline = null;
    retire(); emit({actor: null, ready: false, error: true, generation});
  }
  function refresh() {
    const version = ++readVersion;
    if (deadline) clearTimeout(deadline);
    deadline = setTimeout(() => {if (version === readVersion && listeners.size) {readVersion += 1; fail();}}, 15000);
    void Promise.resolve().then(() => auth.getSession()).then(({data, error}) => {
      if (version !== readVersion || !listeners.size) return;
      if (error) fail(); else accept(data.session);
    }).catch(() => {if (version === readVersion && listeners.size) fail();});
  }
  function start() {
    subscription = auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      // Invalidate synchronously. Never make an auth call under Supabase's lock.
      readVersion += 1; accept(event === "SIGNED_OUT" ? null : session);
    }).data.subscription;
    refresh();
  }
  return Object.freeze({
    getSnapshot: () => snapshot, getServerSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener); if (listeners.size === 1) start();
      return () => {listeners.delete(listener); if (!listeners.size) {
        readVersion += 1; subscription?.unsubscribe(); subscription = null;
        if (deadline) clearTimeout(deadline); deadline = null;
        retire(); snapshot = Object.freeze({...initial, generation});
      }};
    },
    refresh,
    isCurrent(actor: ViewerAccountActor) {
      return !!listeners.size && snapshot.ready && !snapshot.error && snapshot.actor?.userId === actor.userId
        && snapshot.generation === actor.generation && !actor.signal.aborted;
    },
  });
}
export const viewerAccountStore = createViewerAccountStore(supabaseBrowserClient.auth);
