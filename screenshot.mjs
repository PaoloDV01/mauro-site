// screenshot.mjs — Puppeteer screenshot helper
// Usage: node screenshot.mjs http://localhost:3000 [label]
// Saves to ./temporary screenshots/screenshot-N.png (or screenshot-N-label.png)

import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2];
const label = process.argv[3];

if (!url) {
  console.error('Usage: node screenshot.mjs <url> [label]');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), 'temporary screenshots');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Find next free index so we never overwrite
function nextIndex() {
  const files = fs.readdirSync(OUT_DIR);
  let max = 0;
  for (const f of files) {
    const m = f.match(/^screenshot-(\d+)(?:-.*)?\.png$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

const idx = nextIndex();
const filename = label
  ? `screenshot-${idx}-${label}.png`
  : `screenshot-${idx}.png`;
const outPath = path.join(OUT_DIR, filename);

const browser = await puppeteer.launch({
  headless: 'new',
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
});

try {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`Saved: ${outPath}`);
} catch (e) {
  console.error('Screenshot failed:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
