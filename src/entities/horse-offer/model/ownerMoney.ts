import { localeForLanguage } from "../../../../lib/i18n/useTranslation";
import type { Language } from "../../../../lib/i18n/translations";
/** Shared owner display. Call only with validated amounts. */
const options: Intl.NumberFormatOptions = {
  style: "currency", useGrouping: true,
  minimumFractionDigits: 0, maximumFractionDigits: 2,
};
const euroFormatters = {
  en: new Intl.NumberFormat("en-GB", { ...options, currency: "EUR" }),
  et: new Intl.NumberFormat("et-EE", { ...options, currency: "EUR" }),
};
export function formatOwnerHorseMoney(value: number, currency: string, language: Language = "et"): string {
  const formatter = currency === "EUR" ? euroFormatters[language]
    : new Intl.NumberFormat(localeForLanguage(language), { ...options, currency });
  return formatter.format(value);
}
