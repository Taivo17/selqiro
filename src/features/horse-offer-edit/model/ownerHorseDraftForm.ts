import type { OwnerHorseOfferDetail } from "../../../entities/horse-offer/model/types";
import type { HorseDraftChangeKey, HorseDraftChanges } from "../../../entities/horse-offer/model/draftEdit";
import { hydrateOwnerHorseOfferEditForm, type OwnerHorseOfferEditFormState } from "./horseOfferEditHydration";

export type OwnerHorseDraftForm = OwnerHorseOfferEditFormState;
const SEX = ["mare", "gelding", "stallion", "unknown"];
const PERIOD = ["day", "week", "month", "agreed_period"];
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const optionalText = (x: unknown) => x == null || typeof x === "string";
const money = (x: unknown) => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 9999999999.99 && Number(x.toFixed(2)) === x;

export function hasPrivateHorseLocation(detail: OwnerHorseOfferDetail): boolean {
  return detail.offerType !== "wanted"
    && (detail.locationText !== null || detail.horseLat !== null || detail.horseLng !== null);
}

/** Unknown structured data stays on the server; it is never repaired by a display fallback. */
export function ownerHorseDraftShapeSupported(d: OwnerHorseOfferDetail): boolean {
  const x = d.details;
  if (d.marketCountryCode !== "EE" || d.horseLocationCountryCode !== "EE" || d.currency !== "EUR"
    || x.schema_version !== 1 || x.branch !== (d.offerType === "wanted" ? "wanted" : "specific")) return false;
  if (d.offerType === "wanted") {
    const w = x.wanted;
    if (!record(w) || !record(w.budget) || !record(w.search_area)) return false;
    const b = w.budget, a = w.search_area;
    return d.priceType === "contact" && d.priceAmount === null
      && ["preferred_breed", "preferred_discipline", "preferred_training_level", "intended_use", "health_preferences", "behavior_preferences"].every(k => optionalText(w[k]))
      && (w.preferred_sex == null || SEX.includes(w.preferred_sex as string))
      && b.currency === "EUR" && a.country_code === "EE"
      && optionalText(a.city_or_municipality) && optionalText(a.region)
      && ((b.mode === "contact" && b.amount == null) || (b.mode === "maximum" && money(b.amount)));
  }
  if (d.offerType === "free_transfer") return d.priceType === "free" && d.priceAmount === null;
  if (!(d.priceType === "contact" && d.priceAmount === null)
    && !(["fixed", "from"].includes(d.priceType) && money(d.priceAmount))) return false;
  if (d.offerType === "lease" || d.offerType === "co_rider") {
    return record(x.recurring_fee) && PERIOD.includes(x.recurring_fee.period as string);
  }
  return d.offerType === "sale";
}

export function prepareOwnerHorseDraftForm(detail: OwnerHorseOfferDetail): OwnerHorseDraftForm | null {
  if (!ownerHorseDraftShapeSupported(detail)) return null;
  const form = hydrateOwnerHorseOfferEditForm(detail);
  if (detail.offerType === "wanted" && record(detail.details.wanted) && detail.details.wanted.preferred_sex === "unknown") {
    form.basicFields.sex = "unknown";
  }
  return form;
}

type Inputs = Partial<Record<HorseDraftChangeKey, string>>;
/** Only active, visible scalar inputs participate. No details/private/lifecycle fields. */
export function ownerHorseDraftInputs(f: OwnerHorseDraftForm): Inputs {
  const p: Inputs = { title: f.title, description: f.description };
  if (f.offerType === "wanted") {
    const w = f.useFields.wanted, d = f.disclosureFields.wanted;
    const price = f.priceFields.wanted, loc = f.locationFields.wanted;
    return { ...p, wanted_preferred_sex: f.basicFields.sex, wanted_preferred_breed: f.basicFields.breed,
      wanted_preferred_discipline: w.preferredDiscipline, wanted_preferred_training_level: w.preferredTrainingLevel,
      wanted_intended_use: w.intendedUse, wanted_health_preferences: d.healthPreferences,
      wanted_behavior_preferences: d.behaviorPreferences, wanted_budget_mode: price.mode,
      wanted_budget_amount: price.mode === "maximum" ? price.amount : "",
      wanted_city: loc.cityOrMunicipality, wanted_region: loc.region };
  }
  const b = f.basicFields, u = f.useFields.specific, d = f.disclosureFields.specific, loc = f.locationFields.specific;
  Object.assign(p, { horse_name: b.horseName, birth_year: b.birthYear, sex: b.sex, breed: b.breed,
    color: b.color, height_cm: b.heightCm, discipline: u.discipline, training_level: u.trainingLevel,
    suitability: u.suitability, health_notes: d.healthNotes, behavior_notes: d.behaviorNotes,
    city: loc.cityOrMunicipality, region: loc.region });
  if (f.offerType !== "free_transfer") {
    const price = f.priceFields[f.offerType === "co_rider" ? "coRider" : f.offerType];
    p.price_type = price.mode;
    p.price_amount = price.mode === "contact" ? "" : price.amount;
    if (f.offerType !== "sale") p.recurring_fee_period = price.period || "";
  }
  return p;
}

export function ownerHorseDraftDirty(before: OwnerHorseDraftForm, after: OwnerHorseDraftForm): boolean {
  return JSON.stringify(ownerHorseDraftInputs(before)) !== JSON.stringify(ownerHorseDraftInputs(after));
}

const LIMITS: Partial<Record<HorseDraftChangeKey, number>> = {
  title: 140, description: 5000, horse_name: 160, breed: 160, color: 120, discipline: 240,
  training_level: 500, suitability: 2000, health_notes: 3000, behavior_notes: 3000, city: 160, region: 160,
  wanted_preferred_breed: 160, wanted_preferred_discipline: 240, wanted_preferred_training_level: 500,
  wanted_intended_use: 2000, wanted_health_preferences: 3000, wanted_behavior_preferences: 3000,
  wanted_city: 160, wanted_region: 160,
};
export class OwnerHorseDraftInputError extends Error {}
function invalid(): never { throw new OwnerHorseDraftInputError("Kontrolli muudetud väljade pikkust, sünniaastat, turjakõrgust, hinda või eelarvet."); }
function scalar(key: HorseDraftChangeKey, raw: string): string | number | null {
  if (typeof raw !== "string") return invalid();
  if (["birth_year", "height_cm", "price_amount", "wanted_budget_amount"].includes(key)) {
    const t = raw.trim().replace(",", ".");
    if (!t) return null;
    const year = key === "birth_year", height = key === "height_cm";
    const pattern = year ? /^\d{4}$/ : height ? /^\d{1,3}(\.\d)?$/ : /^\d{1,10}(\.\d{1,2})?$/;
    const n = Number(t);
    if (!pattern.test(t) || !Number.isFinite(n) || n < (year ? 1900 : height ? 1 : 0)
      || n > (year ? 2100 : height ? 300 : 9999999999.99)) return invalid();
    return n;
  }
  if (key === "sex" || key === "wanted_preferred_sex") {
    if (raw === "") return null;
    if (!SEX.includes(raw)) return invalid();
  }
  if (key === "price_type" && !["fixed", "from", "contact"].includes(raw)) return invalid();
  if (key === "wanted_budget_mode" && !["maximum", "contact"].includes(raw)) return invalid();
  if (key === "recurring_fee_period" && !PERIOD.includes(raw)) return invalid();
  if (Array.from(raw).length > (LIMITS[key] ?? 5000)) return invalid();
  return key === "title" || key === "description" ? raw : raw.trim() === "" ? null : raw;
}

/** Compare against the SAME hydrated baseline, parse ONLY changed values. */
export function buildOwnerHorseDraftChanges(
  detail: OwnerHorseOfferDetail, baseline: OwnerHorseDraftForm, form: OwnerHorseDraftForm,
): HorseDraftChanges {
  if (detail.status !== "draft" || !ownerHorseDraftShapeSupported(detail)
    || form.offerId !== detail.offerId || baseline.offerId !== detail.offerId
    || form.offerType !== detail.offerType || baseline.offerType !== detail.offerType) return invalid();
  const before = ownerHorseDraftInputs(baseline), after = ownerHorseDraftInputs(form);
  const changes: HorseDraftChanges = {};
  for (const k of Object.keys(after) as HorseDraftChangeKey[]) {
    if (after[k] !== before[k]) changes[k] = scalar(k, after[k]!);
  }
  const wanted = detail.offerType === "wanted";
  const mode = wanted ? "wanted_budget_mode" : "price_type";
  const amount = wanted ? "wanted_budget_amount" : "price_amount";
  if (mode in changes) changes[amount] = scalar(amount, after[amount]!);
  if ((mode in changes || amount in changes) && after[mode] !== "contact" && changes[amount] === null) return invalid();
  if (hasPrivateHorseLocation(detail) && ("city" in changes || "region" in changes)) {
    throw new OwnerHorseDraftInputError("Täpse salvestatud asukoha tõttu ei saa selles vormis linna ega piirkonda muuta.");
  }
  return changes;
}
