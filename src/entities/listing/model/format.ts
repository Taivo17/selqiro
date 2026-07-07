export function formatPriceLabel(input: {
  price?: string | null;
  priceAmount?: number | null;
  currency?: string | null;
}): string {
  const { price, priceAmount, currency } = input;

  if (price && price.trim()) {
    return price.trim();
  }

  if (typeof priceAmount === "number" && Number.isFinite(priceAmount)) {
    return `${priceAmount} ${currency || "€"}`;
  }

  return "Hind kokkuleppel";
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
