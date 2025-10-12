import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { exportedSlideshows } from "@/db/schema";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import os from "os";
import { createS3Client } from "@/lib/aws";
import { PutObjectCommand } from "@aws-sdk/client-s3";

type HeraSlideshowData = {
  images: string[];
  texts: string[];
  textBoxes: { x: number; y: number; widthPct: number }[];
  durations: number[];
  aspect: "1:1" | "4:5" | "3:4" | "9:16";
  prompt: string;
};

type HeraSlideshowPayload = {
  title: string;
  num_slides: number;
  total_duration_sec: number;
  thumbnail_url: string | null;
  data: HeraSlideshowData;
  templateUrl?: string; // optional: Hera motion URL to target
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HeraSlideshowPayload;
    const { title, num_slides, total_duration_sec, thumbnail_url, data } = body;

    if (!data || !Array.isArray(data.images)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const created = await db
      .insert(exportedSlideshows)
      .values({
        title,
        prompt: data.prompt,
        aspect: data.aspect,
        numSlides: num_slides,
        totalDurationSec: total_duration_sec,
        thumbnailUrl: thumbnail_url || null,
        data: {
          ...data,
          heraStatus: "processing",
          heraProgress: { completed: 0, total: data.images.length },
        },
      })
      .returning();

    const exportRow = created[0];
    if (!exportRow) {
      return NextResponse.json({ error: "Failed to create export row" }, { status: 500 });
    }

    // Fire-and-forget orchestration (runs sequentially)
    orchestrateHeraExport({ exportId: exportRow.id, payload: body }).catch(() => {
      // Errors are handled inside orchestrate; nothing to do here
    });

    return NextResponse.json({ exportId: exportRow.id }, { status: 202 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "Server error" }, { status: 500 });
  }
}

async function orchestrateHeraExport(args: { exportId: number; payload: HeraSlideshowPayload }) {
  const { exportId, payload } = args;
  const totalSlides = payload.data.images.length;

  // Update helper
  async function updateData(partial: Record<string, unknown>) {
    try {
      // Read current row to merge data safely
      const [row] = await db
        .select()
        .from(exportedSlideshows)
        .where(eq(exportedSlideshows.id, exportId));
      const currentData = (row?.data as Record<string, unknown>) || {};
      const nextData = { ...currentData, ...partial };
      await db
        .update(exportedSlideshows)
        .set({ data: nextData as any })
        .where(eq(exportedSlideshows.id, exportId));
    } catch (e) {
      // best-effort; log and continue
      console.error("Failed to update export data", e);
    }
  }

  try {
    // New flow:
    // 1) For each slide image + text, run the scraper with CLI flags to render a small video
    // 2) Concatenate the small videos with ffmpeg
    // 3) Upload resulting video to S3, update DB

    const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "hera-slides-"));
    const exportsDir = path.join(tmpRoot, 'exports');
    await fs.promises.mkdir(exportsDir, { recursive: true });
    const perSlideOutputs: string[] = [];

    const { images = [], texts = [] } = payload.data || ({} as any);
    const safeTexts = Array.isArray(texts) ? texts : [];
    const slides = images.map((img, idx) => ({ img, text: safeTexts[idx] || "" }));

    const motionUrl = payload.templateUrl || process.env.HERA_TEMPLATE_URL || (process.env.HERA_MOTION_URL as string) || "https://app.hera.video/motions/4ba2e3a6-00ce-40bf-9dbc-24e5836338fc";

    for (let i = 0; i < slides.length; i++) {
      const { img, text } = slides[i];
      // Download image to temp path if it's remote
      const imgPath = await materializeImageToFile(img, path.join(tmpRoot, `slide-${i}.jpg`));

      const outPath = await runScraperPerSlide({
        url: motionUrl,
        imagePath: imgPath,
        prompt: text || payload.data?.prompt || "",
      });
      // Ensure the file exists and record absolute path
      const absOut = path.isAbsolute(outPath) ? outPath : path.resolve(process.cwd(), outPath);
      if (fs.existsSync(absOut)) perSlideOutputs.push(absOut);
      await updateData({ heraProgress: { completed: i + 1, total: totalSlides } });
    }

    // Concatenate with ffmpeg (re-encode to ensure uniformity)
    const concatFile = path.join(tmpRoot, "inputs.txt");
    const concatList = perSlideOutputs.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    await fs.promises.writeFile(concatFile, concatList, "utf8");
    const finalOut = path.resolve(process.cwd(), "exports", `hera-slideshow-${Date.now()}.mp4`);
    await runFfmpegConcat(concatFile, finalOut);

    // Upload to S3
    let publicUrl: string | null = null;
    try {
      const bucket = (process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME) as string | undefined;
      if (bucket) {
        const s3 = createS3Client();
        const buffer = await fs.promises.readFile(finalOut);
        const objectKey = `hera-exports/${Date.now()}-${path.basename(finalOut)}`;
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: buffer, ContentType: "video/mp4" }));
        publicUrl = `https://${bucket}.s3.amazonaws.com/${objectKey}`;
      }
    } catch (uploadErr) {
      console.error("S3 upload failed", uploadErr);
    }

    await updateData({ heraVideo: publicUrl || `file://${finalOut}`, heraStatus: "completed" });
  } catch (err) {
    console.error("Hera orchestration failed", err);
    await updateData({ heraStatus: "failed", heraError: String((err as Error)?.message || err) });
  }
}

// legacy single-run export helper removed (replaced by per-slide scraper execution)

// Download remote image URLs to local disk so the scraper can setInputFiles reliably
async function materializeImageToFile(input: string, destPath: string): Promise<string> {
  try {
    if (/^https?:\/\//i.test(input)) {
      const res = await fetch(input);
      if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
      const arr = new Uint8Array(await res.arrayBuffer());
      await fs.promises.writeFile(destPath, arr);
      return destPath;
    }
    // Local path already
    return input;
  } catch (e) {
    // Fallback: return original and let scraper fail loudly if unreadable
    return input;
  }
}

// Run the TypeScript scraper via tsx, passing image & prompt flags
function runScraperPerSlide(args: { url: string; imagePath: string; prompt: string }): Promise<string> {
  const { url, imagePath, prompt } = args;
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(process.cwd(), "lib/hera_scraper/scraper.ts");
    const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
      'tsx',
      scriptPath,
      '--url', url,
      '--image', imagePath,
      '--prompt', prompt,
      '--keep-open=false',
    ], { cwd: process.cwd(), env: process.env });

    let capturedPath: string | null = null;
    let stderr = "";

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      const m = text.match(/Download complete:\s*(.*)\n?/);
      if (m?.[1]) capturedPath = m[1].trim();
    });
    child.stderr.on('data', (c) => { stderr += c.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0 && capturedPath && fs.existsSync(capturedPath)) {
        const abs = path.isAbsolute(capturedPath)
          ? capturedPath
          : path.resolve(process.cwd(), capturedPath);
        return resolve(abs);
      }
      reject(new Error(`Scraper failed (code ${code}). ${stderr}`));
    });
  });
}

function runFfmpegConcat(concatFile: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use -safe 0 so absolute paths in concat file are allowed
    const ff = spawn('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', outPath]);
    let stderr = '';
    ff.stderr.on('data', (c) => { stderr += c.toString(); });
    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code === 0) return resolve();
      // If stream copy fails due to differing codecs, re-encode uniformly
      const ff2 = spawn('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', outPath]);
      let stderr2 = '';
      ff2.stderr.on('data', (c) => { stderr2 += c.toString(); });
      ff2.on('error', reject);
      ff2.on('close', (code2) => {
        if (code2 === 0) resolve();
        else reject(new Error(`ffmpeg concat failed. stderr=${stderr}\nreencode=${stderr2}`));
      });
    });
  });
}


