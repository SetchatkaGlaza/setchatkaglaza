// Делает 8 скриншотов для каждой работы под портфолио на Кворке и файл с названиями работ.
//
// Требования Кворка (блог и поддержка): минимум 660x440 px, файл от 30 КБ до 10 МБ, JPG/PNG/GIF, до 9 картинок на работу.
// Берём 1320x880 (3:2): ровно вдвое больше минимума, чётко на ретина-экранах, проходит с запасом.
//
// Для каждого сайта (имена файлов: <номер>_<Название>_<1..8>.jpg):
//   1-6  десктоп: первый экран и 5 последовательных частей страницы
//   7    ноутбук + телефон (первый экран)
//   8    три экрана мобильной версии на телефонах
//
// Запуск:
//   npm install
//   npx playwright install chromium
//   npm run kwork
//
// Только некоторые сайты:  node scripts/kwork-shots.mjs kotis mobil24   (по части адреса)
// Результат: папка kwork-portfolio/ (скриншоты + НАЗВАНИЯ_РАБОТ.txt)

import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ORIGIN = (process.env.BASE_URL || 'https://setchatkaglaza.github.io/').replace(/\/?$/, '/');
const OUT = 'kwork-portfolio';
const W = 1320, H = 880;          // размер картинок, 3:2
const MIN_BYTES = 30 * 1024;      // минимум Кворка по весу
const MAX_BYTES = 10 * 1024 * 1024;
const GITHUB = 'https://github.com/SetchatkaGlaza/';

// enabled:false — работа не обрабатывается (поставьте true, чтобы включить)
const WORKS = [
  { n: '01', file: 'Studio-SetchatkaGlaza', path: 'setchatkaglaza/', title: 'Сайт-визитка веб-студии SetchatkaGlaza',
    desc: 'Двуязычный сайт-визитка веб-студии (русский и английский): анимированный первый экран с видео, портфолио с автопрокруткой превью, тёмная тема, адаптивная вёрстка. HTML, CSS, JavaScript.' },
  { n: '02', file: 'Kotis-Auto-Atelier', path: 'kotis-auto-website/', title: 'Сайт автоателье КоТиС: перетяжка салона, Вологда',
    desc: 'Сайт автоателье: услуги с ценами, калькулятор стоимости, галерея работ, отзывы, частые вопросы и форма записи. Светлая и тёмная темы, адаптивная вёрстка. HTML, CSS, JavaScript.' },
  { n: '03', file: 'Raschyoska-Hair-Salon', path: 'raschyoska-site/', title: 'Сайт парикмахерской «Расчёска», Вологда',
    desc: 'Сайт салона красоты: прайс с поиском и вкладками, галерея работ с фильтрами и лайтбоксом, акции, отзывы, запись через ВКонтакте. Адаптивная вёрстка. HTML, CSS, JavaScript.' },
  { n: '04', file: 'Shumaher-Car-Wash', path: 'shumaher-site/', title: 'Сайт автомойки и детейлинга Shumaher Car Wash',
    desc: 'Тёмный сайт автомойки: услуги с ценами в аккордеоне, лаунж-зона, галерея с лайтбоксом, индикатор «открыто / закрыто», форма заявки. Адаптивная вёрстка. HTML, CSS, JavaScript.' },
  { n: '05', file: 'Mobil24-Self-Service-Wash', path: 'mobil24-site/', title: 'Сайт мойки самообслуживания МОБИЛ24 (24/7)',
    desc: 'Сайт круглосуточной мойки самообслуживания: цены по режимам, демонстрация терминала, схема работы, описание боксов, галерея, отзывы. Адаптивная вёрстка. HTML, CSS, JavaScript.' },
  { n: '06', file: 'BEST-Gym', path: 'best-site-gym/', concept: true, title: 'Одностраничный сайт фитнес-клуба BEST Gym',
    desc: 'Концептуальный проект. Сайт фитнес-клуба: тарифы с фильтром, подбор абонемента, индикатор «открыто / закрыто» по графику работы, галерея, отзывы. HTML, CSS, JavaScript.' },
  { n: '07', file: 'FORMA-BUILD', path: 'Forma-Build/', concept: true, title: 'Сайт строительной компании FORMA BUILD',
    desc: 'Концептуальный проект. Архитектурные проекты, каталог услуг, интерактивный калькулятор стоимости, анимации. HTML, CSS, JavaScript.' },
  { n: '08', file: 'ELAN-Skin', path: 'elan-skin/', concept: true, title: 'Лендинг премиального бренда косметики ÉLAN Skin',
    desc: 'Концептуальный проект. Лендинг бренда ухода за кожей: editorial-дизайн, демонстрационная корзина, адаптивная вёрстка. Vite, HTML, CSS, JavaScript.' },
  { n: '09', file: 'MOKKA-HOUSE', path: 'mokka-house/', concept: true, title: 'Сайт кофейни MOKKA HOUSE',
    desc: 'Концептуальный проект. Видео на первом экране, интерактивное меню, подбор напитка, бронирование стола, галерея с лайтбоксом, анимации. HTML, CSS, JavaScript.' },
  { n: '10', file: 'Pulse-Athletic', path: 'pulse-athletic/', concept: true, title: 'Многостраничный сайт фитнес-клуба Pulse Athletic',
    desc: 'Концептуальный проект. Расписание с записью, тарифы с выбором срока, тренеры, галерея, подбор формата, юридические страницы. Vite, JavaScript.' },
  { n: '11', file: 'Nexora-Digital', path: 'nexora-digital-landing/', concept: true, title: 'Лендинг digital-студии Nexora Digital',
    desc: 'Концептуальный проект. 12 секций, кейсы с галереей, FAQ, форма с валидацией, видеофон, доступность и поддержка prefers-reduced-motion. Vite, ES-модули.' },
  { n: '12', file: 'Les-Trans', path: 'les-trans-website/', concept: true, enabled: false, title: 'Сайт компании по перевозке леса',
    desc: 'Концептуальный проект. Адаптивный сайт транспортной компании. HTML, CSS, JavaScript.' },
];

const filters = process.argv.slice(2).map((s) => s.toLowerCase());
const selected = WORKS.filter((w) => w.enabled !== false && (!filters.length || filters.some((f) => w.path.toLowerCase().includes(f) || w.file.toLowerCase().includes(f))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b64 = (buf) => `data:image/jpeg;base64,${buf.toString('base64')}`;
const kb = (n) => `${Math.round(n / 1024)} КБ`;

// ---------- подготовка страницы ----------
async function prepare(page) {
  await page.evaluate(async () => {
    // отключаем плавную прокрутку (через CSSOM, это работает и при строгой CSP)
    for (const el of [document.documentElement, document.body]) el && el.style.setProperty('scroll-behavior', 'auto', 'important');
    // проходим страницу сверху вниз: срабатывают lazy-load и анимации появления
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 300) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.activeElement && document.activeElement.blur();
    // прячем плавающие панели у нижнего края (звонок/маршрут, cookie-баннеры)
    for (const el of document.querySelectorAll('body *')) {
      if (getComputedStyle(el).position === 'fixed' && el.getBoundingClientRect().top > innerHeight * 0.45) el.style.setProperty('display', 'none', 'important');
    }
  });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await sleep(800);
}

const maxScroll = (page) => page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));

async function shootAt(page, y, opts) {
  await page.evaluate((yy) => window.scrollTo({ top: yy, left: 0, behavior: 'instant' }), Math.round(y));
  await sleep(1100); // дожидаемся анимаций появления
  return page.screenshot(opts);
}

// ---------- композиции: ноутбук + телефон, три телефона ----------
function luminance(color) {
  let r, g, b;
  const hex = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(color || '');
  if (hex) {
    let h = hex[1]; if (h.length === 3) h = [...h].map((c) => c + c).join('');
    [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  } else {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(color || '');
    if (!m || (m[4] !== undefined && +m[4] === 0)) return 1; // прозрачный = светлый
    [r, g, b] = [+m[1], +m[2], +m[3]];
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function compositeHtml(kind, dark, desk, phones) {
  // тёмному сайту нужен светлый фон и наоборот — так рамки устройств читаются
  const bg = dark ? 'radial-gradient(circle at 30% 20%,#ffffff,#c9d0dc)' : 'radial-gradient(circle at 30% 20%,#3b4154,#10121a)';
  const css = `*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
body{background:${bg};position:relative;font-family:sans-serif}
.laptop{position:absolute;left:70px;top:120px;width:924px;height:624px;background:#14151a;border-radius:20px 20px 6px 6px;padding:12px;box-shadow:0 40px 70px rgba(0,0,0,.35)}
.laptop img{width:900px;height:600px;object-fit:cover;object-position:top;border-radius:10px;display:block}
.base{position:absolute;left:30px;top:744px;width:1004px;height:18px;background:linear-gradient(#d8dbe2,#a9adb7);border-radius:0 0 26px 26px;box-shadow:0 18px 30px rgba(0,0,0,.3)}
.phone{position:absolute;width:272px;height:568px;background:#0b0b0e;border-radius:38px;padding:9px;box-shadow:0 36px 60px rgba(0,0,0,.4),0 0 0 2px #2a2b31}
.phone img{width:254px;height:550px;object-fit:cover;object-position:top;border-radius:30px;display:block}`;
  let body;
  if (kind === 'laptop') {
    body = `<div class="laptop"><img src="${b64(desk)}"></div><div class="base"></div>
<div class="phone" style="left:964px;top:170px"><img src="${b64(phones[0])}"></div>`;
  } else {
    const pos = [[182, 190], [524, 130], [866, 190]];
    body = phones.map((p, i) => `<div class="phone" style="left:${pos[i][0]}px;top:${pos[i][1]}px"><img src="${b64(p)}"></div>`).join('');
  }
  return `<!doctype html><meta charset="utf-8"><style>${css}</style>${body}`;
}

async function composite(ctx, kind, dark, desk, phones) {
  const page = await ctx.newPage();
  await page.setContent(compositeHtml(kind, dark, desk, phones), { waitUntil: 'load' });
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  const buf = await page.screenshot({ type: 'jpeg', quality: 90 });
  await page.close();
  return buf;
}

// ---------- проверка адреса ----------
async function alive(url) {
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

// ---------- основной сценарий ----------
if (!selected.length) { console.error('Нет сайтов для обработки (проверьте аргументы).'); process.exit(1); }
if (!filters.length) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const desktopCtx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'ru-RU' });
const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
const compCtx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

const results = new Map(); // n -> { files: [], notes: [] }
const warnings = [];

for (const w of selected) {
  const url = ORIGIN + w.path;
  const res = { files: [], notes: [] };
  results.set(w.n, res);
  console.log(`\n[${w.n}] ${w.title}\n     ${url}`);
  const check = await alive(url);
  if (!check.ok) { console.log(`     ПРОПУЩЕНО: сайт не открывается [${check.status}]`); res.notes.push(`пропущено: сайт не открылся [${check.status}]`); continue; }

  const save = (buf, idx) => {
    const name = `${w.n}_${w.file}_${idx}.jpg`;
    writeFileSync(join(OUT, name), buf);
    res.files.push(name);
    const flag = buf.length < MIN_BYTES ? '  <- МЕНЬШЕ 30 КБ, Кворк может не принять' : buf.length > MAX_BYTES ? '  <- БОЛЬШЕ 10 МБ' : '';
    if (flag) warnings.push(`${name}: ${kb(buf.length)}${flag}`);
    console.log(`     ok ${name} (${kb(buf.length)})${flag}`);
  };

  try {
    // --- десктоп: 6 экранов ---
    const dp = await desktopCtx.newPage();
    await dp.goto(url, { waitUntil: 'load', timeout: 45000 });
    await dp.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await sleep(1500);
    await prepare(dp);
    const theme = await dp.evaluate(() => {
      const m = document.querySelector('meta[name="theme-color"]');
      return (m && m.content) || getComputedStyle(document.body).backgroundColor || getComputedStyle(document.documentElement).backgroundColor;
    });
    const dark = luminance(theme) < 0.45;
    const maxY = await maxScroll(dp);
    let deskHero;
    for (let i = 0; i < 6; i++) {
      const buf = await shootAt(dp, (maxY * i) / 5, { type: 'jpeg', quality: 88 });
      if (i === 0) deskHero = buf;
      save(buf, i + 1);
    }
    await dp.close();

    // --- мобильная версия: 3 экрана для композиций ---
    const mp = await mobileCtx.newPage();
    await mp.goto(url, { waitUntil: 'load', timeout: 45000 });
    await mp.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await sleep(1500);
    await prepare(mp);
    const mMax = await maxScroll(mp);
    const phones = [];
    for (const f of [0, 0.28, 0.55]) phones.push(await shootAt(mp, mMax * f, { type: 'jpeg', quality: 90 }));
    await mp.close();

    // --- композиции ---
    save(await composite(compCtx, 'laptop', dark, deskHero, phones), 7);
    save(await composite(compCtx, 'phones', dark, deskHero, phones), 8);
  } catch (e) {
    const msg = e.message.split('\n')[0];
    console.log(`     ОШИБКА: ${msg}`);
    res.notes.push(`ошибка: ${msg}`);
  }
}
await browser.close();

// ---------- файл с названиями ----------
const lines = [];
lines.push('КВОРК: ПОРТФОЛИО. Названия и описания работ');
lines.push(`Размер всех картинок: ${W}x${H} px (3:2), JPG. Требования Кворка: от 660x440, от 30 КБ до 10 МБ, до 9 картинок на работу.`);
lines.push('Картинки каждой работы грузите по порядку 1-8: первая становится обложкой.');
lines.push('Ссылки ниже нужны вам для проверки. В описание на Кворке их лучше не вставлять: площадка не любит внешние ссылки.');
lines.push('Работы, помеченные «концепт», в описании названы концептуальными проектами. Если это заказ реального клиента, уберите эту фразу.');
lines.push('');
for (const w of WORKS.filter((x) => x.enabled !== false)) {
  const res = results.get(w.n);
  lines.push('='.repeat(78));
  lines.push(`${w.n}. НАЗВАНИЕ РАБОТЫ: ${w.title}`);
  lines.push(`   Описание: ${w.desc}`);
  if (res && res.files.length) lines.push(`   Файлы (${res.files.length}): ${res.files.join(', ')}`);
  else lines.push(`   Файлы: ${res ? 'не созданы' : 'не обрабатывались в этом запуске'}${res && res.notes.length ? ' (' + res.notes.join('; ') + ')' : ''}`);
  lines.push(`   Сайт: ${ORIGIN}${w.path}`);
  lines.push(`   Код: ${GITHUB}${w.path.replace(/\/$/, '')}`);
  lines.push('');
}
writeFileSync(join(OUT, 'НАЗВАНИЯ_РАБОТ.txt'), '\uFEFF' + lines.join('\r\n'), 'utf8');

const total = [...results.values()].reduce((a, r) => a + r.files.length, 0);
console.log(`\nГотово: ${total} картинок в папке ${OUT}/ + НАЗВАНИЯ_РАБОТ.txt`);
if (warnings.length) console.log('\nВНИМАНИЕ:\n- ' + warnings.join('\n- '));
const failed = selected.filter((w) => results.get(w.n).files.length < 8);
if (failed.length) { console.log(`\nНе все 8 картинок получены для: ${failed.map((w) => w.n + ' ' + w.file).join(', ')}`); process.exitCode = 1; }
