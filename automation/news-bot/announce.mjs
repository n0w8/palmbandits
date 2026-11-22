// Kuendigt neu veroeffentlichte News im eigenen Discord an (Mike 22.11.2026: "taeglich 2-3 neue Beitraege ...
// und auch den Discord-Server damit pushen").
// Laeuft im Deploy-Workflow NACH dem erfolgreichen Upload, nur bei Push-Deploys und nur fuer deutsche News-Dateien,
// die mit dem Push NEU dazugekommen sind. So landen auch die Beitraege des Cloud-Newsdesks im Discord.
// Kanal je Spiel und Rollen-Ping bei Breaking News kommen aus notify.mjs. Die englische Fassung wird mitverlinkt.
// Aufruf: node news-bot/announce.mjs src/content/news/<datei>.md [...]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { discord } from './notify.mjs';
import { ROOT_DIR, siteUrl, sleep, truncate } from '../lib/util.mjs';
import { EN_NEWS_DIR } from '../lib/i18n.mjs';

// Hoechstens so viele Meldungen pro Push, damit ein grosser Schwung den Kanal nicht flutet.
const MAX_PRO_LAUF = 5;

export function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}

export function field(fm, key) {
  const m = fm.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'));
  if (!m) return undefined;
  let v = m[1].trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  else if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1).replace(/''/g, "'");
  return v;
}

// Englische Fassung ueber translationOf finden (Dateiname ist frei waehlbar)
function englischeUrl(deId) {
  if (!existsSync(EN_NEWS_DIR)) return undefined;
  for (const f of readdirSync(EN_NEWS_DIR)) {
    if (!f.endsWith('.md')) continue;
    const fm = frontmatter(readFileSync(path.join(EN_NEWS_DIR, f), 'utf8'));
    if (field(fm, 'translationOf') === deId) return `${siteUrl()}/en/news/${f.replace(/\.md$/, '')}/`;
  }
  return undefined;
}

export function meldung(datei) {
  const text = readFileSync(datei, 'utf8');
  const fm = frontmatter(text);
  if (!fm || field(fm, 'draft') === 'true') return null;
  const id = path.basename(datei).replace(/\.md$/, '');
  const title = field(fm, 'title');
  if (!title) return null;
  const breaking = field(fm, 'breaking') === 'true';
  const rumor = field(fm, 'rumor') === 'true';
  const en = englischeUrl(id);
  return {
    title: rumor ? `Gerücht: ${title}` : title,
    url: `${siteUrl()}/news/${id}/`,
    description: truncate(field(fm, 'description') ?? '', 300),
    game: field(fm, 'game'),
    color: breaking ? 'red' : rumor ? 'yellow' : 'green',
    ping: breaking,
    fields: en ? [{ name: 'English', value: en }] : [],
    footer: 'palmbandits.com · Diskutier mit im Server',
  };
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('news-bot/announce.mjs')) {
  const dateien = process.argv.slice(2)
    .map((p) => (path.isAbsolute(p) ? p : path.join(ROOT_DIR, p)))
    .filter((p) => existsSync(p) && /[\\/]src[\\/]content[\\/]news[\\/][^\\/]+\.md$/.test(p))
    .sort();
  let gesendet = 0;
  for (const d of dateien.slice(0, MAX_PRO_LAUF)) {
    const m = meldung(d);
    if (!m) continue;
    const ok = await discord(m);
    console.log(`${ok ? 'gepostet' : 'NICHT gepostet'}: ${m.title}`);
    if (ok) gesendet++;
    await sleep(1500); // Discord-Limit fuer Webhooks
  }
  if (dateien.length > MAX_PRO_LAUF) console.log(`${dateien.length - MAX_PRO_LAUF} weitere Meldungen nicht angekuendigt (Limit ${MAX_PRO_LAUF}).`);
  console.log(`${gesendet} Meldung(en) im Discord angekuendigt.`);
}
