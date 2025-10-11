import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getUcgVideoById, updateUcgVideo } from "@/db/queries";

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


export async function PATCH(
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

    const body = await req.json().catch(() => ({}));
    const { status, bucketUrl, bucketId, thumbnailUrl, postId } = body || {};

    if (
      typeof status === "undefined" &&
      typeof bucketUrl === "undefined" &&
      typeof bucketId === "undefined" &&
      typeof thumbnailUrl === "undefined" &&
      typeof postId === "undefined"
    ) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 }
      );
    }

    const updated = await updateUcgVideo(videoId, {
      status,
      bucketUrl,
      bucketId,
      thumbnailUrl,
      postId,
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("Error updating video:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update video" },
      { status: 500 }
    );
  }
}

