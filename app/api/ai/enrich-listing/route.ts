import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY");
    return Response.json({ success: false, message: "Missing OPENAI_API_KEY" });
  }

  const openai = new OpenAI({ apiKey });

  const { listingId, title, description } = await req.json();

  try {
    const prompt = `
Improve this listing for SEO and translate to English.

Title: ${title}
Description: ${description}

Return only valid JSON:
{
  "seo_title": "...",
  "seo_description": "...",
  "description_en": "..."
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0].message.content || "{}";
    const parsed = JSON.parse(text);

    await supabase
      .from("listings")
      .update({
        seo_title: parsed.seo_title,
        seo_description: parsed.seo_description,
        description_en: parsed.description_en,
      })
      .eq("id", listingId);

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ success: false });
  }
}
