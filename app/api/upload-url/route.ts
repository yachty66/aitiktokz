import { NextRequest, NextResponse } from "next/server";
import { createS3Client } from "@/lib/aws";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

export async function POST(req: NextRequest) {
  try {
    const { fileName, contentType } = await req.json();
    const bucket = (process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME) as
      | string
      | undefined;
    if (!bucket) {
      return NextResponse.json(
        { error: "Missing AWS_S3_BUCKET" },
        { status: 500 }
      );
    }
    const s3 = createS3Client();
    const key = `uploads/${Date.now()}-${fileName}`;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: key,
      Conditions: [["content-length-range", 0, 200 * 1024 * 1024]],
      Fields: { "Content-Type": contentType },
      Expires: 60, // seconds
    });

    return NextResponse.json({
      url,
      fields,
      key,
      publicUrl: `https://${bucket}.s3.amazonaws.com/${key}`,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to create upload" },
      { status: 500 }
    );
  }
}
