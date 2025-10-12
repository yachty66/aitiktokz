// Direct post to TikTok using an existing access token.
// Usage:
//   TIKTOK_ACCESS_TOKEN=act.xxxxx node scripts/tiktok_direct_post.js
//   (reads video from scripts/sample.mov)

"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const VIDEO_PATH = path.resolve(__dirname, "sample.mov");
const ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN || "";

async function initUpload(accessToken, videoSize) {
  const body = {
    source_info: {
      source: "FILE_UPLOAD",
      video_size: videoSize,
      chunk_size: videoSize,
      total_chunk_count: 1,
    },
  };

  const res = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
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
  const uploadUrl = json?.data?.upload_url;
  const publishId = json?.data?.publish_id;
  if (!uploadUrl || !publishId)
    throw new Error(`init_missing_fields: ${JSON.stringify(json)}`);
  return { uploadUrl, publishId };
}

async function uploadVideo(uploadUrl, filePath) {
  const stat = await fsp.stat(filePath);
  const size = stat.size;
  const endByte = size - 1;
  const bytes = await fsp.readFile(filePath);
  const contentType = filePath.toLowerCase().endsWith(".mov")
    ? "video/quicktime"
    : "video/mp4";

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Content-Range": `bytes 0-${endByte}/${size}`,
    },
    body: bytes,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`upload_failed: ${txt}`);
  }
}

async function publish(accessToken, publishId) {
  const res = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`publish_failed: ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  if (!ACCESS_TOKEN) {
    console.error("TIKTOK_ACCESS_TOKEN is required. Export it then retry.");
    process.exit(1);
  }
  if (!fs.existsSync(VIDEO_PATH)) {
    console.error(`Video not found at ${VIDEO_PATH}`);
    process.exit(1);
  }

  const size = (await fsp.stat(VIDEO_PATH)).size;
  console.log("1) Init upload...");
  const { uploadUrl, publishId } = await initUpload(ACCESS_TOKEN, size);
  console.log("publish_id:", publishId);
  console.log("upload_url:", uploadUrl);

  console.log("2) Uploading bytes...");
  await uploadVideo(uploadUrl, VIDEO_PATH);
  console.log("Upload complete.");

  console.log("3) Publishing...");
  const result = await publish(ACCESS_TOKEN, publishId);
  console.log("Success:", JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
