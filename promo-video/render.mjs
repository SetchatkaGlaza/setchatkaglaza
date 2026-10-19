import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const root = resolve('promo-video');
const output = resolve(root, 'output');
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: {
    dir: output,
    size: { width: 1920, height: 1080 }
  }
});

const page = await context.newPage();
page.on('pageerror', error => console.error('Ошибка страницы:', error.message));

try {
  await page.goto('file://' + resolve(root, 'index.html'), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  console.log('Записываем 30-секундный ролик. Не закрывай терминал...');
  await page.waitForTimeout(30000);
} finally {
  await context.close();
  await browser.close();
}

const videos = (await import('node:fs/promises')).readdir;
const { readdir } = await import('node:fs/promises');
const files = await readdir(output);
const webm = files.filter(f => f.endsWith('.webm')).sort().at(-1);
if (!webm) throw new Error('Запись WebM не найдена в promo-video/output');
const { copyFile } = await import('node:fs/promises');
await copyFile(resolve(output, webm), resolve(output, 'setchatkaglaza-promo.webm'));
console.log('Запись сохранена: promo-video/output/setchatkaglaza-promo.webm');
