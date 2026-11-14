import { providerControlsClient, type ProviderControlsClient } from "../../../entities/viewer-provider-controls/api/providerControlsClient";
import { ProviderControlsError, type ProviderControlAction, type ProviderControlState, type ProviderControlTarget } from "../../../entities/viewer-provider-controls/model/types";
import type { ViewerAccountActor } from "../../../shared/provider-controls/viewerAccountStore";
import type { ProviderControlMessage } from "./providerControlMessages";

type BlockPin = Readonly<{id: string; createdAt: string}>;
type Selection = Readonly<{target: ProviderControlTarget; name: string; action: ProviderControlAction; blockPin?: BlockPin}>;
type Pending = Readonly<{before: ProviderControlState; action: ProviderControlAction; revision?: string; uncertain: boolean}>;
export type ProviderControlNotice = Readonly<{state: ProviderControlState; action: ProviderControlAction; message: ProviderControlMessage}>;
export type ProviderControlView = Readonly<{
  open: boolean; selection: Selection | null; state: ProviderControlState | null;
  phase: "idle" | "loading" | "ready" | "writing" | "uncertain" | "error";
  message: ProviderControlMessage | null; notice: ProviderControlNotice | null;
}>;
type Options = {getActor: () => ViewerAccountActor | null; isCurrent: (actor: ViewerAccountActor) => boolean;
  changed: (action: ProviderControlAction) => void; client?: ProviderControlsClient};
export const EMPTY_PROVIDER_CONTROL_VIEW: ProviderControlView = Object.freeze({open: false, selection: null, state: null, phase: "idle", message: null, notice: null});
const initial = EMPTY_PROVIDER_CONTROL_VIEW;

export function providerActionAllowed(state: ProviderControlState, action: ProviderControlAction) {
  if (!state.targetAvailable) return false;
  if (action === "hide") return state.canHide && !state.hidden;
  if (action === "unhide") return state.hidden;
  if (action === "block") return state.canBlock && !state.blockedByMe && !state.blockedByOther;
  return state.blockedByMe;
}
export function providerActionObserved(pending: Pending, state: ProviderControlState) {
  if (state.actorUserId !== pending.before.actorUserId || !state.targetAvailable || state.targetToken !== pending.before.targetToken) return false;
  if (pending.action === "hide") return !!pending.revision && state.hideRevision === pending.revision && state.hidden;
  if (pending.action === "unhide") return !!pending.revision && state.hideRevision === pending.revision && !state.hidden;
  if (pending.action === "block") return state.blockedByMe;
  return !state.blockedByMe;
}

/** Explicit writes only. A lost acknowledgement is reconciled by a read; no
 * timer, focus event, remount or retry can replay a hide and extend its deadline. */
export class ProviderControlSession {
  private view = initial;
  private listeners = new Set<() => void>();
  private pending: Pending | null = null;
  private sequence = 0;
  private retired = false;
  private requests = new Set<AbortController>();
  private readonly client: ProviderControlsClient;
  constructor(private options: Options) {this.client = options.client ?? providerControlsClient;}
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {this.listeners.add(listener); return () => {this.listeners.delete(listener);};};
  private replace(fields: Partial<ProviderControlView>) {
    if (this.retired) return;
    this.view = Object.freeze({...this.view, ...fields}); for (const listener of this.listeners) listener();
  }
  private actor() {const actor = this.options.getActor(); return !this.retired && actor && this.options.isCurrent(actor) ? actor : null;}
  private current(actor: ViewerAccountActor, ticket: number) {return !this.retired && ticket === this.sequence && this.options.isCurrent(actor);}
  private request(actor: ViewerAccountActor) {
    const controller = new AbortController(), abort = () => controller.abort();
    actor.signal.addEventListener("abort", abort, {once: true}); if (actor.signal.aborted) abort();
    this.requests.add(controller);
    return {signal: controller.signal, done: () => {actor.signal.removeEventListener("abort", abort); this.requests.delete(controller);}};
  }
  open(target: ProviderControlTarget, action: ProviderControlAction, name: string) {
    this.select({target, action, name});
  }
  openBlockRemoval(observed: ProviderControlState, name = observed.provider.displayName) {
    const actor = this.actor();
    if (!actor || observed.actorUserId !== actor.userId || !observed.targetAvailable
      || !observed.blockedByMe || !observed.blockId || !observed.blockCreatedAt) return;
    // Pin the row the person saw. Reading the management target may obtain its
    // token, but must never substitute a newer block or a newer row generation.
    this.select({target: {type: "blocked_account", id: observed.blockId}, action: "unblock", name,
      blockPin: Object.freeze({id: observed.blockId, createdAt: observed.blockCreatedAt})});
  }
  private select(selection: Selection) {
    if (this.retired || this.view.phase === "writing") return;
    if (this.pending?.uncertain) {this.replace({open: true}); return;}
    this.sequence += 1; this.pending = null;
    this.replace({open: true, selection, state: null, phase: "loading", message: null});
    if (this.actor()) void this.check();
  }
  close() {if (this.view.phase !== "writing") this.replace({open: false});}
  reopen() {if (this.view.selection) this.replace({open: true});}
  dismissNotice() {this.replace({notice: null});}
  async check() {
    const actor = this.actor(), selection = this.view.selection;
    if (!actor || !selection || this.view.phase === "writing") return;
    const pending = this.pending, ticket = ++this.sequence, request = this.request(actor);
    this.replace({phase: "loading", message: null});
    try {
      const state = await this.client.get(actor, selection.target, request.signal);
      if (!this.current(actor, ticket)) return;
      if (selection.blockPin && state.targetAvailable && (state.blockId !== selection.blockPin.id
        || state.blockCreatedAt !== selection.blockPin.createdAt)) {
        this.pending = null;
        this.replace({state: null, phase: "error", message: "conflict", notice: null});
        this.options.changed("unblock");
        return;
      }
      if (pending?.uncertain) {
        if (providerActionObserved(pending, state)) this.complete(state, pending.action, true);
        else {
          // A verified current read ends the write lock, without claiming that
          // our lost response succeeded. Any further write needs a new explicit
          // confirmation and uses this fresh state/CAS, never the old attempt.
          this.pending = null;
          this.replace({state, phase: "ready", message: "checkedUnknown", notice: null});
          this.options.changed(pending.action);
        }
      } else {
        this.pending = null;
        this.replace({state, phase: "ready", message: pending ? "checked" : null});
      }
    } catch {if (this.current(actor, ticket)) this.replace({phase: pending?.uncertain ? "uncertain" : "error", message: "readError"});}
    finally {request.done();}
  }
  async confirm() {
    const {selection, state, phase} = this.view;
    if (phase !== "ready" || !selection || !state || this.pending?.uncertain || !providerActionAllowed(state, selection.action)) return;
    if (selection.blockPin && (state.blockId !== selection.blockPin.id || state.blockCreatedAt !== selection.blockPin.createdAt)) return;
    await this.write(state, selection.action);
  }
  async undo() {
    const notice = this.view.notice;
    if (!notice || notice.action !== "hide" || !notice.state.hidden || this.pending || this.view.phase === "writing") return;
    // Use the exact confirmed revision. A newer hide from another tab must not
    // be removed by this older Undo button.
    this.replace({selection: {target: notice.state.target, action: "unhide", name: notice.state.provider.displayName}, state: notice.state, open: false});
    await this.write(notice.state, "unhide");
  }
  private async write(before: ProviderControlState, action: ProviderControlAction) {
    const actor = this.actor(); if (!actor || before.actorUserId !== actor.userId || this.view.phase === "writing") return;
    const ticket = ++this.sequence, request = this.request(actor);
    this.replace({phase: "writing", message: null});
    try {
      const result = await this.client.set(actor, before, action, request.signal);
      if (this.current(actor, ticket)) this.complete(result, action, result.changed);
    } catch (error) {
      if (!this.current(actor, ticket)) return;
      const known = error instanceof ProviderControlsError && ["stale", "refused", "unauthorized", "context_changed", "input", "configuration", "unavailable"].includes(error.code);
      this.pending = {before, action, uncertain: !known, revision: error instanceof ProviderControlsError ? error.attemptedRevision : undefined};
      this.replace({phase: known ? "error" : "uncertain", message: known ? "conflict" : "unknown"});
    } finally {request.done();}
  }
  private complete(state: ProviderControlState, action: ProviderControlAction, changed: boolean) {
    this.pending = null;
    const message: ProviderControlMessage = !changed ? "unchanged" : ({hide: "hidden", unhide: "unhidden", block: "blocked", unblock: "unblocked"} as const)[action];
    this.replace({open: false, selection: null, state: null, phase: "idle", message: null, notice: {state, action, message}});
    this.options.changed(action);
  }
  retire() {
    this.retired = true; this.sequence += 1; for (const request of this.requests) request.abort(); this.requests.clear();
    this.pending = null; this.view = initial; this.listeners.clear();
  }
}
