"use client";
import { useMemo } from "react";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { serviceEditorMessages } from "../model/serviceEditorMessages";
import type { ServiceEditorForm } from "../model/serviceEditorForm";
import { useServiceCategories } from "../../service-category-selection/model/useServiceCategories";
import { buildServiceCategoryTree } from "../../../entities/service-category/model/types";
import type { Service, ServicePriceType } from "../../../entities/service/model/types";

const panel = "rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6";
const input = "mt-2 min-h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:bg-neutral-50 disabled:text-neutral-500";
const label = "block text-sm font-bold text-neutral-700";

export default function ServiceFields({form, original, disabled, onChange}: {
  form: ServiceEditorForm; original?: Service | null; disabled: boolean; onChange: (next: ServiceEditorForm) => void;
}) {
  const {language, t} = useV2Translation(serviceEditorMessages), categories = useServiceCategories();
  const tree = useMemo(() => buildServiceCategoryTree(categories.categories), [categories.categories]);
  const children = tree.childrenByParent.get(form.category) ?? [];
  const unknownRoot = !!form.category && !tree.roots.some(item => item.code === form.category);
  const unknownChild = !!form.subcategory && !children.some(item => item.code === form.subcategory);
  const retained = !!original && original.status !== "draft";
  const retainedEmptyCategory = retained && original.category === null && !form.category;
  const retainedEmptyAmount = retained && original.priceAmount === null && original.priceType === form.priceType && original.currency === form.currency && !form.priceAmount;
  const change = <K extends keyof ServiceEditorForm>(key: K, value: ServiceEditorForm[K]) => { if (!disabled) onChange({...form, [key]: value}); };
  return <fieldset disabled={disabled} className="min-w-0 space-y-6">
    <legend className="sr-only">{t("editService")}</legend>
    <section className={panel}>
      <h2 className="text-2xl font-black">{t("textHeading")}</h2>
      <label className={`${label} mt-5`}>{t("title")}
        <input name="service-title" autoComplete="off" required minLength={2} maxLength={140} value={form.title}
          onChange={event => change("title", event.target.value)} placeholder={t("titlePlaceholder")} className={input} />
      </label>
      <label className={`${label} mt-5`}>{t("description")}
        <textarea name="service-description" rows={6} maxLength={5000} value={form.description}
          onChange={event => change("description", event.target.value)} placeholder={t("descriptionPlaceholder")} className={input} />
      </label>
    </section>
    <section className={panel}>
      <h2 className="text-2xl font-black">{t("categoryHeading")}</h2>
      {categories.loading ? <p role="status" className="mt-4 text-sm">{t("categoryLoading")}</p> : null}
      {categories.error ? <div role="alert" className="mt-4 text-sm text-red-800"><p>{t("categoryError")}</p>
        <button type="button" className="mt-2 underline" onClick={() => void categories.refresh()}>{t("retry")}</button></div> : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className={label}>{t("category")}
          <select name="service-category" required={!retainedEmptyCategory} value={form.category} disabled={disabled || categories.loading || !!categories.error}
            onChange={event => onChange({...form, category: event.target.value, subcategory: ""})} className={input}>
            <option value="">{t(retainedEmptyCategory ? "savedWithoutCategory" : "chooseCategory")}</option>
            {unknownRoot ? <option value={form.category}>{form.category}</option> : null}
            {tree.roots.map(item => <option key={item.code} value={item.code}>{language === "et" ? item.labelEt : item.labelEn}</option>)}
          </select>
        </label>
        <label className={label}>{t("subcategory")}
          <select name="service-subcategory" value={form.subcategory} disabled={disabled || !form.category || categories.loading || !!categories.error}
            onChange={event => change("subcategory", event.target.value)} className={input}>
            <option value="">{t("noSubcategory")}</option>
            {unknownChild ? <option value={form.subcategory}>{form.subcategory}</option> : null}
            {children.map(item => <option key={item.code} value={item.code}>{language === "et" ? item.labelEt : item.labelEn}</option>)}
          </select>
        </label>
      </div>
      {!categories.loading && !categories.error && (unknownRoot || unknownChild || retainedEmptyCategory) ? <p className="mt-3 text-sm text-neutral-600">{t("retainedCategory")}</p> : null}
    </section>
    <section className={panel}>
      <h2 className="text-2xl font-black">{t("priceHeading")}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className={label}>{t("priceType")}
          <select name="service-price-type" value={form.priceType} className={input} onChange={event => {
            if (!disabled) onChange({...form, priceType: event.target.value as ServicePriceType, priceAmount: event.target.value === "contact" ? "" : form.priceAmount});
          }}>
            <option value="contact">{t("contactPrice")}</option><option value="fixed">{t("fixedPrice")}</option>
            <option value="from">{t("fromPrice")}</option><option value="hourly">{t("hourlyPrice")}</option>
          </select>
        </label>
        {form.priceType !== "contact" ? <>
          <label className={label}>{t("amount")}
            <input name="service-price-amount" required={!retainedEmptyAmount} inputMode="decimal" maxLength={14} value={form.priceAmount} className={input}
              onChange={event => change("priceAmount", event.target.value)} />
          </label>
          <label className={label}>{t("currency")}
            <select name="service-currency" value={form.currency} className={input} onChange={event => change("currency", event.target.value)}>
              <option value="EUR">EUR</option>{form.currency !== "EUR" ? <option value={form.currency}>{form.currency}</option> : null}
            </select>
          </label>
        </> : null}
      </div>
      {form.priceType !== "contact" && retainedEmptyAmount ? <p className="mt-3 text-sm text-neutral-600">{t("savedWithoutAmount")}</p> : null}
    </section>
    <section className={panel}>
      <h2 className="text-2xl font-black">{t("locationHeading")}</h2><p className="mt-2 text-sm leading-6 text-neutral-600">{t("locationHelp")}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className={label}>{t("country")}<input name="service-country" maxLength={120} autoComplete="country-name" value={form.country} className={input} onChange={event => change("country", event.target.value)} /></label>
        <label className={label}>{t("city")}<input name="service-city" maxLength={160} value={form.city} className={input} onChange={event => change("city", event.target.value)} /></label>
      </div>
      <label className={`${label} mt-4`}>{t("location")}<input name="service-location" maxLength={300} value={form.location} className={input} onChange={event => change("location", event.target.value)} /></label>
    </section>
  </fieldset>;
}
