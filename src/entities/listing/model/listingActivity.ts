import { getCatalogTranslation, localeForLanguage, type TranslationParams } from "../../../../lib/i18n/useTranslation";
import { listingPresentationMessages } from "../../../../lib/i18n/catalogs/listingPresentation";
import type { Language } from "../../../../lib/i18n/translations";

/** Ordinary-listing display only. Server time/authorization remain authoritative. */
export const LISTING_ACTIVITY_DAYS = 90;
export const LISTING_ACTIVITY_DAY_MS = 86_400_000;

/** Exact finite ISO timestamp -> microseconds. Never serialize this back for CAS. */
export function listingDeadlineMicros(value: unknown): bigint | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}(?::\d{2})?)$/.exec(value);
  if (!m) return null;
  const [y, month, d, h, min, sec] = m.slice(1, 7).map(Number);
  if (y < 1 || month < 1 || month > 12 || d < 1 || h > 23 || min > 59 || sec > 59) return null;
  const date = new Date(0);
  date.setUTCFullYear(y, month - 1, d);
  date.setUTCHours(h, min, sec, 0);
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== d) return null;
  const zone = m[8];
  const zh = zone === "Z" ? 0 : Number(zone.slice(1, 3));
  const zm = zone.length > 3 ? Number(zone.slice(4)) : 0;
  if (zh > 15 || zm > 59) return null;
  const offset = (zh * 60 + zm) * (zone[0] === "-" ? -1 : 1);
  return BigInt(date.getTime() - offset * 60_000) * BigInt(1000)
    + BigInt((m[7] || "").padEnd(6, "0"));
}

export function isRenewableListingId(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d{0,18}$/.test(value)
    && BigInt(value) <= BigInt("9223372036854775807");
}

export type ListingActivity = {
  state: "active" | "expired" | "paused" | "sold" | "unknown";
  label: string;
  deadlineLabel: string;
  canRenew: boolean;
};

export function getListingActivity(status: string, deadline: string | null, now = Date.now(), language: Language = "en"): ListingActivity {
  const t = (key: keyof typeof listingPresentationMessages.en, params?: TranslationParams) => getCatalogTranslation(language, listingPresentationMessages, key, params);
  if (status !== "active") {
    const state = status === "paused" || status === "sold" ? status : "unknown";
    return { state, label: state === "paused" ? t("paused") : state === "sold" ? t("sold") : t("status_check"),
      deadlineLabel: "", canRenew: false };
  }
  if (deadline === null) return { state: "active", label: t("active"), deadlineLabel: t("deadline_unset"), canRenew: false };
  const micros = listingDeadlineMicros(deadline);
  if (micros === null || !Number.isFinite(now)) {
    return { state: "unknown", label: t("deadline_check"), deadlineLabel: "", canRenew: false };
  }
  const current = BigInt(Math.trunc(now)) * BigInt(1000);
  const expired = micros <= current;
  const shown = new Intl.DateTimeFormat(localeForLanguage(language), { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(Number(micros / BigInt(1000))));
  return { state: expired ? "expired" : "active", label: expired ? t("expired") : t("active"),
    deadlineLabel: t(expired ? "expired_at" : "valid_until", {date: shown}),
    canRenew: micros < current + BigInt(LISTING_ACTIVITY_DAYS * LISTING_ACTIVITY_DAY_MS) * BigInt(1000) };
}
