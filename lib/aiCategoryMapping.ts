export type AiCategoryPath = {
  category: string;
  subcategory: string;
  detailCategory: string;
};

function normalize(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
}

function textIncludes(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export function mapAiCategory(value?: string | null) {
  const normalized = normalize(value);

  const aliases: Record<string, string> = {
    vehicle_parts: "vehicle_parts",
    car_parts: "vehicle_parts",
    auto_parts: "vehicle_parts",

    suv: "suv_offroad",
    suv_vehicle: "suv_offroad",
    offroad: "suv_offroad",

    car: "passenger_cars",
    sedan: "passenger_cars",
    coupe: "passenger_cars",
    hatchback: "passenger_cars",

    battery: "batteries",
    car_battery: "batteries",
    automotive_battery: "batteries",
    vehicle_battery: "batteries",

    starter: "starters_alternators",
    starter_motor: "starters_alternators",
    alternator: "starters_alternators",

    lawn_mower: "garden_tools",
    riding_lawn_mower: "garden_tools",
    mower: "garden_tools",
  };

  return aliases[normalized] || normalized;
}

export function resolveAiCategoryPath(result: any): AiCategoryPath {
  const rawText = [
    result?.object,
    result?.suggested_title,
    result?.category,
    result?.subcategory,
    result?.detailCategory,
    result?.brand,
    result?.model,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const category = mapAiCategory(result?.category);
  const subcategory = mapAiCategory(result?.subcategory);
  const detailCategory = mapAiCategory(result?.detailCategory);

  if (textIncludes(rawText, ["battery", "car battery", "automotive battery"])) {
    return {
      category: "vehicles",
      subcategory: "vehicle_parts",
      detailCategory: "batteries",
    };
  }

  if (textIncludes(rawText, ["starter", "starter motor", "alternator"])) {
    return {
      category: "vehicles",
      subcategory: "vehicle_parts",
      detailCategory: "starters_alternators",
    };
  }

  if (textIncludes(rawText, ["suv", "off-road", "offroad"])) {
    return {
      category: "vehicles",
      subcategory: "cars",
      detailCategory: "suv_offroad",
    };
  }

  if (textIncludes(rawText, ["porsche 911", "gt3", "racing car"])) {
    return {
      category: "vehicles",
      subcategory: "cars",
      detailCategory: "racing_vehicles",
    };
  }

  if (textIncludes(rawText, ["lawn mower", "riding lawn mower", "mower"])) {
    return {
      category: "home_garden",
      subcategory: "garden_tools",
      detailCategory: "",
    };
  }

  return {
    category,
    subcategory,
    detailCategory,
  };
}
