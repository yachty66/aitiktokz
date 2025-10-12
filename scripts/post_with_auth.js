// Simple TikTok post script (OAuth PKCE → init → upload → publish)
// Usage: node scripts/post_with_auth.js
// - Opens TikTok consent in your browser
// - After login, paste the FULL redirected URL from https://maxhager.xyz/ back here

"use strict";

const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { spawn } = require("node:child_process");
const readline = require("node:readline");

// --- Config (sandbox credentials) ---
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || "sbawelekk7yrlzy62u";
const CLIENT_SECRET =
  process.env.TIKTOK_CLIENT_SECRET || "S7ll3zYrf5Dk1HJ3n4olKRZgpFnIEffe";
const REDIRECT_URI = "https://maxhager.xyz/api/tiktok/callback"
const VIDEO_PATH = path.resolve(__dirname, "sample.mov");
const CAPTION = process.env.TIKTOK_CAPTION || "Posted from script";
const VISIBILITY = process.env.TIKTOK_VISIBILITY || "PUBLIC"; // PUBLIC | FRIENDS | PRIVATE

function base64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}



function openBrowser(url) {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
      ? "start"
      : "xdg-open";
  try {
    spawn(cmd, [url], { stdio: "ignore", shell: true });
  } catch {
    console.log("Open this URL:", url);
  }
}

async function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function oauthPkce() {
  const codeVerifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
  const state = base64url(crypto.randomBytes(16));
  const scope = encodeURIComponent(
    ["user.info.basic", "video.upload", "video.publish"].join(",")
  );
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${CLIENT_KEY}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;

  console.log("Opening browser for TikTok consent...");
  console.log("AUTH:", authUrl)
  openBrowser(authUrl);
  console.log("After login, you will be redirected to:", REDIRECT_URI);
  const pasted = await prompt("Paste FULL redirected URL here: ");
  let code;
  try {
    code = new URL(pasted.trim()).searchParams.get("code") || undefined;
  } catch {}
  if (!code)
    throw new Error(
      "No code found in pasted URL. Ensure redirect URI matches app settings."
    );

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: CLIENT_KEY,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });
  const json = await res.json();
  if (!res.ok)
    throw new Error(`token_exchange_failed: ${JSON.stringify(json)}`);
  const accessToken = json.access_token;
  if (!accessToken) throw new Error("missing access_token");
  return accessToken;
}

async function initUpload(accessToken) {
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
        post_info: { caption: CAPTION, privacy_level: VISIBILITY },
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

async function uploadVideo(uploadUrl, filePath) {
  const bytes = await fsp.readFile(filePath);
  const contentType = filePath.toLowerCase().endsWith(".mov")
    ? "video/quicktime"
    : "video/mp4";
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: bytes,
  });
  if (!putRes.ok) throw new Error(`upload_failed: ${await putRes.text()}`);
}

async function publishPost(accessToken, publishId) {
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

(async function main() {
  try {
    if (!fs.existsSync(VIDEO_PATH))
      throw new Error(`Video not found: ${VIDEO_PATH}`);
    console.log("1) OAuth...");
    const token = await oauthPkce();
    console.log("2) Init upload...");
    const { uploadUrl, publishId } = await initUpload(token);
    console.log("3) Upload video...");
    await uploadVideo(uploadUrl, VIDEO_PATH);
    console.log("4) Publish...");
    const result = await publishPost(token, publishId);
    console.log("Success:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
