import type { Service, ServicePriceType } from "../../../entities/service/model/types";
import type { ServicePublicationContent } from "../../../entities/service/model/servicePublication";

export type ServiceEditorForm = Readonly<{
  title: string; description: string; category: string; subcategory: string;
  priceType: ServicePriceType; priceAmount: string; currency: string;
  country: string; city: string; location: string;
}>;

export function serviceEditorForm(service?: Service | null): ServiceEditorForm {
  return {
    title: service?.title ?? "", description: service?.description ?? "",
    category: service?.category ?? "", subcategory: service?.subcategory ?? "",
    priceType: service?.priceType ?? "contact", priceAmount: service?.priceAmount == null ? "" : String(service.priceAmount),
    currency: service?.currency ?? "EUR", country: service ? service.country ?? "" : "Estonia", city: service?.city ?? "", location: service?.location ?? "",
  };
}

export function serviceEditorDirty(before: ServiceEditorForm, after: ServiceEditorForm): boolean {
  return Object.keys(before).some(key => before[key as keyof ServiceEditorForm] !== after[key as keyof ServiceEditorForm]);
}

export function buildServiceContent(form: ServiceEditorForm, serviceId: string | null = null, original?: Service | null): ServicePublicationContent {
  const title = form.title.trim().replace(/\s+/g, " "), description = form.description.trim();
  const category = form.category.trim() || null, subcategory = form.subcategory.trim() || null;
  const country = form.country.trim() || null, city = form.city.trim() || null, location = form.location.trim() || null;
  const currency = form.currency.trim().toUpperCase();
  const amountText = form.priceAmount.trim().replace(/\s/g, "").replace(",", ".");
  const retained = !!original && original.id === serviceId && ["published", "archived"].includes(original.status);
  const retainedCategory = retained && category === original.category && subcategory === original.subcategory;
  const retainedAmount = retained && !amountText && original.priceAmount === null && original.priceType === form.priceType && original.currency === currency;
  const amount = form.priceType === "contact" || retainedAmount ? null : /^\d{1,10}(?:\.\d{1,2})?$/.test(amountText) ? Number(amountText) : NaN;
  if (title.length < 2 || title.length > 140 || description.length > 5000 || !category && !retainedCategory || (category?.length ?? 0) > 120
    || (subcategory?.length ?? 0) > 160 || (country?.length ?? 0) > 120 || (city?.length ?? 0) > 160 || (location?.length ?? 0) > 300
    || !/^[A-Z]{3}$/.test(currency) || !["fixed", "from", "hourly", "contact"].includes(form.priceType)
    || (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99))
    || [title, description, category, subcategory, country, city, location].some(v => v?.includes("\0"))) throw new Error("service_fields_invalid");
  return {serviceId, title, description, category, subcategory, priceType: form.priceType, priceAmount: amount, currency, country, city, location};
}
