import { NextResponse } from "next/server";
import OpenAI from "openai";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";

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

    // Prepare S3 presigning helpers
    const BUCKET =
      process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || "";
    const REGION =
      process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
    const s3 = new S3Client({ region: REGION });

    const isOurS3 = (url: string) => BUCKET && url.includes(`${BUCKET}.s3`);
    const presignIfNeeded = async (url: string) => {
      if (!isOurS3(url)) return url;
      try {
        const key = new URL(url).pathname.replace(/^\//, "");
        const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
        return await getSignedUrl(s3, cmd, { expiresIn: 600 });
      } catch {
        return url;
      }
    };
    const isReachable = async (url: string) => {
      try {
        const head = await fetch(url, { method: "HEAD" });
        if (head.ok) return true;
      } catch {}
      try {
        const get = await fetch(url, {
          method: "GET",
          headers: { Accept: "image/*", Range: "bytes=0-0" },
        });
        return get.ok;
      } catch {
        return false;
      }
    };

    // Presign S3 links and preflight with HEAD
    const candidate = await Promise.all(limitedImages.map(presignIfNeeded));
    const usable: string[] = [];
    const failed: string[] = [];
    for (const u of candidate) {
      if (await isReachable(u)) usable.push(u);
      else failed.push(u);
    }
    if (usable.length === 0) {
      return NextResponse.json(
        {
          error: "No fetchable images",
          details: { attempted: candidate.length, failed: failed.slice(0, 5) },
        },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const userContent: Array<any> = [
      {
        type: "text",
        text:
          "You will see slideshow images. Analyze them and produce ONE compact generation prompt (<=120 words) to recreate a similar slideshow. Focus ONLY on text/copy and content style — assume typography, size, position, animation, and colors are hardcoded.\n\nReturn EXACTLY three short paragraphs in plain text (no bullets):\n1) Start with: 'I want <N> slides about <inferred topic>.' Then write: 'The first slide should say '<hook text you infer or a faithful improved version>''.\n2) Describe voice/tone, perspective (2nd person with brief 1st‑person insights), and reading level (e.g., 7th–8th grade).\n3) Describe copy style and pacing: whether it's listicle vs narrative, how many slides after the first present numbered rules/principles, and what the final slide should summarize. Do not include layout, fonts, sizes, or positions. Plain text only; quotes only around the exact first‑slide line." +
          (context ? `\n\nExtra context from user: ${context}` : ""),
      },
      ...usable.map((url) => ({
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
