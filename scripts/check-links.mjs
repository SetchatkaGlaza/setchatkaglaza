// Проверка ссылок: локальные файлы, якоря #id и внешние URL из index.html, README.md, 404.html, sitemap.xml, site.webmanifest.
// Запуск: npm run check        (нужен Node 18+, интернет — для проверки внешних ссылок)
import { readFileSync, existsSync } from 'node:fs';

const FILES = ['index.html', 'README.md', '404.html', 'sitemap.xml', 'site.webmanifest', 'css/style.css'];
const problems = [];
const external = new Map(); // url -> [files]

for (const file of FILES.filter(existsSync)) {
  const text = readFileSync(file, 'utf8');
  const ids = new Set([...text.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const refs = [...text.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)].map((m) => m[1]);
  refs.push(...[...text.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]));           // markdown
  refs.push(...[...text.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1])); // css
  refs.push(...[...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));        // sitemap
  refs.push(...[...text.matchAll(/"src"\s*:\s*"([^"]+)"/g)].map((m) => m[1]));      // manifest
  for (const raw of new Set(refs)) {
    const ref = raw.trim();
    if (!ref || /^(mailto:|tel:|data:|javascript:|%23|#n$)/.test(ref)) continue;
    if (/^https?:\/\//.test(ref)) {
      (external.get(ref) || external.set(ref, []).get(ref)).push(file);
      continue;
    }
    if (ref.startsWith('#')) {
      if (file.endsWith('.html') && ref.length > 1 && !ids.has(ref.slice(1))) problems.push(`${file}: нет якоря ${ref}`);
      continue;
    }
    const path = decodeURIComponent(ref.split('#')[0].split('?')[0]);
    if (!path) continue;
    const base = file.startsWith('css/') ? 'css/' : '';
    const local = path.startsWith('/') ? path.slice(1) : base + path;
    if (!existsSync(local) && !existsSync(path)) problems.push(`${file}: нет файла ${ref}`);
  }
}

console.log(`Внешних ссылок: ${external.size}`);
const SOFT = /(t\.me|vk\.ru|vk\.com|instagram\.com|yandex\.ru|linkedin\.com)/; // соцсети часто отдают 403/429/999 роботам
async function check(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, { method, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 link-check' }, signal: AbortSignal.timeout(20000) });
      if (res.ok) return { ok: true, status: res.status };
      if (method === 'GET') return { ok: false, status: res.status };
    } catch (e) {
      if (method === 'GET') return { ok: false, status: String(e.cause?.code || e.message) };
    }
  }
}
const urls = [...external.keys()];
let i = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (i < urls.length) {
    const url = urls[i++];
    const r = await check(url);
    if (r.ok) continue;
    const soft = SOFT.test(url) && [403, 429, 999, 418].includes(r.status);
    console.log(`${soft ? 'WARN' : 'FAIL'} [${r.status}] ${url}  (${external.get(url).join(', ')})${soft ? '  — сайт не пускает роботов, откройте вручную' : ''}`);
    if (!soft) problems.push(`${external.get(url)[0]}: ${url} [${r.status}]`);
  }
}));

console.log(problems.length ? `\nПроблем: ${problems.length}\n- ` + problems.join('\n- ') : '\nВсе ссылки в порядке.');
process.exitCode = problems.length ? 1 : 0;
