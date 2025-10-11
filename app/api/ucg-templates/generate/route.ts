import { NextRequest, NextResponse } from "next/server";
import { createS3Client } from "@/lib/aws";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { createUcgTemplate } from "@/db/queries";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const type = formData.get("type") as string;

    if (!file || !title || !type) {
      return NextResponse.json(
        { error: "file, title, and type are required" },
        { status: 400 }
      );
    }

    // Step 1: Upload to S3
    const bucket = (process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME) as string | undefined;
    if (!bucket) {
      return NextResponse.json(
        { error: "Missing AWS_S3_BUCKET" },
        { status: 500 }
      );
    }

    const s3 = createS3Client();
    const key = `ucg-templates/${Date.now()}-${file.name}`;

    const { url: uploadUrl, fields } = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: key,
      Conditions: [["content-length-range", 0, 200 * 1024 * 1024]],
      Fields: { "Content-Type": file.type },
      Expires: 60,
    });

    // Upload to S3
    const s3FormData = new FormData();
    Object.entries(fields).forEach(([k, v]) => {
      s3FormData.append(k, v as string);
    });
    s3FormData.append("file", file);

    const uploadResult = await fetch(uploadUrl, {
      method: "POST",
      body: s3FormData,
    });

    if (!uploadResult.ok) {
      throw new Error("Failed to upload to S3");
    }

    const publicUrl = `https://${bucket}.s3.amazonaws.com/${key}`;

    // Step 2: Create 1 ucgTemplate record in DB
    const template = await createUcgTemplate({
      title,
      imageUrl: publicUrl,
      imageId: key,
      status: "PENDING",
    });

    console.log("Created template:", template);

    if (!template || !template.id) {
      throw new Error("Failed to create template in database");
    }

    // Step 3: Call n8n with template ID and type
    const n8nFormData = new FormData();
    n8nFormData.append("Product", file);
    n8nFormData.append("Product Name", title);
    n8nFormData.append("template_id", template.id.toString());
    n8nFormData.append("type", type);

    console.log("Sending to n8n:", {
      templateId: template.id,
      title,
      type,
      fileName: file.name,
    });

    const n8nResponse = await fetch(
      "https://davidkorn.app.n8n.cloud/form/7080d274-4a36-426d-b4e0-6b1160efa587",
      {
        method: "POST",
        body: n8nFormData,
      }
    );

    console.log("n8n response status:", n8nResponse.status);

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error("n8n error:", errorText);
      throw new Error(`n8n failed: ${errorText}`);
    }

    // Return as array for consistency
    return NextResponse.json({
      success: true,
      data: [template],
    });
  } catch (error: any) {
    console.error("Error generating templates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate templates" },
      { status: 500 }
    );
  }
}

