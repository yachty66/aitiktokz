import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getAllUcgTemplates } from "@/db/queries";

export async function GET(req: NextRequest) {
  try {
    // Get all templates
    const templates = await getAllUcgTemplates();

    return NextResponse.json({ data: templates });
  } catch (error: any) {
    console.error("Error fetching UCG templates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

