import { NextResponse } from "next/server";
import OpenAI from "openai";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

type GenerateBody = {
  prompt: string;
  prefix?: string; // S3 prefix, defaults to pinterest-surrealism/
  max?: number; // optional cap
};

function sample<T>(arr: T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.max(0, Math.min(n, a.length)));
}

function buildPublicUrl(bucket: string, region: string, key: string): string {
  const parts = key.split("/").map(encodeURIComponent).join("/");
  return `https://${bucket}.s3.${region}.amazonaws.com/${parts}`;
}

export async function POST(req: Request) {
  try {
    const {
      prompt,
      prefix = "pinterest-surrealism/",
      max = 10,
    } = (await req.json()) as GenerateBody;
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    // 1) Use OpenAI to extract numSlides and slide texts (JSON)
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You return compact JSON only. Given a user prompt for a slideshow, infer an integer numSlides (default 5 if unknown, clamp 1..10) and produce an array 'slides' with numSlides strings (one short line per slide).",
        },
        {
          role: "user",
          content: `PROMPT: ${prompt}\nReturn JSON like {"numSlides":5,"slides":["text1","text2",...]}. No extra fields.`,
        },
      ],
    });
    const raw = completion.choices?.[0]?.message?.content || "{}";
    let json: { numSlides?: number; slides?: string[] } = {};
    try {
      json = JSON.parse(raw);
    } catch {}
    let num = Math.max(1, Math.min(10, Number(json.numSlides || 5)));
    const texts =
      Array.isArray(json.slides) && json.slides.length
        ? json.slides.slice(0, num)
        : Array.from({ length: num }).map((_, i) => `Slide ${i + 1}`);
    num = Math.min(num, texts.length);

    // 2) Fetch S3 images and pick num random images
    const bucket = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
    const region =
      process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
    if (!bucket) {
      return NextResponse.json(
        { error: "Missing bucket env (S3_BUCKET_NAME or AWS_S3_BUCKET)" },
        { status: 500 }
      );
    }
    const s3 = new S3Client({ region });
    const keys: string[] = [];
    let token: string | undefined;
    let fetched = 0;
    const cap = 1000;
    do {
      const resp = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: token,
          MaxKeys: 1000,
        })
      );
      (resp.Contents || []).forEach((o) => {
        if (o.Key && !o.Key.endsWith("/")) keys.push(o.Key);
      });
      fetched += resp.KeyCount ?? 0;
      token =
        resp.IsTruncated && fetched < cap
          ? resp.NextContinuationToken
          : undefined;
    } while (token);

    if (keys.length === 0) {
      return NextResponse.json(
        { error: "No images found under prefix", slides: [] },
        { status: 200 }
      );
    }
    const chosen = sample(keys, num);
    const images = chosen.map((k) => buildPublicUrl(bucket, region, k));

    const slides = texts
      .slice(0, num)
      .map((t, i) => ({ text: t, image: images[i % images.length] }));
    return NextResponse.json({ numSlides: num, slides });
  } catch (err) {
    console.error("/api/slides/generate error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
