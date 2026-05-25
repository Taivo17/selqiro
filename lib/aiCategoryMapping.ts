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

  if (
    textIncludes(rawText, [
      "truck",
      "commercial truck",
      "lorry",
      "dump truck",
      "cargo truck",
      "old truck",
    ])
  ) {
    return {
      category: "vehicles",
      subcategory: "trucks_commercial",
      detailCategory: "trucks",
    };
  }

  if (textIncludes(rawText, ["semi truck", "tractor unit"])) {
    return {
      category: "vehicles",
      subcategory: "trucks_commercial",
      detailCategory: "semi_trucks",
    };
  }

  if (textIncludes(rawText, ["van", "minibus"])) {
    return {
      category: "vehicles",
      subcategory: "cars",
      detailCategory: "vans_minibuses",
    };
  }

  if (textIncludes(rawText, ["pickup", "pickup truck"])) {
    return {
      category: "vehicles",
      subcategory: "cars",
      detailCategory: "pickup_trucks",
    };
  }

  if (textIncludes(rawText, ["motorcycle", "motorbike", "scooter"])) {
    return {
      category: "vehicles",
      subcategory: "motorcycles",
      detailCategory: "sport_bikes",
    };
  }

  if (textIncludes(rawText, ["atv", "utv", "quad"])) {
    return {
      category: "vehicles",
      subcategory: "motorcycles",
      detailCategory: "atv_utv",
    };
  }

  if (textIncludes(rawText, ["snowmobile"])) {
    return {
      category: "vehicles",
      subcategory: "motorcycles",
      detailCategory: "snowmobiles",
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

  if (
    textIncludes(rawText, [
      "passenger car",
      "sports car",
      "sedan",
      "hatchback",
      "coupe",
      "subaru passenger car",
      "porsche sports car",
      "car with spoiler",
    ])
  ) {
    return {
      category: "vehicles",
      subcategory: "cars",
      detailCategory: "passenger_cars",
    };
  }

  if (
    textIncludes(rawText, [
      "agricultural attachment",
      "agricultural implement",
      "farm implement",
      "tractor attachment",
      "potato harvester",
      "potato digger",
      "plough",
      "plow",
      "cultivator",
      "harrow",
      "rake",
      "agricultural rake",
      "hay rake",
      "mower attachment",
    ])
  ) {
    return {
      category: "vehicles",
      subcategory: "agricultural_heavy_machinery",
      detailCategory: "agricultural_attachments_implements",
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
