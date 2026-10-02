import { getListingPriceDisplay, type ListingPriceDisplayInput } from "./priceDisplay";

/** Compatibility for text-only callers. Views also show getListingPriceDisplay().priceNote. */
export function formatPriceLabel(input: ListingPriceDisplayInput): string {
  return getListingPriceDisplay(input).priceLabel;
}

export function formatDistanceLabel(distanceKm?: number | null): string | null {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) {
    return null;
  }

  if (distanceKm < 1) {
    return "~1 km";
  }

  if (distanceKm < 10) {
    return `~${distanceKm.toFixed(1)} km`;
  }

  return `~${Math.round(distanceKm)} km`;
}

export function formatLocationLabel(input: {
  city?: string | null;
  location?: string | null;
  country?: string | null;
}): string {
  return input.city || input.location || input.country || "Asukoht puudub";
}
