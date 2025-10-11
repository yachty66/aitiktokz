// EXAMPLE: This shows how to refactor the waitlist route to use Drizzle ORM
// To use this, rename this file to route.ts (backup the old one first)

import { NextResponse } from "next/server";
import { db } from "@/db";
import { waitlist } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if email already exists
    const existing = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Insert new waitlist entry
    const [entry] = await db
      .insert(waitlist)
      .values({ email })
      .returning();

    return NextResponse.json({ ok: true, data: entry });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json(
      { error: "Failed to add to waitlist" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get all waitlist entries (you might want to add auth here)
    const entries = await db.select().from(waitlist);

    return NextResponse.json({ data: entries });
  } catch (err) {
    console.error("Waitlist fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch waitlist" },
      { status: 500 }
    );
  }
}

