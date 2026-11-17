// Meldet neue URLs per IndexNow an Bing, Yandex, Seznam und Co. (Google nutzt IndexNow nicht;
// den alten Google-Sitemap-Ping gibt es nicht mehr, Google findet neue Seiten ueber die Sitemap).
// Aufruf: node news-bot/indexnow.mjs <url> [url ...]   oder   INDEXNOW_URLS="<url> <url>" node news-bot/indexnow.mjs
// Voraussetzung: Die Datei https://<domain>/<INDEXNOW_KEY>.txt liefert den Schluessel aus (liegt in public/ der Seite).
import { env, loadDotEnv, siteUrl } from '../lib/util.mjs';

loadDotEnv();

export async function indexNow(urls) {
  const key = env('INDEXNOW_KEY');
  if (!key) {
    console.log('IndexNow: kein INDEXNOW_KEY gesetzt, uebersprungen.');
    return false;
  }
  const base = siteUrl();
  const host = new URL(base).host;
  const list = [...new Set(urls.filter((u) => u.startsWith(base)))];
  if (!list.length) {
    console.log('IndexNow: keine passenden URLs.');
    return false;
  }
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: `${base}/${key}.txt`, urlList: list }),
    signal: AbortSignal.timeout(15_000),
  });
  // 200 = ok, 202 = angenommen (Schluessel wird noch geprueft)
  console.log(`IndexNow: HTTP ${res.status} fuer ${list.length} URL(s)`);
  return res.status === 200 || res.status === 202;
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('news-bot/indexnow.mjs');
if (isMain) {
  const urls = [...process.argv.slice(2), ...(env('INDEXNOW_URLS', '').split(/\s+/))].filter(Boolean);
  const ok = await indexNow(urls);
  if (!ok && env('INDEXNOW_KEY') && urls.length) process.exitCode = 0; // nie den ganzen Lauf rot machen
}
