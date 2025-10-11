import OpenAI from "openai";
import fs from "node:fs/promises";

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      "ERROR: OPENAI_API_KEY is not set. Export it or add to .env.local"
    );
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });

  // Helper to load local image as data URL
  async function loadImageAsDataUrl(filename) {
    const url = new URL(`./${filename}`, import.meta.url);
    const buf = await fs.readFile(url);
    const b64 = buf.toString("base64");
    return `data:image/jpeg;base64,${b64}`;
  }

  // Load 6 slides: bs1.jpg ... bs6.jpg from scripts directory
  const slideNames = [1, 2, 3, 4, 5, 6].map((i) => `bs${i}.jpg`);
  const dataUrls = await Promise.all(slideNames.map(loadImageAsDataUrl));

  const instruction =
    "You will see 6 slideshow images. Analyze them and produce ONE compact generation prompt (<=120 words) to recreate a similar slideshow. Focus ONLY on text/copy and content style — assume typography, size, position, animation, and colors are hardcoded.\n\nReturn EXACTLY three short paragraphs in plain text (no bullets):\n1) Start with: 'I want <N> slides about <inferred topic>.' Then write: 'The first slide should say '<hook text you infer from the set or a faithful, improved version>''.\n2) Describe voice/tone (e.g., confident, motivational), perspective (2nd person with brief 1st-person insights), and reading level (e.g., 7th–8th grade).\n3) Describe copy style and pacing: whether it's listicle vs narrative, how many slides after the first present numbered rules/principles, and what the final slide should summarize. Do not include layout, fonts, sizes, or positions. Plain text only; quotes only around the exact first-slide line.";
  console.log(
    "Sending 6 slides to OpenAI to synthesize a generation prompt...\nSlides:",
    slideNames.join(", ")
  );

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are an expert TikTok slideshow prompt engineer. You produce actionable, compact prompts that reliably recreate the given style.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: instruction },
            ...dataUrls.map((url) => ({
              type: "image_url",
              image_url: { url },
            })),
          ],
        },
      ],
    });

    const output = completion.choices?.[0]?.message?.content ?? "<no content>";
    console.log("\nGenerated Prompt:\n", output.trim());
  } catch (err) {
    console.error("OpenAI request failed:\n", err);
    process.exit(1);
  }
}

main();
