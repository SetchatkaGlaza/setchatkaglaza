// Takes screenshots of the live demos -> assets/shots/<slug>.jpg (desktop) and <slug>-m.jpg (mobile)
// Usage: npm install && npx playwright install chromium && npm run shots
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'https://setchatkaglaza.github.io/';
const SITES = ['pulse-athletic', 'mokka-house', 'elan-skin', 'Forma-Build', 'best-site-gym', 'les-trans-website', 'nexora-digital-landing'];
const VIEWS = [
  { suffix: '', width: 1440, height: 900, scale: 960 / 1440, clip: { x: 0, y: 0, width: 1440, height: 3200 } },
  { suffix: '-m', width: 390, height: 844, scale: 360 / 390, clip: { x: 0, y: 0, width: 390, height: 1700 } },
];
mkdirSync('assets/shots', { recursive: true });
const browser = await chromium.launch();
for (const v of VIEWS) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.scale });
  const page = await ctx.newPage();
  for (const s of SITES) {
    await page.goto(`${BASE}${s}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    await page.evaluate(async () => { for (let y = 0; y < 3400; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 200)); } scrollTo(0, 0); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `assets/shots/${s}${v.suffix}.jpg`, type: 'jpeg', quality: 80, fullPage: true, clip: v.clip });
    console.log('ok', s + v.suffix);
  }
  await ctx.close();
}
await browser.close();
