import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getUcgVideoById } from "@/db/queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);

    if (isNaN(videoId)) {
      return NextResponse.json(
        { error: "Invalid video ID" },
        { status: 400 }
      );
    }

    // Get the video record
    const video = await getUcgVideoById(videoId);

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: video,
      isDone: video.status === "DONE",
    });
  } catch (error: any) {
    console.error("Error fetching video status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch video status" },
      { status: 500 }
    );
  }
}

