import type {PublicationActor} from "../../listing/model/publicationJourney";
import {isUploadUuid, uploadRecord} from "../../listing/model/privatePublicationUpload";
import {listingDeadlineMicros} from "../../listing/model/listingActivity";
import {bindServiceOwnerPage, bindServiceOwnerSnapshot, type ServiceOwnerPage, type ServiceOwnerSnapshot} from "./servicePublication";
import {SERVICE_STATUSES, type ServiceStatus} from "./types";

export const SERVICE_ACTIVITY_DAYS = 365;
export type ServiceValidity = Readonly<{
  activeUntil: string | null;
  origin: "transition" | "publication" | null;
  lastConfirmedAt: string | null;
  isExpired: boolean;
  canRenew: boolean;
  serverNow: string;
  /** Local receipt time anchors the display clock to the server, not the device clock. */
  receivedAt: number;
}>;
export type ServiceActivitySnapshot = Readonly<{
  serviceId: string; identityId: string; status: ServiceStatus; activity: ServiceValidity;
}>;
export type ServiceOwnerActivitySnapshot = ServiceOwnerSnapshot & Readonly<{activity: ServiceValidity}>;
export type ServiceOwnerActivityPage = Omit<ServiceOwnerPage, "items"> & Readonly<{items: readonly ServiceOwnerActivitySnapshot[]}>;
export type ServiceRenewalInput = Readonly<{actor: PublicationActor; serviceId: string; expectedActiveUntil: string}>;
export type ServiceRenewalResult = ServiceActivitySnapshot & Readonly<{changed: boolean}>;
export type ServiceActivityFailureKind = "conflict" | "forbidden" | "invalid" | "uncertain";

const invalid = (): never => {throw new Error("outcome_unknown");};
const exact = (row: Record<string, unknown>, keys: readonly string[]) => keys.length === Object.keys(row).length && keys.every(key => Object.hasOwn(row, key));
const finiteTimestamp = (value: unknown): value is string => typeof value === "string" && listingDeadlineMicros(value) !== null;

function bindValidity(value: unknown, status: ServiceStatus, receivedAt: number): ServiceValidity {
  const row = uploadRecord(value);
  if (!row || !exact(row, ["active_until", "origin", "last_confirmed_at", "is_expired", "can_renew", "server_now"])
    || !finiteTimestamp(row.server_now) || !Number.isFinite(receivedAt)
    || row.active_until !== null && !finiteTimestamp(row.active_until)
    || row.last_confirmed_at !== null && !finiteTimestamp(row.last_confirmed_at)
    || ![null, "transition", "publication"].includes(row.origin as string | null)
    || typeof row.is_expired !== "boolean" || typeof row.can_renew !== "boolean") return invalid();
  const deadline = listingDeadlineMicros(row.active_until), now = listingDeadlineMicros(row.server_now)!;
  if ((row.active_until === null) !== (row.origin === null)
    || row.active_until === null && row.last_confirmed_at !== null
    || status === "draft" && deadline !== null
    || row.is_expired !== (deadline !== null && deadline <= now)
    || row.can_renew !== (status !== "draft" && deadline !== null)) return invalid();
  return Object.freeze({activeUntil: row.active_until as string | null, origin: row.origin as ServiceValidity["origin"],
    lastConfirmedAt: row.last_confirmed_at as string | null, isExpired: row.is_expired, canRenew: row.can_renew,
    serverNow: row.server_now, receivedAt});
}

/** The publication reconciler continues to use the immutable v1 contract. */
export function bindServiceOwnerActivitySnapshot(value: unknown, actor: PublicationActor, serviceId: string,
  receivedAt = Date.now()): ServiceOwnerActivitySnapshot | null {
  if (value === null) return null;
  const row = uploadRecord(value);
  if (!row || row.schema_version !== 2 || !Object.hasOwn(row, "activity")) return invalid();
  const {activity, ...legacy} = row;
  const owner = bindServiceOwnerSnapshot({...legacy, schema_version: 1}, actor, serviceId);
  if (!owner) return invalid();
  return Object.freeze({...owner, activity: bindValidity(activity, owner.service.status, receivedAt)});
}

export function bindServiceOwnerActivityPage(value: unknown, actor: PublicationActor, offset: number, limit: number,
  receivedAt = Date.now()): ServiceOwnerActivityPage {
  const row = uploadRecord(value);
  if (!row || row.schema_version !== 2 || !Array.isArray(row.items)) return invalid();
  const items = row.items.map(item => {
    const raw = uploadRecord(item);
    if (!raw || !isUploadUuid(raw.service_id)) return invalid();
    const parsed = bindServiceOwnerActivitySnapshot(raw, actor, raw.service_id, receivedAt);
    if (!parsed) return invalid();
    return parsed;
  });
  const legacyItems = row.items.map(item => {const {activity: _activity, ...legacy} = item as Record<string, unknown>;
    return {...legacy, schema_version: 1};});
  const page = bindServiceOwnerPage({...row, schema_version: 1, items: legacyItems}, actor, offset, limit);
  return Object.freeze({...page, items: Object.freeze(items)});
}

function bindSnapshot(value: unknown, actor: PublicationActor, serviceId: string, renewal: boolean, receivedAt: number): ServiceActivitySnapshot {
  const row = uploadRecord(value);
  const keys = ["schema_version", "content_type", "actor_user_id", "identity_id", "service_id", "status", "activity"];
  if (renewal) keys.push("changed");
  if (!row || !exact(row, keys) || row.schema_version !== 1 || row.content_type !== "service"
    || !isUploadUuid(actor.userId) || !isUploadUuid(actor.identityId) || !isUploadUuid(serviceId)
    || row.actor_user_id !== actor.userId || row.identity_id !== actor.identityId || row.service_id !== serviceId
    || !SERVICE_STATUSES.includes(row.status as ServiceStatus)) return invalid();
  return Object.freeze({serviceId, identityId: actor.identityId, status: row.status as ServiceStatus,
    activity: bindValidity(row.activity, row.status as ServiceStatus, receivedAt)});
}

export function bindServiceActivitySnapshot(value: unknown, actor: PublicationActor, serviceId: string,
  receivedAt = Date.now()): ServiceActivitySnapshot {
  return bindSnapshot(value, actor, serviceId, false, receivedAt);
}

export function validateServiceRenewalInput(input: ServiceRenewalInput) {
  if (!isUploadUuid(input.actor.userId) || !isUploadUuid(input.actor.identityId) || !isUploadUuid(input.serviceId)
    || !finiteTimestamp(input.expectedActiveUntil)) throw Object.assign(new Error("details_invalid"), {kind: "invalid"});
}

export function bindServiceRenewalResult(value: unknown, input: ServiceRenewalInput, receivedAt = Date.now()): ServiceRenewalResult {
  validateServiceRenewalInput(input);
  const result = bindSnapshot(value, input.actor, input.serviceId, true, receivedAt), row = uploadRecord(value)!;
  const before = listingDeadlineMicros(input.expectedActiveUntil)!, after = listingDeadlineMicros(result.activity.activeUntil);
  const now = listingDeadlineMicros(result.activity.serverNow)!, confirmed = listingDeadlineMicros(result.activity.lastConfirmedAt);
  if (typeof row.changed !== "boolean" || result.status === "draft" || after === null
    || (row.changed ? after <= before || after !== now + BigInt(SERVICE_ACTIVITY_DAYS * 86_400_000) * BigInt(1000)
      || confirmed !== now : after !== before)) return invalid();
  return Object.freeze({...result, changed: row.changed});
}

export function serviceActivityFailure(error: unknown): ServiceActivityFailureKind {
  const row = error as {code?: string; message?: string; kind?: string} | null;
  if (row?.code === "40001") return "conflict";
  if (row?.code === "42501" || row?.message === "context_changed") return "forbidden";
  if (row?.kind === "invalid" || ["22023", "23514", "55000"].includes(row?.code ?? "")) return "invalid";
  return "uncertain";
}

export function serviceActivityOf(row: ServiceOwnerActivitySnapshot): ServiceActivitySnapshot {
  return {serviceId: row.service.id, identityId: row.service.identityId, status: row.service.status, activity: row.activity};
}

/** Display only. Eligibility and the next deadline are decided by the server. */
export function serviceActivityDisplay(snapshot: ServiceActivitySnapshot, localNow = Date.now()) {
  const activity = snapshot.activity, deadline = listingDeadlineMicros(activity.activeUntil);
  const elapsed = Number.isFinite(localNow) ? Math.max(0, Math.trunc(localNow - activity.receivedAt)) : 0;
  const serverNow = listingDeadlineMicros(activity.serverNow)! + BigInt(elapsed) * BigInt(1000);
  const expired = deadline !== null && deadline <= serverNow;
  const state = snapshot.status === "draft" ? "draft" : snapshot.status === "archived" ? "paused"
    : deadline === null ? "unknown" : expired ? "expired" : "active";
  return {state, expired, canRenew: activity.canRenew, deadline: deadline === null ? null : new Date(Number(deadline / BigInt(1000)))} as const;
}
