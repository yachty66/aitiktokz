import { NextRequest, NextResponse } from "next/server";
import { createS3Client } from "@/lib/aws";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as unknown as File | null;
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const bucket = (process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME) as
      | string
      | undefined;
    if (!bucket) {
      return NextResponse.json(
        { error: "Missing AWS_S3_BUCKET" },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const body = new Uint8Array(arrayBuffer);
    const contentType = (file as any).type || "application/octet-stream";
    const fileName = (file as any).name || `upload-${Date.now()}`;
    const key = `uploads/${Date.now()}-${fileName}`;

    const s3 = createS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );

    return NextResponse.json({
      key,
      publicUrl: `https://${bucket}.s3.amazonaws.com/${key}`,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
