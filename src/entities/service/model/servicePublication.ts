import type { PublicationActor, PublicationSlot } from "../../listing/model/publicationJourney";
import { isUploadUuid, uploadRecord } from "../../listing/model/privatePublicationUpload";
import { SERVICE_PRICE_TYPES, SERVICE_STATUSES, SERVICE_PRICE_MAX, type Service, type ServicePriceType, type ServiceStatus } from "./types";

export type ServicePublicationContent = Readonly<{
  serviceId: string | null; title: string; description: string | null;
  category: string | null; subcategory: string | null; priceAmount: number | null;
  priceType: ServicePriceType; currency: string; country: string | null;
  city: string | null; location: string | null;
}>;
export type ServicePolicySnapshot = Readonly<{ documentId: string; version: string; contentHash: string; accepted: true }>;
export type ServiceGalleryIntent = Readonly<{ imageId: string; isPrimary: boolean } | {
  clientFileId: string; byteLength: number; sha256: string; isPrimary: boolean;
}>;
export type ServicePrepareCommand = Readonly<{
  expectedUserId: string; expectedIdentityId: string; requestKey: string;
  serviceId: string | null; expectedRevision: string | null;
  content: ServicePublicationContent; gallery: readonly ServiceGalleryIntent[];
  policySnapshot: readonly ServicePolicySnapshot[];
}>;
export type ServicePublicationResult = Readonly<{
  schema_version: 1; content_type: "service"; actor_user_id: string; identity_id: string; request_key: string;
  state: "prepared" | "published" | "cancelled" | "not_found";
  attempt_id: string | null; service_id: string | null; edit_revision: string | null;
  slots: readonly PublicationSlot[]; publication_event_id: string | null;
}>;
export type ServicePublicationImage = Readonly<{
  id: string; url: string; thumbnailUrl: string; fullUrl: string; sortOrder: number; isPrimary: boolean;
}>;
export type ServiceOwnerSnapshot = Readonly<{
  service: Service; editRevision: string; images: readonly ServicePublicationImage[];
  policySnapshot: readonly Readonly<{ documentId: string; version: string; contentHash: string }>[];
}>;
export type ServiceOwnerPage = Readonly<{
  items: readonly ServiceOwnerSnapshot[]; totalCount: string; hasMore: boolean;
  nextOffset: number | null; resultLimit: number; resultOffset: number;
}>;
export type ServiceActivityReceipt = Readonly<{
  schema_version: 1; content_type: "service"; actor_user_id: string; identity_id: string;
  service_id: string; edit_revision: string; status: "published" | "archived"; changed: boolean;
}>;
const contentKeys = ["serviceId", "title", "description", "category", "subcategory", "priceAmount", "priceType", "currency", "country", "city", "location"];
const receiptKeys = ["schema_version", "content_type", "actor_user_id", "identity_id", "request_key", "state", "attempt_id", "service_id", "edit_revision", "slots", "publication_event_id"];
const sha = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{64}$/.test(v);
export const isServiceRevision = (v: unknown): v is string => typeof v === "string" && /^[1-9][0-9]{0,18}$/.test(v)
  && BigInt(v) <= BigInt("9223372036854775807");
function invalid(): never { throw new Error("response"); }
function text(value: unknown, limit: number, required = false): string | null {
  if (value === null && !required) return null;
  if (typeof value !== "string" || value.length > limit || value.includes("\u0000")) throw new Error("details_invalid");
  const clean = value.trim();
  if (!clean && required) throw new Error("details_invalid");
  return clean || null;
}
/** Exact service fields only; a photo URL or a foreign content identifier is
 * never accepted as a shortcut around the verified gallery. */
export function normalizeServicePublicationContent(value: unknown, scope: string | null): ServicePublicationContent {
  const r = uploadRecord(value, contentKeys);
  if (r.serviceId !== scope || (scope !== null && !isUploadUuid(scope))) throw new Error("details_invalid");
  const title = text(r.title, 140, true)!;
  // Legacy published/paused rows may retain an unset category or amount. An
  // edit can carry those exact values; SQL checks them against the locked
  // baseline. Creation and draft publication still require complete values.
  const category = text(r.category, 120, scope === null);
  if (title.length < 2 || !SERVICE_PRICE_TYPES.includes(r.priceType as ServicePriceType)) throw new Error("details_invalid");
  const priceAmount = r.priceAmount;
  if (priceAmount !== null && (typeof priceAmount !== "number" || !Number.isFinite(priceAmount)
    || priceAmount < 0 || priceAmount > SERVICE_PRICE_MAX
    || Math.abs(Math.round(priceAmount * 100) - priceAmount * 100) > 0.0002)) throw new Error("details_invalid");
  if (r.priceType === "contact" ? priceAmount !== null : scope === null && priceAmount === null) throw new Error("details_invalid");
  if (typeof r.currency !== "string" || !/^[A-Z]{3}$/.test(r.currency)) throw new Error("details_invalid");
  return Object.freeze({ serviceId: scope, title, description: text(r.description, 5000), category,
    subcategory: text(r.subcategory, 160), priceAmount: priceAmount as number | null,
    priceType: r.priceType as ServicePriceType, currency: r.currency,
    country: text(r.country, 120), city: text(r.city, 160), location: text(r.location, 300) });
}
export function bindServicePrepare(value: unknown, actor: PublicationActor, scope: string | null): ServicePrepareCommand {
  const r = uploadRecord(value, ["expectedUserId", "expectedIdentityId", "requestKey", "serviceId", "expectedRevision", "content", "gallery", "policySnapshot"]);
  if (r.expectedUserId !== actor.userId || r.expectedIdentityId !== actor.identityId || !isUploadUuid(r.requestKey)
    || r.serviceId !== scope || (scope === null ? r.expectedRevision !== null : !isServiceRevision(r.expectedRevision))) return invalid();
  const content = normalizeServicePublicationContent(r.content, scope);
  if (!Array.isArray(r.gallery) || r.gallery.length > 10) throw new Error("images_invalid");
  const ids = new Set<string>(); let bytes = 0;
  const gallery = r.gallery.map(value => {
    const image = uploadRecord(value);
    if (typeof image.isPrimary !== "boolean") throw new Error("images_invalid");
    const id = "imageId" in image ? image.imageId : image.clientFileId;
    if (!isUploadUuid(id) || ids.has(id)) throw new Error("images_invalid");
    ids.add(id);
    if ("imageId" in image) {
      uploadRecord(image, ["imageId", "isPrimary"]);
      if (scope === null) throw new Error("images_invalid");
    } else {
      uploadRecord(image, ["clientFileId", "byteLength", "sha256", "isPrimary"]);
      if (!Number.isSafeInteger(image.byteLength) || Number(image.byteLength) < 1 || Number(image.byteLength) > 25 * 1024 * 1024
        || !sha(image.sha256)) throw new Error("images_invalid");
      bytes += Number(image.byteLength);
    }
    return Object.freeze({ ...image }) as ServiceGalleryIntent;
  });
  if (bytes > 100 * 1024 * 1024 || (gallery.length && gallery.filter(image => image.isPrimary).length !== 1)) throw new Error("images_invalid");
  if (!Array.isArray(r.policySnapshot) || r.policySnapshot.length !== 1) throw new Error("policies_required");
  const policySnapshot = r.policySnapshot.map(value => {
    const p = uploadRecord(value, ["documentId", "version", "contentHash", "accepted"]);
    if (!isUploadUuid(p.documentId) || typeof p.version !== "string" || !p.version || p.version.length > 100
      || !sha(p.contentHash) || p.accepted !== true) throw new Error("policies_required");
    return Object.freeze({ ...p }) as ServicePolicySnapshot;
  });
  return Object.freeze({ ...r, content, gallery: Object.freeze(gallery), policySnapshot: Object.freeze(policySnapshot) }) as ServicePrepareCommand;
}
export function bindServicePublicationResult(value: unknown, command: ServicePrepareCommand, knownAttempt: string | null = null): ServicePublicationResult {
  const r = uploadRecord(value, receiptKeys);
  if (r.schema_version !== 1 || r.content_type !== "service" || r.actor_user_id !== command.expectedUserId
    || r.identity_id !== command.expectedIdentityId || r.request_key !== command.requestKey
    || !["prepared", "published", "cancelled", "not_found"].includes(String(r.state)) || !Array.isArray(r.slots)) return invalid();
  if (r.attempt_id === null) {
    if (!["cancelled", "not_found"].includes(String(r.state)) || r.service_id !== null || r.edit_revision !== null
      || r.publication_event_id !== null || r.slots.length || knownAttempt) return invalid();
  } else {
    if (!isUploadUuid(r.attempt_id) || (knownAttempt !== null && r.attempt_id !== knownAttempt) || r.state === "not_found"
      || !isUploadUuid(r.service_id) || (command.serviceId !== null && r.service_id !== command.serviceId)
      || !isServiceRevision(r.edit_revision)) return invalid();
    if (r.state === "published" ? !isUploadUuid(r.publication_event_id) : r.publication_event_id !== null) return invalid();
    const expected = command.gallery.map((image, ordinal) => ({ image, ordinal })).filter(item => "clientFileId" in item.image);
    if (r.slots.length !== expected.length) return invalid();
    const ids = new Set<string>();
    r.slots.forEach((value: unknown, index: number) => {
      const slot = uploadRecord(value, ["slot_id", "client_file_id", "ordinal", "expected_bytes", "expected_sha256"]);
      const { image, ordinal } = expected[index];
      if (!("clientFileId" in image) || !isUploadUuid(slot.slot_id) || ids.has(slot.slot_id)
        || slot.ordinal !== ordinal || slot.client_file_id !== image.clientFileId
        || slot.expected_bytes !== image.byteLength || slot.expected_sha256 !== image.sha256) return invalid();
      ids.add(slot.slot_id);
    });
  }
  return Object.freeze({ ...r, slots: Object.freeze(r.slots.map((slot: PublicationSlot) => Object.freeze({ ...slot }))) }) as ServicePublicationResult;
}
function timestamp(value: unknown, nullable = false): string | null {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || value.length > 64 || !Number.isFinite(Date.parse(value))) return invalid();
  return value;
}
function imageUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) return invalid();
  if (/^\/api\/v2\/service-owner-media\/[0-9a-f-]{36}\/[0-9]$/.test(value)
    && isUploadUuid(value.split("/")[4])) return value;
  try {
    const u = new URL(value);
    if (u.href === value && u.protocol === "https:" && !u.username && !u.password && !u.search && !u.hash
      && u.pathname.startsWith("/storage/v1/object/public/service-images/")) return value;
  } catch { /* Not a service image. */ }
  return invalid();
}
export function bindServiceOwnerSnapshot(value: unknown, actor: PublicationActor, serviceId: string): ServiceOwnerSnapshot | null {
  if (value === null) return null;
  const r = uploadRecord(value, ["schema_version", "content_type", "actor_user_id", "identity_id", "service_id", "edit_revision",
    "status", "content", "images", "policy_snapshot", "created_at", "updated_at", "published_at", "sort_order"]);
  if (r.schema_version !== 1 || r.content_type !== "service" || r.actor_user_id !== actor.userId || r.identity_id !== actor.identityId
    || r.service_id !== serviceId || !isUploadUuid(serviceId) || !isServiceRevision(r.edit_revision)
    || !SERVICE_STATUSES.includes(r.status as ServiceStatus) || !Number.isSafeInteger(r.sort_order) || Number(r.sort_order) < 0
    || !Array.isArray(r.images) || r.images.length > 10 || !Array.isArray(r.policy_snapshot) || r.policy_snapshot.length > 1) return invalid();
  const rawContent = uploadRecord(r.content, contentKeys);
  const price = rawContent.priceAmount === null ? null : typeof rawContent.priceAmount === "string"
    && /^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/.test(rawContent.priceAmount) ? Number(rawContent.priceAmount) : NaN;
  // Legacy rows may predate the taxonomy or have incomplete price fields.
  // They remain readable; SQL allows unchanged tuples on published/paused
  // edits and requires complete values when publishing a draft or a new row.
  if (rawContent.serviceId !== serviceId || !SERVICE_PRICE_TYPES.includes(rawContent.priceType as ServicePriceType)
    || typeof rawContent.currency !== "string" || !/^[A-Z]{3}$/.test(rawContent.currency)
    || price !== null && (!Number.isFinite(price) || price < 0 || price > SERVICE_PRICE_MAX)) return invalid();
  let content: ServicePublicationContent;
  try {
    content = { serviceId, title: text(rawContent.title, 140, true)!, description: text(rawContent.description, 5000),
      category: text(rawContent.category, 120), subcategory: text(rawContent.subcategory, 160),
      priceAmount: price, priceType: rawContent.priceType as ServicePriceType, currency: rawContent.currency,
      country: text(rawContent.country, 120), city: text(rawContent.city, 160), location: text(rawContent.location, 300) };
  } catch { return invalid(); }
  const ids = new Set<string>();
  const images = r.images.map((value, ordinal) => {
    const im = uploadRecord(value, ["id", "url", "is_primary", "sort_order"]);
    if (!isUploadUuid(im.id) || ids.has(im.id) || im.sort_order !== ordinal || typeof im.is_primary !== "boolean") return invalid();
    ids.add(im.id); const url = imageUrl(im.url);
    return Object.freeze({ id: im.id, url, thumbnailUrl: url, fullUrl: url, sortOrder: ordinal, isPrimary: im.is_primary });
  });
  if (images.length && images.filter(im => im.isPrimary).length !== 1) return invalid();
  const policySnapshot = r.policy_snapshot.map(value => {
    const p = uploadRecord(value, ["document_id", "version", "content_hash"]);
    if (!isUploadUuid(p.document_id) || typeof p.version !== "string" || !p.version || p.version.length > 100 || !sha(p.content_hash)) return invalid();
    return Object.freeze({ documentId: p.document_id, version: p.version, contentHash: p.content_hash });
  });
  const service: Service = { id: serviceId, identityId: actor.identityId, ...content,
    description: content.description ?? "", imageUrl: images.find(im => im.isPrimary)?.url ?? null,
    serviceLat: null, serviceLng: null, status: r.status as ServiceStatus, sortOrder: Number(r.sort_order),
    createdAt: timestamp(r.created_at)!, updatedAt: timestamp(r.updated_at)!, publishedAt: timestamp(r.published_at, true) };
  return Object.freeze({ service: Object.freeze(service), editRevision: r.edit_revision,
    images: Object.freeze(images), policySnapshot: Object.freeze(policySnapshot) });
}
export function bindServiceOwnerPage(value: unknown, actor: PublicationActor, offset: number, limit: number): ServiceOwnerPage {
  const r = uploadRecord(value, ["schema_version", "actor_user_id", "identity_id", "items", "total_count", "result_limit", "result_offset", "has_more", "next_offset"]);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50
    || r.schema_version !== 1 || r.actor_user_id !== actor.userId || r.identity_id !== actor.identityId
    || r.result_offset !== offset || r.result_limit !== limit || !Array.isArray(r.items) || r.items.length > limit
    || typeof r.total_count !== "string" || !/^(?:0|[1-9][0-9]{0,18})$/.test(r.total_count)
    || typeof r.has_more !== "boolean" || (r.has_more ? r.next_offset !== offset + r.items.length || !r.items.length : r.next_offset !== null)
    || BigInt(r.total_count) < BigInt(offset + r.items.length)
    || r.has_more !== (BigInt(r.total_count) > BigInt(offset + r.items.length))) return invalid();
  const ids = new Set<string>();
  const items = r.items.map(value => {
    const raw = uploadRecord(value);
    if (!isUploadUuid(raw.service_id) || ids.has(raw.service_id)) return invalid();
    ids.add(raw.service_id);
    return bindServiceOwnerSnapshot(value, actor, raw.service_id) ?? invalid();
  });
  return Object.freeze({ items: Object.freeze(items), totalCount: r.total_count, hasMore: r.has_more,
    nextOffset: r.next_offset as number | null, resultOffset: offset, resultLimit: limit });
}
export function bindServiceActivityReceipt(value: unknown, actor: PublicationActor, serviceId: string,
  expectedRevision: string, expectedStatus: "published" | "archived", status: "published" | "archived"): ServiceActivityReceipt {
  const r = uploadRecord(value, ["schema_version", "content_type", "actor_user_id", "identity_id", "service_id", "edit_revision", "status", "changed"]);
  if (!isServiceRevision(expectedRevision) || !["published", "archived"].includes(expectedStatus)
    || !["published", "archived"].includes(status) || r.schema_version !== 1 || r.content_type !== "service"
    || r.actor_user_id !== actor.userId || r.identity_id !== actor.identityId || r.service_id !== serviceId
    || !isServiceRevision(r.edit_revision) || r.status !== status || r.changed !== (expectedStatus !== status)
    || BigInt(r.edit_revision) !== BigInt(expectedRevision) + (r.changed ? BigInt(1) : BigInt(0))) return invalid();
  return Object.freeze({ ...r }) as ServiceActivityReceipt;
}
