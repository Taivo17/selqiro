"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingCreateMessages, translateListingCreateMessage } from "../model/listingCreateMessages";
import { COUNTRY_OPTIONS } from "../../../../lib/geography/countries";
import type { OrdinaryListingFieldState } from "../model/ordinaryListingFields";

type Props = { value: OrdinaryListingFieldState; onChange: (value: OrdinaryListingFieldState) => void };
export default function OrdinaryListingLocationFields({ value, onChange }: Props) {
  const { language, t } = useV2Translation(listingCreateMessages);

  return (
    <section className="min-w-0 rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="ordinary-location-title">
      <h2 id="ordinary-location-title" className="text-2xl font-black tracking-tight">{t("location")}</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{t("locationHelp")}</p>
      <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="block min-w-0 text-sm font-bold" htmlFor="ordinary-country">{t("country")}<input id="ordinary-country" list="ordinary-country-options" type="text" maxLength={120}
            value={value.country} onChange={event => onChange({ ...value, country: event.target.value })}
            placeholder={t("countryPlaceholder")} autoComplete="off"
            className="mt-2 block w-full rounded-xl border border-neutral-200 bg-white p-3 text-base font-normal focus-visible:outline-2 focus-visible:outline-offset-2" />
        </label>
        <datalist id="ordinary-country-options">{COUNTRY_OPTIONS.map(country => <option key={country.code} value={country.name}>{new Intl.DisplayNames([language], { type: "region" }).of(country.code) || country.name}</option>)}</datalist>
        <label className="block min-w-0 text-sm font-bold" htmlFor="ordinary-city">{t("city")}<input id="ordinary-city" type="text" maxLength={160} value={value.city}
            onChange={event => onChange({ ...value, city: event.target.value })} placeholder={t("cityPlaceholder")} autoComplete="off"
            className="mt-2 block w-full rounded-xl border border-neutral-200 bg-white p-3 text-base font-normal focus-visible:outline-2 focus-visible:outline-offset-2" />
        </label>
      </div>
      <p className="mt-3 text-xs leading-5 text-neutral-500">{t("countryHelp")}</p>
    </section>
  );
}
