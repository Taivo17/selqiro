import { ensure, record, text } from "../../listing/model/publicRead/priceRead";
import { getCatalogTranslation } from "../../../../lib/i18n/useTranslation";
import type { Language } from "../../../../lib/i18n/translations";
import { horsePublicMessages } from "../../../../lib/i18n/catalogs/horsePublic";
import type { ListingPriceDisplay } from "../../listing/model/priceDisplay";

export const HORSE_TYPES = ["sale", "free_transfer", "lease", "co_rider", "wanted"] as const;
export type PublicHorseType = typeof HORSE_TYPES[number];
export type HorsePrice = Readonly<{ kind: "fixed" | "from" | "free" | "contact" | "budget"; amount: string | null;
 currency: "EUR"; period: "day" | "week" | "month" | "agreed_period" | null }>;
export const horseUuid = (v: unknown): v is string => typeof v === "string"
 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
 && v !== "00000000-0000-0000-0000-000000000000";
export const horseMediaUrl = (v: unknown): string | null => typeof v === "string"
 && /^\/api\/v2\/horse-media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9]$/.test(v) ? v : null;
export function parseHorsePrice(value: unknown, offerType?: PublicHorseType): HorsePrice {
 const p = record(value, ["kind", "amount", "currency", "period"]);
 ensure(["fixed", "from", "free", "contact", "budget"].includes(p.kind as string) && p.currency === "EUR");
 ensure(p.amount === null || (typeof p.amount === "string" && /^\d{1,10}(?:\.\d{1,2})?$/.test(p.amount)));
 ensure(["fixed", "from", "budget"].includes(p.kind as string) ? p.amount !== null : p.amount === null);
 ensure(p.period === null || ["day", "week", "month", "agreed_period"].includes(p.period as string));
 if (offerType) {
  const recurring = offerType === "lease" || offerType === "co_rider";
  ensure(recurring ? p.period !== null : p.period === null);
  ensure(offerType === "wanted" ? ["budget", "contact"].includes(p.kind as string)
   : offerType === "free_transfer" ? p.kind === "free" : ["fixed", "from", "contact"].includes(p.kind as string));
 }
 return Object.freeze({ ...p }) as HorsePrice;
}
export function horsePriceDisplay(p: HorsePrice, language: Language): ListingPriceDisplay {
 const t = (k: keyof typeof horsePublicMessages.en) => getCatalogTranslation(language, horsePublicMessages, k);
 const decimal = p.amount?.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
 const amount = language === "et" ? decimal?.replace(".", ",") : decimal;
 return { priceLabel: p.kind === "free" ? t("free") : p.kind === "contact" ? t("ask")
  : (p.kind === "from" ? t("from") + " " : p.kind === "budget" ? t("maximum") + " " : "") + amount + " €",
  priceNote: p.period ? t(p.period) : null };
}
export const HORSE_PUBLIC_FIELDS = ["horse_name", "birth_year", "sex", "breed", "color", "height_cm", "discipline", "training_level",
 "suitability", "health_notes", "behavior_notes", "preferred_sex", "preferred_breed", "preferred_discipline", "preferred_training_level",
 "intended_use", "health_preferences", "behavior_preferences"] as const;
export type HorsePublicField = typeof HORSE_PUBLIC_FIELDS[number];
const wantedFields: readonly HorsePublicField[] = ["preferred_sex", "preferred_breed", "preferred_discipline", "preferred_training_level",
 "intended_use", "health_preferences", "behavior_preferences"];
export type PublicHorse = Readonly<{ id: string; offerType: PublicHorseType; title: string; description: string; price: HorsePrice;
 country: "EE"; city: string | null; region: string | null; fields: Partial<Record<HorsePublicField, string>>;
 images: readonly { id: string; url: string }[]; sellerName: string; sellerSlug: string | null; sellerType: "private" | "business";
 publishedAt: string; activeUntil: string | null }>;
export function parsePublicHorse(value: unknown, offerId: string): PublicHorse | null {
 if (value === null) return null;
 const r = record(value, ["schema_version", "content_type", "content_id", "offer_type", "title", "description", "price", "country", "city", "region",
  "fields", "images", "seller_name", "seller_slug", "seller_type", "published_at", "active_until"]);
 ensure(horseUuid(offerId) && r.content_id === offerId && r.schema_version === 1 && r.content_type === "horse_offer" && r.country === "EE");
 ensure(HORSE_TYPES.includes(r.offer_type as PublicHorseType) && typeof r.title === "string" && r.title.length <= 140);
 ensure(typeof r.description === "string" && r.description.length <= 5000 && ["private", "business"].includes(r.seller_type as string));
 ensure(r.fields && typeof r.fields === "object" && !Array.isArray(r.fields));
 const fields = r.fields as Record<string, unknown>;
 ensure(Object.keys(fields).every(k => HORSE_PUBLIC_FIELDS.includes(k as HorsePublicField) && typeof fields[k] === "string" && (fields[k] as string).length <= 5000));
 ensure(Object.keys(fields).every(k => wantedFields.includes(k as HorsePublicField) === (r.offer_type === "wanted")));
 ensure(Array.isArray(r.images) && r.images.length <= 10);
 const images = r.images.map(v => { const i = record(v, ["id", "url"]); ensure(horseUuid(i.id) && horseMediaUrl(i.url)); return { id: i.id, url: i.url as string }; });
 ensure(new Set(images.map(i => i.id)).size === images.length && new Set(images.map(i => i.url)).size === images.length);
 ensure(typeof r.published_at === "string" && Number.isFinite(Date.parse(r.published_at)));
 ensure(r.active_until === null || (typeof r.active_until === "string" && Number.isFinite(Date.parse(r.active_until))));
 const price = parseHorsePrice(r.price, r.offer_type as PublicHorseType);
 return Object.freeze({ id: offerId, offerType: r.offer_type as PublicHorseType, title: r.title, description: r.description, price,
  country: "EE", city: text(r.city), region: text(r.region), fields: Object.freeze({ ...fields }) as PublicHorse["fields"], images: Object.freeze(images),
  sellerName: text(r.seller_name) || "", sellerSlug: text(r.seller_slug), sellerType: r.seller_type as PublicHorse["sellerType"],
  publishedAt: r.published_at, activeUntil: r.active_until as string | null });
}
