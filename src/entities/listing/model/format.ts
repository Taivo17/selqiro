import { getCatalogTranslation, localeForLanguage } from "../../../../lib/i18n/useTranslation";
import { listingPresentationMessages } from "../../../../lib/i18n/catalogs/listingPresentation";
import type { Language } from "../../../../lib/i18n/translations";
import { getListingPriceDisplay, localizeListingPrice, type ListingPriceDisplayInput } from "./priceDisplay";

/** Compatibility for text-only callers. Views also show getListingPriceDisplay().priceNote. */
export function formatPriceLabel(input: ListingPriceDisplayInput, language: Language = "en"): string {
  return localizeListingPrice(getListingPriceDisplay(input), language).priceLabel;
}

export function formatDistanceLabel(distanceKm?: number | null, language: Language = "en"): string | null {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) {
    return null;
  }

  if (distanceKm < 1) {
    return "~1 km";
  }

  if (distanceKm < 10) {
    return `~${distanceKm.toLocaleString(localeForLanguage(language), {minimumFractionDigits: 1, maximumFractionDigits: 1})} km`;
  }

  return `~${Math.round(distanceKm).toLocaleString(localeForLanguage(language))} km`;
}

export function formatLocationLabel(input: {
  city?: string | null;
  location?: string | null;
  country?: string | null;
}, language: Language = "en"): string {
  return input.city || input.location || input.country || getCatalogTranslation(language, listingPresentationMessages, "location_unspecified");
}
