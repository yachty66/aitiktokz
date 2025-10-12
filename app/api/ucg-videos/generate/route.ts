import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { createUcgVideo } from "@/db/queries";

export async function POST(req: NextRequest) {
  try {
    const { templateId, model } = await req.json();

    if (!templateId || !model) {
      return NextResponse.json(
        { error: "templateId and model are required" },
        { status: 400 }
      );
    }

    // Step 1: Create ucgVideos record with PENDING status
    const video = await createUcgVideo({
      templateId: templateId,
      status: "PENDING",
    });

    // Step 2: Call n8n to generate the video (async, don't wait)
    // n8n will update the video record when done
    const n8nUrl = "https://davidkorn.app.n8n.cloud/webhook/08cbbe94-dc37-49b9-ba30-38d406447cf4";
    
    fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_id: video.id,
        template_id: templateId,
        model: model,
      }),
    }).catch((err) => {
      console.error("n8n call failed (non-blocking):", err);
    });

    // Step 3: Return immediately with video record
    return NextResponse.json({
      success: true,
      data: video,
    });
  } catch (error: any) {
    console.error("Error generating video:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate video" },
      { status: 500 }
    );
  }
}

