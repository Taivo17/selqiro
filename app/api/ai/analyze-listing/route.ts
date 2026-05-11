import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyze marketplace listing photos. Return JSON only. Detect object, category, possible brand, possible model, suggested_title, confidence from 0 to 1. Allowed categories: vehicles, parts, electronics, clothing, real_estate, general. Example JSON: {\"object\":\"Mercedes-Benz SUV\",\"category\":\"vehicles\",\"brand\":\"Mercedes-Benz\",\"model\":\"GL-Class\",\"suggested_title\":\"Mercedes-Benz GL-Class\",\"confidence\":0.92}",
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

    return Response.json({
      success: true,
      result: JSON.parse(text),
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, error: "AI analyze failed" },
      { status: 500 }
    );
  }
}
