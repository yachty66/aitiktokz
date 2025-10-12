import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

function buildPublicUrl(bucket: string, region: string, key: string): string {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "27", 10))
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
    let images: string[] = [];
    let token: string | undefined;

    // List objects in lexicographic order until we have 'limit' keys
    while (images.length < limit) {
      const resp = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: token,
          MaxKeys: Math.min(1000, limit - images.length),
        })
      );
      const keys = (resp.Contents || [])
        .map((o) => o.Key)
        .filter((k): k is string => !!k && !k.endsWith("/"));

      for (const k of keys) {
        if (images.length >= limit) break;
        images.push(buildPublicUrl(bucket, region, k));
      }
      if (!resp.IsTruncated) break;
      token = resp.NextContinuationToken;
    }

    return NextResponse.json({ images });
  } catch (err) {
    console.error("/api/images/list error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
