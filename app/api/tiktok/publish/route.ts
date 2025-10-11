import { NextResponse } from "next/server";

type Body = {
  videoUrl: string;
  caption?: string;
  visibility?: "PUBLIC" | "FRIENDS" | "PRIVATE";
};

function getCookie(cookies: string | null | undefined, key: string) {
  if (!cookies) return null;
  const m = cookies.match(new RegExp(`${key}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function POST(req: Request) {
  try {
    const cookie = req.headers.get("cookie");
    const accessToken = getCookie(cookie, "tiktok_access_token");
    if (!accessToken) {
      return NextResponse.json(
        { error: "Not connected to TikTok" },
        { status: 401 }
      );
    }

    const {
      videoUrl,
      caption = "",
      visibility = "PUBLIC",
    } = (await req.json()) as Body;
    if (!videoUrl) {
      return NextResponse.json({ error: "Missing videoUrl" }, { status: 400 });
    }

    // 1) INIT upload
    const initRes = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_info: { source: "FILE_UPLOAD" },
          post_info: { caption, privacy_level: visibility },
        }),
      }
    );
    if (!initRes.ok) {
      const txt = await initRes.text();
      return NextResponse.json(
        { error: "init_failed", details: txt },
        { status: 400 }
      );
    }
    const initJson = (await initRes.json()) as {
      data?: { upload_url: string; publish_id: string };
    };
    const uploadUrl = initJson?.data?.upload_url;
    const publishId = initJson?.data?.publish_id;
    if (!uploadUrl || !publishId) {
      return NextResponse.json(
        { error: "init_missing_fields", details: initJson },
        { status: 400 }
      );
    }

    // 2) Download video bytes and upload to TikTok
    const fileRes = await fetch(videoUrl);
    if (!fileRes.ok) {
      const txt = await fileRes.text();
      return NextResponse.json(
        { error: "fetch_video_failed", details: txt },
        { status: 400 }
      );
    }
    const bytes = new Uint8Array(await fileRes.arrayBuffer());
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "video/mp4" },
      body: bytes,
    });
    if (!putRes.ok) {
      const txt = await putRes.text();
      return NextResponse.json(
        { error: "upload_failed", details: txt },
        { status: 400 }
      );
    }

    // 3) Publish
    const publishRes = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publish_id: publishId }),
      }
    );
    const publishJson = await publishRes.json();
    if (!publishRes.ok) {
      return NextResponse.json(
        { error: "publish_failed", details: publishJson },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, data: publishJson });
  } catch (e: any) {
    return NextResponse.json(
      { error: "server_error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
