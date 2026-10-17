// Делает ВСЕ скриншоты для новых работ портфолио и упаковывает их в один архив.
//
// Для каждого сайта получается три файла (те же размеры и качество, что у текущих работ):
//   assets/shots/<slug>.jpg       десктоп, 960 x ~2133   (большой макет «ноутбук»)
//   assets/shots/<slug>-m.jpg     мобильная версия, 360 x ~1569   (макет «телефон»)
//   assets/portfolio/<slug>.jpg   превью для README, 640 x 400
//
// Архив повторяет структуру репозитория, поэтому его можно просто распаковать в корень проекта.
// Заодно проверяются ссылки (сайт и репозиторий) и пишется report.txt.
//
// Запуск:
//   npm install
//   npx playwright install chromium
//   npm run shots:new
//
// Можно указать свои сайты:  node scripts/screenshots-new.mjs slug1 slug2
// Результат: new-portfolio-shots.zip (в корне проекта)

import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const BASE = (process.env.BASE_URL || 'https://setchatkaglaza.github.io/').replace(/\/?$/, '/');
const GITHUB = 'https://github.com/SetchatkaGlaza/';
const DEFAULT_SITES = ['kotis-auto-website', 'raschyoska-site', 'shumaher-site', 'mobil24-site'];
const SITES = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_SITES;

const OUT = 'shots-new';
const ZIP = 'new-portfolio-shots.zip';

// Те же параметры, что в scripts/screenshots.mjs, плюс превью для README (640x400 = верх страницы 1440x900).
const VIEWS = [
  { name: 'desktop', file: (s) => `assets/shots/${s}.jpg`, width: 1440, height: 900, scale: 960 / 1440, quality: 80, full: true, clip: { x: 0, y: 0, width: 1440, height: 3200 } },
  { name: 'mobile', file: (s) => `assets/shots/${s}-m.jpg`, width: 390, height: 844, scale: 360 / 390, quality: 80, full: true, clip: { x: 0, y: 0, width: 390, height: 1700 } },
  { name: 'thumb', file: (s) => `assets/portfolio/${s}.jpg`, width: 1440, height: 900, scale: 640 / 1440, quality: 82, full: false, clip: { x: 0, y: 0, width: 1440, height: 900 } },
];

const report = [];
const log = (line) => { console.log(line); report.push(line); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- проверка ссылок ----------
async function checkUrl(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (res.ok) return { ok: true, status: res.status };
      if (method === 'GET') return { ok: false, status: res.status };
    } catch (e) {
      if (method === 'GET') return { ok: false, status: String(e.cause?.code || e.message) };
    }
  }
}

// ---------- минимальный zip без внешних зависимостей ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function makeZip(dir, target) {
  const parts = [];
  const central = [];
  let offset = 0;
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const file of walk(dir)) {
    const name = Buffer.from(relative(dir, file).split('\\').join('/'), 'utf8');
    const data = readFileSync(file);
    const packed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10); local.writeUInt16LE(date, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    parts.push(local, name, packed);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8); cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(time, 12); cd.writeUInt16LE(date, 14); cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(packed.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(name.length, 28); cd.writeUInt32LE(offset, 42);
    central.push(cd, name);
    offset += local.length + name.length + packed.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(cdBuf.length, 12); end.writeUInt32LE(offset, 16);
  writeFileSync(target, Buffer.concat([...parts, cdBuf, end]));
}

// ---------- основной сценарий ----------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'assets/shots'), { recursive: true });
mkdirSync(join(OUT, 'assets/portfolio'), { recursive: true });

log(`Сайты: ${SITES.join(', ')}`);
log(`База: ${BASE}\n`);

log('== Проверка ссылок ==');
const alive = [];
for (const s of SITES) {
  const site = await checkUrl(`${BASE}${s}/`);
  const repo = await checkUrl(`${GITHUB}${s}`);
  log(`${site.ok ? 'OK  ' : 'FAIL'} сайт        ${BASE}${s}/  [${site.status}]`);
  log(`${repo.ok ? 'OK  ' : 'WARN'} репозиторий  ${GITHUB}${s}  [${repo.status}]${repo.ok ? '' : '  <- проверьте имя репозитория / что он публичный'}`);
  if (site.ok) alive.push(s);
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
log('\n== Скриншоты ==');
const done = {};
for (const v of VIEWS) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.scale, locale: 'ru-RU' });
  const page = await ctx.newPage();
  for (const s of alive) {
    const problems = [];
    const onResp = (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`); };
    const onErr = (e) => problems.push(`JS-ошибка: ${e.message}`);
    page.on('response', onResp); page.on('pageerror', onErr);
    try {
      await page.goto(`${BASE}${s}/`, { waitUntil: 'load', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await sleep(1800);
      // прокручиваем страницу, чтобы сработали lazy-load и анимации появления
      await page.evaluate(async () => {
        // отключаем плавную прокрутку: иначе страница «доезжает» до верха уже после снимка
        const st = document.createElement('style');
        st.textContent = 'html,body{scroll-behavior:auto !important}';
        document.head.appendChild(st);
        const h = Math.min(document.documentElement.scrollHeight, 4000);
        for (let y = 0; y < h; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)); }
        for (let i = 0; i < 20 && window.scrollY > 0; i++) { scrollTo({ top: 0, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 100)); }
        document.activeElement && document.activeElement.blur();
        // прячем плавающие панели, прижатые к низу экрана (звонок/маршрут, cookie-баннер): в полном снимке они повисают посреди страницы
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed' && el.getBoundingClientRect().top > innerHeight * 0.45) el.style.setProperty('display', 'none', 'important');
        }
      });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await sleep(900);
      if (await page.evaluate(() => window.scrollY) > 1) log(`     ! ${s}: страница не вернулась в начало (scrollY>0)`);
      const path = join(OUT, v.file(s));
      await page.screenshot({ path, type: 'jpeg', quality: v.quality, fullPage: v.full, clip: v.clip });
      const kb = Math.round(statSync(path).size / 1024);
      log(`ok   ${v.name.padEnd(7)} ${s}  (${kb} КБ)`);
      (done[s] ||= []).push(v.name);
    } catch (e) {
      log(`FAIL ${v.name.padEnd(7)} ${s}: ${e.message.split('\n')[0]}`);
    }
    page.off('response', onResp); page.off('pageerror', onErr);
    for (const p of [...new Set(problems)].slice(0, 8)) log(`     ! ${s}: ${p}`);
  }
  await ctx.close();
}
await browser.close();

const incomplete = SITES.filter((s) => (done[s] || []).length < VIEWS.length);
log(incomplete.length ? `\nВНИМАНИЕ: не все файлы получены для: ${incomplete.join(', ')}` : '\nВсе скриншоты получены.');

writeFileSync(join(OUT, 'report.txt'), report.join('\n') + '\n', 'utf8');
makeZip(OUT, ZIP);
log(`\nГотово: ${ZIP} (${Math.round(statSync(ZIP).size / 1024)} КБ). Пришлите этот файл.`);
process.exitCode = incomplete.length ? 1 : 0;
