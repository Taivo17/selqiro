function normalizeCurrencyLabel(currency?: string | null): string {
  if (!currency) return "€";

  const value = currency.trim();

  if (!value) return "€";
  if (value.toUpperCase() === "EUR") return "€";

  return value;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("et-EE", {
    maximumFractionDigits: 2,
  }).format(value);
}

function parseNumericPrice(value: string): number | null {
  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function formatPriceLabel(input: {
  price?: string | null;
  priceAmount?: number | null;
  currency?: string | null;
}): string {
  const { price, priceAmount, currency } = input;
  const currencyLabel = normalizeCurrencyLabel(currency);

  if (price && price.trim()) {
    const cleanPrice = price.trim();

    const alreadyHasCurrency =
      /[€$£¥]/.test(cleanPrice) ||
      /\b[A-Z]{3}\b/.test(cleanPrice) ||
      /\beur\b/i.test(cleanPrice);

    if (alreadyHasCurrency) {
      return cleanPrice;
    }

    const parsed = parseNumericPrice(cleanPrice);

    if (parsed !== null) {
      return `${formatNumber(parsed)} ${currencyLabel}`;
    }

    return cleanPrice;
  }

  if (typeof priceAmount === "number" && Number.isFinite(priceAmount)) {
    return `${formatNumber(priceAmount)} ${currencyLabel}`;
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
