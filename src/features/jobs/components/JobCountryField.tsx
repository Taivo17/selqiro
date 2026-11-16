"use client";
import { useState } from "react";
import { COUNTRY_OPTIONS } from "../../../../lib/geography/countries";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { jobMessages } from "../model/jobMessages";
import { jobCountryName } from "../model/jobForm";
import { jobField } from "./jobStyles";
/** Suggestions are not an allowlist: every uppercase two-letter country code is supported. */
export default function JobCountryField({value,onChange,disabled = false,filter = false}: {value: string;onChange: (value: string) => void;disabled?: boolean;filter?: boolean}) {
  const {language,t} = useV2Translation(jobMessages), [other,setOther] = useState(false);
  const known = COUNTRY_OPTIONS.some(country => country.code === value), custom = other || !!value && !known;
  return <div className="min-w-0"><label className="block text-sm font-bold">{t("country")}
    <select className={jobField} disabled={disabled} value={custom ? "__other" : value} onChange={event => {
      const selected = event.target.value; setOther(selected === "__other"); onChange(selected === "__other" ? "" : selected);
    }}><option value="">{t(filter ? "allCountries" : "unspecified")}</option>
      {COUNTRY_OPTIONS.map(country => <option key={country.code} value={country.code}>{jobCountryName(country.code,language)}</option>)}
      <option value="__other">{t("otherCountry")}</option>
    </select></label>
    {custom ? <label className="mt-3 block text-sm font-medium">{t("countryCodeHelp")}
      <input aria-label={t("country")} className={jobField} value={value} disabled={disabled} maxLength={2} autoCapitalize="characters" autoComplete="country"
        pattern="[A-Za-z]{2}" onChange={event => onChange(event.target.value.toUpperCase())}/>
    </label> : null}
  </div>;
}
