import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

type AnalyzeRequestBody = {
  images: string[]; // Publicly accessible URLs
  context?: string; // Optional extra context to steer the prompt
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzeRequestBody;
    const images = Array.isArray(body?.images) ? body.images : [];
    const context = body?.context?.toString().slice(0, 2000) ?? "";

    if (images.length === 0) {
      return NextResponse.json(
        { error: "Missing 'images' array in request body" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    // GPT-4o can handle multiple images; keep a sane upper bound per request
    const MAX_IMAGES = 15;
    const limitedImages = images.slice(0, MAX_IMAGES);

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const userContent: Array<any> = [
      {
        type: "text",
        text:
          "You will see slideshow images. Analyze them and produce ONE compact generation prompt (<=120 words) to recreate a similar slideshow. Focus ONLY on text/copy and content style — assume typography, size, position, animation, and colors are hardcoded.\n\nReturn EXACTLY three short paragraphs in plain text (no bullets):\n1) Start with: 'I want <N> slides about <inferred topic>.' Then write: 'The first slide should say '<hook text you infer or a faithful improved version>''.\n2) Describe voice/tone, perspective (2nd person with brief 1st‑person insights), and reading level (e.g., 7th–8th grade).\n3) Describe copy style and pacing: whether it's listicle vs narrative, how many slides after the first present numbered rules/principles, and what the final slide should summarize. Do not include layout, fonts, sizes, or positions. Plain text only; quotes only around the exact first‑slide line." +
          (context ? `\n\nExtra context from user: ${context}` : ""),
      },
      ...limitedImages.map((url) => ({
        type: "image_url",
        image_url: { url },
      })),
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are an expert TikTok slideshow prompt engineer. You produce actionable, compact prompts (<120 words) that yield engaging, educational listicle-style slideshows. Use plain text only.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    const prompt = completion.choices?.[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ prompt });
  } catch (err) {
    console.error("/api/slideshows/analyze error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
