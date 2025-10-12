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
 
    // Step 3: Call n8n webhook with JSON payload
    console.log("Sending to n8n webhook:", {
      templateId: template.id,
      title,
      type,
      fileName: file.name,
      publicUrl,
    });

    const n8nResponse = await fetch(
      "https://davidkorn.app.n8n.cloud/webhook/1e87a23b-c249-4dfe-bf37-18d758c7d715",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            filename: file.name,
            mimetype: file.type,
            url: publicUrl,
          },
          productName: title,
          template_id: template.id,
          type,
          formMode: "production",
        }),
      }
    );

    console.log("n8n response status:", n8nResponse.status);

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error("n8n error:", errorText);
      throw new Error(`n8n failed: ${errorText}`);
    }

    // Expect n8n to finish and update the DB; fetch the latest template
    // so we can return the completed prompt immediately.
    // If n8n also returns the prompt directly, prefer that; otherwise read from DB.
    let finalTemplate = template;
    try {
      const n8nJson = await n8nResponse.json().catch(() => null);
      if (n8nJson && n8nJson.data && n8nJson.data.template) {
        finalTemplate = n8nJson.data.template;
      } else {
        // Fallback: query DB by id
        const { getUcgTemplateById } = await import("@/db/queries");
        const fresh = await getUcgTemplateById(template.id);
        if (fresh) finalTemplate = fresh as any;
      }
    } catch (e) {
      console.warn("Failed to parse n8n JSON or fetch final template, returning created template", e);
    }

    return NextResponse.json({
      success: true,
      data: [finalTemplate],
    });
  } catch (error: any) {
    console.error("Error generating templates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate templates" },
      { status: 500 }
    );
  }
}

