import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const upstream = await fetch(url, { cache: "no-store" });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream fetch failed with ${upstream.status}` },
        { status: 500 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const arrayBuf = await upstream.arrayBuffer();
    return new NextResponse(arrayBuf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to proxy image" },
      { status: 500 }
    );
  }
}
