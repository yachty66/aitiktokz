// Usage:
//   TIKTOK_ACCESS_TOKEN=act.xxxxx node tiktok-post.js
//   or
//   node tiktok-post.js act.xxxxx "Optional title"
//
// This script uploads the local file "sample.mov" (in the same directory)
// to TikTok via the Open API and publishes it as a PRIVATE post (required
// for unaudited apps). It is intentionally self-contained.

"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const ACCESS_TOKEN =
  "act.OABTKK4Mg6S9uL25kKga6cySJJuzNp5B24bTrNwouBmhb7BDnkhpA8yUh0NH!4692.e1";
const VIDEO_PATH = path.resolve(__dirname, "sample.mov");
const TITLE =
  process.env.TIKTOK_TITLE || process.argv[3] || "Uploaded with TikTok API";

async function initUpload(accessToken, videoSize) {
  const body = {
    source_info: {
      source: "FILE_UPLOAD",
      video_size: videoSize,
      chunk_size: videoSize,
      total_chunk_count: 1,
    },
  };

  // Use the Inbox init endpoint (works for unaudited apps)
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

async function publish(accessToken, publishId, title) {
  const commonHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json; charset=UTF-8",
    Accept: "application/json",
  };
  const payloadTitle = {
    publish_id: publishId,
    post_info: { privacy_level: "PRIVATE", title },
  };
  const payloadCaption = {
    publish_id: publishId,
    post_info: { privacy_level: "PRIVATE", caption: title },
  };

  // Try standard publish first
  let res = await fetch("https://open.tiktokapis.com/v2/post/publish/video/", {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify(payloadTitle),
  });
  let text = await res.text();
  let ct = res.headers.get("content-type") || "";
  if (res.ok && ct.includes("application/json")) return JSON.parse(text);

  // If 404 or 400, try the Inbox publish endpoint
  if (!res.ok && (res.status === 404 || res.status === 400)) {
    res = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/inbox/video/",
      {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify(payloadCaption),
      }
    );
    text = await res.text();
    ct = res.headers.get("content-type") || "";
    if (res.ok && ct.includes("application/json")) return JSON.parse(text);
  }

  throw new Error(`publish_failed_http_${res.status}: ${text}`);
}

async function main() {
  // ACCESS_TOKEN is hardcoded above for local testing
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

  console.log("3) Publishing (PRIVATE)...");
  const result = await publish(ACCESS_TOKEN, publishId, TITLE);
  console.log("Success:", JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
