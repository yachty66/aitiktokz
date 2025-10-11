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
          "Analyze these slideshow images and write a single, concise generation prompt that recreates the style, tone, structure, and storyline. Include guidance on hook, slide pacing, typography style, and imagery. Return ONLY the prompt text (no preamble)." +
          (context ? `\n\nExtra context from user: ${context}` : ""),
      },
      ...limitedImages.map((url) => ({
        type: "input_image",
        image_url: { url },
      })),
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
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
