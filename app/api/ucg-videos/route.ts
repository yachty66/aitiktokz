import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getAllUcgVideos } from "@/db/queries";

export async function GET(req: NextRequest) {
  try {
    // Get all UCG videos
    const videos = await getAllUcgVideos();

    return NextResponse.json({ data: videos });
  } catch (error: any) {
    console.error("Error fetching UCG videos:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

