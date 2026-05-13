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
- Fill fields only when reasonably visible or strongly likely.
- Do not invent VIN, serial numbers, registration numbers, IMEI or exact technical specs.
- For vehicles, do not guess exact year, engine, power or mileage unless clearly visible.
- For tools/electronics, detect visible brand/model when possible.
- If unsure, use "general" and put the best object name into object and suggested_title.
- fields must use only field keys from the selected category schema.
- Keep suggested_title natural and short.

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

    const category = String(parsed.category || "general");
    const subcategory = String(parsed.subcategory || "");
    const detailCategory = String(parsed.detailCategory || "");
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