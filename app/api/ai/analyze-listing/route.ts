import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { CATEGORY_TREE } from "../../../../lib/categories";
import { getCategoryFields } from "../../../../lib/categoryFields";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_premium, premium_until")
      .eq("id", user.id)
      .maybeSingle();

    const premiumActive =
      !!profile?.is_premium &&
      !!profile?.premium_until &&
      new Date(profile.premium_until).getTime() > Date.now();

    const dailyLimit = premiumActive ? 150 : 10;

    const today = new Date().toISOString().slice(0, 10);

    const { data: usageRow } = await supabaseAdmin
      .from("ai_usage_daily")
      .select("id, analyze_count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    const currentUsage = usageRow?.analyze_count || 0;

    if (currentUsage >= dailyLimit) {
      return Response.json(
        {
          success: false,
          error: premiumActive
            ? "Premium AI daily limit reached."
            : "Free AI daily limit reached.",
          remaining: 0,
          limit: dailyLimit,
        },
        { status: 429 }
      );
    }

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
- Always choose the closest matching category path from the allowed category tree.
- Prefer a nearby existing category over falling back to "general".
- Use "general" only if the object truly does not fit anywhere in the category tree.
- For vehicles, machinery, tools, electronics, clothing and household items, always select the closest matching subcategory and detailCategory whenever reasonably possible.
- It is acceptable to slightly approximate the detailCategory if the exact match does not exist.
- Do not leave subcategory empty for common recognizable objects such as cars, trucks, motorcycles, tools, electronics, machinery, clothing or household items.
- fields must use only field keys from the selected category schema.
- Keep suggested_title natural, short and useful.
- Confidence should reflect how certain you are about the category and object identification, not how many fields you filled.
- Even with lower confidence, still choose the nearest valid category path whenever reasonably possible.

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

    if (usageRow?.id) {
      await supabaseAdmin
        .from("ai_usage_daily")
        .update({
          analyze_count: currentUsage + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", usageRow.id);
    } else {
      await supabaseAdmin
        .from("ai_usage_daily")
        .insert({
          user_id: user.id,
          usage_date: today,
          analyze_count: 1,
        });
    }

    return Response.json({
      success: true,
      remaining: Math.max(0, dailyLimit - currentUsage - 1),
      limit: dailyLimit,
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