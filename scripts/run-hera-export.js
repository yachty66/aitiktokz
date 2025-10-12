#!/usr/bin/env node
// Run a Hera export using your existing Chrome profile via Playwright.
//
// Usage:
//   npm run hera:export -- --url https://app.hera.video/motions/...
//   # or
//   node scripts/run-hera-export.js --url https://app.hera.video/motions/...
//
// Setup (if Playwright not yet installed):
//   npm init -y
//   npm install playwright
//   npx playwright install chromium
//
// Finding your Chrome user-data dir:
//   macOS:   /Users/<you>/Library/Application Support/Google/Chrome
//            Optionally append "/Default" for the default profile
//   Windows: C:\\Users\\<you>\\AppData\\Local\\Google\\Chrome\\User Data
//            Optionally append "\\Default"
//   Linux:   /home/<you>/.config/google-chrome
//            Or for chromium: /home/<you>/.config/chromium
//
// Headless vs visible:
//   Toggle the HEADLESS flag or pass --headless/--headed via CLI.
//
// Triggering from automations (e.g., n8n or webhook):
//   - n8n Execute Command node: `node scripts/run-hera-export.js --url <HERA_URL>`
//   - Local webhook can shell out similarly or spawn a child_process.

const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');

// ===== Config (override via CLI flags) =====
let HERA_URL = process.env.HERA_URL || 'https://app.hera.video/motions';
const DEFAULT_CHROME_ROOT = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
let USER_DATA_DIR = process.env.USER_DATA_DIR || DEFAULT_CHROME_ROOT;
let OUTPUT_DIR = process.env.OUTPUT_DIR || path.resolve(process.cwd(), 'exports');
let HEADLESS = process.env.HEADLESS ? process.env.HEADLESS === 'true' : false;
let DOWNLOAD_QUALITY_TEXT = process.env.DOWNLOAD_QUALITY_TEXT || '1080p / MP4';

// ===== Simple CLI parsing =====
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--url' && process.argv[i + 1]) HERA_URL = process.argv[++i];
  else if (arg === '--user-data-dir' && process.argv[i + 1]) USER_DATA_DIR = process.argv[++i];
  else if (arg === '--output-dir' && process.argv[i + 1]) OUTPUT_DIR = process.argv[++i];
  else if (arg === '--quality' && process.argv[i + 1]) DOWNLOAD_QUALITY_TEXT = process.argv[++i];
  else if (arg === '--headless') HEADLESS = true;
  else if (arg === '--headed') HEADLESS = false;
}

async function run() {
  if (!HERA_URL || !HERA_URL.startsWith('https://app.hera.video/')) {
    throw new Error('HERA_URL must be a full https://app.hera.video/... URL. Use --url to set it.');
  }

  if (!fs.existsSync(USER_DATA_DIR)) {
    throw new Error(`USER_DATA_DIR not found: ${USER_DATA_DIR}`);
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Fallback if the real Chrome profile is in use (SingletonLock present)
  let EFFECTIVE_USER_DATA_DIR = USER_DATA_DIR;
  const singletonLockPath = path.join(USER_DATA_DIR, 'SingletonLock');
  if (fs.existsSync(singletonLockPath)) {
    EFFECTIVE_USER_DATA_DIR = path.join(os.tmpdir(), 'hera-pw-user-data');
    if (!fs.existsSync(EFFECTIVE_USER_DATA_DIR)) fs.mkdirSync(EFFECTIVE_USER_DATA_DIR, { recursive: true });
    console.log(`🔒 Chrome profile in use. Falling back to: ${EFFECTIVE_USER_DATA_DIR}`);
  }

  console.log('🧠 Launching Chromium with your logged-in Chrome profile...');
  console.log(`   User data dir: ${EFFECTIVE_USER_DATA_DIR}`);
  console.log(`   Headless: ${HEADLESS}`);
  const context = await chromium.launchPersistentContext(EFFECTIVE_USER_DATA_DIR, {
    headless: HEADLESS,
    // Important on macOS when reusing Chrome data; separate tmp dir avoids lock issues
    args: [
      '--profile-directory=Default',
      '--disable-dev-shm-usage',
      '--no-sandbox',
    ],
  });

  try {
    // Load Hera cookies if present (project path: lib/hera_scraper/hera_cookies.json)
    const cookiesPath = path.resolve(__dirname, '../lib/hera_scraper/hera_cookies.json');
    let cookiesLoaded = false;
    if (fs.existsSync(cookiesPath)) {
      try {
        const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
        if (Array.isArray(cookies) && cookies.length > 0) {
          await context.addCookies(cookies);
          cookiesLoaded = true;
          console.log(`🍪 Loaded ${cookies.length} Hera cookie(s).`);
        }
      } catch (e) {
        console.warn('⚠️ Failed to load hera_cookies.json:', e?.message || e);
      }
    }

    const page = await context.newPage();
    console.log(`🌐 Navigating to ${HERA_URL} ...`);
    await page.goto(HERA_URL, { waitUntil: 'networkidle' });
    console.log('✅ Page loaded and session reused.');

    // Detect login redirect and advise refreshing cookies/profile
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      const loginButton = await page.$('text=Continue with Google');
      if (loginButton) {
        throw new Error(`Not authenticated. ${cookiesLoaded ? 'Your hera_cookies.json may be expired.' : 'No hera_cookies.json loaded.'} Update cookies or ensure Chrome Default profile is logged in.`);
      }
    }

    // Step 1 — Click "Export" in top bar
    console.log('🔎 Looking for Export button...');
    const exportSelector = 'text=Export';
    await page.waitForSelector(exportSelector, { timeout: 30_000 });
    await page.click(exportSelector);
    console.log('🎬 Export dialog opened.');

    // Step 2 — Click the "Export video" button
    const exportVideoBtn = await page.waitForSelector('button:has-text("Export video")', {
      timeout: 30_000,
    });
    await exportVideoBtn.click();
    console.log('⏳ Export started...');

    // Step 3 — Wait until "Exporting..." disappears AND download button is enabled
    console.log('⌛ Waiting for export to finish...');
    await page.waitForFunction(
      (qualityText) => {
        const exportBtn = Array.from(document.querySelectorAll('button')).find(b =>
          (b.textContent || '').includes('Exporting')
        );
        const downloadBtn = Array.from(document.querySelectorAll('button')).find(b =>
          (b.textContent || '').includes(qualityText)
        );
        return !exportBtn && downloadBtn && !downloadBtn.disabled;
      },
      DOWNLOAD_QUALITY_TEXT,
      { timeout: 5 * 60 * 1000 }
    );

    console.log('📦 Export finished. Starting download...');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      page.click(`button:has-text("${DOWNLOAD_QUALITY_TEXT}")`),
    ]);

    const suggestedName = download.suggestedFilename();
    const filePath = path.join(OUTPUT_DIR, suggestedName);
    await download.saveAs(filePath);
    console.log(`✅ Download complete: ${filePath}`);

    return filePath;
  } catch (err) {
    console.error('❌ Error during Hera export:', err?.message || err);
    throw err;
  } finally {
    await context.close();
  }
}

if (require.main === module) {
  run()
    .then((filePath) => {
      console.log('🎉 Success:', filePath);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Hera export failed:', err?.stack || err);
      process.exit(1);
    });
}

module.exports = run;


