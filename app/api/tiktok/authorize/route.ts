import { NextResponse } from "next/server";
import crypto from "node:crypto";

export async function GET() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;
  if (!clientKey || !redirectUri) {
    return NextResponse.json(
      { error: "Missing TIKTOK_CLIENT_KEY or TIKTOK_REDIRECT_URI" },
      { status: 500 }
    );
  }

  const scope = encodeURIComponent(
    ["user.info.basic", "video.upload", "video.publish"].join(",")
  );

  // NOTE: For production, store and verify this in a cookie/session
  const state = crypto.randomBytes(16).toString("hex");

  const url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${state}`;

  return NextResponse.redirect(url);
}
