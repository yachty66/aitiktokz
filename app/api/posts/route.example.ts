// EXAMPLE: API route for managing posts
// This shows how to use Drizzle with the posts table

import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createSupabaseServerClient } from "@/lib/supabase";

// GET all posts (optionally filter by status or user)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const userEmail = searchParams.get("user_email");

    let query = db.select().from(posts).orderBy(desc(posts.createdAt));

    // Filter by status if provided
    if (status) {
      const filteredPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.status, status))
        .orderBy(desc(posts.createdAt));
      return NextResponse.json({ data: filteredPosts });
    }

    // Filter by user email if provided
    if (userEmail) {
      const userPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.userEmail, userEmail))
        .orderBy(desc(posts.createdAt));
      return NextResponse.json({ data: userPosts });
    }

    const allPosts = await query;
    return NextResponse.json({ data: allPosts });
  } catch (err) {
    console.error("Posts fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

// POST - Create a new post
export async function POST(req: Request) {
  try {
    // Optional: Get authenticated user from Supabase
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await req.json();
    const {
      title,
      account,
      startAt,
      videoUrl,
      description,
      hashtags,
      status = "queued",
    } = body;

    // Create post with user info if authenticated
    const [post] = await db
      .insert(posts)
      .values({
        title,
        account,
        startAt: startAt ? new Date(startAt) : undefined,
        videoUrl,
        description,
        hashtags,
        userUid: user?.id,
        userEmail: user?.email,
        status,
      })
      .returning();

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (err) {
    console.error("Post creation error:", err);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}

// PATCH - Update a post
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    // Handle date conversion for startAt
    if (updates.startAt) {
      updates.startAt = new Date(updates.startAt);
    }

    const [updatedPost] = await db
      .update(posts)
      .set(updates)
      .where(eq(posts.id, id))
      .returning();

    if (!updatedPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updatedPost });
  } catch (err) {
    console.error("Post update error:", err);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a post
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    await db.delete(posts).where(eq(posts.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Post deletion error:", err);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}

