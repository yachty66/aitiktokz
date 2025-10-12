import { NextRequest, NextResponse } from "next/server";
import { getUcgTemplateById, updateUcgTemplate } from "@/db/queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const templateId = parseInt(id);

    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400 }
      );
    }

    // Get the template record
    const template = await getUcgTemplateById(templateId);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: template,
      isDone: template.status === "DONE",
    });
  } catch (error: any) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch template" },
      { status: 500 }
    );
  }
}


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const templateId = parseInt(id);

    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { adPrompt, status, title, imageUrl, imageId } = body || {};

    if (
      typeof adPrompt === "undefined" &&
      typeof status === "undefined" &&
      typeof title === "undefined" &&
      typeof imageUrl === "undefined" &&
      typeof imageId === "undefined"
    ) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 }
      );
    }

    const updated = await updateUcgTemplate(templateId, {
      adPrompt,
      status,
      title,
      imageUrl,
      imageId,
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update template" },
      { status: 500 }
    );
  }
}

