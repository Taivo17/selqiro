import "server-only";
import { privateUploadHttp, type UploadFetch } from "../../entities/listing/api/privateUploadHttp";
import { parsePublicDetailV1 } from "../../entities/listing/model/publicRead/publicDetailV1";
import { parsePublicHorse } from "../../entities/horse-offer/model/publicHorse";
import { parsePublicService } from "../../entities/service/model/publicService";
import { parsePublicJob } from "../../entities/job/model/jobParsers";
import { HOSTED_PORTAL_ORIGIN, HOSTED_PORTAL_PROJECT_REF } from "../../shared/config/hostedPreviewProtocol";
import type { OfferKind } from "../../shared/marketplace/offerTheme";
import { publicOfferUrl } from "../../shared/sharing/offerLink";

export type AnonymousPreviewConfig = Readonly<{ projectOrigin: string; publicKey: string }>;
export type PublicOfferPreview = Readonly<{ url: string; title: string; description: string; image: string | null }>;

function anonymousHeaders(config: AnonymousPreviewConfig): Record<string, string> | null {
  if (config.projectOrigin !== `https://${HOSTED_PORTAL_PROJECT_REF}.supabase.co`
    || typeof config.publicKey !== "string" || config.publicKey.length > 8192 || /\s/.test(config.publicKey)) return null;
  const headers: Record<string, string> = {apikey: config.publicKey, "content-type": "application/json"};
  if (/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(config.publicKey)) return headers;
  // An accidentally supplied privileged or user key must not turn a public
  // preview into an owner read. No session, cookie or service key is consulted.
  const parts = config.publicKey.split(".");
  if (parts.length !== 3 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) return null;
  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object" || !("role" in payload) || payload.role !== "anon") return null;
  } catch { return null; }
  headers.authorization = "Bearer " + config.publicKey;
  return headers;
}

/** Metadata may reference only verified public routes or this project's public
 * Storage objects. Private/signed URLs, trackers and arbitrary hosts are omitted. */
export function publicPreviewImage(value: unknown, kind: OfferKind, projectOrigin: string): string | null {
  if (typeof value !== "string" || value.length > 4096 || /[\u0000-\u0020\\]/.test(value)) return null;
  const route = kind === "horse" ? "horse" : kind;
  if (kind !== "job" && new RegExp("^/api/v2/" + route + "-media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]$").test(value))
    return HOSTED_PORTAL_ORIGIN + value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === projectOrigin && !url.username && !url.password
      && !url.search && !url.hash && url.pathname.startsWith("/storage/v1/object/public/") ? url.href : null;
  } catch { return null; }
}
const summary = (text: string | null, limit: number) => Array.from((text || "")
  .replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()).slice(0, limit).join("");

export async function readAnonymousOfferPreview(kind: OfferKind, id: string, config: AnonymousPreviewConfig,
  fetcher: UploadFetch = fetch): Promise<PublicOfferPreview | null> {
  const url = publicOfferUrl(kind, id), headers = anonymousHeaders(config);
  if (typeof window !== "undefined" || !url || !headers) return null;
  const call = kind === "listing" ? ["get_public_listing_detail_v1", {p_listing_id: id}] as const
    : kind === "horse" ? ["get_public_horse_offer_v1", {p_offer_id: id}] as const
    : kind === "service" ? ["get_public_service_v1", {p_service_id: id}] as const
    : ["get_public_job_v1", {p_job_id: id}] as const;
  try {
    const response = await privateUploadHttp(fetcher, config.projectOrigin + "/rest/v1/rpc/" + call[0],
      {method: "POST", headers, body: JSON.stringify(call[1])}, {timeoutMs: 5000, responseBytes: 65536});
    if (response.status !== 200 || response.json === null) return null;
    let title: string | null, description: string | null, image: string | null;
    if (kind === "listing") {
      const item = parsePublicDetailV1(response.json, id).item; if (!item) return null;
      if (item.active_until && Date.parse(item.active_until) <= Date.now()) return null;
      title = item.title; description = item.description; image = item.image_url;
    } else if (kind === "horse") {
      const item = parsePublicHorse(response.json, id); if (!item) return null;
      if (item.activeUntil && Date.parse(item.activeUntil) <= Date.now()) return null;
      title = item.title; description = item.description; image = item.images[0]?.url ?? null;
    } else if (kind === "service") {
      const item = parsePublicService(response.json, id); if (!item) return null;
      title = item.title; description = item.description; image = item.images[0]?.url ?? null;
    } else {
      const item = parsePublicJob(response.json, id);
      if (item.status !== "published" || Date.parse(item.active_until) <= Date.now()) return null;
      title = item.content.title; description = item.content.description; image = item.employer.logo_url;
    }
    return Object.freeze({url, title: summary(title, 160) || "Selqiro",
      description: summary(description, 260) || "View this public offer on Selqiro.",
      image: publicPreviewImage(image, kind, config.projectOrigin)});
  } catch { return null; }
}
