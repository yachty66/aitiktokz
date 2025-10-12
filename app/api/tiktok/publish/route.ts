import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function initUpload(
  accessToken: string,
  videoSize: number,
  title?: string
) {
  const body = {
    source_info: {
      source: "FILE_UPLOAD",
      video_size: videoSize,
      chunk_size: videoSize,
      total_chunk_count: 1,
    },
  } as const;

  const res = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`init_failed: ${JSON.stringify(json)}`);
  const uploadUrl = json?.data?.upload_url as string | undefined;
  const publishId = json?.data?.publish_id as string | undefined;
  if (!uploadUrl || !publishId)
    throw new Error(`init_missing_fields: ${JSON.stringify(json)}`);
  return { uploadUrl, publishId };
}

export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/tiktok_access_token=([^;]+)/);
    const accessToken = match?.[1] || process.env.TIKTOK_ACCESS_TOKEN || "";
    if (!accessToken)
      return NextResponse.json(
        { error: "Not connected to TikTok" },
        { status: 401 }
      );

    const { videoUrl, title } = (await req.json()) as {
      videoUrl?: string;
      title?: string;
    };
    if (!videoUrl) {
      return NextResponse.json(
        { error: "Missing videoUrl (generate a video for the slideshow)" },
        { status: 400 }
      );
    }

    // Download video bytes
    const upstream = await fetch(videoUrl);
    if (!upstream.ok) {
      const t = await upstream.text();
      throw new Error(`download_failed: ${upstream.status} ${t}`);
    }
    const contentType = upstream.headers.get("content-type") || "video/mp4";
    const buf = Buffer.from(await upstream.arrayBuffer());

    // Init upload
    const { uploadUrl, publishId } = await initUpload(
      accessToken,
      buf.length,
      title
    );

    // Upload
    const resUpload = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buf.length),
        "Content-Range": `bytes 0-${buf.length - 1}/${buf.length}`,
      },
      body: new Uint8Array(buf),
    });
    if (!resUpload.ok) {
      const t = await resUpload.text();
      throw new Error(`upload_failed: ${resUpload.status} ${t}`);
    }

    // Publish
    // Try standard publish, then inbox publish as fallback
    let resPublish = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          Accept: "application/json",
        },
        body: JSON.stringify({
          publish_id: publishId,
          post_info: { privacy_level: "PRIVATE", ...(title ? { title } : {}) },
        }),
      }
    );
    let publishContentType = resPublish.headers.get("content-type") || "";
    let bodyText = await resPublish.text();
    if (!resPublish.ok || !publishContentType.includes("application/json")) {
      resPublish = await fetch(
        "https://open.tiktokapis.com/v2/post/publish/inbox/video/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
            Accept: "application/json",
          },
          body: JSON.stringify({
            publish_id: publishId,
            post_info: {
              privacy_level: "PRIVATE",
              ...(title ? { caption: title } : {}),
            },
          }),
        }
      );
      publishContentType = resPublish.headers.get("content-type") || "";
      bodyText = await resPublish.text();
    }
    if (!resPublish.ok) throw new Error(`publish_failed: ${bodyText}`);
    const publishJson = publishContentType.includes("application/json")
      ? JSON.parse(bodyText)
      : { raw: bodyText };

    return NextResponse.json({ ok: true, data: publishJson });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
