import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/tiktok_access_token=([^;]+)/);
  const accessToken = match?.[1];
  if (!accessToken)
    return NextResponse.json({ connected: false }, { status: 401 });

  try {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({}),
      }
    );
    const json = await res.json();
    if (!res.ok)
      return NextResponse.json(
        { connected: true, error: json },
        { status: 400 }
      );
    return NextResponse.json({ connected: true, data: json?.data || null });
  } catch (e: any) {
    return NextResponse.json(
      { connected: true, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
