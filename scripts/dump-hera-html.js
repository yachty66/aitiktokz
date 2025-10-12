#!/usr/bin/env node
// Dump fully rendered Hera page HTML and MHTML snapshots.

const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');

let HERA_URL = process.env.HERA_URL || 'https://app.hera.video/motions/4ba2e3a6-00ce-40bf-9dbc-24e5836338fc';
let HEADLESS = process.env.HEADLESS ? process.env.HEADLESS === 'true' : false;
const DEFAULT_CHROME_ROOT = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
let USER_DATA_DIR = process.env.USER_DATA_DIR || DEFAULT_CHROME_ROOT;
const PROFILE = process.env.CHROME_PROFILE || 'Default';

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--url' && process.argv[i + 1]) HERA_URL = process.argv[++i];
  else if (arg === '--headless') HEADLESS = true;
  else if (arg === '--headed') HEADLESS = false;
  else if (arg === '--user-data-dir' && process.argv[i + 1]) USER_DATA_DIR = process.argv[++i];
}

const DEBUG_DIR = path.join(process.cwd(), 'lib', 'hera_scraper', 'debug');
if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });

async function saveMHTML(page, basename) {
  try {
    const client = await page.context().newCDPSession(page);
    const { data } = await client.send('Page.captureSnapshot', { format: 'mhtml' });
    const filePath = path.join(DEBUG_DIR, `${basename}.mhtml`);
    fs.writeFileSync(filePath, data, 'utf8');
    console.log(`🧩 MHTML snapshot: ${filePath}`);
  } catch (e) {
    console.warn('⚠️ Failed to save MHTML:', e?.message || e);
  }
}

async function run() {
  if (!HERA_URL.startsWith('https://app.hera.video/')) {
    throw new Error('Provide a full https://app.hera.video/... URL via --url');
  }

  let EFFECTIVE_USER_DATA_DIR = USER_DATA_DIR;
  const singletonLockPath = path.join(USER_DATA_DIR, 'SingletonLock');
  if (fs.existsSync(singletonLockPath)) {
    EFFECTIVE_USER_DATA_DIR = path.join(os.tmpdir(), 'hera-pw-user-data');
    if (!fs.existsSync(EFFECTIVE_USER_DATA_DIR)) fs.mkdirSync(EFFECTIVE_USER_DATA_DIR, { recursive: true });
    console.log(`🔒 Chrome profile in use. Using temp dir: ${EFFECTIVE_USER_DATA_DIR}`);
  }

  const context = await chromium.launchPersistentContext(EFFECTIVE_USER_DATA_DIR, {
    headless: HEADLESS,
    args: [
      `--profile-directory=${PROFILE}`,
      '--disable-dev-shm-usage',
      '--no-sandbox',
    ],
  });

  try {
    // Load cookies if available
    const cookiesPath = path.resolve(__dirname, '../lib/hera_scraper/hera_cookies.json');
    if (fs.existsSync(cookiesPath)) {
      try {
        const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
        if (Array.isArray(cookies) && cookies.length > 0) {
          await context.addCookies(cookies);
          console.log(`🍪 Loaded ${cookies.length} cookie(s)`);
        }
      } catch (e) {
        console.warn('⚠️ Cookie load failed:', e?.message || e);
      }
    }

    const page = await context.newPage();
    let initialResponse;
    try {
      initialResponse = await page.goto(HERA_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch (e) {
      console.warn('⚠️ Navigation timed out; capturing whatever is loaded...');
    }
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    } catch {}

    // Wait for the real UI to render before dumping
    const candidates = [
      page.locator('text=Your AI Motion Designer').first(),
      page.getByPlaceholder(/Create .* animation/i).first(),
      page.locator('label[role="button"]:has-text("Image")').first(),
    ];
    let rendered = false;
    for (const loc of candidates) {
      try {
        await loc.waitFor({ state: 'visible', timeout: 45000 });
        rendered = true;
        break;
      } catch {}
    }
    if (!rendered) {
      console.warn('⚠️ UI marker not found; dumping whatever is on the page.');
    }

    // Save initial server HTML
    try {
      const initialHtml = await initialResponse?.text();
      if (initialHtml) {
        const p = path.join(DEBUG_DIR, 'dump-initial.html');
        fs.writeFileSync(p, initialHtml, 'utf8');
        console.log(`📜 Initial HTML: ${p}`);
      }
    } catch {}

    // Save hydrated DOM
    try {
      const dom = await page.content();
      const p = path.join(DEBUG_DIR, 'dump-dom.html');
      fs.writeFileSync(p, dom, 'utf8');
      console.log(`📝 DOM HTML: ${p}`);
    } catch {}

    // Save MHTML snapshot
    await saveMHTML(page, 'dump');

    console.log('✅ Done. Files written under lib/hera_scraper/debug');
  } finally {
    await context.close();
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error('❌ Dump failed:', err?.stack || err);
    process.exit(1);
  });
}

module.exports = run;


