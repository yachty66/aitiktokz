import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  if (err) {
    return NextResponse.redirect(
      `/dashboard/tiktok-accounts?error=${encodeURIComponent(err)}`
    );
  }
  if (!code) {
    return NextResponse.redirect(
      "/dashboard/tiktok-accounts?error=missing_code"
    );
  }

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.TIKTOK_REDIRECT_URI || "",
    }),
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    return NextResponse.redirect(
      `/dashboard/tiktok-accounts?error=token_exchange_failed&details=${encodeURIComponent(
        txt
      )}`
    );
  }

  const json = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const resp = NextResponse.redirect("/dashboard/tiktok-accounts?connected=1");
  if (json.access_token) {
    resp.cookies.set("tiktok_access_token", json.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: (json.expires_in ?? 3600) - 60,
      path: "/",
    });
  }
  if (json.refresh_token) {
    resp.cookies.set("tiktok_refresh_token", json.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
  return resp;
}
