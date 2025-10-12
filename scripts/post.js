// Post a simple TikTok video generated from a single image (bs1.jpg)
// Requirements:
// 1) TikTok OAuth token with scopes: user.info.basic, video.upload, video.publish
// 2) Put TIKTOK_ACCESS_TOKEN in your env (or paste directly below for testing)
// 3) This script uses ffmpeg to convert bs1.jpg -> temp.mp4 (3s). Install ffmpeg or use ffmpeg-static

import { spawn } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Use built-in fetch in Node 18+

// --------- CONFIG ---------
const ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN || ""; // paste if needed
const IMAGE_FILE = path.resolve(process.cwd(), "scripts", "bs1.jpg");
const OUTPUT_FILE = path.resolve(os.tmpdir(), `tiktok_temp_${Date.now()}.mp4`);
const CAPTION = process.env.TIKTOK_CAPTION || "Posted from script";
const VISIBILITY = "PUBLIC"; // PUBLIC | FRIENDS | PRIVATE
// ---------------------------

if (!ACCESS_TOKEN) {
  console.error("ERROR: TIKTOK_ACCESS_TOKEN is not set.");
  process.exit(1);
}

async function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function ensureFfmpeg() {
  try {
    await run("ffmpeg", ["-version"]);
    return "ffmpeg";
  } catch {
    try {
      const ffmpegPath = (await import("ffmpeg-static")).default;
      if (!ffmpegPath) throw new Error("ffmpeg-static not found");
      return ffmpegPath;
    } catch (e) {
      console.error(
        "ffmpeg not found. Install it or add ffmpeg-static: npm i -D ffmpeg-static"
      );
      throw e;
    }
  }
}

async function makeVideoFromImage() {
  const ffmpegBin = await ensureFfmpeg();
  // Create a 3s vertical (1080x1920) video from the image, centered with black bars if needed
  const args = [
    "-loop",
    "1",
    "-t",
    "3",
    "-i",
    IMAGE_FILE,
    "-vf",
    "scale=1080:-2:flags=lanczos, pad=1080:1920:(1080-iw)/2:(1920-ih)/2:black,format=yuv420p",
    "-r",
    "30",
    "-y",
    OUTPUT_FILE,
  ];
  await run(ffmpegBin, args);
  return OUTPUT_FILE;
}

async function tiktokInit(accessToken, caption, privacy) {
  const res = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_info: { source: "FILE_UPLOAD" },
        post_info: { caption, privacy_level: privacy },
      }),
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

async function tiktokUpload(uploadUrl, filePath) {
  const bytes = await readFile(filePath);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4" },
    body: bytes,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`upload_failed: ${txt}`);
  }
}

async function tiktokPublish(accessToken, publishId) {
  const res = await fetch(
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
  const json = await res.json();
  if (!res.ok) throw new Error(`publish_failed: ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  console.log("Creating temp MP4 from:", IMAGE_FILE);
  const mp4 = await makeVideoFromImage();
  try {
    console.log("Init upload...");
    const { uploadUrl, publishId } = await tiktokInit(
      ACCESS_TOKEN,
      CAPTION,
      VISIBILITY
    );
    console.log("Uploading bytes...");
    await tiktokUpload(uploadUrl, mp4);
    console.log("Publishing...");
    const result = await tiktokPublish(ACCESS_TOKEN, publishId);
    console.log("Success:", JSON.stringify(result, null, 2));
  } finally {
    try {
      await unlink(mp4);
    } catch {}
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
