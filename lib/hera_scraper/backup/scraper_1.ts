// scripts/run-hera-export.js
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ======= CONFIG ==========
let USER_DATA_DIR =
  '/Users/davidkorn/Library/Application Support/Google/Chrome'; // <- CHANGE THIS
let HERA_URL = 'https://app.hera.video/motions/4ba2e3a6-00ce-40bf-9dbc-24e5836338fc'; // can be overridden by --url
const OUTPUT_DIR = './exports'; // will be created if missing
// =========================

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const CHROME_EXECUTABLE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ======= SCRAPER PARAMS ==========
let IMAGE_PATH = path.resolve(__dirname, 'dummy-image.jpg');
let PROMPT_TEXT = 'Create a professional logo animation for the attached svg.';
const QUALITY_TEXT = '1080p / MP4 / 30 fps';
let KEEP_OPEN = true;

// Selectors based on provided DOM snippets
const SELECTORS = {
  // Opens the upload dialog
  // Image trigger (label used as button)
  uploadTrigger: 'label:has-text("Image")',
  // Actual file input inside the dialog
  uploadInput: 'input[type="file"][accept*="image"]',
  // Prompt textarea (placeholder varies; match broadly)
  promptPlaceholderPattern: /Create .* animation/i,
  // Generate button (arrow-up icon inside a button)
  generateButtonWithIcon: '[data-testid="ArrowUpwardIcon"]',
  exportTopbar: 'text=Export',
  exportVideoBtn: 'button:has-text("Export video")',
};
// ======= CLI OVERRIDES ==========
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--url' && process.argv[i + 1]) HERA_URL = process.argv[++i];
  else if (arg === '--user-data-dir' && process.argv[i + 1]) USER_DATA_DIR = process.argv[++i];
  else if ((arg === '--image' || arg === '--image-path') && process.argv[i + 1]) IMAGE_PATH = process.argv[++i];
  else if ((arg === '--prompt' || arg === '--text') && process.argv[i + 1]) PROMPT_TEXT = process.argv[++i];
  else if (arg.startsWith('--keep-open')) {
    const eqIdx = arg.indexOf('=');
    if (eqIdx > -1) {
      const val = arg.slice(eqIdx + 1);
      KEEP_OPEN = val !== 'false' && val !== '0';
    } else if (process.argv[i + 1]) {
      const val = process.argv[++i];
      KEEP_OPEN = val !== 'false' && val !== '0';
    } else {
      KEEP_OPEN = true;
    }
  }
}


const DEBUG_DIR = path.join(process.cwd(), 'lib', 'hera_scraper', 'debug');
if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });

async function snap(page: import('playwright').Page, name: string): Promise<void> {
  try {
    await page.screenshot({ path: path.join(DEBUG_DIR, name), fullPage: true });
  } catch {}
}

async function dumpDom(page: import('playwright').Page, name: string): Promise<string | undefined> {
  try {
    const html = await page.content();
    const filePath = path.join(DEBUG_DIR, `${name}.html`);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`📝 DOM snapshot saved: ${filePath}`);
    return filePath;
  } catch {}
}

async function saveMHTML(page: import('playwright').Page, name: string): Promise<string | undefined> {
  try {
    const client = await page.context().newCDPSession(page);
    const { data } = await client.send('Page.captureSnapshot', { format: 'mhtml' });
    const filePath = path.join(DEBUG_DIR, `${name}.mhtml`);
    fs.writeFileSync(filePath, data, 'utf8');
    console.log(`🧩 MHTML snapshot saved: ${filePath}`);
    return filePath;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.warn('⚠️ Failed to save MHTML snapshot:', err.message);
  }
}

async function safeClick(page: import('playwright').Page, locator: string): Promise<void> {
  const el = page.locator(locator).first();
  await el.waitFor({ state: 'visible', timeout: 30000 });
  try { await el.scrollIntoViewIfNeeded(); } catch {}
  try { await el.click({ timeout: 10000 }); }
  catch {
    await el.click({ timeout: 10000, force: true });
  }
}

async function uploadImage(page: import('playwright').Page, imagePath: string): Promise<void> {
  // Click the Image button to open the upload dialog
  const trigger = page.locator(SELECTORS.uploadTrigger).first();
  await trigger.waitFor({ state: 'visible', timeout: 30000 });
  try { await trigger.scrollIntoViewIfNeeded(); } catch {}
  try { await trigger.click({ timeout: 10000 }); } catch { await trigger.click({ timeout: 10000, force: true }); }
  // Wait for the dialog's file input and set file
  const input = page.locator(SELECTORS.uploadInput).first();
  await input.waitFor({ state: 'visible', timeout: 30000 });
  await input.setInputFiles(imagePath);
}

async function enterPrompt(page: import('playwright').Page, promptText: string): Promise<void> {
  const el = page.getByPlaceholder(SELECTORS.promptPlaceholderPattern as unknown as string | RegExp).first();
  await el.waitFor({ state: 'visible', timeout: 30000 });
  // Some MUI textareas ignore fill(); prefer type for reliability
  try { await el.fill(''); } catch {}
  try { await el.type(promptText, { delay: 5 }); }
  catch { await el.pressSequentially(promptText, { delay: 5 }); }
}

async function clickGenerate(page: import('playwright').Page): Promise<void> {
  // Find button that contains the ArrowUpwardIcon
  // Wait until the generate button is enabled (not disabled)
  const btn = page.locator('button:not([disabled])').filter({ has: page.locator(SELECTORS.generateButtonWithIcon) }).first();
  await btn.waitFor({ state: 'visible', timeout: 30000 });
  try { await btn.click({ timeout: 10000 }); } catch { await btn.click({ timeout: 10000, force: true }); }
}

async function run() {
  console.log('🧠 Launching Chrome with your logged-in profile...');
  // Avoid Chrome profile lock issues
  const singletonLockPath = path.join(USER_DATA_DIR, 'SingletonLock');
  let EFFECTIVE_USER_DATA_DIR = USER_DATA_DIR;
  if (fs.existsSync(singletonLockPath)) {
    EFFECTIVE_USER_DATA_DIR = path.join(os.tmpdir(), 'hera-pw-user-data');
    if (!fs.existsSync(EFFECTIVE_USER_DATA_DIR)) fs.mkdirSync(EFFECTIVE_USER_DATA_DIR, { recursive: true });
    console.log(`🔒 Chrome profile locked. Using temp user-data-dir: ${EFFECTIVE_USER_DATA_DIR}`);
  }

  console.log(`   User data dir: ${EFFECTIVE_USER_DATA_DIR}`);
  console.log(`   Target URL: ${HERA_URL}`);

  let context: import('playwright').BrowserContext;
  try {
    context = await chromium.launchPersistentContext(EFFECTIVE_USER_DATA_DIR, {
      headless: false,
      args: [
        '--profile-directory=Default',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });
  } catch (e) {
    const msg = (e as Error)?.message || '';
    const needsTemp = /ProcessSingleton|profile is already in use|SingletonLock/i.test(msg);
    if (!needsTemp) throw e;
    EFFECTIVE_USER_DATA_DIR = path.join(os.tmpdir(), 'hera-pw-user-data');
    if (!fs.existsSync(EFFECTIVE_USER_DATA_DIR)) fs.mkdirSync(EFFECTIVE_USER_DATA_DIR, { recursive: true });
    console.log(`🔄 Relaunching with temp user-data-dir: ${EFFECTIVE_USER_DATA_DIR}`);
    context = await chromium.launchPersistentContext(EFFECTIVE_USER_DATA_DIR, {
      headless: false,
      args: [
        '--profile-directory=Default',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });
  }
  console.log('✅ Browser context created.');

  // Load Hera session cookies before navigation
  const cookiesPath = path.join(__dirname, 'hera_cookies.json');
  if (fs.existsSync(cookiesPath)) {
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    await context.addCookies(cookies);
  }

  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  console.log('🌐 Navigating...');
  let initialResponse: any;
  try {
    initialResponse = await page.goto(HERA_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Ensure URL changed away from about:blank
    await page.waitForURL(/app\.hera\.video\/motions\//, { timeout: 60000 });
    console.log('✅ Page loaded and session reused. URL:', page.url());
    await dumpDom(page, '00-after-goto');
    await saveMHTML(page, '00-after-goto');
  } catch (err) {
    console.error('❌ Navigation error:', (err as Error)?.message || err);
    console.log('Current page URL:', page.url());
  }
  await snap(page, '00-loaded.png');
  await dumpDom(page, '00-loaded');
  try {
    const initialHtml = await initialResponse?.text();
    if (initialHtml) {
      const p = path.join(DEBUG_DIR, '00-initial-response.html');
      fs.writeFileSync(p, initialHtml, 'utf8');
      console.log(`📜 Initial HTML saved: ${p}`);
    }
  } catch {}
  await saveMHTML(page, '00-loaded');

  // 1) upload picture
  try {
    console.log('🖼️ Uploading image...');
    await uploadImage(page, IMAGE_PATH);
    await page.waitForTimeout(500);
    await snap(page, '01-after-upload.png');
    await dumpDom(page, '01-after-upload');
    await saveMHTML(page, '01-after-upload');
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.warn('⚠️ Image upload step skipped (adjust selector or IMAGE_PATH).', err.message);
    await snap(page, '01-upload-error.png');
    await dumpDom(page, '01-upload-error');
    await saveMHTML(page, '01-upload-error');
  }

  // 2) insert prompt
  try {
    console.log('💬 Entering prompt...');
    await enterPrompt(page, PROMPT_TEXT);
    await page.waitForTimeout(300);
    await snap(page, '02-after-prompt.png');
    await dumpDom(page, '02-after-prompt');
    await saveMHTML(page, '02-after-prompt');
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.warn('⚠️ Prompt entry step skipped (selector may differ).', err.message);
    await snap(page, '02-prompt-error.png');
    await dumpDom(page, '02-prompt-error');
    await saveMHTML(page, '02-prompt-error');
  }

  // 3) click generate
  try {
    console.log('▶️ Clicking Generate...');
    await clickGenerate(page);
    await snap(page, '03-after-generate.png');
    await dumpDom(page, '03-after-generate');
    await saveMHTML(page, '03-after-generate');
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.warn('⚠️ Generate click step skipped (selector may differ).', err.message);
    await snap(page, '03-generate-error.png');
    await dumpDom(page, '03-generate-error');
    await saveMHTML(page, '03-generate-error');
  }

  // Step 1 — Click "Export" in top bar (appears after video is generated)
  await page.waitForSelector('text=Export', { timeout: 5 * 60 * 1000 });
  await page.click('text=Export');
  console.log('🎬 Export dialog opened.');
  await snap(page, '04-export-dialog.png');
  await dumpDom(page, '04-export-dialog');
  await saveMHTML(page, '04-export-dialog');

  // Step 2 — Click the "Export video" button
  const exportBtn = await page.waitForSelector('button:has-text("Export video")', {
    timeout: 20000,
  });
  await exportBtn.click();
  console.log('⏳ Export started...');

  // Step 3 — Wait until "Exporting..." disappears and download button is enabled
  await page.waitForFunction((qualityText) => {
    const exportBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Exporting')
    );
    const downloadBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent?.includes(qualityText)
    );
    return !exportBtn && downloadBtn && !downloadBtn.disabled;
  }, QUALITY_TEXT, { timeout: 5 * 60 * 1000 }); // wait up to 5 minutes

  console.log('📦 Export finished. Starting download...');

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 180000 }),
    page.click(`button:has-text("${QUALITY_TEXT}")`),
  ]);

  const fileName = download.suggestedFilename();
  const filePath = path.join(OUTPUT_DIR, fileName);
  await download.saveAs(filePath);

  console.log(`✅ Download complete: ${filePath}`);

  if (KEEP_OPEN) {
    console.log('⏸️ Keeping browser open for inspection. Press Ctrl+C to exit.');
    // Keep process alive
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.waitForTimeout(60_000);
    }
  } else {
    await context.close();
  }
  return filePath;
}

// Run directly (ESM/tsx-friendly check)
const entry = process.argv[1] || '';
if (entry.endsWith('scraper.ts') || entry.endsWith('scraper.js')) {
  run().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
}

export default run;
