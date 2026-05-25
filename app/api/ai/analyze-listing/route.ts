import OpenAI from "openai";
import { CATEGORY_TREE } from "../../../../lib/categories";
import { getCategoryFields } from "../../../../lib/categoryFields";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type CategoryNode = {
  value: string;
  label: string;
  children?: readonly CategoryNode[];
};

function flattenCategories() {
  const rows: string[] = [];

  for (const category of CATEGORY_TREE as readonly CategoryNode[]) {
    if (!category.children?.length) {
      rows.push(`${category.value}`);
      continue;
    }

    for (const subcategory of category.children) {
      if (!subcategory.children?.length) {
        rows.push(`${category.value} > ${subcategory.value}`);
        continue;
      }

      for (const detail of subcategory.children) {
        rows.push(`${category.value} > ${subcategory.value} > ${detail.value}`);
      }
    }
  }

  return rows.join("\n");
}

function getAllowedFieldKeys(category: string, subcategory: string, detailCategory: string) {
  const key = detailCategory || subcategory || category;
  return getCategoryFields(key).map((field) => field.key);
}

function normalizeCategorySelection(
  inputCategory: string,
  inputSubcategory: string,
  inputDetailCategory: string,
  objectName: string
) {
  const values = [
    inputCategory,
    inputSubcategory,
    inputDetailCategory,
    objectName,
  ]
    .map((value) => String(value || "").toLowerCase().trim())
    .filter(Boolean);

  const findPathByValue = (target: string) => {
    for (const category of CATEGORY_TREE as readonly CategoryNode[]) {
      if (category.value === target) {
        return {
          category: category.value,
          subcategory: "",
          detailCategory: "",
        };
      }

      for (const subcategory of category.children || []) {
        if (subcategory.value === target) {
          return {
            category: category.value,
            subcategory: subcategory.value,
            detailCategory: "",
          };
        }

        for (const detail of subcategory.children || []) {
          if (detail.value === target) {
            return {
              category: category.value,
              subcategory: subcategory.value,
              detailCategory: detail.value,
            };
          }
        }
      }
    }

    return null;
  };

  const aliasMap: Record<string, string> = {
    car_battery: "batteries",
    battery: "batteries",
    batteries: "batteries",
    vehicle_battery: "batteries",
    auto_battery: "batteries",

    starter: "starters_alternators",
    alternator: "starters_alternators",

    brake: "brakes",
    brakes: "brakes",
    brake_pads: "brakes",

    tire: "tires",
    tyres: "tires",
    tyre: "tires",
    tires: "tires",

    rim: "wheels_rims",
    rims: "wheels_rims",
    wheel: "wheels_rims",
    wheels: "wheels_rims",

    headlight: "lights_lamps",
    headlights: "lights_lamps",
    tail_light: "lights_lamps",
    lamp: "lights_lamps",
    lights: "lights_lamps",

    bumper: "body_parts",
    door: "body_parts",
    hood: "body_parts",
    fender: "body_parts",

    exhaust: "exhaust_parts",
    radiator: "cooling_heating",
    turbo: "engines_engine_parts",
    engine: "engines_engine_parts",
    gearbox: "transmission_drivetrain",
    transmission: "transmission_drivetrain",
  };

  for (const value of values) {
    const normalized = value.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

    const directPath = findPathByValue(normalized);
    if (directPath) return directPath;

    const aliasTarget = aliasMap[normalized];
    if (aliasTarget) {
      const aliasPath = findPathByValue(aliasTarget);
      if (aliasPath) return aliasPath;
    }
  }

  const joined = values.join(" ");

  if (
    joined.includes("battery") ||
    joined.includes("aku") ||
    joined.includes("accu")
  ) {
    return {
      category: "vehicles",
      subcategory: "vehicle_parts",
      detailCategory: "batteries",
    };
  }

  if (
    joined.includes("vehicle_parts") ||
    joined.includes("car part") ||
    joined.includes("auto part") ||
    joined.includes("spare part")
  ) {
    return {
      category: "vehicles",
      subcategory: "vehicle_parts",
      detailCategory: "spare_parts",
    };
  }

  return {
    category: "general",
    subcategory: "",
    detailCategory: "",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageUrls: string[] = body.imageUrls || [];

    if (imageUrls.length === 0) {
      return Response.json(
        { success: false, error: "No images provided" },
        { status: 400 }
      );
    }

    const categoryList = flattenCategories();

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Analyze marketplace listing photos.

Return JSON only. Do not use markdown.

Choose the best category path from this allowed category tree:
${categoryList}

Response shape:
{
  "object": "short object name",
  "category": "main category value",
  "subcategory": "subcategory value",
  "detailCategory": "detail category value or empty string",
  "brand": "brand if visible or likely, otherwise empty string",
  "model": "model if visible or likely, otherwise empty string",
  "suggested_title": "short useful listing title",
  "confidence": 0.0,
  "fields": {
    "field_key": "detected value"
  }
}

Rules:
- Use only category, subcategory and detailCategory values from the allowed tree.
- If there is no detail category for the selected subcategory, use an empty string for detailCategory.
- Prefer fewer accurate fields over many guessed fields.
- Leave a field empty if you are not confident.
- Fill fields only when the value is clearly visible, readable, or very strongly likely from the image.
- Do not invent VIN, serial numbers, registration numbers, IMEI, exact years, exact engine data, power, mileage, dimensions or technical specs.
- For vehicles, you may identify visible brand/model/body type, but do not guess exact year, engine, power or mileage unless clearly visible.
- For tools/electronics, detect visible brand/model/type when possible, but leave model empty if not readable.
- For unknown or unclear items, use "general", keep detailCategory empty, and put the best visible object name into object and suggested_title.
- fields must use only field keys from the selected category schema.
- Keep suggested_title natural, short and useful.
- Confidence should reflect how certain you are about the category and object identification, not how many fields you filled.
- If confidence is below 0.72, return only safe basic fields such as object, category, subcategory and suggested_title.

Examples:
{
  "object": "Mercedes-Benz SUV",
  "category": "vehicles",
  "subcategory": "cars",
  "detailCategory": "suv_offroad",
  "brand": "Mercedes-Benz",
  "model": "GL-Class",
  "suggested_title": "Mercedes-Benz GL-Class SUV",
  "confidence": 0.92,
  "fields": {
    "brand": "Mercedes-Benz",
    "model": "GL-Class",
    "body_type": "SUV"
  }
}

{
  "object": "Circular saw",
  "category": "tools_industrial",
  "subcategory": "power_tools",
  "detailCategory": "",
  "brand": "Biltema",
  "model": "",
  "suggested_title": "Biltema circular saw",
  "confidence": 0.86,
  "fields": {
    "tool_type": "Circular saw",
    "brand": "Biltema",
    "power_source": "Corded electric"
  }
}`,
            },
            ...imageUrls.map((url) => ({
              type: "input_image" as const,
              image_url: url,
            })),
          ],
        },
      ] as any,
    });

    const text = response.output_text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    const normalizedCategory = normalizeCategorySelection(
      String(parsed.category || ""),
      String(parsed.subcategory || ""),
      String(parsed.detailCategory || ""),
      String(parsed.object || parsed.suggested_title || "")
    );

    const category = normalizedCategory.category;
    const subcategory = normalizedCategory.subcategory;
    const detailCategory = normalizedCategory.detailCategory;
    const allowedFields = getAllowedFieldKeys(category, subcategory, detailCategory);

    const cleanedFields: Record<string, string> = {};
    const incomingFields = parsed.fields || {};

    for (const key of allowedFields) {
      const value = incomingFields[key];
      if (typeof value === "string" && value.trim()) {
        cleanedFields[key] = value.trim();
      }
    }

    return Response.json({
      success: true,
      result: {
        object: String(parsed.object || ""),
        category,
        subcategory,
        detailCategory,
        brand: String(parsed.brand || ""),
        model: String(parsed.model || ""),
        suggested_title: String(parsed.suggested_title || ""),
        confidence:
          typeof parsed.confidence === "number" ? parsed.confidence : 0,
        fields: cleanedFields,
      },
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, error: "AI analyze failed" },
      { status: 500 }
    );
  }
}