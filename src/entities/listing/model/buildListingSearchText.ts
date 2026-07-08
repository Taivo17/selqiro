type BuildListingSearchTextInput = {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  condition?: string | null;
  details?: Record<string, unknown> | null;
};

function stringifyValue(value: unknown): string {
  if (value === null || typeof value === "undefined") return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function buildListingSearchText(input: BuildListingSearchTextInput): string {
  const detailsText = Object.values(input.details || {})
    .map(stringifyValue)
    .join(" ");

  return [
    input.title,
    input.description,
    input.category,
    input.subcategory,
    input.condition,
    detailsText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
