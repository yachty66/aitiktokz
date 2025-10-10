import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const n = Math.min(
      10,
      Math.max(1, parseInt(url.searchParams.get("n") || "5", 10))
    );
    const prefix = url.searchParams.get("prefix") || "pinterest-surrealism/";

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
    const objects: string[] = [];
    let token: string | undefined;
    // Fetch up to 1000 keys under prefix
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
        if (o.Key && !o.Key.endsWith("/")) objects.push(o.Key);
      });
      token = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (token && objects.length < 1000);

    if (objects.length === 0) {
      return NextResponse.json({ images: [] });
    }

    const chosen = sample(objects, n);
    const urls = chosen.map((key) => buildPublicUrl(bucket, region, key));
    return NextResponse.json({ images: urls });
  } catch (err) {
    console.error("/api/images/random error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
