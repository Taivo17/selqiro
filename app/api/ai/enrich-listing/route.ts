import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { listingId, title, description } = await req.json();

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

    const { error } = await supabase
      .from("listings")
      .update({
        seo_title: parsed.seo_title,
        seo_description: parsed.seo_description,
        description_en: parsed.description_en,
        ai_status: "completed",
        ai_enriched: true,
      })
      .eq("id", listingId);

    if (error) {
      console.error(error);
      return Response.json({ success: false });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ success: false });
  }
}
