import { AccountStateError, accountStateFailure, isAccountAccessToken, isAccountId,
  type AccountReadContext, type AccountState, type AccountStateFailure } from "../../../entities/accountLifecycle/model/accountState";

export type AccountStateView = Readonly<
  | {phase: "loading"}
  | {phase: "anonymous"}
  | {phase: "error"; error: Exclude<AccountStateFailure, "cancelled">}
  | {phase: "ready"; account: AccountState; email: string | null}
>;
export const accountStateLoading: AccountStateView = Object.freeze({phase: "loading"});
export type AccountStateSource = {
  session: () => Promise<{userId: string; accessToken: string} | null>;
  user: (accessToken: string) => Promise<{userId: string; email: string | null}>;
  read: (context: AccountReadContext) => Promise<AccountState>;
};

/** One account reader; it never resolves, switches or creates an identity. */
export class AccountStateSession {
  private view: AccountStateView = accountStateLoading;
  private listeners = new Set<() => void>();
  private live = false;
  private generation = 0;
  private abort: AbortController | null = null;
  private scheduled: ReturnType<typeof setTimeout> | undefined;
  private deadline: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly source: AccountStateSource) {}
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {this.listeners.add(listener); return () => {this.listeners.delete(listener);};};
  private publish(view: AccountStateView) {
    this.view = Object.freeze(view);
    for (const listener of this.listeners) listener();
  }
  private invalidate() {
    ++this.generation;
    clearTimeout(this.scheduled); clearTimeout(this.deadline);
    this.scheduled = undefined; this.deadline = undefined;
    this.abort?.abort(); this.abort = null;
    return this.generation;
  }
  start() {
    if (this.live) return;
    this.live = true; this.refresh();
  }
  stop() {
    this.live = false; this.invalidate(); this.view = accountStateLoading;
  }
  refresh = () => {
    if (!this.live) return;
    const ticket = this.invalidate(); this.publish(accountStateLoading);
    void this.load(ticket);
  };
  /** Clear private data synchronously, but do no Supabase work inside its Auth callback. */
  authChanged = () => {
    if (!this.live) return;
    const ticket = this.invalidate(); this.publish(accountStateLoading);
    this.scheduled = setTimeout(() => {this.scheduled = undefined; void this.load(ticket);}, 0);
  };
  private async load(ticket: number) {
    const current = () => this.live && this.generation === ticket;
    if (!current()) return;
    const controller = new AbortController(); this.abort = controller;
    const deadline = setTimeout(() => {
      if (!current()) return;
      this.invalidate(); this.publish({phase: "error", error: "readError"});
    }, 20_000);
    this.deadline = deadline;
    try {
      const session = await this.source.session();
      if (!current()) return;
      if (!session) {this.publish({phase: "anonymous"}); return;}
      if (!isAccountId(session.userId) || !isAccountAccessToken(session.accessToken)) throw new AccountStateError("authChanged");
      const verified = await this.source.user(session.accessToken);
      if (!current()) return;
      if (verified.userId !== session.userId) throw new AccountStateError("authChanged");
      const account = await this.source.read({...session, signal: controller.signal});
      if (!current() || controller.signal.aborted) return;
      if (account.actor_user_id !== session.userId) throw new AccountStateError("authChanged");
      const email = typeof verified.email === "string" && verified.email.length <= 320
        && !/[\u0000-\u001f\u007f]/.test(verified.email) ? verified.email : null;
      this.publish({phase: "ready", account, email});
    } catch (error) {
      if (!current()) return;
      const kind = accountStateFailure(error).kind;
      this.publish({phase: "error", error: kind === "cancelled" ? "readError" : kind});
    } finally {
      clearTimeout(deadline);
      if (current()) this.deadline = undefined;
    }
  }
}
