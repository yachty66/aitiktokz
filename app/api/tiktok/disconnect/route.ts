import { NextResponse } from "next/server";

export async function POST() {
  const resp = NextResponse.json({ ok: true });
  resp.cookies.set("tiktok_access_token", "", { httpOnly: true, maxAge: 0 });
  resp.cookies.set("tiktok_refresh_token", "", { httpOnly: true, maxAge: 0 });
  return resp;
}
