export const LISTING_CREATE_FIELD_SOURCES = [
  "empty",
  "ai",
  "user",
] as const;

export type ListingCreateFieldSource =
  (typeof LISTING_CREATE_FIELD_SOURCES)[number];

export type ListingCreateTextField = {
  value: string;
  source: ListingCreateFieldSource;
};

export type ApplyListingCreateAiTextResult = {
  field: ListingCreateTextField;
  applied: boolean;
};

export function createListingCreateTextField(
  value = ""
): ListingCreateTextField {
  return {
    value,
    source: value.trim()
      ? "user"
      : "empty",
  };
}

export function updateListingCreateTextFieldByUser(
  value: string
): ListingCreateTextField {
  return {
    value,
    source: value.trim()
      ? "user"
      : "empty",
  };
}

export function applyListingCreateAiText(
  current: ListingCreateTextField,
  suggestion: string | null | undefined
): ApplyListingCreateAiTextResult {
  const cleanSuggestion =
    (suggestion || "").trim();

  if (
    !cleanSuggestion ||
    current.source === "user"
  ) {
    return {
      field: current,
      applied: false,
    };
  }

  return {
    field: {
      value: cleanSuggestion,
      source: "ai",
    },
    applied: true,
  };
}

export function listingCreateFieldSourceLabel(
  source: ListingCreateFieldSource
): string {
  if (source === "user") {
    return "Sinu tekst";
  }

  if (source === "ai") {
    return "AI soovitus";
  }

  return "Tühi";
}
